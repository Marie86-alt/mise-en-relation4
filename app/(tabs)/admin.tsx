import React, { useEffect, useMemo, useState } from 'react';
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
};

type ConversationRow = {
  id: string;
  participants: string[];
  participantDetails: { [uid: string]: { displayName?: string | null } };
  lastMessage?: { texte: string; createdAt: any };
  secteur?: string;
  status?: string;
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

export default function AdminScreen() {
  const { isAdmin, loading, user: adminUser } = useAuth();
  const [tab, setTab] = useState<'validations' | 'users' | 'conversations'>('validations');

  const [pending, setPending] = useState<UserRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationRow | null>(null);
  const [conversationMessages, setConversationMessages] = useState<MessageRow[]>([]);
  const [filter, setFilter] = useState('');
  const [showMessagesModal, setShowMessagesModal] = useState(false);

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
    const unsub = onSnapshot(qPending, (snap) => {
      setPending(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    }, (err) => console.error('listen pending', err));
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
    const unsub = onSnapshot(qUsers, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    }, (err) => console.error('listen users', err));
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
    const unsub = onSnapshot(qConversations, (snap) => {
      setConversations(snap.docs.map(d => ({ 
        id: d.id, 
        ...(d.data() as any),
        messageCount: 0 // On pourrait calculer ça si besoin
      })));
    }, (err) => console.error('listen conversations', err));
    return unsub;
  }, [isAdmin, tab]);

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
    } catch (e) {
      console.error(e);
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
            } catch (e) {
              console.error(e);
              Alert.alert('Erreur', 'Action impossible.');
            }
          }
        }
      ]
    );
  };

  const deleteUser = async (u: UserRow) => {
    Alert.alert(
      '⚠️ Suppression définitive',
      `Voulez-vous SUPPRIMER DÉFINITIVEMENT l'utilisateur ${u.displayName || u.email} ?\n\nCette action est irréversible et supprimera :\n• Le compte utilisateur\n• Tous ses messages\n• Toutes ses conversations`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'SUPPRIMER',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Supprimer les messages de l'utilisateur
              const conversationsQuery = query(
                collection(db, 'conversations'),
                where('participants', 'array-contains', u.id)
              );
              const conversationsSnap = await getDocs(conversationsQuery);
              
              for (const convDoc of conversationsSnap.docs) {
                // Supprimer tous les messages de cette conversation
                const messagesQuery = query(collection(db, 'conversations', convDoc.id, 'messages'));
                const messagesSnap = await getDocs(messagesQuery);
                for (const msgDoc of messagesSnap.docs) {
                  await deleteDoc(doc(db, 'conversations', convDoc.id, 'messages', msgDoc.id));
                }
                // Supprimer la conversation
                await deleteDoc(doc(db, 'conversations', convDoc.id));
              }

              // 2. Supprimer le document utilisateur
              await deleteDoc(doc(db, 'users', u.id));

              // 3. Logger l'action
              await logAdminAction('DELETE_USER', u.id, { 
                email: u.email, 
                displayName: u.displayName 
              });

              Alert.alert('✅ Utilisateur supprimé', 'L\'utilisateur et toutes ses données ont été supprimés définitivement.');
            } catch (e) {
              console.error(e);
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
        const data = d.data();
        const expediteurName = conversation.participantDetails?.[data.expediteurId]?.displayName || 'Utilisateur inconnu';
        return {
          id: d.id,
          ...data,
          conversationId: conversation.id,
          expediteurName
        } as MessageRow;
      });
      setConversationMessages(messages);
      setShowMessagesModal(true);
    } catch (e) {
      console.error(e);
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
              
              // Recharger les messages
              if (selectedConversation) {
                loadConversationMessages(selectedConversation);
              }
              Alert.alert('✅ Message supprimé');
            } catch (e) {
              console.error(e);
              Alert.alert('Erreur', 'Impossible de supprimer ce message.');
            }
          }
        }
      ]
    );
  };

  // ---- UI helpers ----
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
      Object.values(c.participantDetails || {}).some(p => 
        (p.displayName || '').toLowerCase().includes(f)
      )
    );
  }, [conversations, filter]);

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
      ) : (
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
              const participantNames = Object.values(item.participantDetails || {})
                .map(p => p.displayName || 'Inconnu')
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
  tabs: { flexDirection: 'row', gap: 8 },
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
});