import ifcopenshell
import ifcopenshell.util.element
import ifcopenshell.geom
import json
import os

# =============================================================================
# LOD 400 – Export BIM Data avec prise en charge de IfcBuildingElementPart
# =============================================================================
# Le script génère export_supabase.json avec deux listes :
#  • devis_items  : éléments parents classiques (IfcWall, IfcSlab…)
#  • parts_items  : tranches IfcBuildingElementPart mappées sur nom_materiau
# =============================================================================


def calculate_mesh_volume_and_area(verts, faces):
    """Calcul du volume et de la surface par méthode maillage (fallback)."""
    volume = 0.0
    area = 0.0
    for i in range(0, len(faces), 3):
        try:
            i1, i2, i3 = faces[i], faces[i + 1], faces[i + 2]
            x1, y1, z1 = verts[3*i1], verts[3*i1+1], verts[3*i1+2]
            x2, y2, z2 = verts[3*i2], verts[3*i2+1], verts[3*i2+2]
            x3, y3, z3 = verts[3*i3], verts[3*i3+1], verts[3*i3+2]
            v = (x1*y2*z3 - x1*y3*z2 - x2*y1*z3 + x2*y3*z1 +
                 x3*y1*z2 - x3*y2*z1) / 6.0
            volume += v
            ux, uy, uz = x2-x1, y2-y1, z2-z1
            vx, vy, vz = x3-x1, y3-y1, z3-z1
            cx = uy*vz - uz*vy
            cy = uz*vx - ux*vz
            cz = ux*vy - uy*vx
            area += (cx**2 + cy**2 + cz**2)**0.5 / 2.0
        except Exception:
            pass
    return abs(volume), area / 2.0


def _get_storey(element, element_to_storey: dict) -> str:
    """Recherche le niveau spatial dans le mapping pré-calculé ou remonte la hiérarchie."""
    storey = element_to_storey.get(element.GlobalId)
    if storey:
        return storey
    # Remonter au parent (IfcBuildingElementPart n'est généralement pas
    # directement dans ContainsElements du storey)
    if hasattr(element, 'Decomposes'):
        for rel in element.Decomposes:
            parent = rel.RelatingObject
            return element_to_storey.get(parent.GlobalId, "Général")
    return "Général"


def _get_material_name(element) -> str:
    """
    Extrait le nom du matériau associé à un élément IFC.
    Priorité : IfcMaterial > IfcMaterialConstituentSet > IfcMaterialLayerSetUsage.
    """
    if not hasattr(element, 'HasAssociations'):
        return "Inconnu"
    for assoc in element.HasAssociations:
        if not assoc.is_a("IfcRelAssociatesMaterial"):
            continue
        mat = assoc.RelatingMaterial
        if mat.is_a("IfcMaterial"):
            return mat.Name or "Inconnu"
        elif mat.is_a("IfcMaterialConstituentSet"):
            constituents = mat.MaterialConstituents
            if constituents:
                return constituents[0].Material.Name or "Inconnu"
        elif mat.is_a("IfcMaterialLayerSetUsage"):
            try:
                return mat.ForLayerSet.LayerSetName or "Composite"
            except Exception:
                return "Composite"
        elif mat.is_a("IfcMaterialList"):
            if mat.Materials:
                return mat.Materials[0].Name or "Inconnu"
    return "Inconnu"


def _get_native_quantities(psets: dict):
    """
    Lit les quantités nettes depuis BaseQuantities (priorité) ou autres psets.
    Retourne (volume_net, surface_nette).
    """
    volume_net = 0.0
    surface_nette = 0.0

    # BaseQuantities en priorité
    if "BaseQuantities" in psets:
        bq = psets["BaseQuantities"]
        volume_net = bq.get("NetVolume", bq.get("GrossVolume", 0.0))
        surface_nette = bq.get("NetSideArea",
                               bq.get("NetFloorArea",
                               bq.get("GrossArea", 0.0)))

    # Fallback : parcourir tous les psets
    if volume_net == 0.0:
        for props in psets.values():
            if not isinstance(props, dict):
                continue
            for k in ["NetVolume", "volume", "Volume", "GrossVolume"]:
                if k in props and isinstance(props[k], (int, float)):
                    volume_net = props[k]
                    break
            if volume_net:
                break

    if surface_nette == 0.0:
        for props in psets.values():
            if not isinstance(props, dict):
                continue
            for k in ["NetArea", "NetSideArea", "NetFloorArea", "area",
                      "Area", "GrossArea"]:
                if k in props and isinstance(props[k], (int, float)):
                    surface_nette = props[k]
                    break
            if surface_nette:
                break

    return volume_net, surface_nette


# ---------------------------------------------------------------------------
# Extraction principale
# ---------------------------------------------------------------------------

def extract_bim_data(ifc_file_path: str) -> dict:
    print(f"🚀 Ouverture du fichier IFC : {ifc_file_path}")
    if not os.path.exists(ifc_file_path):
        print("Erreur : Fichier IFC non trouvé.")
        return {}

    try:
        model = ifcopenshell.open(ifc_file_path)
    except Exception as e:
        print(f"Erreur d'ouverture IFC : {e}")
        return {}

    supabase_payload = {
        "projet": "Duplex R+1 NDA FAMILY",
        "niveaux": [],
        "devis_items": [],   # Éléments parents classiques
        "parts_items": []    # IfcBuildingElementPart (LOD 400)
    }

    geom_settings = ifcopenshell.geom.settings()
    storeys = model.by_type("IfcBuildingStorey")
    print(f"🏗️  {len(storeys)} niveau(x) détecté(s).")

    # Mapping GlobalId → nom du storey
    element_to_storey = {}
    for storey in storeys:
        niveau_nom = storey.Name
        supabase_payload["niveaux"].append({
            "nom": niveau_nom,
            "elements_extraits": 0
        })
        if hasattr(storey, 'ContainsElements'):
            for rel in storey.ContainsElements:
                for el in rel.RelatedElements:
                    element_to_storey[el.GlobalId] = niveau_nom

    # =========================================================================
    # 1. Éléments parents (hiérarchie classique)
    # =========================================================================
    classes_cibles = [
        "IfcWall", "IfcSlab", "IfcColumn", "IfcBeam", "IfcSpace",
        "IfcSite", "IfcGeographicElement", "IfcMember", "IfcCovering"
    ]

    for class_name in classes_cibles:
        elements = model.by_type(class_name)
        print(f"  Analyse {class_name} : {len(elements)} élément(s)...")

        for element in elements:
            niveau_nom = _get_storey(element, element_to_storey)
            psets = ifcopenshell.util.element.get_psets(element)

            # Code_Article (peut être absent en LOD 400 pur)
            code_article = None
            for pset_name, properties in psets.items():
                if isinstance(properties, dict):
                    code_article = (properties.get("Code_Article") or
                                    properties.get("Macro_Code"))
                    if code_article:
                        break

            # Quantités natives
            volume_net, surface_nette = _get_native_quantities(psets)

            # Fallback maillage géométrique
            if class_name in ["IfcWall", "IfcSlab", "IfcColumn",
                               "IfcBeam", "IfcMember", "IfcCovering"]:
                if volume_net == 0.0 or surface_nette == 0.0:
                    try:
                        shape = ifcopenshell.geom.create_shape(
                            geom_settings, element)
                        geom_vol, geom_area = calculate_mesh_volume_and_area(
                            shape.geometry.verts, shape.geometry.faces)
                        volume_net = volume_net or geom_vol
                        surface_nette = surface_nette or geom_area
                    except Exception:
                        pass

            material = _get_material_name(element)

            item_data = {
                "ifc_id": element.GlobalId,
                "nom_element": element.Name or f"{class_name}_Unnamed",
                "classe_ifc": element.is_a(),
                "niveau": niveau_nom,
                "code_article": code_article,
                "materiau": material,
                "quantite_volume_m3": round(volume_net, 4),
                "quantite_surface_m2": round(surface_nette, 4)
            }
            supabase_payload["devis_items"].append(item_data)

            for nv in supabase_payload["niveaux"]:
                if nv["nom"] == niveau_nom:
                    nv["elements_extraits"] += 1
                    break

    # =========================================================================
    # 2. IfcBuildingElementPart – LOD 400
    #    Clé de mapping : nom_materiau → Code_Article (via mercuriale Supabase)
    # =========================================================================
    parts = model.by_type("IfcBuildingElementPart")
    print(f"\n🧱 {len(parts)} IfcBuildingElementPart détecté(s). Traitement LOD 400...")

    for part in parts:
        niveau_nom = _get_storey(part, element_to_storey)
        nom_materiau = _get_material_name(part)

        psets = ifcopenshell.util.element.get_psets(part)
        volume_net, surface_nette = _get_native_quantities(psets)

        # Fallback maillage géométrique pour les parts
        if volume_net == 0.0 or surface_nette == 0.0:
            try:
                shape = ifcopenshell.geom.create_shape(geom_settings, part)
                geom_vol, geom_area = calculate_mesh_volume_and_area(
                    shape.geometry.verts, shape.geometry.faces)
                volume_net = volume_net or geom_vol
                surface_nette = surface_nette or geom_area
            except Exception:
                pass

        # Traçabilité vers l'élément parent
        parent_id = None
        parent_name = None
        parent_classe = None
        if hasattr(part, 'Decomposes'):
            for rel in part.Decomposes:
                parent = rel.RelatingObject
                parent_id = parent.GlobalId
                parent_name = parent.Name
                parent_classe = parent.is_a()
                break

        supabase_payload["parts_items"].append({
            "ifc_id": part.GlobalId,
            "nom_element": part.Name or "Part_Unnamed",
            "classe_ifc": "IfcBuildingElementPart",
            "niveau": niveau_nom,
            "nom_materiau": nom_materiau,          # Clé de mapping mercuriale
            "code_article": None,                  # Résolu par mapping Supabase
            "parent_ifc_id": parent_id,
            "parent_nom": parent_name,
            "parent_classe": parent_classe,
            "quantite_volume_m3": round(volume_net, 4),
            "quantite_surface_m2": round(surface_nette, 4)
        })

    print("\n✅ Extraction terminée avec succès !")
    return supabase_payload


# ---------------------------------------------------------------------------
# Point d'entrée
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    fichier_ifc = r"c:\Users\HP\Desktop\Archi Cam AI\Projet_duplex _R+1_v28.ifc"
    donnees = extract_bim_data(fichier_ifc)

    with open("export_supabase.json", "w", encoding="utf-8") as f:
        json.dump(donnees, f, indent=4, ensure_ascii=False)

    classified = [it for it in donnees.get("devis_items", [])
                  if it.get("code_article")]
    print(f"\n📊 Extraction complétée :")
    print(f"   - Éléments parents     : {len(donnees.get('devis_items', []))}")
    print(f"   - Avec Code_Article    : {len(classified)}")
    print(f"   - IfcBuildingElementPart (LOD 400) : {len(donnees.get('parts_items', []))}")
    print(f"   Payload → 'export_supabase.json'")
