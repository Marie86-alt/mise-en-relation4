import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
  doc, setDoc, where, updateDoc,
  DocumentData
} from 'firebase/firestore';
import { db } from '../../../firebase.config';

// --- TYPES ---
interface ConversationData {
  participants: string[];
  participantDetails: { [uid: string]: { displayName?: string | null } };
  secteur?: string; jour?: string; heureDebut?: string; heureFin?: string;
  lastMessage?: { texte: string; createdAt: any; };
  status?: 'conversation' | 'a_venir' | 'termine';
}
interface MessageData { texte: string; expediteurId: string; }
export interface Message { id: string; texte: string; expediteurId: string; timestamp: string; }
type MessagesCallback = (messages: Message[]) => void;
type ConversationsCallback = (conversations: DocumentData[]) => void;

const getConversationId = (uid1: string, uid2: string): string => {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

export const chatService = {
  sendMessage: async (
    conversationId: string,
    messageData: MessageData,
    conversationData: ConversationData
  ): Promise<void> => {
    try {
      const convRef = doc(db, 'conversations', conversationId);
      // On s'assure que le champ lastMessage est créé/mis à jour
      const dataToSet = {
        status: 'conversation',
        ...conversationData,
        lastMessage: {
          texte: messageData.texte,
          createdAt: serverTimestamp()
        }
      };
      await setDoc(convRef, dataToSet, { merge: true });

      const messagesCollection = collection(convRef, 'messages');
      await addDoc(messagesCollection, { ...messageData, createdAt: serverTimestamp() });
    } catch (error) {
      console.error("Erreur sendMessage:", error);
      throw error;
    }
  },

  updateConversationStatus: async (conversationId: string, status: 'a_venir' | 'termine'): Promise<void> => {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, { status: status });
  },

  listenToMessages: (conversationId: string, callback: MessagesCallback) => {
    const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCollection, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: Message[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          texte: data.texte,
          expediteurId: data.expediteurId,
          timestamp: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'envoi...',
        };
      });
      callback(messages);
    });
    return unsubscribe;
  },

  listenToUserConversations: (userId: string, callback: ConversationsCallback) => {
    const q = query(collection(db, 'conversations'), where('participants', 'array-contains', userId), orderBy('lastMessage.createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const conversations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(conversations);
    });
    return unsubscribe;
  },

  getConversationId,
};