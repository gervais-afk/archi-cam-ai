import cv2
import numpy as np

class HatchRemover:
    """
    Filtre & Élimine les Hachures à 45°/135° dans les Murs et les Sols (Hatching Pattern Filter)
    """

    @staticmethod
    def remove_hatching(binary_walls: np.ndarray) -> np.ndarray:
        """
        Détecte les lignes parallèles de hachures inclinées (espacement 2-8px)
        et les élimine pour obtenir un masque de murs propre et plein.
        """
        h, w = binary_walls.shape[:2]

        # 1. Noyaux morphologiques directionnels à 45° et 135°
        kernel_45 = np.array([
            [0, 0, 1],
            [0, 1, 0],
            [1, 0, 0]
        ], dtype=np.uint8)

        kernel_135 = np.array([
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ], dtype=np.uint8)

        # 2. Extraction des motifs répétés de hachures
        hatch_45 = cv2.morphologyEx(binary_walls, cv2.MORPH_OPEN, kernel_45, iterations=2)
        hatch_135 = cv2.morphologyEx(binary_walls, cv2.MORPH_OPEN, kernel_135, iterations=2)
        hatch_mask = cv2.bitwise_or(hatch_45, hatch_135)

        # 3. Filtrer uniquement les lignes minces (épaisseur < 3px) pour ne pas détruire les murs massifs
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(hatch_mask)
        thin_hatches = np.zeros_like(binary_walls)

        for i in range(1, num_labels):
            w_comp = stats[i, cv2.CC_STAT_WIDTH]
            h_comp = stats[i, cv2.CC_STAT_HEIGHT]
            area = stats[i, cv2.CC_STAT_AREA]

            # Les hachures sont des traits fins et étirés
            if area < 400 and (w_comp <= 5 or h_comp <= 5):
                thin_hatches[labels == i] = 255

        # 4. Soustraire les hachures et solidifier les contours extérieurs de murs
        cleaned_walls = cv2.subtract(binary_walls, thin_hatches)
        kernel_solidify = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        solidified = cv2.morphologyEx(cleaned_walls, cv2.MORPH_CLOSE, kernel_solidify)

        return solidified
