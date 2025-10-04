// backend/server.js - VERSION CORRIGÉE

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// 🔑 Initialiser Stripe avec la clé secrète
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// 🔥 Firebase Admin SDK
const admin = require('firebase-admin');

// Initialiser Firebase Admin avec VOTRE projet
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || "mise-en-relation-app-fc187",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    });
    console.log('✅ Firebase Admin initialisé');
  } catch (error) {
    console.error('❌ Erreur Firebase Admin:', error.message);
  }
}

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

// 📝 Middleware
app.use(cors({
  origin: [ 'http://localhost:8081', 
    'http://localhost:19006', 
    'exp://192.168.1.155:8081',
    'http://192.168.1.155:8081',
    'http://192.168.1.155:3000'
  ],
  credentials: true
}));
app.use(express.json());

// 📊 Logs des requêtes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===========================================
// 🏠 ROUTE D'ACCUEIL
// ===========================================

app.get('/', async (req, res) => {
  try {
    // Test de connexion Firebase
    const testQuery = await db.collection('users').limit(1).get();
    
    res.json({ 
      message: '🚀 API Stripe pour Mise en Relation',
      status: 'running',
      timestamp: new Date().toISOString(),
      stripe_configured: !!process.env.STRIPE_SECRET_KEY,
      firebase_configured: !!process.env.FIREBASE_PROJECT_ID,
      firebase_connected: !testQuery.empty,
      
      endpoints: [
        'POST /api/auth/register - Inscription',
        'POST /api/auth/login - Connexion',
        'POST /api/services/search - Rechercher aidants',
        'GET /api/services/profile/:id - Profil aidant',
        'POST /create-payment-intent - Créer Payment Intent',
        'POST /confirm-payment - Confirmer paiement',
        'GET /payment-status/:id - Statut paiement',
        'GET /stats - Statistiques'
      ]
    });
  } catch (error) {
    res.json({
      message: '🚀 API Stripe pour Mise en Relation',
      status: 'running - Firebase non configuré',
      error: error.message
    });
  }
});

// ===========================================
// 🔐 ROUTES AUTHENTIFICATION
// ===========================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, userType, nom, prenom, isAidant, secteur, genre } = req.body;
    
    console.log('👤 Inscription utilisateur:', { email, userType, isAidant });
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    // Créer l'utilisateur avec Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${prenom} ${nom}`,
    });

    // Créer le document dans la collection 'users'
    await db.collection('users').doc(userRecord.uid).set({
      email,
      displayName: `${prenom} ${nom}`,
      role: 'user',
      isVerified: false,
      isSuspended: false,
      isDeleted: false,
      isAidant: isAidant || false,
      secteur: secteur || null,
      genre: genre || null,
      experience: null,
      tarifHeure: 22,
      description: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Inscription réussie',
      user: {
        id: userRecord.uid,
        email,
        displayName: `${prenom} ${nom}`,
        isAidant: isAidant || false
      }
    });

  } catch (error) {
    console.error('❌ Erreur inscription:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'inscription',
      message: error.message
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔑 Tentative de connexion:', { email });
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    // Récupérer l'utilisateur par email
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Récupérer les données depuis la collection 'users'
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    
    if (!userDoc.exists) {
      throw new Error('Utilisateur non trouvé en base');
    }

    const userData = userDoc.data();
    
    // Vérifier si le compte est actif
    if (userData.isDeleted) {
      return res.status(403).json({
        success: false,
        error: 'Compte désactivé par un administrateur'
      });
    }
    
    if (userData.isSuspended) {
      return res.status(403).json({
        success: false,
        error: 'Compte suspendu. Contactez le support.'
      });
    }
    
    // Créer un custom token
    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    
    res.json({
      success: true,
      message: 'Connexion réussie',
      token: customToken,
      user: {
        id: userRecord.uid,
        email: userRecord.email,
        displayName: userData.displayName,
        role: userData.role,
        isAidant: userData.isAidant,
        isVerified: userData.isVerified
      }
    });

  } catch (error) {
    console.error('❌ Erreur connexion:', error);
    res.status(401).json({
      success: false,
      error: 'Email ou mot de passe incorrect',
      message: error.message
    });
  }
});

// ===========================================
// 🔍 ROUTES SERVICES
// ===========================================

app.post('/api/services/search', async (req, res) => {
  try {
    const { secteur, jour, horaires, etatCivil, preferenceAidant } = req.body;
    
    console.log('🔍 Recherche aidants:', { secteur, preferenceAidant });
    
    // Requête sur la collection 'users'
    let query = db.collection('users')
      .where('isAidant', '==', true)
      .where('isVerified', '==', true);
    
    // Filtrage par secteur
    if (secteur) {
      query = query.where('secteur', '==', secteur);
    }
    
    // Filtrage par genre
    if (preferenceAidant && preferenceAidant !== 'indifferent' && preferenceAidant !== 'Indifférent') {
      query = query.where('genre', '==', preferenceAidant.toLowerCase());
    }
    
    const snapshot = await query.get();
    
    const aidants = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      if (!data.isDeleted && !data.isSuspended) {
        aidants.push({
          id: doc.id,
          ...data,
          nom: data.displayName || 'Aidant',
          tarif: data.tarifHeure || 22,
          rating: data.averageRating || 0,
          nombreAvis: data.totalReviews || 0,
          photo: data.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300',
          specialites: data.specialites || [],
          disponibilites: data.disponibilites || [],
          secteurs: data.secteur ? [data.secteur] : [],
          avis: []
        });
      }
    });
    
    aidants.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    res.json({
      success: true,
      results: aidants,
      count: aidants.length,
      criteres: { secteur, jour, horaires, etatCivil, preferenceAidant }
    });

  } catch (error) {
    console.error('❌ Erreur recherche aidants:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche',
      message: error.message
    });
  }
});

app.get('/api/services/profile/:aidantId', async (req, res) => {
  try {
    const { aidantId } = req.params;
    
    console.log('👤 Récupération profil aidant:', aidantId);
    
    const aidantDoc = await db.collection('users').doc(aidantId).get();
    
    if (!aidantDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Aidant non trouvé',
        aidantId
      });
    }
    
    const aidantData = aidantDoc.data();
    
    if (!aidantData.isAidant || aidantData.isDeleted || aidantData.isSuspended) {
      return res.status(404).json({
        success: false,
        error: 'Profil aidant non disponible'
      });
    }
    
    // Récupérer les avis
    const avisSnapshot = await db.collection('avis')
      .where('aidantId', '==', aidantId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    const avis = [];
    avisSnapshot.forEach(doc => {
      const avisData = doc.data();
      avis.push({
        id: doc.id,
        client: avisData.clientName || 'Client anonyme',
        note: avisData.rating,
        commentaire: avisData.comment,
        date: avisData.createdAt?.toDate?.()?.toISOString?.().split('T')[0] || new Date().toISOString().split('T')[0]
      });
    });
    
    const profile = {
      id: aidantId,
      nom: aidantData.displayName || 'Aidant',
      age: aidantData.age || null,
      experience: aidantData.experience || '0 ans',
      description: aidantData.description || 'Profil aidant professionnel',
      certifications: aidantData.certifications || [],
      tarif: aidantData.tarifHeure || 22,
      rating: aidantData.averageRating || 0,
      nombreAvis: aidantData.totalReviews || avis.length,
      photo: aidantData.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300',
      specialites: aidantData.specialites || ['Accompagnement à domicile'],
      disponibilites: aidantData.disponibilites || ['Lundi-Vendredi 8h-18h'],
      secteurs: aidantData.secteur ? [aidantData.secteur] : [],
      genre: aidantData.genre,
      avis
    };
    
    res.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('❌ Erreur récupération profil:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du profil',
      message: error.message
    });
  }
});

app.post('/api/services/verify', async (req, res) => {
  try {
    const { serviceId, aidantId, clientId } = req.body;
    
    console.log('✅ Vérification service:', { serviceId, aidantId, clientId });
    
    if (serviceId) {
      await db.collection('services').doc(serviceId).update({
        status: 'verifie',
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.json({
      success: true,
      verified: true,
      message: 'Les deux parties ont confirmé leur présence - Service peut commencer',
      serviceId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur vérification:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification'
    });
  }
});

app.post('/api/services/complete', async (req, res) => {
  try {
    const { serviceId } = req.body;
    
    console.log('🏁 Terminaison service:', serviceId);
    
    if (serviceId) {
      await db.collection('services').doc(serviceId).update({
        status: 'termine',
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.json({
      success: true,
      message: 'Service terminé avec succès',
      serviceId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur terminaison:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la terminaison'
    });
  }
});

// ===========================================
// 💬 ROUTES MESSAGES
// ===========================================

app.get('/api/messages/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    console.log('💬 Récupération messages:', conversationId);
    
    const messagesSnapshot = await db.collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();
    
    const messages = [];
    messagesSnapshot.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        texte: data.texte,
        expediteurId: data.expediteurId,
        timestamp: data.createdAt
      });
    });
    
    res.json({
      success: true,
      messages,
      conversation_id: conversationId
    });

  } catch (error) {
    console.error('❌ Erreur récupération messages:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des messages'
    });
  }
});

app.post('/api/messages/send', async (req, res) => {
  try {
    const { conversationId, message, expediteur, expediteurId } = req.body;
    
    console.log('📤 Envoi message:', { conversationId, expediteur });
    
    const messageRef = await db.collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .add({
        texte: message,
        expediteurId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    await db.collection('conversations').doc(conversationId).update({
      lastMessage: {
        texte: message,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    });
    
    res.json({
      success: true,
      message: 'Message envoyé',
      messageId: messageRef.id
    });

  } catch (error) {
    console.error('❌ Erreur envoi message:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi du message'
    });
  }
});

// ===========================================
// ⭐ ROUTES ÉVALUATIONS
// ===========================================

app.post('/api/reviews/rate', async (req, res) => {
  try {
    const { serviceId, aidantId, clientId, rating, comment } = req.body;
    
    console.log('⭐ Nouvelle évaluation:', { serviceId, aidantId, rating, hasComment: !!comment });
    
    if (rating < 3 && (!comment || comment.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: 'Un avis détaillé est obligatoire pour une note inférieure à 3 étoiles'
      });
    }
    
    const evaluationRef = await db.collection('avis').add({
      serviceId,
      aidantId,
      clientId,
      rating,
      comment: comment || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Mettre à jour les statistiques de l'aidant
    const aidantRef = db.collection('users').doc(aidantId);
    
    await db.runTransaction(async (transaction) => {
      const aidantDoc = await transaction.get(aidantRef);
      
      if (aidantDoc.exists) {
        const aidantData = aidantDoc.data();
        const currentRating = aidantData.averageRating || 0;
        const currentCount = aidantData.totalReviews || 0;
        
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + rating) / newCount;
        
        transaction.update(aidantRef, {
          averageRating: Math.round(newRating * 10) / 10,
          totalReviews: newCount
        });
      }
    });
    
    const reduction = rating < 3 ? 20 : 0;
    
    res.json({
      success: true,
      message: 'Évaluation enregistrée',
      evaluationId: evaluationRef.id,
      reduction
    });

  } catch (error) {
    console.error('❌ Erreur évaluation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'évaluation'
    });
  }
});

// ===========================================
// 💳 ROUTES STRIPE
// ===========================================

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency, metadata } = req.body;

    console.log('💳 Création Payment Intent:', { amount, currency, metadata });

    if (!amount || amount < 50) {
      return res.status(400).json({ 
        error: 'Le montant minimum est de 0,50€',
        provided: amount 
      });
    }

    if (!currency) {
      return res.status(400).json({ 
        error: 'La devise est requise' 
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      metadata: {
        ...metadata,
        created_by: 'mise-en-relation-app',
        created_at: new Date().toISOString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log(`✅ Payment Intent créé: ${paymentIntent.id} - ${amount/100}€`);

    res.json({
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    });

  } catch (error) {
    console.error('❌ Erreur création Payment Intent:', error.message);
    res.status(500).json({ 
      error: 'Erreur lors de la création du paiement',
      message: error.message,
      type: error.type || 'api_error'
    });
  }
});

app.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    console.log('🔍 Confirmation paiement:', { paymentIntentId });

    if (!paymentIntentId) {
      return res.status(400).json({ 
        error: 'Payment Intent ID requis' 
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      console.log(`✅ Paiement confirmé: ${paymentIntentId} - ${paymentIntent.amount/100}€`);
      
      const commission = calculateCommission(paymentIntent.amount);
      
      // Mettre à jour Firebase si serviceId fourni
      const serviceId = paymentIntent.metadata.serviceId;
      const paymentType = paymentIntent.metadata.type;
      
      if (serviceId) {
        const serviceUpdate = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (paymentType === 'deposit') {
          serviceUpdate.status = 'acompte_paye';
          serviceUpdate.depositPaymentId = paymentIntentId;
          serviceUpdate.depositAmount = paymentIntent.amount;
        } else if (paymentType === 'final_payment') {
          serviceUpdate.status = 'paiement_complet';
          serviceUpdate.finalPaymentId = paymentIntentId;
          serviceUpdate.finalAmount = paymentIntent.amount;
        }
        
        try {
          await db.collection('services').doc(serviceId).update(serviceUpdate);
          console.log(`📝 Service Firebase ${serviceId} mis à jour`);
        } catch (fbError) {
          console.error('❌ Erreur mise à jour Firebase:', fbError);
        }
      }
      
      res.json({
        success: true,
        paymentIntentId,
        amount: paymentIntent.amount,
        amount_formatted: `${(paymentIntent.amount/100).toFixed(2)}€`,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata,
        commission,
        service_updated: !!serviceId
      });
    } else {
      res.status(400).json({
        error: 'Le paiement n\'est pas encore confirmé',
        status: paymentIntent.status,
        paymentIntentId,
      });
    }

  } catch (error) {
    console.error('❌ Erreur confirmation paiement:', error.message);
    res.status(500).json({ 
      error: 'Erreur lors de la confirmation du paiement',
      message: error.message 
    });
  }
});

app.get('/payment-status/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    console.log('📊 Récupération statut:', paymentIntentId);

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      amount_formatted: `${(paymentIntent.amount/100).toFixed(2)}€`,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
      created: new Date(paymentIntent.created * 1000).toISOString(),
    });

  } catch (error) {
    console.error('❌ Erreur récupération statut:', error.message);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du statut',
      message: error.message 
    });
  }
});

app.post('/process-refund', async (req, res) => {
  try {
    const { paymentIntentId, amount, reason } = req.body;

    console.log('🔄 Traitement remboursement:', { paymentIntentId, amount, reason });

    if (!paymentIntentId) {
      return res.status(400).json({ 
        error: 'Payment Intent ID requis' 
      });
    }

    const refundData = {
      payment_intent: paymentIntentId,
      reason: reason || 'requested_by_customer',
    };

    if (amount) {
      refundData.amount = Math.round(amount);
    }

    const refund = await stripe.refunds.create(refundData);

    console.log(`🔄 Remboursement créé: ${refund.id} - ${refund.amount/100}€`);

    res.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount,
      amount_formatted: `${(refund.amount/100).toFixed(2)}€`,
      status: refund.status,
      reason: refund.reason,
    });

  } catch (error) {
    console.error('❌ Erreur remboursement:', error.message);
    res.status(500).json({ 
      error: 'Erreur lors du remboursement',
      message: error.message 
    });
  }
});

// ===========================================
// 📊 STATISTIQUES
// ===========================================

app.get('/stats', async (req, res) => {
  try {
    const payments = await stripe.paymentIntents.list({ limit: 10 });

    // Statistiques Firebase
    const [usersSnapshot, conversationsSnapshot] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('conversations').count().get()
    ]);

    const stats = {
      total_payments: payments.data.length,
      successful_payments: payments.data.filter(p => p.status === 'succeeded').length,
      total_amount: payments.data
        .filter(p => p.status === 'succeeded')
        .reduce((sum, p) => sum + p.amount, 0),
      
      total_users: usersSnapshot.data().count,
      total_conversations: conversationsSnapshot.data().count,
      
      recent_payments: payments.data.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        type: p.metadata.type || 'standard',
        created: new Date(p.created * 1000).toISOString(),
      }))
    };

    stats.total_amount_formatted = `${(stats.total_amount/100).toFixed(2)}€`;

    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur stats:', error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// ===========================================
// 🛠️ FONCTIONS UTILITAIRES
// ===========================================

function calculateCommission(amountInCents) {
  const amountInEuros = amountInCents / 100;
  const appCommissionRate = 0.40; // 40%
  const appCommission = amountInEuros * appCommissionRate;
  const helperAmount = amountInEuros - appCommission;

  return {
    total_amount: amountInEuros,
    app_commission_rate: appCommissionRate,
    app_commission: parseFloat(appCommission.toFixed(2)),
    helper_amount: parseFloat(helperAmount.toFixed(2)),
    app_commission_formatted: `${appCommission.toFixed(2)}€`,
    helper_amount_formatted: `${helperAmount.toFixed(2)}€`,
  };
}

// ===========================================
// 🚨 GESTION D'ERREURS
// ===========================================

app.use((error, req, res, next) => {
  console.error('🚨 Erreur serveur:', error);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
  });
});

// ===========================================
// 🚀 DÉMARRAGE SERVEUR
// ===========================================

app.listen(PORT,'0.0.0.0', async () => {
  console.log(`
🚀 ==========================================
   Serveur démarré avec succès !
🚀 ==========================================

📍 URL: http://localhost:${PORT}
💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅' : '❌'}
🔥 Firebase: ${process.env.FIREBASE_PROJECT_ID ? '✅' : '❌'}
⏰ ${new Date().toLocaleString()}

🔧 Test mobile: curl http://192.168.1.155:${PORT}
  `);

  // Test de connexion Firebase
  try {
    const testQuery = await db.collection('users').limit(1).get();
    console.log(`✅ Firebase connecté - ${testQuery.size} documents détectés`);
  } catch (fbError) {
    console.log(`❌ Firebase non configuré: ${fbError.message}`);
  }
});

module.exports = app;