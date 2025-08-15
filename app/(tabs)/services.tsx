import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { chatService } from '../../src/services/firebase/chatService';
import { Colors } from '@/constants/Colors';
import { DocumentData } from 'firebase/firestore';

// --- TYPES ---
interface Conversation extends DocumentData {
  id: string;
  participants: string[];
  participantDetails: { [uid: string]: { displayName: string; } };
  lastMessage?: { texte: string; };
  secteur: string;
  status: 'conversation' | 'a_venir' | 'termine';
}

// --- SOUS-COMPOSANTS ---

// Carte pour afficher une conversation
const ConversationCard = ({ item, onPress }: { item: Conversation; onPress: () => void }) => {
  const { user } = useAuth();
  if (!user) return null;

  const otherUserId = item.participants.find(uid => uid !== user.uid);
  const otherUser = otherUserId ? item.participantDetails[otherUserId] : null;

  return (
    <TouchableOpacity style={styles.serviceCard} onPress={onPress}>
      <View style={styles.serviceHeader}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{otherUser?.displayName?.charAt(0).toUpperCase() || '?'}</Text></View>
        <View style={styles.serviceInfo}>
          <Text style={styles.profileName}>{otherUser?.displayName || 'Interlocuteur'}</Text>
          <Text style={styles.serviceSecteur}>{item.secteur}</Text>
        </View>
      </View>
      <Text style={styles.dernierMessage} numberOfLines={1}>{item.lastMessage?.texte || "Démarrez la conversation..."}</Text>
    </TouchableOpacity>
  );
};

// Section pour regrouper les cartes par statut
const Section = ({ title, data, onPressItem }: { title: string; data: Conversation[]; onPressItem: (item: Conversation) => void }) => (
    <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {data.map((item: Conversation) => <ConversationCard key={item.id} item={item} onPress={() => onPressItem(item)} />)}
    </View>
);

// --- ÉCRAN PRINCIPAL ---

export default function MesServicesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  // Écoute les conversations en temps réel
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const unsubscribe = chatService.listenToUserConversations(user.uid, (convs) => {
      setConversations(convs as Conversation[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // ✅ CORRECTION : Sépare automatiquement les conversations en 3 listes
  const { en_cours, a_venir, termines } = useMemo(() => {
    const en_cours = conversations.filter(c => c.status === 'conversation');
    const a_venir = conversations.filter(c => c.status === 'a_venir');
    const termines = conversations.filter(c => c.status === 'termine');
    return { en_cours, a_venir, termines };
  }, [conversations]);

  const ouvrirConversation = (conv: Conversation) => {
    if (!user) return;
    const otherUserId = conv.participants.find(uid => uid !== user.uid);
    const otherUserName = otherUserId ? conv.participantDetails[otherUserId]?.displayName : "Interlocuteur";

    router.push({
      pathname: '/conversation',
      params: { profileId: otherUserId,
        profileName: otherUserName,
        secteur: conv.secteur,
        jour: conv.jour || '',
        heureDebut: conv.heureDebut || '',
        heureFin: conv.heureFin || '', }
    });
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator style={{ flex: 1 }} size="large" color={Colors.light.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📱 Mes Services</Text>
        <Text style={styles.headerSubtitle}>Suivez vos discussions et services</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>📭 Aucun service</Text>
          <Text style={styles.emptyText}>Lorsque vous contacterez un aidant, vos services apparaîtront ici.</Text>
          <TouchableOpacity style={styles.nouvelleRechercheButton} onPress={() => router.push('/(tabs)')}><Text style={styles.nouvelleRechercheText}>🔍 Trouver un aidant</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView>
          {/* ✅ CORRECTION : On affiche les 3 sections distinctes */}
          {en_cours.length > 0 && <Section title="💬 En discussion" data={en_cours} onPressItem={ouvrirConversation} />}
          {a_venir.length > 0 && <Section title="🗓️ À venir" data={a_venir} onPressItem={ouvrirConversation} />}
          {termines.length > 0 && <Section title="✅ Terminés" data={termines} onPressItem={ouvrirConversation} />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { backgroundColor: '#ffffff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#11181C' },
    headerSubtitle: { fontSize: 14, color: '#687076', marginTop: 5 },
    sectionContainer: { marginTop: 20, marginHorizontal: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.light.primary, marginBottom: 10 },
    serviceCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f0' },
    serviceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15, backgroundColor: Colors.light.primary },
    avatarText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
    serviceInfo: { flex: 1 },
    profileName: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
    serviceSecteur: { fontSize: 14, color: Colors.light.primary, fontWeight: '500' },
    dernierMessage: { fontSize: 14, color: '#6c757d', fontStyle: 'italic' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#6c757d', marginBottom: 10 },
    emptyText: { fontSize: 16, color: '#6c757d', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
    nouvelleRechercheButton: { backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
    nouvelleRechercheText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
});