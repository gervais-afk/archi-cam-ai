import unittest
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scripts.ifc_to_supabase import _appliquer_majorations, _convertir_volume, _resoudre_code

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
