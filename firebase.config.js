import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence,
  browserLocalPersistence
 } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Remplacez par votre configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDSr-Bn_JOwdHUsnWBJ_TFy75zcNPU113E",
  authDomain: "mise-en-relation-app-fc187.firebaseapp.com",
  projectId: "mise-en-relation-app-fc187",
  storageBucket: "mise-en-relation-app-fc187.firebasestorage.app",
  messagingSenderId: "725605633193",
  appId: "1:725605633193:web:437ef93f522c8c81f6adb8"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Auth avec persistence pour React Native
const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web' 
    ? browserLocalPersistence // Utilise le stockage du navigateur (IndexedDB)
    : getReactNativePersistence(AsyncStorage) // Utilise le stockage natif
});


// Initialiser Firestore
const db = getFirestore(app);

export { auth, db };
export default app;