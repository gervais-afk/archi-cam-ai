import ifcopenshell
import ifcopenshell.util.element
import json
import sys

def extract_ifc_data(ifc_file_path):
    try:
        model = ifcopenshell.open(ifc_file_path)
    except Exception as e:
        return {"error": f"Impossible d'ouvrir le fichier IFC: {str(e)}"}

    data = {
        "project_info": {},
        "elements": []
    }

    # Extraction des informations du projet
    project = model.by_type("IfcProject")[0]
    data["project_info"]["name"] = project.Name
    
    # On cible les éléments constructifs majeurs
    element_types = ["IfcWall", "IfcSlab", "IfcDoor", "IfcWindow", "IfcColumn", "IfcBeam"]
    
    for type_name in element_types:
        elements = model.by_type(type_name)
        for el in elements:
            # Extraction des quantités (Volumes, Surfaces)
            quantities = {}
            for relDefinesByProperties in el.IsDefinedBy:
                if relDefinesByProperties.is_a("IfcRelDefinesByProperties"):
                    prop_set = relDefinesByProperties.RelatingPropertyDefinition
                    if prop_set.is_a("IfcElementQuantity"):
                        for q in prop_set.Quantities:
                            if q.is_a("IfcQuantityVolume"):
                                quantities["volume"] = q.VolumeValue
                            elif q.is_a("IfcQuantityArea"):
                                quantities["area"] = q.AreaValue
                            elif q.is_a("IfcQuantityLength"):
                                quantities["length"] = q.LengthValue

            # Extraction du matériau (simplifié)
            material = "Inconnu"
            if el.HasAssociations:
                for assoc in el.HasAssociations:
                    if assoc.is_a("IfcRelAssociatesMaterial"):
                        mat_select = assoc.RelatingMaterial
                        if mat_select.is_a("IfcMaterial"):
                            material = mat_select.Name
                        elif mat_select.is_a("IfcMaterialLayerSetUsage"):
                            material = "Composite / " + mat_select.ForLayerSet.LayerSetName

            # Estimation du ferraillage (Ratio Cameroun : ~90kg/m3 pour le béton armé)
            reinforcement = 0
            if "volume" in quantities and "Béton" in material:
                reinforcement = quantities["volume"] * 90 # kg

            data["elements"].append({
                "id": el.GlobalId,
                "type": type_name,
                "name": el.Name,
                "material": material,
                "quantities": quantities,
                "estimations": {
                    "ferraillage_kg": round(reinforcement, 2)
                }
            })

    return data

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ifc_extractor.py <path_to_ifc>")
        sys.exit(1)
        
    path = sys.argv[1]
    result = extract_ifc_data(path)
    print(json.dumps(result, indent=4))
