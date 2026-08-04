# scripts/generate_test_fixtures.py
# ═══════════════════════════════════════════════════════════════
# GENERATION DES FIXTURES DE TEST DE FIDELITE DE PLAN
# ═══════════════════════════════════════════════════════════════

import os
import cv2
import numpy as np

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures")
os.makedirs(FIXTURES_DIR, exist_ok=True)

def create_simple_pdf():
    pdf_path = os.path.join(FIXTURES_DIR, "plan_test_simple.pdf")
    if not os.path.exists(pdf_path):
        img = np.ones((1200, 1600, 3), dtype=np.uint8) * 255
        # Dessin plan 5 pièces
        cv2.rectangle(img, (100, 100), (1500, 1100), (0, 0, 0), 10)
        cv2.line(img, (600, 100), (600, 1100), (0, 0, 0), 8)
        cv2.line(img, (100, 600), (1500, 600), (0, 0, 0), 8)
        cv2.putText(img, "SALON / SEJOUR", (200, 350), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)
        cv2.putText(img, "CUISINE", (800, 350), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)
        cv2.putText(img, "CHAMBRE PARENT", (200, 850), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)
        cv2.putText(img, "CHAMBRE 2", (800, 850), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)
        
        jpg_tmp = os.path.join(FIXTURES_DIR, "tmp_simple.jpg")
        cv2.imwrite(jpg_tmp, img)
        try:
            from PIL import Image
            pil_img = Image.open(jpg_tmp)
            pil_img.save(pdf_path, "PDF", resolution=100.0)
            os.remove(jpg_tmp)
            print(f"✅ Fixture PDF créée : {pdf_path}")
        except Exception:
            print(f"⚠️ Fixture PDF fallback JPG : {jpg_tmp}")

def create_scan_jpg():
    path = os.path.join(FIXTURES_DIR, "plan_scan.jpg")
    img = np.ones((1000, 1200, 3), dtype=np.uint8) * 245
    cv2.rectangle(img, (80, 80), (1120, 920), (20, 20, 20), 8)
    cv2.line(img, (500, 80), (500, 920), (20, 20, 20), 6)
    cv2.putText(img, "SEJOUR", (150, 300), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (20, 20, 20), 2)
    cv2.putText(img, "CHAMBRE", (600, 300), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (20, 20, 20), 2)
    cv2.imwrite(path, img)
    print(f"✅ Fixture Scan JPG créée : {path}")

def create_stylo_jpg():
    path = os.path.join(FIXTURES_DIR, "plan_stylo.jpg")
    img = np.ones((900, 1100, 3), dtype=np.uint8) * 230
    cv2.rectangle(img, (50, 50), (1050, 850), (40, 40, 120), 5)
    cv2.line(img, (550, 50), (550, 850), (40, 40, 120), 4)
    cv2.putText(img, "SALON STYLO", (120, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (40, 40, 120), 2)
    cv2.putText(img, "CHAMBRE STYLO", (620, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (40, 40, 120), 2)
    cv2.imwrite(path, img)
    print(f"✅ Fixture Stylo JPG créée : {path}")

def create_smartphone_jpg():
    path = os.path.join(FIXTURES_DIR, "plan_photo_smartphone.jpg")
    img = np.ones((1200, 900, 3), dtype=np.uint8) * 210
    cv2.rectangle(img, (60, 60), (840, 1140), (15, 15, 15), 7)
    cv2.line(img, (60, 600), (840, 600), (15, 15, 15), 5)
    cv2.putText(img, "SUITE", (150, 300), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (15, 15, 15), 2)
    cv2.putText(img, "SALON", (150, 850), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (15, 15, 15), 2)
    cv2.imwrite(path, img)
    print(f"✅ Fixture Smartphone JPG créée : {path}")

if __name__ == "__main__":
    print("🚀 Génération des fixtures de test de fidélité de plan...")
    create_simple_pdf()
    create_scan_jpg()
    create_stylo_jpg()
    create_smartphone_jpg()
    print("🏆 Toutes les fixtures ont été générées avec succès dans tests/fixtures/ !")
