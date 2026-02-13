
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

import { FirebaseProvider, useFirebase, useFirebaseApp, useFirestore, useAuth, useStorage } from './provider';
import { FirebaseClientProvider } from './client-provider';
import { useUser } from './auth/use-user';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';

let firebaseApp: FirebaseApp;
let storage: FirebaseStorage;

function initializeFirebase() {
  const apps = getApps();
  if (apps.length > 0) {
    firebaseApp = apps[0];
  } else {
    firebaseApp = initializeApp(firebaseConfig);
  }
  
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
  
  try {
    enableIndexedDbPersistence(firestore)
      .catch((err) => {
        if (err.code == 'failed-precondition') {
          console.warn("Firestore persistence failed: multiple tabs open.");
        } else if (err.code == 'unimplemented') {
          console.warn("Firestore persistence not supported in this browser.");
        }
      });
  } catch(e) {
    console.error("Error enabling Firestore persistence", e);
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
