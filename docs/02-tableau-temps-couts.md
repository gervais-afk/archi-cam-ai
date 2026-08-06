# 02 - Tableau des Temps & Coûts par Type de Fichier

| Type Fichier | Pipeline | Temps Moyen | Coût | Cache Possible |
|--------------|----------|-------------|------|----------------|
| **IFC natif** | Direct → Extraction | 0.004s | 0 FCFA | ✅ Oui |
| **Revit (.rvt)** | Conversion → IFC → Extraction | 45-90s | 5 FCFA | ✅ Oui |
| **ArchiCAD (.pln)** | Conversion → IFC → Extraction | 40-80s | 5 FCFA | ✅ Oui |
| **SketchUp (.skp)** | Conversion → IFC → Extraction | 30-60s | 5 FCFA | ✅ Oui |
| **DWG/DXF** | Conversion → IFC → Extraction | 35-70s | 5 FCFA | ✅ Oui |
| **Plan 2D (.pdf/.png)** | Vision IA → Rendu 3D | 15-30s | 2 FCFA | ❌ Non |

**💡 Astuce** : Pour les projets avec modifications itératives, privilégiez l'export IFC depuis votre logiciel natif pour bénéficier du cache instantané (0s).
