'use client';

import { useState, useEffect, useContext } from 'react';
import { Auth, onAuthStateChanged, User } from 'firebase/auth';
import { FirebaseContext } from '../provider';

// Hardcoded admin email for development purposes
const ADMIN_EMAIL = 'nextinnovationafrica@gmail.com';

export const useUser = () => {
  const { auth } = useContext(FirebaseContext);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAdmin(user?.email === ADMIN_EMAIL);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return { user, loading, isAdmin };
};
