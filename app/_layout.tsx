import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import '../firebase.config';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// 🎯 CONFIGURATION - Changez selon vos besoins
const CONFIG = {
  SHOW_ADMIN_SEED: true,
  DEFAULT_ROUTE: 'login' as const
};

// 🎯 COMPOSANT NAVIGATION INTELLIGENTE
function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  const getInitialRoute = (): string => {
    if (CONFIG.SHOW_ADMIN_SEED) {
      return 'admin-seed';
    }
    
    if (user) {
      return '(tabs)';
    }
    
    return CONFIG.DEFAULT_ROUTE;
  };

  console.log('🚀 Navigation initialisée:', {
    userConnected: !!user,
    userType: user?.userType,
    initialRoute: getInitialRoute()
  });

  return (
    <Stack initialRouteName={getInitialRoute()}>
      {/* 🔧 ÉCRANS D'ADMINISTRATION */}
      {CONFIG.SHOW_ADMIN_SEED && (
        <Stack.Screen 
          name="admin-seed" 
          options={{ headerShown: false }} 
        />
      )}
      
      {/* 🔐 ÉCRANS D'AUTHENTIFICATION */}
      <Stack.Screen 
        name="login" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="signup" 
        options={{ headerShown: false }} 
      />
      
      {/* 📱 APPLICATION PRINCIPALE */}
      <Stack.Screen 
        name="(tabs)" 
        options={{ headerShown: false }} 
      />
      
      {/* 💬 PAGES HORS TABS - Accessibles depuis toute l'app */}
      <Stack.Screen 
        name="conversation" 
        options={{ 
          headerShown: false,
          presentation: 'card'
        }} 
      />
      
      <Stack.Screen 
        name="paiement" 
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }} 
      />
      
      {/* ❌ PAGE NON TROUVÉE */}
      <Stack.Screen 
        name="+not-found" 
        options={{ title: 'Page non trouvée' }}
      />
    </Stack>
  );
}

// 🎯 COMPOSANT RACINE PRINCIPAL
export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  console.log('🚀 setLoading(false) dans onAuthStateChanged');

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppNavigator />
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