import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { profilesService } from '../src/services/firebase/profile';

// Type pour un profil, aligné avec la structure de Firestore
type Profile = {
  id: string;
  nom: string;
  prenom: string;
  age: number;
  secteur: string;
  tarifHeure: number;
  averageRating: number;
  totalReviews: number;
  photo: string;
  isActive: boolean;
  experience: number;
  description: string;
  genre: string;
  ville: string;
  jour: string;
  horaires: {
    debut: string;
    fin: string;
  };
};

export default function ProfileListScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const params = useLocalSearchParams();
  // CORRECTION : On récupère "etatCivilPersonne" au lieu de "etatCivil"
  const { 
    secteur, jour, heureDebut, heureFin, etatCivilPersonne, preferenceAidant 
  } = params;

  // Fonction pour charger les profils depuis Firebase
  const loadProfiles = useCallback(async () => {
    try {
      console.log('🔄 Chargement des profils depuis Firebase...');
      setLoading(true);
      setError(null);

      // CORRECTION : On utilise "etatCivilPersonne" pour construire les critères
      const searchCriteria = {
        secteur: secteur as string,
        jour: jour as string,
        heureDebut: heureDebut as string,
        heureFin: heureFin as string,
        etatCivil: etatCivilPersonne as string, // On assigne la bonne variable
        preferenceAidant: preferenceAidant as string
      };

      console.log('🔍 Critères de recherche envoyés à Firebase (corrigés):', searchCriteria);

      const firebaseProfiles = await profilesService.searchProfiles(searchCriteria);
      
      setProfiles(firebaseProfiles as Profile[]);
      console.log(`✅ ${firebaseProfiles.length} profils chargés depuis Firebase`);
      
    } catch (err: any) {
      console.error('❌ Erreur chargement profils:', err);
      setError('Erreur lors du chargement. Avez-vous créé l\'index dans Firebase ?');
    } finally {
      setLoading(false);
    }
  }, [secteur, jour, heureDebut, heureFin, etatCivilPersonne, preferenceAidant]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const renderStars = (note: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={i <= note ? styles.star : styles.emptyStar}>★</Text>
      );
    }
    return stars;
  };

  const handleContactPress = (profile: Profile) => {
    router.push({
      pathname: '/profile-detail',
      params: { 
        profileId: profile.id, 
        secteur: secteur as string,
        jour: jour as string,
        heureDebut: heureDebut as string,
        heureFin: heureFin as string,
        etatCivil: etatCivilPersonne as string, // On passe le bon paramètre
        preferenceAidant: preferenceAidant as string
      }
    });
  };

  const renderProfile = ({ item }: { item: Profile }) => (
    <TouchableOpacity 
      style={styles.profileCard}
      onPress={() => handleContactPress(item)}
    >
      <View style={styles.profileHeader}>
        <Image 
          source={{ uri: item.photo }} 
          style={styles.profilePhoto}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{item.prenom} {item.nom}</Text>
          <Text style={styles.profileSector}>{item.secteur}</Text>
          <Text style={styles.profileExperience}>{item.experience} ans d&apos;expérience</Text>
          <Text style={styles.profileSchedule}>{item.jour} • {item.horaires.debut} - {item.horaires.fin}</Text>
        </View>
        <View style={styles.profileRight}>
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>{renderStars(item.averageRating)}</View>
            <Text style={styles.ratingText}>
              {item.averageRating > 0 ? `${item.averageRating} (${item.totalReviews})` : 'Nouveau'}
            </Text>
          </View>
          <Text style={styles.profileTarif}>{item.tarifHeure}€/h</Text>
          <View style={[styles.statusBadge, item.isActive ? styles.disponible : styles.indisponible]}>
            <Text style={[styles.statusText, item.isActive ? styles.disponibleText : styles.indisponibleText]}>
              {item.isActive ? 'Disponible' : 'Occupé'}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.profileDescription} numberOfLines={2}>{item.description}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c3e50" />
          <Text style={styles.loadingText}>🔍 Recherche des profils...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfiles}>
            <Text style={styles.retryButtonText}>🔄 Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Nouvelle recherche</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aidants disponibles</Text>
        <Text style={styles.resultCount}>{profiles.length} profil(s) trouvé(s)</Text>
      </View>

      <FlatList
        data={profiles}
        renderItem={renderProfile}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Aucun profil trouvé</Text>
            <Text style={styles.emptyText}>
              Aucun aidant ne correspond à vos critères. Essayez d&apos;élargir votre recherche.
            </Text>
            <TouchableOpacity style={styles.newSearchButton} onPress={() => router.back()}>
              <Text style={styles.newSearchButtonText}>Modifier la recherche</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  backButton: { marginBottom: 10 },
  backButtonText: { color: '#3498db', fontSize: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  resultCount: { color: '#6c757d', fontSize: 14, marginTop: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 18, color: '#6c757d', marginTop: 10 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#e74c3c', textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#3498db', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  listContainer: { padding: 15 },
  profileCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  profileHeader: { flexDirection: 'row', marginBottom: 10 },
  profilePhoto: { width: 60, height: 60, borderRadius: 30, marginRight: 15 },
  profileInfo: { flex: 1, justifyContent: 'center' },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  profileSector: { fontSize: 14, color: '#3498db', fontWeight: '500' },
  profileExperience: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  profileSchedule: { fontSize: 12, color: '#6c757d', fontWeight: '500', marginTop: 2 },
  profileRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  ratingContainer: { alignItems: 'flex-end' },
  starsContainer: { flexDirection: 'row' },
  star: { color: '#f39c12', fontSize: 14 },
  emptyStar: { color: '#dee2e6', fontSize: 14 },
  ratingText: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  profileTarif: { fontSize: 16, fontWeight: 'bold', color: '#27ae60' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  disponible: { backgroundColor: '#d4edda' },
  indisponible: { backgroundColor: '#f8d7da' },
  statusText: { fontSize: 12, fontWeight: '500' },
  disponibleText: { color: '#155724' },
  indisponibleText: { color: '#721c24' },
  profileDescription: { fontSize: 14, color: '#6c757d', lineHeight: 20 },
  emptyContainer: { alignItems: 'center', marginTop: 50, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#6c757d', marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#6c757d', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  newSearchButton: { backgroundColor: '#3498db', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  newSearchButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
});
