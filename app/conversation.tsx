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
  ScrollView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// 🎯 TYPES TYPESCRIPT
interface Message {
  id: string;
  texte: string;
  expediteur: 'client' | 'aidant';
  timestamp: string;
}

type EtapeType = 'conversation' | 'confirmation_service' | 'acompte' | 'attente_verification' | 'verification_localisation' | 'service_en_cours' | 'service_termine' | 'evaluation' | 'avis_obligatoire';

// 🎯 ÉTAPES SELON CAHIER DES CHARGES
const ETAPES: Record<string, EtapeType> = {
  CONVERSATION: 'conversation',
  CONFIRMATION_SERVICE: 'confirmation_service',
  ACOMPTE: 'acompte',
  ATTENTE_VERIFICATION: 'attente_verification',
  VERIFICATION_LOCALISATION: 'verification_localisation',
  SERVICE_EN_COURS: 'service_en_cours',
  SERVICE_TERMINE: 'service_termine',
  EVALUATION: 'evaluation',
  AVIS_OBLIGATOIRE: 'avis_obligatoire'
};

export default function ConversationScreen() {
  // États de base avec types corrects
  const [etapeActuelle, setEtapeActuelle] = useState<EtapeType>(ETAPES.CONVERSATION);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nouveauMessage, setNouveauMessage] = useState<string>('');
  const [adresseService, setAdresseService] = useState<string>('');
  const [evaluation, setEvaluation] = useState<number>(0);
  const [avisTexte, setAvisTexte] = useState<string>('');
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [showAcompteModal, setShowAcompteModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const flatListRef = useRef<FlatList<Message>>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Récupération des paramètres de la recherche
  const { 
    profileName = "Aidant",
    secteur, 
    jour, 
    heureDebut, 
    heureFin
  } = params;

  // 🎯 MESSAGES INITIAUX selon cahier des charges
  useEffect(() => {
    const messagesInitiaux: Message[] = [
      {
        id: '1',
        texte: `Bonjour ! Je suis intéressé(e) par vos services de ${secteur} le ${jour} de ${heureDebut} à ${heureFin}.`,
        expediteur: 'client',
        timestamp: new Date().toLocaleTimeString()
      },
      {
        id: '2',
        texte: `Bonjour ! Je suis disponible pour ce créneau. Pouvez-vous me donner plus de détails sur vos besoins ?`,
        expediteur: 'aidant',
        timestamp: new Date().toLocaleTimeString()
      }
    ];
    setMessages(messagesInitiaux);
  }, [secteur, jour, heureDebut, heureFin]);

  // 🎯 FONCTION ENVOI MESSAGE
  const envoyerMessage = (): void => {
    if (nouveauMessage.trim() === '') return;
    
    const message: Message = {
      id: Date.now().toString(),
      texte: nouveauMessage,
      expediteur: 'client', // En vrai, ça dépendrait du type d'utilisateur connecté
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages([...messages, message]);
    setNouveauMessage('');
    
    // Auto-scroll vers le bas
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    // 🤖 SIMULATION RÉPONSE AIDANT (pour démonstration)
    setTimeout(() => {
      const reponseAidant: Message = {
        id: (Date.now() + 1).toString(),
        texte: genererReponseAidant(nouveauMessage),
        expediteur: 'aidant',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, reponseAidant]);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1500);
  };

  // 🤖 GÉNÉRATION RÉPONSES AIDANT (simulation)
  const genererReponseAidant = (messageClient: string): string => {
    const reponses: string[] = [
      "Parfait ! Je peux m'adapter à vos besoins.",
      "D'accord, je note vos préférences.",
      "Très bien, nous sommes sur la même longueur d'onde.",
      "Excellent ! Quand souhaitez-vous confirmer le service ?",
      "Parfait ! Je serai là à l'heure convenue."
    ];
    return reponses[Math.floor(Math.random() * reponses.length)];
  };

  // 🎯 ÉTAPE 1: CONFIRMER LE SERVICE (selon cahier des charges)
  const confirmerService = (): void => {
    if (adresseService.trim() === '') {
      Alert.alert('Erreur', 'Veuillez saisir l\'adresse où le service doit être réalisé.');
      return;
    }
    setShowConfirmationModal(false);
    setShowAcompteModal(true);
  };

  // 🎯 ÉTAPE 2: PAYER ACOMPTE 20% (selon cahier des charges)
  const payerAcompte = (): void => {
    setLoading(true);
    setShowAcompteModal(false);
    
    // Simulation paiement
    setTimeout(() => {
      setLoading(false);
      setEtapeActuelle(ETAPES.ATTENTE_VERIFICATION);
      
      // Notification de confirmation (selon cahier des charges)
      Alert.alert(
        '✅ Service confirmé !', 
        'L\'acompte de 20% a été versé. Une notification a été envoyée à l\'aidant pour confirmer la réalisation du service.',
        [{ text: 'OK' }]
      );
    }, 2000);
  };

  // 🎯 ÉTAPE 3: VÉRIFICATIONS (selon cahier des charges)
  const lancerVerifications = (): void => {
    setEtapeActuelle(ETAPES.VERIFICATION_LOCALISATION);
    setLoading(true);
    
    // Simulation vérifications géolocalisation + proximité téléphones
    setTimeout(() => {
      const verificationsOK = Math.random() > 0.2; // 80% de chance de succès
      
      if (verificationsOK) {
        Alert.alert(
          '✅ Vérifications réussies !',
          '• L\'aidant se trouve bien à l\'adresse indiquée\n• Les téléphones sont côte à côte\n\nLe service peut commencer !',
          [{ 
            text: 'Commencer le service', 
            onPress: () => setEtapeActuelle(ETAPES.SERVICE_EN_COURS) 
          }]
        );
      } else {
        Alert.alert(
          '❌ Vérifications échouées',
          'Un problème a été détecté lors des vérifications. Veuillez réessayer.',
          [{ 
            text: 'Réessayer', 
            onPress: () => setEtapeActuelle(ETAPES.ATTENTE_VERIFICATION) 
          }]
        );
      }
      setLoading(false);
    }, 3000);
  };

  // 🎯 ÉTAPE 4: TERMINER LE SERVICE (selon cahier des charges)
  const terminerService = (): void => {
    Alert.alert(
      'Terminer le service',
      'Êtes-vous sûr(e) que le service est terminé ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer', 
          onPress: () => setEtapeActuelle(ETAPES.EVALUATION) 
        }
      ]
    );
  };

  // 🎯 ÉTAPE 5: ÉVALUATION (selon cahier des charges)
  const confirmerEvaluation = (): void => {
  if (evaluation === 0) {
    Alert.alert('Erreur', 'Veuillez donner une note entre 1 et 5 étoiles.');
    return;
  }
  
  if (evaluation < 3) {
    // Avis obligatoire si < 3 étoiles (selon cahier des charges)
    setEtapeActuelle(ETAPES.AVIS_OBLIGATOIRE);
  } else {
    // ✅ NAVIGATION VERS PAGE PAIEMENT FINAL !
    router.push({
      pathname: '/paiement',
      params: {
        aidantName: profileName,
        secteur: secteur,
        dureeService: "2", // Calculez la durée réelle
        tarifHoraire: "15", // Récupérez le tarif réel
        avisClient: avisTexte || "Service satisfaisant",
        noteService: evaluation.toString()
      }
    });
  }
};

  // 🎯 ÉTAPE 6: AVIS OBLIGATOIRE (selon cahier des charges)
  const confirmerAvis = (): void => {
  if (avisTexte.trim() === '') {
    Alert.alert('Erreur', 'Un avis détaillé est obligatoire pour une note inférieure à 3 étoiles.');
    return;
  }
  
  // ✅ NAVIGATION VERS PAIEMENT MÊME POUR LES NOTES < 3
  router.push({
    pathname: '/paiement',
    params: {
      aidantName: profileName,
      secteur: secteur,
      dureeService: "2",
      tarifHoraire: "15", 
      avisClient: avisTexte,
      noteService: evaluation.toString()
    }
  });
};

  // 🎨 RENDU MESSAGE
  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.expediteur === 'client' ? styles.messageClient : styles.messageAidant
    ]}>
      <Text style={styles.messageTexte}>{item.texte}</Text>
      <Text style={styles.messageHeure}>{item.timestamp}</Text>
    </View>
  );

  // 🎨 RENDU ÉTOILES
  const renderEtoiles = () => {
    return (
      <View style={styles.etoilesContainer}>
        {[1, 2, 3, 4, 5].map((etoile) => (
          <TouchableOpacity
            key={etoile}
            onPress={() => setEvaluation(etoile)}
            style={styles.etoileButton}
          >
            <Text style={[
              styles.etoile,
              etoile <= evaluation ? styles.etoilePleine : styles.etoileVide
            ]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // 🎨 RENDU SELON ÉTAPE
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
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.messageInput}
                value={nouveauMessage}
                onChangeText={setNouveauMessage}
                placeholder="Tapez votre message..."
                multiline
              />
              <TouchableOpacity onPress={envoyerMessage} style={styles.sendButton}>
                <Text style={styles.sendButtonText}>📤</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.confirmerButton}
              onPress={() => setShowConfirmationModal(true)}
            >
              <Text style={styles.confirmerButtonText}>✅ Confirmer le service</Text>
            </TouchableOpacity>
          </>
        );

      case ETAPES.ATTENTE_VERIFICATION:
        return (
          <View style={styles.centeredContent}>
            <Text style={styles.etapeTitle}>🔄 Service confirmé !</Text>
            <Text style={styles.etapeDescription}>
              L&apos;acompte de 20% a été versé. L&apos;aidant a été notifié.
              {'\n\n'}Avant le début du service, des vérifications doivent être effectuées.
            </Text>
            
            <TouchableOpacity 
              style={styles.verificationButton}
              onPress={lancerVerifications}
            >
              <Text style={styles.buttonText}>🔍 Lancer les vérifications</Text>
            </TouchableOpacity>
          </View>
        );

      case ETAPES.VERIFICATION_LOCALISATION:
        return (
          <View style={styles.centeredContent}>
            <Text style={styles.etapeTitle}>🔍 Vérifications en cours...</Text>
            <Text style={styles.etapeDescription}>
              • Vérification que l&apos;aidant se trouve à l&apos;adresse indiquée
              {'\n'}• Vérification de la proximité des téléphones
            </Text>
            {loading && <Text style={styles.loadingText}>⏳ Patientez...</Text>}
          </View>
        );

      case ETAPES.SERVICE_EN_COURS:
        return (
          <View style={styles.centeredContent}>
            <Text style={styles.etapeTitle}>🔄 Service en cours</Text>
            <Text style={styles.etapeDescription}>
              Le service de {secteur} est actuellement en cours.
              {'\n\n'}Adresse: {adresseService}
              {'\n'}Horaire: {heureDebut} - {heureFin}
            </Text>
            
            <TouchableOpacity 
              style={styles.terminerButton}
              onPress={terminerService}
            >
              <Text style={styles.buttonText}>✅ Service terminé</Text>
            </TouchableOpacity>
          </View>
        );

      case ETAPES.EVALUATION:
        return (
          <View style={styles.centeredContent}>
            <Text style={styles.etapeTitle}>⭐ Évaluez le service</Text>
            <Text style={styles.etapeDescription}>
              Comment évalueriez-vous ce service ?
            </Text>
            
            {renderEtoiles()}
            
            <TouchableOpacity 
              style={styles.evaluerButton}
              onPress={confirmerEvaluation}
            >
              <Text style={styles.buttonText}>Confirmer l&apos;évaluation</Text>
            </TouchableOpacity>
          </View>
        );

      case ETAPES.AVIS_OBLIGATOIRE:
        return (
          <ScrollView style={styles.avisContainer}>
            <Text style={styles.etapeTitle}>📝 Avis détaillé requis</Text>
            <Text style={styles.etapeDescription}>
              Votre note est inférieure à 3 étoiles. Un avis détaillé est obligatoire.
            </Text>
            
            {renderEtoiles()}
            
            <TextInput
              style={styles.avisInput}
              value={avisTexte}
              onChangeText={setAvisTexte}
              placeholder="Décrivez en détail les points d&apos;amélioration..."
              multiline
              numberOfLines={6}
            />
            
            <TouchableOpacity 
              style={styles.confirmerAvisButton}
              onPress={confirmerAvis}
            >
              <Text style={styles.buttonText}>Envoyer l&apos;avis</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💬 {profileName}</Text>
        <Text style={styles.headerSubtitle}>{secteur} • {jour}</Text>
      </View>

      {renderContenuPrincipal()}

      {/* 🎯 MODAL CONFIRMATION SERVICE */}
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
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowConfirmationModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={confirmerService}
              >
                <Text style={styles.modalConfirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🎯 MODAL ACOMPTE 20% */}
      <Modal visible={showAcompteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Acompte de confirmation</Text>
            <Text style={styles.modalDescription}>
              Pour confirmer le service, un acompte de 20% est requis.
              {'\n\n'}Service: {secteur}
              {'\n'}Date: {jour}
              {'\n'}Horaire: {heureDebut} - {heureFin}
              {'\n'}Adresse: {adresseService}
              {'\n\n'}Montant de l&apos;acompte: 20% du tarif total
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowAcompteModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={payerAcompte}
                disabled={loading}
              >
                <Text style={styles.modalConfirmText}>
                  {loading ? '⏳ Paiement...' : '💳 Payer l\'acompte'}
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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    color: '#ecf0f1',
    fontSize: 16,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 5,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  messageContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    marginVertical: 5,
    borderRadius: 12,
    maxWidth: '80%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageClient: {
    alignSelf: 'flex-end',
    backgroundColor: '#3498db',
  },
  messageAidant: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
  },
  messageTexte: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 22,
  },
  messageHeure: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#3498db',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 18,
  },
  confirmerButton: {
    backgroundColor: '#27ae60',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  etapeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 15,
  },
  etapeDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  verificationButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  terminerButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  evaluerButton: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#3498db',
    marginTop: 20,
  },
  etoilesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  etoileButton: {
    padding: 5,
  },
  etoile: {
    fontSize: 40,
  },
  etoilePleine: {
    color: '#f39c12',
  },
  etoileVide: {
    color: '#bdc3c7',
  },
  avisContainer: {
    flex: 1,
    padding: 20,
  },
  avisInput: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 15,
    marginVertical: 20,
    textAlignVertical: 'top',
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  confirmerAvisButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  adresseInput: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    padding: 15,
    marginRight: 10,
    backgroundColor: '#95a5a6',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 15,
    marginLeft: 10,
    backgroundColor: '#27ae60',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});