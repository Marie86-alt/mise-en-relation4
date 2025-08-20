// src/services/firebase/avisService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../firebase.config';

export interface Avis {
  id?: string;
  aidantId: string;
  clientId: string;
  conversationId: string;
  rating: number; // 1-5 étoiles
  comment: string;
  serviceDate: string;
  secteur: string;
  dureeService: number;
  montantService: number;
  createdAt: any;
  
  // Métadonnées
  clientName?: string;
  isVerified?: boolean;
}

export interface AvisStats {
  totalAvis: number;
  moyenneRating: number;
  repartition: { [key: number]: number }; // { 1: 2, 2: 1, 3: 5, 4: 10, 5: 15 }
}

export const avisService = {
  /**
   * 💾 Sauvegarde un nouvel avis
   */
  async createAvis(avisData: Omit<Avis, 'id' | 'createdAt'>): Promise<string> {
    try {
      console.log('💾 Sauvegarde nouvel avis:', avisData);
      
      // 📝 Données complètes de l'avis
      const avisComplet: Omit<Avis, 'id'> = {
        ...avisData,
        createdAt: serverTimestamp(),
        isVerified: true
      };
      
      // 💾 Sauvegarde en base
      const docRef = await addDoc(collection(db, 'avis'), avisComplet);
      
      // 📊 Mise à jour des stats de l'aidant
      await this.updateAidantStats(avisData.aidantId, avisData.rating);
      
      console.log('✅ Avis sauvegardé avec ID:', docRef.id);
      
      return docRef.id;
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde avis:', error);
      throw error;
    }
  },

  /**
   * 📊 Met à jour les statistiques de l'aidant
   */
  async updateAidantStats(aidantId: string, newRating: number): Promise<void> {
    try {
      const aidantRef = doc(db, 'users', aidantId);
      
      // Récupérer les avis existants pour recalculer la moyenne
      const avisQuery = query(
        collection(db, 'avis'),
        where('aidantId', '==', aidantId)
      );
      const avisSnap = await getDocs(avisQuery);
      
      const totalAvis = avisSnap.docs.length + 1; // +1 pour le nouvel avis
      let sommeRatings = newRating;
      
      avisSnap.docs.forEach(doc => {
        const avis = doc.data() as Avis;
        sommeRatings += avis.rating;
      });
      
      const moyenneRating = Math.round((sommeRatings / totalAvis) * 10) / 10;
      
      // Mise à jour du profil aidant
      await updateDoc(aidantRef, {
        averageRating: moyenneRating,
        totalReviews: totalAvis,
        lastReviewAt: serverTimestamp()
      });
      
      console.log('📊 Stats aidant mises à jour:', {
        aidantId,
        moyenneRating,
        totalAvis
      });
      
    } catch (error) {
      console.error('❌ Erreur mise à jour stats aidant:', error);
    }
  },

  /**
   * 📖 Récupère les avis d'un aidant
   */
  async getAvisAidant(aidantId: string, limitCount: number = 10): Promise<Avis[]> {
    try {
      const avisQuery = query(
        collection(db, 'avis'),
        where('aidantId', '==', aidantId),
        where('isVerified', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const avisSnap = await getDocs(avisQuery);
      
      const avisList: Avis[] = avisSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Avis));
      
      console.log(`📖 ${avisList.length} avis récupérés pour aidant ${aidantId}`);
      return avisList;
      
    } catch (error) {
      console.error('❌ Erreur récupération avis:', error);
      return [];
    }
  },

  /**
   * 📊 Calcule les statistiques d'avis d'un aidant
   */
  async getAvisStats(aidantId: string): Promise<AvisStats> {
    try {
      const avisQuery = query(
        collection(db, 'avis'),
        where('aidantId', '==', aidantId),
        where('isVerified', '==', true)
      );
      
      const avisSnap = await getDocs(avisQuery);
      
      const stats: AvisStats = {
        totalAvis: avisSnap.docs.length,
        moyenneRating: 0,
        repartition: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
      
      if (stats.totalAvis === 0) return stats;
      
      let sommeRatings = 0;
      avisSnap.docs.forEach(doc => {
        const avis = doc.data() as Avis;
        sommeRatings += avis.rating;
        stats.repartition[avis.rating]++;
      });
      
      stats.moyenneRating = Math.round((sommeRatings / stats.totalAvis) * 10) / 10;
      
      return stats;
      
    } catch (error) {
      console.error('❌ Erreur calcul stats avis:', error);
      return {
        totalAvis: 0,
        moyenneRating: 0,
        repartition: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }
  },

  /**
   * 🔍 Recherche d'avis par mots-clés
   */
  async searchAvisByKeywords(keywords: string[]): Promise<Avis[]> {
    try {
      // Firebase ne permet pas de recherche full-text, donc on récupère tous les avis récents
      // et on filtre côté client (pour une vraie app, utiliser Algolia ou Elasticsearch)
      const avisQuery = query(
        collection(db, 'avis'),
        where('isVerified', '==', true),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const avisSnap = await getDocs(avisQuery);
      
      const avisList: Avis[] = avisSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Avis))
        .filter(avis => {
          const commentLower = avis.comment.toLowerCase();
          return keywords.some(keyword => 
            commentLower.includes(keyword.toLowerCase())
          );
        });
      
      console.log(`🔍 ${avisList.length} avis trouvés avec mots-clés:`, keywords);
      return avisList;
      
    } catch (error) {
      console.error('❌ Erreur recherche avis:', error);
      return [];
    }
  }
};