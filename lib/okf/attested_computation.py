from typing import Dict, Any
from lib.okf.okf_parser import OKFv02Parser
from lib.okf.attesters.attest_code_equality import CodeEqualityAttester

class OKFAttestedComputationEngine:
    """
    Moteur d'exécution des 'Attested Computations' OKF v0.2.
    S'assure que chaque chiffre rapporté (volume de béton, montant de devis)
    a été produit par la formule agréée et validée par l'attesteur.
    """

    def __init__(self, computation_concept_path: str):
        self.parsed_concept = OKFv02Parser.parse_markdown_file(computation_concept_path)
        self.sanctioned_code = self.parsed_concept.get("body", "")

    def run_and_attest(self, execution_func, executed_code: str) -> Dict[str, Any]:
        """
        1. Exécute l'attestateur déterministe.
        2. Si conforme, exécute le calcul. Sinon, rejette pour tentative d'altération.
        """
        # 1. Vérification par l'attesteur
        is_valid = CodeEqualityAttester.attest(self.sanctioned_code, executed_code)
        if not is_valid:
            return {
                "attestation_verdict": False,
                "error": "ÉCHEC D'ATTESTATION OKF v0.2 : Le code exécuté ne correspond pas à la formule agréée.",
                "trust_tier": self.parsed_concept.get("trust_tier"),
                "result": None
            }

        # 2. Vérification de péremption
        if self.parsed_concept.get("is_stale"):
            return {
                "attestation_verdict": False,
                "error": "ÉCHEC D'ATTESTATION OKF v0.2 : Le concept de calcul est périmé (stale_after dépassé).",
                "trust_tier": self.parsed_concept.get("trust_tier"),
                "result": None
            }

        # 3. Exécution conforme
        result = execution_func()

        return {
            "attestation_verdict": True,
            "trust_tier": self.parsed_concept.get("trust_tier"),
            "verified_by": self.parsed_concept.get("verified"),
            "result": result
        }

if __name__ == "__main__":
    print("OKFAttestedComputationEngine initialisé avec succès.")
