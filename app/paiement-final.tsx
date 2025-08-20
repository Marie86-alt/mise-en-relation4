// Fichier: app/paiement-final.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Colors } from '@/constants/Colors';
import { STRIPE_CONFIG } from '../src/config/stripe';
import { PaymentData, PaymentService } from '../src/stripe/paymentService';

const formatMontant = (montant: number): string => {
  return `${montant.toFixed(2)}€`;
};

export default function PaiementFinalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const paymentDataStr = typeof params.paymentData === 'string' ? params.paymentData : '';
  const paymentData: PaymentData | null = useMemo(() => {
    if (!paymentDataStr) return null;
    try {
      return JSON.parse(paymentDataStr) as PaymentData;
    } catch { return null; }
  }, [paymentDataStr]);

  const [loading, setLoading] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const initDoneRef = useRef(false);

  // --- LOGIQUE DE CALCUL SIMPLIFIÉE ---
  const finalPaymentDetails = useMemo(() => {
    if (!paymentData) return null;

    const montantFinalAPayer = paymentData.pricingData.finalPrice; // Le solde restant (80%)
    
    // Le montant total du service est nécessaire pour la répartition
    const montantTotalService = parseFloat((montantFinalAPayer / 0.8).toFixed(2));
    const commissionPlateforme = parseFloat((montantTotalService * 0.40).toFixed(2));
    const montantAidant = parseFloat((montantTotalService - commissionPlateforme).toFixed(2));

    return {
      montantFinalAPayer,
      commissionPlateforme,
      montantAidant,
      montantTotalService
    };
  }, [paymentData]);

  const currentAmount = finalPaymentDetails?.montantFinalAPayer ?? 0;

  const navigateBackToHome = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  const initializePayment = useCallback(async () => {
    if (!paymentData || currentAmount <= 0) return;
    setLoading(true);
    try {
      const result = await PaymentService.initializeFinalPayment(paymentData);
      if (result.success && result.paymentIntentId) {
        setPaymentIntentId(result.paymentIntentId);
        setPaymentReady(true);
      } else {
        Alert.alert("Erreur d'initialisation", result.error ?? "Impossible d'initialiser le paiement");
      }
    } catch {
      Alert.alert('Erreur', 'Problème de connexion au service de paiement');
    } finally {
      setLoading(false);
    }
  }, [paymentData, currentAmount]);

  useEffect(() => {
    if (!paymentData) {
      Alert.alert('Erreur', 'Données de paiement manquantes', [{ text: 'Retour', onPress: () => router.back() }]);
      return;
    }
    if (!initDoneRef.current) {
      initDoneRef.current = true;
      initializePayment();
    }
  }, [paymentData, initializePayment, router]);

  const handlePayment = async () => {
    if (!paymentReady || !paymentIntentId || !finalPaymentDetails) return;
    setLoading(true);
    try {
      const result = await PaymentService.presentPaymentSheet();
      if (result.success) {
        const confirmResult = await PaymentService.confirmPayment(paymentIntentId);
        if (confirmResult.success) {
          Alert.alert('✅ Paiement réussi !', `Le paiement de ${formatMontant(currentAmount)} a été effectué.`, 
            [{ text: 'Retour à l\'accueil', onPress: navigateBackToHome }]
          );
        } else {
          Alert.alert('Paiement effectué', "Confirmation serveur indisponible.", [{ text: 'OK', onPress: navigateBackToHome }]);
        }
      } else {
        Alert.alert('Erreur de paiement', result.error ?? "Une erreur s'est produite");
      }
    } catch  {
      Alert.alert('Erreur', 'Problème lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  if (!paymentData || !finalPaymentDetails) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" /></SafeAreaView>;
  }

  return (
    <StripeProvider publishableKey={STRIPE_CONFIG.PUBLISHABLE_KEY}>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}><Text style={styles.backButton}>← Retour</Text></TouchableOpacity>
            <Text style={styles.title}>💳 Paiement Final</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Montant à régler</Text>
            <Separator />
            <View style={styles.currentRow}>
              <Text style={styles.currentLabel}>TOTAL À PAYER</Text>
              <Text style={styles.currentAmount}>{formatMontant(finalPaymentDetails.montantFinalAPayer)}</Text>
            </View>
          </View>
          
          <View style={[styles.card, { backgroundColor: '#fff8f0', borderColor: '#ffd4a3' }]}>
            <Text style={styles.cardTitle}>💼 Répartition des revenus</Text>
            <Text style={styles.infoText}>
              Sur le montant total du service ({formatMontant(finalPaymentDetails.montantTotalService)}), les fonds seront répartis comme suit :
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.repartitionLabel}>👤 Aidant (60%)</Text>
                <Text style={styles.repartitionValueAidant}>{formatMontant(finalPaymentDetails.montantAidant)}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.repartitionLabel}>🏢 Plateforme (40%)</Text>
                <Text style={styles.repartitionValuePlateforme}>{formatMontant(finalPaymentDetails.commissionPlateforme)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.payButton, (!paymentReady || loading) && styles.payButtonDisabled]}
            onPress={handlePayment}
            disabled={!paymentReady || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.payButtonText}>Payer {formatMontant(currentAmount)}</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </StripeProvider>
  );
}

function Separator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1, padding: 16 },
  header: { marginBottom: 24, marginTop: 10 },
  title: { fontSize: 24, fontWeight: '700', color: '#2c3e50', textAlign: 'center' },
  backButton: { color: Colors.light.primary, fontSize: 16, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e9ecef' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#2c3e50', marginBottom: 12 },
  separator: { height: 1, backgroundColor: '#e9ecef', marginVertical: 8 },
  currentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, marginTop: 8 },
  currentLabel: { fontSize: 16, color: '#2c3e50', fontWeight: '600' },
  currentAmount: { fontSize: 20, color: Colors.light.primary, fontWeight: '700' },
  infoText: { fontSize: 14, color: '#6c757d', marginBottom: 16, lineHeight: 20 },
  repartitionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  repartitionValueAidant: { fontSize: 20, fontWeight: '700', color: '#28a745' },
  repartitionValuePlateforme: { fontSize: 20, fontWeight: '700', color: Colors.light.primary },
  actions: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e9ecef' },
  payButton: { backgroundColor: Colors.light.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  payButtonDisabled: { backgroundColor: '#ccc' },
  payButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
