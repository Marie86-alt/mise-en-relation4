import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView
  
} from 'react-native';
import { useRouter } from 'expo-router';

// 🎯 TYPES POUR SERVICES SENIORS
interface ServiceSenior {
  id: string;
  profileId: string;
  profileName: string;
  secteur: string;
  jour: string;
  heureDebut: string;
  heureFin: string;
  statut: StatutServiceType;
  dernierMessage: string;
  avatar: string;
  couleur: string;
  typeService: 'recu' | 'propose'; // Double rôle selon demandes client
}

type StatutServiceType = 'conversation' | 'service_confirme' | 'en_cours' | 'termine' | 'evaluation';

interface StatutInfo {
  label: string;
  couleur: string;
  icon: string;
}

// 🎯 STATUTS ORANGE CAROTTE
const STATUTS: Record<StatutServiceType, StatutInfo> = {
  conversation: { label: 'En discussion', couleur: '#FF6B35', icon: '💬' },
  service_confirme: { label: 'Service confirmé', couleur: '#FF6B35', icon: '✅' },
  en_cours: { label: 'En cours', couleur: '#FF6B35', icon: '🔄' },
  termine: { label: 'Terminé', couleur: '#757575', icon: '✅' },
  evaluation: { label: 'À évaluer', couleur: '#FF6B35', icon: '⭐' }
};

// 🎯 DONNÉES MOCK - SERVICES SENIORS (Double rôle)
const servicesSeniors: ServiceSenior[] = [
  // Services reçus (je suis aidé)
  {
    id: '1',
    profileId: 'profile_1',
    profileName: 'Maria Garcia',
    secteur: 'Aide aux repas',
    jour: '15/08',
    heureDebut: '12:00',
    heureFin: '14:00',
    statut: 'conversation',
    dernierMessage: 'Je peux préparer des repas adaptés aux seniors',
    avatar: 'MG',
    couleur: '#FF6B35',
    typeService: 'recu'
  },
  {
    id: '2',  
    profileId: 'profile_2',
    profileName: 'Sophie Martin',
    secteur: 'Accompagnement médical',
    jour: '16/08',
    heureDebut: '09:00', 
    heureFin: '11:00',
    statut: 'service_confirme',
    dernierMessage: 'RDV confirmé pour accompagnement médical',
    avatar: 'SM',
    couleur: '#FF6B35',
    typeService: 'recu'
  },
  // Services proposés (je suis aidant)
  {
    id: '3',
    profileId: 'profile_3', 
    profileName: 'Claude Dupuis',
    secteur: 'Compagnie',
    jour: '17/08',
    heureDebut: '14:00',
    heureFin: '17:00',
    statut: 'termine',
    dernierMessage: 'Service de compagnie terminé avec succès',
    avatar: 'CD',
    couleur: '#757575',
    typeService: 'propose'
  }
];

export default function MesServicesScreen() {
  const [services] = useState<ServiceSenior[]>(servicesSeniors);
  const [filtreActif, setFiltreActif] = useState<string>('tous');
  const [typeFiltre, setTypeFiltre] = useState<'tous' | 'recu' | 'propose'>('tous');
  const router = useRouter();

  // 🎯 NAVIGATION VERS CONVERSATION
  const ouvrirConversation = (service: ServiceSenior): void => {
    router.push({
      pathname: '/conversation',
      params: {
        profileId: service.profileId,
        profileName: service.profileName,
        secteur: service.secteur,
        jour: service.jour,
        heureDebut: service.heureDebut,
        heureFin: service.heureFin,
        etapeInitiale: service.statut
      }
    });
  };

  // 🎯 FILTRAGE DES SERVICES
  const servicesFiltres = services.filter(service => {
    const matchStatut = filtreActif === 'tous' || service.statut === filtreActif;
    const matchType = typeFiltre === 'tous' || service.typeService === typeFiltre;
    return matchStatut && matchType;
  });

  // 🎯 RENDU ITEM SERVICE SENIOR
  const renderService = ({ item }: { item: ServiceSenior }) => {
    const statutInfo = STATUTS[item.statut];
    const isServiceRecu = item.typeService === 'recu';
    
    return (
      <TouchableOpacity 
        style={styles.serviceCard}
        onPress={() => ouvrirConversation(item)}
      >
        <View style={styles.serviceHeader}>
          <View style={[styles.avatar, { backgroundColor: item.couleur }]}>
            <Text style={styles.avatarText}>{item.avatar}</Text>
          </View>
          
          <View style={styles.serviceInfo}>
            <Text style={styles.profileName}>{item.profileName}</Text>
            <Text style={styles.serviceSecteur}>{item.secteur}</Text>
            <Text style={styles.serviceDate}>{item.jour} • {item.heureDebut}-{item.heureFin}</Text>
            <Text style={styles.serviceType}>
              {isServiceRecu ? '📥 Service reçu' : '📤 Service proposé'}
            </Text>
          </View>
          
          <View style={styles.serviceRight}>
            <View style={[styles.statutBadge, { backgroundColor: statutInfo.couleur }]}>
              <Text style={styles.statutIcon}>{statutInfo.icon}</Text>
              <Text style={styles.statutText}>{statutInfo.label}</Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.dernierMessage} numberOfLines={2}>
          {item.dernierMessage}
        </Text>
      </TouchableOpacity>
    );
  };

  // 🎯 FILTRES DOUBLE RÔLE
  const renderFiltresType = () => {
    const types = [
      { id: 'tous', label: 'Tous', icon: '📋' },
      { id: 'recu', label: 'Services reçus', icon: '📥' },
      { id: 'propose', label: 'Services proposés', icon: '📤' }
    ];
    
    return (
      <View style={styles.filtresContainer}>
        <Text style={styles.filtresTitle}>Type de service :</Text>
        <FlatList
          data={types}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isActif = item.id === typeFiltre;
            
            return (
              <TouchableOpacity
                style={[
                  styles.filtreButton,
                  isActif && styles.filtreButtonActif
                ]}
                onPress={() => setTypeFiltre(item.id as any)}
              >
                <Text style={styles.filtreIcon}>{item.icon}</Text>
                <Text style={[
                  styles.filtreText,
                  isActif && styles.filtreTextActif
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filtresList}
        />
      </View>
    );
  };

  // 🎯 FILTRES PAR STATUT
  const renderFiltresStatut = () => {
    const statutsUniques: (string | StatutServiceType)[] = ['tous', ...Object.keys(STATUTS) as StatutServiceType[]];
    
    return (
      <View style={styles.filtresContainer}>
        <Text style={styles.filtresTitle}>Statut :</Text>
        <FlatList
          data={statutsUniques}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isActif = item === filtreActif;
            const statutInfo = item === 'tous' 
              ? { label: 'Tous', icon: '📋' }
              : STATUTS[item as StatutServiceType];
            
            return (
              <TouchableOpacity
                style={[
                  styles.filtreButton,
                  isActif && styles.filtreButtonActif
                ]}
                onPress={() => setFiltreActif(item)}
              >
                <Text style={styles.filtreIcon}>{statutInfo.icon}</Text>
                <Text style={[
                  styles.filtreText,
                  isActif && styles.filtreTextActif
                ]}>
                  {statutInfo.label}
                </Text>
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filtresList}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 🧡 HEADER ORANGE CAROTTE */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤝 Mes Services Seniors</Text>
        <Text style={styles.headerSubtitle}>Services reçus et proposés</Text>
      </View>

      {renderFiltresType()}
      {renderFiltresStatut()}

      <FlatList
        data={servicesFiltres}
        renderItem={renderService}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.servicesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>📭 Aucun service</Text>
            <Text style={styles.emptyText}>
              {typeFiltre === 'tous' 
                ? 'Aucun service actif pour le moment.'
                : typeFiltre === 'recu'
                  ? 'Vous n&apos;avez pas encore reçu de services.'
                  : 'Vous n&apos;avez pas encore proposé de services.'
              }
            </Text>
            <TouchableOpacity 
              style={styles.nouvelleRechercheButton}
              onPress={() => router.push('/')}
            >
              <Text style={styles.nouvelleRechercheText}>
                {typeFiltre === 'propose' ? '🤝 Proposer un service' : '🔍 Nouvelle recherche'}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 🎨 CONTENEUR PRINCIPAL BLANC
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // 🧡 HEADER ORANGE CAROTTE
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FF6B35',
    letterSpacing: 0.3,
  },
  
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 5,
  },
  
  // 🎯 FILTRES MINIMALISTES
  filtresContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  
  filtresTitle: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 20,
    marginBottom: 10,
    fontWeight: '500',
  },
  
  filtresList: {
    paddingHorizontal: 15,
  },
  
  filtreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  filtreButtonActif: {
    backgroundColor: '#FFF8F5',
    borderColor: '#FF6B35',
  },
  
  filtreIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  
  filtreText: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
  },
  
  filtreTextActif: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  
  // 📋 LISTE SERVICES
  servicesList: {
    padding: 15,
  },
  
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 0,
    shadowOpacity: 0,
  },
  
  serviceHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  serviceInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  
  serviceSecteur: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  
  serviceDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  
  serviceType: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
    fontWeight: '500',
  },
  
  serviceRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  statutIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  
  statutText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  
  dernierMessage: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  
  // 📭 ÉTAT VIDE
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#757575',
    marginBottom: 10,
  },
  
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  
  nouvelleRechercheButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  
  nouvelleRechercheText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});