import re

class CodeEqualityAttester:
    """
    Attesteur déterministe (sans LLM) selon les normes OKF v0.2 Attestation.
    Vérifie qu'un script Python ou une requête SQL exécutée en production
    est rigoureusement identique au calcul agréé par le comité d'ingénierie.
    """

    @staticmethod
    def canonicalize_code(code: str) -> str:
        """Normalise le code (supprime commentaires, espaces superflus et casse)."""
        # Suppression des commentaires Python (#) et SQL (--)
        code_clean = re.sub(r"#.*$", "", code, flags=re.MULTILINE)
        code_clean = re.sub(r"--.*$", "", code_clean, flags=re.MULTILINE)
        # Normalisation des espaces
        code_clean = re.sub(r"\s+", " ", code_clean).strip().upper()
        return code_clean

    @classmethod
    def attest(cls, sanctioned_code: str, executed_code: str) -> bool:
        """Renvoie True si le code exécuté est conforme au code agréé."""
        c_sanctioned = cls.canonicalize_code(sanctioned_code)
        c_executed = cls.canonicalize_code(executed_code)
        return c_sanctioned == c_executed

if __name__ == "__main__":
    print("CodeEqualityAttester initialisé avec succès.")
