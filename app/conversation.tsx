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

  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { chatService, Message } from '../src/services/firebase/chatService';
import { Colors } from '@/constants/Colors';

// --- TYPES ET CONSTANTES ---
type EtapeType = 'conversation' | 'attente_verification' | 'service_en_cours' | 'evaluation' | 'avis_obligatoire';

const ETAPES: Record<string, EtapeType> = {
  CONVERSATION: 'conversation',
  ATTENTE_VERIFICATION: 'attente_verification',
  SERVICE_EN_COURS: 'service_en_cours',
  EVALUATION: 'evaluation',
  AVIS_OBLIGATOIRE: 'avis_obligatoire' // L'étape pour l'avis obligatoire
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
    return () => unsubscribe();
  }, [conversationId]);

  const envoyerMessage = async () => { /* ... (Logique inchangée) ... */ };
  const retournerEnArriere = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/services'); };
  const confirmerService = () => { if (adresseService.trim() === '') { Alert.alert('Erreur', 'Veuillez saisir l\'adresse.'); return; } setShowConfirmationModal(false); setShowAcompteModal(true); };
  
  const payerAcompte = async () => {
    if (!conversationId) return;
    setLoading(true); setShowAcompteModal(false);
    try {
      await chatService.updateConversationStatus(conversationId, 'a_venir');
      setEtapeActuelle(ETAPES.ATTENTE_VERIFICATION);
      Alert.alert('✅ Service confirmé !', 'L\'acompte a été versé.');
    } catch (error) { 
      console.error('Erreur lors de la confirmation du service:', error);
      Alert.alert('Erreur', 'Impossible de confirmer le service.');
    } finally { setLoading(false); }
  };

  const lancerVerifications = () => { /* ... (Logique de simulation inchangée) ... */ };

  const terminerService = async () => {
    if (!conversationId) return;
    try {
      await chatService.updateConversationStatus(conversationId, 'termine');
      setEtapeActuelle(ETAPES.EVALUATION);
    } catch (error) {
      console.error('Erreur lors de la terminaison du service:', error);
       Alert.alert('Erreur', 'Impossible de terminer le service.'); }
  };

  // ✅ VÉRIFICATION DU CAHIER DES CHARGES : GESTION DES ÉVALUATIONS
  const confirmerEvaluation = () => {
    if (evaluation === 0) {
      Alert.alert('Erreur', 'Veuillez donner une note de 1 à 5 étoiles.');
      return;
    }
    // Si la note est en dessous de 3, on passe à l'étape de l'avis obligatoire
    if (evaluation < 3) {
      setEtapeActuelle(ETAPES.AVIS_OBLIGATOIRE);
    } else {
      // Sinon, on va directement au paiement
      naviguerVersPaiement();
    }
  };

  // ✅ VÉRIFICATION DU CAHIER DES CHARGES : GESTION DE L'AVIS OBLIGATOIRE
  const confirmerAvis = () => {
    if (avisTexte.trim() === '') {
      Alert.alert('Erreur', 'Un avis détaillé est obligatoire pour une note inférieure à 3 étoiles.');
      return;
    }
    naviguerVersPaiement();
  };
  
  const naviguerVersPaiement = () => {
    router.push({
      pathname: '/paiement',
      params: {
        aidantName: profileName as string, secteur: secteur as string, dureeService: "2",
        tarifHoraire: "25", // À récupérer du profil à l'avenir
        avisClient: avisTexte || "Service d'accompagnement senior satisfaisant.",
        noteService: evaluation.toString()
      }
    });
  };

  // --- FONCTIONS DE RENDU ---

  const renderMessage = ({ item }: { item: Message }) => ( <View style={[styles.messageContainer, item.expediteurId === user?.uid ? styles.messageClient : styles.messageAidant]}><Text style={[styles.messageTexte, item.expediteurId === user?.uid && styles.messageTexteClient]}>{item.texte}</Text><Text style={[styles.messageHeure, item.expediteurId === user?.uid && styles.messageHeureClient]}>{item.timestamp}</Text></View> );
  
  const renderEtoiles = () => (
    <View style={styles.etoilesContainer}>
      {[1, 2, 3, 4, 5].map(etoile => (
        <TouchableOpacity key={etoile} onPress={() => setEvaluation(etoile)} style={styles.etoileButton}>
          <Text style={[styles.etoile, etoile <= evaluation ? styles.etoilePleine : styles.etoileVide]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContenuPrincipal = () => {
    switch (etapeActuelle) {
      case ETAPES.CONVERSATION:
        return (<><FlatList ref={flatListRef} data={messages} renderItem={renderMessage} keyExtractor={item => item.id} style={styles.messagesList} onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })} /><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.inputContainer}><TextInput style={styles.messageInput} value={nouveauMessage} onChangeText={setNouveauMessage} placeholder="Tapez votre message..." multiline /><TouchableOpacity onPress={envoyerMessage} style={styles.sendButton}><Text style={styles.sendButtonText}>📤</Text></TouchableOpacity></View><TouchableOpacity style={styles.confirmerButton} onPress={() => setShowConfirmationModal(true)}><Text style={styles.confirmerButtonText}>✅ Confirmer le service</Text></TouchableOpacity></KeyboardAvoidingView></>);
      case ETAPES.ATTENTE_VERIFICATION:
        return <View style={styles.centeredContent}><Text style={styles.etapeTitle}>🔄 Service confirmé !</Text><Text style={styles.etapeDescription}>L&apos;acompte a été versé. Préparez-vous pour le jour J !</Text><TouchableOpacity style={styles.verificationButton} onPress={lancerVerifications}><Text style={styles.buttonText}>🔍 Lancer les vérifications</Text></TouchableOpacity></View>;
      case ETAPES.SERVICE_EN_COURS:
        return <View style={styles.centeredContent}><Text style={styles.etapeTitle}>🤝 Service en cours</Text><Text style={styles.etapeDescription}>Le service est en cours à l&apos;adresse : {adresseService}</Text><TouchableOpacity style={styles.terminerButton} onPress={terminerService}><Text style={styles.buttonText}>✅ Service terminé</Text></TouchableOpacity></View>;
      // ✅ Écran pour noter de 1 à 5 étoiles
      case ETAPES.EVALUATION:
        return <View style={styles.centeredContent}><Text style={styles.etapeTitle}>⭐ Évaluez le service</Text>{renderEtoiles()}<TouchableOpacity style={styles.evaluerButton} onPress={confirmerEvaluation}><Text style={styles.buttonText}>Confirmer</Text></TouchableOpacity></View>;
      // ✅ Écran pour l'avis obligatoire si la note est basse
      case ETAPES.AVIS_OBLIGATOIRE:
        return <ScrollView contentContainerStyle={styles.avisContainer}><Text style={styles.etapeTitle}>📝 Avis détaillé requis</Text><Text style={styles.etapeDescription}>Un avis est obligatoire pour une note inférieure à 3 étoiles.</Text>{renderEtoiles()}<TextInput style={styles.avisInput} value={avisTexte} onChangeText={setAvisTexte} placeholder="Décrivez votre expérience..." multiline /><TouchableOpacity style={styles.confirmerAvisButton} onPress={confirmerAvis}><Text style={styles.buttonText}>Envoyer l&apos;avis</Text></TouchableOpacity></ScrollView>;
      default:
        return <View style={styles.centeredContent}><ActivityIndicator size="large" color={Colors.light.primary} /><Text style={styles.loadingText}>Chargement...</Text></View>;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><TouchableOpacity onPress={retournerEnArriere}><Text style={styles.backButton}>← Retour</Text></TouchableOpacity><Text style={styles.headerTitle}>💬 {profileName}</Text><Text style={styles.headerSubtitle}>{secteur} • {jour} ({heureDebut} - {heureFin})</Text></View>
      {renderContenuPrincipal()}
      <Modal visible={showConfirmationModal} transparent animationType="slide"><View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>📍 Confirmer le service</Text><Text style={styles.modalDescription}>Veuillez saisir l&apos;adresse où le service doit être réalisé :</Text><TextInput style={styles.adresseInput} value={adresseService} onChangeText={setAdresseService} placeholder="123 Rue de la Paix, 75001 Paris" multiline /><View style={styles.modalButtons}><TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowConfirmationModal(false)}><Text style={styles.modalCancelText}>Annuler</Text></TouchableOpacity><TouchableOpacity style={styles.modalConfirmButton} onPress={confirmerService}><Text style={styles.modalConfirmText}>Confirmer</Text></TouchableOpacity></View></View></View></Modal>
      <Modal visible={showAcompteModal} transparent animationType="slide"><View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>💳 Acompte de confirmation</Text><Text style={styles.modalDescription}>Un acompte de 20% est requis pour confirmer le service.</Text><View style={styles.modalButtons}><TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAcompteModal(false)}><Text style={styles.modalCancelText}>Annuler</Text></TouchableOpacity><TouchableOpacity style={styles.modalConfirmButton} onPress={payerAcompte} disabled={loading}><Text style={styles.modalConfirmText}>{loading ? 'Paiement...' : 'Payer l\'acompte'}</Text></TouchableOpacity></View></View></View></Modal>
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