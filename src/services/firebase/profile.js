// import {
//   collection,

//   getDocs,
  
  

//   query,
//   where,
  
// } from 'firebase/firestore';
// import { db } from '../../../firebase.config.js';

// export const profilesService = {

//   // ... (votre fonction createProfile reste inchangée)
//   createProfile: async (profileData) => {
//     // ... code existant
//   },
//   getAllProfiles: async () => {
//     try {
//       console.log('📊 Récupération de tous les profils...');
//       const profilesCollection = collection(db, 'profiles');
//       const snapshot = await getDocs(profilesCollection);
      
//       const profiles = [];
//       snapshot.forEach((doc) => {
//         profiles.push({
//           id: doc.id,
//           ...doc.data()
//         });
//       });
      
//       console.log(`📊 ${profiles.length} profils récupérés depuis Firebase`);
//       return profiles;
//     } catch (error) {
//       console.error('❌ Erreur getAllProfiles:', error);
//       return [];
//     }
//   },

//   // Rechercher des profils disponibles selon les critères
//   searchProfiles: async (searchCriteria) => {
//     try {
//       const { secteur, jour, heureDebut, heureFin, etatCivil, preferenceAidant } = searchCriteria;
      
//       console.log('🔍 Recherche de profils:', searchCriteria);

//       const profilesCollection = collection(db, 'profiles');
//       let constraints = [where('isActive', '==', true)];

//       // Filtres selon le cahier des charges
//       if (secteur) {
//         constraints.push(where('secteur', '==', secteur));
//       }

//       if (jour) {
//         constraints.push(where('jour', '==', jour));
//       }
      
//       if (etatCivil) {
//         constraints.push(where('specialisationPublic', '==', etatCivil));
//       }
      
//       // CORRECTION : On retire le orderBy pour éviter l'erreur d'index manquant.
//       // La requête sera plus simple et ne nécessitera pas d'index composite.
//       const finalQuery = query(profilesCollection, ...constraints);
      
//       // L'ancienne ligne qui causait l'erreur :
//       // profilesQuery = query(profilesQuery, ...constraints, orderBy('averageRating', 'desc'));

//       const snapshot = await getDocs(finalQuery);
//       let profiles = [];

//       snapshot.forEach((doc) => {
//         const data = doc.data();
        
//         // Le reste de votre logique de filtrage côté client reste valide
//         const profileHeureDebut = data.horaires?.debut;
//         const profileHeureFin = data.horaires?.fin;
        
//         let horaireCompatible = true;
//         if (heureDebut && heureFin && profileHeureDebut && profileHeureFin) {
//           horaireCompatible = (heureDebut < profileHeureFin) && (heureFin > profileHeureDebut);
//         }

//         let preferencesCompatibles = true;
//         if (preferenceAidant && data.genre) {
//           preferencesCompatibles = data.genre === preferenceAidant;
//         }

//         if (horaireCompatible && preferencesCompatibles) {
//           profiles.push({
//             id: doc.id,
//             ...data
//           });
//         }
//       });

//       console.log(`✅ ${profiles.length} profils trouvés`);
//       // Si le tri est crucial, vous pouvez le faire ici, après avoir reçu les données :
//       // profiles.sort((a, b) => b.averageRating - a.averageRating);
//       return profiles;
//     } catch (error) {
//       console.error('❌ Erreur recherche profils:', error);
//       throw error;
//     }
//   },

//   // ... (le reste de vos fonctions getProfile, updateProfile, etc. restent inchangées)
//   getProfile: async (profileId) => {
//     // ... code existant
//   },
  
//   updateProfile: async (profileId, updateData) => {
//     // ... code existant
//   },

//   addReview: async (profileId, reviewData) => {
//     // ... code existant
//   },

//   updateProfileRating: async (profileId) => {
//     // ... code existant
//   },
  
//   deactivateProfile: async (profileId) => {
//     // ... code existant
//   }
// };


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
  // ... vos autres fonctions ...

  // ✅ SERVICE CORRIGÉ - Plus flexible
  searchProfiles: async (searchCriteria) => {
    try {
      const { secteur, jour, heureDebut, heureFin, etatCivil, preferenceAidant } = searchCriteria;
     
      console.log('🔍 Recherche de profils:', searchCriteria);
      
      const profilesCollection = collection(db, 'profiles');
      let constraints = [where('isActive', '==', true)];
      
      // ✅ CORRECTION 1: Filtres Firebase stricts seulement pour les champs simples
      if (secteur) {
        constraints.push(where('secteur', '==', secteur));
      }
      if (jour) {
        constraints.push(where('jour', '==', jour));
      }
      
      // ✅ CORRECTION 2: On retire etatCivil des contraintes Firebase
      // car specialisationPublic ne correspond pas à etatCivil dans vos données
      // On fera ce filtrage côté client
      
      const finalQuery = query(profilesCollection, ...constraints);
      const snapshot = await getDocs(finalQuery);
      
      let profiles = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        console.log(`🔍 Test profil ${data.prenom}:`);
        console.log(`   Secteur: "${data.secteur}" vs "${secteur}"`);
        console.log(`   Jour: "${data.jour}" vs "${jour}"`);
        console.log(`   Genre: "${data.genre}" vs "${preferenceAidant}"`);
        console.log(`   SpecialisationPublic: "${data.specialisationPublic}"`);
        console.log(`   etatCivil recherché: "${etatCivil}"`);
       
        // ✅ CORRECTION 3: Logique horaires améliorée
        let horaireCompatible = true;
        if (heureDebut && heureFin && data.horaires?.debut && data.horaires?.fin) {
          const profileStart = parseInt(data.horaires.debut.split(':')[0]);
          const profileEnd = parseInt(data.horaires.fin.split(':')[0]);
          const searchStart = parseInt(heureDebut.split(':')[0]);
          const searchEnd = parseInt(heureFin.split(':')[0]);
          
          // Vérifier si les créneaux se chevauchent
          horaireCompatible = !(searchEnd <= profileStart || searchStart >= profileEnd);
          
          console.log(`   Horaires: ${profileStart}h-${profileEnd}h vs ${searchStart}h-${searchEnd}h → Compatible: ${horaireCompatible}`);
        }
        
        // ✅ CORRECTION 4: Logique genre/préférence
        let preferencesCompatibles = true;
        if (preferenceAidant && data.genre) {
          preferencesCompatibles = data.genre.toLowerCase() === preferenceAidant.toLowerCase();
          console.log(`   Préférence genre: ${preferencesCompatibles}`);
        }
        
        // ✅ CORRECTION 5: Logique etatCivil flexible
        let etatCivilCompatible = true;
        if (etatCivil) {
          // Pour vos données actuelles, on peut matcher par genre
          // ou par specialisationPublic si ça fait sens
          etatCivilCompatible = 
            data.genre?.toLowerCase() === etatCivil.toLowerCase() ||
            data.specialisationPublic?.toLowerCase().includes(etatCivil.toLowerCase()) ||
            // Ou pour "femme", accepter tous les profils femmes
            (etatCivil.toLowerCase() === 'femme' && data.genre?.toLowerCase() === 'femme') ||
            // Ou accepter certaines spécialisations
            (etatCivil.toLowerCase() === 'femme' && data.specialisationPublic?.includes('maisons'));
            
          console.log(`   etatCivil compatible: ${etatCivilCompatible}`);
        }
        
        const estCompatible = horaireCompatible && preferencesCompatibles && etatCivilCompatible;
        console.log(`   🎯 RÉSULTAT: ${estCompatible ? '✅ COMPATIBLE' : '❌ INCOMPATIBLE'}`);
        
        if (estCompatible) {
          profiles.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      console.log(`✅ ${profiles.length} profils trouvés`);
      
      // Tri par note (optionnel)
      profiles.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
      
      return profiles;
    } catch (error) {
      console.error('❌ Erreur recherche profils:', error);
      throw error;
    }
  },

  // ✅ FONCTION MANQUANTE : getProfile par ID
  getProfile: async (profileId) => {
    try {
      console.log('🔄 Récupération profil ID:', profileId);
      
      // Méthode 1: Chercher par ID document
      const profileDoc = await getDoc(doc(db, 'profiles', profileId));
      
      if (profileDoc.exists()) {
        const profileData = {
          id: profileDoc.id,
          ...profileDoc.data()
        };
        console.log('✅ Profil trouvé:', profileData.prenom, profileData.nom);
        return profileData;
      } else {
        console.warn('⚠️ Profil non trouvé avec ID:', profileId);
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur getProfile:', error);
      return null;
    }
  },

  // ... vos autres fonctions (getAllProfiles, etc.)
  getAllProfiles: async () => {
    try {
      console.log('📊 Récupération de tous les profils...');
      const profilesCollection = collection(db, 'profiles');
      const snapshot = await getDocs(profilesCollection);
      
      const profiles = [];
      snapshot.forEach((doc) => {
        profiles.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`📊 ${profiles.length} profils récupérés depuis Firebase`);
      return profiles;
    } catch (error) {
      console.error('❌ Erreur getAllProfiles:', error);
      return [];
    }
  },

  // ✅ FONCTION UPDATE PROFILE
  updateProfile: async (profileId, updateData) => {
    try {
      console.log('🔄 Mise à jour profil:', profileId);
      const profileRef = doc(db, 'profiles', profileId);
      await updateDoc(profileRef, updateData);
      console.log('✅ Profil mis à jour');
      return true;
    } catch (error) {
      console.error('❌ Erreur update profil:', error);
      throw error;
    }
  },

  // ✅ FONCTION ADD REVIEW
  addReview: async (profileId, reviewData) => {
    try {
      console.log('🔄 Ajout avis pour profil:', profileId);
      // Logique d'ajout d'avis (à implémenter selon vos besoins)
      return true;
    } catch (error) {
      console.error('❌ Erreur ajout avis:', error);
      throw error;
    }
  },

  // ✅ FONCTION DEACTIVATE PROFILE
  deactivateProfile: async (profileId) => {
    try {
      console.log('🔄 Désactivation profil:', profileId);
      const profileRef = doc(db, 'profiles', profileId);
      await updateDoc(profileRef, { isActive: false });
      console.log('✅ Profil désactivé');
      return true;
    } catch (error) {
      console.error('❌ Erreur désactivation profil:', error);
      throw error;
    }
  },
};