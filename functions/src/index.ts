// functions/src/index.ts
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// 🔥 Admin init
initializeApp();
const db = getFirestore();

// 🔑 Secret Stripe (configuré via `firebase functions:secrets:set STRIPE_SECRET_KEY`)
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');

// --------- Types ---------
type PaymentInput = {
  amount: number;                 // Montant TOTAL du service, en euros (ex: 88)
  conversationId: string;
  serviceDetails?: any;
};

type ConfirmInput = {
  paymentIntentId: string;
};

type CallResult =
  | { success: true; clientSecret?: string; paymentIntentId?: string; depositAmount?: number; finalAmount?: number; status?: string; amount?: number; }
  | { success: false; error: string; status?: string; paymentIntentId?: string; };

// --------- Helpers ---------
const round2 = (n: number) => Math.round(n * 100) / 100;
const eurosToCents = (euros: number) => Math.round(euros * 100);

function getStripe() {
  // ⚠️ Ne PAS fixer apiVersion pour éviter les erreurs de types (version évolutive)
  return new Stripe(STRIPE_SECRET_KEY.value());
}

function requireAuth<T>(req: CallableRequest<T>): string {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Utilisateur non authentifié');
  }
  return req.auth.uid;
}

// =============================================
// 💳 ACOMPTE (20%)
// =============================================
export const createDepositPaymentIntent = onCall(
  { region: 'europe-west1', secrets: [STRIPE_SECRET_KEY] },
  async (req: CallableRequest<PaymentInput>): Promise<CallResult> => {
    try {
      const uid = requireAuth(req);
      const { amount, conversationId, serviceDetails } = req.data || ({} as PaymentInput);

      if (!amount || isNaN(amount)) {
        throw new HttpsError('invalid-argument', 'Montant total requis');
      }
      if (!conversationId) {
        throw new HttpsError('invalid-argument', 'conversationId requis');
      }

      const depositEuros = round2(amount * 0.20);
      const depositCents = eurosToCents(depositEuros);

      if (depositCents < 50) {
        throw new HttpsError('invalid-argument', 'Acompte minimum 0,50€');
      }

      const stripe = getStripe();

      const pi = await stripe.paymentIntents.create({
        amount: depositCents,
        currency: 'eur',
        metadata: {
          type: 'deposit',
          conversationId,
          userId: uid,
          totalAmount: String(amount),
          depositAmount: String(depositEuros),
        },
        automatic_payment_methods: { enabled: true },
      });

      await db.collection('transactions').add({
        paymentIntentId: pi.id,
        type: 'deposit',
        userId: uid,
        conversationId,
        amount: depositEuros,            // en euros pour lecture humaine
        totalServiceAmount: amount,      // total (euros)
        status: 'pending',
        serviceDetails: serviceDetails ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });

      return { success: true, clientSecret: pi.client_secret!, paymentIntentId: pi.id, depositAmount: depositEuros };
    } catch (e: any) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError('internal', `Erreur création acompte: ${e.message || e}`);
    }
  }
);

// =============================================
// 💳 SOLDE (80%)
// =============================================
export const createFinalPaymentIntent = onCall(
  { region: 'europe-west1', secrets: [STRIPE_SECRET_KEY] },
  async (req: CallableRequest<PaymentInput>): Promise<CallResult> => {
    try {
      const uid = requireAuth(req);
      const { amount, conversationId } = req.data || ({} as PaymentInput);

      if (!amount || isNaN(amount)) {
        throw new HttpsError('invalid-argument', 'Montant total requis');
      }
      if (!conversationId) {
        throw new HttpsError('invalid-argument', 'conversationId requis');
      }

      // Vérifier qu'un acompte paid (completed) existe
      const depositSnap = await db.collection('transactions')
        .where('conversationId', '==', conversationId)
        .where('type', '==', 'deposit')
        .where('status', '==', 'completed')
        .limit(1)
        .get();

      if (depositSnap.empty) {
        throw new HttpsError('failed-precondition', 'Aucun acompte payé pour ce service');
      }

      const finalEuros = round2(amount * 0.80);
      const finalCents = eurosToCents(finalEuros);

      if (finalCents < 50) {
        throw new HttpsError('invalid-argument', 'Solde minimum 0,50€');
      }

      const stripe = getStripe();

      const pi = await stripe.paymentIntents.create({
        amount: finalCents,
        currency: 'eur',
        metadata: {
          type: 'final',
          conversationId,
          userId: uid,
          totalAmount: String(amount),
          finalAmount: String(finalEuros),
        },
        automatic_payment_methods: { enabled: true },
      });

      await db.collection('transactions').add({
        paymentIntentId: pi.id,
        type: 'final',
        userId: uid,
        conversationId,
        amount: finalEuros,           // euros
        totalServiceAmount: amount,   // total euros
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
      });

      return { success: true, clientSecret: pi.client_secret!, paymentIntentId: pi.id, finalAmount: finalEuros };
    } catch (e: any) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError('internal', `Erreur création paiement final: ${e.message || e}`);
    }
  }
);

// =============================================
// ✅ CONFIRMATION (post-PaymentSheet)
// =============================================
export const confirmPayment = onCall(
  { region: 'europe-west1', secrets: [STRIPE_SECRET_KEY] },
  async (req: CallableRequest<ConfirmInput>): Promise<CallResult> => {
    try {
      requireAuth(req);
      const { paymentIntentId } = req.data || ({} as ConfirmInput);

      if (!paymentIntentId) {
        throw new HttpsError('invalid-argument', 'paymentIntentId requis');
      }

      const stripe = getStripe();
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

      // Mettre à jour Firestore selon le statut Stripe
      const txSnap = await db.collection('transactions')
        .where('paymentIntentId', '==', paymentIntentId)
        .limit(1)
        .get();

      if (!txSnap.empty) {
        const ref = txSnap.docs[0].ref;
        const tx = txSnap.docs[0].data();

        // status Stripe → Firestore
        const newStatus = pi.status === 'succeeded' ? 'completed' : pi.status;
        await ref.update({
          status: newStatus,
          stripeStatus: pi.status,
          updatedAt: FieldValue.serverTimestamp(),
          completedAt: pi.status === 'succeeded' ? FieldValue.serverTimestamp() : FieldValue.delete(),
        });

        // Si paiement final réussi → calcul commission 40/60
        if (pi.status === 'succeeded' && tx.type === 'final') {
          const total = Number(tx.totalServiceAmount) || 0;
          const platform = round2(total * 0.40);
          const aidant = round2(total * 0.60);

          await db.collection('commissions').add({
            conversationId: tx.conversationId,
            totalAmount: total,
            platformCommission: platform,
            aidantAmount: aidant,
            status: 'pending_transfer',
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      }

      if (pi.status === 'succeeded') {
        return { success: true, status: pi.status, paymentIntentId, amount: pi.amount };
      }
      return { success: false, status: pi.status, paymentIntentId, error: 'Paiement non confirmé' };
    } catch (e: any) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError('internal', `Erreur confirmation paiement: ${e.message || e}`);
    }
  }
);
