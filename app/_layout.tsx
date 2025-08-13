// import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// import { useFonts } from 'expo-font';
// import { Stack } from 'expo-router';
// import { StatusBar } from 'expo-status-bar';
// import 'react-native-reanimated';
// import { useColorScheme } from '@/hooks/useColorScheme';
// import '../firebase.config';
// import { AuthProvider } from '../src/contexts/AuthContext';

// export default function RootLayout() {
//   console.log('Firebase initialisé !');
  
//   const colorScheme = useColorScheme();
//   const [loaded] = useFonts({
//     SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
//   });

//   if (!loaded) {
//     return null;
//   }

//   return (
//     <AuthProvider>
//       <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
//         <Stack initialRouteName="login">
//           {/* Écrans d'authentification */}
//           <Stack.Screen name="login" options={{ headerShown: false }} />
//           <Stack.Screen name="signup" options={{ headerShown: false }} />
          
//           {/* App principale */}
//           <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//           <Stack.Screen name="profile-list" options={{ headerShown: false }} />
//           <Stack.Screen name="profile-detail" options={{ headerShown: false }} />
          
//           <Stack.Screen name="+not-found" />
//         </Stack>
//         <StatusBar style="auto" />
//       </ThemeProvider>
//     </AuthProvider>
//   );
// }


import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import '../firebase.config';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Un composant interne pour gérer la logique de navigation
function AppNavigator() {
  const { loading } = useAuth();

  // Affiche un écran de chargement global pendant que Firebase vérifie l'état de l'utilisateur
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // CORRECTION : On ajoute la propriété "initialRouteName" au Stack.
  // Pour tester le peuplement de la base de données, mettez "admin-seed".
  // Pour l'utilisation normale de l'application, mettez "login".
  return (
    <Stack initialRouteName="admin-seed">
      {/* Écrans disponibles dans l'application */}
      <Stack.Screen name="admin-seed" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile-list" options={{ headerShown: false }} />
      <Stack.Screen name="profile-detail" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

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
  }
});
