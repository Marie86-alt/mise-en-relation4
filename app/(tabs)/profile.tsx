import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // 🎯 FONCTION DÉCONNEXION
  const handleLogout = (): void => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr(e) de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnexion', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              console.error('Erreur déconnexion:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          }
        }
      ]
    );
  };

  // 🎯 NAVIGATION VERS ADMIN (pour développement)
  const goToAdmin = (): void => {
    router.push('/admin-seed');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* 🎯 HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>👤 Mon Profil</Text>
          <Text style={styles.headerSubtitle}>Gérez votre compte</Text>
        </View>

        {/* 🎯 INFORMATIONS UTILISATEUR */}
        <View style={styles.userContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.userType === 'client' ? 'Client' : 'Aidant'}
            </Text>
            <Text style={styles.userEmail}>{user?.email || 'Non défini'}</Text>
            <Text style={styles.userType}>
              Type: {user?.userType || 'Non défini'}
            </Text>
          </View>
        </View>

        {/* 🎯 SECTIONS DU PROFIL */}
        <View style={styles.sectionsContainer}>
          
          {/* Section Mes informations */}
          <TouchableOpacity style={styles.sectionItem}>
            <Text style={styles.sectionIcon}>📝</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Mes informations</Text>
              <Text style={styles.sectionDescription}>Modifier mes données personnelles</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          {/* Section Mes évaluations */}
          <TouchableOpacity style={styles.sectionItem}>
            <Text style={styles.sectionIcon}>⭐</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Mes évaluations</Text>
              <Text style={styles.sectionDescription}>Voir mes notes et avis</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          {/* Section Historique */}
          <TouchableOpacity style={styles.sectionItem}>
            <Text style={styles.sectionIcon}>📊</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Historique</Text>
              <Text style={styles.sectionDescription}>Tous mes services terminés</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          {/* Section Paramètres */}
          <TouchableOpacity style={styles.sectionItem}>
            <Text style={styles.sectionIcon}>⚙️</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Paramètres</Text>
              <Text style={styles.sectionDescription}>Notifications, confidentialité</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          {/* Section Aide */}
          <TouchableOpacity style={styles.sectionItem}>
            <Text style={styles.sectionIcon}>❓</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Aide & Support</Text>
              <Text style={styles.sectionDescription}>FAQ, nous contacter</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* 🎯 BOUTONS D'ACTION */}
        <View style={styles.actionsContainer}>
          
          {/* Bouton Admin (développement) */}
          <TouchableOpacity 
            style={styles.adminButton}
            onPress={goToAdmin}
          >
            <Text style={styles.adminButtonText}>🔧 Administration</Text>
          </TouchableOpacity>

          {/* Bouton Déconnexion */}
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>🚪 Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        {/* 🎯 FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
          <Text style={styles.footerText}>Plateforme de mise en relation</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 5,
  },
  userContainer: {
    backgroundColor: '#ffffff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  userEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  userType: {
    fontSize: 12,
    color: '#3498db',
    marginTop: 2,
    fontWeight: '500',
  },
  sectionsContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 15,
    width: 30,
    textAlign: 'center',
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  arrow: {
    fontSize: 16,
    color: '#bdc3c7',
  },
  actionsContainer: {
    margin: 15,
    gap: 10,
  },
  adminButton: {
    backgroundColor: '#f39c12',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#bdc3c7',
    textAlign: 'center',
  },
});