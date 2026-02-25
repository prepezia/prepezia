'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

import { FirebaseProvider, useFirebase, useFirebaseApp, useFirestore, useAuth, useStorage } from './provider';
import { FirebaseClientProvider } from './client-provider';
import { useUser } from './auth/use-user';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';

let firebaseApp: FirebaseApp;
let firestore: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

/**
 * Initializes Firebase services for the client.
 * Uses long-polling for stable Firestore connectivity in restricted environments (like Cloud Workstations).
 */
function initializeFirebase() {
  if (typeof window === 'undefined') return {};

  if (!firebaseApp) {
    const apps = getApps();
    firebaseApp = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
  }
  
  if (!auth) auth = getAuth(firebaseApp);
  if (!storage) storage = getStorage(firebaseApp);
  
  if (!firestore) {
    try {
      // In restricted networking environments (like workstations or proxies),
      // WebSockets (default) can fail. We force Long Polling for reliability.
      firestore = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
      });
    } catch (e) {
      // Fallback if already initialized (e.g. during HMR)
      firestore = getFirestore(firebaseApp);
    }
  }
  
  return { firebaseApp, auth, firestore, storage };
}

export {
  initializeFirebase,
  FirebaseProvider,
  FirebaseClientProvider,
  useUser,
  useCollection,
  useDoc,
  useFirebase,
  useFirebaseApp,
  useFirestore,
  useAuth,
  useStorage,
};
