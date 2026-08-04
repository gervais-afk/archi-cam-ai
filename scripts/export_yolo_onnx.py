#!/usr/bin/env python3
# -*- font-encoding: utf-8 -*-
"""
EXPORT YOLOV8-SEG TOWARDS ONNX (CPU ONLY) — ARCHI CAM AI
─────────────────────────────────────────────────────────
Télécharge yolov8n-seg.pt (nano 6 Mo) et l'exporte en format ONNX CPU.
"""

import os
import sys

def export_onnx():
    try:
        from ultralytics import YOLO
    except ImportError:
        print("⚠️ Ultralytics n'est pas installé. Pour exporter, exécutez : pip install ultralytics")
        sys.exit(1)

    output_dir = os.path.join(os.path.dirname(__file__), "..", "services", "yolo_segmentation")
    os.makedirs(output_dir, exist_ok=True)
    onnx_target = os.path.join(output_dir, "yolov8n-seg.onnx")

    print("📥 Téléchargement et export du modèle YOLOv8n-Seg en format ONNX CPU...")
    model = YOLO("yolov8n-seg.pt")
    model.export(format="onnx", imgsz=640, simplify=True)
    print(f"✨ Export terminé ! Modèle ONNX prêt dans : {onnx_target}")

if __name__ == "__main__":
    export_onnx()
