# scripts/advanced_text_cleaner.py
"""
Nettoyeur avancé de textes et cartouches pour plans architecturaux
Supprime : cartouches, noms de pièces, cotations, annotations
Préserve : murs, ouvertures, symboles architecturaux
"""

import cv2
import numpy as np
from typing import List, Tuple, Dict
import re

HAS_PYTESSERACT = False
try:
    import pytesseract
    HAS_PYTESSERACT = True
except ImportError:
    HAS_PYTESSERACT = False

class AdvancedTextCleaner:
    """
    Détecte et supprime intelligemment tous les textes d'un plan
    sans endommager la géométrie architecturale.
    """
    
    def __init__(self):
        # Configuration Tesseract pour français + symboles
        self.tesseract_config = '--oem 3 --psm 11 -l fra'
        
    def clean_plan(self, image: np.ndarray) -> Tuple[np.ndarray, Dict]:
        """
        Pipeline complet de nettoyage
        
        Returns:
            - Image nettoyée
            - Métadonnées extraites (pour réinjection ultérieure)
        """
        print("🧹 Nettoyage intelligent du plan...")
        
        # Copie de travail
        cleaned = image.copy()
        metadata = {
            'cartouche': None,
            'room_labels': [],
            'dimensions': []
        }
        
        # Accumulate zones to inpaint
        inpaint_mask = np.zeros(cleaned.shape[:2], dtype=np.uint8)
        
        # 1. Détection et extraction du cartouche
        cartouche_zone, cartouche_data = self.detect_and_remove_cartouche(cleaned)
        if cartouche_data:
            metadata['cartouche'] = cartouche_data
            x1, y1, x2, y2 = cartouche_zone
            cv2.rectangle(inpaint_mask, (max(0, x1 - 2), max(0, y1 - 2)), (min(cleaned.shape[1], x2 + 2), min(cleaned.shape[0], y2 + 2)), 255, -1)
            print(f"  ✓ Cartouche détecté : {cartouche_zone}")
        
        # 2. Détection et suppression des textes de pièces
        text_zones = self.detect_text_zones(cleaned)
        for zone in text_zones:
            # Extraire le texte avant suppression (si Tesseract disponible)
            text_content = self.extract_text_from_zone(cleaned, zone)
            
            x1, y1, x2, y2 = zone
            w_box = x2 - x1
            h_box = y2 - y1
            
            # Classification heuristique en cas de manque d'OCR
            is_room = self.is_room_label(text_content)
            is_dim = self.is_dimension_annotation(text_content)
            
            # Fallback si l'OCR n'a rien renvoyé (pas installé ou échec)
            if not text_content:
                # Les noms de pièces sont généralement plus gros et carrés/horizontaux au milieu
                # Les dimensions sont souvent très petites et rectangulaires
                if w_box > 30 and h_box > 10:
                    is_room = True
                else:
                    is_dim = True
            
            if is_room:
                metadata['room_labels'].append({
                    'text': text_content or f"Room_{x1}_{y1}",
                    'bbox': [x1, y1, x2, y2]
                })
                self.add_smart_inpaint_mask(cleaned, inpaint_mask, x1, y1, x2, y2)
                if text_content:
                    print(f"  ✓ Texte pièce détecté : {text_content}")
            
            elif is_dim:
                metadata['dimensions'].append({
                    'text': text_content or f"Dim_{x1}_{y1}",
                    'bbox': [x1, y1, x2, y2]
                })
                self.add_smart_inpaint_mask(cleaned, inpaint_mask, x1, y1, x2, y2)
                if text_content:
                    print(f"  ✓ Cotation détectée : {text_content}")
        
        # Appliquer l'inpainting une seule fois
        if np.any(inpaint_mask > 0):
            cleaned = cv2.inpaint(cleaned, inpaint_mask, 5, cv2.INPAINT_TELEA)
            print("  ✓ Inpainting global appliqué sur toutes les zones textuelles.")
        
        # 3. Nettoyage des résidus d'OCR (petits blobs de texte)
        cleaned = self.remove_text_residues(cleaned)
        
        print(f"✅ Nettoyage terminé : {len(metadata['room_labels'])} labels supprimés")
        
        return cleaned, metadata
    
    def add_smart_inpaint_mask(self, image: np.ndarray, inpaint_mask: np.ndarray, x1: int, y1: int, x2: int, y2: int):
        """
        Extrait les pixels textuels du fond tout en ignorant les murs/lignes droites,
        et ajoute uniquement ces pixels au masque d'inpainting global.
        """
        h, w = image.shape[:2]
        
        mx1, my1 = max(0, x1 - 5), max(0, y1 - 5)
        mx2, my2 = min(w, x2 + 5), min(h, y2 + 5)
        
        roi = image[my1:my2, mx1:mx2]
        if roi.size == 0:
            return
            
        gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        # Binariser (les zones sombres = texte + murs)
        _, thresh = cv2.threshold(gray_roi, 200, 255, cv2.THRESH_BINARY_INV)
        
        # Isoler les lignes (murs) pour les protéger
        kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 1))
        kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 15))
        
        walls_h = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_h)
        walls_v = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_v)
        walls_roi = cv2.bitwise_or(walls_h, walls_v)
        
        # Le texte = tout ce qui est sombre MAIS n'est pas un mur
        text_mask = cv2.bitwise_and(thresh, cv2.bitwise_not(walls_roi))
        
        # Dilater très légèrement le texte pour assurer que les bords sont recouverts
        text_mask = cv2.dilate(text_mask, np.ones((3, 3), np.uint8), iterations=1)
        
        # Ajouter le texte au masque d'inpainting global
        inpaint_mask[my1:my2, mx1:mx2] = cv2.bitwise_or(inpaint_mask[my1:my2, mx1:mx2], text_mask)
    
    def detect_and_remove_cartouche(self, image: np.ndarray) -> Tuple[Tuple, Dict]:
        """
        Détecte le cartouche (généralement en bas du plan)
        """
        h, w = image.shape[:2]
        
        # 1. Option avec Tesseract si disponible
        if HAS_PYTESSERACT:
            try:
                search_zone = image[int(h * 0.8):h, :]
                gray_zone = cv2.cvtColor(search_zone, cv2.COLOR_BGR2GRAY)
                ocr_data = pytesseract.image_to_data(
                    gray_zone, 
                    config=self.tesseract_config,
                    output_type=pytesseract.Output.DICT
                )
                
                cartouche_keywords = [
                    'projet', 'échelle', 'date', 'dessiné', 'architecte',
                    'maître', 'ouvrage', 'plan', 'indice', 'proposition',
                    'habitation', 'rdc', 'etage'
                ]
                
                keyword_found = False
                for text in ocr_data['text']:
                    if any(kw in text.lower() for kw in cartouche_keywords):
                        keyword_found = True
                        break
                
                if keyword_found:
                    x_min, y_min, x_max, y_max = w, h, 0, 0
                    for i in range(len(ocr_data['text'])):
                        if ocr_data['text'][i].strip():
                            x = ocr_data['left'][i]
                            y = ocr_data['top'][i] + int(h * 0.8)
                            w_box = ocr_data['width'][i]
                            h_box = ocr_data['height'][i]
                            
                            x_min = min(x_min, x)
                            y_min = min(y_min, y)
                            x_max = max(x_max, x + w_box)
                            y_max = max(y_max, y + h_box)
                    
                    margin = 20
                    cartouche_zone = (
                        max(0, x_min - margin),
                        max(0, y_min - margin),
                        min(w, x_max + margin),
                        min(h, y_max + margin)
                    )
                    
                    cartouche_data = {
                        'raw_text': '\n'.join([t for t in ocr_data['text'] if t.strip()]),
                        'bbox': cartouche_zone
                    }
                    return cartouche_zone, cartouche_data
            except Exception as e:
                print(f"[Cleaner] OCR Cartouche error : {e}")

        # 2. Fallback OpenCV robuste (Grand rectangle dans la zone du bas)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        best_area = 0
        best_box = None
        for c in contours:
            x, y, w_box, h_box = cv2.boundingRect(c)
            area = w_box * h_box
            if y > h * 0.70 and w_box > w * 0.15 and h_box > h * 0.03:
                if area > best_area:
                    best_area = area
                    best_box = (x, y, x + w_box, y + h_box)
                    
        if best_box:
            cartouche_data = {
                'raw_text': 'Cartouche détecté par morphologie',
                'bbox': best_box
            }
            return best_box, cartouche_data
            
        # Fallback de sécurité : 12% du bas
        default_box = (0, int(h * 0.88), w, h)
        return default_box, {
            'raw_text': 'Cartouche par défaut (12% bas)',
            'bbox': default_box
        }
    
    def detect_text_zones(self, image: np.ndarray) -> List[Tuple]:
        """
        Détecte toutes les zones contenant du texte par MSER.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        h_img, w_img = gray.shape[:2]
        
        # MSER detector
        mser = cv2.MSER_create(
            delta=5,
            min_area=30,
            max_area=4000,
            max_variation=0.5
        )
        
        regions, _ = mser.detectRegions(gray)
        text_zones = []
        
        for region in regions:
            x, y, w, h = cv2.boundingRect(region)
            aspect_ratio = w / h if h > 0 else 0
            
            # Filtre des bboxes candidates
            if 0.5 < aspect_ratio < 15 and 30 < w * h < 5000:
                # Exclure le cartouche bas
                if y > h_img * 0.85:
                    continue
                text_zones.append((x, y, x + w, y + h))
        
        # Fusionner les zones proches
        merged_zones = self.merge_nearby_zones(text_zones, distance_threshold=25)
        return merged_zones
    
    def merge_nearby_zones(self, zones: List[Tuple], distance_threshold: int) -> List[Tuple]:
        """Fusionne les zones de texte proches (même ligne)"""
        if not zones:
            return []
        
        merged = []
        zones = sorted(zones, key=lambda z: (z[1], z[0]))
        current = list(zones[0])
        
        for zone in zones[1:]:
            if abs(zone[1] - current[1]) < distance_threshold and \
               abs(zone[0] - current[2]) < distance_threshold * 1.8:
                current[0] = min(current[0], zone[0])
                current[1] = min(current[1], zone[1])
                current[2] = max(current[2], zone[2])
                current[3] = max(current[3], zone[3])
            else:
                merged.append(tuple(current))
                current = list(zone)
        
        merged.append(tuple(current))
        return merged
    
    def extract_text_from_zone(self, image: np.ndarray, zone: Tuple) -> str:
        """Extrait le texte d'une zone par OCR"""
        if not HAS_PYTESSERACT:
            return ""
            
        x1, y1, x2, y2 = zone
        roi = image[y1:y2, x1:x2]
        if roi.size == 0:
            return ""
            
        try:
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            text = pytesseract.image_to_string(binary, config=self.tesseract_config)
            return text.strip()
        except Exception:
            return ""
    
    def is_room_label(self, text: str) -> bool:
        """Détecte si le texte est un nom de pièce"""
        if not text:
            return False
            
        room_keywords = [
            'salon', 'chambre', 'cuisine', 'salle', 'bain', 'wc', 'toilette',
            'entrée', 'couloir', 'bureau', 'dressing', 'placard', 'cellier', 
            'buanderie', 'séjour', 'sam', 'toil', 'externe', 'rangement'
        ]
        text_lower = text.lower()
        return any(kw in text_lower for kw in room_keywords)
    
    def is_dimension_annotation(self, text: str) -> bool:
        """Détecte si le texte est une cotation"""
        if not text:
            return False
        dimension_pattern = r'\d+[\.,]?\d*\s*(m|cm|mm|²|x)'
        return bool(re.search(dimension_pattern, text.lower()))
    
    def inpaint_zone(self, image: np.ndarray, zone: Tuple) -> np.ndarray:
        """Efface une zone en utilisant l'inpainting OpenCV pour fondre le texte dans le fond"""
        x1, y1, x2, y2 = zone
        h, w = image.shape[:2]
        
        # S'assurer que la zone est valide
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        if x2 <= x1 or y2 <= y1:
            return image
            
        # Créer un masque d'inpainting de la même taille que l'image
        mask = np.zeros((h, w), dtype=np.uint8)
        # On donne une marge de 2 pixels pour être sûr de bien couvrir les bords du texte
        margin = 2
        mx1, my1 = max(0, x1 - margin), max(0, y1 - margin)
        mx2, my2 = min(w, x2 + margin), min(h, y2 + margin)
        
        mask[my1:my2, mx1:mx2] = 255
        
        # Appliquer l'inpainting
        result = cv2.inpaint(image, mask, 7, cv2.INPAINT_TELEA)
        return result
    
    def remove_generated_text_with_inpainting(self, image: np.ndarray) -> np.ndarray:
        """
        Désactivé en mode sécurité : évite de confondre les textures de sol ou les petits meubles avec du texte.
        """
        # Sécurité : on préserve l'image générée intacte
        return image

    
    def remove_text_residues(self, image: np.ndarray) -> np.ndarray:
        """
        Supprime les petits artefacts de texte restants
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY_INV)
        
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        cleaned_binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
        
        contours, _ = cv2.findContours(cleaned_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        result = image.copy()
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 80:
                cv2.drawContours(result, [contour], -1, (255, 255, 255), -1)
        
        return result
