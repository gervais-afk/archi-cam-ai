/**
 * 📂 UNIFIED FILE STORAGE ADAPTER — ARCHI CAM AI
 * ───────────────────────────────────────────────
 * Switch automatique : Disque local en développement vs Firebase Storage en Production Vercel.
 */

import fs from "fs/promises";
import path from "path";
import { storage } from "@/lib/firebase/firebase-production";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const IS_PRODUCTION = process.env.NODE_ENV === "production" && process.env.FIREBASE_USE_EMULATOR !== "true";

export async function saveRenderedImage(
  buffer: Buffer,
  filename: string,
  userId: string
): Promise<string> {
  if (IS_PRODUCTION) {
    try {
      const storageRef = ref(storage, `renders/${userId}/${filename}`);
      await uploadBytes(storageRef, buffer, { contentType: "image/png" });
      const url = await getDownloadURL(storageRef);
      console.log(`[File Storage Prod] ☁️ Image rendue téléversée vers Firebase Storage: ${url}`);
      return url;
    } catch (e: any) {
      console.warn("[File Storage Prod Warning] Erreur Firebase Storage, fallback disque local:", e.message);
    }
  }

  // Fallback / Développent local
  const localDir = path.join(process.cwd(), "public", "renders");
  await fs.mkdir(localDir, { recursive: true });
  const localPath = path.join(localDir, filename);
  await fs.writeFile(localPath, buffer);
  return `/renders/${filename}`;
}

export async function savePlanUpload(
  buffer: Buffer,
  filename: string,
  userId: string
): Promise<string> {
  if (IS_PRODUCTION) {
    try {
      const storageRef = ref(storage, `plans/${userId}/${filename}`);
      await uploadBytes(storageRef, buffer);
      const url = await getDownloadURL(storageRef);
      console.log(`[File Storage Prod] ☁️ Plan source téléversé vers Firebase Storage: ${url}`);
      return url;
    } catch (e: any) {
      console.warn("[File Storage Prod Warning] Erreur Firebase Storage plan, fallback disque local:", e.message);
    }
  }

  // Fallback / Développement local
  const localDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(localDir, { recursive: true });
  const localPath = path.join(localDir, filename);
  await fs.writeFile(localPath, buffer);
  return localPath;
}
