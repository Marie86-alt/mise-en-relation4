import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { chatService, Message } from '../src/services/firebase/chatService';
import { Colors } from '@/constants/Colors';
import { Timestamp } from 'firebase/firestore';

// ---- ÉTAPES (logique locale d’UI)
type EtapeType = 'conversation' | 'attente_verification' | 'service_en_cours' | 'evaluation' | 'avis_obligatoire';

const ETAPES: Record<string, EtapeType> = {
  CONVERSATION: 'conversation',
  ATTENTE_VERIFICATION: 'attente_verification',
  SERVICE_EN_COURS: 'service_en_cours',
  EVALUATION: 'evaluation',
  AVIS_OBLIGATOIRE: 'avis_obligatoire',
};

export default function ConversationScreen() {
  const [etapeActuelle, setEtapeActuelle] = useState<EtapeType>(ETAPES.CONVERSATION);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nouveauMessage, setNouveauMessage] = useState<string>('');
  const [adresseService, setAdresseService] = useState<string>('');
  const [evaluation, setEvaluation] = useState<number>(0);
  const [avisTexte, setAvisTexte] = useState<string>('');
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [showAcompteModal, setShowAcompteModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const { user } = useAuth();
  const flatListRef = useRef<FlatList<Message>>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profileId, profileName, secteur, jour, heureDebut, heureFin } = params;
  const conversationId = user && profileId ? chatService.getConversationId(user.uid, profileId as string) : null;

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = chatService.listenToMessages(conversationId, setMessages);
    return () => unsubscribe?.();
  }, [conversationId]);

  // ---------- UTILS ----------
  const formatHeure = (ts: any) => {
    try {
      let date: Date;
      if (!ts) return '';
      if (ts instanceof Timestamp) {
        date = ts.toDate();
      } else if (typeof ts?.toDate === 'function') {
        date = ts.toDate();
      } else if (typeof ts === 'number') {
        date = new Date(ts);
      } else {
        return '';
      }
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    } catch {
      return '';
    }
  };

  // ---------- ACTIONS ----------
  const envoyerMessage = async () => {
  if (!user || !conversationId) return;
  const texte = (nouveauMessage || '').trim();
  if (!texte) return;

  try {
    setLoading(true);

    await chatService.sendMessage(
      conversationId,
      {
        texte,
        expediteurId: user.uid,
      },
      {
        // 👇 Seed de conversation pour la 1re écriture / merge
        participants: [user.uid, String(profileId)],
        participantDetails: {
          [user.uid]: { displayName: user.displayName || 'Vous' },
          [String(profileId)]: { displayName: String(profileName) || 'Aidant' },
        },
        secteur: String(secteur || ''),
        jour: String(jour || ''),
        heureDebut: String(heureDebut || ''),
        heureFin: String(heureFin || ''),
        status: 'conversation',
      }
    );

    await chatService.updateConversationLastMessage(conversationId, { texte });
    setNouveauMessage('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
  } catch (e) {
    console.error('Erreur envoi message', e);
    Alert.alert('Erreur', "Le message n'a pas pu être envoyé.");
  } finally {
    setLoading(false);
  }
};


  const retournerEnArriere = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/services');
  };

  const confirmerService = () => {
    if (adresseService.trim() === '') {
      Alert.alert('Erreur', "Veuillez saisir l'adresse.");
      return;
    }
    setShowConfirmationModal(false);
    setShowAcompteModal(true);
  };

  const payerAcompte = async () => {
    // ⚠️ On met un statut existant : 'service_confirme' (et PAS 'a_venir')
    if (!conversationId) return;
    setLoading(true);
    setShowAcompteModal(false);
    try {
      await chatService.updateConversationStatus(conversationId, 'service_confirme');
      setEtapeActuelle(ETAPES.ATTENTE_VERIFICATION);
      Alert.alert('✅ Service confirmé !', "L'acompte a été versé.");
    } catch (error) {
      console.error('Erreur lors de la confirmation du service:', error);
      Alert.alert('Erreur', 'Impossible de confirmer le service.');
    } finally {
      setLoading(false);
    }
  };

  const lancerVerifications = async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      // Ici tu pourrais appeler une vraie vérification si tu veux.
      // On simule 1,5s puis on passe le statut à 'en_cours'
      setTimeout(async () => {
        await chatService.updateConversationStatus(conversationId, 'en_cours');
        setEtapeActuelle(ETAPES.SERVICE_EN_COURS);
        setLoading(false);
      }, 1500);
    } catch (e) {
      console.error('Erreur vérifications', e);
      setLoading(false);
      Alert.alert('Erreur', 'Impossible de lancer les vérifications.');
    }
  };

  const terminerService = async () => {
    if (!conversationId) return;
    try {
      await chatService.updateConversationStatus(conversationId, 'termine');
      setEtapeActuelle(ETAPES.EVALUATION);
    } catch (error) {
      console.error('Erreur lors de la terminaison du service:', error);
      Alert.alert('Erreur', 'Impossible de terminer le service.');
    }
  };

  const confirmerEvaluation = () => {
    if (evaluation === 0) {
      Alert.alert('Erreur', 'Veuillez donner une note de 1 à 5 étoiles.');
      return;
    }
    if (evaluation < 3) {
      setEtapeActuelle(ETAPES.AVIS_OBLIGATOIRE);
    } else {
      naviguerVersPaiement();
    }
  };

  const confirmerAvis = () => {
    if (avisTexte.trim() === '') {
      Alert.alert('Erreur', 'Un avis détaillé est obligatoire pour une note < 3 étoiles.');
      return;
    }
    naviguerVersPaiement();
  };

  const naviguerVersPaiement = () => {
    router.push({
      pathname: '/paiement',
      params: {
        aidantName: (profileName as string) || '',
        secteur: (secteur as string) || '',
        dureeService: '2',
        tarifHoraire: '25',
        avisClient: avisTexte || "Service d'accompagnement senior satisfaisant.",
        noteService: evaluation.toString(),
      },
    });
  };

  // ---------- RENDUS ----------
  const renderMessage = ({ item }: { item: Message }) => {
    const isClient = item.expediteurId === user?.uid;
    return (
      <View style={[styles.messageContainer, isClient ? styles.messageClient : styles.messageAidant]}>
        <Text style={[styles.messageTexte, isClient && styles.messageTexteClient]}>{item.texte}</Text>
        <Text style={[styles.messageHeure, isClient && styles.messageHeureClient]}>
          {formatHeure((item as any).timestamp)}
        </Text>
      </View>
    );
  };

  const renderEtoiles = () => (
    <View style={styles.etoilesContainer}>
      {[1, 2, 3, 4, 5].map((etoile) => (
        <TouchableOpacity key={etoile} onPress={() => setEvaluation(etoile)} style={styles.etoileButton}>
          <Text style={[styles.etoile, etoile <= evaluation ? styles.etoilePleine : styles.etoileVide]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContenuPrincipal = () => {
    switch (etapeActuelle) {
      case ETAPES.CONVERSATION:
        return (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.messageInput}
                  value={nouveauMessage}
                  onChangeText={setNouveauMessage}
                  placeholder="Tapez votre message..."
                  multiline
                />
                <TouchableOpacity onPress={envoyerMessage} style={styles.sendButton} disabled={loading}>
                  <Text style={styles.sendButtonText}>{loading ? '…' : '📤'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.confirmerButton} onPress={() => setShowConfirmationModal(true)}>
                <Text style={styles.confirmerButtonText}>✅ Confirmer le service</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </>
        );
      case ETAPES.ATTENTE_VERIFICATION:
        return (
          <View style={styles.centeredContent}>
            <Text style={styles.etapeTitle}>🔄 Service confirmé !</Text>
            <Text style={styles.etapeDescription}>
              L&apos;acompte a été versé. Préparez-vous pour le jour J !
            </Text>
            <TouchableOpacity style={styles.verificationButton} onPress={lancerVerifications} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Vérification…' : '🔍 Lancer les vérifications'}</Text>
            </TouchableOpacity>
          </View>
        );
      case ETAPES.SERVICE_EN_COURS:
        return (
          <View style={styles.centeredContent}>
            <Text style={styles.etapeTitle}>🤝 Service en cours</Text>
            <Text style={styles.etapeDescription}>
              Le service est en cours à l&apos;adresse : {adresseService}
            </Text>
            <TouchableOpacity style={styles.terminerButton} onPress={terminerService}>
              <Text style={styles.buttonText}>✅ Service terminé</Text>
            </TouchableOpacity>
          </View>
        );
      case ETAPES.EVALUATION:
        return (
          <View style={styles.centeredContent}>
            <Text style={styles.etapeTitle}>⭐ Évaluez le service</Text>
            {renderEtoiles()}
            <TouchableOpacity style={styles.evaluerButton} onPress={confirmerEvaluation}>
              <Text style={styles.buttonText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        );
      case ETAPES.AVIS_OBLIGATOIRE:
        return (
          <ScrollView contentContainerStyle={styles.avisContainer}>
            <Text style={styles.etapeTitle}>📝 Avis détaillé requis</Text>
            <Text style={styles.etapeDescription}>
              Un avis est obligatoire pour une note inférieure à 3 étoiles.
            </Text>
            {renderEtoiles()}
            <TextInput
              style={styles.avisInput}
              value={avisTexte}
              onChangeText={setAvisTexte}
              placeholder="Décrivez votre expérience..."
              multiline
            />
            <TouchableOpacity style={styles.confirmerAvisButton} onPress={confirmerAvis}>
              <Text style={styles.buttonText}>Envoyer l&apos;avis</Text>
            </TouchableOpacity>
          </ScrollView>
        );
      default:
        return (
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={retournerEnArriere}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💬 {String(profileName || '')}</Text>
        <Text style={styles.headerSubtitle}>
          {String(secteur || '')} • {String(jour || '')} ({String(heureDebut || '')} - {String(heureFin || '')})
        </Text>
      </View>

      {renderContenuPrincipal()}

      {/* MODAL ADRESSE */}
      <Modal visible={showConfirmationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📍 Confirmer le service</Text>
            <Text style={styles.modalDescription}>
              Veuillez saisir l&apos;adresse où le service doit être réalisé :
            </Text>
            <TextInput
              style={styles.adresseInput}
              value={adresseService}
              onChangeText={setAdresseService}
              placeholder="123 Rue de la Paix, 75001 Paris"
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowConfirmationModal(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmerService}>
                <Text style={styles.modalConfirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL ACOMPTE */}
      <Modal visible={showAcompteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Acompte de confirmation</Text>
            <Text style={styles.modalDescription}>Un acompte de 20% est requis pour confirmer le service.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAcompteModal(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={payerAcompte} disabled={loading}>
                <Text style={styles.modalConfirmText}>{loading ? 'Paiement...' : "Payer l'acompte"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { backgroundColor: '#ffffff', padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backButton: { color: Colors.light.primary, fontSize: 16, fontWeight: '500' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#11181C', marginTop: 5 },
  headerSubtitle: { fontSize: 14, color: '#687076', marginTop: 5 },
  messagesList: { flex: 1, paddingHorizontal: 15, paddingVertical: 10 },
  messageContainer: { padding: 12, marginVertical: 5, borderRadius: 18, maxWidth: '80%' },
  messageClient: { alignSelf: 'flex-end', backgroundColor: Colors.light.primary },
  messageAidant: { alignSelf: 'flex-start', backgroundColor: '#f0f2f5' },
  messageTexte: { fontSize: 16, color: '#11181C', lineHeight: 22 },
  messageTexteClient: { color: '#ffffff' },
  messageHeure: { fontSize: 12, color: '#687076', marginTop: 5, textAlign: 'right' },
  messageHeureClient: { color: 'rgba(255, 255, 255, 0.7)' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f0f0f0', alignItems: 'center' },
  messageInput: { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, fontSize: 16, backgroundColor: '#f8f9fa' },
  sendButton: { backgroundColor: Colors.light.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendButtonText: { color: '#ffffff', fontSize: 18 },
  confirmerButton: { backgroundColor: Colors.light.success, margin: 15, padding: 15, borderRadius: 8, alignItems: 'center' },
  confirmerButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  centeredContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  etapeTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.light.primary, textAlign: 'center', marginBottom: 15 },
  etapeDescription: { fontSize: 16, color: '#687076', textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  verificationButton: { backgroundColor: Colors.light.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 8 },
  terminerButton: { backgroundColor: Colors.light.success, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 8 },
  evaluerButton: { backgroundColor: Colors.light.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 8 },
  confirmerAvisButton: { backgroundColor: Colors.light.danger, padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  loadingText: { fontSize: 16, color: Colors.light.primary, marginTop: 20 },
  etoilesContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 20 },
  etoileButton: { padding: 5 },
  etoile: { fontSize: 40 },
  etoilePleine: { color: Colors.light.primary },
  etoileVide: { color: '#e0e0e0' },
  avisContainer: { flex: 1, padding: 20 },
  avisInput: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 15, marginVertical: 20, textAlignVertical: 'top', fontSize: 16, backgroundColor: '#f8f9fa', minHeight: 120 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#11181C', textAlign: 'center', marginBottom: 15 },
  modalDescription: { fontSize: 16, color: '#687076', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  adresseInput: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 15, marginBottom: 20, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalCancelButton: { flex: 1, padding: 15, marginRight: 10, backgroundColor: '#f0f2f5', borderRadius: 8, alignItems: 'center' },
  modalConfirmButton: { flex: 1, padding: 15, marginLeft: 10, backgroundColor: Colors.light.success, borderRadius: 8, alignItems: 'center' },
  modalCancelText: { color: '#687076', fontSize: 16, fontWeight: '500' },
  modalConfirmText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});
