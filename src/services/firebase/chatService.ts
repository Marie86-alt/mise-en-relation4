// src/services/firebase/chatService.ts
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
  doc, setDoc, where, updateDoc, getDoc,
  DocumentData
} from 'firebase/firestore';
import { db } from '../../../firebase.config';

// --- TYPES ---
export type StatutServiceType =
  | 'conversation'
  | 'service_confirme'
  | 'en_cours'
  | 'termine'
  | 'evaluation';

interface ConversationData {
  participants: string[];
  participantDetails: { [uid: string]: { displayName?: string | null } };
  secteur?: string;
  jour?: string;
  heureDebut?: string;
  heureFin?: string;
  lastMessage?: { texte: string; createdAt: any };
  status?: StatutServiceType;
}

interface MessageWrite {
  texte: string;
  expediteurId: string;
  // Optionnel (ignoré, on utilise serverTimestamp pour createdAt)
  timestamp?: any;
}

export interface Message {
  id: string;
  texte: string;
  expediteurId: string;
  // On renvoie la valeur brute (Timestamp Firestore ou undefined)
  timestamp: any;
}

type MessagesCallback = (messages: Message[]) => void;
type ConversationsCallback = (conversations: DocumentData[]) => void;

// Id stable pour une paire d'utilisateurs
const getConversationId = (uid1: string, uid2: string): string =>
  uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;

export const chatService = {
  getConversationId,

  /**
   * Envoie un message et met à jour lastMessage de la conversation.
   * Si la conversation n'existe pas, on la crée (merge).
   */
  sendMessage: async (
    conversationId: string,
    messageData: MessageWrite,
    conversationSeed?: Partial<ConversationData> // optionnel: infos à merger lors de la 1re écriture
  ): Promise<void> => {
    try {
      const convRef = doc(db, 'conversations', conversationId);

      // S'assurer que le doc existe : on merge un minimum d'infos + status par défaut
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
        await setDoc(
          convRef,
          {
            status: 'conversation' as StatutServiceType,
            ...(conversationSeed || {}),
          },
          { merge: true }
        );
      }

      // Ajout du message
      const messagesCollection = collection(convRef, 'messages');
      await addDoc(messagesCollection, {
        texte: messageData.texte,
        expediteurId: messageData.expediteurId,
        createdAt: serverTimestamp(),
      });

      // Mise à jour du lastMessage
      await updateDoc(convRef, {
        lastMessage: {
          texte: messageData.texte,
          createdAt: serverTimestamp(),
        },
      });
    } catch (error) {
      console.error('Erreur sendMessage:', error);
      throw error;
    }
  },

  /**
   * Mise à jour explicite du lastMessage (utile si tu l’appelles côté UI).
   */
  updateConversationLastMessage: async (
    conversationId: string,
    payload: { texte: string }
  ): Promise<void> => {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      lastMessage: {
        texte: payload.texte,
        createdAt: serverTimestamp(),
      },
    });
  },

  /**
   * Met à jour le statut de la conversation (aligné avec l’UI).
   */
  updateConversationStatus: async (
    conversationId: string,
    status: StatutServiceType
  ): Promise<void> => {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, { status });
  },

  /**
   * Écoute des messages d'une conversation (ordonnés par createdAt asc).
   */
  listenToMessages: (conversationId: string, callback: MessagesCallback) => {
    const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCollection, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: Message[] = snapshot.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          texte: data.texte,
          expediteurId: data.expediteurId,
          // On renvoie le Timestamp brut ; l'UI le formate avec toDate()
          timestamp: data.createdAt,
        };
      });
      callback(messages);
    });
    return unsubscribe;
  },

  /**
   * Écoute des conversations d’un utilisateur, triées par lastMessage.createdAt desc.
   */
  listenToUserConversations: (userId: string, callback: ConversationsCallback) => {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessage.createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const conversations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(conversations);
    });

    return unsubscribe;
  },
};
