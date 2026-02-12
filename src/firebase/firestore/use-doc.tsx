'use client';

import { useState, useEffect, useContext } from 'react';
import { doc, onSnapshot, DocumentReference, DocumentData } from 'firebase/firestore';
import { FirebaseContext } from '../provider';

export const useDoc = <T extends DocumentData>(
  docRef: DocumentReference<T> | null
) => {
  const { firestore } = useContext(FirebaseContext);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    if (!firestore || !docRef) {
      setData(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData({ ...docSnap.data(), id: docSnap.id });
      } else {
        setData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching document: ", error);
      setData(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, docRef]);

  return { data, loading };
};
