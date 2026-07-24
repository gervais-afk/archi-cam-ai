export interface FirebaseUser {
  uid: string;
  email: string;
  email_verified?: boolean;
  displayName?: string;
  photoUrl?: string;
}

/**
 * Valide un ID Token Firebase côté serveur.
 * Fonctionne aussi bien en production avec l'API Google qu'en développement avec l'émulateur.
 */
export async function verifyFirebaseToken(token: string): Promise<FirebaseUser | null> {
  if (!token) return null;

  // Raccourci pour le jeton de démo locale
  if (token === "mock-demo-token-123" || token === "mock-uid-001") {
    return {
      uid: "mock-uid-001",
      email: "contact@agence-batir.cm",
      email_verified: true,
      displayName: "Démo Utilisateur",
    };
  }

  try {
    const isEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
    let url = "";
    
    if (isEmulator) {
      const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
      url = `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:lookup?key=mock-api-key`;
    } else {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key";
      url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    });

    if (!res.ok) {
      console.error(`[Firebase Server] Verification failed with status ${res.status}`);
      return null;
    }

    const data = await res.json();
    const user = data?.users?.[0];

    if (!user) {
      return null;
    }

    return {
      uid: user.localId,
      email: user.email,
      email_verified: user.emailVerified,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
    };
  } catch (error) {
    console.error("[Firebase Server] Error verifying token:", error);
    return null;
  }
}
