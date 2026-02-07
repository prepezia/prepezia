'use client';

import { useState, useEffect, ReactNode } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from '.';

interface FirebaseServices {
  firebaseApp?: FirebaseApp;
  auth?: Auth;
  firestore?: Firestore;
}

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<FirebaseServices>({});

  useEffect(() => {
    setServices(initializeFirebase());
  }, []);

  return (
    <FirebaseProvider {...services}>
      {children}
    </FirebaseProvider>
  );
}
