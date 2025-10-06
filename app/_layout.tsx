// app/_layout.tsx

import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import '../firebase.config';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { applyTextInputDefaults } from '@/src/ui/applyTextInputDefaults';
import { STRIPE_CONFIG } from '@/src/config/stripe';
applyTextInputDefaults();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const seg0 = segments?.[0]; // '(auth)', '(tabs)' ou undefined pour '/'
    const inAuth = seg0 === '(auth)';
    const inTabs = seg0 === '(tabs)';
    const atLanding = seg0 === undefined;

    // LOGIQUE DE REDIRECTION FIABLE
    // Déconnecté → va sur la landing
    if (!user && inTabs) {
      router.dismissAll?.(); // Vide la pile navigation si besoin (Expo Router v2+)
      router.replace('/');
    }
    // Connecté → onglets principaux
    else if (user && (inAuth || atLanding)) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="paiement" options={{ headerShown: false }} />
      <Stack.Screen name="paiement-final" options={{ headerShown: false }} />
      <Stack.Screen name="conversation" options={{ headerShown: false }} />
      <Stack.Screen name="profile-detail" options={{ headerShown: false }} />
      <Stack.Screen name="profile-list" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({ SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf') });
  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider value={DefaultTheme}>
          <RootLayoutNav />
          {/* Sur Android edge-to-edge, garde une barre lisible */}
          <StatusBar
            style={colorScheme === 'dark' ? 'light' : 'dark'}
            translucent={Platform.OS === 'android'}
          />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
