
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';

export interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp?: FirebaseApp;
  auth?: Auth;
  firestore?: Firestore;
  storage?: FirebaseStorage;
}

export const FirebaseContext = createContext<Omit<FirebaseProviderProps, 'children'>>({} as Omit<FirebaseProviderProps, 'children'>);

export const FirebaseProvider = ({ children, ...props }: FirebaseProviderProps) => {
  return (
    <FirebaseContext.Provider value={props}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => useContext(FirebaseContext);
export const useFirebaseApp = () => useContext(FirebaseContext).firebaseApp;
export const useFirestore = () => useContext(FirebaseContext).firestore;
export const useAuth = () => useContext(FirebaseContext).auth;
export const useStorage = () => useContext(FirebaseContext).storage;
