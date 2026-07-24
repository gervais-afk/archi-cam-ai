import ifcopenshell
import ifcopenshell.util.element

class IFCParser:
    def __init__(self, file_path):
        self.file_path = file_path
        self.model = ifcopenshell.open(file_path)

    def get_summary(self):
        """Retourne un résumé rapide des éléments de la maquette."""
        summary = {
            "walls": len(self.model.by_type("IfcWall")),
            "slabs": len(self.model.by_type("IfcSlab")),
            "columns": len(self.model.by_type("IfcColumn")),
            "spaces": len(self.model.by_type("IfcSpace"))
        }
        return summary

    def extract_quantities(self):
        """Extrait les volumes et surfaces pour le DQE et le planning."""
        quantities = {
            "concrete_volume": 0.0,
            "formwork_area": 0.0
        }
        
        # On parcourt les éléments porteurs
        for element in self.model.by_type("IfcBuildingElement"):
            # Tentative d'extraction des propriétés de quantité
            psets = ifcopenshell.util.element.get_psets(element)
            
            # Recherche dans BaseQuantities (Standard IFC)
            if "BaseQuantities" in psets:
                bq = psets["BaseQuantities"]
                quantities["concrete_volume"] += bq.get("NetVolume", 0.0)
                quantities["formwork_area"] += bq.get("GrossSideArea", 0.0)
                
        return quantities

    def check_legal_dimensions(self):
        """Extrait les dimensions des pièces pour l'Agent Legal."""
        rooms = []
        for space in self.model.by_type("IfcSpace"):
            psets = ifcopenshell.util.element.get_psets(space)
            
            # Extraction du nom et des dimensions
            room_info = {
                "name": space.Name,
                "surface": 0.0,
                "height": 0.0
            }
            
            if "BaseQuantities" in psets:
                bq = psets["BaseQuantities"]
                room_info["surface"] = bq.get("NetFloorArea", 0.0)
                room_info["height"] = bq.get("Height", 0.0)
            
            rooms.append(room_info)
        return rooms

# Exemple d'usage (sera intégré dans les skills de l'agent)
if __name__ == "__main__":
    # Test fictif
    print("Moteur de parsing IFC Archi Cam AI initialisé.")
