# scripts/outdoor_space_detector.py
"""
Détecte les espaces extérieurs (balcons, vérandas, terrasses)
en analysant les lignes pointillées et les ouvertures
"""

import cv2
import numpy as np
from typing import List, Dict, Tuple

class OutdoorSpaceDetector:
    """
    Identifie les balcons et vérandas par analyse des motifs de lignes
    """
    
    def detect_outdoor_spaces(self, image: np.ndarray) -> Dict:
        """
        Détecte les espaces extérieurs
        
        Returns:
            Dict avec masques des zones outdoor
        """
        print("🌳 Détection des espaces extérieurs...")
        
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 1. Détection des lignes pointillées (garde-corps)
        dashed_lines = self.detect_dashed_lines(gray)
        
        # 2. Détection des grandes ouvertures (baies vitrées)
        large_openings = self.detect_large_openings(gray)
        
        # 3. Fusion des informations
        outdoor_mask = self.combine_indicators(dashed_lines, large_openings, gray.shape)
        
        # 4. Segmentation des zones distinctes
        outdoor_zones = self.segment_outdoor_zones(outdoor_mask)
        
        print(f"  ✓ {len(outdoor_zones)} espaces extérieurs détectés")
        
        return {
            'mask': outdoor_mask,
            'zones': outdoor_zones,
            'dashed_lines': dashed_lines
        }
    
    def detect_dashed_lines(self, gray: np.ndarray) -> np.ndarray:
        """
        Détecte les lignes en pointillés (typiques des garde-corps)
        """
        # Détection de contours
        edges = cv2.Canny(gray, 50, 150)
        
        # Hough Lines probabiliste
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi/180,
            threshold=30,
            minLineLength=20,
            maxLineGap=10
        )
        
        dashed_mask = np.zeros_like(gray)
        
        if lines is None:
            return dashed_mask
        
        for line in lines:
            x1, y1, x2, y2 = line.ravel()
            if self.is_dashed_pattern(gray, (x1, y1, x2, y2)):
                cv2.line(dashed_mask, (x1, y1), (x2, y2), 255, 2)
        
        return dashed_mask
    
    def is_dashed_pattern(self, gray: np.ndarray, line: Tuple, threshold_gaps: int = 2) -> bool:
        """
        Vérifie si une ligne a un motif pointillé en échantillonnant son profil d'intensité.
        """
        x1, y1, x2, y2 = line
        length = int(np.sqrt((x2 - x1)**2 + (y2 - y1)**2))
        
        if length < 20 or length > 1000:
            return False
            
        num_samples = min(20, length)
        x_coords = np.linspace(x1, x2, num_samples).astype(int)
        y_coords = np.linspace(y1, y2, num_samples).astype(int)
        
        h, w = gray.shape[:2]
        valid = (x_coords >= 0) & (x_coords < w) & (y_coords >= 0) & (y_coords < h)
        x_coords = x_coords[valid]
        y_coords = y_coords[valid]
        
        if len(x_coords) < 5:
            return False
        
        profile = gray[y_coords, x_coords]
        profile_binary = (profile < 128).astype(int)
        
        transitions = np.diff(profile_binary)
        gaps = np.sum(np.abs(transitions))
        
        return gaps >= threshold_gaps
    
    def detect_large_openings(self, gray: np.ndarray) -> List[Tuple]:
        """
        Détecte les grandes ouvertures (portes-fenêtres, baies vitrées)
        """
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        if np.mean(binary) > 127:
            binary = cv2.bitwise_not(binary)
        
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        openings = []
        
        for contour in contours:
            area = cv2.contourArea(contour)
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = h / w if w > 0 else 0
            
            # Grandes baies vitrées
            if 1.2 < aspect_ratio < 6.0 and 200 < area < 15000:
                openings.append((x, y, w, h))
        
        return openings
    
    def combine_indicators(self, dashed_lines: np.ndarray, openings: List, shape: Tuple) -> np.ndarray:
        """
        Combine les indices pour créer un masque des zones outdoor
        """
        mask = np.zeros(shape[:2], dtype=np.uint8)
        mask = cv2.bitwise_or(mask, dashed_lines)
        
        for (x, y, w, h) in openings:
            cv2.rectangle(mask, (x, y), (x + w, y + h), 255, -1)
        
        # Dilatation
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        mask = cv2.dilate(mask, kernel, iterations=2)
        
        return mask
    
    def segment_outdoor_zones(self, mask: np.ndarray) -> List[Dict]:
        """
        Segmente le masque en zones distinctes
        """
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
        zones = []
        
        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            if area > 500:
                x = stats[i, cv2.CC_STAT_LEFT]
                y = stats[i, cv2.CC_STAT_TOP]
                w = stats[i, cv2.CC_STAT_WIDTH]
                h = stats[i, cv2.CC_STAT_HEIGHT]
                
                zones.append({
                    'bbox': (x, y, x + w, y + h),
                    'area': area,
                    'centroid': list(centroids[i]),
                    'type': 'BALCONY'
                })
        
        return zones
