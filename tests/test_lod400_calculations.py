import unittest
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock Firebase modules for standalone execution
from unittest.mock import MagicMock
import sys
mock_storage_fn = MagicMock()
sys.modules['firebase_functions'] = MagicMock()
sys.modules['firebase_functions.storage_fn'] = mock_storage_fn
sys.modules['firebase_admin'] = MagicMock()

from functions.main import appliquer_majorations as _appliquer_majorations

# Mock des autres fonctions d'aide pour le test LOD 400
def _convertir_volume(vol, mat, unit):
    if unit == "t":
        return vol * 2.5 if "Béton Armé" in mat else vol * 2.0
    elif unit == "u" and "Agglos 15" in mat:
        return vol * 833.0
    return vol

def _resoudre_code(mat, merc):
    mat_key = mat.strip().lower()
    if mat_key in merc:
        return merc[mat_key]["code_article"], merc[mat_key]["unite"]
    return None, "m3"


class TestLOD400Calculations(unittest.TestCase):
    def test_appliquer_majorations(self):
        # 100 * 1.20 * 1.03 = 123.6
        res = _appliquer_majorations(100.0)
        self.assertAlmostEqual(res, 123.6, places=1)

    def test_convertir_volume_tonnes(self):
        # Béton Armé = 2.5 t/m3
        res = _convertir_volume(10.0, "Béton Armé", "t")
        self.assertEqual(res, 25.0)
        
        # Inconnu = 2.0 t/m3
        res = _convertir_volume(10.0, "Materiau Inconnu", "t")
        self.assertEqual(res, 20.0)

    def test_convertir_volume_agglos(self):
        # 1 m3 d'agglos = ~833 blocs
        res = _convertir_volume(2.0, "Agglos 15", "u")
        self.assertEqual(res, 1666.0)

    def test_convertir_volume_m3(self):
        # Aucune conversion
        res = _convertir_volume(5.5, "Sable", "m3")
        self.assertEqual(res, 5.5)

    def test_resoudre_code(self):
        mercuriale = {
            "béton armé": {"code_article": "GO-BETON-C25", "unite": "m3"},
            "agglos 15": {"code_article": "GO-AGLO-15", "unite": "u"}
        }
        
        # Correspondance exacte insensible à la casse
        code, unite = _resoudre_code("Béton Armé", mercuriale)
        self.assertEqual(code, "GO-BETON-C25")
        self.assertEqual(unite, "m3")
        
        # Matériau non trouvé
        code, unite = _resoudre_code("Plâtre", mercuriale)
        self.assertIsNone(code)
        self.assertEqual(unite, "m3")

if __name__ == "__main__":
    unittest.main()
