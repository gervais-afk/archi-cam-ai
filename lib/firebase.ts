import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator, GoogleAuthProvider, OAuthProvider }      from "firebase/auth";
import { getFirestore, initializeFirestore, connectFirestoreEmulator } from "firebase/firestore/lite";
import { getStorage, connectStorageEmulator }   from "firebase/storage";


if (typeof window === 'undefined') {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
  console.log('[Firebase Init] Server-side environment: configured emulator hosts in process.env');
}

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "archi-cam-ai.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "archi-cam-ai",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "archi-cam-ai.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:mockappid",
};

console.log('[Firebase Init] Loading firebase module. NODE_ENV:', process.env.NODE_ENV, 'typeof window:', typeof window);

const app       = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');

// Use initializeFirestore with long polling on server-side to prevent emulator hangs, otherwise getFirestore
let dbInstance;
if (typeof window === 'undefined') {
  try {
    dbInstance = initializeFirestore(app, { experimentalForceLongPolling: true } as any);
  } catch (e) {
    dbInstance = getFirestore(app);
  }
} else {
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

export const storage = getStorage(app);

// Connexion aux émulateurs locaux en développement pour la persistance locale
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  try {
    const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
    // Se connecter uniquement en cas de besoin
    console.log('[Firebase Init] Emulateurs configurés.');
  } catch (err) {
    console.log('[Firebase] Connexion émulateurs ignorée.');
  }
}


export default app;
