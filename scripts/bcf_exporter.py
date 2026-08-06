import os
import zipfile
import uuid
import sys
import json
from datetime import datetime

class BCFClashExporter:
    """
    Exporte les conflits détectés au format BCF (BIM Collaboration Format)
    zuppé en archives ZIP .bcf / .bcfzip standard.
    """
    
    def export_clashes_to_bcf(self, clashes: list, output_path: str):
        """
        Génère une archive zip BCF valide à partir d'une liste de clashs.
        """
        temp_dir = os.path.join(os.path.dirname(output_path), "bcf_temp_" + str(uuid.uuid4())[:8])
        os.makedirs(temp_dir, exist_ok=True)
        
        # 1. Créer le fichier de version BCF
        version_path = os.path.join(temp_dir, "bcf.version")
        with open(version_path, "w", encoding="utf-8") as f:
            f.write("2.1")
            
        zip_files = [("bcf.version", version_path)]
        
        # 2. Générer chaque topic (conflit)
        for idx, clash in enumerate(clashes):
            topic_guid = str(uuid.uuid4())
            topic_dir = os.path.join(temp_dir, topic_guid)
            os.makedirs(topic_dir, exist_ok=True)
            
            # Extraire les éléments de manière sécurisée
            elements = clash.get('elements', [])
            el1 = elements[0] if len(elements) > 0 else {'type': 'Column', 'id': 'col_01'}
            el2 = elements[1] if len(elements) > 1 else {'type': 'Pipe', 'id': 'pipe_04'}
            
            # Extraire les coordonnées de localisation
            loc = clash.get('location', {'x': 0, 'y': 0, 'z': 0})
            lx = loc.get('x', 0)
            ly = loc.get('y', 0)
            lz = loc.get('z', 0)
            
            # markup.bcf xml contents
            markup_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Markup xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="markup.xsd">
  <Topic Guid="{topic_guid}">
    <Title>{clash.get('description', 'Conflit de structure')}</Title>
    <CreationDate>{datetime.now().isoformat()}</CreationDate>
    <CreationAuthor>Archi Cam AI</CreationAuthor>
    <TopicType>Clash</TopicType>
    <TopicStatus>Open</TopicStatus>
  </Topic>
  <Comment Guid="{str(uuid.uuid4())}">
    <Date>{datetime.now().isoformat()}</Date>
    <Author>Archi Cam AI - Clash Detection Engine</Author>
    <Comment>
Type de conflit : {clash.get('type', 'Hard Clash')}
Sévérité : {clash.get('severity', 'High')}

Éléments concernés :
- {el1['type']} "{el1['id']}"
- {el2['type']} "{el2['id']}"

Localisation : X={lx:.2f}m, Y={ly:.2f}m, Z={lz:.2f}m

Recommandation :
{clash.get('suggestedFix', 'Vérifier la hauteur sous plafond')}
    </Comment>
  </Comment>
</Markup>
"""
            markup_path = os.path.join(topic_dir, "markup.bcf")
            with open(markup_path, "w", encoding="utf-8") as f:
                f.write(markup_content)
                
            zip_files.append((f"{topic_guid}/markup.bcf", markup_path))

        # 3. Zipper l'ensemble des fichiers générés
        with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as bcf_zip:
            for arcname, filepath in zip_files:
                bcf_zip.write(filepath, arcname)
                
        # 4. Nettoyer les fichiers temporaires
        for arcname, filepath in zip_files:
            try:
                os.remove(filepath)
            except:
                pass
        for clash in clashes:
            try:
                os.rmdir(os.path.join(temp_dir, topic_guid))
            except:
                pass
        try:
            os.rmdir(temp_dir)
        except:
            pass
            
        print(f"✅ Fichier BCF généré : {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python bcf_exporter.py '<clashes_json_string>' <output_path>")
        sys.exit(1)
        
    clashes_data = json.loads(sys.argv[1])
    out_file = sys.argv[2]
    
    exporter = BCFClashExporter()
    exporter.export_clashes_to_bcf(clashes_data, out_file)
