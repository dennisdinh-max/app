import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

export type UserRole = 'Sales' | 'Customs Inland Service' | 'Trucking / Pricing' | 'LMS Overseas Service' | 'Team Leader' | 'Management' | 'Admin';

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

const ADMIN_EMAILS = [
  'dennis.dinh@voltransvn.com'
];

const MANAGEMENT_EMAILS = [
  'vpco@voltranvn.com',
  'vpco@voltransvn.com', // Cover typo
  'aria.thoa@voltransvn.com',
  'manny.nhi@voltransvn.com',
  'andrea.binh@voltransvn.com',
  'hcmpricing11@voltransvn.com',
  'gilles.thiep@voltransvn.com',
  'peter.vinh@voltransvn.com',
  'hphbiz01@voltransvn.com',
  'hphcs01@voltransvn.com',
  'dadild01@voltransvn.com',
  'hcmops07@voltransvn.com',
  'it@voltransvn.com',
  'hcmast01@voltransvn.com',
  'hcmast02@voltransvn.com'
];

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
        
        let targetRole: UserRole | null = null;
        if (firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email.toLowerCase())) {
          targetRole = 'Admin';
        } else if (firebaseUser.email && MANAGEMENT_EMAILS.includes(firebaseUser.email.toLowerCase())) {
          targetRole = 'Management';
        }

        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          let needsUpdate = false;
          let updates: any = {};

          if (targetRole && data.role !== targetRole && data.role !== 'Admin') {
            updates.role = targetRole;
            data.role = targetRole;
            needsUpdate = true;
          }

          if (firebaseUser.displayName && firebaseUser.displayName !== data.displayName) {
            updates.displayName = firebaseUser.displayName;
            data.displayName = firebaseUser.displayName;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await updateDoc(userRef, updates);
          }
          
          setProfile(data);
        } else {
          // Create new user profile with default "Sales" role or specified role
          const role = targetRole || 'Sales';
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
