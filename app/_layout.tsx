// Fichier: app/_layout.tsx

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import '../firebase.config';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect } from 'react';

// 🎯 NOUVELLE LOGIQUE DE NAVIGATION PLUS ROBUSTE
function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // On n'agit pas tant que l'authentification n'est pas vérifiée
    if (loading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    // Si l'utilisateur N'EST PAS connecté ET qu'il n'est PAS sur un écran d'authentification...
    if (!user && !inAuthGroup) {
      // ... on le redirige de force vers la page de connexion.
      router.replace('/(auth)/login');
    }
    
    // Si l'utilisateur EST connecté ET qu'il se retrouve sur un écran d'authentification...
    else if (user && inAuthGroup) {
      // ... on le redirige vers l'accueil de l'application.
      router.replace('/(tabs)');
    }

  }, [user, loading, segments, router]);

  // Affiche un écran de chargement global pendant la vérification initiale
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e67e22" />
      </View>
    );
  }

  // Affiche la pile de navigation une fois le chargement terminé
  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="paiement" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="conversation" options={{ headerShown: false }} />
      <Stack.Screen name="admin-seed" options={{ headerShown: false }} />
      <Stack.Screen name="profile-detail" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

// Le composant racine ne change pas
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootLayoutNav />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  }
});