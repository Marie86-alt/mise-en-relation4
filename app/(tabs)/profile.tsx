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
            
            } catch (error) {
              console.error('Erreur déconnexion:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          }
        }
      ]
    );
  };

  const goToAdmin = (): void => {
    router.push('/admin-seed');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* 🧡 HEADER ORANGE CAROTTE */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧡 Mon Profil</Text>
          <Text style={styles.headerSubtitle}>Plateforme d&apos;accompagnement seniors</Text>
        </View>

        {/* 👤 INFORMATIONS UTILISATEUR */}
        <View style={styles.userContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Utilisateur</Text>
            <Text style={styles.userEmail}>{user?.email || 'Non défini'}</Text>
            <Text style={styles.userDescription}>
              Membre de la plateforme seniors
            </Text>
          </View>
        </View>

        {/* 📋 SECTIONS SPÉCIALISÉES SENIORS */}
        <View style={styles.sectionsContainer}>
          
          <TouchableOpacity style={styles.sectionItem}>
            <Text style={styles.sectionIcon}>📝</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Mes informations</Text>
              <Text style={styles.sectionDescription}>Données personnelles</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sectionItem}>
            <Text style={styles.sectionIcon}>🤝</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Mes services</Text>
              <Text style={styles.sectionDescription}>Services reçus et proposés</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sectionItem}>
            <Text style={styles.sectionIcon}>⭐</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Mes évaluations</Text>
              <Text style={styles.sectionDescription}>Notes et avis</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sectionItem}>
            <Text style={styles.sectionIcon}>📊</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Historique</Text>
              <Text style={styles.sectionDescription}>Services terminés</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sectionItem}>
            <Text style={styles.sectionIcon}>🆘</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Aide Seniors</Text>
              <Text style={styles.sectionDescription}>Support spécialisé</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* 🧡 INFORMATIONS SPÉCIALISÉES */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>🧡 Accompagnement Seniors</Text>
          <Text style={styles.infoText}>
            Plateforme spécialisée dans l&apos;aide à domicile pour personnes âgées
          </Text>
        </View>

        {/* 🎯 BOUTONS ORANGE CAROTTE */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.adminButton} onPress={goToAdmin}>
            <Text style={styles.adminButtonText}>🔧 Administration</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>🚪 Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  scrollContainer: {
    flex: 1,
  },

  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FF6B35',
    letterSpacing: 0.5,
  },

  headerSubtitle: {
    fontSize: 16,
    color: '#757575',
    marginTop: 8,
  },

  userContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 0,
    shadowOpacity: 0,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '600',
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
  },

  userEmail: {
    fontSize: 16,
    color: '#757575',
    marginTop: 4,
  },

  userDescription: {
    fontSize: 14,
    color: '#FF6B35',
    marginTop: 4,
    fontWeight: '500',
  },

  sectionsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 0,
    shadowOpacity: 0,
  },

  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },

  sectionIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
    textAlign: 'center',
  },

  sectionContent: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },

  sectionDescription: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },

  arrow: {
    fontSize: 18,
    color: '#E0E0E0',
  },

  infoSection: {
    backgroundColor: '#FFF8F5',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE5D6',
    alignItems: 'center',
  },

  infoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF6B35',
    marginBottom: 12,
    textAlign: 'center',
  },

  infoText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 24,
  },

  actionsContainer: {
    marginHorizontal: 20,
    gap: 12,
  },

  adminButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },

  adminButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  logoutButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },

  bottomSpace: {
    height: 20,
  },
});