import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase.config';

// Créer le context avec une valeur par défaut typée
const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  signUp: async () => {},
  signIn: async () => {},
  logout: async () => {},
  updateUserProfile: async () => {},
  clearError: () => {}
});

// Hook pour utiliser le context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

// Provider du context
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Écouter les changements d'état d'authentification
  useEffect(() => {
    console.log('🔵 AuthContext useEffect démarré');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        console.log('🔵 onAuthStateChanged appelé, user:', firebaseUser?.email || 'null');
        
        if (firebaseUser) {
          console.log('✅ Utilisateur détecté, récupération des données...');
          // Récupérer les données utilisateur supplémentaires depuis Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          console.log('📄 Données Firestore:', userData);
          
          const finalUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            ...userData
          };
          
          console.log('✅ setUser avec:', finalUser);
          setUser(finalUser);
        } else {
          console.log('❌ Aucun utilisateur, setUser(null)');
          setUser(null);
        }
      } catch (err) {
        console.error('❌ Erreur dans onAuthStateChanged:', err);
        setError(err.message);
      } finally {
        console.log('🔄 setLoading(false) dans onAuthStateChanged');
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Fonction d'inscription
  const signUp = async (email, password, additionalData = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Créer le compte Firebase Auth
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);

      // Mettre à jour le profil avec le nom d'affichage
      if (additionalData.displayName) {
        await updateProfile(firebaseUser, {
          displayName: additionalData.displayName
        });
      }

      // Sauvegarder les données supplémentaires dans Firestore
      const userData = {
        email: firebaseUser.email,
        displayName: additionalData.displayName || '',
        userType: additionalData.userType || 'client', // 'client' ou 'aidant'
        createdAt: new Date().toISOString(),
        ...additionalData
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userData);

      return firebaseUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fonction de connexion
  const signIn = async (email, password) => {
    try {
      console.log('🔵 AuthContext signIn appelé avec:', email);
      setLoading(true);
      setError(null);

      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase signIn réussi:', firebaseUser.email);
      return firebaseUser;
    } catch (err) {
      console.error('❌ AuthContext signIn erreur:', err);
      setError(err.message);
      throw err;
    } finally {
      console.log('🔄 AuthContext signIn finally');
      setLoading(false);
    }
  };

  // Fonction de déconnexion
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      await signOut(auth);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour mettre à jour le profil utilisateur
  const updateUserProfile = async (updates) => {
    try {
      setLoading(true);
      setError(null);

      if (user) {
        // Mettre à jour Firestore
        await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
        
        // Mettre à jour l'état local
        setUser(prev => ({ ...prev, ...updates }));
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Valeurs du context
  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    logout,
    updateUserProfile,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;