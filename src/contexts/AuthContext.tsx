// Fichier : src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, 
  useState, ReactNode } from 'react';
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


// 🎯 TYPES TYPESCRIPT (SIMPLIFIÉS)
interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
  createdAt?: string;
  role?: 'user' | 'admin';
  experience?: number;
  tarifHeure?: number;
  description?: string;
  isAidant?: boolean;

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

// ✅ CRÉATION DU CONTEXT
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          
          // L'objet User est maintenant plus simple
          const finalUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            ...userData
          };
          
          setUser(finalUser);
        } else {
          setUser(null);
        }
      } catch (err: any) {
        console.error('❌ Erreur dans onAuthStateChanged:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // ✅ FONCTION D'INSCRIPTION MISE À JOUR
  const signUp = async (email: string, password: string, additionalData: Partial<User> = {}): Promise<FirebaseUser> => {
    try {
      setLoading(true);
      setError(null);

      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);

      if (additionalData.displayName) {
        await updateProfile(firebaseUser, {
          displayName: additionalData.displayName
        });
      }

      // La sauvegarde dans Firestore est simplifiée (plus de userType)
      const userData = {
        email: firebaseUser.email,
        displayName: additionalData.displayName || '',
        createdAt: new Date().toISOString(),
        ...additionalData // Pour toute autre donnée future
      };
      
      // On retire la propriété userType avant de sauvegarder
      

      await setDoc(doc(db, 'users', firebaseUser.uid), userData);

      return firebaseUser;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
    try {
      setLoading(true);
      setError(null);
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      return firebaseUser;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

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

  const updateUserProfile = async (updates: Partial<User>): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      if (user) {
        await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
        setUser(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

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