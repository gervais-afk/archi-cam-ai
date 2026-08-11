#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PRÉTRAITEMENT INTELLIGENT DE PLANS D'ARCHITECTE — ARCHI CAM AI
─────────────────────────────────────────────────────────────
Charge les fichiers PDF vectoriels ou images HD, corrige la rotation,
débruite et sépare le calque des murs épais du calque des textes fins.
"""

import os
import sys
import numpy as np
import cv2

# Encodage console universel
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

class PlanPreprocessor:
    def __init__(self, dpi: int = 300):
        self.dpi = dpi
    
    def load(self, path: str) -> np.ndarray:
        """Charge un fichier PDF ou une image en haute définition 300 DPI."""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Fichier introuvable : {path}")
            
        if path.lower().endswith(".pdf"):
            # Tentative via pypdfium2 (haute vitesse et 0 dépendance poppler)
            try:
                import pypdfium2 as pdfium
                pdf = pdfium.PdfDocument(path)
                page = pdf[0]
                # Rendu en 300 DPI
                scale = self.dpi / 72.0
                bitmap = page.render(scale=scale)
                pil_image = bitmap.to_pil()
                img = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                return img
            except ImportError:
                pass
                
            # Fallback pdf2image
            try:
                from pdf2image import convert_from_path
                images = convert_from_path(path, dpi=self.dpi)
                img = np.array(images[0])
                return cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            except Exception as e:
                raise RuntimeError(f"Erreur conversion PDF en image : {e}")
        else:
            img = cv2.imread(path, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError(f"Impossible de décoder l'image : {path}")
            return img

    def clean(self, img: np.ndarray) -> dict:
        """Nettoie et sépare l'image en couches sémantiques (murs, textes, contours)."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 1. Débruitage bilatéral préservant les arêtes
        denoised = cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)
        
        # 2. Binarisation franche (fond blanc = 0, murs/encres noirs = 255)
        _, binary = cv2.threshold(denoised, 210, 255, cv2.THRESH_BINARY_INV)
        
        # 3. Détection et correction automatique de la rotation (si scan penché)
        angle = self._detect_rotation(binary)
        if abs(angle) > 0.5:
            binary = self._rotate(binary, angle)
            gray = self._rotate(gray, angle)
            img = self._rotate(img, angle)
            
        # 4. Séparation des couches :
        # - Murs : traits continus (>= 2px)
        walls_layer = self._extract_thick_lines(binary, min_thickness=2)
        text_layer = self._extract_thin_features(binary, max_size=30)
        
        return {
            "original": img,
            "gray": gray,
            "binary": binary,
            "walls_layer": walls_layer,
            "text_layer": text_layer,
            "rotation_angle": angle
        }

    def _detect_rotation(self, binary: np.ndarray) -> float:
        """Détecte l'angle d'inclinaison principal du plan via la transformée de Hough."""
        edges = cv2.Canny(binary, 50, 150)
        lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=150)
        if lines is None:
            return 0.0
        
        angles = []
        for rho, theta in lines[:25, 0]:
            angle_deg = np.degrees(theta) - 90
            if -30 < angle_deg < 30:
                angles.append(angle_deg)
                
        return float(np.median(angles)) if angles else 0.0

    def _rotate(self, img: np.ndarray, angle: float) -> np.ndarray:
        """Fait pivoter l'image pour l'aligner parfaitement sur la grille orthogonale."""
        h, w = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    def _extract_thick_lines(self, binary: np.ndarray, min_thickness: int = 2) -> np.ndarray:
        """Isole les murs porteurs et cloisons en filtrant le bruit microscopique."""
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (min_thickness, min_thickness))
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
        return cleaned

    def _extract_thin_features(self, binary: np.ndarray, max_size: int = 35) -> np.ndarray:
        """Isole les textes, cotations et symboles techniques fins."""
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
        mask = np.zeros_like(binary)
        for i in range(1, num_labels):
            w = stats[i, cv2.CC_STAT_WIDTH]
            h = stats[i, cv2.CC_STAT_HEIGHT]
            area = stats[i, cv2.CC_STAT_AREA]
            if w < max_size and h < max_size and area > 10:
                mask[labels == i] = 255
        return mask
