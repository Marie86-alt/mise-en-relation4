// src/services/stripe/paymentService.ts

import { 
  initPaymentSheet, 
  presentPaymentSheet,
} from '@stripe/stripe-react-native';
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
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
  errorCode?: string;
}

export class PaymentService {
  
  /**
   * 🏗️ Initialise le Payment Sheet pour un acompte (20%)
   */
  static async initializeDepositPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      const depositAmount = Math.round(paymentData.pricingData.finalPrice * 0.20 * 100); // En centimes
      
      // 🌐 Créer le Payment Intent côté serveur
      const paymentIntent = await this.createPaymentIntent({
        amount: depositAmount,
        currency: STRIPE_CONFIG.CURRENCY,
        metadata: {
          ...STRIPE_CONFIG.PAYMENT_METADATA,
          type: 'deposit',
          conversationId: paymentData.conversationId,
          aidantId: paymentData.aidantId,
          clientId: paymentData.clientId,
          serviceHours: paymentData.pricingData.hours.toString(),
          totalAmount: paymentData.pricingData.finalPrice.toString(),
        }
      });

      // 📱 Initialiser le Payment Sheet
      const { error } = await initPaymentSheet({
        merchantDisplayName: 'Mise en Relation',
        paymentIntentClientSecret: paymentIntent.client_secret,
        defaultBillingDetails: {
          name: 'Client',
          email: '', // Vous pouvez passer l'email du client ici
        },
        allowsDelayedPaymentMethods: false,
        returnURL: 'your-app://payment-return',
      });

      if (error) {
        console.error('Erreur initialisation Payment Sheet:', error);
        return {
          success: false,
          error: this.getErrorMessage(error.code),
          errorCode: error.code,
        };
      }

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
      };

    } catch (error) {
      console.error('Erreur lors de l\'initialisation du paiement:', error);
      return {
        success: false,
        error: 'Erreur de connexion au service de paiement',
      };
    }
  }

  /**
   * 🏗️ Initialise le Payment Sheet pour le paiement final
   */
  static async initializeFinalPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      const depositAmount = Math.round(paymentData.pricingData.finalPrice * 0.20 * 100);
      const finalAmount = Math.round(paymentData.pricingData.finalPrice * 100) - depositAmount; // Montant restant
      
      const paymentIntent = await this.createPaymentIntent({
        amount: finalAmount,
        currency: STRIPE_CONFIG.CURRENCY,
        metadata: {
          ...STRIPE_CONFIG.PAYMENT_METADATA,
          type: 'final_payment',
          conversationId: paymentData.conversationId,
          aidantId: paymentData.aidantId,
          clientId: paymentData.clientId,
          serviceHours: paymentData.pricingData.hours.toString(),
          totalAmount: paymentData.pricingData.finalPrice.toString(),
        }
      });

      const { error } = await initPaymentSheet({
        merchantDisplayName: 'Mise en Relation',
        paymentIntentClientSecret: paymentIntent.client_secret,
        defaultBillingDetails: {
          name: 'Client',
        },
        allowsDelayedPaymentMethods: false,
        returnURL: 'your-app://payment-return',
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error.code),
          errorCode: error.code,
        };
      }

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
      };

    } catch (error) {
      console.error('Erreur lors de l\'initialisation du paiement final:', error);
      return {
        success: false,
        error: 'Erreur de connexion au service de paiement',
      };
    }
  }

  /**
   * 💳 Présente le Payment Sheet à l'utilisateur
   */
  static async presentPaymentSheet(): Promise<PaymentResult> {
    try {
      const { error } = await presentPaymentSheet();

      if (error) {
        // L'utilisateur a annulé
        if (error.code === 'Canceled') {
          return {
            success: false,
            error: 'Paiement annulé',
            errorCode: 'canceled',
          };
        }

        return {
          success: false,
          error: this.getErrorMessage(error.code),
          errorCode: error.code,
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Erreur lors de la présentation du Payment Sheet:', error);
      return {
        success: false,
        error: 'Erreur lors du paiement',
      };
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
    const response = await fetch(`${STRIPE_CONFIG.BACKEND_URL}${STRIPE_ENDPOINTS.CREATE_PAYMENT_INTENT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erreur serveur');
    }

    return await response.json();
  }

  /**
   * ✅ Confirme un paiement côté serveur
   */
  static async confirmPayment(paymentIntentId: string, additionalData?: any): Promise<PaymentResult> {
    try {
      const response = await fetch(`${STRIPE_CONFIG.BACKEND_URL}${STRIPE_ENDPOINTS.CONFIRM_PAYMENT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          ...additionalData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || 'Erreur lors de la confirmation',
        };
      }

      return {
        success: true,
        paymentIntentId,
      };

    } catch (error) {
      console.error('Erreur confirmation paiement:', error);
      return {
        success: false,
        error: 'Erreur de connexion',
      };
    }
  }

  /**
   * 📊 Vérifie le statut d'un paiement
   */
  static async getPaymentStatus(paymentIntentId: string): Promise<{ status: string; amount?: number }> {
    try {
      const response = await fetch(`${STRIPE_CONFIG.BACKEND_URL}${STRIPE_ENDPOINTS.GET_PAYMENT_STATUS}/${paymentIntentId}`);
      const result = await response.json();
      
      return {
        status: result.status,
        amount: result.amount,
      };
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
      const response = await fetch(`${STRIPE_CONFIG.BACKEND_URL}${STRIPE_ENDPOINTS.PROCESS_REFUND}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          amount, // Si non spécifié, remboursement total
        }),
      });

      const result = await response.json();

      return {
        success: response.ok,
        error: response.ok ? undefined : result.message,
      };

    } catch (error) {
      console.error('Erreur remboursement:', error);
      return {
        success: false,
        error: 'Erreur lors du remboursement',
      };
    }
  }

  /**
   * 📝 Convertit les codes d'erreur en messages lisibles
   */
  private static getErrorMessage(errorCode: string): string {
    return STRIPE_ERRORS[errorCode as keyof typeof STRIPE_ERRORS] || STRIPE_ERRORS.unknown_error;
  }

  /**
   * 💰 Formate un montant en centimes vers euros
   */
  static formatAmount(amountInCents: number): string {
    return `${(amountInCents / 100).toFixed(2).replace('.', ',')}€`;
  }

  /**
   * 🔢 Convertit un montant en euros vers centimes
   */
  static toAmountInCents(amountInEuros: number): number {
    return Math.round(amountInEuros * 100);
  }
}