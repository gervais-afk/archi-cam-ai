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

const YOLO_FASTAPI_URL = process.env.YOLO_SERVICE_URL || "http://127.0.0.1:8000/segment";

export async function segmentPlanWithYolo(
  imageBufferOrPath: Buffer | string,
  options?: { confidence?: number; inputType?: "digital" | "sketch" }
): Promise<YoloSegmentationResult | null> {
  const YOLO_TIMEOUT_MS = parseInt(process.env.YOLO_TIMEOUT_MS || "1800000", 10);
  let tmpFilePath: string | null = null;

  try {
    if (typeof imageBufferOrPath === "string") {
      if (imageBufferOrPath.toLowerCase().endsWith(".pdf")) {
        const pngPath = imageBufferOrPath.replace(/\.pdf$/i, ".png");
        if (fs.existsSync(pngPath)) {
          console.log(`[YOLO Bridge] Guard PDF: Redirection automatique du .pdf vers sa conversion .png générée.`);
          tmpFilePath = pngPath;
        } else {
          console.warn(`[YOLO Bridge] Guard: Fichier PDF détecté (${imageBufferOrPath}) sans équivalent PNG. YOLO ne peut pas lire les PDF. Annulation de l'envoi.`);
          return null;
        }
      } else {
        if (!fs.existsSync(imageBufferOrPath)) {
          console.warn(`[YOLO Bridge] Notice: Fichier image introuvable : ${imageBufferOrPath}`);
          return null;
        }
        tmpFilePath = imageBufferOrPath;
      }
    } else {
      const os = await import("os");
      tmpFilePath = path.join(os.tmpdir(), `yolo_input_${Date.now()}_${Math.random().toString(36).substring(7)}.png`);
      fs.writeFileSync(tmpFilePath, imageBufferOrPath);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), YOLO_TIMEOUT_MS);

    const formData = new FormData();
    const fileBuffer = fs.readFileSync(tmpFilePath);
    const fileBlob = new Blob([fileBuffer], { type: "image/png" });
    formData.append("file", fileBlob, "clean_plan.png");

    const conf = options?.confidence ?? (options?.inputType === "sketch" ? 0.35 : 0.5);
    const inType = options?.inputType ?? "digital";
    const requestUrl = `${YOLO_FASTAPI_URL}?confidence=${conf}&input_type=${inType}`;

    const res = await fetch(requestUrl, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data: YoloSegmentationResult = await res.json();
      
      // ── GARDE-FOU ANTI-SUR-SEGMENTATION ────────────────────────────────────
      // Même si le service Python sous-jacent renvoie 39 micro-zones (hachures, bruit),
      // on filtre ici pour ne conserver que les 6 à 10 vraies pièces habitables.
      if (data.rooms && data.rooms.length > 0) {
        const validRooms = data.rooms
          .filter((r) => (r.estimated_m2 ? r.estimated_m2 >= 4.0 : r.area_pixels >= 10000))
          .sort((a, b) => (b.estimated_m2 || b.area_pixels) - (a.estimated_m2 || a.area_pixels))
          .slice(0, 10);

        data.rooms = validRooms.length > 0 ? validRooms : data.rooms.slice(0, 6);
        data.room_count = data.rooms.length;
      }

      console.log(`[YOLO Bridge] 🎯 Segmentation filtrée & validée (${data.room_count} pièces principales conservées).`);
      return data;
    } else {
      console.warn(`[YOLO Bridge] Code HTTP ${res.status} de FastAPI. Basculement sur fallback OpenCV.`);
      return null;
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.warn(`[YOLO Bridge] Timeout (${YOLO_TIMEOUT_MS / 1000}s) du microservice FastAPI. Basculement sur fallback OpenCV.`);
    } else {
      console.warn(`[YOLO Bridge] Microservice FastAPI non détecté ou erreur de requête: ${err.message}. Fallback OpenCV actif.`);
    }
    return null;
  } finally {
    if (typeof imageBufferOrPath !== "string" && tmpFilePath && fs.existsSync(tmpFilePath)) {
      try {
        fs.unlinkSync(tmpFilePath);
      } catch (e) {
        console.warn(`[YOLO Bridge] Impossible de supprimer le fichier temporaire : ${tmpFilePath}`);
      }
    }
  }
}
