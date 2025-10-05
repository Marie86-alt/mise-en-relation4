// src/services/stripe/paymentService.ts
import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { PricingResult } from '../utils/pricing';
import { HttpPaymentService } from './httpPaymentService';

// --- Types alignés avec tes écrans ---
export interface PaymentData {
  conversationId: string;
  aidantId: string;
  clientId: string;
  pricingData: PricingResult;
  serviceDetails?: {
    secteur?: string;
    jour?: string;
    heureDebut?: string;
    heureFin?: string;
    adresse?: string;
  };
}

type InitResult = { success: true; paymentIntentId?: string } | { success: false; error: string; errorCode?: string };
type SimpleResult = { success: true } | { success: false; error: string };

const RETURN_URL = Linking.createURL('payment-return');
const r2 = (n: number) => Math.round(n * 100) / 100;

// ---------- ACOMPTE (20%) ----------
async function initializeDepositPayment(data: PaymentData): Promise<InitResult> {
  try {
    const total = Number(data.pricingData?.finalPrice || 0);
    if (!total || total <= 0) throw new Error('Montant invalide');

    // Appel CF → la function calcule 20% elle-même
    const dep: any = await callSecure(fnCreateDeposit, {
      amount: r2(total),                    // ⚠️ TOTAL en euros
      conversationId: data.conversationId,
      serviceDetails: data.serviceDetails ?? null,
    });

    if (!dep?.clientSecret || !dep?.paymentIntentId) {
      return { success: false, error: 'Réponse serveur incomplète (acompte)' };
    }

    const { error } = await initPaymentSheet({
      paymentIntentClientSecret: dep.clientSecret,
      merchantDisplayName: 'Mise en Relation',
      allowsDelayedPaymentMethods: false,
      returnURL: RETURN_URL,
    });
    if (error) return { success: false, error: error.message, errorCode: error.code };

    return { success: true, paymentIntentId: String(dep.paymentIntentId) };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Erreur d'initialisation de l'acompte" };
  }
}

// ---------- PAIEMENT FINAL (80%) ----------
async function initializeFinalPayment(data: PaymentData): Promise<InitResult> {
  try {
    const total = Number(data.pricingData?.finalPrice || 0);
    if (!total || total <= 0) throw new Error('Montant invalide');

    // Appel CF → la function calcule 80% elle-même (et vérifie qu’un acompte existe)
    const fin: any = await callSecure(fnCreateFinal, {
      amount: r2(total),                   // ⚠️ TOTAL en euros
      conversationId: data.conversationId,
    });

    // Cas limite: rien à payer (finalAmount = 0)
    if (!fin?.clientSecret && !fin?.paymentIntentId) {
      return { success: true, paymentIntentId: undefined };
    }

    if (!fin?.clientSecret || !fin?.paymentIntentId) {
      return { success: false, error: 'Réponse serveur incomplète (final)' };
    }

    const { error } = await initPaymentSheet({
      paymentIntentClientSecret: fin.clientSecret,
      merchantDisplayName: 'Mise en Relation',
      allowsDelayedPaymentMethods: false,
      returnURL: RETURN_URL,
    });
    if (error) return { success: false, error: error.message, errorCode: error.code };

    return { success: true, paymentIntentId: String(fin.paymentIntentId) };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Erreur d'initialisation du paiement final" };
  }
}

// ---------- Payment Sheet ----------
async function presentPayment(): Promise<SimpleResult> {
  const { error } = await presentPaymentSheet();
  if (error) return { success: false, error: error.message ?? 'Paiement annulé' };
  return { success: true };
}

// ---------- Confirmation côté serveur (MAJ Firestore, commissions, etc.) ----------
async function confirmPayment(paymentIntentId: string): Promise<SimpleResult> {
  try {
    await callSecure(fnConfirm, { paymentIntentId });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Erreur confirmation serveur' };
  }
}

export const PaymentService = {
  initializeDepositPayment,
  initializeFinalPayment,
  presentPaymentSheet: presentPayment,
  confirmPayment,
};
