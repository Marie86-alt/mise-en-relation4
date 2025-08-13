import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// 🎯 TYPES TYPESCRIPT
interface PaiementDetails {
  serviceId: string;
  aidantName: string;
  secteur: string;
  dureeService: number; // en heures
  tarifHoraire: number;
  montantBrut: number;
  avisClient: string;
  noteService: number;
  reduction: number;
  montantFinal: number;
  commissionPlateforme: number;
  montantAidant: number;
}

interface MotCleReduction {
  mots: string[];
  reduction: number; // en pourcentage
  description: string;
}

// 🎯 MOTS-CLÉS POUR RÉDUCTIONS (selon cahier des charges)
const MOTS_CLES_REDUCTIONS: MotCleReduction[] = [
  {
    mots: ['excellent', 'parfait', 'recommande'],
    reduction: 10,
    description: 'Service exceptionnel'
  },
  {
    mots: ['ponctuel', 'à l&apos;heure', 'rapide'],
    reduction: 5,
    description: 'Ponctualité exemplaire'
  },
  {
    mots: ['professionnel', 'qualité', 'soigné'],
    reduction: 8,
    description: 'Professionnalisme reconnu'
  },
  {
    mots: ['gentil', 'aimable', 'souriant'],
    reduction: 3,
    description: 'Excellent relationnel'
  },
  {
    mots: ['propre', 'nickel', 'impeccable'],
    reduction: 7,
    description: 'Travail impeccable'
  }
];

export default function PaiementScreen() {
  // États
  const [details, setDetails] = useState<PaiementDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [moyenPaiement, setMoyenPaiement] = useState<'carte' | 'paypal' | 'virement'>('carte');
  
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Récupération des paramètres
  const {
    aidantName = "Aidant",
    secteur = "Service",
    dureeService = "2",
    tarifHoraire = "15",
    avisClient = "",
    noteService = "5"
  } = params;

  // 🎯 ANALYSE DES AVIS POUR RÉDUCTIONS (selon cahier des charges)
  const analyserAvisReductions = (avis: string): { reduction: number; motifs: string[] } => {
    let reductionTotale = 0;
    const motifsReduction: string[] = [];
    
    const avisLower = avis.toLowerCase();
    
    MOTS_CLES_REDUCTIONS.forEach(({ mots, reduction, description }) => {
      const motsTrouves = mots.filter(mot => avisLower.includes(mot.toLowerCase()));
      
      if (motsTrouves.length > 0) {
        reductionTotale += reduction;
        motifsReduction.push(`${description} (${motsTrouves.join(', ')})`);
      }
    });
    
    // Limitation de la réduction maximale à 25%
    reductionTotale = Math.min(reductionTotale, 25);
    
    return { reduction: reductionTotale, motifs: motifsReduction };
  };

  // 🎯 CALCUL DES MONTANTS (selon cahier des charges)
  const calculerMontants = useCallback((): PaiementDetails => {
    const duree = parseFloat(dureeService as string);
    const tarif = parseFloat(tarifHoraire as string);
    const montantBrut = duree * tarif;
    
    // Analyse des réductions basée sur l'avis
    const { reduction: pourcentageReduction, motifs } = analyserAvisReductions(avisClient as string);
    const reduction = (montantBrut * pourcentageReduction) / 100;
    const montantFinal = montantBrut - reduction;
    
    // Commission de 40% selon cahier des charges
    const commissionPlateforme = montantFinal * 0.40;
    const montantAidant = montantFinal * 0.60;
    
    console.log('💰 Calcul des montants:', {
      montantBrut,
      reduction: `${pourcentageReduction}% (${reduction.toFixed(2)}€)`,
      montantFinal,
      commissionPlateforme: `40% (${commissionPlateforme.toFixed(2)}€)`,
      montantAidant: `60% (${montantAidant.toFixed(2)}€)`,
      motifs
    });
    
    return {
      serviceId: Date.now().toString(),
      aidantName: aidantName as string,
      secteur: secteur as string,
      dureeService: duree,
      tarifHoraire: tarif,
      montantBrut,
      avisClient: avisClient as string,
      noteService: parseFloat(noteService as string),
      reduction,
      montantFinal,
      commissionPlateforme,
      montantAidant
    };
  }, [aidantName, secteur, dureeService, tarifHoraire, avisClient, noteService]);

  // Initialisation
  useEffect(() => {
    const paiementDetails = calculerMontants();
    setDetails(paiementDetails);
  }, [calculerMontants]);

  // 🎯 PROCESSUS DE PAIEMENT
  const procederPaiement = async () => {
    if (!details) return;
    
    setLoading(true);
    
    try {
      console.log('💳 Début du paiement:', details);
      
      // Simulation du paiement (ici vous intégreriez Stripe, PayPal, etc.)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulation de la répartition des fonds
      console.log('💰 Répartition des fonds:');
      console.log(`   Client paie: ${details.montantFinal.toFixed(2)}€`);
      console.log(`   Aidant reçoit: ${details.montantAidant.toFixed(2)}€ (60%)`);
      console.log(`   Plateforme: ${details.commissionPlateforme.toFixed(2)}€ (40%)`);
      
      // Affichage du récapitulatif
      setShowRecapModal(true);
      
    } catch (error) {
      console.error('❌ Erreur paiement:', error);
      Alert.alert('Erreur', 'Le paiement a échoué. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // 🎯 CONFIRMATION FINALE
  const confirmerPaiement = () => {
    Alert.alert(
      '💳 Confirmer le paiement',
      `Vous allez payer ${details?.montantFinal.toFixed(2)}€ pour le service de ${details?.aidantName}.\n\nContinuer ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Payer', onPress: procederPaiement }
      ]
    );
  };

  // 🎯 RENDU RÉDUCTIONS
  const renderReductions = () => {
    if (!details || !details.avisClient) return null;
    
    const { motifs } = analyserAvisReductions(details.avisClient);
    
    if (motifs.length === 0) return null;
    
    return (
      <View style={styles.reductionsContainer}>
        <Text style={styles.reductionsTitle}>🎉 Réductions appliquées :</Text>
        {motifs.map((motif, index) => (
          <Text key={index} style={styles.reductionItem}>• {motif}</Text>
        ))}
      </View>
    );
  };

  // 🎯 RENDU MOYENS DE PAIEMENT
  const renderMoyensPaiement = () => {
    const moyens = [
      { id: 'carte', label: 'Carte bancaire', icon: '💳' },
      { id: 'paypal', label: 'PayPal', icon: '🅿️' },
      { id: 'virement', label: 'Virement', icon: '🏦' }
    ] as const;
    
    return (
      <View style={styles.paiementMethodsContainer}>
        <Text style={styles.sectionTitle}>💳 Moyen de paiement</Text>
        {moyens.map(({ id, label, icon }) => (
          <TouchableOpacity
            key={id}
            style={[
              styles.paymentMethod,
              moyenPaiement === id && styles.paymentMethodSelected
            ]}
            onPress={() => setMoyenPaiement(id)}
          >
            <Text style={styles.paymentIcon}>{icon}</Text>
            <Text style={[
              styles.paymentLabel,
              moyenPaiement === id && styles.paymentLabelSelected
            ]}>
              {label}
            </Text>
            {moyenPaiement === id && (
              <Text style={styles.checkmark}>✅</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!details) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>⏳ Calcul des montants...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* 🎯 HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>💳 Paiement Final</Text>
          <Text style={styles.headerSubtitle}>Service terminé avec succès</Text>
        </View>

        {/* 🎯 RÉCAPITULATIF SERVICE */}
        <View style={styles.serviceContainer}>
          <Text style={styles.sectionTitle}>📋 Récapitulatif du service</Text>
          <View style={styles.serviceDetails}>
            <Text style={styles.serviceItem}>👤 Aidant: {details.aidantName}</Text>
            <Text style={styles.serviceItem}>🏷️ Service: {details.secteur}</Text>
            <Text style={styles.serviceItem}>⏱️ Durée: {details.dureeService}h</Text>
            <Text style={styles.serviceItem}>💰 Tarif: {details.tarifHoraire}€/h</Text>
            <Text style={styles.serviceItem}>⭐ Note: {details.noteService}/5</Text>
          </View>
        </View>

        {/* 🎯 CALCUL DES MONTANTS */}
        <View style={styles.montantsContainer}>
          <Text style={styles.sectionTitle}>💰 Détail des montants</Text>
          
          <View style={styles.montantRow}>
            <Text style={styles.montantLabel}>Montant brut:</Text>
            <Text style={styles.montantValue}>{details.montantBrut.toFixed(2)}€</Text>
          </View>
          
          {details.reduction > 0 && (
            <View style={styles.montantRow}>
              <Text style={[styles.montantLabel, styles.reductionText]}>Réduction:</Text>
              <Text style={[styles.montantValue, styles.reductionText]}>
                -{details.reduction.toFixed(2)}€
              </Text>
            </View>
          )}
          
          <View style={[styles.montantRow, styles.montantTotal]}>
            <Text style={styles.montantTotalLabel}>TOTAL À PAYER:</Text>
            <Text style={styles.montantTotalValue}>{details.montantFinal.toFixed(2)}€</Text>
          </View>
        </View>

        {/* 🎯 RÉDUCTIONS APPLIQUÉES */}
        {renderReductions()}

        {/* 🎯 RÉPARTITION DES FONDS */}
        <View style={styles.repartitionContainer}>
          <Text style={styles.sectionTitle}>📊 Répartition des fonds</Text>
          <View style={styles.repartitionDetails}>
            <View style={styles.repartitionRow}>
              <Text style={styles.repartitionLabel}>💰 Aidant (60%):</Text>
              <Text style={styles.repartitionValue}>{details.montantAidant.toFixed(2)}€</Text>
            </View>
            <View style={styles.repartitionRow}>
              <Text style={styles.repartitionLabel}>🏢 Plateforme (40%):</Text>
              <Text style={styles.repartitionValue}>{details.commissionPlateforme.toFixed(2)}€</Text>
            </View>
          </View>
        </View>

        {/* 🎯 MOYENS DE PAIEMENT */}
        {renderMoyensPaiement()}

        {/* 🎯 BOUTON PAIEMENT */}
        <TouchableOpacity 
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={confirmerPaiement}
          disabled={loading}
        >
          <Text style={styles.payButtonText}>
            {loading ? '⏳ Paiement en cours...' : `💳 Payer ${details.montantFinal.toFixed(2)}€`}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 🎯 MODAL RÉCAPITULATIF FINAL */}
      <Modal visible={showRecapModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎉 Paiement réussi !</Text>
            <Text style={styles.modalDescription}>
              Votre paiement de {details.montantFinal.toFixed(2)}€ a été traité avec succès.
              {'\n\n'}• {details.montantAidant.toFixed(2)}€ versés à {details.aidantName}
              {'\n'}• {details.commissionPlateforme.toFixed(2)}€ de commission plateforme
              {'\n\n'}Merci d&apos;avoir utilisé nos services !
            </Text>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => {
                setShowRecapModal(false);
                router.replace('/');
              }}
            >
              <Text style={styles.modalButtonText}>✅ Retour à l&apos;accueil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    color: '#ecf0f1',
    fontSize: 16,
    marginBottom: 10,
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
  serviceContainer: {
    backgroundColor: '#ffffff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  serviceDetails: {
    gap: 8,
  },
  serviceItem: {
    fontSize: 16,
    color: '#34495e',
    lineHeight: 24,
  },
  montantsContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  montantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  montantLabel: {
    fontSize: 16,
    color: '#34495e',
  },
  montantValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  reductionText: {
    color: '#27ae60',
  },
  montantTotal: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    marginTop: 10,
    paddingTop: 15,
  },
  montantTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  montantTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  reductionsContainer: {
    backgroundColor: '#d4edda',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  reductionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 8,
  },
  reductionItem: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
  repartitionContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  repartitionDetails: {
    gap: 10,
  },
  repartitionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  repartitionLabel: {
    fontSize: 15,
    color: '#34495e',
    fontWeight: '500',
  },
  repartitionValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  paiementMethodsContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  paymentIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  paymentLabel: {
    flex: 1,
    fontSize: 16,
    color: '#34495e',
  },
  paymentLabelSelected: {
    color: '#1976d2',
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 16,
  },
  payButton: {
    backgroundColor: '#27ae60',
    marginHorizontal: 15,
    marginBottom: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  payButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#27ae60',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalDescription: {
    fontSize: 16,
    color: '#34495e',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  modalButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});