import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Remplacez par votre configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDSal_1eOIoAZGj7IK64Hj_8YiQpxZiMcs",
  authDomain: "mise-en-relation-app.firebaseapp.com",
  projectId: "mise-en-relation-app",
  storageBucket: "mise-en-relation-app.firebasestorage.app",
  messagingSenderId: "869583319045",
  appId: "1:869583319045:web:711e74f9d79dcb730a6c6c"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Auth avec persistence pour React Native
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialiser Firestore
const db = getFirestore(app);

export { auth, db };
export default app;