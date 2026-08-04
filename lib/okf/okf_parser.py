import re
import yaml
from datetime import datetime
from typing import Dict, Any, List, Optional

class OKFv02Parser:
    """
    Parseur officiel pour le standard Google Open Knowledge Format (OKF v0.2 - Juillet 2026).
    Extrait les métadonnées de traçabilité (provenance), de confiance (trust), 
    de péremption (freshness) et d'attestation de calculs.
    """

    @staticmethod
    def parse_markdown_file(file_path: str) -> Dict[str, Any]:
        """Lit un fichier Markdown et extrait le Frontmatter YAML OKF v0.2 ainsi que le corps du document."""
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        frontmatter = {}
        body = content

        # Extraction du bloc YAML frontmatter --- ... ---
        match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", content, re.DOTALL)
        if match:
            yaml_str = match.group(1)
            body = match.group(2)
            try:
                frontmatter = yaml.safe_load(yaml_str) or {}
            except Exception as e:
                print(f"[OKFv02Parser Error] Échec de lecture du YAML frontmatter: {e}")

        # Déduction du Trust Tier (Niveau de confiance OKF v0.2)
        trust_tier = OKFv02Parser.determine_trust_tier(frontmatter)
        is_stale = OKFv02Parser.check_staleness(frontmatter.get("stale_after"))

        return {
            "frontmatter": frontmatter,
            "type": frontmatter.get("type", "Concept"),
            "title": frontmatter.get("title", "Untitled Concept"),
            "status": frontmatter.get("status", "stable"),
            "trust_tier": trust_tier,
            "is_stale": is_stale,
            "generated": frontmatter.get("generated", {}),
            "verified": frontmatter.get("verified", []),
            "sources": frontmatter.get("sources", []),
            "body": body
        }

    @staticmethod
    def determine_trust_tier(frontmatter: Dict[str, Any]) -> str:
        """
        Détermine le niveau de confiance selon les règles OKF v0.2:
        - 'unverified' : Aucun champ 'verified'
        - 'machine-confirmed' : Confirmé uniquement par des agents/processus automatisés
        - 'human-reviewed' : Confirmé par au moins un être humain (ex: human:engineer@domain)
        """
        verified_list = frontmatter.get("verified", [])
        if not verified_list:
            return "unverified"

        for v in verified_list:
            by = v.get("by", "")
            if by.startswith("human:"):
                return "human-reviewed"

        return "machine-confirmed"

    @staticmethod
    def check_staleness(stale_after: Optional[str]) -> bool:
        """Vérifie si la date absolue 'stale_after' est dépassée par rapport à la date actuelle."""
        if not stale_after:
            return False

        try:
            stale_date = datetime.strptime(str(stale_after), "%Y-%m-%d")
            return datetime.now() > stale_date
        except Exception:
            return False

if __name__ == "__main__":
    print("OKFv02Parser initialisé avec succès.")
