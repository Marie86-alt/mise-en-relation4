// Fichier: app/paiement.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

// --- TYPES ET CONSTANTES SPÉCIALISÉS SENIORS ---

interface PaiementDetailsSeniors {
  serviceId: string;
  aidantName: string;
  secteur: string;
  dureeService: number;
  tarifHoraire: number;
  montantBrut: number;
  avisClient: string;
  noteService: number;
  reduction: number;
  montantFinal: number;
  commissionPlateforme: number;
  montantAidant: number;
}

interface MotCleReductionSeniors {
  mots: string[];
  reduction: number;
  description: string;
}

const MOTS_CLES_SENIORS: MotCleReductionSeniors[] = [
  { mots: ['excellent', 'parfait', 'exceptionnel', 'formidable'], reduction: 10, description: 'Service exceptionnel' },
  { mots: ['ponctuel', 'à l\'heure', 'rapide', 'efficace'], reduction: 5, description: 'Ponctualité exemplaire' },
  { mots: ['professionnel', 'qualité', 'compétent', 'expérimenté'], reduction: 8, description: 'Professionnalisme reconnu' },
  { mots: ['gentil', 'aimable', 'souriant', 'patient', 'bienveillant'], reduction: 6, description: 'Excellent relationnel' },
  { mots: ['soigné', 'propre', 'attentif', 'délicat'], reduction: 7, description: 'Soin et attention' },
  { mots: ['gérontologie', 'alzheimer', 'seniors', 'personnes âgées'], reduction: 12, description: 'Expertise spécialisée' }
];

export default function PaiementScreen() {
  // --- ÉTATS ---
  const [details, setDetails] = useState<PaiementDetailsSeniors | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [moyenPaiement, setMoyenPaiement] = useState<'carte' | 'paypal' | 'virement'>('carte');
  
  // --- HOOKS ---
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const { aidantName = "Aidant Senior", secteur = "Service Senior", dureeService = "2", tarifHoraire = "25", avisClient = "", noteService = "5" } = params;

  // --- LOGIQUE MÉTIER ---

  const analyserAvisSeniors = (avis: string): { reduction: number; motifs: string[] } => {
    let reductionTotale = 0;
    const motifsReduction: string[] = [];
    const avisLower = avis.toLowerCase();
    
    MOTS_CLES_SENIORS.forEach(({ mots, reduction, description }) => {
      if (mots.some(mot => avisLower.includes(mot))) {
        reductionTotale += reduction;
        motifsReduction.push(description);
      }
    });
    
    return { reduction: Math.min(reductionTotale, 30), motifs: motifsReduction };
  };

  const calculerMontants = useCallback((): PaiementDetailsSeniors => {
    const duree = parseFloat(dureeService as string);
    const tarif = parseFloat(tarifHoraire as string);
    const montantBrut = duree * tarif;
    
    const { reduction: pourcentageReduction } = analyserAvisSeniors(avisClient as string);
    const reduction = (montantBrut * pourcentageReduction) / 100;
    const montantFinal = montantBrut - reduction;
    
    const commissionPlateforme = montantFinal * 0.40; // Commission de 40%
    const montantAidant = montantFinal - commissionPlateforme;
    
    return {
      serviceId: Date.now().toString(), aidantName: aidantName as string, secteur: secteur as string,
      dureeService: duree, tarifHoraire: tarif, montantBrut, avisClient: avisClient as string,
      noteService: parseFloat(noteService as string), reduction, montantFinal, commissionPlateforme, montantAidant
    };
  }, [aidantName, secteur, dureeService, tarifHoraire, avisClient, noteService]);

  useEffect(() => {
    setDetails(calculerMontants());
  }, [calculerMontants]);

  const procederPaiement = async () => {
    if (!details) return;
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulation API
      setShowRecapModal(true);
    } catch (error: any) {
      Alert.alert('Erreur', `Le paiement a échoué. ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmerPaiement = () => {
    Alert.alert('Confirmer le paiement', `Vous allez payer ${details?.montantFinal.toFixed(2)}€.\n\nContinuer ?`,
      [{ text: 'Annuler', style: 'cancel' }, { text: 'Payer', onPress: procederPaiement }]
    );
  };

  // --- FONCTIONS DE RENDU ---

  const renderReductions = () => {
    if (!details || details.reduction <= 0) return null;
    const { motifs } = analyserAvisSeniors(details.avisClient);
    if (motifs.length === 0) return null;
    
    return (
      <View style={styles.reductionsContainer}>
        <Text style={styles.reductionsTitle}>🎉 Réductions appliquées :</Text>
        {motifs.map((motif, index) => <Text key={index} style={styles.reductionItem}>• {motif}</Text>)}
      </View>
    );
  };

  const renderMoyensPaiement = () => {
    const moyens = [
      { id: 'carte', label: 'Carte bancaire', icon: '💳' },
      { id: 'paypal', label: 'PayPal', icon: '🅿️' },
      { id: 'virement', label: 'Virement', icon: '🏦' }
    ] as const;
    
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Moyen de paiement</Text>
        {moyens.map(({ id, label, icon }) => (
          <TouchableOpacity key={id} style={[styles.paymentMethod, moyenPaiement === id && styles.paymentMethodSelected]} onPress={() => setMoyenPaiement(id)}>
            <Text style={styles.paymentIcon}>{icon}</Text>
            <Text style={[styles.paymentLabel, moyenPaiement === id && styles.paymentLabelSelected]}>{label}</Text>
            {moyenPaiement === id && <Text style={styles.checkmark}>✅</Text>}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!details) {
    return <SafeAreaView style={styles.container}><ActivityIndicator style={{ flex: 1 }} size="large" color={Colors.light.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backButton}>← Retour</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Paiement du Service</Text>
          <Text style={styles.headerSubtitle}>Service d&apos;accompagnement terminé</Text>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Récapitulatif</Text>
          <Text style={styles.serviceItem}>• Aidant : {details.aidantName}</Text>
          <Text style={styles.serviceItem}>• Service : {details.secteur}</Text>
          <Text style={styles.serviceItem}>• Durée : {details.dureeService}h pour {details.tarifHoraire}€/h</Text>
          <Text style={styles.serviceItem}>• Votre note : {details.noteService}/5 ⭐</Text>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Détail des montants</Text>
          <View style={styles.montantRow}><Text style={styles.montantLabel}>Montant brut :</Text><Text style={styles.montantValue}>{details.montantBrut.toFixed(2)}€</Text></View>
          {details.reduction > 0 && <View style={styles.montantRow}><Text style={[styles.montantLabel, styles.reductionText]}>Réduction obtenue :</Text><Text style={[styles.montantValue, styles.reductionText]}>-{details.reduction.toFixed(2)}€</Text></View>}
          <View style={styles.montantTotal}><Text style={styles.montantTotalLabel}>TOTAL À PAYER :</Text><Text style={styles.montantTotalValue}>{details.montantFinal.toFixed(2)}€</Text></View>
        </View>

        {renderReductions()}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Répartition des fonds</Text>
          <View style={styles.repartitionRow}><Text style={styles.repartitionLabel}>Pour {details.aidantName} (60%) :</Text><Text style={styles.repartitionValue}>{details.montantAidant.toFixed(2)}€</Text></View>
          <View style={styles.repartitionRow}><Text style={styles.repartitionLabel}>Commission plateforme (40%) :</Text><Text style={styles.repartitionValue}>{details.commissionPlateforme.toFixed(2)}€</Text></View>
        </View>

        {renderMoyensPaiement()}

        <TouchableOpacity style={[styles.payButton, loading && styles.payButtonDisabled]} onPress={confirmerPaiement} disabled={loading}>
          <Text style={styles.payButtonText}>{loading ? 'Paiement en cours...' : `Payer ${details.montantFinal.toFixed(2)}€`}</Text>
        </TouchableOpacity>
        
        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal visible={showRecapModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎉 Paiement réussi !</Text>
            <Text style={styles.modalDescription}>
              Votre paiement de {details.montantFinal.toFixed(2)}€ a été traité.
              {'\n\n'}Merci d&apos;avoir utilisé notre plateforme !
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.modalButtonText}>✅ Retour à l&apos;accueil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { backgroundColor: '#ffffff', padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backButton: { color: Colors.light.primary, fontSize: 16, marginBottom: 10, fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#11181C' },
  headerSubtitle: { fontSize: 14, color: '#687076', marginTop: 5 },
  sectionContainer: { backgroundColor: '#ffffff', margin: 15, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.light.primary, marginBottom: 15 },
  serviceItem: { fontSize: 16, color: '#34495e', lineHeight: 24 },
  montantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  montantLabel: { fontSize: 16, color: '#34495e' },
  montantValue: { fontSize: 16, fontWeight: '500', color: '#2c3e50' },
  reductionText: { color: Colors.light.primary },
  montantTotal: { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 10, paddingTop: 15 },
  montantTotalLabel: { fontSize: 18, fontWeight: 'bold', color: '#11181C' },
  montantTotalValue: { fontSize: 20, fontWeight: 'bold', color: Colors.light.primary },
  reductionsContainer: { backgroundColor: '#FFF8F5', marginHorizontal: 15, marginBottom: 15, padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: Colors.light.primary },
  reductionsTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.light.primary, marginBottom: 8 },
  reductionItem: { fontSize: 14, color: '#34495e', lineHeight: 20 },
  repartitionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 5 },
  repartitionLabel: { fontSize: 15, color: '#34495e', fontWeight: '500' },
  repartitionValue: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50' },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  paymentMethodSelected: { borderColor: Colors.light.primary, backgroundColor: '#FFF8F5' },
  paymentIcon: { fontSize: 20, marginRight: 12 },
  paymentLabel: { flex: 1, fontSize: 16, color: '#34495e' },
  paymentLabelSelected: { color: Colors.light.primary, fontWeight: '500' },
  checkmark: { fontSize: 16, color: Colors.light.success },
  payButton: { backgroundColor: Colors.light.primary, marginHorizontal: 15, marginBottom: 20, padding: 18, borderRadius: 12, alignItems: 'center' },
  payButtonDisabled: { backgroundColor: Colors.light.grey },
  payButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 12, padding: 25, width: '90%', maxWidth: 400, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.light.success, textAlign: 'center', marginBottom: 15 },
  modalDescription: { fontSize: 16, color: '#34495e', textAlign: 'center', lineHeight: 24, marginBottom: 25 },
  modalButton: { backgroundColor: Colors.light.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 8 },
  modalButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});