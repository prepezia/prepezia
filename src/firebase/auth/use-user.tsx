'use client';

import { useState, useEffect, useContext } from 'react';
import { Auth, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FirebaseContext } from '../provider';

// Hardcoded admin email for development purposes
const ADMIN_EMAIL = 'nextinnovationafrica@gmail.com';

export const useUser = () => {
  const { auth, firestore } = useContext(FirebaseContext);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!auth) {
      // Firebase context might not be ready yet.
      // The hook's initial state is `loading: true`, so we just wait.
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      const isAdminUser = user?.email === ADMIN_EMAIL;
      setIsAdmin(isAdminUser);

      // If the user is an admin, ensure their Firestore doc reflects this.
      if (isAdminUser && firestore && user) {
        const userDocRef = doc(firestore, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists() || userDoc.data()?.isAdmin !== true) {
            await setDoc(userDocRef, { isAdmin: true }, { merge: true });
          }
        } catch (error) {
          console.error("Failed to set admin status in Firestore:", error);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return { user, loading, isAdmin };
};
