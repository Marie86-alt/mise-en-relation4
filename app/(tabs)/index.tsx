// Fichier: app/(tabs)/index.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Colors } from '@/constants/Colors';

export default function HomeScreen() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [secteur, setSecteur] = useState('');
  const [jour, setJour] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [showSecteurModal, setShowSecteurModal] = useState(false);
  const [etatCivilPersonne, setEtatCivilPersonne] = useState('');
  const [preferenceAidant, setPreferenceAidant] = useState('');

  const secteurs = [

    'Aide au repas',
    'Dame de compagnie',
    'Soins légers et assistance',
    'Stimulation cognitive (jeux, lecture)',
    'Autre'
  ];

  const handleSubmit = () => {
    if (!secteur || !jour || !heureDebut || !heureFin || !etatCivilPersonne || !preferenceAidant) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs du formulaire.');
      return;
    }
    const searchParams = { secteur, jour, heureDebut, heureFin, etatCivilPersonne, preferenceAidant };
    router.push({ pathname: './profile-list', params: searchParams });
  };

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: async () => { try { await (logout as any)(); } catch (error) { console.error('Erreur de déconnexion:', error); } } }
    ]);
  };

  const CheckBox = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void; }) => (
    <TouchableOpacity style={styles.checkboxContainer} onPress={onPress}>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        <Text style={styles.checkboxText}>{selected ? '✓' : ''}</Text>
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading || !user) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.light.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Bonjour,</Text>
            <Text style={styles.userName}>{(user as any)?.displayName || (user as any)?.email}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Mise en relation</Text>
        <Text style={styles.subtitle}>Trouvez l&apos;aide qu&apos;il vous faut</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>🏷️ Secteur d&apos;aide recherché *</Text>
          <TouchableOpacity style={styles.selectorButton} onPress={() => setShowSecteurModal(true)}>
            <Text style={[styles.selectorButtonText, !secteur && styles.placeholderText]}>{secteur || 'Sélectionnez un secteur'}</Text>
            <Text style={styles.selectorArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}><Text style={styles.label}>🗓️ Jour *</Text><TextInput style={styles.input} placeholder="JJ/MM" value={jour} onChangeText={setJour} /></View>
        <View style={styles.inputGroup}><Text style={styles.label}>⏱️ Horaires *</Text><View style={styles.timeContainer}><TextInput style={[styles.input, styles.timeInput]} placeholder="HH:MM" value={heureDebut} onChangeText={setHeureDebut} keyboardType="numeric" /><Text style={styles.timeText}>à</Text><TextInput style={[styles.input, styles.timeInput]} placeholder="HH:MM" value={heureFin} onChangeText={setHeureFin} keyboardType="numeric" /></View></View>
        
        {/* ✅ MODIFICATION : Ajout de l'option "Indifférent" */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>👤 Pour qui est le service ? *</Text>
          <View style={styles.checkboxRow}>
            <CheckBox label="Femme" selected={etatCivilPersonne === 'Femme'} onPress={() => setEtatCivilPersonne('Femme')} />
            <CheckBox label="Homme" selected={etatCivilPersonne === 'Homme'} onPress={() => setEtatCivilPersonne('Homme')} />
            <CheckBox label="Indifférent" selected={etatCivilPersonne === 'Indifférent'} onPress={() => setEtatCivilPersonne('Indifférent')} />
          </View>
        </View>

        {/* ✅ MODIFICATION : Ajout de l'option "Indifférent" */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>🤝 Préférence de l&apos;aidant *</Text>
          <View style={styles.checkboxRow}>
            <CheckBox label="Femme" selected={preferenceAidant === 'Femme'} onPress={() => setPreferenceAidant('Femme')} />
            <CheckBox label="Homme" selected={preferenceAidant === 'Homme'} onPress={() => setPreferenceAidant('Homme')} />
            <CheckBox label="Indifférent" selected={preferenceAidant === 'Indifférent'} onPress={() => setPreferenceAidant('Indifférent')} />
          </View>
        </View>
        
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Rechercher un aidant</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showSecteurModal} transparent animationType="slide" onRequestClose={() => setShowSecteurModal(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContainer}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Choisir un secteur</Text><TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowSecteurModal(false)}><Text style={styles.modalCloseText}>✕</Text></TouchableOpacity></View><FlatList data={secteurs} keyExtractor={(item) => item} renderItem={({ item }) => (<TouchableOpacity style={styles.modalOption} onPress={() => { setSecteur(item); setShowSecteurModal(false); }}><Text style={styles.modalOptionText}>{item}</Text>{secteur === item && <Text style={styles.checkmark}>✓</Text>}</TouchableOpacity>)} /></View></View>
      </Modal>
    </ScrollView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  userInfo: { flex: 1 },
  welcomeText: { fontSize: 16, color: '#6c757d' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#11181C' },
  logoutButton: { backgroundColor: '#f0f2f5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  logoutButtonText: { color: Colors.light.danger, fontSize: 14, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.light.primary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6c757d', textAlign: 'center' },
  form: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#2c3e50', marginBottom: 10 }, // Marge augmentée
  input: { borderWidth: 1, borderColor: '#dee2e6', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, backgroundColor: '#ffffff' },
  selectorButton: { borderWidth: 1, borderColor: '#dee2e6', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#ffffff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectorButtonText: { fontSize: 16, color: '#2c3e50' },
  placeholderText: { color: '#6c757d' },
  selectorArrow: { fontSize: 12, color: '#6c757d' },
  timeContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeInput: { flex: 1 },
  timeText: { fontSize: 16, color: '#6c757d', fontWeight: '500' },
  // ✅ Style pour permettre aux checkboxes de passer à la ligne si besoin
  checkboxRow: {
    flexDirection: 'row',
    gap: 15,
    flexWrap: 'wrap', // Permet le retour à la ligne
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }, // Ajout marge en bas
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: '#dee2e6', borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  checkboxSelected: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  checkboxText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 16, color: '#2c3e50' },
  submitButton: { backgroundColor: Colors.light.primary, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  modalCloseButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e9ecef', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 16, color: '#6c757d' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f8f9fa' },
  modalOptionText: { fontSize: 16, color: '#2c3e50' },
  checkmark: { fontSize: 18, color: Colors.light.success, fontWeight: 'bold' },
});