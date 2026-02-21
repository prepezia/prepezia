'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence, initializeFirestore } from 'firebase/firestore';
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
 * Includes a fix for Firestore connectivity in restricted network environments (like cloud IDEs)
 * by forcing experimental long-polling.
 */
function initializeFirebase() {
  // Safety check to ensure this only runs in the browser
  if (typeof window === 'undefined') return {};

  if (!firebaseApp) {
    const apps = getApps();
    if (apps.length > 0) {
      firebaseApp = apps[0];
    } else {
      firebaseApp = initializeApp(firebaseConfig);
    }
  }
  
  if (!auth) auth = getAuth(firebaseApp);
  if (!storage) storage = getStorage(firebaseApp);
  
  if (!firestore) {
    try {
      // Force long-polling to ensure connectivity in proxy-heavy or restricted network environments.
      firestore = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
      });
      
      // Attempt to enable offline persistence
      enableIndexedDbPersistence(firestore).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn("Firestore persistence failed: multiple tabs open.");
        } else if (err.code === 'unimplemented') {
          console.warn("Firestore persistence not supported in this browser.");
        }
      });
    } catch (e) {
      // If initializeFirestore has already been called elsewhere (HMR), fall back to getFirestore
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
