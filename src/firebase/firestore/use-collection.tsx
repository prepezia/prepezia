'use client';

import { useState, useEffect, useContext } from 'react';
import { onSnapshot, Query, DocumentData, QuerySnapshot, CollectionReference, FirestoreError } from 'firebase/firestore';
import { FirebaseContext } from '../provider';

export const useCollection = <T extends DocumentData>(
  query: Query<T> | CollectionReference<T> | null
) => {
  const { firestore } = useContext(FirebaseContext);
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (!firestore || !query) {
      setData(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(query, (snapshot: QuerySnapshot<T>) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setData(items as T[]);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching collection: ", err);
      setError(err);
      setData(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, query]);

  return { data, loading, error };
};
