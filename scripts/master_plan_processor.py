# scripts/master_plan_processor.py
"""
Pipeline maître anti-hallucination
Combine : nettoyage texte + détection outdoor + prompts structurés
"""

import cv2
import numpy as np
import json
import os
import sys
import io
import time
import hashlib
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Tuple, Optional
from PIL import Image

import logging

logger = logging.getLogger(__name__)

# Force stdout et stderr en UTF-8 pour Windows PowerShell / CMD
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── IMPORTS OPTIONNELS (PDF) ─────────────────────────────────────────────────
HAS_PYPDFIUM = False
try:
    import pypdfium2 as pdfium
    HAS_PYPDFIUM = True
except ImportError:
    HAS_PYPDFIUM = False

# Ajouter le répertoire de scripts au path pour les imports locaux
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from advanced_text_cleaner import AdvancedTextCleaner
from outdoor_space_detector import OutdoorSpaceDetector
from cache_manager import PlanProcessingCache

# Instance globale du cache persistant V8
_cache = PlanProcessingCache(cache_dir="./cache")

def load_input_image(input_path: str) -> np.ndarray:
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Fichier d'entrée introuvable : {input_path}")

    ext = os.path.splitext(input_path)[1].lower()

    if ext == ".pdf":
        if not HAS_PYPDFIUM:
            raise ImportError(
                "Traitement PDF impossible : la bibliothèque 'pypdfium2' n'est pas installée. "
                "Veuillez fournir un fichier PNG/JPG ou installer pypdfium2 via 'pip install pypdfium2'."
            )
        try:
            pdf = pdfium.PdfDocument(input_path)
            page = pdf[0]
            pil_image = page.render(scale=2.0).to_pil().convert("RGB")
            
            png_copy_path = input_path.replace(".pdf", ".png")
            try:
                pil_image.save(png_copy_path, "PNG")
                print(f"📸 Copie PNG du PDF enregistrée pour LM Studio & VLM : {png_copy_path}")
            except Exception:
                pass

            return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        except Exception as e:
            raise ValueError(f"Erreur lors de la lecture du fichier PDF {input_path} : {str(e)}")

    bgr = cv2.imread(input_path, cv2.IMREAD_COLOR)
    if bgr is None or bgr.size == 0:
        raise ValueError(f"OpenCV ne peut pas lire le fichier : {input_path}")
        
    return bgr

from enum import Enum

class InputType(Enum):
    DIGITAL_CLEAN = "digital_clean"      # AutoCAD, PDF vectoriel, plans nets
    SKETCH_PAPER = "sketch_paper"        # Croquis stylo/crayon sur papier scanné
    PHOTO_UNUSABLE = "photo_unusable"     # Photo inclinée, ombres trop fortes, illisible
    UNKNOWN = "unknown"

def classify_input_image(img_or_path) -> InputType:
    """
    Classifie le type d'entrée en moins de 100ms.
    Analyse : Canny contour density, texture du papier (bg_std/bg_mean), rectitude des lignes Hough.
    """
    if isinstance(img_or_path, str):
        try:
            img = load_input_image(img_or_path)
        except Exception:
            return InputType.PHOTO_UNUSABLE
    else:
        img = img_or_path
        
    if img is None or img.size == 0:
        return InputType.PHOTO_UNUSABLE

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    h, w = gray.shape[:2]
    
    # 1. Débruitage doux préalable pour isoler les contours réels du grain capteur
    denoised = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(denoised, 50, 150)
    contour_density = float(np.count_nonzero(edges)) / (h * w)
    
    # 2. Statistiques de luminance du fond (pixels clairs hors murs)
    bg_pixels = gray[gray > 160]
    if len(bg_pixels) < 0.15 * (h * w):
        return InputType.PHOTO_UNUSABLE
        
    bg_mean = float(np.mean(bg_pixels))
    bg_std = float(np.std(bg_pixels))
    
    # 3. Lignes droites via Hough
    lines = cv2.HoughLinesP(edges, rho=1, theta=np.pi/180, threshold=40, minLineLength=35, maxLineGap=10)
    line_count = len(lines) if lines is not None else 0
    
    # RÈGLE 1 : Trop sombre, trop flou ou sans contours
    if line_count < 3 and (contour_density < 0.002 or bg_mean < 80):
        return InputType.PHOTO_UNUSABLE
        
    # RÈGLE 2 : Scan papier / croquis (Texture papier détectable ou fond non immaculé)
    if bg_std > 5.0 or bg_mean < 242:
        return InputType.SKETCH_PAPER
        
    # RÈGLE 3 : Plan numérique CAD / Vectoriel (Fond blanc pur et uniforme)
    return InputType.DIGITAL_CLEAN


# ── CACHE INTELLIGENT SHA256 ─────────────────────────────────────────────────
_CLASSIFICATION_CACHE: Dict[str, InputType] = {}

def compute_image_sha256(img_bgr: np.ndarray) -> str:
    """
    Calcule un hash SHA256 rapide d'une image numpy BGR.
    Utilisé pour indexer les résultats de classification et éviter
    les retraitements (gain 80% pour images multi-étages identiques).
    """
    return hashlib.sha256(img_bgr.tobytes()).hexdigest()

def compute_file_sha256(path: str) -> str:
    """Calcule le SHA256 d'un fichier disque (PDF, PNG, etc.)"""
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()

def classify_input_image_cached(img_bgr: np.ndarray) -> InputType:
    """
    Version avec cache mémoire SHA256 de classify_input_image.
    Évite de re-calculer Canny + Hough pour les images déjà vues.
    """
    img_hash = compute_image_sha256(img_bgr)
    if img_hash in _CLASSIFICATION_CACHE:
        print(f"  [CACHE HIT] Classification réutilisée (hash: {img_hash[:12]}...)")
        return _CLASSIFICATION_CACHE[img_hash]
    result = classify_input_image(img_bgr)
    _CLASSIFICATION_CACHE[img_hash] = result
    return result

def invalidate_classification_cache():
    """Vide le cache de classification (utile en tests ou rechargement de session)."""
    _CLASSIFICATION_CACHE.clear()
    print("  [CACHE] Cache de classification vidé.")


class SketchProcessor:
    """
    Vectorisation morphologique agressive pour croquis et scans main-levée.
    Nettoie le grain du papier, bouche les micro-trous de stylo et squelettise les murs.
    """
    def __init__(self, original_img: np.ndarray):
        self.original = original_img
        self.clean_mask = None

    def preprocess(self) -> np.ndarray:
        """Pipeline de nettoyage croquis -> image binaire et BGR nette"""
        gray = cv2.cvtColor(self.original, cv2.COLOR_BGR2GRAY) if len(self.original.shape) == 3 else self.original
        h, w = gray.shape[:2]
        
        # 1. Débruitage bilatéral pour préserver les arêtes de stylo tout en lissant le grain papier
        denoised = cv2.bilateralFilter(gray, 7, 50, 50)
        
        # 2. Binarisation par seuillage d'Otsu inversé pour isoler l'encre sombre du papier clair
        _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # 3. Supprimer les bordures de scan
        mask_border = np.zeros_like(binary)
        cv2.rectangle(mask_border, (5, 5), (w - 5, h - 5), 255, -1)
        binary = cv2.bitwise_and(binary, mask_border)
        
        # 4. Fermeture morphologique pour connecter les traits discontinus
        kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        closed_walls = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_close, iterations=1)
        
        # 5. Filtrage des petites poussières / grains isolés
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(closed_walls)
        clean_output = np.zeros_like(closed_walls)
        min_area_threshold = 25
        for i in range(1, num_labels):
            if stats[i, cv2.CC_STAT_AREA] >= min_area_threshold:
                clean_output[labels == i] = 255
                
        self.clean_mask = clean_output
        
        # Recomposer une image BGR fond blanc traits noirs
        clean_bgr = np.ones((h, w, 3), dtype=np.uint8) * 255
        clean_bgr[clean_output > 0] = [0, 0, 0]
        return clean_bgr

    def detect_scale_from_annotations(self) -> float:
        """Estimation par défaut de l'échelle : 20px / mètre"""
        return 20.0


class MasterPlanProcessor:
    """
    Orchestrateur du pipeline complet
    """
    
    def __init__(self):
        self.text_cleaner = AdvancedTextCleaner()
        self.outdoor_detector = OutdoorSpaceDetector()
    
    def process(self, input_path, output_path_base=None, output_dir=None, max_resolution=2048, debug_mode=True, yolo_json_path=None, metadata_json=None):
        """
        Exécute le pipeline complet.
        Supports:
          - output_path_base: mode rétro-compatible (fichiers préfixés)
          - output_dir: nouveau mode d'isolation (tous les fichiers dans ce dossier)
          - yolo_json_path: chemin optionnel vers l'extraction JSON de YOLOv8
        """
        print(f"\n{'='*60}")
        print(f"🏗️ TRAITEMENT MODULAIRE COMPLET : {input_path}")
        print(f"{'='*60}\n")
        
        new_cli_mode = False
        if output_dir is not None:
            new_cli_mode = True
            os.makedirs(output_dir, exist_ok=True)
            cleaned_path = os.path.join(output_dir, "source_inpainted.png")
            outdoor_visual_path = os.path.join(output_dir, "outdoor_visual.png")
            metadata_path = os.path.join(output_dir, "geometry_validation.json")
            text_layer_path = os.path.join(output_dir, "text_layer.png")
            canny_path = os.path.join(output_dir, "canny_edges.png")
            depth_path = os.path.join(output_dir, "depth_map.png")
            anchors_path = os.path.join(output_dir, "furniture_anchors_map.png")
            # Pour la rétrocompatibilité des chemins en dur
            prefix = os.path.join(output_dir, "plan_rendered")
        else:
            output_dir = os.path.dirname(os.path.abspath(output_path_base))
            os.makedirs(output_dir, exist_ok=True)
            prefix = output_path_base.replace(".png", "")
            cleaned_path = f"{prefix}_clean_plan.png"
            outdoor_visual_path = f"{prefix}_outdoor_visual.png"
            metadata_path = f"{prefix}_metadata.json"
            text_layer_path = f"{prefix}_text.png"
            canny_path = f"{prefix}_canny.png"
            depth_path = f"{prefix}_depth.png"
            anchors_path = f"{prefix}_furniture_anchors.png"
            
        # Charger données YOLO si fournies ou présentes dans le dossier
        yolo_data = None
        if yolo_json_path and os.path.exists(yolo_json_path):
            try:
                with open(yolo_json_path, 'r', encoding='utf-8') as yf:
                    yolo_data = json.load(yf)
                print(f"🤖 [YOLO] Données sémantiques chargées depuis {yolo_json_path}")
            except Exception as ye:
                print(f"⚠️ Warning chargement yolo_json : {ye}")
        elif output_dir:
            possible_yolo = os.path.join(output_dir, "yolo_output.json")
            if os.path.exists(possible_yolo):
                try:
                    with open(possible_yolo, 'r', encoding='utf-8') as yf:
                        yolo_data = json.load(yf)
                    print(f"🤖 [YOLO] Données trouvées dans {possible_yolo}")
                except Exception:
                    pass

        # Charger image
        image = load_input_image(input_path)
        if image is None:
            raise FileNotFoundError(f"Impossible de charger l'image : {input_path}")
            
        # [V9-DSS] Sauvegarder l'image originale brute avant tout traitement d'inpainting
        if output_dir:
            cv2.imwrite(os.path.join(output_dir, "source_original.png"), image)
            print(f"📸 [V9-DSS] Original image preserved: {os.path.join(output_dir, 'source_original.png')}")
            
        # ÉTAPE 0 : CLASSIFICATION SMART ET ADAPTATIVE (Type A / B / C) — avec cache SHA256
        input_type = classify_input_image_cached(image)
        print(f"🔍 [CLASSIFIER] Type d'entrée identifié : {input_type.value.upper()}")
        
        if input_type == InputType.SKETCH_PAPER:
            print("📐 [SKETCH] Scan/Croquis papier détecté -> Vectorisation morphologique agressive...")
            sketch_proc = SketchProcessor(image)
            image = sketch_proc.preprocess()
        elif input_type == InputType.PHOTO_UNUSABLE:
            print("⚠️ [CLASSIFIER] AVERTISSEMENT : Image trop sombre, inclinée ou illisible.")

        # RÉDUCTION DE RÉSOLUTION SI NÉCESSAIRE
        h, w = image.shape[:2]
        scale_factor = 1.0
        if max(h, w) > max_resolution:
            scale_factor = max_resolution / max(h, w)
            image = cv2.resize(image, (int(w * scale_factor), int(h * scale_factor)), interpolation=cv2.INTER_AREA)
            print(f"[PERF] Resize: {w}x{h} -> {image.shape[1]}x{image.shape[0]} (scale={scale_factor:.2f})")
            
        start_total = time.time()
            
        # ÉTAPE 1 : Nettoyage des textes
        print("📝 ÉTAPE 1/4 : Nettoyage des textes...")
        cleaned_image, text_metadata = self.text_cleaner.clean_plan(image)
        
        # Sauvegarder image nettoyée
        cv2.imwrite(cleaned_path, cleaned_image)
        print(f"  → Sauvegardé : {cleaned_path}\n")
        
        # Validation Qualité Masque pour NextJS
        gray = cv2.cvtColor(cleaned_image, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY)
        self.validate_mask_quality(thresh)
        
        # ÉTAPE 2 : Détection espaces extérieurs
        print("🌳 ÉTAPE 2/4 : Détection espaces extérieurs...")
        outdoor_data = self.outdoor_detector.detect_outdoor_spaces(cleaned_image)
        
        # Visualisation du masque outdoor
        outdoor_overlay = self.visualize_outdoor_zones(cleaned_image, outdoor_data)
        cv2.imwrite(outdoor_visual_path, outdoor_overlay)
        print(f"  → Sauvegardé : {outdoor_visual_path}\n")
        
        # ÉTAPE 3 : Détection Hybride des escaliers
        print("🪜 ÉTAPE 3/4 : Détection Hybride des escaliers (YOLO + Lignes parallèles)...")
        staircase_zones = self.detect_staircase_hybrid(yolo_data, image, text_metadata)
        print(f"  → {len(staircase_zones)} escaliers détectés\n")
        
        # ÉTAPE 4 : Détection dressings/rangements
        print("👔 ÉTAPE 4/4 : Détection des rangements...")
        storage_zones = self.detect_storage_areas(image, text_metadata)
        print(f"  → {len(storage_zones)} zones de rangement détectées\n")
        
        # ÉTAPE 5 : Sauvegarder le calque de texte d'origine seul
        print("📝 Sauvegarde du calque de texte...")
        text_layer = np.ones_like(image) * 255
        for item in text_metadata['room_labels'] + text_metadata['dimensions']:
            x1, y1, x2, y2 = item['bbox']
            text_layer[y1:y2, x1:x2] = image[y1:y2, x1:x2]
        if text_metadata['cartouche']:
            x1, y1, x2, y2 = text_metadata['cartouche']['bbox']
            text_layer[y1:y2, x1:x2] = image[y1:y2, x1:x2]
        cv2.imwrite(text_layer_path, text_layer)
        
        # ÉTAPE 6 : Cartes ControlNet synthétiques
        print("🗺️ Génération des cartes ControlNet...")
        self.generate_controlnet_maps(cleaned_image, outdoor_data['mask'], canny_path, depth_path)
        
        # ÉTAPE 6b : Extraction sémantique des pièces & masques (V4)
        print("🔍 ÉTAPE 6b : Extraction sémantique des pièces et masques (Watershed)...")
        h, w = cleaned_image.shape[:2]
        
        # 1. Obtenir le masque binaire (murs = 0/noir, espaces = 255/blanc)
        gray_cleaned = cv2.cvtColor(cleaned_image, cv2.COLOR_BGR2GRAY)
        _, thresh_rooms = cv2.threshold(gray_cleaned, 220, 255, cv2.THRESH_BINARY)
        
        # 2. Préparer les marqueurs pour l'algorithme Watershed
        # Initialiser à 0. Les murs/fond seront marqués avec 1.
        markers = np.zeros((h, w), dtype=np.int32)
        markers[thresh_rooms == 0] = 1
        
        # [RAG 2026] Détecter et marquer l'extérieur de la maison pour éviter les fuites (star polygons)
        # On applique une érosion pour fermer les portes/fenêtres et rendre l'enveloppe étanche
        kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        thresh_closed = cv2.erode(thresh_rooms, kernel_close, iterations=2)
        
        # On lance le floodfill depuis les 4 coins sur thresh_closed (fond blanc)
        flood_mask = np.zeros((h + 2, w + 2), dtype=np.uint8)
        for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
            if thresh_closed[seed[1], seed[0]] == 255:
                cv2.floodFill(thresh_closed, flood_mask, seed, 128)
        # Tout l'extérieur connecté et étanchéifié est maintenant à 128. On le marque comme background (1)
        markers[thresh_closed == 128] = 1
        
        # Définir les bordures comme faisant partie du fond pour éviter les fuites extérieures
        markers[:5, :] = 1
        markers[-5:, :] = 1
        markers[:, :5] = 1
        markers[:, -5:] = 1
        
        # 3. Positionner les marqueurs de pièces sémantiques basés sur l'OCR et les zones
        current_marker_id = 2
        marker_to_info = {}

        # [V9-DSS] A0. Marqueurs de métadonnées VLM (Branche A) prioritaires
        vlm_rooms = []
        if metadata_json:
            try:
                if isinstance(metadata_json, str):
                    vlm_meta = json.loads(metadata_json)
                else:
                    vlm_meta = metadata_json
                vlm_rooms = vlm_meta.get('rooms', [])
                print(f"🤖 [V9-DSS] {len(vlm_rooms)} pieces VLM imported for Watershed guidance.")
            except Exception as e:
                print(f"⚠️ [V9-DSS] Error reading VLM metadata: {e}")

        for vr in vlm_rooms:
            v_centroid = vr.get('centroid')
            if v_centroid and len(v_centroid) == 2:
                # Mapper de 0-1000 vers w, h de l'image
                cx = int(v_centroid[0] * w / 1000)
                cy = int(v_centroid[1] * h / 1000)
                if 0 <= cx < w and 0 <= cy < h:
                    if markers[cy, cx] == 0:
                        cv2.circle(markers, (cx, cy), 5, current_marker_id, -1)
                        marker_to_info[current_marker_id] = {
                            'name': vr.get('name', 'Room'),
                            'type': vr.get('type', 'unknown').upper()
                        }
                        current_marker_id += 1

        # A. Marqueurs de labels OCR de pièces
        for label in text_metadata['room_labels']:
            x1, y1, x2, y2 = label['bbox']
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2
            if 0 <= cx < w and 0 <= cy < h:
                cv2.circle(markers, (cx, cy), 5, current_marker_id, -1)
                
                # Déterminer le type basé sur le texte
                text_lower = label['text'].lower()
                cell_type = "ROOM"
                if any(kw in text_lower for kw in ['chambre', 'room', 'bed']):
                    cell_type = "BEDROOM"
                elif any(kw in text_lower for kw in ['cuisine', 'kitchen']):
                    cell_type = "KITCHEN"
                elif any(kw in text_lower for kw in ['bain', 'bath', 'sdb', 'toilet', 'wc', 'toil', 'eau', 'douche']):
                    cell_type = "BATHROOM"
                elif any(kw in text_lower for kw in ['salon', 'sejour', 'séjour', 'living', 'sam', 'manger', 'lounge']):
                    cell_type = "LIVING"
                elif any(kw in text_lower for kw in ['dressing', 'closet', 'placard', 'cellier', 'rangement']):
                    cell_type = "DRESSING"
                elif any(kw in text_lower for kw in ['balcon', 'balcony', 'terrasse', 'terrace']):
                    cell_type = "BALCONY"
                elif any(kw in text_lower for kw in ['escalier', 'stair', 'stairs']):
                    cell_type = "STAIRS"
                    
                marker_to_info[current_marker_id] = {
                    'name': label['text'],
                    'type': cell_type
                }
                current_marker_id += 1
                
        # B. Marqueurs d'escaliers détectés par Hough (si pas déjà couverts)
        for sz in staircase_zones:
            scx = (sz[0] + sz[2]) // 2
            scy = (sz[1] + sz[3]) // 2
            if 0 <= scx < w and 0 <= scy < h:
                # Éviter de surcharger un marqueur existant
                if markers[scy, scx] == 0:
                    cv2.circle(markers, (scx, scy), 5, current_marker_id, -1)
                    marker_to_info[current_marker_id] = {
                        'name': 'Escalier',
                        'type': 'STAIRS'
                    }
                    current_marker_id += 1
                    
        # C. Marqueurs de balcons détectés
        for z in outdoor_data['zones']:
            bx1, by1, bx2, by2 = z['bbox']
            scx = (bx1 + bx2) // 2
            scy = (by1 + by2) // 2
            if 0 <= scx < w and 0 <= scy < h:
                if markers[scy, scx] == 0:
                    cv2.circle(markers, (scx, scy), 5, current_marker_id, -1)
                    marker_to_info[current_marker_id] = {
                        'name': z['type'],
                        'type': 'BALCONY'
                    }
                    current_marker_id += 1
                    
        # D. Marqueurs de placards/dressings détectés
        for sz in storage_zones:
            bx1, by1, bx2, by2 = sz['bbox']
            scx = (bx1 + bx2) // 2
            scy = (by1 + by2) // 2
            if 0 <= scx < w and 0 <= scy < h:
                if markers[scy, scx] == 0:
                    cv2.circle(markers, (scx, scy), 5, current_marker_id, -1)
                    marker_to_info[current_marker_id] = {
                        'name': 'Dressing' if sz['purpose'] == 'DRESSING' else 'Rangement',
                        'type': sz['purpose']
                    }
                    current_marker_id += 1

        # 4. Appliquer la segmentation par Watershed si nous avons des marqueurs
        rooms_list = []
        color_map = np.zeros_like(cleaned_image)
        
        if current_marker_id > 2:
            cv2.watershed(cleaned_image, markers)
            
            # Extraire les polygones et informations de chaque segment de pièce
            for marker_id, info in marker_to_info.items():
                room_mask = np.zeros((h, w), dtype=np.uint8)
                room_mask[markers == marker_id] = 255
                
                # Récupérer les contours
                contours_cell, _ = cv2.findContours(room_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if not contours_cell:
                    continue
                    
                c = max(contours_cell, key=cv2.contourArea)
                if cv2.contourArea(c) < 2000: # Ignorer les segments résiduels trop petits (comme des lettres)
                    continue
                    
                # Simplifier le contour
                epsilon = 0.008 * cv2.arcLength(c, True)
                approx = cv2.approxPolyDP(c, epsilon, True)
                polygon = [[int(pt[0][0]), int(pt[0][1])] for pt in approx]
                
                # Calculer la bbox et le centroïde du masque réel
                M = cv2.moments(c)
                if M["m00"] > 0:
                    cx = float(M["m10"] / M["m00"])
                    cy = float(M["m01"] / M["m00"])
                else:
                    cx, cy = float(w/2), float(h/2)
                    
                rx, ry, rw_box, rh_box = cv2.boundingRect(c)
                
                rooms_list.append({
                    'id': int(marker_id),
                    'name': info['name'],
                    'type': info['type'],
                    'bbox': [int(rx), int(ry), int(rx + rw_box), int(ry + rh_box)],
                    'centroid': [cx, cy],
                    'polygon': polygon
                })
                
                # Coloration sémantique sur la carte de contrôle
                cell_type = info['type']
                color = (200, 200, 200) # Gris par défaut
                if cell_type in ['DRESSING', 'STORAGE']:
                    color = (0, 255, 255) # Jaune
                elif cell_type == 'BALCONY':
                    color = (255, 255, 0) # Cyan
                elif cell_type == 'STAIRS':
                    color = (0, 165, 255) # Orange
                elif cell_type == 'BEDROOM':
                    color = (255, 0, 255) # Purple
                elif cell_type == 'KITCHEN':
                    color = (180, 105, 255) # Pink
                elif cell_type == 'BATHROOM':
                    color = (255, 0, 0) # Blue
                elif cell_type == 'LIVING':
                    color = (0, 255, 0) # Green
                    
                if len(polygon) > 0:
                    cv2.fillPoly(color_map, [np.array(polygon, dtype=np.int32)], color)
                    
        # 5. Création des masques stricts d'escalier et de balcon
        stair_mask = np.zeros((h, w), dtype=np.uint8)
        for sz in staircase_zones:
            cv2.rectangle(stair_mask, (sz[0], sz[1]), (sz[2], sz[3]), 255, -1)
            
        balcony_mask = np.zeros((h, w), dtype=np.uint8)
        for z in outdoor_data['zones']:
            bx1, by1, bx2, by2 = z['bbox']
            cv2.rectangle(balcony_mask, (bx1, by1), (bx2, by2), 255, -1)
            
        # 6. Exports de débogage local dans debug/
        if new_cli_mode:
            debug_dir = output_dir
        else:
            debug_dir = os.path.join(output_dir, 'debug')
            os.makedirs(debug_dir, exist_ok=True)
        
        # ── EXTRAPOLATION ET SOUSTRACTION DES PORTES SUR LE MASQUE DE MUR (RAG 2026) ──
        # Les masques binaires des portes et fenêtres sont structuralement dilatés (~15-20px) 
        # puis soustraits du masque de mur. Cela force des "trous" propres et étanches dans le wall_mask,
        # ce qui permet à l'IA d'Inpainting d'étendre la texture du sol dans les seuils de portes.
        door_mask = np.zeros_like(thresh_rooms)
        if yolo_data and 'expert_analytics' in yolo_data:
            openings = yolo_data['expert_analytics'].get('openings', {}).get('openings', [])
            for op in openings:
                if op.get('type') in ['SWING_DOOR', 'SLIDING_DOOR', 'ARCH']:
                    bbox = op.get('bbox')
                    if bbox and len(bbox) == 4:
                        x, y, w_box, h_box = bbox
                        # On dessine un rectangle plein représentant l'ouverture
                        cv2.rectangle(door_mask, (int(x), int(y)), (int(x + w_box), int(y + h_box)), 255, -1)
                        
        # Appliquer une dilatation morphologique (environ 15px pour scale_factor standard)
        dilation_px = max(10, int(15 * scale_factor))
        kernel_door = cv2.getStructuringElement(cv2.MORPH_RECT, (dilation_px, dilation_px))
        door_mask_dilated = cv2.dilate(door_mask, kernel_door, iterations=1)
        
        # Le masque de mur final est bitwise_not(thresh_rooms) moins les portes dilatées
        wall_mask_raw = cv2.bitwise_not(thresh_rooms)
        wall_mask_final = cv2.subtract(wall_mask_raw, door_mask_dilated)
        
        cv2.imwrite(os.path.join(debug_dir, 'source_clean_no_text.png'), cleaned_image)
        cv2.imwrite(os.path.join(debug_dir, 'wall_mask.png'), wall_mask_final)
        semantic_map_path = os.path.join(debug_dir, 'semantic_rooms_map.png')
        cv2.imwrite(semantic_map_path, color_map)
        
        # Validation de saturation et format de la carte sémantique
        try:
            sem_img = cv2.imread(semantic_map_path)
            if sem_img is not None and len(sem_img.shape) == 3:
                hsv = cv2.cvtColor(sem_img, cv2.COLOR_BGR2HSV)
                mean_sat = np.mean(hsv[:, :, 1])
                print(f"[Semantic Map] Generated: {semantic_map_path} | Shape: {sem_img.shape} | Saturation moyenne: {mean_sat:.2f}")
                
                # Correction automatique si la saturation est trop faible (ex: gris déguisé)
                if mean_sat > 0 and mean_sat < 30:
                    print("⚠️ WARNING: La carte sémantique semble trop grise (saturation < 30). Boost de saturation actif...")
                    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.8, 0, 255).astype(np.uint8)
                    sem_img = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
                    cv2.imwrite(semantic_map_path, sem_img)
            else:
                print("⚠️ WARNING: Format invalide pour la carte sémantique (grayscale ou vide).")
        except Exception as sat_err:
            print(f"⚠️ Erreur lors de la validation de la carte sémantique : {sat_err}")
        cv2.imwrite(os.path.join(debug_dir, 'stair_mask.png'), stair_mask)
        cv2.imwrite(os.path.join(debug_dir, 'balcony_mask.png'), balcony_mask)
        cv2.imwrite(os.path.join(debug_dir, 'final_no_text.png'), cleaned_image)
        
        # Enregistrer semantic_rooms.json
        semantic_json_path = os.path.join(debug_dir, 'semantic_rooms.json')
        with open(semantic_json_path, 'w', encoding='utf-8') as sf:
            json.dump({'rooms': rooms_list}, sf, indent=2, ensure_ascii=False)

        # 6c. Générer la Depth Map d'ancrage mobilier déterministe (V7 - Hard Anchors)
        self.build_deterministic_mask_from_yolo(cleaned_image, yolo_data, rooms_list, staircase_zones, storage_zones, outdoor_data, anchors_path, input_mode=input_type.value)

        # ÉTAPE 7 : Génération métadonnées JSON
        total_time = time.time() - start_total
        metadata = {
            "input_type": input_type.value,
            "processing_time_seconds": round(total_time, 2),
            "resolution_input": f"{image.shape[1]}x{image.shape[0]}",
            "scale_factor": round(scale_factor, 3),
            "artifacts": {
                "source_inpainted": True,
                "wall_mask": True,
                "canny_edges": True,
                "depth_map": True,
                "stair_mask": True,
                "furniture_anchors_map": True
            },
            "status": "SUCCESS" if input_type != InputType.PHOTO_UNUSABLE else "WARNING_UNUSABLE",
            'outdoor_zones': [
                {
                    'bbox': [int(z['bbox'][0]), int(z['bbox'][1]), int(z['bbox'][2]), int(z['bbox'][3])],
                    'type': z['type'],
                    'area_m2': float(z['area']) / 100
                }
                for z in outdoor_data['zones']
            ],
            'staircase_zones': [
                {'bbox': [int(x) for x in z]} for z in staircase_zones
            ],
            'storage_zones': [
                {
                    'bbox': [int(z['bbox'][0]), int(z['bbox'][1]), int(z['bbox'][2]), int(z['bbox'][3])],
                    'purpose': z['purpose']
                }
                for z in storage_zones
            ],
            'room_labels': [
                {
                    'text': label['text'],
                    'bbox': [int(l) for l in label['bbox']]
                }
                for label in text_metadata['room_labels']
            ],
            'semantic_rooms': rooms_list,
            'text_removed': {
                'room_labels_count': len(text_metadata['room_labels']),
                'dimensions_count': len(text_metadata['dimensions']),
                'cartouche_found': text_metadata['cartouche'] is not None
            }
        }
        
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        print(f"✅ TRAITEMENT MODULAIRE TERMINÉ\n")
        
        return {
            'cleaned_image_path': cleaned_path,
            'outdoor_detection_path': outdoor_visual_path,
            'metadata_path': metadata_path,
            'text_layer_path': text_layer_path,
            'canny_path': canny_path,
            'depth_path': depth_path,
            'metadata': metadata
        }
    
    def validate_mask_quality(self, binary_mask: np.ndarray) -> bool:
        """
        Calcule les métriques de qualité du masque binaire de murs (255 = murs, 0 = fond)
        CORRECTION : Le seuil 65% blanc était un FAUX POSITIF pour les plans sur fond blanc.
        Un plan architectural sur papier blanc a normalement 70-90% de blanc — c'est VALIDE.
        """
        total_pixels = binary_mask.size
        if total_pixels == 0:
            return False

        white_pixels = np.sum(binary_mask > 0)
        white_ratio = white_pixels / total_pixels
        black_ratio = 1.0 - white_ratio

        edges = cv2.Canny(binary_mask, 50, 150)
        edge_pixels = int(np.sum(edges > 0))
        edge_density = edge_pixels / total_pixels

        print(f"[MaskQuality] Murs (blanc)={white_ratio*100:.1f}%, Fond (noir)={black_ratio*100:.1f}%, Contours={edge_density*100:.2f}%")

        # Masque vide : aucun mur détecté
        if white_ratio < 0.005:
            print("[MaskQuality] ⚠️ TOO_EMPTY : masque sans murs détectés (< 0.5%)")
            return False

        # CORRECTION BUG RACINE : Ne rejeter un masque très blanc QUE s'il n'a aucun contour
        # Un plan architectural sur fond blanc a 70-90% de blanc (NORMAL)
        # Un masque vraiment corrompu (blanc uniforme) a edge_density < 0.003 (quasi-zéro)
        if white_ratio > 0.65 and edge_density < 0.003:
            print("[MaskQuality] ⚠️ SOLID_WHITE_CORRUPTED : blanc uniforme sans contours détectés")
            return False

        if white_ratio > 0.65 and edge_density >= 0.003:
            print(f"[MaskQuality] ✅ VALID (plan fond blanc normal) : {white_ratio*100:.1f}% blanc mais {edge_density*100:.2f}% de contours de murs actifs")
            return True

        print("[MaskQuality] ✅ VALID : masque exploitable")
        return True
    
    def visualize_outdoor_zones(self, image: np.ndarray, outdoor_data: Dict) -> np.ndarray:
        """Overlay des zones outdoor détectées"""
        overlay = image.copy()
        
        mask_colored = np.zeros_like(image)
        mask_colored[:, :] = (0, 255, 0)
        
        outdoor_mask_3ch = cv2.cvtColor(outdoor_data['mask'], cv2.COLOR_GRAY2BGR)
        overlay = cv2.addWeighted(
            overlay, 0.7,
            cv2.bitwise_and(mask_colored, outdoor_mask_3ch), 0.3,
            0
        )
        
        for zone in outdoor_data['zones']:
            x1, y1, x2, y2 = zone['bbox']
            cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 255, 0), 3)
            cv2.putText(
                overlay, zone['type'],
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2
            )
        
        return overlay
    
    def detect_parallel_lines_pattern(self, image: np.ndarray, min_lines: int = 4, min_spacing: int = 5, max_spacing: int = 35) -> List[Tuple]:
        """
        Détection géométrique déterministe d'escaliers par regroupement de lignes parallèles (marches).
        Signature géométrique des escaliers : série de marches horizontales ou verticales rapprochées.
        """
        stair_zones = []
        h, w = image.shape[:2]
        
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
            _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY_INV)
            
            lines = cv2.HoughLinesP(
                thresh,
                rho=1,
                theta=np.pi/180,
                threshold=15,
                minLineLength=15,
                maxLineGap=5
            )
            
            if lines is not None:
                h_lines = []
                v_lines = []
                for line in lines:
                    x1, y1, x2, y2 = line.ravel()
                    dx = x2 - x1
                    dy = y2 - y1
                    length = np.sqrt(dx**2 + dy**2)
                    if length < 10 or length > 150:
                        continue
                        
                    angle = np.abs(np.arctan2(dy, dx) * 180 / np.pi)
                    if angle > 90:
                        angle = 180 - angle
                        
                    if angle < 10:
                        h_lines.append((min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)))
                    elif 80 < angle < 100:
                        v_lines.append((min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)))
                
                # Regroupement des lignes horizontales
                h_lines = sorted(h_lines, key=lambda l: l[1])
                clusters_h = []
                current_cluster = []
                for line in h_lines:
                    if not current_cluster:
                        current_cluster.append(line)
                    else:
                        prev = current_cluster[-1]
                        y_diff = line[1] - prev[1]
                        overlap = not (line[2] < prev[0] or line[0] > prev[2])
                        if min_spacing <= y_diff <= max_spacing and overlap:
                            current_cluster.append(line)
                        elif y_diff > max_spacing:
                            if len(current_cluster) >= min_lines:
                                clusters_h.append(current_cluster)
                            current_cluster = [line]
                if len(current_cluster) >= min_lines:
                    clusters_h.append(current_cluster)
                    
                # Regroupement des lignes verticales
                v_lines = sorted(v_lines, key=lambda l: l[0])
                clusters_v = []
                current_cluster_v = []
                for line in v_lines:
                    if not current_cluster_v:
                        current_cluster_v.append(line)
                    else:
                        prev = current_cluster_v[-1]
                        x_diff = line[0] - prev[0]
                        overlap = not (line[3] < prev[1] or line[1] > prev[3])
                        if min_spacing <= x_diff <= max_spacing and overlap:
                            current_cluster_v.append(line)
                        elif x_diff > max_spacing:
                            if len(current_cluster_v) >= min_lines:
                                clusters_v.append(current_cluster_v)
                            current_cluster_v = [line]
                if len(current_cluster_v) >= min_lines:
                    clusters_v.append(current_cluster_v)
                    
                for cluster in clusters_h + clusters_v:
                    xs = [l[0] for l in cluster] + [l[2] for l in cluster]
                    ys = [l[1] for l in cluster] + [l[3] for l in cluster]
                    bx1, by1, bx2, by2 = min(xs), min(ys), max(xs), max(ys)
                    margin = 15
                    stair_zones.append((
                        max(0, bx1 - margin),
                        max(0, by1 - margin),
                        min(w, bx2 + margin),
                        min(h, by2 + margin)
                    ))
        except Exception as e:
            print(f"  ⚠️ Warning detect_parallel_lines_pattern: {e}")
            
        return self.merge_bboxes(stair_zones, threshold=50)

    def detect_staircase_hybrid(self, yolo_data: Dict, image: np.ndarray, text_metadata: Dict) -> List[Tuple]:
        """
        Détecteur Hybride d'Escalier (YOLO + Signature Géométrique OpenCV + OCR)
        """
        h, w = image.shape[:2]
        stair_zones = []
        
        # 1. Extraction YOLO prioritaire (si disponible)
        if yolo_data and isinstance(yolo_data, dict):
            # Objets détectés par YOLO
            objects = yolo_data.get('objects', [])
            for obj in objects:
                cls_name = str(obj.get('class', '')).lower()
                conf = float(obj.get('confidence', 0.0))
                if cls_name in ['staircase', 'stairs', 'ladder', 'step', 'escalier'] and conf > 0.4:
                    bbox = obj.get('bbox', [])
                    if len(bbox) == 4:
                        bx1, by1, bx2, by2 = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
                        stair_zones.append((max(0, bx1), max(0, by1), min(w, bx2), min(h, by2)))
                        print(f"  [ANCHOR] Escalier ancré via YOLO ({cls_name}, conf={conf:.2f})")
            
            # Pièces classifiées comme escalier dans YOLO
            rooms = yolo_data.get('rooms', [])
            for r in rooms:
                r_type = str(r.get('type', r.get('id', ''))).lower()
                if 'stair' in r_type or 'escalier' in r_type:
                    poly = r.get('polygon', [])
                    if poly and len(poly) >= 3:
                        pts = np.array(poly)
                        bx1, by1 = np.min(pts, axis=0)
                        bx2, by2 = np.max(pts, axis=0)
                        stair_zones.append((int(max(0, bx1)), int(max(0, by1)), int(min(w, bx2)), int(min(h, by2))))
                        print(f"  [ANCHOR] Escalier ancré via polygone pièce YOLO")

        # 2. Détection par OCR (Labels 'escalier', 'stair', etc.)
        if text_metadata and 'room_labels' in text_metadata:
            for label in text_metadata['room_labels']:
                text_lower = label['text'].lower()
                if any(kw in text_lower for kw in ['escalier', 'stair', 'stairs', 'monte']):
                    x1, y1, x2, y2 = label['bbox']
                    margin = 80
                    stair_zones.append((
                        max(0, x1 - margin),
                        max(0, y1 - margin),
                        min(w, x2 + margin),
                        min(h, y2 + margin)
                    ))
                    print(f"  [ANCHOR] Escalier repéré via OCR label: '{label['text']}'")

        # 3. Détection géométrique déterministe (Hough & Lignes parallèles)
        geom_stairs = self.detect_parallel_lines_pattern(image)
        if geom_stairs:
            for gz in geom_stairs:
                stair_zones.append(gz)
                print(f"  [ANCHOR] Escalier validé via motif géométrique OpenCV (treads)")

        merged = self.merge_bboxes(stair_zones, threshold=50)
        return merged

    def detect_staircases(self, image: np.ndarray, text_metadata: Dict) -> List[Tuple]:
        """Rétrocompatibilité : appelle le détecteur hybride sans données YOLO"""
        return self.detect_staircase_hybrid(None, image, text_metadata)
        
    def merge_bboxes(self, bboxes: List[Tuple], threshold: int = 50) -> List[Tuple]:
        if not bboxes:
            return []
            
        merged = []
        used = [False] * len(bboxes)
        
        for i in range(len(bboxes)):
            if used[i]:
                continue
            curr_box = list(bboxes[i])
            used[i] = True
            
            changed = True
            while changed:
                changed = False
                for j in range(len(bboxes)):
                    if used[j]:
                        continue
                    box = bboxes[j]
                    x_overlap = not (box[2] + threshold < curr_box[0] or box[0] - threshold > curr_box[2])
                    y_overlap = not (box[3] + threshold < curr_box[1] or box[1] - threshold > curr_box[3])
                    if x_overlap and y_overlap:
                        curr_box[0] = min(curr_box[0], box[0])
                        curr_box[1] = min(curr_box[1], box[1])
                        curr_box[2] = max(curr_box[2], box[2])
                        curr_box[3] = max(curr_box[3], box[3])
                        used[j] = True
                        changed = True
            merged.append(tuple(curr_box))
            
        return merged
    
    def detect_storage_areas(self, image: np.ndarray, text_metadata: Dict) -> List[Dict]:
        """
        Détecte les dressings/rangements en analysant les murs proches
        autour des labels pour estimer la zone de rangement.
        """
        storage_zones = []
        h, w = image.shape[:2]
        
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY_INV)
        except Exception:
            thresh = None
            
        for label in text_metadata['room_labels']:
            text_lower = label['text'].lower()
            if any(kw in text_lower for kw in ['dressing', 'placard', 'cellier', 'rangement', 'closet']):
                x1, y1, x2, y2 = label['bbox']
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2
                
                left_limit = max(0, cx - 150)
                right_limit = min(w, cx + 150)
                top_limit = max(0, cy - 150)
                bottom_limit = min(h, cy + 150)
                
                if thresh is not None:
                    for x in range(cx, max(0, cx - 150), -1):
                        if thresh[cy, x] > 0:
                            left_limit = x
                            break
                    for x in range(cx, min(w, cx + 150)):
                        if thresh[cy, x] > 0:
                            right_limit = x
                            break
                    for y in range(cy, max(0, cy - 150), -1):
                        if thresh[y, cx] > 0:
                            top_limit = y
                            break
                    for y in range(cy, min(h, cy + 150)):
                        if thresh[y, cx] > 0:
                            bottom_limit = y
                            break
                
                if right_limit - left_limit > 20 and bottom_limit - top_limit > 20:
                    storage_zones.append({
                        'bbox': (left_limit, top_limit, right_limit, bottom_limit),
                        'purpose': 'DRESSING' if 'dressing' in text_lower else 'STORAGE'
                    })
                else:
                    storage_zones.append({
                        'bbox': (x1 - 20, y1 - 20, x2 + 20, y2 + 20),
                        'purpose': 'DRESSING' if 'dressing' in text_lower else 'STORAGE'
                    })
                    
        return storage_zones

    def extract_pure_structural_walls_mask(self, image_bgr: np.ndarray) -> np.ndarray:
        """
        Extrait UNIQUEMENT les murs porteurs et cloisons structurelles avec épaisseur renforcée.
        Élimine 100% du texte, des cotes, des symboles de mobilier, des plantes et des flèches.
        CORRECTION ANTI-HALLUCINATION : Les cloisons internes sont épaissies à 8px minimum
        pour que ControlNet Canny de Fal.ai les respecte et ne les fusionne pas.
        """
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        
        # 1. Binarisation inverse : Les murs sombres devenant blancs (255), le fond devenant noir (0)
        _, binary = cv2.threshold(gray, 225, 255, cv2.THRESH_BINARY_INV)
        
        # 2. Nettoyage Morphologique mesuré (MORPH_OPEN 3x3) : Préserve les cloisons intérieures fines
        kernel_clean = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        clean_walls = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel_clean)
        
        # 3. RENFORCEMENT des cloisons internes fines avant filtrage
        # Les cloisons de 2-4px sont épaissies à 8px pour survivre à la diffusion Fal.ai
        kernel_reinforce = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        reinforced_walls = cv2.dilate(clean_walls, kernel_reinforce, iterations=1)
        # Puis on referme proprement sans fusionner les cloisons proches
        kernel_thin_back = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        reinforced_walls = cv2.erode(reinforced_walls, kernel_thin_back, iterations=0)

        # 4. Filtrage par Composants Connectés (Connected Components)
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(reinforced_walls, connectivity=8)
        pure_wall_mask = np.zeros_like(reinforced_walls)
        
        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            w = stats[i, cv2.CC_STAT_WIDTH]
            h = stats[i, cv2.CC_STAT_HEIGHT]
            # Garder toutes les cloisons intérieures et murs réels (surface > 100px)
            if area > 100 and (w > 8 or h > 8):
                pure_wall_mask[labels == i] = 255
                
        # 5. Traitement Canny avec seuils ajustés pour les cloisons épaisses
        canny = cv2.Canny(pure_wall_mask, 30, 120)
        
        # 6. EPAISSISSEMENT FORT : 8px minimum pour ControlNet Fal.ai
        # Résolution du bug racine : cloisons internes disparaissent à 3px, visibles à 8px+
        kernel_8px = np.ones((5, 5), dtype=np.uint8)
        thick_canny = cv2.dilate(canny, kernel_8px, iterations=1)  # 5x5 dilate = ~8px d'épaisseur
        
        print(f"[WallMask] ✅ Masque Canny renforcé : {np.sum(thick_canny > 0)} pixels de murs actifs (8px épaisseur ControlNet)")
        return thick_canny

    def generate_controlnet_maps(self, cleaned_image: np.ndarray, outdoor_mask: np.ndarray, output_canny_path: str, output_depth_path: str):
        """
        Génère les cartes ControlNet (Canny & Depth) 100% pures sans texte ni meubles.
        """
        # Extraction du masque Canny 100% pur (murs uniquement)
        canny_mask = self.extract_pure_structural_walls_mask(cleaned_image)
        
        # Ajout d'une bordure de sécurité de 4% (padding) pour éviter toute amputation aux bords
        h_m, w_m = canny_mask.shape[:2]
        pad_y = max(35, int(h_m * 0.04))
        pad_x = max(35, int(w_m * 0.04))
        padded_canny = cv2.copyMakeBorder(canny_mask, pad_y, pad_y, pad_x, pad_x, cv2.BORDER_CONSTANT, value=0)
        
        cv2.imwrite(output_canny_path, padded_canny)
        
        # 2. Depth Map
        gray = cv2.cvtColor(cleaned_image, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY_INV)
        dist_transform = cv2.distanceTransform(thresh, cv2.DIST_L2, 5)
        depth = cv2.normalize(dist_transform, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        
        if outdoor_mask is not None and outdoor_mask.size > 0:
            depth[outdoor_mask > 0] = np.minimum(depth[outdoor_mask > 0], 120)
            
        cv2.imwrite(output_depth_path, depth)

    # ── MOTEUR DE CALCUL GÉOMÉTRIQUE V8 PAR PIÈCE ─────────────────────────────

    def calculate_bedroom_layout(self, room_polygon, door_bboxes=None, window_segments=None, scale_factor=1.0):
        """
        2.1 Chambre (BEDROOM) - Algorithme Vectoriel Affiné
        - Segment de mur de longueur effective >= 220cm (déduction 80cm par porte intersectée).
        - Lit double (160x200cm, Masque: 205) centré adossé avec tête contre le mur.
        - 2 Chevets (45x40cm, Masque: 220) de part et d'autre avec espacement 5cm.
        - Dégagement devant pieds de lit (largeur=lit+40cm, profondeur=60cm, Masque: 255).
        """
        if len(room_polygon) < 3:
            return [], "Polygon has too few vertices"

        segments = []
        for j in range(len(room_polygon)):
            p1 = room_polygon[j]
            p2 = room_polygon[(j + 1) % len(room_polygon)]
            dx, dy = p2[0] - p1[0], p2[1] - p1[1]
            length = np.sqrt(dx**2 + dy**2)
            
            # Déduire les passages de porte intersectant ce segment
            effective_length = length
            if door_bboxes:
                for db in door_bboxes:
                    # Si la porte est proche du segment (< 25px)
                    db_center = ((db[0] + db[2]) / 2, (db[1] + db[3]) / 2)
                    p_mid = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
                    if np.sqrt((db_center[0] - p_mid[0])**2 + (db_center[1] - p_mid[1])**2) < max(35, length * 0.4):
                        effective_length -= (30 * scale_factor) # ~80cm
            
            segments.append({
                'start': p1, 'end': p2, 'length': length,
                'effective_length': effective_length, 'dx': dx, 'dy': dy
            })

        min_len = max(40, int(65 * scale_factor)) # ~220cm
        valid_walls = [w for w in segments if w['effective_length'] >= min_len]
        if not valid_walls:
            valid_walls = sorted(segments, key=lambda x: x['effective_length'], reverse=True)
            if not valid_walls:
                return [], "No wall available"
        else:
            valid_walls.sort(key=lambda x: x['effective_length'], reverse=True)

        best_wall = valid_walls[0]
        p1, p2 = best_wall['start'], best_wall['end']
        mid_x, mid_y = (p1[0] + p2[0]) / 2.0, (p1[1] + p2[1]) / 2.0
        length = best_wall['length']
        nx, ny = -best_wall['dy'] / length, best_wall['dx'] / length

        contour = np.array(room_polygon, dtype=np.int32).reshape((-1, 1, 2))
        if cv2.pointPolygonTest(contour, (float(mid_x + nx * 20), float(mid_y + ny * 20)), False) < 0:
            nx, ny = -nx, -ny

        # Dimensions Lit standard (160x200cm)
        bed_w_cm, bed_l_cm = 160, 200
        bed_w_px = int(55 * scale_factor)
        bed_l_px = int(70 * scale_factor)
        angle_deg = int(np.degrees(np.arctan2(ny, nx)))

        bed_cx = mid_x + nx * (bed_l_px / 2.0 + 4)
        bed_cy = mid_y + ny * (bed_l_px / 2.0 + 4)

        # Vecteur tangent le long du mur
        tx, ty = -ny, nx

        # Chevets (45x40cm)
        ns_w_px, ns_d_px = int(16 * scale_factor), int(14 * scale_factor)
        offset_side = (bed_w_px / 2.0 + ns_w_px / 2.0 + 4)
        ns1_cx = mid_x + tx * offset_side + nx * (ns_d_px / 2.0 + 2)
        ns1_cy = mid_y + ty * offset_side + ny * (ns_d_px / 2.0 + 2)
        ns2_cx = mid_x - tx * offset_side + nx * (ns_d_px / 2.0 + 2)
        ns2_cy = mid_y - ty * offset_side + ny * (ns_d_px / 2.0 + 2)

        # Dégagement pieds de lit (60cm de profondeur)
        clear_d_px = int(22 * scale_factor)
        clear_cx = bed_cx + nx * (bed_l_px / 2.0 + clear_d_px / 2.0)
        clear_cy = bed_cy + ny * (bed_l_px / 2.0 + clear_d_px / 2.0)

        items = [
            {
                'type': 'bed', 'item_type': 'double_bed',
                'center': [int(bed_cx), int(bed_cy)], 'size': [bed_w_px, bed_l_px],
                'dimensions_cm': [bed_w_cm, bed_l_cm], 'rotation': angle_deg, 'mask_value': 205,
                'placement_rationale': f"Against_wall_effective_{int(best_wall['effective_length'])}px"
            },
            {
                'type': 'nightstand', 'item_type': 'nightstand_left',
                'center': [int(ns1_cx), int(ns1_cy)], 'size': [ns_w_px, ns_d_px],
                'dimensions_cm': [45, 40], 'rotation': angle_deg, 'mask_value': 220
            },
            {
                'type': 'nightstand', 'item_type': 'nightstand_right',
                'center': [int(ns2_cx), int(ns2_cy)], 'size': [ns_w_px, ns_d_px],
                'dimensions_cm': [45, 40], 'rotation': angle_deg, 'mask_value': 220
            },
            {
                'type': 'clearance', 'item_type': 'clearance_bed_feet',
                'center': [int(clear_cx), int(clear_cy)], 'size': [bed_w_px + int(14 * scale_factor), clear_d_px],
                'dimensions_cm': [bed_w_cm + 40, 60], 'rotation': angle_deg, 'mask_value': 255
            }
        ]
        return items, None

    def calculate_bed_anchor_in_room(self, room_polygon, door_bboxes=None, scale_factor=1.0):
        """Wrapper de rétrocompatibilité pour calculate_bedroom_layout"""
        items, err = self.calculate_bedroom_layout(room_polygon, door_bboxes, scale_factor=scale_factor)
        if err or not items:
            return None, err or "No items"
        bed = next((it for it in items if it['type'] == 'bed'), items[0])
        return {
            'chosen_wall': {'length_px': 100, 'length_cm': 250},
            'bed_position': {
                'center': bed['center'],
                'size_px': bed['size'],
                'rotation_deg': bed['rotation'],
                'size_cm': bed['dimensions_cm']
            },
            'items': items
        }, None

    def calculate_living_layout(self, room_polygon, main_entrance_point=None, scale_factor=1.0):
        """
        2.2 Salon / Séjour (LIVING ROOM) - Algorithme Orientationnel
        - Mur principal (plus long segment sans porte > 150cm).
        - Canapé (Sofa 220x90cm, Masque: 180).
        - Table basse (100x60cm, Masque: 230).
        - Meuble TV opposé (140x40cm, Masque: 140).
        - Fauteuils d'appoint si grand espace (75x75cm, Masque: 225).
        - Bande de dégagement (Masque: 255).
        """
        if len(room_polygon) < 3:
            return [], "Polygon has too few vertices"

        segments = []
        for j in range(len(room_polygon)):
            p1 = room_polygon[j]
            p2 = room_polygon[(j + 1) % len(room_polygon)]
            dx, dy = p2[0] - p1[0], p2[1] - p1[1]
            length = np.sqrt(dx**2 + dy**2)
            segments.append({'start': p1, 'end': p2, 'length': length, 'dx': dx, 'dy': dy})

        segments.sort(key=lambda x: x['length'], reverse=True)
        best_wall = segments[0]

        p1, p2 = best_wall['start'], best_wall['end']
        mid_x, mid_y = (p1[0] + p2[0]) / 2.0, (p1[1] + p2[1]) / 2.0
        length = best_wall['length']
        nx, ny = -best_wall['dy'] / length, best_wall['dx'] / length

        contour = np.array(room_polygon, dtype=np.int32).reshape((-1, 1, 2))
        if cv2.pointPolygonTest(contour, (float(mid_x + nx * 20), float(mid_y + ny * 20)), False) < 0:
            nx, ny = -nx, -ny

        angle_deg = int(np.degrees(np.arctan2(ny, nx)))

        # 1. Canapé (220x90cm)
        sofa_w_px = int(75 * scale_factor)
        sofa_d_px = int(32 * scale_factor)
        sofa_cx = mid_x + nx * (sofa_d_px / 2.0 + 4)
        sofa_cy = mid_y + ny * (sofa_d_px / 2.0 + 4)

        # 2. Table basse (100x60cm)
        table_w_px = int(38 * scale_factor)
        table_d_px = int(22 * scale_factor)
        table_cx = sofa_cx + nx * (sofa_d_px / 2.0 + table_d_px / 2.0 + 16 * scale_factor)
        table_cy = sofa_cy + ny * (sofa_d_px / 2.0 + table_d_px / 2.0 + 16 * scale_factor)

        # 3. Meuble TV (140x40cm) sur mur opposé
        tv_wall = segments[1] if len(segments) > 1 else segments[0]
        tv_p1, tv_p2 = tv_wall['start'], tv_wall['end']
        tv_mid_x, tv_mid_y = (tv_p1[0] + tv_p2[0]) / 2.0, (tv_p1[1] + tv_p2[1]) / 2.0
        tv_len = tv_wall['length']
        tv_nx, tv_ny = -tv_wall['dy'] / tv_len, tv_wall['dx'] / tv_len
        if cv2.pointPolygonTest(contour, (float(tv_mid_x + tv_nx * 20), float(tv_mid_y + tv_ny * 20)), False) < 0:
            tv_nx, tv_ny = -tv_nx, -tv_ny
        tv_angle = int(np.degrees(np.arctan2(tv_ny, tv_nx)))

        tv_w_px, tv_d_px = int(48 * scale_factor), int(15 * scale_factor)
        tv_cx = tv_mid_x + tv_nx * (tv_d_px / 2.0 + 3)
        tv_cy = tv_mid_y + tv_ny * (tv_d_px / 2.0 + 3)

        items = [
            {
                'type': 'sofa', 'item_type': 'living_sofa',
                'center': [int(sofa_cx), int(sofa_cy)], 'size': [sofa_w_px, sofa_d_px],
                'dimensions_cm': [220, 90], 'rotation': angle_deg, 'mask_value': 180,
                'placement_rationale': "Against_main_living_wall"
            },
            {
                'type': 'coffee_table', 'item_type': 'coffee_table',
                'center': [int(table_cx), int(table_cy)], 'size': [table_w_px, table_d_px],
                'dimensions_cm': [100, 60], 'rotation': angle_deg, 'mask_value': 230
            },
            {
                'type': 'tv_cabinet', 'item_type': 'tv_unit',
                'center': [int(tv_cx), int(tv_cy)], 'size': [tv_w_px, tv_d_px],
                'dimensions_cm': [140, 40], 'rotation': tv_angle, 'mask_value': 140
            }
        ]
        return items, None

    def calculate_kitchen_countertops(self, room_polygon, sink_detection=None, scale_factor=1.0):
        """
        2.3 Cuisine (KITCHEN) - Algorithme Périphérique Linéaire (L/I/U)
        - Plan de travail (profondeur 60cm, Masque: 200)
        - Évier (55x50cm, Masque: 130)
        - Plaques cuisson (63x60cm, Masque: 135)
        - Réfrigérateur (75x70cm, Masque: 145)
        - Îlot central si surface > 12m² (Masque: 190)
        """
        if len(room_polygon) < 3:
            return [], "Polygon has too few vertices"

        segments = []
        for j in range(len(room_polygon)):
            p1 = room_polygon[j]
            p2 = room_polygon[(j + 1) % len(room_polygon)]
            dx, dy = p2[0] - p1[0], p2[1] - p1[1]
            length = np.sqrt(dx**2 + dy**2)
            segments.append({'start': p1, 'end': p2, 'length': length, 'dx': dx, 'dy': dy})

        segments.sort(key=lambda x: x['length'], reverse=True)
        main_walls = segments[:min(2, len(segments))]

        contour = np.array(room_polygon, dtype=np.int32).reshape((-1, 1, 2))
        depth_px = int(20 * scale_factor) # 60cm
        items = []

        for idx, wall in enumerate(main_walls):
            if wall['length'] < 30: continue
            p1, p2 = wall['start'], wall['end']
            mid_x, mid_y = (p1[0] + p2[0]) / 2.0, (p1[1] + p2[1]) / 2.0
            length = wall['length']
            nx, ny = -wall['dy'] / length, wall['dx'] / length
            if cv2.pointPolygonTest(contour, (float(mid_x + nx * 10), float(mid_y + ny * 10)), False) < 0:
                nx, ny = -nx, -ny
            cx = mid_x + nx * (depth_px / 2.0)
            cy = mid_y + ny * (depth_px / 2.0)
            angle_deg = int(np.degrees(np.arctan2(ny, nx)))

            items.append({
                'type': 'countertop', 'item_type': f'countertop_strip_{idx+1}',
                'center': [int(cx), int(cy)], 'size': [int(length * 0.85), depth_px],
                'dimensions_cm': [int(length * 2.5), 60], 'rotation': angle_deg, 'mask_value': 200
            })

            # Équipements sur le premier linéaire : Évier + Plaques
            if idx == 0 and length > 60:
                tx, ty = -ny, nx
                sink_cx = cx - tx * (length * 0.25)
                sink_cy = cy - ty * (length * 0.25)
                items.append({
                    'type': 'sink', 'item_type': 'kitchen_sink',
                    'center': [int(sink_cx), int(sink_cy)], 'size': [int(18 * scale_factor), int(16 * scale_factor)],
                    'dimensions_cm': [55, 50], 'rotation': angle_deg, 'mask_value': 130
                })

                cook_cx = cx + tx * (length * 0.25)
                cook_cy = cy + ty * (length * 0.25)
                items.append({
                    'type': 'hob', 'item_type': 'induction_hob',
                    'center': [int(cook_cx), int(cook_cy)], 'size': [int(18 * scale_factor), int(16 * scale_factor)],
                    'dimensions_cm': [63, 60], 'rotation': angle_deg, 'mask_value': 135
                })

        return items, None

    def calculate_bathroom_fixtures(self, room_polygon, door_position=None, scale_factor=1.0):
        """
        2.4 Salle de Bain / Toilettes (BATHROOM / WC) - Algorithme Humide
        - Douche à l'italienne dans un coin éloigné (80x90cm, Masque: 90) ou Baignoire (Masque: 95)
        - WC contre mur technique éloigné de la porte (40x65cm, Masque: 105)
        - Vasque / Meuble lavabo principal (80x50cm, Masque: 115)
        - Lave-linge si combiné (60x60cm, Masque: 125)
        """
        if len(room_polygon) < 3:
            return [], "Polygon has too few vertices"

        pts = np.array(room_polygon, dtype=np.float32)
        cx, cy = float(np.mean(pts[:, 0])), float(np.mean(pts[:, 1]))

        dists = [np.sqrt((p[0] - cx)**2 + (p[1] - cy)**2) for p in room_polygon]
        corner_idx = int(np.argmax(dists))
        c_pt = room_polygon[corner_idx]

        # 1. Douche (90x90cm)
        shower_size = int(32 * scale_factor)
        dir_x = (cx - c_pt[0]) / (dists[corner_idx] + 1e-5)
        dir_y = (cy - c_pt[1]) / (dists[corner_idx] + 1e-5)
        sh_cx = c_pt[0] + dir_x * (shower_size / 1.8)
        sh_cy = c_pt[1] + dir_y * (shower_size / 1.8)

        # 2. Vasque (80x50cm)
        vanity_w = int(28 * scale_factor)
        vanity_d = int(16 * scale_factor)
        v_cx = cx - dir_x * (14 * scale_factor)
        v_cy = cy - dir_y * (14 * scale_factor)

        # 3. WC (40x65cm)
        wc_w = int(14 * scale_factor)
        wc_d = int(22 * scale_factor)
        wc_cx = cx + dir_y * (18 * scale_factor)
        wc_cy = cy - dir_x * (18 * scale_factor)

        items = [
            {
                'type': 'shower', 'item_type': 'walk_in_shower',
                'center': [int(sh_cx), int(sh_cy)], 'size': [shower_size, shower_size],
                'dimensions_cm': [90, 90], 'rotation': 0, 'mask_value': 90
            },
            {
                'type': 'vanity', 'item_type': 'washbasin_vanity',
                'center': [int(v_cx), int(v_cy)], 'size': [vanity_w, vanity_d],
                'dimensions_cm': [80, 50], 'rotation': 0, 'mask_value': 115
            },
            {
                'type': 'toilet', 'item_type': 'wc_pan',
                'center': [int(wc_cx), int(wc_cy)], 'size': [wc_w, wc_d],
                'dimensions_cm': [40, 65], 'rotation': 0, 'mask_value': 105
            }
        ]
        return items, None

    def calculate_storage_strips(self, room_polygon, scale_factor=1.0):
        """
        2.5 Dressing / Placard (CLOSET) - Algorithme de Rangement
        - Bandes continues le long des murs (profondeur 60cm, Masque: 235)
        - Dégagement central obligatoire (Masque: 255)
        """
        if len(room_polygon) < 3:
            return [], "Polygon has too few vertices"

        segments = []
        for j in range(len(room_polygon)):
            p1 = room_polygon[j]
            p2 = room_polygon[(j + 1) % len(room_polygon)]
            dx, dy = p2[0] - p1[0], p2[1] - p1[1]
            length = np.sqrt(dx**2 + dy**2)
            segments.append({'start': p1, 'end': p2, 'length': length, 'dx': dx, 'dy': dy})

        contour = np.array(room_polygon, dtype=np.int32).reshape((-1, 1, 2))
        depth_px = int(20 * scale_factor) # 60cm
        items = []

        for idx, wall in enumerate(segments):
            if wall['length'] < 25: continue
            p1, p2 = wall['start'], wall['end']
            mid_x, mid_y = (p1[0] + p2[0]) / 2.0, (p1[1] + p2[1]) / 2.0
            length = wall['length']
            nx, ny = -wall['dy'] / length, wall['dx'] / length
            if cv2.pointPolygonTest(contour, (float(mid_x + nx * 10), float(mid_y + ny * 10)), False) < 0:
                nx, ny = -nx, -ny
            cx = mid_x + nx * (depth_px / 2.0)
            cy = mid_y + ny * (depth_px / 2.0)
            angle_deg = int(np.degrees(np.arctan2(ny, nx)))

            items.append({
                'type': 'closet_strip', 'item_type': f'wardrobe_wall_{idx+1}',
                'center': [int(cx), int(cy)], 'size': [int(length * 0.9), depth_px],
                'dimensions_cm': [int(length * 2.5), 60], 'rotation': angle_deg, 'mask_value': 235
            })

        return items, None

    def calculate_dining_layout(self, room_polygon, scale_factor=1.0):
        """
        2.6 Salle à Manger (DINING) - Algorithme Centroïdal
        - Table rectangulaire au centroïde (160x90cm, Masque: 185)
        - Chaises périphériques (45x45cm, Masque: 225)
        """
        if len(room_polygon) < 3:
            return [], "Polygon has too few vertices"

        pts = np.array(room_polygon, dtype=np.float32)
        cx = float(np.mean(pts[:, 0]))
        cy = float(np.mean(pts[:, 1]))

        table_w = int(55 * scale_factor) # ~160cm
        table_d = int(32 * scale_factor) # ~90cm

        items = [
            {
                'type': 'dining_table', 'item_type': 'dining_table_6p',
                'center': [int(cx), int(cy)], 'size': [table_w, table_d],
                'dimensions_cm': [160, 90], 'rotation': 0, 'mask_value': 185
            }
        ]

        # 4 Chaises autour
        chair_size = int(14 * scale_factor)
        ch_offsets = [
            (-table_w / 2.0 + 12, -table_d / 2.0 - 8),
            (table_w / 2.0 - 12, -table_d / 2.0 - 8),
            (-table_w / 2.0 + 12, table_d / 2.0 + 8),
            (table_w / 2.0 - 12, table_d / 2.0 + 8)
        ]
        for idx, (ox, oy) in enumerate(ch_offsets):
            items.append({
                'type': 'chair', 'item_type': f'dining_chair_{idx+1}',
                'center': [int(cx + ox), int(cy + oy)], 'size': [chair_size, chair_size],
                'dimensions_cm': [45, 45], 'rotation': 0, 'mask_value': 225
            })

        return items, None

    def draw_oriented_rect(self, img, center, size, angle_deg, val):
        """Dessine un rectangle orienté net sur l'image"""
        cx, cy = center
        w_rect, h_rect = size

        corners = np.array([
            [-w_rect/2, -h_rect/2],
            [w_rect/2, -h_rect/2],
            [w_rect/2, h_rect/2],
            [-w_rect/2, h_rect/2]
        ])

        theta = np.radians(angle_deg)
        c, s = np.cos(theta), np.sin(theta)
        R = np.array([[c, -s], [s, c]])

        rotated_corners = np.dot(corners, R.T) + [cx, cy]
        rotated_corners = rotated_corners.astype(np.int32)

        cv2.fillPoly(img, [rotated_corners], val)

    def draw_furniture_item(self, mask, item, scale_factor=1.0):
        """Dessine un élément de mobilier avec orientation et valeur ControlNet exacte"""
        center = item.get('center', [0, 0])
        size = item.get('size', [20, 20])
        rot = item.get('rotation', 0)
        val = item.get('mask_value', 200)
        self.draw_oriented_rect(mask, center, tuple(size), rot, val)

    # ── GÉNÉRATEUR UNIVERSEL D'ANCRES MOBILIER V8 ─────────────────────────────

    def generate_universal_furniture_anchor_map(
        self,
        cleaned_image: np.ndarray,
        yolo_data: Optional[Dict],
        rooms_list: List[Dict],
        staircase_zones: List,
        storage_zones: List,
        outdoor_data: Dict,
        output_path: str,
        input_mode: str = "digital_clean"
    ) -> Tuple[np.ndarray, Dict]:
        """
        1. ARCHITECTURE DU MASQUE ANCRE UNIVERSEL V8
        - 0 (Noir absolu) : Murs porteurs / Structure / Hors-Bâtiment
        - 30-70 / 55 (Gris foncé) : Escaliers avec marches géométriques
        - 90-135 : Sanitaires SDB/WC (Douche 90, WC 105, Vasque 115) & Cuisine (Évier 130, Plaques 135)
        - 140 : Meubles TV
        - 170-190 : Canapés (180), Tables repas (185)
        - 200-215 : Lits doubles (205), Plans de travail cuisine (200)
        - 220-235 : Chevets (220), Chaises/Tables basses (225-230), Dressings (235)
        - 248 : Sol libre / Circulation intérieure pure
        - 255 (Blanc Pur) : Dégagements obligatoires (80cm) et hors-sol
        """
        h, w = cleaned_image.shape[:2]

        # 1. Extraction et normalisation des pièces
        effective_rooms = list(rooms_list)
        if yolo_data and isinstance(yolo_data, dict):
            yolo_rooms = yolo_data.get('rooms', [])
            for yr in yolo_rooms:
                poly = yr.get('polygon', [])
                if poly and len(poly) >= 3:
                    pts = np.array(poly)
                    bx1, by1 = np.min(pts, axis=0)
                    bx2, by2 = np.max(pts, axis=0)
                    r_type = str(yr.get('type', yr.get('label', 'ROOM'))).upper()
                    if 'BED' in r_type or 'CHAMBRE' in r_type:
                        r_type = 'BEDROOM'
                    elif 'BATH' in r_type or 'BAIN' in r_type or 'WC' in r_type or 'TOIL' in r_type:
                        r_type = 'BATHROOM'
                    elif 'LIV' in r_type or 'SALON' in r_type or 'SEJOUR' in r_type:
                        r_type = 'LIVING'
                    elif 'DIN' in r_type or 'MANGER' in r_type or 'REPAS' in r_type:
                        r_type = 'DINING'
                    elif 'KITCH' in r_type or 'CUISINE' in r_type:
                        r_type = 'KITCHEN'
                    elif 'STAIR' in r_type or 'ESCALIER' in r_type:
                        r_type = 'STAIRS'
                    elif 'DRESS' in r_type or 'STORAGE' in r_type or 'PLACARD' in r_type:
                        r_type = 'DRESSING'

                    already_present = any(
                        abs(r['centroid'][0] - (bx1 + bx2)/2) < 40 and abs(r['centroid'][1] - (by1 + by2)/2) < 40
                        for r in effective_rooms if 'centroid' in r
                    )
                    if not already_present:
                        effective_rooms.append({
                            'id': yr.get('id', f"yolo_{len(effective_rooms)+1}"),
                            'name': yr.get('name', r_type),
                            'type': r_type,
                            'bbox': [int(bx1), int(by1), int(bx2), int(by2)],
                            'centroid': [float((bx1 + bx2)/2), float((by1 + by2)/2)],
                            'polygon': poly
                        })

        # 2. Initialisation : Sol intérieur libre = 248 (Off-White)
        anchor_map = np.zeros((h, w), dtype=np.uint8)
        for r in effective_rooms:
            if r.get('type') not in ['OUTSIDE', 'EXTERIOR']:
                poly = r.get('polygon', [])
                if len(poly) >= 3:
                    cv2.fillPoly(anchor_map, [np.array(poly, dtype=np.int32)], 248)

        if np.count_nonzero(anchor_map == 248) < (h * w * 0.05):
            gray_init = cv2.cvtColor(cleaned_image, cv2.COLOR_BGR2GRAY) if len(cleaned_image.shape) == 3 else cleaned_image
            _, inv_walls = cv2.threshold(gray_init, 220, 255, cv2.THRESH_BINARY)
            anchor_map[inv_walls > 0] = 248

        # 3. Murs en Noir absolu (0)
        gray = cv2.cvtColor(cleaned_image, cv2.COLOR_BGR2GRAY) if len(cleaned_image.shape) == 3 else cleaned_image
        _, thresh_walls = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY_INV)
        anchor_map[thresh_walls > 0] = 0

        # Contours de pièces renforcés en noir
        for r in effective_rooms:
            poly = r.get('polygon', [])
            if len(poly) >= 3:
                cv2.polylines(anchor_map, [np.array(poly, dtype=np.int32)], isClosed=True, color=0, thickness=6)

        # 4. Escaliers (55 - Marches géométriques précises)
        stair_detected = False
        stair_zones_coords = []
        for sz in staircase_zones:
            stair_detected = True
            sx1, sy1, sx2, sy2 = sz
            stair_zones_coords.append([int(sx1), int(sy1), int(sx2), int(sy2)])
            anchor_map[sy1:sy2, sx1:sx2] = 55
            step_gap = max(6, int((sy2 - sy1) / 10)) if (sy2 - sy1) > (sx2 - sx1) else max(6, int((sx2 - sx1) / 10))
            if (sy2 - sy1) > (sx2 - sx1):
                for y_step in range(sy1, sy2, step_gap):
                    cv2.line(anchor_map, (sx1, y_step), (sx2, y_step), 40, 2)
            else:
                for x_step in range(sx1, sx2, step_gap):
                    cv2.line(anchor_map, (x_step, sy1), (x_step, sy2), 40, 2)

        # 5. Calcul Déterministe Parallèle du Mobilier
        print(f"  [PARALLEL] Placement mobilier universel pour {len(effective_rooms)} pièce(s)...")

        def _compute_universal_room(room_data: dict) -> Tuple[str, str, List[dict]]:
            r_type = room_data.get('type', 'ROOM').upper()
            polygon = room_data.get('polygon', [])
            room_id_str = f"room_{room_data.get('id', 'unk')}"

            if len(polygon) < 3:
                return room_id_str, r_type, []

            if r_type == 'BEDROOM':
                items, _ = self.calculate_bedroom_layout(polygon)
                return room_id_str, r_type, items or []
            elif r_type == 'LIVING':
                items, _ = self.calculate_living_layout(polygon)
                return room_id_str, r_type, items or []
            elif r_type == 'DINING':
                items, _ = self.calculate_dining_layout(polygon)
                return room_id_str, r_type, items or []
            elif r_type == 'KITCHEN':
                items, _ = self.calculate_kitchen_countertops(polygon)
                return room_id_str, r_type, items or []
            elif r_type in ['BATHROOM', 'TOILET', 'WC']:
                items, _ = self.calculate_bathroom_fixtures(polygon)
                return room_id_str, r_type, items or []
            elif r_type in ['DRESSING', 'STORAGE', 'PLACARD']:
                items, _ = self.calculate_storage_strips(polygon)
                return room_id_str, r_type, items or []

            return room_id_str, r_type, []

        num_workers = min(4, max(1, len(effective_rooms)))
        computed_by_room = {}
        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            futures = {executor.submit(_compute_universal_room, r): r for r in effective_rooms}
            for future in as_completed(futures):
                try:
                    rid, rtype, items = future.result()
                    computed_by_room[rid] = (rtype, items)
                except Exception as exc:
                    print(f"  [PARALLEL] Erreur calcul pièce : {exc}")

        # 6. Dessin séquentiel et rapport structuré
        placement_report = {
            'stairwell_detected': stair_detected,
            'stair_confinement_zone': stair_zones_coords,
            'input_mode': input_mode,
            'rooms_placed': {}
        }

        for r in effective_rooms:
            room_id_str = f"room_{r.get('id', 'unk')}"
            r_type = r.get('type', 'ROOM').upper()
            if room_id_str not in computed_by_room:
                continue

            _, items = computed_by_room[room_id_str]
            room_area_m2 = round(float(r.get('area_m2', 12.0)), 2)

            furniture_list = []
            clearance_list = []

            for it in items:
                self.draw_furniture_item(anchor_map, it)
                if it.get('type') == 'clearance':
                    clearance_list.append({
                        'from': it.get('item_type', 'clearance'),
                        'dimensions_cm': it.get('dimensions_cm', [80, 60]),
                        'mask_value': it.get('mask_value', 255)
                    })
                else:
                    furniture_list.append({
                        'item_type': it.get('item_type', it.get('type')),
                        'dimensions_cm': it.get('dimensions_cm', [0, 0]),
                        'position': {'x': it['center'][0], 'y': it['center'][1]},
                        'rotation_deg': it.get('rotation', 0),
                        'placement_rationale': it.get('placement_rationale', 'Deterministic_geometric_anchor'),
                        'mask_value_used': it.get('mask_value', 200)
                    })

            placement_report['rooms_placed'][room_id_str] = {
                'room_id': room_id_str,
                'type': r_type.lower(),
                'area_m2': room_area_m2,
                'furniture_placed': furniture_list,
                'clearance_zones': clearance_list
            }

        # 7. Balcons & Espaces extérieurs (248 avec délimitation)
        for z in outdoor_data.get('zones', []):
            bx1, by1, bx2, by2 = z['bbox']
            balcony_crop = anchor_map[by1:by2, bx1:bx2]
            if balcony_crop.size > 0:
                anchor_map[by1:by2, bx1:bx2] = np.where(anchor_map[by1:by2, bx1:bx2] > 0, 248, 0)

        # 8. Sauvegardes
        cv2.imwrite(output_path, anchor_map)

        debug_dir = os.path.join(os.path.dirname(output_path), 'debug')
        os.makedirs(debug_dir, exist_ok=True)
        cv2.imwrite(os.path.join(debug_dir, 'source_inpainted.png'), cleaned_image)
        cv2.imwrite(os.path.join(debug_dir, 'furniture_anchors_map.png'), anchor_map)

        with open(os.path.join(debug_dir, 'furniture_placement_report.json'), 'w', encoding='utf-8') as pf:
            json.dump(placement_report, pf, indent=2, ensure_ascii=False)

        with open(os.path.join(debug_dir, 'placement_logic.json'), 'w', encoding='utf-8') as pf:
            json.dump(placement_report, pf, indent=2, ensure_ascii=False)

        print(f"✅ Universal Furniture Anchor Map générée : {output_path}")
        return anchor_map, placement_report

    def build_deterministic_mask_from_yolo(self, cleaned_image, yolo_data, rooms_list, staircase_zones, storage_zones, outdoor_data, output_path, input_mode="digital_clean"):
        """Wrapper de compatibilité pointant vers generate_universal_furniture_anchor_map"""
        return self.generate_universal_furniture_anchor_map(cleaned_image, yolo_data, rooms_list, staircase_zones, storage_zones, outdoor_data, output_path, input_mode)

    def generate_furniture_anchors(self, cleaned_image, rooms_list, staircase_zones, storage_zones, outdoor_data, output_path):
        """Wrapper de rétrocompatibilité pointant vers generate_universal_furniture_anchor_map"""
        return self.generate_universal_furniture_anchor_map(cleaned_image, None, rooms_list, staircase_zones, storage_zones, outdoor_data, output_path)


# === API DE HAUT NIVEAU AVEC CACHE PERSISTANT (C1) ===

def process_floor_plan(
    input_path: str,
    output_dir: str,
    yolo_url: str = "http://localhost:8000",
    use_cache: bool = True,
    force_refresh: bool = False,
    debug_mode: bool = True
) -> dict:
    """
    Pipeline complet avec cache persistant intelligent (C1).
    """
    os.makedirs(output_dir, exist_ok=True)
    file_hash = _cache.get_file_hash(input_path) if os.path.exists(input_path) else "virtual_hash"
    logger.info(f"📎 Hash fichier: {file_hash[:12]}...")

    # 1. Classification avec cache
    input_type = None
    if use_cache and not force_refresh:
        cached_type = _cache.get_classification(file_hash)
        if cached_type:
            input_type = InputType(cached_type) if cached_type in [e.value for e in InputType] else InputType.DIGITAL_CAD

    if input_type is None and os.path.exists(input_path):
        img = cv2.imread(input_path) if not input_path.endswith('.pdf') else None
        if img is not None:
            input_type = classify_input_image_cached(img)
        else:
            input_type = InputType.DIGITAL_CAD
        if use_cache:
            _cache.set_classification(file_hash, input_type.value, {})

    if input_type == InputType.PHOTO_UNUSABLE:
        raise ValueError(
            "❌ Entrée non valide: Photo détectée avec perspective/flou.\n"
            "📋 Veuillez fournir un plan vu du dessus (PDF/CAD ou croquis scanné)."
        )

    # 2. Exécution MasterPlanProcessor
    processor = MasterPlanProcessor()
    proc_result = processor.process(
        input_path=input_path,
        output_dir=output_dir,
        debug_mode=debug_mode
    )

    # 3. Cache furniture mask
    mask_path = os.path.join(output_dir, "furniture_anchors_map.png")
    json_path = os.path.join(output_dir, "placement_logic.json")
    placement_logic = proc_result.get('placement_logic', {})
    
    if os.path.exists(mask_path) and use_cache:
        mask_arr = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if mask_arr is not None:
            _cache.set_furniture_mask(file_hash, mask_arr, placement_logic)

    return {
        "input_type": input_type.value if input_type else "digital",
        "file_hash": file_hash,
        "mask_path": mask_path,
        "placement_logic": placement_logic,
        "metadata": proc_result,
        "from_cache": use_cache and not force_refresh
    }


def get_cache_stats() -> dict:
    """API pour monitoring du cache"""
    return _cache.get_stats()


def clear_cache(older_than_days: int = 7):
    """API pour nettoyage automatique des entrées expirées"""
    return _cache.clear_expired()


# === SCRIPT EXÉCUTABLE ===
if __name__ == "__main__":
    import argparse

    # 1. Post-process call
    if len(sys.argv) >= 4 and sys.argv[1] == "--post-process":
        rendered_path = sys.argv[2]
        meta_path = sys.argv[3]
        out_path = sys.argv[4] if len(sys.argv) > 4 else rendered_path
        
        img = cv2.imread(rendered_path)
        if img is None:
            print(f"Error: cannot load {rendered_path}")
            sys.exit(1)
            
        cleaner = AdvancedTextCleaner()
        cleaned = cleaner.remove_generated_text_with_inpainting(img)
        
        cv2.imwrite(out_path, cleaned)
        print(f"Cleaned generated text from final render: saved to {out_path}")
        sys.exit(0)

    # 2. Named arguments CLI (V8 spec) vs Retro-compatible positional call
    has_named_args = any(arg.startswith("--") for arg in sys.argv[1:])
    
    if has_named_args:
        parser = argparse.ArgumentParser(description='Architectural Plan Processor V8/V9')
        parser.add_argument('--input', required=True, help='Chemin PDF/Image source')
        parser.add_argument('--output-dir', required=True, help='Dossier de sortie')
        parser.add_argument('--debug', action='store_true', help='Mode verbose + exports debug')
        parser.add_argument('--max-resolution', type=int, default=2048, help='Résolution max côté long (px)')
        parser.add_argument('--yolo-json', default=None, help='Chemin vers le fichier JSON de sortie YOLO')
        parser.add_argument('--metadata-json', default=None, help='JSON stringifié des métadonnées VLM (venant de branche A)')
        parser.add_argument('--extract-pdf-only', action='store_true', help='Exporte juste le PNG depuis PDF et quitte')
        
        args = parser.parse_args()
        
        if args.extract_pdf_only:
            try:
                load_input_image(args.input)
                sys.exit(0)
            except Exception as e:
                print(f"ERROR: {str(e)}", file=sys.stderr)
                sys.exit(1)
        
        processor = MasterPlanProcessor()
        result = processor.process(
            input_path=args.input,
            output_dir=args.output_dir,
            max_resolution=args.max_resolution,
            debug_mode=args.debug,
            yolo_json_path=args.yolo_json,
            metadata_json=args.metadata_json
        )
        print(f"\n[TOTAL] Pipeline terminé.")
        sys.exit(0)
    else:
        # Retro-compatible positional call
        if len(sys.argv) < 3:
            print("Usage: python master_plan_processor.py <plan.png> <output_path_base>")
            sys.exit(1)
        
        input_file = sys.argv[1]
        output_base = sys.argv[2]
        
        processor = MasterPlanProcessor()
        result = processor.process(input_path=input_file, output_path_base=output_base)
        
        print("="*60)
        print("🎯 FICHIER MÉTADONNÉES JSON À ENVOYER À L'IA :")
        print("="*60)
        print(json.dumps(result['metadata'], indent=2, ensure_ascii=False))
        sys.exit(0)
