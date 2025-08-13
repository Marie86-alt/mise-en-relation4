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

// 🎯 TYPES TYPESCRIPT
interface Service {
  id: string;
  profileId: string;
  profileName: string;
  secteur: string;
  jour: string;
  heureDebut: string;
  heureFin: string;
  statut: StatutType;
  dernierMessage: string;
  avatar: string;
  couleur: string;
}

type StatutType = 'conversation' | 'service_confirme' | 'en_cours' | 'termine' | 'evaluation';

interface StatutInfo {
  label: string;
  couleur: string;
  icon: string;
}

// 🎯 STATUTS POSSIBLES
const STATUTS: Record<StatutType, StatutInfo> = {
  conversation: { label: 'En discussion', couleur: '#f39c12', icon: '💬' },
  service_confirme: { label: 'Service confirmé', couleur: '#3498db', icon: '✅' },
  en_cours: { label: 'En cours', couleur: '#27ae60', icon: '🔄' },
  termine: { label: 'Terminé', couleur: '#95a5a6', icon: '✅' },
  evaluation: { label: 'À évaluer', couleur: '#e67e22', icon: '⭐' }
};

// 🎯 DONNÉES MOCK - Services/Conversations actives
const servicesActifs: Service[] = [
  {
    id: '1',
    profileId: 'profile_1',
    profileName: 'Maria Garcia',
    secteur: 'Ménage',
    jour: '15/08',
    heureDebut: '14:00',
    heureFin: '16:00',
    statut: 'conversation',
    dernierMessage: 'Parfait ! Quand souhaitez-vous confirmer le service ?',
    avatar: 'MG',
    couleur: '#e74c3c'
  },
  {
    id: '2',  
    profileId: 'profile_2',
    profileName: 'Sophie Martin',
    secteur: 'Garde d\'enfants',
    jour: '16/08',
    heureDebut: '16:00', 
    heureFin: '20:00',
    statut: 'service_confirme',
    dernierMessage: 'Service confirmé - Acompte payé',
    avatar: 'SM',
    couleur: '#3498db'
  },
  {
    id: '3',
    profileId: 'profile_3', 
    profileName: 'Julien Dubois',
    secteur: 'Aide à domicile',
    jour: '14/08',
    heureDebut: '09:00',
    heureFin: '17:00',
    statut: 'termine',
    dernierMessage: 'Service terminé - Merci !',
    avatar: 'JD',
    couleur: '#27ae60'
  }
];

export default function MesServicesScreen() {
  const [services] = useState<Service[]>(servicesActifs);
  const [filtreActif, setFiltreActif] = useState<string>('tous');
  const router = useRouter();

  // 🎯 NAVIGATION VERS CONVERSATION
  const ouvrirConversation = (service: Service): void => {
    router.push({
      pathname: '/conversation',
      params: {
        profileId: service.profileId,
        profileName: service.profileName,
        secteur: service.secteur,
        jour: service.jour,
        heureDebut: service.heureDebut,
        heureFin: service.heureFin,
        // Reprendre la conversation où elle était
        etapeInitiale: service.statut
      }
    });
  };

  // 🎯 FILTRAGE DES SERVICES
  const servicesFiltres = filtreActif === 'tous' 
    ? services 
    : services.filter(service => service.statut === filtreActif);

  // 🎯 RENDU ITEM SERVICE
  const renderService = ({ item }: { item: Service }) => {
    const statutInfo = STATUTS[item.statut];
    
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

  // 🎯 FILTRES PAR STATUT
  const renderFiltres = () => {
    const statutsUniques: (string | StatutType)[] = ['tous', ...Object.keys(STATUTS) as StatutType[]];
    
    return (
      <View style={styles.filtresContainer}>
        <Text style={styles.filtresTitle}>Filtrer par statut :</Text>
        <FlatList
          data={statutsUniques}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }: { item: string | StatutType }) => {
            const isActif = item === filtreActif;
            const statutInfo = item === 'tous' 
              ? { label: 'Tous', icon: '📋' }
              : STATUTS[item as StatutType];
            
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📱 Mes Services</Text>
        <Text style={styles.headerSubtitle}>Gérez vos demandes et conversations</Text>
      </View>

      {renderFiltres()}

      <FlatList
        data={servicesFiltres}
        renderItem={renderService}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.servicesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>📭 Aucun service actif</Text>
            <Text style={styles.emptyText}>
              {filtreActif === 'tous' 
                ? 'Vos conversations et services apparaîtront ici.'
                : `Aucun service avec le statut "${STATUTS[filtreActif as StatutType]?.label || filtreActif}".`
              }
            </Text>
            <TouchableOpacity 
              style={styles.nouvelleRechercheButton}
              onPress={() => router.push('/')}
            >
              <Text style={styles.nouvelleRechercheText}>🔍 Nouvelle recherche</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 5,
  },
  filtresContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  filtresTitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 20,
    marginBottom: 10,
  },
  filtresList: {
    paddingHorizontal: 15,
  },
  filtreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  filtreButtonActif: {
    backgroundColor: '#3498db',
  },
  filtreIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  filtreText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  filtreTextActif: {
    color: '#ffffff',
  },
  servicesList: {
    padding: 15,
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  serviceInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  serviceSecteur: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  serviceDate: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
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
    color: '#ffffff',
    fontWeight: '500',
  },
  dernierMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  nouvelleRechercheButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nouvelleRechercheText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});