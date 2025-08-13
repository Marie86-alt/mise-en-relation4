// Fichier: app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors'; // Import des couleurs depuis le fichier constants

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // 🎯 MODIFICATION : On applique la nouvelle couleur "orange carotte"
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.grey,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.light.background, // Fond blanc, comme demandé
          borderTopWidth: 1,
          borderTopColor: '#ecf0f1',
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
      }}>
      
      {/* 🏠 ONGLET ACCUEIL */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={24} 
              name={focused ? 'home' : 'home-outline'} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* 📱 ONGLET MES SERVICES */}
      <Tabs.Screen
        name="services"
        options={{
          title: 'Mes Services',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={24} 
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* 👤 ONGLET PROFIL */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={24} 
              name={focused ? 'person' : 'person-outline'} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}