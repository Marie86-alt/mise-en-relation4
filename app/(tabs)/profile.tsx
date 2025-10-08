// app/(tabs)/profile.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
  Alert, TextInput, ActivityIndicator, Modal, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Colors } from '@/constants/Colors';

// ✅ CheckBox local
const CheckBox = ({
  label,
  selected,
  onPress,
}: { label: string; selected: boolean; onPress: () => void }) => (
  <TouchableOpacity style={styles.checkboxContainer} onPress={onPress}>
    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
      <Text style={styles.checkboxText}>{selected ? '✓' : ''}</Text>
    </View>
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const { user, isAdmin, updateUserProfile, logout } = useAuth();
  const router = useRouter();

  // ✅ États profil aidant
  const [genre, setGenre] = useState('');
  const [secteur, setSecteur] = useState('');
  const [showSecteurModal, setShowSecteurModal] = useState(false);
  const [experience, setExperience] = useState('');
  const [tarif, setTarif] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Secteurs proposés
  const secteurs = [
    'Dame de compagnie',
    'Aide au repas',
    'Soins légers et assistance',
    'Stimulation cognitive (jeux, lecture)',
    'Accompagnement (sorties, promenades)',
    'Autre',
  ];

  // Charger les infos depuis Firestore (via user du contexte)
  useEffect(() => {
    if (!user) return;
    setGenre(user.genre ?? '');
    setSecteur(user.secteur ?? '');
    setExperience(
      typeof user.experience === 'number' ? String(user.experience) : (user.experience as any)?.toString?.() ?? ''
    );
    setTarif(
      typeof user.tarifHeure === 'number' ? String(user.tarifHeure) : (user.tarifHeure as any)?.toString?.() ?? ''
    );
    setDescription(user.description ?? '');
  }, [user]);

  const handleLogout = (): void => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr(e) de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            // Navigation immédiate vers l'accueil après déconnexion réussie
            const { router } = require('expo-router');
            setTimeout(() => {
              router.dismissAll?.();
              router.replace('/');
            }, 100);
          } catch (error) {
            console.error('Erreur déconnexion:', error);
          }
        },
      },
    ]);
  };

  const handleSaveChanges = async () => {
    if (!genre || !secteur || !experience || !tarif || !description) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs du profil aidant.');
      return;
    }

    const expNum = parseInt(experience, 10);
    const tarifNum = parseFloat(tarif);
    if (Number.isNaN(expNum) || Number.isNaN(tarifNum)) {
      Alert.alert('Format invalide', "Vérifiez l'expérience et le tarif.");
      return;
    }

    setIsSaving(true);
    try {
      const profileData = {
        genre,
        secteur,
        experience: expNum,
        tarifHeure: tarifNum,
        description,
        isAidant: true,
      };
      await updateUserProfile(profileData);
      Alert.alert('Succès', 'Votre profil aidant a été mis à jour !');
    } catch (error: any) {
      Alert.alert('Erreur', `Une erreur est survenue : ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const initial = user?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>👤 Mon Profil</Text>
        </View>

        <View style={styles.userContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.displayName || 'Utilisateur'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* 🛠️ Bouton Admin visible uniquement si admin */}
        {isAdmin && (
          <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin')}>
            <Text style={styles.adminButtonText}>🛠️ Panel Administrateur</Text>
          </TouchableOpacity>
        )}

        <View style={styles.aidantSection}>
          <Text style={styles.sectionTitle}>Mon Profil Aidant</Text>
          <Text style={styles.sectionSubtitle}>Remplissez ces informations pour apparaître dans les recherches.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Je suis *</Text>
            <View style={styles.checkboxRow}>
              <CheckBox label="Une Femme" selected={genre === 'Femme'} onPress={() => setGenre('Femme')} />
              <CheckBox label="Un Homme" selected={genre === 'Homme'} onPress={() => setGenre('Homme')} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Secteur proposé *</Text>
            <TouchableOpacity style={styles.selectorButton} onPress={() => setShowSecteurModal(true)}>
              <Text style={[styles.selectorButtonText, !secteur && styles.placeholderText]}>
                {secteur || 'Sélectionnez votre secteur principal'}
              </Text>
              <Text style={styles.selectorArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Années d&apos;expérience</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 5"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={experience}
              onChangeText={setExperience}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tarif horaire (€/heure)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 15"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={tarif}
              onChangeText={setTarif}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description de vos services</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez votre expérience, vos spécialités..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={handleSaveChanges}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveButtonText}>Sauvegarder</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>🚪 Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Modal choix du secteur */}
      <Modal
        visible={showSecteurModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSecteurModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un secteur</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowSecteurModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={secteurs}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setSecteur(item);
                    setShowSecteurModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {secteur === item && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { backgroundColor: '#ffffff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#11181C' },

  userContainer: {
    backgroundColor: '#ffffff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: 15,
  },
  avatarText: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  userEmail: { fontSize: 14, color: '#7f8c8d', marginTop: 2 },

  // 🛠️ Bouton admin
  adminButton: {
    backgroundColor: Colors.light.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  adminButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  aidantSection: { marginHorizontal: 15, marginBottom: 15, backgroundColor: '#ffffff', borderRadius: 12, padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.light.primary, marginBottom: 5 },
  sectionSubtitle: { fontSize: 14, color: '#6c757d', marginBottom: 20 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 16, fontWeight: '500', color: '#34495e', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#dee2e6', borderRadius: 8,
    paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, backgroundColor: '#f8f9fa',
    color: '#11181C'
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  saveButton: { backgroundColor: Colors.light.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: Colors.light.grey },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },

  actionsContainer: { marginHorizontal: 15, marginBottom: 15 },
  logoutButton: { backgroundColor: Colors.light.danger, padding: 15, borderRadius: 8, alignItems: 'center' },
  logoutButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },

  footer: { alignItems: 'center', padding: 20 },
  footerText: { fontSize: 12, color: '#bdc3c7' },

  // CheckBox
  checkboxRow: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 24, height: 24, borderWidth: 2, borderColor: '#dee2e6',
    borderRadius: 4, alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  checkboxText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 16, color: '#2c3e50' },

  // Sélecteur secteur
  selectorButton: {
    borderWidth: 1, borderColor: '#dee2e6', borderRadius: 8,
    paddingHorizontal: 15, paddingVertical: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  selectorButtonText: { fontSize: 16, color: '#2c3e50' },
  placeholderText: { color: '#6c757d' },
  selectorArrow: { fontSize: 12, color: '#6c757d' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#dee2e6',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  modalCloseButton: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#e9ecef',
    alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: { fontSize: 16, color: '#6c757d' },
  modalOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f8f9fa',
  },
  modalOptionText: { fontSize: 16, color: '#2c3e50' },
  checkmark: { fontSize: 18, color: Colors.light.success, fontWeight: 'bold' },
});
