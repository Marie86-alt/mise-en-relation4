// app/paiement.tsx
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
import { PaymentData, PaymentResult, PaymentService } from '../src/stripe/paymentService';

const round2 = (n: number) => Math.round(n * 100) / 100;
const formatMontant = (montant: number) => `${montant.toFixed(2)}€`;

export default function PaiementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // 🔒 Parse des params
  const paymentDataStr = typeof params.paymentData === 'string' ? params.paymentData : '';
  const paymentData: PaymentData | null = useMemo(() => {
    if (!paymentDataStr) return null;
    try {
      return JSON.parse(paymentDataStr) as PaymentData;
    } catch {
      return null;
    }
  }, [paymentDataStr]);

  const paymentType: 'deposit' | 'final' =
    (params.paymentType as 'deposit' | 'final') ?? 'deposit';

  const [loading, setLoading] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const initDoneRef = useRef(false);

  // --- Montants d'affichage (et logiques) ---
  // Si on arrive pour le paiement final, dans ton flux tu passes 80% dans paymentData.pricingData.finalPrice.
  // Pour afficher (et pour Stripe via initializeFinalPayment), on reconstruit le total (100%).
  const originalTotalAmount = useMemo(() => {
    const provided = paymentData?.pricingData?.finalPrice ?? 0;
    return paymentType === 'final' ? round2(provided / 0.8) : round2(provided);
  }, [paymentData, paymentType]);

  const depositAmount = useMemo(() => round2(originalTotalAmount * 0.2), [originalTotalAmount]);
  const finalAmount = useMemo(
    () => round2(originalTotalAmount - depositAmount),
    [originalTotalAmount, depositAmount]
  );

  // ✅ CORRECTION demandée : montant à payer maintenant dépend du type
  const currentAmount = paymentType === 'deposit' ? depositAmount : finalAmount;

  const handleCancel = useCallback(() => {
    Alert.alert('Annuler le paiement', 'Êtes-vous sûr de vouloir annuler ?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui, annuler', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [router]);

  // Navigation de retour vers l'écran conversation avec les bons params
  const navigateBackWithSuccess = useCallback(() => {
    const baseParams: Record<string, string> = {
      paymentSuccess: 'true',
      paymentType,
      profileId: String(params.r_profileId || ''),
      profileName: String(params.r_profileName || ''),
      secteur: String(params.r_secteur || ''),
      jour: String(params.r_jour || ''),
      heureDebut: String(params.r_heureDebut || ''),
      heureFin: String(params.r_heureFin || ''),
      adresse: String(params.r_adresse || ''),
    };
    router.replace({ pathname: '/conversation' as const, params: baseParams });
  }, [params, router, paymentType]);

  // --- Initialisation du Payment Sheet ---
  const initializePayment = useCallback(async () => {
    if (!paymentData) return;
    setLoading(true);
    try {
      let result: PaymentResult;

      if (paymentType === 'deposit') {
        // Dépôt : pricingData.finalPrice = 100% (déjà le cas dans ton flux)
        result = await PaymentService.initializeDepositPayment(paymentData);
      } else {
        // Final : on passe à Stripe le TOTAL (100%) pour que la méthode interne
        // calcule 80% (= total - 20%) correctement.
        const adjusted: PaymentData = {
          ...paymentData,
          pricingData: {
            ...paymentData.pricingData,
            finalPrice: originalTotalAmount, // 👈 très important
          },
        };
        result = await PaymentService.initializeFinalPayment(adjusted);
      }

      if (result.success && result.paymentIntentId) {
        setPaymentIntentId(result.paymentIntentId);
        setPaymentReady(true);
      } else {
        Alert.alert(
          "Erreur d'initialisation",
          result.error ?? "Impossible d'initialiser le paiement",
          [{ text: 'Retour', onPress: handleCancel }],
        );
      }
    } catch {
      Alert.alert('Erreur', 'Problème de connexion au service de paiement', [
        { text: 'Retour', onPress: handleCancel },
      ]);
    } finally {
      setLoading(false);
    }
  }, [paymentData, paymentType, originalTotalAmount, handleCancel]);

  useEffect(() => {
    if (!paymentData) {
      Alert.alert('Erreur', 'Données de paiement manquantes', [
        { text: 'Retour', onPress: () => router.back() },
      ]);
      return;
    }
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    initializePayment();
  }, [paymentData, initializePayment, router]);

  // --- Paiement ---
  const handlePayment = async () => {
    if (!paymentReady || !paymentIntentId) {
      Alert.alert('Erreur', "Le paiement n'est pas prêt");
      return;
    }

    try {
      setLoading(true);
      const result = await PaymentService.presentPaymentSheet();

      if (result.success) {
        const confirmResult = await PaymentService.confirmPayment(paymentIntentId);

        if (confirmResult.success) {
          const message =
            paymentType === 'deposit'
              ? `L'acompte de ${formatMontant(currentAmount)} a été prélevé avec succès.`
              : `Le paiement final de ${formatMontant(currentAmount)} a été effectué.`;
          Alert.alert('✅ Paiement réussi !', message, [
            { text: 'Continuer', onPress: navigateBackWithSuccess },
          ]);
        } else {
          Alert.alert('Paiement effectué', "Confirmation serveur indisponible.", [
            { text: 'OK', onPress: navigateBackWithSuccess },
          ]);
        }
      } else {
        Alert.alert(
          'Erreur de paiement',
          result.error ?? "Une erreur inattendue s'est produite",
        );
      }
    } catch {
      Alert.alert('Erreur', 'Problème lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentTitle = () =>
    paymentType === 'deposit' ? '💳 Acompte de réservation (20%)' : '💳 Paiement final du service';

  const getPaymentDescription = () =>
    paymentType === 'deposit'
      ? 'Versez 20% du montant total pour confirmer votre réservation. Le solde sera à régler après le service.'
      : 'Réglez le solde restant maintenant que le service est terminé.';

  if (!paymentData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Données de paiement manquantes</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <StripeProvider publishableKey={STRIPE_CONFIG.PUBLISHABLE_KEY}>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>{getPaymentTitle()}</Text>
            <Text style={styles.description}>{getPaymentDescription()}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 Détails du service</Text>
            <Row label="Secteur" value={paymentData.serviceDetails?.secteur || '—'} />
            <Row label="Date" value={paymentData.serviceDetails?.jour || '—'} />
            <Row
              label="Horaires"
              value={`${paymentData.serviceDetails?.heureDebut || '00:00'} - ${
                paymentData.serviceDetails?.heureFin || '00:00'
              }`}
            />
            <Row label="Durée" value={`${paymentData.pricingData?.hours || 0}h`} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Récapitulatif financier</Text>
            <Row label="Prix total du service" value={formatMontant(originalTotalAmount)} />
            {paymentData.pricingData?.discount ? (
              <Row
                label="Réduction appliquée"
                value={`-${formatMontant(paymentData.pricingData.discount)}`}
                accent
              />
            ) : null}
            <Separator />
            <Row label="Acompte (20%)" value={formatMontant(depositAmount)} />
            <Row label="Solde restant" value={formatMontant(finalAmount)} />
            <Separator />
            <View style={styles.currentRow}>
              <Text style={styles.currentLabel}>
                {paymentType === 'deposit' ? 'À payer maintenant' : 'Solde à régler'}
              </Text>
              <Text style={styles.currentAmount}>{formatMontant(currentAmount)}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🔒 Paiement sécurisé</Text>
            <Text style={styles.infoText}>
              Vos données bancaires sont protégées par Stripe, leader mondial de la sécurité des paiements en ligne.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={loading}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.payButton, (!paymentReady || loading) && styles.payButtonDisabled]}
            onPress={handlePayment}
            disabled={!paymentReady || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.payButtonText}>Payer {formatMontant(currentAmount)}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </StripeProvider>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="row" style={styles.row}>
      <Text style={[styles.rowLabel, accent && styles.accent]}>{label}:</Text>
      <Text style={[styles.rowValue, accent && styles.accent]}>{value}</Text>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1, padding: 16 },
  header: { marginBottom: 24, marginTop: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#2c3e50', textAlign: 'center', marginBottom: 8 },
  description: { fontSize: 16, color: '#6c757d', textAlign: 'center', lineHeight: 22 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#2c3e50', marginBottom: 12 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { fontSize: 14, color: '#6c757d' },
  rowValue: { fontSize: 14, color: '#2c3e50', fontWeight: '500' },
  accent: { color: '#28a745' },

  separator: { height: 1, backgroundColor: '#e9ecef', marginVertical: 8 },

  currentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  currentLabel: { fontSize: 16, color: '#2c3e50', fontWeight: '600' },
  currentAmount: { fontSize: 20, color: Colors.light.primary, fontWeight: '700' },

  infoCard: {
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#b8daff',
  },
  infoTitle: { fontSize: 16, fontWeight: '600', color: '#004085', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#004085', lineHeight: 20 },

  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6c757d',
    alignItems: 'center',
  },
  cancelButtonText: { color: '#6c757d', fontSize: 16, fontWeight: '600' },

  payButton: {
    flex: 2,
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonDisabled: { backgroundColor: '#ccc' },
  payButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 18, color: '#dc3545', textAlign: 'center', marginBottom: 24 },
  backButton: { backgroundColor: '#6c757d', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
