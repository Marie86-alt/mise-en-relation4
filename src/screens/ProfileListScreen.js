// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   SafeAreaView
// } from 'react-native';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import { profilesService } from '../../src/services/firebase/profile';

// // 🔧 IMPORT ALTERNATIF pour navigation si problème
// // import { useNavigation } from '@react-navigation/native';

// // Données mockées pour les profils (déplacées hors du composant)
// const mockProfiles = [
//   {
//     id: '1',
//     nom: 'Sophie Martin',
//     age: 28,
//     secteur: 'Garde d\'enfants',
//     tarif: 12,
//     note: 4.8,
//     nbAvis: 23,
//     photo: 'https://via.placeholder.com/80x80/4A90E2/FFFFFF?text=SM',
//     disponible: true,
//     experience: '3 ans d\'expérience',
//     description: 'Passionnée par l\'éducation des enfants, diplômée en puériculture.',
//     genre: 'femme',
//     distance: '2.5 km'
//   },
//   {
//     id: '2',
//     nom: 'Marc Dubois',
//     age: 35,
//     secteur: 'Aide à domicile',
//     tarif: 15,
//     note: 4.9,
//     nbAvis: 41,
//     photo: 'https://via.placeholder.com/80x80/27AE60/FFFFFF?text=MD',
//     disponible: true,
//     experience: '5 ans d\'expérience',
//     description: 'Aide à domicile qualifiée, spécialisé dans l\'assistance aux personnes âgées.',
//     genre: 'homme',
//     distance: '1.8 km'
//   },
//   {
//     id: '3',
//     nom: 'Julie Leroy',
//     age: 24,
//     secteur: 'Ménage',
//     tarif: 10,
//     note: 4.6,
//     nbAvis: 18,
//     photo: 'https://via.placeholder.com/80x80/E74C3C/FFFFFF?text=JL',
//     disponible: false,
//     experience: '2 ans d\'expérience',
//     description: 'Service de ménage professionnel, produits écologiques.',
//     genre: 'femme',
//     distance: '3.2 km'
//   },
//   {
//     id: '4',
//     nom: 'Thomas Bernard',
//     age: 30,
//     secteur: 'Garde d\'enfants',
//     tarif: 13,
//     note: 4.7,
//     nbAvis: 15,
//     photo: 'https://via.placeholder.com/80x80/9B59B6/FFFFFF?text=TB',
//     disponible: true,
//     experience: '4 ans d\'expérience',
//     description: 'Éducateur spécialisé, excellent avec les enfants de tous âges.',
//     genre: 'homme',
//     distance: '4.1 km'
//   },
//   {
//     id: '5',
//     nom: 'Emma Rousseau',
//     age: 26,
//     secteur: 'Aide à domicile',
//     tarif: 14,
//     note: 4.9,
//     nbAvis: 32,
//     photo: 'https://via.placeholder.com/80x80/F39C12/FFFFFF?text=ER',
//     disponible: true,
//     experience: '3 ans d\'expérience',
//     description: 'Aide-soignante diplômée, services de qualité et bienveillance.',
//     genre: 'femme',
//     distance: '2.0 km'
//   }
// ];
// console.log('🚨🚨🚨 FICHIER CORRECT UTILISÉ ! 🚨🚨🚨');
// export default function ProfileListScreen() {
//   const [profiles, setProfiles] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();

//   // ✅ CORRECTION 1: Récupérer les paramètres avec le bon nom
//   const params = useLocalSearchParams();
//   const { 
//     userType, 
//     secteur, 
//     jour, 
//     heureDebut, 
//     heureFin, 
//     etatCivilPersonne,  // ← CORRECT: Récupérer etatCivilPersonne
//     preferenceAidant 
//   } = params;

//   // ✅ DEBUGGING: Vérifier les paramètres reçus
//   console.log('🔧 PARAMÈTRES REÇUS COMPLETS:', params);
//   console.log('🔧 etatCivilPersonne récupéré:', etatCivilPersonne);
//   console.log('🔧 jour récupéré:', jour);

//   useEffect(() => {
//     const loadProfiles = async () => {
//       console.log('🔄 Début du chargement des profils...');
      
//       // ✅ CORRECTION 2: Construire les critères (format 15/08 du cahier des charges)
//       const jourFormate = jour ? jour.replace('-', '/') : jour; // Convertir 15-08 → 15/08
      
//       const searchCriteria = {
//         secteur: secteur,
//         jour: jourFormate,  // ✅ Format 15/08 comme cahier des charges
//         heureDebut: heureDebut,
//         heureFin: heureFin,
//         etatCivil: etatCivilPersonne,  // ✅ CORRECTION: Bon mapping
//         preferenceAidant: preferenceAidant
//       };

//       console.log('🔍 CRITÈRES DE RECHERCHE CORRIGÉS:', searchCriteria);
//       console.log('🔍 Vérification etatCivil dans critères:', searchCriteria.etatCivilPersonne);
//       console.log('🔍 Vérification jour dans critères (format 15/08):', searchCriteria.jour);

//       // 🔍 === DEBUGGING FIREBASE DÉTAILLÉ ===
//       console.log('🔍 === DEBUGGING FIREBASE DÉTAILLÉ ===');

//       try {
//         // 1. Vérifier tous les profils Firebase
//         console.log('📊 Vérification des profils Firebase...');
//         const allFirebaseProfiles = await profilesService.getAllProfiles();
//         console.log(`📊 TOTAL profils dans Firebase: ${allFirebaseProfiles.length}`);
        
//         if (allFirebaseProfiles.length === 0) {
//           console.warn('⚠️ FIREBASE VIDE ! Aucun profil trouvé');
//           console.log('💡 Utilisation des données mockées en attendant');
//         } else {
//           // 2. Examiner chaque profil Firebase en détail
//           allFirebaseProfiles.forEach((profile, index) => {
//             console.log(`📋 Profil Firebase ${index + 1} - ${profile.prenom} ${profile.nom}:`);
//             console.log(`   📍 secteur: "${profile.secteur}"`);
//             console.log(`   📅 jour: "${profile.jour}"`);
//             console.log(`   🕒 horaires: ${profile.horaires?.debut} - ${profile.horaires?.fin}`);
//             console.log(`   ✅ isActive: ${profile.isActive}`);
//             console.log(`   👥 specialisationPublic: "${profile.specialisationPublic}"`);
//             console.log(`   🏷️ genre: "${profile.genre}"`);
//             console.log('   ---');
//           });
          
//           // 3. Analyser spécifiquement pour votre recherche
//           console.log('🎯 ANALYSE POUR VOTRE RECHERCHE:');
//           console.log(`   Recherche secteur: "${secteur}"`);
//           console.log(`   Recherche jour: "${jour}" → formaté: "${jourFormate}" (cahier des charges)`);
//           console.log(`   Recherche horaires: ${heureDebut}h-${heureFin}h`);
//           console.log(`   Recherche etatCivil: "${etatCivilPersonne}"`);
//           console.log(`   Recherche preferenceAidant: "${preferenceAidant}"`);
          
//           // 4. Test de correspondance pour chaque profil
//           allFirebaseProfiles.forEach((profile) => {
//             console.log(`\n🔍 Test détaillé pour ${profile.prenom}:`);
            
//             // Test secteur
//             const secteurProfile = (profile.secteur || '').toLowerCase();
//             const secteurSearch = (secteur || '').toLowerCase();
//             const secteurMatch = secteurProfile.includes('garde') && secteurSearch.includes('garde') ||
//                                 secteurProfile.includes('enfant') && secteurSearch.includes('enfant') ||
//                                 secteurProfile === secteurSearch;
//             console.log(`   📍 Secteur: "${profile.secteur}" vs "${secteur}" → Match: ${secteurMatch}`);
            
//             // Test jour - Comparaison avec format 15/08 (cahier des charges)
//             const jourProfile = profile.jour || '';
//             const normalizeDate = (date) => date.replace(/[-\/]/g, ''); // Enlève - et /
//             const jourMatch = normalizeDate(jourProfile) === normalizeDate(jourFormate) ||
//                              jourProfile.includes(jourFormate) ||
//                              jourProfile === jourFormate;
//             console.log(`   📅 Jour: "${profile.jour}" vs "${jourFormate}" → Match: ${jourMatch}`);
            
//             // Test isActive
//             console.log(`   ✅ isActive: ${profile.isActive}`);
            
//             // Test specialisationPublic (pour etatCivilPersonne)
//             const etatCivilMatch = !etatCivilPersonne || 
//                                   profile.specialisationPublic === etatCivilPersonne ||
//                                   profile.specialisationPublic === 'tous' ||
//                                   profile.specialisationPublic === 'Enfants de 3 à 10 ans';
//             console.log(`   👥 SpecialisationPublic: "${profile.specialisationPublic}" vs "${etatCivilPersonne}" → Match: ${etatCivilMatch}`);
            
//             // Test genre (pour preferenceAidant)
//             const genreProfile = (profile.genre || '').toLowerCase();
//             const genreSearch = (preferenceAidant || '').toLowerCase();
//             const genreMatch = !preferenceAidant || genreProfile === genreSearch;
//             console.log(`   🏷️ Genre: "${profile.genre}" vs "${preferenceAidant}" → Match: ${genreMatch}`);
            
//             // Test horaires
//             let horaireMatch = true;
//             if (profile.horaires && heureDebut && heureFin) {
//               const profileStart = parseInt(profile.horaires.debut.split(':')[0]);
//               const profileEnd = parseInt(profile.horaires.fin.split(':')[0]);
//               const searchStart = parseInt(heureDebut);
//               const searchEnd = parseInt(heureFin);
              
//               horaireMatch = (
//                 searchStart >= profileStart && searchStart <= profileEnd
//               ) || (
//                 searchEnd >= profileStart && searchEnd <= profileEnd
//               ) || (
//                 searchStart <= profileStart && searchEnd >= profileEnd
//               );
              
//               console.log(`   🕒 Horaires: ${profileStart}h-${profileEnd}h vs ${searchStart}h-${searchEnd}h → Match: ${horaireMatch}`);
//             } else {
//               console.log(`   🕒 Horaires: non testés (données manquantes)`);
//             }
            
//             // Résultat global
//             const globalMatch = secteurMatch && jourMatch && profile.isActive && etatCivilMatch && genreMatch && horaireMatch;
//             console.log(`   🎯 RÉSULTAT: ${globalMatch ? '✅ PROFIL COMPATIBLE' : '❌ PROFIL INCOMPATIBLE'}`);
//             console.log(`      Details: secteur=${secteurMatch}, jour=${jourMatch}, actif=${profile.isActive}, etatCivil=${etatCivilMatch}, genre=${genreMatch}, horaire=${horaireMatch}`);
//           });
          
//           // 5. Test de la méthode searchProfiles
//           console.log('\n🧪 Test de profilesService.searchProfiles...');
//           const firebaseResults = await profilesService.searchProfiles(searchCriteria);
//           console.log(`🎯 Résultats de searchProfiles: ${firebaseResults.length} profils`);
          
//           if (firebaseResults.length > 0) {
//             firebaseResults.forEach((p, i) => {
//               console.log(`   ✅ ${i + 1}. ${p.prenom} ${p.nom} - ${p.secteur}`);
//             });
//           } else {
//             console.warn('❌ searchProfiles ne retourne aucun résultat !');
//             console.log('💡 Le problème vient probablement de la logique dans profilesService.searchProfiles');
//           }
//         }
        
//       } catch (debugError) {
//         console.error('❌ Erreur debugging Firebase:', debugError);
//       }

//       console.log('🔍 === FIN DEBUGGING FIREBASE ===');

//       // ✅ CORRECTION 3: Traitement des données mockées avec bons filtres
//       setTimeout(() => {
//         let filteredProfiles = mockProfiles;

//         console.log(`\n🔍 Filtrage des données mockées...`);
//         console.log(`📊 Avant filtrage: ${filteredProfiles.length} profils`);

//         // Filtrer par secteur si spécifié
//         if (secteur) {
//           const beforeCount = filteredProfiles.length;
//           filteredProfiles = filteredProfiles.filter(profile => {
//             const secteurProfile = profile.secteur.toLowerCase();
//             const secteurSearch = secteur.toLowerCase();
//             return secteurProfile.includes('garde') && secteurSearch.includes('garde') ||
//                    secteurProfile.includes('enfant') && secteurSearch.includes('enfant') ||
//                    profile.secteur === secteur;
//           });
//           console.log(`📍 Après filtre secteur "${secteur}": ${filteredProfiles.length} profils (était ${beforeCount})`);
//         }

//         // Si c'est un client, filtrer selon les préférences
//         if (userType === 'client' && preferenceAidant) {
//           const beforeCount = filteredProfiles.length;
//           filteredProfiles = filteredProfiles.filter(profile => 
//             profile.genre.toLowerCase() === preferenceAidant.toLowerCase()
//           );
//           console.log(`👥 Après filtre préférence "${preferenceAidant}": ${filteredProfiles.length} profils (était ${beforeCount})`);
//         }

//         // Filtrer par disponibilité
//         const beforeCount = filteredProfiles.length;
//         filteredProfiles = filteredProfiles.filter(profile => profile.disponible);
//         console.log(`✅ Après filtre disponibilité: ${filteredProfiles.length} profils (était ${beforeCount})`);

//         console.log(`🎯 RÉSULTAT FINAL (mockées): ${filteredProfiles.length} profils`);
        
//         if (filteredProfiles.length > 0) {
//           console.log('📋 Profils mockées retenus:');
//           filteredProfiles.forEach((p, i) => {
//             console.log(`   ${i + 1}. ${p.nom} - ${p.secteur} (${p.genre}) - disponible: ${p.disponible}`);
//           });
//         } else {
//           console.warn('⚠️ AUCUN PROFIL MOCKÉ NE CORRESPOND AUX CRITÈRES');
//         }

//         setProfiles(filteredProfiles);
//         setLoading(false);
//       }, 1000);
//     };

//     loadProfiles();
//   }, [secteur, userType, preferenceAidant, jour, heureDebut, heureFin, etatCivilPersonne]); // ✅ CORRECTION: Bonne dépendance

//   const renderStars = (note) => {
//     const stars = [];
//     const fullStars = Math.floor(note);
//     const hasHalfStar = note % 1 !== 0;

//     for (let i = 0; i < fullStars; i++) {
//       stars.push(<Text key={i} style={styles.star}>★</Text>);
//     }
//     if (hasHalfStar) {
//       stars.push(<Text key="half" style={styles.star}>☆</Text>);
//     }
//     for (let i = stars.length; i < 5; i++) {
//       stars.push(<Text key={i} style={styles.emptyStar}>☆</Text>);
//     }
//     return stars;
//   };

//   const renderProfile = ({ item }) => (
//     <TouchableOpacity 
//       style={styles.profileCard}
//       onPress={() => router.push({
//         pathname: '/profile-detail',
//         params: { 
//           profileId: item.id, 
//           profileName: item.nom,
//           secteur: secteur,
//           jour: jour,
//           heureDebut: heureDebut,
//           heureFin: heureFin,
//           etatCivil: etatCivilPersonne,  // ✅ CORRECTION: Bon paramètre
//           preferenceAidant: preferenceAidant
//         }
//       })}
//     >
//       <View style={styles.profileHeader}>
//         <Image source={{ uri: item.photo }} style={styles.profilePhoto} />
//         <View style={styles.profileInfo}>
//           <Text style={styles.profileName}>{item.nom}</Text>
//           <Text style={styles.profileSector}>{item.secteur}</Text>
//           <Text style={styles.profileExperience}>{item.experience}</Text>
//           <Text style={styles.profileDistance}>{item.distance}</Text>
//         </View>
//         <View style={styles.profileRight}>
//           <View style={styles.ratingContainer}>
//             <View style={styles.starsContainer}>
//               {renderStars(item.note)}
//             </View>
//             <Text style={styles.ratingText}>{item.note} ({item.nbAvis})</Text>
//           </View>
//           <Text style={styles.profileTarif}>{item.tarif}€/h</Text>
//           <View style={[
//             styles.statusBadge,
//             item.disponible ? styles.disponible : styles.indisponible
//           ]}>
//             <Text style={[
//               styles.statusText,
//               item.disponible ? styles.disponibleText : styles.indisponibleText
//             ]}>
//               {item.disponible ? 'Disponible' : 'Occupé'}
//             </Text>
//           </View>
//         </View>
//       </View>
//       <Text style={styles.profileDescription} numberOfLines={2}>
//         {item.description}
//       </Text>
//     </TouchableOpacity>
//   );

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <View style={styles.loadingContainer}>
//           <Text style={styles.loadingText}>🔍 Recherche en cours...</Text>
//           <Text style={styles.loadingSubText}>
//             Vérification Firebase + données mockées
//           </Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <TouchableOpacity 
//           style={styles.backButton}
//           onPress={() => {
//             console.log('🔙 Bouton retour pressé');
//             // ✅ CORRECTION: Plusieurs méthodes de retour
//             try {
//               router.back();
//             } catch (_error) {
//               console.log('⚠️ router.back() échoué, essai router.replace...');
//               router.replace('/'); // Retour à l'accueil si router.back() échoue
//             }
//           }}
//         >
//           <Text style={styles.backButtonText}>← Retour</Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>
//           {userType === 'client' ? 'Aidants disponibles' : 'Demandes en cours'}
//         </Text>
//         <View style={styles.headerSubtitle}>
//           {secteur && <Text style={styles.filterText}>📍 Secteur: {secteur}</Text>}
//           {jour && <Text style={styles.filterText}>📅 Le {jour}</Text>}
//           {heureDebut && heureFin && (
//             <Text style={styles.filterText}>🕒 De {heureDebut} à {heureFin}</Text>
//           )}
//           {etatCivilPersonne && (  // ✅ CORRECTION: Bon paramètre
//             <Text style={styles.filterText}>👤 Pour une {etatCivilPersonne}</Text>
//           )}
//           {preferenceAidant && (
//             <Text style={styles.filterText}>⚡ Aidant préféré: {preferenceAidant}</Text>
//           )}
//         </View>
//         {profiles.length > 0 && (
//           <Text style={styles.resultCount}>{profiles.length} profil(s) trouvé(s)</Text>
//         )}
//       </View>

//       <FlatList
//         data={profiles}
//         renderItem={renderProfile}
//         keyExtractor={(item) => item.id}
//         contentContainerStyle={styles.listContainer}
//         showsVerticalScrollIndicator={false}
//         ListEmptyComponent={
//           <View style={styles.emptyContainer}>
//             <Text style={styles.emptyTitle}>🔍 Aucun profil trouvé</Text>
//             <Text style={styles.emptyText}>
//               Aucun aidant ne correspond à vos critères de recherche.
//             </Text>
//             <Text style={styles.debugText}>
//               🔍 Vérifiez la console pour le debugging détaillé
//             </Text>
//             <TouchableOpacity 
//               style={styles.newSearchButton}
//               onPress={() => {
//             console.log('🔄 Bouton "Modifier la recherche" pressé');
//             // ✅ Retour à l'accueil avec navigation explicite
//             try {
//               router.replace('/');
//             } catch (error) {
//               console.log('⚠️ Erreur navigation:', error);
//               // Fallback : recharger la page
//               window.location.reload?.();
//             }
//           }}
//             >
//               <Text style={styles.newSearchButtonText}>
//                 🔄 Modifier la recherche
//               </Text>
//             </TouchableOpacity>
//           </View>
//         }
//       />
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f8f9fa',
//   },
//   header: {
//     backgroundColor: '#2c3e50',
//     paddingHorizontal: 20,
//     paddingTop: 10,
//     paddingBottom: 20,
//   },
//   backButton: {
//     marginBottom: 10,
//     padding: 8, // ✅ Zone de clic plus grande
//     backgroundColor: 'rgba(255,255,255,0.1)', // ✅ Fond visible pour debug
//     borderRadius: 4,
//   },
//   backButtonText: {
//     color: '#ecf0f1',
//     fontSize: 16,
//   },
//   headerTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#ffffff',
//     marginBottom: 8,
//   },
//   headerSubtitle: {
//     gap: 4,
//   },
//   filterText: {
//     color: '#bdc3c7',
//     fontSize: 14,
//   },
//   resultCount: {
//     color: '#3498db',
//     fontSize: 14,
//     fontWeight: '500',
//     marginTop: 8,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     fontSize: 18,
//     color: '#6c757d',
//     fontWeight: '500',
//   },
//   loadingSubText: {
//     fontSize: 14,
//     color: '#6c757d',
//     marginTop: 8,
//     textAlign: 'center',
//   },
//   listContainer: {
//     padding: 15,
//   },
//   profileCard: {
//     backgroundColor: '#ffffff',
//     borderRadius: 12,
//     padding: 15,
//     marginBottom: 15,
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   profileHeader: {
//     flexDirection: 'row',
//     marginBottom: 10,
//   },
//   profilePhoto: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     marginRight: 15,
//   },
//   profileInfo: {
//     flex: 1,
//     justifyContent: 'space-between',
//   },
//   profileName: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#2c3e50',
//   },
//   profileSector: {
//     fontSize: 14,
//     color: '#3498db',
//     fontWeight: '500',
//   },
//   profileExperience: {
//     fontSize: 12,
//     color: '#6c757d',
//   },
//   profileDistance: {
//     fontSize: 12,
//     color: '#6c757d',
//   },
//   profileRight: {
//     alignItems: 'flex-end',
//     justifyContent: 'space-between',
//   },
//   ratingContainer: {
//     alignItems: 'flex-end',
//   },
//   starsContainer: {
//     flexDirection: 'row',
//   },
//   star: {
//     color: '#f39c12',
//     fontSize: 14,
//   },
//   emptyStar: {
//     color: '#dee2e6',
//     fontSize: 14,
//   },
//   ratingText: {
//     fontSize: 12,
//     color: '#6c757d',
//     marginTop: 2,
//   },
//   profileTarif: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#27ae60',
//   },
//   statusBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 20,
//   },
//   disponible: {
//     backgroundColor: '#d4edda',
//   },
//   indisponible: {
//     backgroundColor: '#f8d7da',
//   },
//   statusText: {
//     fontSize: 12,
//     fontWeight: '500',
//   },
//   disponibleText: {
//     color: '#155724',
//   },
//   indisponibleText: {
//     color: '#721c24',
//   },
//   profileDescription: {
//     fontSize: 14,
//     color: '#6c757d',
//     lineHeight: 20,
//   },
//   emptyContainer: {
//     alignItems: 'center',
//     marginTop: 50,
//     paddingHorizontal: 20,
//   },
//   emptyTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#6c757d',
//     marginBottom: 10,
//   },
//   emptyText: {
//     fontSize: 16,
//     color: '#6c757d',
//     textAlign: 'center',
//     marginBottom: 10,
//   },
//   debugText: {
//     fontSize: 12,
//     color: '#3498db',
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   newSearchButton: {
//     backgroundColor: '#3498db',
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderRadius: 8,
//   },
//   newSearchButtonText: {
//     color: '#ffffff',
//     fontSize: 16,
//     fontWeight: '500',
//   },
// });