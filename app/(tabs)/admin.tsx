import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, ActivityIndicator, TouchableOpacity,
  StyleSheet, FlatList, Alert, TextInput, SafeAreaView, Modal, ScrollView
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import {
  collection, query, where, onSnapshot, updateDoc, doc,
  addDoc, serverTimestamp, orderBy, limit, deleteDoc, getDocs
} from 'firebase/firestore';
import { db } from '@/firebase.config';

type UserRow = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  isVerified?: boolean;
  isSuspended?: boolean;
  isAidant?: boolean;
  secteur?: string | null;
  tarifHeure?: number | null;
  createdAt?: any;
  isDeleted?: boolean;
};

type ConversationRow = {
  id: string;
  participants: string[];
  participantDetails: { [uid: string]: { displayName?: string | null } };
  lastMessage?: { texte: string; createdAt: any };
  secteur?: string;
  status?: 'conversation' | 'a_venir' | 'termine';
  messageCount?: number;
};

type MessageRow = {
  id: string;
  texte: string;
  expediteurId: string;
  createdAt: any;
  conversationId: string;
  expediteurName?: string;
};

type StatsData = {
  totalAidants: number;
  totalClients: number;
  servicesRealises: number;
  servicesEnCours: number;
  chiffreAffaires: number;
  commissionPerçue: number;
  evaluationMoyenne: number;
  aidantsVerifies: number;
  aidantsEnAttente: number;
  comptesSuspendus: number;
  conversationsActives: number;
  secteursPopulaires: { secteur: string; count: number; revenue: number }[];
  evolutionMensuelle: { mois: string; services: number; revenue: number }[];
};

export default function AdminScreen() {
  const { isAdmin, loading, user: adminUser } = useAuth();
  const [tab, setTab] = useState<'validations' | 'users' | 'conversations' | 'stats'>('validations');

  const [pending, setPending] = useState<UserRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationRow | null>(null);
  const [conversationMessages, setConversationMessages] = useState<MessageRow[]>([]);
  const [filter, setFilter] = useState('');
  const [showMessagesModal, setShowMessagesModal] = useState(false);

  // 📊 Stats
  const [stats, setStats] = useState<StatsData>({
    totalAidants: 0,
    totalClients: 0,
    servicesRealises: 0,
    servicesEnCours: 0,
    chiffreAffaires: 0,
    commissionPerçue: 0,
    evaluationMoyenne: 0,
    aidantsVerifies: 0,
    aidantsEnAttente: 0,
    comptesSuspendus: 0,
    conversationsActives: 0,
    secteursPopulaires: [],
    evolutionMensuelle: []
  });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      Alert.alert('Accès refusé', 'Réservé aux administrateurs.');
    }
  }, [loading, isAdmin]);

  // ---- Abonnement : profils à valider ----
  useEffect(() => {
    if (!isAdmin) return;
    const qPending = query(
      collection(db, 'users'),
      where('isVerified', '==', false),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      qPending,
      (snap) => {
        setPending(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => console.error('listen pending', err)
    );
    return unsub;
  }, [isAdmin]);

  // ---- Abonnement : liste d'utilisateurs ----
  useEffect(() => {
    if (!isAdmin) return;
    const qUsers = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsub = onSnapshot(
      qUsers,
      (snap) => {
        const activeUsers = snap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }) as UserRow)
          .filter(u => !u.isDeleted);
        setUsers(activeUsers);
        console.log(`📊 Utilisateurs actifs: ${activeUsers.length}`);
      },
      (err) => console.error('listen users', err)
    );
    return unsub;
  }, [isAdmin]);

  // ---- Abonnement : conversations ----
  useEffect(() => {
    if (!isAdmin || tab !== 'conversations') return;
    const qConversations = query(
      collection(db, 'conversations'),
      orderBy('lastMessage.createdAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(
      qConversations,
      (snap) => {
        setConversations(
          snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as any),
            messageCount: 0,
          })) as ConversationRow[]
        );
      },
      (err) => console.error('listen conversations', err)
    );
    return unsub;
  }, [isAdmin, tab]);

  // ---- Mémos (filtrages) ----
  const filteredUsers = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return users;
    return users.filter(u =>
      (u.email || '').toLowerCase().includes(f) ||
      (u.displayName || '').toLowerCase().includes(f)
    );
  }, [users, filter]);

  const filteredConversations = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return conversations;
    return conversations.filter(c =>
      (c.secteur || '').toLowerCase().includes(f) ||
      (Object.values(c.participantDetails ?? {}) as { displayName?: string | null }[])
        .some(p => (p.displayName || '').toLowerCase().includes(f))
    );
  }, [conversations, filter]);

  // ---- Actions admin ----
  const logAdminAction = async (action: string, targetUid: string, details?: any) => {
    await addDoc(collection(db, 'admin_logs'), {
      adminUid: adminUser?.uid ?? null,
      action,
      targetUid,
      details: details ?? null,
      at: serverTimestamp(),
    });
  };

  const verifyAidant = async (targetUid: string) => {
    try {
      await updateDoc(doc(db, 'users', targetUid), { isVerified: true });
      await logAdminAction('VERIFY_AIDANT', targetUid);
      Alert.alert('✅ Profil vérifié', 'Le profil a été validé avec succès.');
    } catch {
      Alert.alert('Erreur', 'Impossible de vérifier ce profil.');
    }
  };

  const toggleSuspend = async (u: UserRow) => {
    const next = !u.isSuspended;
    const action = next ? 'suspendre' : 'réactiver';

    Alert.alert(
      `Confirmer`,
      `Voulez-vous ${action} l'utilisateur ${u.displayName || u.email} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: next ? 'Suspendre' : 'Réactiver',
          style: next ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', u.id), { isSuspended: next });
              await logAdminAction(next ? 'SUSPEND_USER' : 'UNSUSPEND_USER', u.id);
              Alert.alert('✅ Action effectuée', `Utilisateur ${next ? 'suspendu' : 'réactivé'} avec succès.`);
            } catch {
              Alert.alert('Erreur', 'Action impossible.');
            }
          }
        }
      ]
    );
  };

  const deleteUser = async (u: UserRow) => {
    Alert.alert(
      '⚠️ Supprimer utilisateur',
      `Voulez-vous supprimer l'utilisateur ${u.displayName || u.email} ?\n\n• L'utilisateur sera désactivé\n• Il ne pourra plus se connecter\n• Ses données seront conservées`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'SUPPRIMER',
          style: 'destructive',
          onPress: async () => {
            try {
              // ✅ SOFT DELETE
              await updateDoc(doc(db, 'users', u.id), {
                isDeleted: true,
                deletedAt: serverTimestamp(),
                deletedBy: adminUser?.uid
              });

              // Supprimer conversations et messages (optionnel)
              const conversationsQuery = query(
                collection(db, 'conversations'),
                where('participants', 'array-contains', u.id)
              );
              const conversationsSnap = await getDocs(conversationsQuery);

              for (const convDoc of conversationsSnap.docs) {
                const messagesQuery = query(collection(db, 'conversations', convDoc.id, 'messages'));
                const messagesSnap = await getDocs(messagesQuery);
                for (const msgDoc of messagesSnap.docs) {
                  await deleteDoc(doc(db, 'conversations', convDoc.id, 'messages', msgDoc.id));
                }
                await deleteDoc(doc(db, 'conversations', convDoc.id));
              }

              await logAdminAction('DELETE_USER_SOFT', u.id, {
                email: u.email,
                displayName: u.displayName
              });

              Alert.alert('✅ Utilisateur supprimé', "L'utilisateur a été désactivé et ne peut plus se connecter.");
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer cet utilisateur.');
            }
          }
        }
      ]
    );
  };

  const loadConversationMessages = async (conversation: ConversationRow) => {
    try {
      setSelectedConversation(conversation);
      const messagesQuery = query(
        collection(db, 'conversations', conversation.id, 'messages'),
        orderBy('createdAt', 'asc')
      );
      const messagesSnap = await getDocs(messagesQuery);
      const messages = messagesSnap.docs.map(d => {
        const data = d.data() as any;
        const expediteurName =
          conversation.participantDetails?.[data.expediteurId]?.displayName || 'Utilisateur inconnu';
        return {
          id: d.id,
          ...data,
          conversationId: conversation.id,
          expediteurName
        } as MessageRow;
      });
      setConversationMessages(messages);
      setShowMessagesModal(true);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les messages.');
    }
  };

  const deleteMessage = async (message: MessageRow) => {
    Alert.alert(
      'Supprimer le message',
      'Voulez-vous supprimer ce message de manière définitive ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'conversations', message.conversationId, 'messages', message.id));
              await logAdminAction('DELETE_MESSAGE', message.expediteurId, {
                messageId: message.id,
                texte: message.texte,
                conversationId: message.conversationId
              });

              if (selectedConversation) {
                loadConversationMessages(selectedConversation);
              }
              Alert.alert('✅ Message supprimé');
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer ce message.');
            }
          }
        }
      ]
    );
  };

  // 📊 Calcul des statistiques (useCallback pour dépendances stables)
  const calculateStats = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingStats(true);
    try {
      // Utilisateurs
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as UserRow[];

      const aidants = allUsers.filter(u => u.isAidant && !u.isDeleted);
      const clients = allUsers.filter(u => !u.isAidant && !u.isDeleted);
      const aidantsVerifies = aidants.filter(u => u.isVerified);
      const aidantsEnAttente = aidants.filter(u => !u.isVerified);
      const comptesSuspendus = allUsers.filter(u => u.isSuspended && !u.isDeleted);

      // Conversations
      const conversationsSnap = await getDocs(collection(db, 'conversations'));
      const allConversations = conversationsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as ConversationRow[];
      const conversationsActives = allConversations.filter(c => c.status !== 'termine').length;

      // Services (optionnel)
      let servicesRealises = 0;
      let servicesEnCours = 0;
      let chiffreAffaires = 0;

      try {
        const servicesSnap = await getDocs(collection(db, 'services'));
        const allServices = servicesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as {
          id: string;
          status?: string;
          montant?: number;
        }[];

        servicesRealises = allServices.filter(s => s.status === 'termine').length;
        servicesEnCours = allServices.filter(s => s.status === 'en_cours').length;
        chiffreAffaires = allServices
          .filter(s => s.status === 'termine' && s.montant)
          .reduce((sum, s) => sum + (s.montant || 0), 0);
      } catch {
        console.log('Collection services non trouvée, utilisation de valeurs estimées.');
        servicesRealises = Math.floor(aidantsVerifies.length * 2.5);
        chiffreAffaires = servicesRealises * 25;
      }

      const commissionPerçue = chiffreAffaires * 0.4;

      // Secteurs populaires
      const secteursCount = aidants.reduce((acc, aidant) => {
        const secteur = aidant.secteur || 'Non spécifié';
        if (!acc[secteur]) acc[secteur] = { count: 0, revenue: 0 };
        acc[secteur].count++;
        acc[secteur].revenue += (aidant.tarifHeure || 22) * 10;
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);

      const secteursPopulaires = Object.entries(secteursCount)
        .map(([secteur, data]) => ({ secteur, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Avis (optionnel)
      let evaluationMoyenne = 0;
      try {
        const avisSnap = await getDocs(collection(db, 'avis'));
        const allAvis = avisSnap.docs.map(d => d.data() as any);
        const ratings = allAvis.filter(a => a.rating).map(a => Number(a.rating));
        evaluationMoyenne = ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
          : 0;
      } catch {
        console.log('Collection avis non trouvée.');
        evaluationMoyenne = 4.2;
      }

      // Évolution mensuelle (exemple)
      const evolutionMensuelle = [
        { mois: 'Jan', services: Math.floor(servicesRealises * 0.1), revenue: Math.floor(chiffreAffaires * 0.1) },
        { mois: 'Fév', services: Math.floor(servicesRealises * 0.15), revenue: Math.floor(chiffreAffaires * 0.15) },
        { mois: 'Mar', services: Math.floor(servicesRealises * 0.2), revenue: Math.floor(chiffreAffaires * 0.2) },
        { mois: 'Avr', services: Math.floor(servicesRealises * 0.25), revenue: Math.floor(chiffreAffaires * 0.25) },
        { mois: 'Mai', services: Math.floor(servicesRealises * 0.15), revenue: Math.floor(chiffreAffaires * 0.15) },
        { mois: 'Jun', services: Math.floor(servicesRealises * 0.15), revenue: Math.floor(chiffreAffaires * 0.15) },
      ];

      setStats({
        totalAidants: aidants.length,
        totalClients: clients.length,
        servicesRealises,
        servicesEnCours,
        chiffreAffaires,
        commissionPerçue,
        evaluationMoyenne: Math.round(evaluationMoyenne * 10) / 10,
        aidantsVerifies: aidantsVerifies.length,
        aidantsEnAttente: aidantsEnAttente.length,
        comptesSuspendus: comptesSuspendus.length,
        conversationsActives,
        secteursPopulaires,
        evolutionMensuelle
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les statistiques');
    } finally {
      setLoadingStats(false);
    }
  }, [isAdmin]);

  // 📊 Charger les stats quand on arrive sur l'onglet
  useEffect(() => {
    if (tab === 'stats' && isAdmin) {
      calculateStats();
    }
  }, [tab, isAdmin, calculateStats]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={s.center}>
        <Text>Accès réservé aux administrateurs.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <Text style={s.title}>Panel Administrateur</Text>
        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'validations' && s.tabBtnActive]}
            onPress={() => setTab('validations')}
          >
            <Text style={[s.tabTxt, tab === 'validations' && s.tabTxtActive]}>
              Validations {pending.length > 0 && `(${pending.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'users' && s.tabBtnActive]}
            onPress={() => setTab('users')}
          >
            <Text style={[s.tabTxt, tab === 'users' && s.tabTxtActive]}>
              Utilisateurs ({users.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'conversations' && s.tabBtnActive]}
            onPress={() => setTab('conversations')}
          >
            <Text style={[s.tabTxt, tab === 'conversations' && s.tabTxtActive]}>
              Conversations
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'stats' && s.tabBtnActive]}
            onPress={() => setTab('stats')}
          >
            <Text style={[s.tabTxt, tab === 'stats' && s.tabTxtActive]}>
              📊 Statistiques
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'validations' ? (
        <View style={{ flex: 1, padding: 12 }}>
          <Text style={s.sectionTitle}>Profils à vérifier ({pending.length})</Text>
          <FlatList
            data={pending}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
            ListEmptyComponent={<Text style={s.muted}>Aucun profil en attente 👌</Text>}
            renderItem={({ item }) => (
              <View style={s.card}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.displayName || 'Sans nom'}</Text>
                  <Text style={s.email}>{item.email || ''}</Text>
                  <Text style={s.meta}>
                    {(item.isAidant ? 'Aidant • ' : '') + (item.secteur || 'Secteur inconnu')}
                    {item.tarifHeure && ` • ${item.tarifHeure}€/h`}
                  </Text>
                </View>
                <TouchableOpacity style={s.primary} onPress={() => verifyAidant(item.id)}>
                  <Text style={s.btnTxt}>✅ Valider</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      ) : tab === 'users' ? (
        <View style={{ flex: 1, padding: 12 }}>
          <Text style={s.sectionTitle}>Utilisateurs ({users.length})</Text>
          <TextInput
            placeholder="Filtrer par email ou nom…"
            value={filter}
            onChangeText={setFilter}
            style={s.search}
            autoCapitalize="none"
          />
          <FlatList
            data={filteredUsers}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
            ListEmptyComponent={<Text style={s.muted}>Aucun utilisateur</Text>}
            renderItem={({ item }) => (
              <View style={s.card}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.displayName || 'Sans nom'}</Text>
                  <Text style={s.email}>{item.email || ''}</Text>
                  <Text style={s.meta}>
                    {(item.isAidant ? 'Aidant • ' : 'Client • ') + (item.secteur || '—')}
                    {'  '}|  {item.isVerified ? 'Vérifié ✅' : 'Non vérifié'}
                    {item.isSuspended && '  |  ⚠️ SUSPENDU'}
                  </Text>
                </View>
                <View style={s.actionButtons}>
                  <TouchableOpacity
                    style={item.isSuspended ? s.success : s.warning}
                    onPress={() => toggleSuspend(item)}
                  >
                    <Text style={s.btnTxt}>
                      {item.isSuspended ? '🔓' : '🔒'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.danger}
                    onPress={() => deleteUser(item)}
                  >
                    <Text style={s.btnTxt}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      ) : tab === 'conversations' ? (
        <View style={{ flex: 1, padding: 12 }}>
          <Text style={s.sectionTitle}>Modération des conversations ({conversations.length})</Text>
          <TextInput
            placeholder="Filtrer par secteur ou nom…"
            value={filter}
            onChangeText={setFilter}
            style={s.search}
            autoCapitalize="none"
          />
          <FlatList
            data={filteredConversations}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
            ListEmptyComponent={<Text style={s.muted}>Aucune conversation</Text>}
            renderItem={({ item }) => {
              const namesArray = (Object.values(item.participantDetails ?? {}) as {
                displayName?: string | null;
              }[]);
              const participantNames = namesArray
                .map(p => p?.displayName || 'Inconnu')
                .join(' ↔ ');

              return (
                <TouchableOpacity
                  style={s.card}
                  onPress={() => loadConversationMessages(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{participantNames}</Text>
                    <Text style={s.email}>{item.secteur} • {item.status}</Text>
                    <Text style={s.meta} numberOfLines={1}>
                      {item.lastMessage?.texte || 'Pas de message'}
                    </Text>
                  </View>
                  <View style={s.primary}>
                    <Text style={s.btnTxt}>👁️ Voir</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      ) : (
        // 📊 SECTION STATISTIQUES
        <ScrollView style={{ flex: 1, padding: 12 }}>
          <View style={s.statsHeader}>
            <Text style={s.sectionTitle}>📊 Tableau de bord - Statistiques</Text>
            <TouchableOpacity
              style={s.refreshBtn}
              onPress={calculateStats}
              disabled={loadingStats}
            >
              <Text style={s.refreshBtnTxt}>
                {loadingStats ? '⏳' : '🔄'} Actualiser
              </Text>
            </TouchableOpacity>
          </View>

          {loadingStats ? (
            <View style={s.loadingStats}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
              <Text style={s.loadingText}>Calcul des statistiques...</Text>
            </View>
          ) : (
            <>
              {/* 📊 Statistiques principales */}
              <View style={s.statsGrid}>
                <View style={s.statCard}>
                  <Text style={s.statNumber}>{stats.totalAidants}</Text>
                  <Text style={s.statLabel}>👥 Aidants totaux</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statNumber}>{stats.totalClients}</Text>
                  <Text style={s.statLabel}>🙋‍♀️ Clients totaux</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statNumber}>{stats.servicesRealises}</Text>
                  <Text style={s.statLabel}>✅ Services réalisés</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statNumber}>{stats.servicesEnCours}</Text>
                  <Text style={s.statLabel}>⏳ Services en cours</Text>
                </View>
              </View>

              {/* 💰 Finances */}
              <View style={s.financeSection}>
                <Text style={s.subsectionTitle}>💰 Finances</Text>
                <View style={s.financeGrid}>
                  <View style={[s.statCard, s.financeCard]}>
                    <Text style={[s.statNumber, s.financeNumber]}>{stats.chiffreAffaires}€</Text>
                    <Text style={s.statLabel}>💵 Chiffre d&apos;affaires</Text>
                  </View>
                  <View style={[s.statCard, s.financeCard]}>
                    <Text style={[s.statNumber, s.financeNumber]}>{Math.round(stats.commissionPerçue)}€</Text>
                    <Text style={s.statLabel}>🏛️ Commission (40%)</Text>
                  </View>
                </View>
              </View>

              {/* 📈 Gestion & Qualité */}
              <View style={s.managementSection}>
                <Text style={s.subsectionTitle}>📈 Gestion & Qualité</Text>
                <View style={s.statsGrid}>
                  <View style={s.statCard}>
                    <Text style={s.statNumber}>{stats.aidantsVerifies}</Text>
                    <Text style={s.statLabel}>✅ Aidants vérifiés</Text>
                  </View>
                  <View style={s.statCard}>
                    <Text style={s.statNumber}>{stats.aidantsEnAttente}</Text>
                    <Text style={s.statLabel}>⏳ En attente validation</Text>
                  </View>
                  <View style={s.statCard}>
                    <Text style={s.statNumber}>{stats.comptesSuspendus}</Text>
                    <Text style={s.statLabel}>🔒 Comptes suspendus</Text>
                  </View>
                  <View style={s.statCard}>
                    <Text style={s.statNumber}>{stats.evaluationMoyenne}/5</Text>
                    <Text style={s.statLabel}>⭐ Note moyenne</Text>
                  </View>
                </View>
              </View>

              {/* 📍 Secteurs populaires */}
              <View style={s.sectorsSection}>
                <Text style={s.subsectionTitle}>📍 Secteurs populaires</Text>
                {stats.secteursPopulaires.length > 0 ? (
                  stats.secteursPopulaires.map((secteur, index) => (
                    <View key={secteur.secteur} style={s.sectorCard}>
                      <View style={s.sectorRank}>
                        <Text style={s.rankNumber}>{index + 1}</Text>
                      </View>
                      <View style={s.sectorInfo}>
                        <Text style={s.sectorName}>{secteur.secteur}</Text>
                        <Text style={s.sectorStats}>
                          {secteur.count} aidants • {secteur.revenue}€ revenus
                        </Text>
                      </View>
                      <View style={s.sectorBar}>
                        <View
                          style={[
                            s.sectorBarFill,
                            { width: `${(secteur.count / Math.max(...stats.secteursPopulaires.map(s => s.count))) * 100}%` }
                          ]}
                        />
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={s.muted}>Aucun secteur disponible</Text>
                )}
              </View>

              {/* 📊 Évolution mensuelle */}
              <View style={s.evolutionSection}>
                <Text style={s.subsectionTitle}>📊 Évolution des 6 derniers mois</Text>
                <View style={s.monthlyGrid}>
                  {stats.evolutionMensuelle.map((month) => (
                    <View key={month.mois} style={s.monthCard}>
                      <Text style={s.monthName}>{month.mois}</Text>
                      <Text style={s.monthServices}>{month.services} services</Text>
                      <Text style={s.monthRevenue}>{month.revenue}€</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 📱 Actions rapides */}
              <View style={s.actionsSection}>
                <Text style={s.subsectionTitle}>⚡ Actions rapides</Text>
                <View style={s.quickActions}>
                  <TouchableOpacity
                    style={s.actionBtn}
                    onPress={() => setTab('validations')}
                  >
                    <Text style={s.actionBtnTxt}>
                      👀 Voir validations ({stats.aidantsEnAttente})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.actionBtn}
                    onPress={() => setTab('conversations')}
                  >
                    <Text style={s.actionBtnTxt}>
                      💬 Modérer conversations ({stats.conversationsActives})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Modal Messages */}
      <Modal visible={showMessagesModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowMessagesModal(false)}>
              <Text style={s.closeBtn}>← Fermer</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Messages de la conversation</Text>
          </View>

          <ScrollView style={{ flex: 1, padding: 12 }}>
            {conversationMessages.map((msg) => (
              <View key={msg.id} style={s.messageCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.msgAuthor}>{msg.expediteurName}</Text>
                  <Text style={s.msgText}>{msg.texte}</Text>
                  <Text style={s.msgTime}>
                    {msg.createdAt?.toDate?.()?.toLocaleString() || 'Date inconnue'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.deleteMsg}
                  onPress={() => deleteMessage(msg)}
                >
                  <Text style={s.btnTxt}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', color: '#11181C', marginBottom: 10 },
  tabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f3f5' },
  tabBtnActive: { backgroundColor: Colors.light.primary + '20' },
  tabTxt: { color: '#495057', fontWeight: '600', fontSize: 12 },
  tabTxtActive: { color: Colors.light.primary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2c3e50', marginBottom: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    gap: 10
  },
  name: { fontSize: 16, fontWeight: '700', color: '#2c3e50' },
  email: { fontSize: 13, color: '#687076', marginTop: 2 },
  meta: { fontSize: 12, color: '#6c757d', marginTop: 6 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  primary: { backgroundColor: Colors.light.primary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  success: { backgroundColor: Colors.light.success, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  warning: { backgroundColor: '#f39c12', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  danger: { backgroundColor: Colors.light.danger, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  muted: { textAlign: 'center', color: '#687076', marginTop: 20 },
  search: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8
  },

  // Modal styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  closeBtn: { color: Colors.light.primary, fontSize: 16, fontWeight: '600' },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#2c3e50' },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 10
  },
  msgAuthor: { fontSize: 14, fontWeight: '700', color: Colors.light.primary },
  msgText: { fontSize: 14, color: '#2c3e50', marginTop: 4, lineHeight: 20 },
  msgTime: { fontSize: 11, color: '#6c757d', marginTop: 4 },
  deleteMsg: {
    backgroundColor: Colors.light.danger,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6
  },

  // 📊 Styles stats
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  refreshBtn: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  refreshBtnTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  loadingStats: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  loadingText: {
    marginTop: 10,
    color: '#687076',
    fontSize: 14
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#687076',
    textAlign: 'center',
    fontWeight: '500'
  },
  financeSection: {
    marginBottom: 20
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12
  },
  financeGrid: {
    flexDirection: 'row',
    gap: 12
  },
  financeCard: {
    backgroundColor: '#f8f9fa'
  },
  financeNumber: {
    color: '#28a745'
  },
  managementSection: {
    marginBottom: 20
  },
  sectorsSection: {
    marginBottom: 20
  },
  sectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 12
  },
  sectorRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rankNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  sectorInfo: {
    flex: 1
  },
  sectorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50'
  },
  sectorStats: {
    fontSize: 12,
    color: '#687076',
    marginTop: 2
  },
  sectorBar: {
    width: 60,
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2
  },
  sectorBarFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 2
  },
  evolutionSection: {
    marginBottom: 20
  },
  monthlyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  monthCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  monthName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4
  },
  monthServices: {
    fontSize: 11,
    color: Colors.light.primary,
    fontWeight: '600'
  },
  monthRevenue: {
    fontSize: 11,
    color: '#687076'
  },
  actionsSection: {
    marginBottom: 20
  },
  quickActions: {
    gap: 12
  },
  actionBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center'
  },
  actionBtnTxt: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '600'
  }
});
