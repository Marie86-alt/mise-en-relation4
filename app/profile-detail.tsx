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
import { profilesService } from '../src/services/firebase/profile';

type Review = {
  id: string;
  clientId: string;
  rating: number;
  comment: string;
  createdAt: string;
  dateService: string;
  dureeService: number;
};

type Profile = {
  id: string;
  nom: string;
  prenom: string;
  age: number;
  genre: string;
  photo: string;
  secteur: string;
  jour: string;
  horaires: {
    debut: string;
    fin: string;
  };
  specialisationPublic: string;
  adresse: string;
  ville: string;
  codePostal: string;
  experience: number;
  qualifications: string[];
  description: string;
  averageRating: number;
  totalReviews: number;
  tarifHeure: number;
  isActive: boolean;
  isVerified: boolean;
};

// 🔄 Fonction de secours avec données de démonstration
const getMockProfileData = (profileId: string): Profile => {
  return {
    id: profileId,
    nom: 'Dupont',
    prenom: 'Marie',
    age: 35,
    genre: 'femme',
    photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300',
    secteur: 'aide-domicile',
    jour: '15/08',
    horaires: {
      debut: '08:00',
      fin: '18:00'
    },
    specialisationPublic: 'femme',
    adresse: '123 rue de la Paix',
    ville: 'Paris',
    codePostal: '75001',
    experience: 8,
    qualifications: [
      'Diplôme d\'aide-soignant',
      'Formation Alzheimer',
      'Secourisme PSC1'
    ],
    description: 'Aide-soignante expérimentée, spécialisée dans l\'accompagnement des personnes âgées. Douce et attentive, je propose mes services d\'aide à domicile avec bienveillance et professionnalisme.',
    averageRating: 4.8,
    totalReviews: 47,
    tarifHeure: 28,
    isActive: true,
    isVerified: true
  };
};

// 🔄 Fonction hybride - Essaie Firebase, utilise les données de secours si échec
const loadProfileWithFallback = async (profileId: string): Promise<Profile> => {
  try {
    console.log('🔄 Tentative de chargement depuis Firebase...');
    
    // Essayer de charger depuis Firebase
    const firebaseData = await profilesService.getProfile(profileId) as any;
    
    console.log('📊 Données Firebase reçues:', firebaseData);
    console.log('🔑 Clés Firebase:', Object.keys(firebaseData || {}));
    
    // Vérifier si Firebase retourne des données complètes
    if (firebaseData && firebaseData.nom && firebaseData.secteur) {
      console.log('✅ Données complètes depuis Firebase');
      
      // S'assurer que tous les champs sont présents
      return {
        id: firebaseData.id,
        nom: firebaseData.nom || 'Nom non renseigné',
        prenom: firebaseData.prenom || 'Prénom',
        age: firebaseData.age || 0,
        genre: firebaseData.genre || 'Non spécifié',
        photo: firebaseData.photo || 'https://via.placeholder.com/150',
        secteur: firebaseData.secteur || 'Secteur non renseigné',
        jour: firebaseData.jour || 'Non renseigné',
        horaires: firebaseData.horaires || { debut: '00:00', fin: '00:00' },
        specialisationPublic: firebaseData.specialisationPublic || 'Tous',
        adresse: firebaseData.adresse || 'Adresse non renseignée',
        ville: firebaseData.ville || 'Ville non renseignée',
        codePostal: firebaseData.codePostal || '00000',
        experience: firebaseData.experience || 0,
        qualifications: firebaseData.qualifications || ['Aucune qualification renseignée'],
        description: firebaseData.description || 'Aucune description disponible',
        averageRating: firebaseData.averageRating || 0,
        totalReviews: firebaseData.totalReviews || 0,
        tarifHeure: firebaseData.tarifHeure || 0,
        isActive: firebaseData.isActive !== false,
        isVerified: firebaseData.isVerified || false
      };
    } else {
      console.warn('⚠️ Firebase ne retourne que l\'ID, utilisation des données de secours');
      return getMockProfileData(profileId);
    }
    
  } catch (error) {
    console.error('❌ Erreur Firebase, utilisation des données de secours:', error);
    return getMockProfileData(profileId);
  }
};

// ... [garde tout le code existant jusqu'à la fonction]

function ProfileDetailScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const profileId = params.profileId as string;
  
  // Paramètres de recherche pour la demande de service
  const { 
    secteur, 
    jour, 
    heureDebut, 
    heureFin, 
    etatCivil, 
    preferenceAidant 
  } = params;

  const loadProfileData = useCallback(async () => {
    if (!profileId) {
      setError('ID de profil manquant');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Chargement du profil:', profileId);
      setLoading(true);
      setError(null);

      // Charger le profil avec système de secours
      const profileData = await loadProfileWithFallback(profileId);
      
      setProfile(profileData);
      console.log('✅ Profil chargé:', profileData.nom);
      
      // Génération d'avis de démonstration
      const mockReviews: Review[] = [
        {
          id: '1',
          clientId: 'client1',
          rating: 5,
          comment: 'Excellente aide, très professionnelle et attentionnée.',
          createdAt: '2025-08-10T10:00:00Z',
          dateService: '2025-08-10',
          dureeService: 4
        },
        {
          id: '2',
          clientId: 'client2', 
          rating: 4,
          comment: 'Très bien, ponctuelle et efficace.',
          createdAt: '2025-08-08T15:00:00Z',
          dateService: '2025-08-08',
          dureeService: 3
        }
      ];
      setReviews(mockReviews);
      
    } catch (err) {
      console.error('❌ Erreur chargement profil:', err);
      setError('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const renderStars = (note: number) => {
    const stars = [];
    const fullStars = Math.floor(note);
    const hasHalfStar = note % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Text key={i} style={styles.star}>★</Text>);
    }
    if (hasHalfStar) {
      stars.push(<Text key="half" style={styles.star}>☆</Text>);
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push(<Text key={i} style={styles.emptyStar}>☆</Text>);
    }
    return stars;
  };

  const handleEntreeEnContact = () => {
    if (!profile) return;
    
    Alert.alert(
      '📞 Entrée en contact',
      `Voulez-vous entrer en contact avec ${profile.prenom} ${profile.nom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'default',
          onPress: () => {
            // Simulation de la conversation avec tous les critères selon cahier des charges
            Alert.alert(
              '💬 Conversation',
              `Conversation avec ${profile.prenom} ${profile.nom}\n\n` +
              `Secteur: ${secteur}\n` +
              `Jour: ${jour}\n` +
              `Horaires: ${heureDebut} - ${heureFin}\n` +
              `Pour une ${etatCivil}\n` +
              `Aidant préféré: ${preferenceAidant}\n\n` +
              'Cette fonctionnalité sera bientôt disponible !',
              [
                {
                  text: 'Confirmer le service',
                  onPress: () => {
                    Alert.alert(
                      '✅ Service confirmé',
                      'Le service a été confirmé !\n\n' +
                      '📍 Vous allez saisir l\'adresse\n' +
                      '💳 Un acompte de 20% sera demandé\n' +
                      '🔍 Des vérifications seront effectuées\n' +
                      '⭐ Une évaluation sera demandée à la fin',
                      [
                        { 
                          text: 'Parfait !', 
                          onPress: () => router.back() 
                        }
                      ]
                    );
                  }
                },
                { text: 'Continuer la conversation' }
              ]
            );
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
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
          <TouchableOpacity style={styles.backButtonError} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header avec bouton retour */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerBackButton}
            onPress={() => router.back()}
          >
            <Text style={styles.headerBackButtonText}>← Retour</Text>
          </TouchableOpacity>
        </View>

        {/* Photo et informations principales */}
        <View style={styles.profileSection}>
          <Image 
            source={{ uri: profile.photo }} 
            style={styles.profilePhoto}
            defaultSource={{ uri: 'https://via.placeholder.com/150' }}
          />
          <View style={styles.profileMainInfo}>
            <Text style={styles.profileName}>
              {profile.prenom} {profile.nom}
            </Text>
            <Text style={styles.profileSector}>{profile.secteur}</Text>
            <Text style={styles.profileExperience}>
              {profile.experience} ans d&apos;expérience
            </Text>
            <Text style={styles.profileLocation}>
              {profile.ville} ({profile.codePostal})
            </Text>
            
            <View style={styles.ratingSection}>
              <View style={styles.starsContainer}>
                {renderStars(profile.averageRating)}
              </View>
              <Text style={styles.ratingText}>
                {profile.averageRating > 0 
                  ? `${profile.averageRating}/5 (${profile.totalReviews} avis)`
                  : 'Nouveau profil'
                }
              </Text>
            </View>

            <View style={styles.statusContainer}>
              <View style={[
                styles.statusBadge,
                profile.isActive ? styles.disponible : styles.indisponible
              ]}>
                <Text style={[
                  styles.statusText,
                  profile.isActive ? styles.disponibleText : styles.indisponibleText
                ]}>
                  {profile.isActive ? 'Disponible' : 'Occupé'}
                </Text>
              </View>
              {profile.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ Vérifié</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Disponibilités selon critères de recherche */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Disponibilités</Text>
          <View style={styles.scheduleInfo}>
            <Text style={styles.scheduleText}>
              <Text style={styles.scheduleLabel}>Jour :</Text> {profile.jour}
            </Text>
            <Text style={styles.scheduleText}>
              <Text style={styles.scheduleLabel}>Horaires :</Text> {profile.horaires.debut} - {profile.horaires.fin}
            </Text>
            <Text style={styles.scheduleText}>
              <Text style={styles.scheduleLabel}>Spécialisé pour :</Text> {profile.specialisationPublic}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Description</Text>
          <Text style={styles.description}>{profile.description}</Text>
        </View>

        {/* Qualifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎓 Qualifications</Text>
          {profile.qualifications.map((qualification: string, index: number) => (
            <Text key={index} style={styles.qualificationText}>
              • {qualification}
            </Text>
          ))}
        </View>

        {/* Tarifs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Tarifs</Text>
          <View style={styles.tarifContainer}>
            <Text style={styles.tarifPrice}>{profile.tarifHeure}€/heure</Text>
            <Text style={styles.tarifNote}>
              Les tarifs peuvent varier selon le type de service et les horaires
            </Text>
          </View>
        </View>

        {/* Avis clients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ⭐ Avis clients ({reviews.length})
          </Text>
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>Client anonyme</Text>
                <View style={styles.reviewRating}>
                  {renderStars(review.rating)}
                </View>
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <Text style={styles.reviewComment}>{review.comment}</Text>
              <Text style={styles.reviewServiceInfo}>
                Service de {review.dureeService}h le {review.dateService}
              </Text>
            </View>
          ))}
          {reviews.length === 0 && (
            <Text style={styles.noReviewsText}>Aucun avis pour le moment</Text>
          )}
        </View>

        {/* Bouton "entrée en contact" selon cahier des charges */}
        <View style={styles.contactSection}>
          <TouchableOpacity 
            style={styles.contactButton} 
            onPress={handleEntreeEnContact}
          >
            <Text style={styles.contactButtonText}>
              📞 Entrée en contact
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.contactInfo}>
            En cliquant sur &quot;Entrée en contact&quot;, vous allez être redirigé vers une conversation 
            pour vous mettre d&apos;accord sur la réalisation du service.
          </Text>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  backButtonError: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerBackButton: {
    alignSelf: 'flex-start',
  },
  headerBackButtonText: {
    color: '#ecf0f1',
    fontSize: 16,
  },
  profileSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 20,
  },
  profileMainInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  profileSector: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
    marginBottom: 5,
  },
  profileExperience: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  profileLocation: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 10,
  },
  ratingSection: {
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  star: {
    color: '#f39c12',
    fontSize: 18,
  },
  emptyStar: {
    color: '#dee2e6',
    fontSize: 18,
  },
  ratingText: {
    fontSize: 14,
    color: '#6c757d',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  disponible: {
    backgroundColor: '#d4edda',
  },
  indisponible: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  disponibleText: {
    color: '#155724',
  },
  indisponibleText: {
    color: '#721c24',
  },
  verifiedBadge: {
    backgroundColor: '#cce5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
  },
  verifiedText: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  scheduleInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  scheduleText: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 8,
  },
  scheduleLabel: {
    fontWeight: '600',
    color: '#2c3e50',
  },
  description: {
    fontSize: 16,
    color: '#495057',
    lineHeight: 24,
  },
  qualificationText: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 8,
  },
  tarifContainer: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  tarifPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 5,
  },
  tarifNote: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  reviewCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 'auto',
  },
  reviewComment: {
    fontSize: 15,
    color: '#495057',
    lineHeight: 22,
    marginBottom: 8,
  },
  reviewServiceInfo: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  noReviewsText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
  contactSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  contactButton: {
    backgroundColor: '#3498db',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactInfo: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSpace: {
    height: 30,
  },
});

// ✅ Export par défaut explicite pour Expo Router
export default ProfileDetailScreen;