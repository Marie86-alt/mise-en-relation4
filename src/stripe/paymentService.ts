// src/services/stripe/paymentService.ts
import {
  initPaymentSheet,
  presentPaymentSheet,
} from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { STRIPE_CONFIG, STRIPE_ENDPOINTS, STRIPE_ERRORS } from '../config/stripe';
import { PricingResult } from '../utils/pricing';

// 🎯 TYPES
export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentData {
  conversationId: string;
  aidantId: string;
  clientId: string;
  pricingData: PricingResult;
  serviceDetails: {
    secteur: string;
    jour: string;
    heureDebut: string;
    heureFin: string;
    adresse: string;
  };
  isDeposit: boolean; // true = acompte, false = paiement final
  // (optionnel) customerEmail?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
  errorCode?: string;
}

// ✅ returnURL correct pour Expo/dev & prod
const RETURN_URL = Linking.createURL('payment-return');

/* ========= Helpers arrondi & format ========= */
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
/** Convertit des euros -> centimes (entier), en passant par un arrondi à 2 décimales pour éviter les flottants */
const toCents = (euro: number) => Math.round((round2(euro) + Number.EPSILON) * 100);
/** Formatage lisible en euros (2 décimales) */
const fmt2 = (n: number) => round2(n).toFixed(2);

export class PaymentService {
  /**
   * 🏗️ Initialise le Payment Sheet pour un acompte (20%)
   */
  static async initializeDepositPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      const totalEuros = round2(paymentData.pricingData.finalPrice);
      const depositEuros = round2(totalEuros * 0.20);
      // Minimum 0.50€ pour Stripe
      const depositAmountCents = Math.max(50, toCents(depositEuros));

      // Log propre
      console.log('🔄 Initialisation paiement (acompte):', `${fmt2(depositEuros)}€`);

      const paymentIntent = await this.createPaymentIntent({
        amount: depositAmountCents,
        currency: STRIPE_CONFIG.CURRENCY,
        metadata: {
          ...STRIPE_CONFIG.PAYMENT_METADATA,
          type: 'deposit',
          conversationId: paymentData.conversationId,
          aidantId: paymentData.aidantId,
          clientId: paymentData.clientId,
          serviceHours: String(paymentData.pricingData.hours),
          totalAmount: fmt2(totalEuros),
        },
      });

      const { error } = await initPaymentSheet({
        merchantDisplayName: 'Mise en Relation',
        paymentIntentClientSecret: paymentIntent.client_secret,
        defaultBillingDetails: {
          name: 'Client',
          // email: paymentData.customerEmail ?? '',
        },
        allowsDelayedPaymentMethods: false,
        returnURL: RETURN_URL,
      });

      if (error) {
        console.error('Stripe init error:', error);
        return {
          success: false,
          error: this.stringifyStripeError(error.code, error.message),
          errorCode: error.code,
        };
      }

      return { success: true, paymentIntentId: paymentIntent.id };
    } catch (error) {
      console.error("Erreur lors de l'initialisation du paiement:", error);
      return { success: false, error: 'Erreur de connexion au service de paiement' };
    }
  }

  /**
   * 🏗️ Initialise le Payment Sheet pour le paiement final
   */
  static async initializeFinalPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      const totalEuros = round2(paymentData.pricingData.finalPrice);
      const depositEuros = round2(totalEuros * 0.20);
      const remainderEuros = round2(totalEuros - depositEuros);

      const totalCents = toCents(totalEuros);
      const depositCents = toCents(depositEuros);
      const remainderCentsRaw = Math.max(0, totalCents - depositCents);
      // S’il reste quelque chose à payer, min 0.50€ ; sinon 0.
      const finalAmountCents = remainderCentsRaw === 0 ? 0 : Math.max(50, remainderCentsRaw);

      // Log propre
      console.log('🔄 Initialisation paiement (final):', `${fmt2(remainderEuros)}€`);

      if (finalAmountCents === 0) {
        // Rien à payer (cas limite) : on renvoie "success" pour que l’UI continue
        return { success: true, paymentIntentId: undefined };
      }

      const paymentIntent = await this.createPaymentIntent({
        amount: finalAmountCents,
        currency: STRIPE_CONFIG.CURRENCY,
        metadata: {
          ...STRIPE_CONFIG.PAYMENT_METADATA,
          type: 'final_payment',
          conversationId: paymentData.conversationId,
          aidantId: paymentData.aidantId,
          clientId: paymentData.clientId,
          serviceHours: String(paymentData.pricingData.hours),
          totalAmount: fmt2(totalEuros),
        },
      });

      const { error } = await initPaymentSheet({
        merchantDisplayName: 'Mise en Relation',
        paymentIntentClientSecret: paymentIntent.client_secret,
        defaultBillingDetails: { name: 'Client' },
        allowsDelayedPaymentMethods: false,
        returnURL: RETURN_URL,
      });

      if (error) {
        console.error('Stripe init error (final):', error);
        return {
          success: false,
          error: this.stringifyStripeError(error.code, error.message),
          errorCode: error.code,
        };
      }

      return { success: true, paymentIntentId: paymentIntent.id };
    } catch (error) {
      console.error("Erreur lors de l'initialisation du paiement final:", error);
      return { success: false, error: 'Erreur de connexion au service de paiement' };
    }
  }

  /**
   * 💳 Présente le Payment Sheet à l'utilisateur
   */
  static async presentPaymentSheet(): Promise<PaymentResult> {
    try {
      const { error } = await presentPaymentSheet();

      if (error) {
        // Normalise le code pour capter "Canceled" / "canceled"
        const code = (error.code ?? '').toString();
        const normalized = code.toLowerCase();

        if (normalized === 'canceled') {
          return { success: false, error: 'Paiement annulé', errorCode: 'canceled' };
        }

        console.warn('Stripe present error:', error);
        return {
          success: false,
          error: this.stringifyStripeError(code, error.message),
          errorCode: code,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la présentation du Payment Sheet:', error);
      return { success: false, error: 'Erreur lors du paiement' };
    }
  }

  /**
   * 🌐 Crée un Payment Intent côté serveur
   */
  private static async createPaymentIntent(data: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }): Promise<PaymentIntent> {
    const res = await fetch(
      `${STRIPE_CONFIG.BACKEND_URL}${STRIPE_ENDPOINTS.CREATE_PAYMENT_INTENT}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    );

    const tryParse = async () => {
      try {
        return await res.json();
      } catch {
        const txt = await res.text();
        return { message: txt };
      }
    };

    const body = await tryParse();

    if (!res.ok) {
      throw new Error(body?.message || 'Erreur serveur (createPaymentIntent)');
    }

    return body as PaymentIntent;
  }

  /**
   * ✅ Confirme un paiement côté serveur (optionnel)
   */
  static async confirmPayment(paymentIntentId: string, additionalData?: any): Promise<PaymentResult> {
    try {
      const res = await fetch(
        `${STRIPE_CONFIG.BACKEND_URL}${STRIPE_ENDPOINTS.CONFIRM_PAYMENT}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId, ...additionalData }),
        },
      );

      const tryParse = async () => {
        try {
          return await res.json();
        } catch {
          const txt = await res.text();
          return { message: txt };
        }
      };

      const result = await tryParse();

      if (!res.ok) {
        return { success: false, error: result?.message || 'Erreur lors de la confirmation' };
      }

      return { success: true, paymentIntentId };
    } catch (error) {
      console.error('Erreur confirmation paiement:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  }

  /**
   * 📊 Vérifie le statut d'un paiement
   */
  static async getPaymentStatus(paymentIntentId: string): Promise<{ status: string; amount?: number }> {
    try {
      const res = await fetch(
        `${STRIPE_CONFIG.BACKEND_URL}${STRIPE_ENDPOINTS.GET_PAYMENT_STATUS}/${paymentIntentId}`,
      );
      const tryParse = async () => {
        try {
          return await res.json();
        } catch {
          return { status: 'unknown' };
        }
      };
      return await tryParse();
    } catch (error) {
      console.error('Erreur récupération statut:', error);
      return { status: 'unknown' };
    }
  }

  /**
   * 🔄 Traite un remboursement
   */
  static async processRefund(paymentIntentId: string, amount?: number): Promise<PaymentResult> {
    try {
      const res = await fetch(
        `${STRIPE_CONFIG.BACKEND_URL}${STRIPE_ENDPOINTS.PROCESS_REFUND}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId, amount }),
        },
      );
      const tryParse = async () => {
        try {
          return await res.json();
        } catch {
          const txt = await res.text();
          return { message: txt };
        }
      };
      const result = await tryParse();

      return { success: res.ok, error: res.ok ? undefined : result?.message };
    } catch (error) {
      console.error('Erreur lors du remboursement:', error);
      return { success: false, error: 'Erreur lors du remboursement' };
    }
  }

  // 🔤 Helpers

  /** Convertit code/message Stripe en texte clair */
  private static stringifyStripeError(code?: string, fallbackMessage?: string) {
    if (!code) return fallbackMessage || STRIPE_ERRORS.unknown_error;
    return STRIPE_ERRORS[code as keyof typeof STRIPE_ERRORS] || fallbackMessage || STRIPE_ERRORS.unknown_error;
  }

  /** 💰 Formate un montant en centimes vers euros */
  static formatAmount(amountInCents: number): string {
    return `${(amountInCents / 100).toFixed(2).replace('.', ',')}€`;
  }

  /** 🔢 Convertit un montant en euros vers centimes (utilise l’arrondi robuste) */
  static toAmountInCents(amountInEuros: number): number {
    return toCents(amountInEuros);
  }
}
