import ifcopenshell
import ifcopenshell.util.element
import xlrd
import os
import json
import sys
from supabase import create_client, Client

# Supabase API config (read from environment variables)
url = os.environ.get("SUPABASE_URL", "https://idgnmgrdhgwxmrmujhmv.supabase.co")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))


import ifcopenshell.geom

def calculate_mesh_volume_and_area(verts, faces):
    volume = 0.0
    area = 0.0
    for i in range(0, len(faces), 3):
        try:
            i1, i2, i3 = faces[i], faces[i+1], faces[i+2]
            x1, y1, z1 = verts[3*i1], verts[3*i1+1], verts[3*i1+2]
            x2, y2, z2 = verts[3*i2], verts[3*i2+1], verts[3*i2+2]
            x3, y3, z3 = verts[3*i3], verts[3*i3+1], verts[3*i3+2]
            
            # Signed volume of tetrahedron
            v = (x1*y2*z3 - x1*y3*z2 - x2*y1*z3 + x2*y3*z1 + x3*y1*z2 - x3*y2*z1) / 6.0
            volume += v
            
            # Area of triangle
            ux, uy, uz = x2 - x1, y2 - y1, z2 - z1
            vx, vy, vz = x3 - x1, y3 - y1, z3 - z1
            cx, cy, cz = uy*vz - uz*vy, uz*vx - ux*vz, ux*vy - uy*vx
            a = (cx**2 + cy**2 + cz**2)**0.5 / 2.0
            area += a
        except Exception:
            pass
    return abs(volume), area / 2.0

def extract_ifc_quantities(ifc_path):
    print(f"Extraction des quantités géométriques IFC par niveau de : {ifc_path}...")
    if not os.path.exists(ifc_path):
        print("Erreur: Fichier IFC non trouvé.")
        return {}, {}

    try:
        model = ifcopenshell.open(ifc_path)
    except Exception as e:
        print(f"Erreur d'ouverture IFC: {e}")
        return {}, {}

    # 1. Total global
    totals = {
        "IfcWall": {"count": 0, "volume": 0.0, "area": 0.0, "maconnerie_vol": 0.0, "enduit_vol": 0.0},
        "IfcSlab": {"count": 0, "volume": 0.0, "area": 0.0, "beton_vol": 0.0, "chape_vol": 0.0},
        "IfcColumn": {"count": 0, "volume": 0.0, "area": 0.0},
        "IfcBeam": {"count": 0, "volume": 0.0, "area": 0.0},
        "IfcDoor": {"count": 0},
        "IfcWindow": {"count": 0},
        "IfcMember": {"count": 0, "volume": 0.0, "area": 0.0},
        "IfcCovering": {"count": 0, "volume": 0.0, "area": 0.0}
    }

    # 2. Structure par niveau
    levels_data = {}
    
    geom_settings = ifcopenshell.geom.settings()
    
    # Trouver tous les storeys (niveaux)
    storeys = model.by_type("IfcBuildingStorey")
    element_to_storey = {}
    
    for storey in storeys:
        storey_name = storey.Name
        levels_data[storey_name] = {
            "IfcWall": {"count": 0, "volume": 0.0, "area": 0.0, "maconnerie_vol": 0.0, "enduit_vol": 0.0},
            "IfcSlab": {"count": 0, "volume": 0.0, "area": 0.0, "beton_vol": 0.0, "chape_vol": 0.0},
            "IfcColumn": {"count": 0, "volume": 0.0, "area": 0.0},
            "IfcBeam": {"count": 0, "volume": 0.0, "area": 0.0},
            "IfcDoor": {"count": 0},
            "IfcWindow": {"count": 0},
            "IfcMember": {"count": 0, "volume": 0.0, "area": 0.0},
            "IfcCovering": {"count": 0, "volume": 0.0, "area": 0.0}
        }
        for rel in storey.ContainsElements:
            for el in rel.RelatedElements:
                element_to_storey[el.GlobalId] = storey_name

    for type_name in totals.keys():
        elements = model.by_type(type_name)
        for el in elements:
            lvl = element_to_storey.get(el.GlobalId, "Général")
            if lvl not in levels_data:
                levels_data[lvl] = {
                    "IfcWall": {"count": 0, "volume": 0.0, "area": 0.0, "maconnerie_vol": 0.0, "enduit_vol": 0.0},
                    "IfcSlab": {"count": 0, "volume": 0.0, "area": 0.0, "beton_vol": 0.0, "chape_vol": 0.0},
                    "IfcColumn": {"count": 0, "volume": 0.0, "area": 0.0},
                    "IfcBeam": {"count": 0, "volume": 0.0, "area": 0.0},
                    "IfcDoor": {"count": 0},
                    "IfcWindow": {"count": 0},
                    "IfcMember": {"count": 0, "volume": 0.0, "area": 0.0},
                    "IfcCovering": {"count": 0, "volume": 0.0, "area": 0.0}
                }
            
            volume = 0.0
            area = 0.0
            
            if type_name in ["IfcWall", "IfcSlab", "IfcColumn", "IfcBeam", "IfcMember", "IfcCovering"]:
                try:
                    shape = ifcopenshell.geom.create_shape(geom_settings, el)
                    verts = shape.geometry.verts
                    faces = shape.geometry.faces
                    volume, area = calculate_mesh_volume_and_area(verts, faces)
                except Exception:
                    pass
                
                # -----------------------------------------------------------------
                # SOTA 1: Classification Internationale Uniclass 2015 & Net Deductions
                # -----------------------------------------------------------------
                uniclass_code = "EF_25_10" # Default Wall
                if type_name == "IfcSlab": uniclass_code = "SL_20_10"
                elif type_name == "IfcColumn": uniclass_code = "EF_25_30"
                elif type_name == "IfcBeam": uniclass_code = "EF_25_30"
                elif type_name == "IfcCovering": uniclass_code = "SS_25_10"

                # Net Volume Deductions (> 0.50m² threshold rule)
                if hasattr(el, 'HasOpenings') and el.HasOpenings:
                    for rel_op in el.HasOpenings:
                        op = rel_op.RelatedOpeningElement
                        try:
                            op_shape = ifcopenshell.geom.create_shape(geom_settings, op)
                            _, op_area = calculate_mesh_volume_and_area(op_shape.geometry.verts, op_shape.geometry.faces)
                            # Seules les ouvertures > 0.50 m² sont déduites selon les normes BTP
                            if op_area > 0.50:
                                area = max(0.0, area - op_area)
                        except Exception:
                            pass

                totals[type_name]["volume"] += volume
                totals[type_name]["area"] += area
                levels_data[lvl][type_name]["volume"] += volume
                levels_data[lvl][type_name]["area"] += area
                
                # Gestion des couches composites avec détection millimétrique
                if type_name == "IfcWall":
                    type_name_str = ""
                    if hasattr(el, 'IsTypedBy') and el.IsTypedBy:
                        type_obj = el.IsTypedBy[0].RelatingType
                        type_name_str = type_obj.Name if type_obj else ""
                    
                    combined = ((el.Name or "") + " " + type_name_str).lower()
                    
                    # Ratios millimétriques déterministes
                    mac_vol = volume
                    end_vol = 0.0
                    
                    if "enduit" in combined or "crépis" in combined:
                        if "190" in combined or "200" in combined:
                            mac_vol = volume * (150.0 / 190.0)
                            end_vol = volume * (40.0 / 190.0)
                        elif "120" in combined or "150" in combined:
                            mac_vol = volume * (110.0 / 150.0)
                            end_vol = volume * (40.0 / 150.0)
                        else:
                            mac_vol = volume * 0.8
                            end_vol = volume * 0.2
                    elif "isol" in combined:
                        mac_vol = volume * (120.0 / 190.0)
                        end_vol = volume * (30.0 / 190.0)

                        
                    totals["IfcWall"]["maconnerie_vol"] += mac_vol
                    totals["IfcWall"]["enduit_vol"] += end_vol
                    levels_data[lvl]["IfcWall"]["maconnerie_vol"] += mac_vol
                    levels_data[lvl]["IfcWall"]["enduit_vol"] += end_vol
                    
                elif type_name == "IfcSlab":
                    type_name_str = ""
                    if hasattr(el, 'IsTypedBy') and el.IsTypedBy:
                        type_obj = el.IsTypedBy[0].RelatingType
                        type_name_str = type_obj.Name if type_obj else ""
                    
                    combined = ((el.Name or "") + " " + type_name_str).lower()
                    
                    bet_vol = volume
                    chp_vol = 0.0
                    
                    if "finition" in combined or "carrelage" in combined:
                        if "155" in combined:
                            bet_vol = volume * (120.0 / 155.0)
                            chp_vol = volume * (35.0 / 155.0)
                        elif "270" in combined:
                            bet_vol = volume * (200.0 / 270.0)
                            chp_vol = volume * (70.0 / 270.0)
                        else:
                            bet_vol = volume * 0.8
                            chp_vol = volume * 0.2
                            
                    totals["IfcSlab"]["beton_vol"] += bet_vol
                    totals["IfcSlab"]["chape_vol"] += chp_vol
                    levels_data[lvl]["IfcSlab"]["beton_vol"] += bet_vol
                    levels_data[lvl]["IfcSlab"]["chape_vol"] += chp_vol
                
            totals[type_name]["count"] += 1
            levels_data[lvl][type_name]["count"] += 1

    # 3. Calculs personnalisés avancés (ConTech)
    print("Calcul des ratios complexes et éléments spécifiques (Fondation, Toiture, Composites)...")
    
    # Dalle RDC 10cm : Slabs dans le Rez-de-chaussée
    dalle_rdc_vol = 0.0
    rdc_slabs = [el for el in model.by_type("IfcSlab") if element_to_storey.get(el.GlobalId) == "Rez-de-chaussée"]
    for el in rdc_slabs:
        try:
            shape = ifcopenshell.geom.create_shape(geom_settings, el)
            verts = shape.geometry.verts
            faces = shape.geometry.faces
            vol, _ = calculate_mesh_volume_and_area(verts, faces)
            dalle_rdc_vol += vol
        except Exception:
            pass
            
    # Béton de propreté sous semelles isolées (débord 10cm)
    proprete_semelles_vol = 0.0
    fondation_slabs = [el for el in model.by_type("IfcSlab") if element_to_storey.get(el.GlobalId) == "fondation"]
    for el in fondation_slabs:
        try:
            shape = ifcopenshell.geom.create_shape(geom_settings, el)
            verts = shape.geometry.verts
            faces = shape.geometry.faces
            vol, area = calculate_mesh_volume_and_area(verts, faces)
            dim = area**0.5
            surf_proprete = (dim + 0.20)**2
            proprete_semelles_vol += surf_proprete * 0.05
        except Exception:
            pass

    # Béton de propreté sous murs de soubassement
    proprete_soubassement_vol = 0.0
    fondation_walls = [el for el in model.by_type("IfcWall") if element_to_storey.get(el.GlobalId) == "fondation"]
    for el in fondation_walls:
        try:
            shape = ifcopenshell.geom.create_shape(geom_settings, el)
            verts = shape.geometry.verts
            faces = shape.geometry.faces
            vol, area = calculate_mesh_volume_and_area(verts, faces)
            longueur = vol / 0.15
            proprete_soubassement_vol += longueur * 0.40 * 0.05
        except Exception:
            pass

    # Hourdis dalle compression 16+4 (8.33 hourdis/m2)
    plancher_area = 0.0
    plancher_slabs = [el for el in model.by_type("IfcSlab") if element_to_storey.get(el.GlobalId) in ["Etage 1er", "coffrage rdc"]]
    for el in plancher_slabs:
        try:
            shape = ifcopenshell.geom.create_shape(geom_settings, el)
            _, area = calculate_mesh_volume_and_area(shape.geometry.verts, shape.geometry.faces)
            plancher_area += area
        except Exception:
            pass
    hourdis_count = int(plancher_area * 8.33)

    # Toiture : Pannes vs Chevrons
    pannes_vol = 0.0
    chevrons_vol = 0.0
    members = model.by_type("IfcMember")
    for el in members:
        try:
            shape = ifcopenshell.geom.create_shape(geom_settings, el)
            vol, _ = calculate_mesh_volume_and_area(shape.geometry.verts, shape.geometry.faces)
            
            type_name_str = ""
            if hasattr(el, 'IsTypedBy') and el.IsTypedBy:
                type_obj = el.IsTypedBy[0].RelatingType
                type_name_str = type_obj.Name if type_obj else ""
            combined = ((el.Name or "") + " " + type_name_str).lower()
            
            if "panne" in combined or "purlin" in combined:
                pannes_vol += vol
            else:
                chevrons_vol += vol
        except Exception:
            pass

    # Remblais
    beton_fondation_vol = 0.0
    for el_type in ["IfcSlab", "IfcColumn", "IfcBeam", "IfcWall"]:
        for el in model.by_type(el_type):
            if element_to_storey.get(el.GlobalId) == "fondation":
                try:
                    shape = ifcopenshell.geom.create_shape(geom_settings, el)
                    vol, _ = calculate_mesh_volume_and_area(shape.geometry.verts, shape.geometry.faces)
                    beton_fondation_vol += vol
                except Exception:
                    pass
    remblais_vol = max(0.0, 248.35 - beton_fondation_vol)

    # Zones (IfcSpace)
    spaces = model.by_type("IfcSpace")
    total_space_area = 0.0
    humides_area = 0.0
    for space in spaces:
        try:
            psets = ifcopenshell.util.element.get_psets(space)
            bq = psets.get("BaseQuantities", {})
            a = bq.get("NetFloorArea", 0.0)
            if a == 0.0:
                shape = ifcopenshell.geom.create_shape(geom_settings, space)
                _, a = calculate_mesh_volume_and_area(shape.geometry.verts, shape.geometry.faces)
            
            total_space_area += a
            if space.Name and any(w in space.Name.lower() for w in ["sdb", "toilette", "cuisine", "douche"]):
                humides_area += a
        except Exception:
            pass

    cable_15_ml = total_space_area * 3.0
    cable_25_ml = total_space_area * 4.0

    totals["custom_calculations"] = {
        "dalle_rdc_10cm_vol": dalle_rdc_vol,
        "proprete_semelles_vol": proprete_semelles_vol,
        "proprete_soubassement_vol": proprete_soubassement_vol,
        "hourdis_count": hourdis_count,
        "pannes_vol": pannes_vol,
        "chevrons_vol": chevrons_vol,
        "remblais_vol": remblais_vol,
        "total_space_area": total_space_area,
        "humides_area": humides_area,
        "cable_15_ml": cable_15_ml,
        "cable_25_ml": cable_25_ml,
        "stair_count": len(model.by_type("IfcStair")),
        "chape_composite_vol": plancher_area * 0.025,
        "chape_composite_area": plancher_area,
        "carreaux_composite_area": plancher_area,
        "enduit_sous_dalle_area": plancher_area,
        "enduit_sous_dalle_vol": plancher_area * 0.015
    }

    print("Quantités physiques IFC extraites géométriquement par niveau :")
    print(json.dumps(levels_data, indent=2))
    return totals, levels_data

def harmonize_and_populate():
    # Paths
    ifc_path = r"c:\Users\HP\Desktop\Archi Cam AI\Projet_duplex _R+1_v28.ifc"
    excel_path = r"c:\Users\HP\Desktop\Archi Cam AI\DEVIS DETAILLE NDA FAMILY Corrigé et planning.xls"

    # 1. Extraction IFC par niveau
    ifc_data, levels_data = extract_ifc_quantities(ifc_path)

    # 2. Supabase Connection
    print("Connexion à Supabase...")
    supabase: Client = create_client(url, key)

    # 3. Création ou mise à jour du projet
    project_name = "Duplex R+1 - NDA FAMILY"
    print(f"Création/Mise à jour du projet : {project_name}")
    
    # Totaux globaux issus de l'onglet Recap
    total_ht = 38834470 # Somme des phases
    total_ttc = 47766398 # Total avec main d'oeuvre et imprévus

    # Nettoyage de l'ancien projet test pour éviter les doublons
    existing = supabase.table("projects").select("id").eq("client_name", "Dennis NDA").execute()
    if existing.data:
        project_id = existing.data[0]['id']
        print(f"Projet existant trouvé ID: {project_id}. Nettoyage...")
        supabase.table("projects").delete().eq("id", project_id).execute()

    res_proj = supabase.table("projects").insert({
        "name": project_name,
        "description": "Projet de construction d'une maison d'habitation de type R+1 - NDA FAMILY.",
        "location": "Yaounde",
        "city": "Yaounde",
        "status": "active",
        "budget": total_ttc,
        "client_name": "Dennis NDA"
    }).execute()
    project_id = res_proj.data[0]['id']
    print(f"Projet créé avec succès. ID: {project_id}")

    # Enregistrement des quantités physiques par niveau dans Supabase
    print("Enregistrement des quantités physiques par niveau dans Supabase...")
    for lvl, classes in levels_data.items():
        for ifc_cls, metrics in classes.items():
            if metrics.get("count", 0) > 0:
                qty = metrics.get("volume", 0.0)
                unit = "m3"
                if ifc_cls in ["IfcDoor", "IfcWindow"]:
                    qty = metrics.get("count", 0)
                    unit = "u"
                elif ifc_cls == "IfcWall" and qty == 0.0:
                    qty = metrics.get("area", 0.0)
                    unit = "m2"
                
                try:
                    supabase.table("project_bim_elements").insert({
                        "project_id": project_id,
                        "ifc_class": ifc_cls,
                        "niveau": lvl,
                        "quantite_physique": round(qty, 2),
                        "unite_physique": unit,
                        "nombre_elements": metrics.get("count", 0)
                    }).execute()
                except Exception as db_err:
                    print(f"Note: Impossible d'insérer dans project_bim_elements ({db_err}).")

    # 4. Création du devis
    res_devis = supabase.table("devis").insert({
        "project_id": project_id,
        "version": 1,
        "status": "active",
        "total_ht": total_ht,
        "total_ttc": total_ttc,
        "margin_bet_pct": 20.0, # Correspond à la main d'oeuvre (20%)
        "margin_hazards_pct": 3.0 # Correspond aux imprévus (3%)
    }).execute()
    devis_id = res_devis.data[0]['id']
    print(f"Devis créé avec succès. ID: {devis_id}")

    # 5. Lecture de l'Excel
    print(f"Lecture du fichier Excel : {excel_path}...")
    workbook = xlrd.open_workbook(excel_path)
    
    sheets_to_parse = [
        {"name": "Fondation", "phase_num": 1, "phase_title": "PHASE 1: FONDATION & TERRASSEMENT"},
        {"name": "RDC + dalle 1", "phase_num": 2, "phase_title": "PHASE 2: REZ-DE-CHAUSSEE & DALLE 1"},
        {"name": " ETAGE +Toiture", "phase_num": 3, "phase_title": "PHASE 3: ETAGE & TOITURE"},
        {"name": "Second Oeuvre", "phase_num": 4, "phase_title": "PHASE 4: SECOND OEUVRE"}
    ]

    for sheet_info in sheets_to_parse:
        sheet_name = sheet_info["name"]
        print(f"\nTraitement de l'onglet : {sheet_name}...")
        
        if sheet_name not in workbook.sheet_names():
            print(f"Erreur : Onglet {sheet_name} non trouvé dans l'Excel.")
            continue
            
        sheet = workbook.sheet_by_name(sheet_name)
        
        # Insertion de la phase
        res_phase = supabase.table("devis_phases").insert({
            "devis_id": devis_id,
            "numero": sheet_info["phase_num"],
            "titre": sheet_info["phase_title"]
        }).execute()
        phase_id = res_phase.data[0]['id']

        current_section_id = None
        
        for r in range(4, sheet.nrows):
            c0 = str(sheet.cell_value(r, 0)).strip()
            c1 = str(sheet.cell_value(r, 1)).strip()
            c2_val = sheet.cell_value(r, 2)
            c3_val = sheet.cell_value(r, 3)
            c4_val = sheet.cell_value(r, 4)
            c5_val = sheet.cell_value(r, 5)

            if not c1 or c1.upper().startswith("TOTAL"):
                continue

            # Cas A : Section (ex: I, II, III...)
            if c0 in ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] and c1 and not c2_val and not c4_val:
                print(f"  Section {c0} : {c1}")
                res_sec = supabase.table("devis_sections").insert({
                    "phase_id": phase_id,
                    "code": c0,
                    "titre": c1
                }).execute()
                current_section_id = res_sec.data[0]['id']
                continue

            # Cas B : Ligne de devis (Item)
            # S'assurer d'avoir une section par défaut au cas où
            if not current_section_id:
                res_sec = supabase.table("devis_sections").insert({
                    "phase_id": phase_id,
                    "code": "I",
                    "titre": "Général"
                }).execute()
                current_section_id = res_sec.data[0]['id']
            qte = float(c2_val) if isinstance(c2_val, (int, float)) else 1.0
            unite = str(c3_val).strip() if c3_val else "u"
            pu = float(c4_val) if isinstance(c4_val, (int, float)) else 0.0
            pt = float(c5_val) if isinstance(c5_val, (int, float)) else (qte * pu)

            # Rapprochement intelligent avec la maquette IFC
            calcul_variables = {}
            lower_des = c1.lower()
            custom = ifc_data.get("custom_calculations", {})
            
            # Mappage automatique et stockage de la quantité de la maquette 3D IFC
            if "béton de propreté" in lower_des or "propreté" in lower_des or "proprete" in lower_des:
                if "semelle" in lower_des or "isolée" in lower_des:
                    calcul_variables["ifc_volume_m3"] = round(custom.get("proprete_semelles_vol", 0.0), 2)
                    calcul_variables["ifc_type"] = "Béton Propreté Semelles (débord 10cm)"
                elif "mur" in lower_des or "soubassement" in lower_des:
                    calcul_variables["ifc_volume_m3"] = round(custom.get("proprete_soubassement_vol", 0.0), 2)
                    calcul_variables["ifc_type"] = "Béton Propreté Soubassement (rigole 40cm)"
                    
            elif "remblais" in lower_des:
                calcul_variables["ifc_volume_m3"] = round(custom.get("remblais_vol", 0.0), 2)
                calcul_variables["ifc_type"] = "Remblais (Fouilles - Béton Fondations)"
                
            elif "hourdis" in lower_des or "corps creux" in lower_des:
                calcul_variables["ifc_count"] = custom.get("hourdis_count", 0)
                calcul_variables["ifc_type"] = "Hourdis 16+4 (8.33 u/m2)"
                
            elif "dallage" in lower_des or "forme" in lower_des or "10cm" in lower_des or "10 cm" in lower_des:
                calcul_variables["ifc_volume_m3"] = round(custom.get("dalle_rdc_10cm_vol", 0.0), 2)
                calcul_variables["ifc_type"] = "Dallage sol RDC 10cm"
                
            elif "béton" in lower_des or "concrete" in lower_des:
                if "dalle" in lower_des or "sol" in lower_des:
                    if "IfcSlab" in ifc_data:
                        calcul_variables["ifc_volume_m3"] = round(ifc_data["IfcSlab"].get("beton_vol", ifc_data["IfcSlab"]["volume"]), 2)
                        calcul_variables["ifc_type"] = "IfcSlab (Béton Structural)"
                elif "poteau" in lower_des:
                    if "IfcColumn" in ifc_data:
                        calcul_variables["ifc_volume_m3"] = round(ifc_data["IfcColumn"]["volume"], 2)
                        calcul_variables["ifc_type"] = "IfcColumn"
                elif "poutre" in lower_des:
                    if "IfcBeam" in ifc_data:
                        calcul_variables["ifc_volume_m3"] = round(ifc_data["IfcBeam"]["volume"], 2)
                        calcul_variables["ifc_type"] = "IfcBeam"
                else:
                    total_beton = ifc_data.get("IfcSlab", {}).get("beton_vol", 0.0) + ifc_data.get("IfcColumn", {}).get("volume", 0.0) + ifc_data.get("IfcBeam", {}).get("volume", 0.0)
                    calcul_variables["ifc_volume_m3"] = round(total_beton, 2)
                    calcul_variables["ifc_type"] = "Béton Structural Global"
                    
            elif "agglo" in lower_des or "parpaing" in lower_des or "mur" in lower_des:
                if "IfcWall" in ifc_data:
                    calcul_variables["ifc_volume_m3"] = round(ifc_data["IfcWall"].get("maconnerie_vol", ifc_data["IfcWall"]["volume"]), 2)
                    calcul_variables["ifc_area_m2"] = round(ifc_data["IfcWall"]["area"], 2)
                    calcul_variables["ifc_type"] = "IfcWall (Maçonnerie)"
                    
            elif "enduit" in lower_des or "crépis" in lower_des:
                if "plafond" in lower_des or "dalle" in lower_des:
                    calcul_variables["ifc_volume_m3"] = round(custom.get("enduit_sous_dalle_vol", 0.0), 2)
                    calcul_variables["ifc_area_m2"] = round(custom.get("enduit_sous_dalle_area", 0.0), 2)
                    calcul_variables["ifc_type"] = "Enduit sous dalle/plafond (1.5 cm)"
                elif "IfcWall" in ifc_data:
                    calcul_variables["ifc_volume_m3"] = round(ifc_data["IfcWall"].get("enduit_vol", 0.0), 2)
                    calcul_variables["ifc_type"] = "IfcWall (Enduit/Crépis)"
                    
            elif "chape" in lower_des:
                calcul_variables["ifc_volume_m3"] = round(custom.get("chape_composite_vol", 0.0), 2)
                calcul_variables["ifc_area_m2"] = round(custom.get("chape_composite_area", 0.0), 2)
                calcul_variables["ifc_type"] = "Chape composite (2.5 cm)"
                
            elif "carreau" in lower_des or "revetement" in lower_des or "revêtement" in lower_des:
                calcul_variables["ifc_area_m2"] = round(custom.get("carreaux_composite_area", 0.0), 2)
                calcul_variables["ifc_type"] = "Carrelage/Revêtement de dalle"

            elif "porte" in lower_des:
                if "IfcDoor" in ifc_data:
                    calcul_variables["ifc_count"] = ifc_data["IfcDoor"]["count"]
                    calcul_variables["ifc_type"] = "IfcDoor"

            elif "fenêtre" in lower_des or "fenetre" in lower_des:
                if "IfcWindow" in ifc_data:
                    calcul_variables["ifc_count"] = ifc_data["IfcWindow"]["count"]
                    calcul_variables["ifc_type"] = "IfcWindow"

            elif "tôle" in lower_des or "tole" in lower_des or "couverture" in lower_des:
                if "IfcCovering" in ifc_data:
                    calcul_variables["ifc_area_m2"] = round(ifc_data["IfcCovering"]["area"], 2)
                    calcul_variables["ifc_type"] = "IfcCovering (Couverture)"
                    
            elif "charpente" in lower_des or "bois" in lower_des:
                if "IfcMember" in ifc_data:
                    if "panne" in lower_des or "purlin" in lower_des:
                        calcul_variables["ifc_volume_m3"] = round(custom.get("pannes_vol", 0.0), 2)
                        calcul_variables["ifc_type"] = "IfcMember (Pannes)"
                    else:
                        calcul_variables["ifc_volume_m3"] = round(custom.get("chevrons_vol", 0.0), 2)
                        calcul_variables["ifc_type"] = "IfcMember (Chevrons/Pannes global)"
                        
            elif "cable" in lower_des or "câble" in lower_des or "fil" in lower_des:
                if "1.5" in lower_des:
                    calcul_variables["ifc_length_ml"] = round(custom.get("cable_15_ml", 0.0), 2)
                    calcul_variables["ifc_type"] = "Zone dynamic cable (1.5mm2)"
                elif "2.5" in lower_des:
                    calcul_variables["ifc_length_ml"] = round(custom.get("cable_25_ml", 0.0), 2)
                    calcul_variables["ifc_type"] = "Zone dynamic cable (2.5mm2)"
                    
            elif "peinture" in lower_des or "email" in lower_des or "chaux" in lower_des:
                # Estimé à partir de la surface des murs (2 faces) moins ouvertures
                paint_area = ifc_data.get("IfcWall", {}).get("area", 0.0) * 2.0 - (ifc_data.get("IfcDoor", {}).get("count", 0) * 1.89)
                calcul_variables["ifc_area_m2"] = round(paint_area, 2)
                calcul_variables["ifc_type"] = "Peinture estimée (Murs - ouvertures)"
                
            elif "faux" in lower_des or "plafond" in lower_des:
                calcul_variables["ifc_area_m2"] = round(custom.get("total_space_area", 0.0), 2)
                calcul_variables["ifc_type"] = "Faux Plafonds (Surface Zones)"
                
            elif "escalier" in lower_des:
                calcul_variables["ifc_count"] = custom.get("stair_count", 0)
                calcul_variables["ifc_type"] = "IfcStair"

            # Mapping Mercuriale
            mercuriale_code = None
            if "ciment" in lower_des:
                mercuriale_code = "GO-CIM"
            elif "sable" in lower_des:
                mercuriale_code = "GO-SAB"
            elif "gravier" in lower_des:
                mercuriale_code = "GO-GRA"
            elif "agglo" in lower_des or "parpaing" in lower_des:
                mercuriale_code = "GO-PAR15"
            elif "carreau" in lower_des:
                mercuriale_code = "SO-CAR60"

            # Insertion de la ligne de devis
            supabase.table("devis_items").insert({
                "section_id": current_section_id,
                "designation": c1,
                "quantite": qte,
                "unite": unite,
                "prix_unitaire": pu,
                "prix_total": pt,
                "mercuriale_code": mercuriale_code,
                "calcul_variables": calcul_variables
            }).execute()

    print("\n🎉 Importation et harmonisation terminées avec succès dans Supabase !")

if __name__ == "__main__":
    harmonize_and_populate()
