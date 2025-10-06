// Firebase admin will be passed as parameter to avoid initialization issues

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const SERVICE_DONE = new Set(['termine','evalue','paiement_complet']);
const SERVICE_INPROGRESS = new Set(['en_cours','acompte_paye','a_venir']);
const SERVICE_CANCELED = new Set(['annule','cancelled']);

function toJSDate(ts) {
  try {
    if (!ts) return null;
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
    if (typeof ts === 'string') {
      const d = new Date(ts);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
}

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const r0 = (n) => Math.round(Number(n) || 0);

const calculateStats = async (db) => {
  console.log('📊 Calcul des statistiques RÉELLES depuis Firebase...');

  if (!db) {
    throw new Error('Database instance is required');
  }

  try {
    // Charge toutes les collections
    const [usersSnap, servicesSnap, avisSnap, conversationsSnap, transactionsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('services').get().catch(() => ({ docs: [] })),
      db.collection('avis').get().catch(() => ({ docs: [] })),
      db.collection('conversations').get().catch(() => ({ docs: [] })),
      db.collection('transactions').get().catch(() => ({ docs: [] })),
    ]);

    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const services = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const avis = avisSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const conversations = conversationsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const transactions = transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 👥 Utilisateurs
    const activeUsers = users.filter(u => !u.isDeleted);
    const aidants = activeUsers.filter(u => !!u.isAidant);
    const clients = activeUsers.filter(u => !u.isAidant);
    const aidantsVerifies = aidants.filter(a => !!a.isVerified);
    const aidantsEnAttente = aidants.filter(a => !a.isVerified);
    const comptesSuspendus = activeUsers.filter(u => !!u.isSuspended);

    // 🧾 Services par statut
    const servicesTermines = services.filter(s => SERVICE_DONE.has(String(s.status || '').toLowerCase()));
    const servicesEnCours = services.filter(s => SERVICE_INPROGRESS.has(String(s.status || '').toLowerCase()));
    const servicesAnnules = services.filter(s => SERVICE_CANCELED.has(String(s.status || '').toLowerCase()));

    // 💳 Transactions
    const txCompleted = transactions.filter(t => {
      const status = String(t.status || '').toLowerCase();
      return status === 'completed' || status === 'succeeded';
    });
    const txFinalOnly = txCompleted.filter(t => {
      const typ = String(t.type || '').toLowerCase();
      return typ === 'final' || typ === 'final_payment';
    });
    const txAmount = (t) => {
      const v = Number(t.amount ?? t.montant ?? 0);
      return Number.isFinite(v) ? v : 0;
    };

    // 💰 Chiffre d'affaires & commissions
    const fromTx = txFinalOnly.reduce((sum, t) => sum + txAmount(t), 0);
    let chiffreAffaires = fromTx > 0
      ? r2(fromTx)
      : r2(servicesTermines.reduce((sum, s) => sum + Number(s.montant || 0), 0));

    let commissionPerçue = txFinalOnly.length
      ? r2(txFinalOnly.reduce((sum, t) => sum + Number(t.commission ?? txAmount(t) * 0.4), 0))
      : r2(chiffreAffaires * 0.4);

    const servicesRealises = servicesTermines.length;
    const panierMoyen = r2(servicesRealises ? chiffreAffaires / servicesRealises : 0);

    // ⭐ Qualité
    const notes = avis.map(a => Number(a.rating || 0)).filter(n => Number.isFinite(n));
    const evaluationMoyenne = r1(notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : 0);

    // 💬 Activité
    const conversationsActives = conversations.filter(c => {
      const st = String(c.status || 'conversation').toLowerCase();
      return st !== 'termine' && st !== 'annule' && st !== 'cancelled';
    }).length;

    // 📍 Secteurs populaires
    const secteurMap = new Map();
    aidants.forEach(a => {
      const key = a.secteur || 'Non spécifié';
      const curr = secteurMap.get(key) ?? { count: 0, revenue: 0, services: 0 };
      curr.count += 1;
      secteurMap.set(key, curr);
    });
    servicesTermines.forEach(s => {
      const key = s.secteur || 'Non spécifié';
      const curr = secteurMap.get(key) ?? { count: 0, revenue: 0, services: 0 };
      curr.revenue += Number(s.montant || 0);
      curr.services += 1;
      secteurMap.set(key, curr);
    });
    const secteursPopulaires = Array.from(secteurMap.entries())
      .map(([secteur, v]) => ({ secteur, count: v.count, revenue: r0(v.revenue), services: v.services }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 📈 Évolution mensuelle (6 derniers mois)
    const today = new Date();
    const evolutionMensuelle = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const monthServices = servicesTermines.filter(s => {
        const when = toJSDate(s.completedAt ?? s.createdAt);
        return when ? when >= start && when <= end : false;
      });
      const monthRevenue = monthServices.reduce((sum, s) => sum + Number(s.montant || 0), 0);
      evolutionMensuelle.push({
        mois: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        services: monthServices.length,
        revenue: r0(monthRevenue),
      });
    }

    // 🔢 Taux conversion + nouveaux utilisateurs du mois
    const tauxConversion = r0(services.length ? (servicesRealises / services.length) * 100 : 0);
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const nouveauxUtilisateurs = activeUsers.filter(u => {
      const d = toJSDate(u.createdAt);
      return d ? d >= thisMonthStart : false;
    }).length;

    const finalStats = {
      totalAidants: aidants.length,
      totalClients: clients.length,
      aidantsVerifies: aidantsVerifies.length,
      aidantsEnAttente: aidantsEnAttente.length,
      comptesSuspendus: comptesSuspendus.length,
      nouveauxUtilisateurs,

      servicesRealises,
      servicesEnCours: servicesEnCours.length,
      servicesAnnules: servicesAnnules.length,
      tauxConversion,

      chiffreAffaires,
      commissionPerçue,
      panierMoyen,

      evaluationMoyenne,
      totalAvis: avis.length,

      conversationsActives,
      secteursPopulaires,
      evolutionMensuelle,

      // 📊 Nouvelles métriques ajoutées
      tauxSatisfactionGlobal: r1(evaluationMoyenne), 
      evolutionRevenus: evolutionMensuelle.map(m => ({ 
        mois: m.mois, 
        revenus: m.revenue 
      })),

      lastUpdate: new Date().toISOString(),
    };

    console.log('✅ Statistiques RÉELLES calculées:', {
      aidants: finalStats.totalAidants,
      clients: finalStats.totalClients,
      services: finalStats.servicesRealises,
      ca: finalStats.chiffreAffaires,
      nouveaux: finalStats.nouveauxUtilisateurs
    });
    
    return finalStats;
  } catch (error) {
    console.error('❌ Erreur calcul stats:', error);
    throw error;
  }
};

module.exports = {
  calculateStats
};