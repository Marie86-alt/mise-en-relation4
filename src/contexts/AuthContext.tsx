import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase.config';

// 🎯 TYPES TYPESCRIPT
interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
  userType?: 'client' | 'aidant';
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, additionalData?: Partial<User>) => Promise<FirebaseUser>;
  signIn: (email: string, password: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ✅ CRÉATION DU CONTEXT AVEC TYPES CORRECTS
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ HOOK TYPÉ POUR UTILISER LE CONTEXT
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

// ✅ PROVIDER TYPÉ
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Écouter les changements d'état d'authentification
  useEffect(() => {
    console.log('🔵 AuthContext useEffect démarré');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        console.log('🔵 onAuthStateChanged appelé, user:', firebaseUser?.email || 'null');
        
        if (firebaseUser) {
          console.log('✅ Utilisateur détecté, récupération des données...');
          // Récupérer les données utilisateur supplémentaires depuis Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          console.log('📄 Données Firestore:', userData);
          
          const finalUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            userType: userData.userType || 'client',
            createdAt: userData.createdAt,
            ...userData
          };
          
          console.log('✅ setUser avec:', finalUser);
          setUser(finalUser);
        } else {
          console.log('❌ Aucun utilisateur, setUser(null)');
          setUser(null);
        }
      } catch (err: any) {
        console.error('❌ Erreur dans onAuthStateChanged:', err);
        setError(err.message);
      } finally {
        console.log('🔄 setLoading(false) dans onAuthStateChanged');
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // ✅ FONCTION D'INSCRIPTION TYPÉE
  const signUp = async (email: string, password: string, additionalData: Partial<User> = {}): Promise<FirebaseUser> => {
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
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ✅ FONCTION DE CONNEXION TYPÉE
  const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
    try {
      console.log('🔵 AuthContext signIn appelé avec:', email);
      setLoading(true);
      setError(null);

      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase signIn réussi:', firebaseUser.email);
      return firebaseUser;
    } catch (err: any) {
      console.error('❌ AuthContext signIn erreur:', err);
      setError(err.message);
      throw err;
    } finally {
      console.log('🔄 AuthContext signIn finally');
      setLoading(false);
    }
  };

  // ✅ FONCTION DE DÉCONNEXION TYPÉE
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await signOut(auth);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ✅ FONCTION DE MISE À JOUR TYPÉE
  const updateUserProfile = async (updates: Partial<User>): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (user) {
        // Mettre à jour Firestore
        await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
        
        // Mettre à jour l'état local
        setUser(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ✅ VALEURS DU CONTEXT TYPÉES
  const value: AuthContextType = {
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