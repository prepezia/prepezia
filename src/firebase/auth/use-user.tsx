'use client';

import { useState, useEffect, useContext } from 'react';
import { Auth, onAuthStateChanged, User } from 'firebase/auth';
import { FirebaseContext } from '../provider';

export const useUser = () => {
  const { auth } = useContext(FirebaseContext);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return { user, loading };
};
