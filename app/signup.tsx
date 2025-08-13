import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

function SignupScreen() {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'client',
    secteur: ''
  });
  const [showSecteurModal, setShowSecteurModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, user, loading } = useAuth();
  const router = useRouter();

  // Rediriger si déjà connecté
  useEffect(() => {
    if (!loading && user) {
      console.log('✅ Utilisateur déjà connecté, redirection vers l\'accueil');
      router.replace('/(tabs)');
    }
  }, [user, loading, router]);

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

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { displayName, email, password, confirmPassword, userType, secteur } = formData;

    if (!displayName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom complet');
      return false;
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return false;
    }

    if (userType === 'aidant' && !secteur) {
      Alert.alert('Erreur', 'Veuillez sélectionner un secteur d\'activité');
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      
      const { displayName, email, password, userType, secteur } = formData;
      
      const additionalData = {
        displayName: displayName.trim(),
        userType,
        ...(userType === 'aidant' && { secteur })
      };

      await (signUp as any)(email.trim(), password, additionalData);
      
      // La navigation se fera automatiquement via l'AuthContext
      Alert.alert(
        'Succès', 
        'Votre compte a été créé avec succès !',
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      console.error('Erreur d\'inscription:', error);
      
      let errorMessage = 'Erreur lors de la création du compte';
      if (error.message.includes('email-already-in-use')) {
        errorMessage = 'Cette adresse email est déjà utilisée';
      } else if (error.message.includes('weak-password')) {
        errorMessage = 'Le mot de passe est trop faible';
      } else if (error.message.includes('invalid-email')) {
        errorMessage = 'Adresse email invalide';
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    router.push('/login');
  };

  // Écran de chargement si on vérifie l'auth ou si déjà connecté
  if (loading || user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {user ? 'Connexion en cours...' : 'Chargement...'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Inscription</Text>
            <Text style={styles.subtitle}>Créez votre compte</Text>
          </View>

          <View style={styles.form}>
            {/* Type d'utilisateur */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Je suis :</Text>
              <View style={styles.userTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    formData.userType === 'client' && styles.userTypeButtonActive
                  ]}
                  onPress={() => updateFormData('userType', 'client')}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.userTypeButtonText,
                    formData.userType === 'client' && styles.userTypeButtonTextActive
                  ]}>
                    Client
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    formData.userType === 'aidant' && styles.userTypeButtonActive
                  ]}
                  onPress={() => updateFormData('userType', 'aidant')}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.userTypeButtonText,
                    formData.userType === 'aidant' && styles.userTypeButtonTextActive
                  ]}>
                    Aidant
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Nom complet */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom complet *</Text>
              <TextInput
                style={styles.input}
                placeholder="Votre nom et prénom"
                value={formData.displayName}
                onChangeText={(value) => updateFormData('displayName', value)}
                editable={!isLoading}
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Secteur (pour les aidants) */}
            {formData.userType === 'aidant' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Secteur d&apos;activité *</Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setShowSecteurModal(true)}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.selectorButtonText, 
                    !formData.secteur && styles.placeholderText
                  ]}>
                    {formData.secteur || 'Sélectionnez votre secteur'}
                  </Text>
                  <Text style={styles.selectorArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe *</Text>
              <TextInput
                style={styles.input}
                placeholder="Au moins 6 caractères"
                value={formData.password}
                onChangeText={(value) => updateFormData('password', value)}
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            {/* Confirmation mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe *</Text>
              <TextInput
                style={styles.input}
                placeholder="Répétez votre mot de passe"
                value={formData.confirmPassword}
                onChangeText={(value) => updateFormData('confirmPassword', value)}
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity 
              style={[styles.signupButton, isLoading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
            >
              <Text style={styles.signupButtonText}>
                {isLoading ? 'Création...' : 'Créer mon compte'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ?</Text>
            <TouchableOpacity 
              onPress={navigateToLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
                    updateFormData('secteur', item);
                    setShowSecteurModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {formData.secteur === item && <Text style={styles.checkmark}>✓</Text>}
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 25,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    color: '#2c3e50',
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
  signupButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  signupButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: '#6c757d',
    fontSize: 16,
    marginBottom: 5,
  },
  loginLink: {
    color: '#3498db',
    fontSize: 18,
    fontWeight: '600',
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

export default SignupScreen;