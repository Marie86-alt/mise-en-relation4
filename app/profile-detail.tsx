import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { profilesService } from '@/src/services/firebase/profile';
import { Colors } from '@/constants/Colors';

// --- TYPES ---
// Ces types correspondent maintenant aux données réelles de la collection 'users'
type Review = {
  id: string;
  rating: number;
  comment: string;
};

type Profile = {
  id: string;
  displayName: string;
  photo?: string;
  secteur?: string;
  experience?: number;
  ville?: string;
  averageRating?: number;
  totalReviews?: number;
  tarifHeure?: number;
  isVerified?: boolean;
  isActive?: boolean;
  description?: string;
  qualifications?: string[];
  jour?: string;
  horaires?: { debut: string; fin: string };
  specialisationPublic?: string;
};

export default function ProfileDetailScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const profileId = params.profileId as string;
  
  const { secteur, jour, heureDebut, heureFin } = params;

  // ✅ LOGIQUE DE CHARGEMENT 100% RÉELLE
  const loadProfileData = useCallback(async () => {
    if (!profileId) {
      setError('ID de profil manquant.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // Appel direct au service qui cherche dans la collection "users"
      const profileData = await profilesService.getProfile(profileId) as Profile | null;
      
      if (profileData) {
        setProfile(profileData);
        // On garde des avis "mock" pour l'instant, car cette fonctionnalité n'est pas encore développée
        const mockReviews: Review[] = [
          { id: '1', rating: 5, comment: 'Très professionnelle et attentionnée.' },
          { id: '2', rating: 4, comment: 'Ponctuelle et efficace.' }
        ];
        setReviews(mockReviews);
      } else {
        setError(`Aucun profil trouvé pour l'ID : ${profileId}`);
      }
      
    } catch (err: any) {
      setError(`Erreur lors du chargement : ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const renderStars = (note: number = 0) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(<Text key={i} style={i <= note ? styles.star : styles.emptyStar}>★</Text>);
    }
    return stars;
  };

  const handleEntreeEnContact = () => {
     if (!profile) return;
     Alert.alert(
      '📞 Entrée en contact',
      `Voulez-vous entrer en contact avec ${profile.displayName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'default',
          onPress: () => {
            router.push({
              pathname: '/conversation',
              params: {
                profileId: profile.id,
                profileName: profile.displayName,
                secteur: secteur as string,
                jour: jour as string,
                heureDebut: heureDebut as string,
                heureFin: heureFin as string,
              }
            });
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Profil non trouvé'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfileData}>
            <Text style={styles.retryButtonText}>🔄 Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
            <Text style={styles.headerBackButtonText}>← Retour à la liste</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <Image 
            source={{ uri: profile.photo || 'https://via.placeholder.com/150' }} 
            style={styles.profilePhoto}
          />
          <View style={styles.profileMainInfo}>
            <Text style={styles.profileName}>{profile.displayName}</Text>
            <Text style={styles.profileSector}>{profile.secteur}</Text>
            <Text style={styles.profileExperience}>{profile.experience || 0} ans d&apos;expérience</Text>
            <Text style={styles.profileLocation}>{profile.ville || 'Ville non renseignée'}</Text>
            <View style={styles.ratingSection}>
              <View style={styles.starsContainer}>{renderStars(profile.averageRating)}</View>
              <Text style={styles.ratingText}>
                {profile.averageRating ? `${profile.averageRating}/5 (${profile.totalReviews || 0} avis)` : 'Nouveau profil'}
              </Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, profile.isActive ? styles.disponible : styles.indisponible]}>
                <Text style={[styles.statusText, profile.isActive ? styles.disponibleText : styles.indisponibleText]}>Disponible</Text>
              </View>
              {profile.isVerified && <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Vérifié</Text></View>}
            </View>
          </View>
        </View>

        {profile.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Description</Text>
            <Text style={styles.description}>{profile.description}</Text>
          </View>
        )}

        {profile.qualifications && profile.qualifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎓 Qualifications</Text>
            {profile.qualifications.map((q, i) => <Text key={i} style={styles.qualificationText}>• {q}</Text>)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Tarifs</Text>
          <View style={styles.tarifContainer}>
            <Text style={styles.tarifPrice}>{profile.tarifHeure || 'N/A'}€/heure</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⭐ Avis clients ({reviews.length})</Text>
          {reviews.map(r => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>Client anonyme</Text>
                <View style={styles.reviewRating}>{renderStars(r.rating)}</View>
              </View>
              <Text style={styles.reviewComment}>{r.comment}</Text>
            </View>
          ))}
        </View>

        <View style={styles.contactSection}>
          <TouchableOpacity style={styles.contactButton} onPress={handleEntreeEnContact}>
            <Text style={styles.contactButtonText}>📞 Entrée en contact</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 16, color: '#6c757d' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: Colors.light.danger, textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: Colors.light.primary, padding: 12, borderRadius: 8, marginBottom: 10 },
  retryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  header: { backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerBackButton: { alignSelf: 'flex-start' },
  headerBackButtonText: { color: Colors.light.primary, fontSize: 16, fontWeight: '500' },
  profileSection: { backgroundColor: '#ffffff', padding: 20, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  profilePhoto: { width: 80, height: 80, borderRadius: 40, marginRight: 20 },
  profileMainInfo: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
  profileSector: { fontSize: 16, color: Colors.light.primary, fontWeight: '500', marginBottom: 5 },
  profileExperience: { fontSize: 14, color: '#6c757d', marginBottom: 5 },
  profileLocation: { fontSize: 14, color: '#6c757d', marginBottom: 10 },
  ratingSection: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  starsContainer: { flexDirection: 'row' },
  star: { color: '#f39c12', fontSize: 16 },
  emptyStar: { color: '#dee2e6', fontSize: 16 },
  ratingText: { fontSize: 14, color: '#6c757d' },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  disponible: { backgroundColor: '#d4edda' },
  indisponible: { backgroundColor: '#f8d7da' },
  statusText: { fontSize: 12, fontWeight: '500' },
  disponibleText: { color: '#155724' },
  indisponibleText: { color: '#721c24' },
  verifiedBadge: { backgroundColor: '#cce5ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 15 },
  verifiedText: { fontSize: 12, color: '#0066cc', fontWeight: '500' },
  section: { backgroundColor: '#ffffff', padding: 20, marginBottom: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginBottom: 15 },
  description: { fontSize: 16, color: '#495057', lineHeight: 24 },
  qualificationText: { fontSize: 16, color: '#495057', marginBottom: 8 },
  tarifContainer: { alignItems: 'center', padding: 15, backgroundColor: '#f8f9fa', borderRadius: 8 },
  tarifPrice: { fontSize: 24, fontWeight: 'bold', color: Colors.light.success, marginBottom: 5 },
  reviewCard: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, marginBottom: 15 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  reviewerName: { fontSize: 16, fontWeight: '600', color: '#2c3e50' },
  reviewRating: { flexDirection: 'row' },
  reviewComment: { fontSize: 15, color: '#495057', lineHeight: 22 },
  contactSection: { padding: 20, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  contactButton: { backgroundColor: Colors.light.primary, paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  contactButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  bottomSpace: { height: 30 },
});

