import fs from "fs";
import path from "path";

/**
 * PONT TYPESCRIPT YOLOv8-Seg — ARCHI CAM AI
 * ─────────────────────────────────────────
 * Effectue l'appel HTTP vers le microservice FastAPI (http://localhost:8000/segment).
 * En cas d'absence du service (service non démarré), applique un FALLBACK GRACIEUX
 * vers le pipeline OpenCV déterministe sans interrompre la génération.
 */

export interface YoloRoom {
  id: string;
  area_pixels: number;
  estimated_m2: number;
  polygon: [number, number][];
}

export interface YoloSegmentationResult {
  status: string;
  engine: string;
  width: number;
  height: number;
  room_count: number;
  rooms: YoloRoom[];
  masks?: {
    walls_base64?: string;
  };
  fallback?: boolean;
}

const YOLO_FASTAPI_URL = process.env.YOLO_SERVICE_URL || "http://localhost:8000/segment";

export async function segmentPlanWithYolo(
  imageBufferOrPath: Buffer | string
): Promise<YoloSegmentationResult | null> {
  try {
    let buffer: Buffer;

    if (typeof imageBufferOrPath === "string") {
      if (!fs.existsSync(imageBufferOrPath)) {
        console.warn(`[YOLO Bridge] Notice: Fichier image introuvable : ${imageBufferOrPath}`);
        return null;
      }
      buffer = fs.readFileSync(imageBufferOrPath);
    } else {
      buffer = imageBufferOrPath;
    }

    // Timeout de sécurité de 3.5s sur l'appel au microservice FastAPI
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const blob = new Blob([new Uint8Array(buffer)], { type: "image/png" });
    const formData = new FormData();

    formData.append("file", blob, "clean_plan.png");

    const res = await fetch(YOLO_FASTAPI_URL, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data: YoloSegmentationResult = await res.json();
      console.log(`[YOLO Bridge] 🚀 Segmentation effectuée via ${data.engine} (${data.room_count} pièces trouvées).`);
      return data;
    } else {
      console.warn(`[YOLO Bridge] Code HTTP ${res.status} de FastAPI. Basculement sur fallback OpenCV.`);
      return null;
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.warn("[YOLO Bridge] Timeout (3.5s) du microservice FastAPI. Basculement sur fallback OpenCV.");
    } else {
      console.warn("[YOLO Bridge] Microservice FastAPI non détecté sur le port 8000. Fallback OpenCV actif.");
    }
    return null;
  }
}
