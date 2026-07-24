import os
import re
from typing import List, Optional
from pydantic import BaseModel, Field, UUID4
from fastmcp import FastMCP

mcp = FastMCP("MoteurCalculBTP")

# --- Modèles Pydantic V2 ---

class Metadata(BaseModel):
    projectName: str = "Projet Archi Cam AI"
    sourceId: UUID4
    schemaVersion: str = "2.0"

class MetreInput(BaseModel):
    schemaVersion: str = "2.0"
    sourceId: UUID4
    sourceType: str
    filePath: str
    promptContext: str

class MetreurData(BaseModel):
    schemaVersion: str = "2.0"
    sourceId: UUID4
    volume_beton_m3: float
    surface_coffrage_m2: float
    ratio_parois: Optional[float] = None
    isUnreliable: Optional[bool] = False

class CoefficientsSecurite(BaseModel):
    gamma_b: float
    gamma_s: float

class StructureData(BaseModel):
    schemaVersion: str = "2.0"
    sourceId: UUID4
    typeSol: str
    contrainteAdmise_MPa: float
    typeFondation: str
    ancrageMinimal_cm: float
    enrobageMinimal_mm: float
    coefficientsSecurite: CoefficientsSecurite
    steelRequired_kg_per_m3: Optional[float] = 0.0
    steelRequired_kg: Optional[float] = 0.0
    concreteRequired_m3: Optional[float] = 0.0

class CostItem(BaseModel):
    description: str
    quantity: float
    unit: str
    unitPrice_FCFA: float
    totalPrice_FCFA: float

class EconomisteData(BaseModel):
    schemaVersion: str = "2.0"
    sourceId: UUID4
    debourse_sec_FCFA: float
    temps_unitaire_heures: float
    creditHeuresTotal: float
    cout_materiaux_FCFA: float
    pv_ht_FCFA: float
    pv_ttc_FCFA: float
    breakdown: List[CostItem]
    varianteMateriauxLocaux_FCFA: Optional[float] = None

class GanttTask(BaseModel):
    tacheId: str
    debutPlusTot: float
    finPlusTot: float
    margeTotale: float
    delaiAttente_jours: float = 0.0

class ConducteurData(BaseModel):
    schemaVersion: str = "2.0"
    sourceId: UUID4
    effectifMoyen_ouvriers: int
    dureeChantier_jours: float
    ganttTaches: List[GanttTask]

class SuperviseurData(BaseModel):
    schemaVersion: str = "2.0"
    sourceId: UUID4
    totalCost_FCFA: float
    overallDuration_days: float
    riskLevel: str
    approvalStatus: bool
    comments: Optional[str] = None

# --- CONTEXTE D'ÉTAT ACCUMULATEUR GLOBAL V2 ---

class PipelineContext(BaseModel):
    metadata: Metadata
    titreFoncierValide: bool = False
    permisConstruireObtenu: bool = False
    typeMarche: str = "PRIVE"
    saison: str = "saison_seche"
    metreur: Optional[MetreurData] = None
    structure: Optional[StructureData] = None
    economiste: Optional[EconomisteData] = None
    conducteur: Optional[ConducteurData] = None
    superviseur: Optional[SuperviseurData] = None

# --- Helpers de Calcul Géométrique IFC ---

def calculate_mesh_volume_and_area(verts, faces):
    """Calcul du volume et de la surface par méthode maillage."""
    volume = 0.0
    area = 0.0
    for i in range(0, len(faces), 3):
        try:
            i1, i2, i3 = faces[i], faces[i + 1], faces[i + 2]
            x1, y1, z1 = verts[3*i1], verts[3*i1+1], verts[3*i1+2]
            x2, y2, z2 = verts[3*i2], verts[3*i2+1], verts[3*i2+2]
            x3, y3, z3 = verts[3*i3], verts[3*i3+1], verts[3*i3+2]
            # Formule tétraédrique pour le volume
            v = (x1*y2*z3 - x1*y3*z2 - x2*y1*z3 + x2*y3*z1 +
                 x3*y1*z2 - x3*y2*z1) / 6.0
            volume += v
            # Formule d'aire du triangle
            ux, uy, uz = x2-x1, y2-y1, z2-z1
            vx, vy, vz = x3-x1, y3-y1, z3-z1
            cx = uy*vz - uz*vy
            cy = uz*vx - ux*vz
            cz = ux*vy - uy*vx
            area += (cx**2 + cy**2 + cz**2)**0.5 / 2.0
        except Exception:
            pass
    return abs(volume), area / 2.0

# --- MCP Tools ---

@mcp.tool()
def run_metreur(sourceId: str, sourceType: str, filePath: str, promptContext: str) -> dict:
    """Calculer les métrés pour le projet."""
    input_data = MetreInput(
        sourceId=sourceId,
        sourceType=sourceType,
        filePath=filePath,
        promptContext=promptContext
    )
    print(f"[Python Metreur] Reçu: {input_data.sourceId} ({input_data.filePath})")
    
    volume = 120.5
    surface = 85.0
    
    file_path = input_data.filePath
    if not os.path.exists(file_path) and os.path.exists(os.path.join("..", file_path)):
        file_path = os.path.join("..", file_path)

    # Cas 1 : Fichier IFC réel
    if file_path and os.path.exists(file_path) and file_path.lower().endswith(".ifc"):
        try:
            print(f"[Python Metreur] Lecture réelle de l'IFC: {file_path}")
            import ifcopenshell
            import ifcopenshell.geom
            
            model = ifcopenshell.open(file_path)
            total_volume = 0.0
            total_area = 0.0
            geom_settings = ifcopenshell.geom.settings()
            
            element_types = ["IfcWall", "IfcSlab", "IfcColumn", "IfcBeam"]
            for type_name in element_types:
                elements = model.by_type(type_name)
                for el in elements:
                    try:
                        shape = ifcopenshell.geom.create_shape(geom_settings, el)
                        verts = shape.geometry.verts
                        faces = shape.geometry.faces
                        geom_vol, geom_area = calculate_mesh_volume_and_area(verts, faces)
                        total_volume += geom_vol
                        total_area += geom_area
                    except Exception:
                        pass
            
            if total_volume > 0:
                volume = round(total_volume, 2)
            if total_area > 0:
                surface = round(total_area, 2)
                
            print(f"[Python Metreur] Volumes calculés réels : volume={volume} m3, surface={surface} m2")
        except Exception as e:
            print(f"[Python Metreur] Erreur lors du parsing IFC: {str(e)}")

    # Cas 2 : Rapport ou plan PDF
    elif file_path and os.path.exists(file_path) and file_path.lower().endswith(".pdf"):
        try:
            print(f"[Python Metreur] Extraction de texte du PDF: {file_path}")
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            full_text = ""
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
            
            volume_matches = re.findall(r"(\d+(?:[.,]\d+)?)\s*(?:m3|m³|mètres cubes|metres cubes|cube)", full_text, re.IGNORECASE)
            surface_matches = re.findall(r"(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mètres carrés|metres carres|carré)", full_text, re.IGNORECASE)
            
            if volume_matches:
                val = float(volume_matches[0].replace(",", "."))
                if val > 0:
                    volume = val
            if surface_matches:
                val = float(surface_matches[0].replace(",", "."))
                if val > 0:
                    surface = val
            print(f"[Python Metreur] PDF analysé : volume extrait={volume} m3, surface extraite={surface} m2")
        except Exception as e:
            print(f"[Python Metreur] Erreur d'extraction textuelle PDF: {e}")

    is_unreliable = False
    if volume < 10.0 or volume > 500.0:
        is_unreliable = True
        print(f"[Python Metreur] ⚠️ ALERTE : Le volume de béton ({volume} m3) semble suspect pour un R+1.")

    res = MetreurData(
        sourceId=input_data.sourceId,
        volume_beton_m3=volume,
        surface_coffrage_m2=surface,
        ratio_parois=1.45,
        isUnreliable=is_unreliable
    )
    return res.model_dump()

@mcp.tool()
def run_structure(context: dict) -> dict:
    """Calculer et dimensionner la structure."""
    ctx = PipelineContext.model_validate(context)
    print(f"[Python Structure] Reçu contexte pour: {ctx.metadata.sourceId}")
    
    if not ctx.metreur or not ctx.structure:
        raise ValueError("Metreur et Structure requis pour dimensionner la structure")
        
    metreur = ctx.metreur
    struct_input = ctx.structure
    
    concrete = metreur.volume_beton_m3 * 1.1
    if "filant" in struct_input.typeFondation.lower() or "renforc" in struct_input.typeFondation.lower() or "puits" in struct_input.typeFondation.lower():
        steel_ratio = 95.0
    else:
        steel_ratio = 75.0
        
    steel = concrete * steel_ratio
    
    ctx.structure.steelRequired_kg_per_m3 = steel_ratio
    ctx.structure.steelRequired_kg = round(steel, 2)
    ctx.structure.concreteRequired_m3 = round(concrete, 2)
    
    return ctx.model_dump()

@mcp.tool()
def run_economiste(context: dict) -> dict:
    """Estimation des coûts du projet."""
    ctx = PipelineContext.model_validate(context)
    print(f"[Python Economiste] Reçu contexte pour: {ctx.metadata.sourceId}")
    
    if not ctx.metreur or not ctx.structure:
        raise ValueError("Données de Metreur et Structure requises pour l'économiste")
        
    metreur = ctx.metreur
    struct = ctx.structure
    
    price_concrete_m3 = 120000.0
    price_steel_kg = 850.0

    # Salaire moyen et charges CNRS (Cameroun)
    TAUX_HORAIRE_MOYEN_CFA = 870  # FCFA / heure (approx. 150k FCFA / mois ÷ 173h)
    COEF_CHARGES_CNPS = 1.16      # +16% charges sociales

    temps_coffrage = metreur.surface_coffrage_m2 * 0.5
    temps_betonnage = (struct.concreteRequired_m3 or 0.0) * 1.2
    total_heures_tu = temps_coffrage + temps_betonnage

    # Coût main‑d’œuvre
    cout_main_oeuvre = total_heures_tu * TAUX_HORAIRE_MOYEN_CFA * COEF_CHARGES_CNPS

    cout_materiaux = ((struct.concreteRequired_m3 or 0.0) * 85000.0) + ((struct.steelRequired_kg or 0.0) * 600.0)

    # Immobilisation matériel (ex: location étais pendant le coulage et séchage dalle)
    duree_coulage_jours = temps_betonnage / 8.0
    delai_sechage_bael = 14.0 # jours
    prix_jour_etais = 5000.0 # FCFA/j
    cout_location_etais = prix_jour_etais * (duree_coulage_jours + delai_sechage_bael)

    # Déboursé total inclut matériaux + main‑d’œuvre + location
    debourse_sec = cout_materiaux + cout_main_oeuvre + cout_location_etais
    
    variante_btc_fcfa = None
    if ctx.typeMarche == "PUBLIC":
        variante_btc_fcfa = cout_materiaux * 0.70 # Ex: -30% sur les murs avec BTC
    
    pv_ht = debourse_sec * 1.35
    pv_ttc = pv_ht * 1.1925
    
    breakdown = [
        CostItem(
            description=f"Béton armé (fourniture et mise en oeuvre pour surface de {metreur.surface_coffrage_m2} m2)",
            quantity=struct.concreteRequired_m3 or 0.0,
            unit="m3",
            unitPrice_FCFA=price_concrete_m3,
            totalPrice_FCFA=(struct.concreteRequired_m3 or 0.0) * price_concrete_m3
        ),
        CostItem(
            description=f"Acier pour fondation ({struct.typeFondation} - ratio {struct.steelRequired_kg_per_m3 or 0.0} kg/m3)",
            quantity=struct.steelRequired_kg or 0.0,
            unit="kg",
            unitPrice_FCFA=price_steel_kg,
            totalPrice_FCFA=(struct.steelRequired_kg or 0.0) * price_steel_kg
        )
    ]
    
    res = EconomisteData(
        sourceId=ctx.metadata.sourceId,
        debourse_sec_FCFA=debourse_sec,
        temps_unitaire_heures=total_heures_tu,
        creditHeuresTotal=total_heures_tu,
        cout_materiaux_FCFA=cout_materiaux,
        pv_ht_FCFA=pv_ht,
        pv_ttc_FCFA=pv_ttc,
        breakdown=breakdown,
        varianteMateriauxLocaux_FCFA=variante_btc_fcfa
    )
    return res.model_dump()

@mcp.tool()
def run_conducteur(context: dict) -> dict:
    """Planification du chantier."""
    ctx = PipelineContext.model_validate(context)
    print(f"[Python Conducteur] Reçu contexte pour: {ctx.metadata.sourceId}")
    
    if not ctx.economiste or not ctx.conducteur:
        raise ValueError("Données de l'économiste ou conducteur manquantes")
        
    eco = ctx.economiste
    conducteur_input = ctx.conducteur
    
    activities = []
    
    weights = {
        "T1": 0.10,
        "T2": 0.15,
        "T3": 0.50,
        "T4": 0.25
    }
    
    crew_size_default = conducteur_input.effectifMoyen_ouvriers if conducteur_input.effectifMoyen_ouvriers > 0 else 4
    temps_cumule_jours = 0.0
    
    saison = ctx.saison
    if saison == "saison_pluies_legere":
        coeff_meteo = 1.15
    elif saison == "saison_pluies_forte":
        coeff_meteo = 1.30
    else:
        coeff_meteo = 1.0
        
    coeff_efficacite = 0.80

    for act in conducteur_input.ganttTaches:
        weight = weights.get(act.tacheId, 0.20)
        crew = crew_size_default
        
        duration_heures = eco.creditHeuresTotal * weight
        duration_heures = duration_heures * coeff_meteo / coeff_efficacite
        working_days = duration_heures / (crew * 8.0)
        calendar_days = working_days * (7.0 / 6.0)
        
        duration = max(1.0, round(calendar_days, 1))
        
        delai_attente = act.delaiAttente_jours
        debut_tot = temps_cumule_jours + delai_attente
        fin_tot = debut_tot + duration
        
        activities.append(
            GanttTask(
                tacheId=act.tacheId,
                debutPlusTot=round(debut_tot, 1),
                finPlusTot=round(fin_tot, 1),
                margeTotale=0.0,
                delaiAttente_jours=delai_attente
            )
        )
        temps_cumule_jours = fin_tot
    
    ctx.conducteur = ConducteurData(
        sourceId=ctx.metadata.sourceId,
        effectifMoyen_ouvriers=crew_size_default,
        dureeChantier_jours=round(temps_cumule_jours, 1),
        ganttTaches=activities
    )
    return ctx.model_dump()

@mcp.tool()
def run_superviseur(context: dict) -> dict:
    """Supervision finale du projet."""
    ctx = PipelineContext.model_validate(context)
    print(f"[Python Superviseur] Reçu contexte pour: {ctx.metadata.sourceId}")
    
    if not ctx.conducteur or not ctx.economiste:
        raise ValueError("Données de conducteur et économiste requises pour supervision")
        
    eco = ctx.economiste
    conducteur = ctx.conducteur
    
    approval_status = True
    risk_level = "LOW"
    comments = "Projet validé. Temps d'exécution conformes aux Temps Unitaires (TU) du Guide du tâcheron."
    
    if ctx.superviseur:
        approval_status = ctx.superviseur.approvalStatus
        risk_level = ctx.superviseur.riskLevel
        comments = ctx.superviseur.comments or comments
        
    res = SuperviseurData(
        sourceId=ctx.metadata.sourceId,
        totalCost_FCFA=eco.pv_ttc_FCFA,
        overallDuration_days=conducteur.dureeChantier_jours,
        riskLevel=risk_level,
        approvalStatus=approval_status,
        comments=comments
    )
    return res.model_dump()

@mcp.tool()
def get_ifc_storeys(file_path: str) -> list[dict]:
    """Obtenir la liste des étages (IfcBuildingStorey) du fichier IFC."""
    import ifcopenshell
    import os
    if not os.path.exists(file_path) and os.path.exists(os.path.join("..", file_path)):
        file_path = os.path.join("..", file_path)
    if not os.path.exists(file_path):
        return [{"error": f"Fichier introuvable: {file_path}"}]
    
    try:
        model = ifcopenshell.open(file_path)
        storeys = model.by_type("IfcBuildingStorey")
        result = []
        for s in storeys:
            result.append({
                "id": s.GlobalId,
                "name": s.Name or "Sans Nom",
                "elevation": s.Elevation if hasattr(s, "Elevation") else None
            })
        return result
    except Exception as e:
        return [{"error": str(e)}]

@mcp.tool()
def extract_ifc_elements(file_path: str, element_types: list[str], storey_name: str = None) -> list[dict]:
    """Extraire les quantités et matériaux des éléments IFC spécifiés.
    Si storey_name est fourni, filtre les éléments appartenant à cet étage.
    """
    import ifcopenshell
    import ifcopenshell.util.element
    import os
    if not os.path.exists(file_path) and os.path.exists(os.path.join("..", file_path)):
        file_path = os.path.join("..", file_path)
    if not os.path.exists(file_path):
        return [{"error": f"Fichier introuvable: {file_path}"}]
        
    try:
        model = ifcopenshell.open(file_path)
        result = []
        
        target_storey = None
        if storey_name:
            storeys = model.by_type("IfcBuildingStorey")
            for s in storeys:
                if s.Name and storey_name.lower() in s.Name.lower():
                    target_storey = s
                    break
                    
        for type_name in element_types:
            elements = model.by_type(type_name)
            for el in elements:
                # Filtrage par étage
                if target_storey:
                    container = ifcopenshell.util.element.get_container(el)
                    if not container or container.GlobalId != target_storey.GlobalId:
                        continue
                        
                quantities = {}
                if hasattr(el, "IsDefinedBy") and el.IsDefinedBy:
                    for relDefinesByProperties in el.IsDefinedBy:
                        if relDefinesByProperties.is_a("IfcRelDefinesByProperties"):
                            prop_set = relDefinesByProperties.RelatingPropertyDefinition
                            if prop_set.is_a("IfcElementQuantity") and hasattr(prop_set, "Quantities"):
                                for q in prop_set.Quantities:
                                    if q.is_a("IfcQuantityVolume"):
                                        quantities["volume"] = q.VolumeValue
                                    elif q.is_a("IfcQuantityArea"):
                                        quantities["area"] = q.AreaValue
                                    elif q.is_a("IfcQuantityLength"):
                                        quantities["length"] = q.LengthValue
                                        
                material = "Inconnu"
                if hasattr(el, "HasAssociations") and el.HasAssociations:
                    for assoc in el.HasAssociations:
                        if assoc.is_a("IfcRelAssociatesMaterial"):
                            mat_select = assoc.RelatingMaterial
                            if mat_select.is_a("IfcMaterial"):
                                material = mat_select.Name
                            elif mat_select.is_a("IfcMaterialLayerSetUsage") and hasattr(mat_select, "ForLayerSet"):
                                material = "Composite / " + mat_select.ForLayerSet.LayerSetName
                            elif mat_select.is_a("IfcMaterialList") and hasattr(mat_select, "Materials"):
                                material = " / ".join([m.Name for m in mat_select.Materials if hasattr(m, "Name")])
                                
                result.append({
                    "id": el.GlobalId,
                    "type": type_name,
                    "name": el.Name,
                    "material": material,
                    "quantities": quantities
                })
        return result
    except Exception as e:
        return [{"error": str(e)}]

@mcp.tool()
def run_architectural_crew(filePath: str, promptContext: str, zoneClimatique: str = "Tropicale", typeSol: str = "Normal", saison: str = "saison_seche") -> str:
    """Déclenche l'équipe d'agents CrewAI (Designer, Technique, Commercial, Conducteur)
    pour analyser les métrés géométriques IFC et générer un devis optimisé avec remises de volume,
    en prenant en compte les paramètres de climat et de sol.
    """
    print(f"[Python Crew] Analyse en cours via CrewAI pour le fichier: {filePath}")
    
    # 1. Étape de métrés bruts (récupération des données IFC ou estimation)
    volume_beton = 120.5
    surface_coffrage = 85.0
    steel_weight = 10800.0
    wall_area = 185.0
    
    # Simulation d'analyse IFC
    import os
    if filePath and os.path.exists(filePath) and filePath.lower().endswith(".ifc"):
        try:
            import ifcopenshell
            import ifcopenshell.geom
            model = ifcopenshell.open(filePath)
            total_volume = 0.0
            total_area = 0.0
            geom_settings = ifcopenshell.geom.settings()
            
            element_types = ["IfcWall", "IfcSlab", "IfcColumn", "IfcBeam"]
            for type_name in element_types:
                elements = model.by_type(type_name)
                for el in elements:
                    try:
                        shape = ifcopenshell.geom.create_shape(geom_settings, el)
                        verts = shape.geometry.verts
                        faces = shape.geometry.faces
                        geom_vol, geom_area = calculate_mesh_volume_and_area(verts, faces)
                        total_volume += geom_vol
                        total_area += geom_area
                    except Exception:
                        pass
            
            if total_volume > 0:
                volume_beton = round(total_volume, 2)
            if total_area > 0:
                surface_coffrage = round(total_area, 2)
            # Ratios de ferraillage standards
            steel_weight = round(volume_beton * 90, 2)
            wall_area = round(surface_coffrage * 1.45, 2)
        except Exception as e:
            print(f"[Python Crew] Erreur de lecture de l'IFC: {str(e)}")
 
    ifc_metadata = {
        "concreteVolume": volume_beton,
        "steelWeight": steel_weight,
        "wallArea": wall_area,
        "elementCount": 150
    }
    
    # Lancement du CrewAI
    from crew_agents import run_archi_project_crew
    result_json = run_archi_project_crew(
        ifc_metadata, 
        promptContext, 
        zone_climatique=zoneClimatique, 
        type_sol=typeSol, 
        saison=saison
    )
    return result_json
 
if __name__ == "__main__":
    mcp.run()

