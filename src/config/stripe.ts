// src/config/stripe.ts
export const STRIPE_CONFIG = {
  // 🔑 CLÉS STRIPE (À REMPLACER PAR VOS VRAIES CLÉS)
  PUBLISHABLE_KEY: __DEV__
    ? 'pk_test_51Rw4TLK4P8PBhDaP4DLO3Pgt9yUvGFuF8dFn93z5xGhybVxZmw22Os3gwFHJ5TcT7Bwg7BBy4Xd71WvmEQrc4ma400zCTApKYb' // 🧪 Remplacez par votre clé de test
    : 'pk_live_...', // 🔴 Clé de production (plus tard)
  
  // 🌐 URL de votre backend (CORRIGÉE POUR MOBILE)
  BACKEND_URL: __DEV__
    ? 'http://192.168.1.155:3000' // ✅ IP locale pour mobile/émulateur
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

// 🧪 FONCTION DE TEST DE CONNEXION
export const testBackendConnection = async () => {
  try {
    console.log('🔍 Test connexion backend:', STRIPE_CONFIG.BACKEND_URL);
    const response = await fetch(STRIPE_CONFIG.BACKEND_URL);
    const data = await response.json();
    console.log('✅ Backend accessible:', data);
    return true;
  } catch (error) {
    console.error('❌ Backend non accessible:', error);
    return false;
  }
};