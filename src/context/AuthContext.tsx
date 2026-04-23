import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

export type UserRole = 'Sales' | 'Customs Inland Service' | 'Trucking / Pricing' | 'Team Leader' | 'Management' | 'Admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department: string;
  status: 'active' | 'inactive';
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch or create user profile in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          if (firebaseUser.email === 'dennis.dinh@voltransvn.com' && data.role !== 'Admin') {
            await updateDoc(userRef, { role: 'Admin' });
            data.role = 'Admin';
          }
          setProfile(data);
        } else {
          // Create new user profile with default "Sales" role
          const role = firebaseUser.email === 'dennis.dinh@voltransvn.com' ? 'Admin' : 'Sales';
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Unnamed User',
            role: role, // Default role
            department: 'BizSquad',
            status: 'active',
          };
          await setDoc(userRef, { ...newProfile, createdAt: serverTimestamp() });
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
