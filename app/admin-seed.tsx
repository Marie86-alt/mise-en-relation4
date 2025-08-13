import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { seedFirestore } from '../src/services/firebase/seedData';

export default function AdminSeedScreen() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const router = useRouter();

  const handleSeedFirestore = async () => {
    Alert.alert(
      'Peupler Firestore',
      'Voulez-vous ajouter les données de test à Firestore ? Cette opération va créer 5 profils avec leurs avis.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              setIsSeeding(true);
              setSeedResult(null);
              
              const profiles = await seedFirestore();
              
              setSeedResult(`✅ Succès ! ${profiles.length} profils créés dans Firestore.`);
              
              Alert.alert(
                'Succès !',
                `${profiles.length} profils ont été créés avec succès. Vous pouvez maintenant utiliser l'application avec de vraies données Firebase !`,
                [
                  {
                    // CORRECTION : Remplacement de ' par &apos;
                    text: 'Aller à l\'accueil',
                    onPress: () => router.replace('/(tabs)')
                  }
                ]
              );
              
            // CORRECTION : Le type de 'error' est maintenant 'any'
            } catch (error: any) {
              console.error('Erreur seeding:', error);
              setSeedResult(`❌ Erreur : ${error.message}`);
              Alert.alert('Erreur', 'Impossible de créer les données de test. Vérifiez votre configuration Firebase.');
            } finally {
              setIsSeeding(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Administration Firebase</Text>
          <Text style={styles.subtitle}>Peupler la base de données avec des données de test</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>📊 Données qui seront créées :</Text>
          {/* CORRECTION : Remplacement de ' par &apos; */}
          <Text style={styles.infoText}>• 5 profils d&apos;aidants (garde d&apos;enfants, aide à domicile, ménage)</Text>
          <Text style={styles.infoText}>• Avis et évaluations pour chaque profil</Text>
          <Text style={styles.infoText}>• Photos de profil (placeholders)</Text>
          <Text style={styles.infoText}>• Informations complètes (tarifs, disponibilités, etc.)</Text>
        </View>

        <View style={styles.warningSection}>
          <Text style={styles.warningTitle}>⚠️ Important :</Text>
          <Text style={styles.warningText}>• Cette opération va créer de nouvelles données dans Firestore</Text>
          <Text style={styles.warningText}>• Assurez-vous que Firestore est configuré en mode test</Text>
          <Text style={styles.warningText}>• Cette action ne peut pas être annulée facilement</Text>
        </View>

        <TouchableOpacity
          style={[styles.seedButton, isSeeding && styles.buttonDisabled]}
          onPress={handleSeedFirestore}
          disabled={isSeeding}
        >
          {isSeeding ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.buttonText}>Création en cours...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>🌱 Peupler Firestore</Text>
          )}
        </TouchableOpacity>

        {seedResult && (
          <View style={styles.resultSection}>
            <Text style={styles.resultText}>{seedResult}</Text>
          </View>
        )}

        <View style={styles.navigationSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={isSeeding}
          >
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.replace('/(tabs)')}
            disabled={isSeeding}
          >
            <Text style={styles.homeButtonText}>🏠 Accueil</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>💡 Après avoir peuplé Firestore :</Text>
          <Text style={styles.helpText}>1. Allez à l&apos;accueil de l&apos;application</Text>
          <Text style={styles.helpText}>2. Remplissez le formulaire de recherche</Text>
          <Text style={styles.helpText}>3. Vous verrez maintenant les vrais profils de Firestore</Text>
          <Text style={styles.helpText}>4. Cliquez sur un profil pour voir ses détails</Text>
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
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: '#e8f4fd',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    color: '#34495e',
    marginBottom: 5,
  },
  warningSection: {
    backgroundColor: '#fff3cd',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
  },
  warningText: {
    fontSize: 15,
    color: '#856404',
    marginBottom: 5,
  },
  seedButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultSection: {
    backgroundColor: '#d4edda',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  resultText: {
    fontSize: 16,
    color: '#155724',
    textAlign: 'center',
  },
  navigationSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 15,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  homeButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  helpSection: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  helpText: {
    fontSize: 15,
    color: '#495057',
    marginBottom: 5,
  },
});
