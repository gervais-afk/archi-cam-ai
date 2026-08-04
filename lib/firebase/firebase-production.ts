/**
 * 🔥 FIREBASE PRODUCTION & DEVELOPMENT INITIALIZER — ARCHI CAM AI
 * ────────────────────────────────────────────────────────────────
 * Bascule automatique entre l'Émulateur local (dev) et Firebase Prod (production).
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "archi-cam-ai-prod.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "archi-cam-ai-prod",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "archi-cam-ai-prod.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:mock",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connexion automatique aux émulateurs si FIREBASE_USE_EMULATOR=true
const useEmulator = process.env.FIREBASE_USE_EMULATOR === "true";

if (useEmulator && typeof window !== "undefined") {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    console.log("[Firebase Client] 🛠️ Connecté aux émulateurs locaux (Auth: 9099, Firestore: 8080, Storage: 9199)");
  } catch (err) {
    // Intercepte les reconnexions multiples en hot-reload
  }
}
