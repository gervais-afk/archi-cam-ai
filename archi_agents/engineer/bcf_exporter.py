import os
import zipfile
import uuid
from datetime import datetime
from typing import List, Dict, Any

class BCF21Exporter:
    """
    Générateur d'archives BCF 2.1 (BIM Collaboration Format) pour exporter les rapports 
    de collisions (clashes) et remarques d'ingénierie vers Archicad, Revit et Allplan.
    """
    def __init__(self, project_name: str = "Archi Cam AI Project"):
        self.project_name = project_name
        self.topics: List[Dict[str, Any]] = []

    def add_issue(self, title: str, description: str, element_guid: str = None, priority: str = "High"):
        """Ajoute une remarque ou collision d'ingénierie au rapport BCF."""
        topic_guid = str(uuid.uuid4())
        self.topics.append({
            "guid": topic_guid,
            "title": title,
            "description": description,
            "element_guid": element_guid or "",
            "priority": priority,
            "creation_date": datetime.now().isoformat()
        })

    def export_to_bcfzip(self, output_path: str) -> str:
        """Génère l'archive .bcfzip standard d'interopérabilité BIM."""
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            # 1. Ecriture du fichier bcf.version
            version_xml = '<?xml version="1.0" encoding="UTF-8"?><Version VersionId="2.1"/>'
            zf.writestr('bcf.version', version_xml)

            # 2. Pour chaque remarque, création du sous-dossier avec markup.bcf
            for topic in self.topics:
                folder = topic["guid"]
                markup_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Markup>
    <Header>
        <File IfcProject="{topic['guid']}"/>
    </Header>
    <Topic Guid="{topic['guid']}" TopicType="Error" TopicStatus="Open">
        <Title>{topic['title']}</Title>
        <Priority>{topic['priority']}</Priority>
        <CreationDate>{topic['creation_date']}</CreationDate>
        <CreationAuthor>Archi Cam AI Engineer Agent</CreationAuthor>
        <Description>{topic['description']}</Description>
    </Topic>
</Markup>"""
                zf.writestr(f'{folder}/markup.bcf', markup_xml)

        return output_path

if __name__ == "__main__":
    exporter = BCF21Exporter()
    exporter.add_issue("Collision Poteau / Conduite", "Interférence détectée au niveau de la dalle R+1.")
    print("BCF21Exporter initialisé avec succès.")
