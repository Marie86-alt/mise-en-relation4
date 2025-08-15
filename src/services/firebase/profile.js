import {
  collection,
  getDocs,
  query,
  where,
  getDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../../firebase.config.js';

export const profilesService = {

  /**
   * Recherche les utilisateurs qui ont un profil aidant activé.
   * Cible la collection 'users' et filtre selon les critères.
   */
  searchProfiles: async (searchCriteria) => {
    try {
      const { secteur,  preferenceAidant } = searchCriteria;
     
      console.log('🔍 Lancement de la recherche dans la collection "users":', searchCriteria);
      
      const usersCollection = collection(db, 'users');
      
      // 1. Filtre de base côté Firebase : ne récupérer que les utilisateurs qui sont aidants.
      const constraints = [where('isAidant', '==', true)];
      
      // Le reste des filtres est trop complexe pour Firestore, on les fait côté client.
      const finalQuery = query(usersCollection, ...constraints);
      const snapshot = await getDocs(finalQuery);
      
      const profiles = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // 2. Filtre côté client
        
        // Filtre par secteur
        const secteurCompatible = !secteur || data.secteur === secteur;

        // Filtre par horaires (à affiner si vous stockez les disponibilités des aidants)
        const horaireCompatible = true; // Pour l'instant, on accepte tout le monde

        // Filtre par préférence de genre de l'aidant
        let preferencesCompatibles = true;
        if (preferenceAidant && preferenceAidant !== 'Indifférent' && data.genre) {
          preferencesCompatibles = data.genre.toLowerCase() === preferenceAidant.toLowerCase();
        }
        
        if (secteurCompatible && horaireCompatible && preferencesCompatibles) {
          profiles.push({
            id: doc.id, // L'ID du document est l'UID de l'utilisateur
            ...data
          });
        }
      });
      
      console.log(`✅ ${profiles.length} profils aidants trouvés après filtrage.`);
      
      profiles.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
      
      return profiles;
    } catch (error) {
      console.error('❌ Erreur lors de la recherche de profils:', error);
      throw error;
    }
  },

  /**
   * Récupère un profil utilisateur unique depuis la collection 'users'.
   */
  getProfile: async (userId) => {
     try {
      console.log('🔄 Récupération du profil utilisateur depuis la collection USERS, ID:', userId);
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() };
        console.log('✅ Utilisateur trouvé:', userData.displayName);
        return userData;
      } else {
        console.warn('⚠️ Utilisateur non trouvé avec ID:', userId);
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur getProfile:', error);
      return null;
    }
  },

  // Note : Les fonctions ci-dessous (updateProfile, etc.) sont maintenant gérées
  // par le AuthContext, mais on les garde ici au cas où vous auriez besoin
  // de logiques plus complexes qui ne sont pas liées à l'utilisateur connecté.

  /**
   * Met à jour des données pour un utilisateur spécifique dans la collection 'users'.
   */
  updateProfile: async (userId, updateData) => {
    try {
      console.log('🔄 Mise à jour de l\'utilisateur:', userId);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, updateData);
      console.log('✅ Utilisateur mis à jour');
      return true;
    } catch (error) {
      console.error('❌ Erreur updateProfile:', error);
      throw error;
    }
  },
};