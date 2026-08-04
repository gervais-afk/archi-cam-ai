#!/usr/bin/env python3
# -*- font-encoding: utf-8 -*-
"""
FASTAPI MICROSERVICE — YOLOv8-Seg PLAN SEGMENTATION (PORT 8000)
───────────────────────────────────────────────────────────────
Micro-service ultra-léger pour la segmentation sémantique des plans d'architecte.
Exécution CPU haute vitesse (0 dépendance GPU CUDA).
"""

import os
import sys
import gc
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from inference import yolo_segmenter

app = FastAPI(
    title="Archi Cam AI — YOLOv8-Seg Microservice",
    version="1.0.0",
    description="Microservice de segmentation sémantique de plans d'architecte (CPU ONNX Runtime)"
)

# Configuration CORS pour autoriser les requêtes Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "engine": "ONNXRuntime_CPU",
        "has_onnx_session": yolo_segmenter.session is not None,
        "service": "YOLOv8-Seg Architectural Segmentation"
    }

@app.post("/segment")
async def segment_plan(file: UploadFile = File(...)):
    """
    Segmentation sémantique d'un plan d'architecte (_clean_plan.png).
    Retourne les masques vectoriels et la liste des pièces segmentées.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image (PNG/JPG).")

    try:
        contents = await file.read()
        result = yolo_segmenter.segment(contents)
        
        # Nettoyage explicite de la mémoire
        gc.collect()
        return result
    except Exception as e:
        gc.collect()
        raise HTTPException(status_code=500, detail=f"Erreur d'inférence : {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False, workers=2)
