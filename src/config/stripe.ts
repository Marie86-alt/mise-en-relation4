// src/config/stripe.ts

export const STRIPE_CONFIG = {
  // 🔑 CLÉS STRIPE (À REMPLACER PAR VOS VRAIES CLÉS)
  PUBLISHABLE_KEY: __DEV__ 
    ? 'pk_test_51...' // 🧪 Remplacez par votre clé de test
    : 'pk_live_...', // 🔴 Clé de production (plus tard)
  
  // 🌐 URL de votre backend (dans le même projet)
  BACKEND_URL: __DEV__
    ? 'http://localhost:3000' // 🧪 Backend local
    : 'https://votre-api.com', // 🔴 Serveur de production
  
  // 💰 CONFIGURATION DES PAIEMENTS
  CURRENCY: 'eur',
  COUNTRY: 'FR',
  
  // 📱 METADATA POUR LES PAIEMENTS
  PAYMENT_METADATA: {
    source: 'mise-en-relation-app',
    version: '1.0',
  }
};

// 🎯 ENDPOINTS API
export const STRIPE_ENDPOINTS = {
  CREATE_PAYMENT_INTENT: '/create-payment-intent',
  CONFIRM_PAYMENT: '/confirm-payment',
  GET_PAYMENT_STATUS: '/payment-status',
  PROCESS_REFUND: '/process-refund',
};

// 💡 MESSAGES D'ERREUR TRADUITS
export const STRIPE_ERRORS = {
  'card_declined': 'Votre carte a été refusée',
  'insufficient_funds': 'Fonds insuffisants sur votre carte',
  'expired_card': 'Votre carte a expiré',
  'incorrect_cvc': 'Code de sécurité incorrect',
  'processing_error': 'Erreur de traitement du paiement',
  'network_error': 'Erreur de connexion',
  'unknown_error': 'Une erreur inattendue s\'est produite',
};