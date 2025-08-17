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

// 🆕 IMPORT DU SYSTÈME DE TARIFICATION
import { PricingService, PricingResult } from '../src/utils/pricing';

// ---- ÉTAPES (logique locale d'UI)
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

  // 🆕 ÉTAT POUR LA TARIFICATION
  const [pricingData, setPricingData] = useState<PricingResult | null>(null);

  const { user } = useAuth();
  const flatListRef = useRef<FlatList<Message>>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profileId, profileName, secteur, jour, heureDebut, heureFin } = params;
  const conversationId = user && profileId ? chatService.getConversationId(user.uid, profileId as string) : null;

  // 🆕 CALCUL DE LA TARIFICATION AU CHARGEMENT
  useEffect(() => {
    if (heureDebut && heureFin) {
      try {
        const pricing = PricingService.calculatePriceFromTimeRange(
          heureDebut as string,
          heureFin as string
        );
        setPricingData(pricing);
        console.log('💰 Tarification calculée:', {
          heures: pricing.hours,
          prixFinal: pricing.finalPrice,
          reduction: pricing.discount,
          acompte: pricing.finalPrice * 0.20
        });
      } catch (error) {
        console.error('❌ Erreur calcul tarification:', error);
        Alert.alert('Erreur', 'Impossible de calculer le prix du service');
      }
    }
  }, [heureDebut, heureFin]);

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

  // 🆕 CALCUL DE L'ACOMPTE RÉEL (20%)
  const getAcompteAmount = () => {
    return pricingData ? pricingData.finalPrice * 0.20 : 0;
  };

  // 🆕 CALCUL DU MONTANT RESTANT
  const getMontantRestant = () => {
    return pricingData ? pricingData.finalPrice - getAcompteAmount() : 0;
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
    if (!conversationId || !pricingData) return;
    setLoading(true);
    setShowAcompteModal(false);
    try {
      await chatService.updateConversationStatus(conversationId, 'service_confirme');
      setEtapeActuelle(ETAPES.ATTENTE_VERIFICATION);
      
      // 🆕 MESSAGE DE CONFIRMATION AVEC MONTANTS RÉELS
      Alert.alert(
        '✅ Service confirmé !', 
        `Acompte versé : ${PricingService.formatPrice(getAcompteAmount())}\nReste à payer sur place : ${PricingService.formatPrice(getMontantRestant())}`
      );
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
    // 🆕 PASSER LES VRAIES DONNÉES DE TARIFICATION
    const pricing = pricingData || PricingService.calculatePrice(1);
    
    router.push({
      pathname: '/paiement',
      params: {
        aidantName: (profileName as string) || '',
        secteur: (secteur as string) || '',
        dureeService: pricing.hours.toString(),
        tarifTotal: pricing.finalPrice.toString(),
        tarifHoraire: pricing.hourlyRate.toString(),
        reduction: pricing.discount.toString(),
        acompteVerse: getAcompteAmount().toString(),
        avisClient: avisTexte || "Service d'accompagnement satisfaisant.",
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

  // 🆕 COMPOSANT TARIFICATION DANS LA CONVERSATION
  const renderTarificationInfo = () => {
    if (!pricingData) return null;

    return (
      <View style={styles.tarificationContainer}>
        <Text style={styles.tarificationTitle}>💰 Tarification</Text>
        <View style={styles.tarificationDetails}>
          <View style={styles.tarificationRow}>
            <Text style={styles.tarificationLabel}>Durée :</Text>
            <Text style={styles.tarificationValue}>{pricingData.hours}h</Text>
          </View>
          
          {pricingData.discount > 0 && (
            <>
              <View style={styles.tarificationRow}>
                <Text style={styles.tarificationLabel}>Prix normal :</Text>
                <Text style={[styles.tarificationValue, styles.prixBarre]}>
                  {PricingService.formatPrice(pricingData.basePrice)}
                </Text>
              </View>
              <View style={styles.tarificationRow}>
                <Text style={styles.reductionLabel}>Réduction :</Text>
                <Text style={styles.reductionValue}>
                  -{PricingService.formatPrice(pricingData.discount)}
                </Text>
              </View>
            </>
          )}
          
          <View style={[styles.tarificationRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total :</Text>
            <Text style={styles.totalValue}>
              {PricingService.formatPrice(pricingData.finalPrice)}
            </Text>
          </View>
          
          {pricingData.discount > 0 && (
            <Text style={styles.economieText}>
              🎉 Vous économisez {PricingService.formatPrice(pricingData.discount)} !
            </Text>
          )}
        </View>
      </View>
    );
  };

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
            
            {/* 🆕 AFFICHAGE DE LA TARIFICATION */}
            {renderTarificationInfo()}
            
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
              L&apos;acompte de {PricingService.formatPrice(getAcompteAmount())} a été versé. Préparez-vous pour le jour J !
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
            <Text style={styles.etapeDescription}>
              Montant restant à régler : {PricingService.formatPrice(getMontantRestant())}
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
        {/* 🆕 AFFICHAGE RAPIDE DU PRIX DANS L'EN-TÊTE */}
        {pricingData && (
          <Text style={styles.headerPrice}>
            Prix : {PricingService.formatPrice(pricingData.finalPrice)}
            {pricingData.discount > 0 && ` (économie : ${PricingService.formatPrice(pricingData.discount)})`}
          </Text>
        )}
      </View>

      {renderContenuPrincipal()}

      {/* MODAL ADRESSE AVEC TARIFICATION */}
      <Modal visible={showConfirmationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📍 Confirmer le service</Text>
            
            {/* 🆕 RÉCAPITULATIF TARIFICATION DANS LE MODAL */}
            {pricingData && (
              <View style={styles.modalPricingSection}>
                <Text style={styles.modalPricingTitle}>💰 Récapitulatif</Text>
                <View style={styles.modalPricingRow}>
                  <Text style={styles.modalPricingLabel}>Service :</Text>
                  <Text style={styles.modalPricingValue}>{pricingData.hours}h</Text>
                </View>
                {pricingData.discount > 0 && (
                  <>
                    <View style={styles.modalPricingRow}>
                      <Text style={styles.modalPricingLabel}>Prix normal :</Text>
                      <Text style={[styles.modalPricingValue, styles.prixBarre]}>
                        {PricingService.formatPrice(pricingData.basePrice)}
                      </Text>
                    </View>
                    <View style={styles.modalPricingRow}>
                      <Text style={styles.reductionLabel}>Réduction :</Text>
                      <Text style={styles.reductionValue}>
                        -{PricingService.formatPrice(pricingData.discount)}
                      </Text>
                    </View>
                  </>
                )}
                <View style={[styles.modalPricingRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total :</Text>
                  <Text style={styles.totalValue}>
                    {PricingService.formatPrice(pricingData.finalPrice)}
                  </Text>
                </View>
              </View>
            )}
            
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

      {/* MODAL ACOMPTE AVEC MONTANTS RÉELS */}
      <Modal visible={showAcompteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Acompte de confirmation</Text>
            
            {/* 🆕 DÉTAILS DE L'ACOMPTE */}
            {pricingData && (
              <View style={styles.acompteDetails}>
                <View style={styles.acompteRow}>
                  <Text style={styles.acompteLabel}>Montant total :</Text>
                  <Text style={styles.acompteValue}>
                    {PricingService.formatPrice(pricingData.finalPrice)}
                  </Text>
                </View>
                <View style={styles.acompteRow}>
                  <Text style={styles.acompteLabel}>Acompte (20%) :</Text>
                  <Text style={styles.acompteAmount}>
                    {PricingService.formatPrice(getAcompteAmount())}
                  </Text>
                </View>
                <View style={styles.acompteRow}>
                  <Text style={styles.acompteLabel}>Reste à payer :</Text>
                  <Text style={styles.acompteValue}>
                    {PricingService.formatPrice(getMontantRestant())}
                  </Text>
                </View>
              </View>
            )}
            
            <Text style={styles.modalDescription}>
              L&apos;acompte confirme votre réservation et sera déduit du montant total.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAcompteModal(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={payerAcompte} disabled={loading}>
                <Text style={styles.modalConfirmText}>
                  {loading ? 'Paiement...' : `Payer ${PricingService.formatPrice(getAcompteAmount())}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 🎨 UTILISATION DE VOTRE STRUCTURE EXISTANTE
  container: { 
    flex: 1, 
    backgroundColor: Colors.light.background 
  },
  
  header: { 
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    padding: 20, 
    paddingTop: 10
  },
  
  backButton: { 
    color: Colors.light.primary, 
    fontSize: 16,
    fontWeight: '500' 
  },
  
  headerTitle: { 
    fontSize: 20,
    fontWeight: 'bold',
    color: '#11181C', 
    marginTop: 5 
  },
  
  headerSubtitle: { 
    fontSize: 14,
    color: '#687076', 
    marginTop: 5 
  },
  
  headerPrice: { 
    fontSize: 12, 
    color: Colors.light.primary, 
    fontWeight: '600', 
    marginTop: 3 
  },
  
  // 💬 MESSAGES
  messagesList: { 
    flex: 1, 
    paddingHorizontal: 15, 
    paddingVertical: 10 
  },
  
  messageContainer: { 
    padding: 12, 
    marginVertical: 5, 
    borderRadius: 18, 
    maxWidth: '80%' 
  },
  
  messageClient: { 
    alignSelf: 'flex-end', 
    backgroundColor: Colors.light.primary 
  },
  
  messageAidant: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#f0f2f5' 
  },
  
  messageTexte: { 
    fontSize: 16,
    lineHeight: 22,
    color: '#11181C' 
  },
  
  messageTexteClient: { 
    color: '#ffffff' 
  },
  
  messageHeure: { 
    fontSize: 12,
    color: '#687076', 
    marginTop: 5, 
    textAlign: 'right' 
  },
  
  messageHeureClient: { 
    color: 'rgba(255, 255, 255, 0.7)' 
  },
  
  // 💰 TARIFICATION AVEC VOTRE STRUCTURE
  tarificationContainer: { 
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
    margin: 15
  },
  
  tarificationTitle: { 
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529', 
    marginBottom: 10 
  },
  
  tarificationDetails: {},
  
  tarificationRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 5 
  },
  
  tarificationLabel: { 
    fontSize: 14, 
    color: '#495057' 
  },
  
  tarificationValue: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#212529' 
  },
  
  prixBarre: { 
    textDecorationLine: 'line-through', 
    color: '#6c757d' 
  },
  
  reductionLabel: { 
    fontSize: 14, 
    color: '#28a745', 
    fontWeight: '500' 
  },
  
  reductionValue: { 
    fontSize: 14, 
    color: '#28a745', 
    fontWeight: 'bold' 
  },
  
  totalRow: { 
    marginTop: 8, 
    paddingTop: 8, 
    borderTopWidth: 1, 
    borderTopColor: '#dee2e6' 
  },
  
  totalLabel: { 
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529' 
  },
  
  totalValue: { 
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary 
  },
  
  economieText: { 
    textAlign: 'center', 
    marginTop: 8, 
    fontSize: 12, 
    color: '#28a745', 
    fontWeight: '500' 
  },
  
  // 📝 INPUT & BOUTONS
  inputContainer: { 
    flexDirection: 'row', 
    padding: 10, 
    backgroundColor: '#ffffff', 
    borderTopWidth: 1, 
    borderTopColor: '#f0f0f0', 
    alignItems: 'center' 
  },
  
  messageInput: { 
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderColor: '#e0e0e0',
    marginRight: 10,
    backgroundColor: '#f8f9fa',
    fontSize: 16
  },
  
  sendButton: { 
    backgroundColor: Colors.light.primary, 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  sendButtonText: { 
    color: '#ffffff', 
    fontSize: 18 
  },
  
  confirmerButton: { 
    backgroundColor: Colors.light.success,
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 24,
    margin: 15, 
    alignItems: 'center' 
  },
  
  confirmerButtonText: { 
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  
  // 🎯 ÉTAPES
  centeredContent: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  
  etapeTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: Colors.light.primary, 
    textAlign: 'center', 
    marginBottom: 15 
  },
  
  etapeDescription: { 
    fontSize: 16,
    lineHeight: 24,
    color: '#687076', 
    textAlign: 'center', 
    marginBottom: 30 
  },
  
  verificationButton: { 
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 30 
  },
  
  terminerButton: { 
    backgroundColor: Colors.light.success, 
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 30 
  },
  
  evaluerButton: { 
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 30 
  },
  
  confirmerAvisButton: { 
    backgroundColor: Colors.light.danger, 
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center' 
  },
  
  buttonText: { 
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  
  loadingText: { 
    fontSize: 16,
    color: Colors.light.primary, 
    marginTop: 20 
  },
  
  // ⭐ ÉTOILES
  etoilesContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginVertical: 20 
  },
  
  etoileButton: { 
    padding: 5 
  },
  
  etoile: { 
    fontSize: 40 
  },
  
  etoilePleine: { 
    color: Colors.light.primary 
  },
  
  etoileVide: { 
    color: '#e0e0e0' 
  },
  
  // 📝 AVIS
  avisContainer: { 
    flex: 1, 
    padding: 20 
  },
  
  avisInput: { 
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderColor: '#e0e0e0',
    marginVertical: 20,
    textAlignVertical: 'top',
    backgroundColor: '#f8f9fa',
    fontSize: 16,
    minHeight: 120
  },
  
  // 📱 MODALS
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  modalContent: { 
    backgroundColor: '#ffffff', 
    borderRadius: 12, 
    padding: 20, 
    width: '90%', 
    maxWidth: 400, 
    maxHeight: '80%' 
  },
  
  modalTitle: { 
    fontSize: 20,
    fontWeight: 'bold',
    color: '#11181C', 
    textAlign: 'center', 
    marginBottom: 15 
  },
  
  modalDescription: { 
    fontSize: 16,
    lineHeight: 22,
    color: '#687076', 
    textAlign: 'center', 
    marginBottom: 20 
  },
  
  // 💰 TARIFICATION DANS MODALS
  modalPricingSection: { 
    backgroundColor: '#f8f9fa', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 15 
  },
  
  modalPricingTitle: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#212529', 
    marginBottom: 8 
  },
  
  modalPricingRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  
  modalPricingLabel: { 
    fontSize: 13, 
    color: '#495057' 
  },
  
  modalPricingValue: { 
    fontSize: 13, 
    fontWeight: '500', 
    color: '#212529' 
  },
  
  // 💳 ACOMPTE
  acompteDetails: { 
    backgroundColor: '#fff3cd', 
    padding: 15, 
    borderRadius: 8, 
    marginBottom: 15
  },
  
  acompteRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  
  acompteLabel: { 
    fontSize: 14, 
    color: '#856404' 
  },
  
  acompteValue: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#856404' 
  },
  
  acompteAmount: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: Colors.light.primary 
  },
  
  // 📍 ADRESSE
  adresseInput: { 
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderColor: '#e0e0e0',
    marginBottom: 20,
    fontSize: 16
  },
  
  // 🔘 BOUTONS MODAL
  modalButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  
  modalCancelButton: { 
    flex: 1, 
    borderRadius: 8,
    paddingVertical: 15,
    marginRight: 10, 
    backgroundColor: '#f0f2f5', 
    alignItems: 'center'
  },
  
  modalConfirmButton: { 
    flex: 1, 
    borderRadius: 8,
    paddingVertical: 15,
    marginLeft: 10, 
    backgroundColor: Colors.light.success, 
    alignItems: 'center' 
  },
  
  modalCancelText: { 
    color: '#687076', 
    fontSize: 16, 
    fontWeight: '500' 
  },
  
  modalConfirmText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});