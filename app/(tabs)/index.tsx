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
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function HomeScreen() {
  // Supprimer le log qui cause du spam
  // console.log('🔵 HomeScreen component loaded');
  
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // ⚠️ IMPORTANT: TOUS LES HOOKS DOIVENT ÊTRE AU DÉBUT DU COMPOSANT
  // États du formulaire - AVANT toute condition de retour
  const [userType, setUserType] = useState('client');
  const [secteur, setSecteur] = useState('');
  const [jour, setJour] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [showSecteurModal, setShowSecteurModal] = useState(false);
  const [etatCivilPersonne, setEtatCivilPersonne] = useState('');
  const [preferenceAidant, setPreferenceAidant] = useState('');

  // Secteurs disponibles
  const secteurs = [
    'Garde d\'enfants',
    'Aide à domicile',
    'Ménage',
    'Courses',
    'Jardinage',
    'Bricolage',
    'Accompagnement',
    'Autre'
  ];

  // useEffect supprimé pour éviter les warnings ESLint
  // Le logging n'est pas critique pour le fonctionnement de l'app

  // Fonctions
  const handleSubmit = () => {
    if (!secteur || !jour || !heureDebut || !heureFin) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (userType === 'client' && (!etatCivilPersonne || !preferenceAidant)) {
      Alert.alert('Erreur', 'Veuillez remplir toutes les préférences');
      return;
    }

    const searchParams = {
      userType,
      secteur,
      jour,
      heureDebut,
      heureFin,
      ...(userType === 'client' && {
        etatCivilPersonne,
        preferenceAidant
      })
    };

    console.log('Données de recherche:', searchParams);
    
    router.push({
      pathname: './profile-list',
      params: searchParams
    });
  };

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnecter', 
          style: 'destructive',
          onPress: async () => {
            try {
              await (logout as any)();
              router.replace('/login');
            } catch (error) {
              console.error('Erreur de déconnexion:', error);
            }
          }
        }
      ]
    );
  };

  const CheckBox = ({ label, selected, onPress }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.checkboxContainer} onPress={onPress}>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Text style={styles.checkboxText}>✓</Text>}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // MAINTENANT les conditions de retour (après tous les hooks)
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Bonjour,</Text>
            <Text style={styles.userName}>
              {(user as any)?.displayName || (user as any)?.email}
            </Text>
            {(user as any)?.userType && (
              <Text style={styles.userType}>
                {(user as any).userType === 'client' ? 'Client' : 'Aidant'}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Mise en relation</Text>
        <Text style={styles.subtitle}>Trouvez l&apos;aide dont vous avez besoin</Text>
      </View>

      <View style={styles.form}>
        {/* Sélection du type d'utilisateur */}
        <View style={styles.userTypeContainer}>
          <Text style={styles.label}>Je suis :</Text>
          <View style={styles.userTypeButtons}>
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === 'client' && styles.userTypeButtonActive
              ]}
              onPress={() => setUserType('client')}
            >
              <Text style={[
                styles.userTypeButtonText,
                userType === 'client' && styles.userTypeButtonTextActive
              ]}>
                Client
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === 'aidant' && styles.userTypeButtonActive
              ]}
              onPress={() => setUserType('aidant')}
            >
              <Text style={[
                styles.userTypeButtonText,
                userType === 'aidant' && styles.userTypeButtonTextActive
              ]}>
                Aidant
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Secteur */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Secteur *</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowSecteurModal(true)}
          >
            <Text style={[styles.selectorButtonText, !secteur && styles.placeholderText]}>
              {secteur || 'Sélectionnez un secteur'}
            </Text>
            <Text style={styles.selectorArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Jour */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Jour *</Text>
          <TextInput
            style={styles.input}
            placeholder="JJ/MM/AAAA"
            value={jour}
            onChangeText={setJour}
            keyboardType="numeric"
          />
        </View>

        {/* Horaires */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Horaires *</Text>
          <View style={styles.timeContainer}>
            <TextInput
              style={[styles.input, styles.timeInput]}
              placeholder="HH:MM"
              value={heureDebut}
              onChangeText={setHeureDebut}
              keyboardType="numeric"
            />
            <Text style={styles.timeText}>à</Text>
            <TextInput
              style={[styles.input, styles.timeInput]}
              placeholder="HH:MM"
              value={heureFin}
              onChangeText={setHeureFin}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Champs spécifiques aux clients */}
        {userType === 'client' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>État civil de la personne à garder *</Text>
              <View style={styles.checkboxRow}>
                <CheckBox
                  label="Femme"
                  selected={etatCivilPersonne === 'femme'}
                  onPress={() => setEtatCivilPersonne('femme')}
                />
                <CheckBox
                  label="Homme"
                  selected={etatCivilPersonne === 'homme'}
                  onPress={() => setEtatCivilPersonne('homme')}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Préférence de l&apos;aidant *</Text>
              <View style={styles.checkboxRow}>
                <CheckBox
                  label="Femme"
                  selected={preferenceAidant === 'femme'}
                  onPress={() => setPreferenceAidant('femme')}
                />
                <CheckBox
                  label="Homme"
                  selected={preferenceAidant === 'homme'}
                  onPress={() => setPreferenceAidant('homme')}
                />
              </View>
            </View>
          </>
        )}

        {/* Bouton de validation */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>
            {userType === 'client' ? 'Rechercher un aidant' : 'Proposer mes services'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal de sélection du secteur */}
      <Modal
        visible={showSecteurModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSecteurModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un secteur</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSecteurModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={secteurs}
              keyExtractor={(item, index) => index.toString()}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 18,
    color: '#6c757d',
  },
  header: {
    backgroundColor: '#2c3e50',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#bdc3c7',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  userType: {
    fontSize: 14,
    color: '#3498db',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoutButtonText: {
    color: '#ecf0f1',
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ecf0f1',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  userTypeContainer: {
    marginBottom: 25,
  },
  userTypeButtons: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 4,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  userTypeButtonActive: {
    backgroundColor: '#3498db',
  },
  userTypeButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  userTypeButtonTextActive: {
    color: '#ffffff',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  selectorButton: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorButtonText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  placeholderText: {
    color: '#6c757d',
  },
  selectorArrow: {
    fontSize: 12,
    color: '#6c757d',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeInput: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  checkboxText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#2c3e50',
  },
  submitButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Styles pour la modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#6c757d',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  checkmark: {
    fontSize: 18,
    color: '#27ae60',
    fontWeight: 'bold',
  },
});