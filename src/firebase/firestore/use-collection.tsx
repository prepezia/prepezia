'use client';

import { useState, useEffect, useContext } from 'react';
import { collection, onSnapshot, Query, DocumentData, QuerySnapshot, CollectionReference } from 'firebase/firestore';
import { FirebaseContext } from '../provider';

interface UseCollectionOptions<T> {
  // Add any options if needed, for example, for error handling
}

export const useCollection = <T extends DocumentData>(
  query: Query<T> | CollectionReference<T> | null
) => {
  const { firestore } = useContext(FirebaseContext);
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    if (!firestore || !query) {
      setData(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(query, (snapshot: QuerySnapshot<T>) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setData(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching collection: ", error);
      setData(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, query]);

  return { data, loading };
};
