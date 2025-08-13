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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Utiliser any pour éviter les conflits de types avec AuthContext JS
  const authContext = useAuth() as any;
  const { signIn, user, loading: authLoading } = authContext;
  const router = useRouter();

  // Debug du contexte
  useEffect(() => {
    console.log('🔍 AuthContext state:', {
      signIn: typeof signIn,
      user: user ? 'présent' : 'null',
      authLoading
    });
  }, [signIn, user, authLoading]);

  useEffect(() => {
    if (!authLoading && user) {
      console.log('✅ Utilisateur connecté, redirection...');
      router.replace('/(tabs)');
    }
  }, [user, authLoading, router]);

  const handleLogin = async () => {
    console.log('🔵 handleLogin appelé - bouton cliqué !');
    console.log('📧 Email:', email);
    console.log('🔑 Password length:', password.length);
    console.log('⏳ isConnecting:', isConnecting);

    if (!email.trim() || !password.trim()) {
      console.log('❌ Champs manquants');
      Alert.alert('Champs requis', 'Veuillez entrer votre email et votre mot de passe.');
      return;
    }

    console.log('🔄 Début de connexion...');
    setIsConnecting(true);
    try {
      console.log('🔄 Appel signIn...');
      await signIn(email.trim(), password);
      console.log('✅ Connexion réussie !');
    } catch (error) {
      console.log('❌ Erreur de connexion:', error);
      Alert.alert('Erreur de connexion', 'L\'email ou le mot de passe est incorrect.');
    } finally {
      console.log('🔄 setIsConnecting(false)');
      setIsConnecting(false);
    }
  };

  const handleSignupPress = () => {
    console.log('🔵 Lien signup cliqué !');
    router.push('/signup');
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Vérification...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>Retrouvez votre compte</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isConnecting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                style={styles.input}
                placeholder="Votre mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isConnecting}
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isConnecting && styles.buttonDisabled]}
              onPress={() => {
                console.log('🔵 TouchableOpacity cliqué !');
                handleLogin();
              }}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Se connecter</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ?</Text>
            <TouchableOpacity 
              onPress={handleSignupPress}
              disabled={isConnecting}
            >
              <Text style={styles.signupLink}>Créer un compte</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 15, 
    fontSize: 16, 
    color: '#6c757d' 
  },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 20 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 40 
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#2c3e50' 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#6c757d', 
    marginTop: 8 
  },
  form: { 
    backgroundColor: '#ffffff', 
    borderRadius: 12, 
    padding: 25, 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5 
  },
  inputGroup: { 
    marginBottom: 20 
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#34495e', 
    marginBottom: 8 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#dfe6e9', 
    borderRadius: 8, 
    paddingHorizontal: 15, 
    paddingVertical: Platform.OS === 'ios' ? 14 : 10, 
    fontSize: 16 
  },
  loginButton: { 
    backgroundColor: '#3498db', 
    paddingVertical: 15, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 10 
  },
  buttonDisabled: { 
    backgroundColor: '#a4b0be' 
  },
  loginButtonText: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  footer: { 
    alignItems: 'center', 
    marginTop: 30 
  },
  footerText: { 
    color: '#6c757d', 
    fontSize: 16,
    marginBottom: 10
  },
  signupLink: { 
    color: '#27ae60', 
    fontWeight: 'bold',
    fontSize: 16
  },
});