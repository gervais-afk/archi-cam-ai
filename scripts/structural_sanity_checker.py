import json
import sys
import math

class DeterministicStructuralSanityChecker:
    """
    AGENT SUPERVISEUR STRUCTUREL DÉTERMINISTE (SANS LLM) — ARCHI CAM AI
    ───────────────────────────────────────────────────────────────────
    Vérifie la cohérence physique des bâtiments selon les normes :
    - BAEL 91 / Eurocode 2 (Béton Armé & Portées Maximale de Poutres)
    - Code de la Construction & Urbanisme du Cameroun (Aération & Murs Porteurs)
    """

    def __init__(self, wall_thickness_cm=20.0, max_beam_span_m=5.50, room_surfaces=None, window_area_m2=12.0):
        self.wall_thickness_cm = wall_thickness_cm
        self.max_beam_span_m = max_beam_span_m
        self.room_surfaces = room_surfaces or [24.5, 12.0, 14.5, 6.0]  # m2
        self.window_area_m2 = window_area_m2
        self.warnings = []
        self.passed_checks = []

    def check_wall_thickness(self):
        """Vérifie l'épaisseur minimale des murs porteurs en parpaings de 20 (min 15cm pour non-porteurs)"""
        if self.wall_thickness_cm < 15.0:
            self.warnings.append({
                "code": "CRIT_WALL_TOO_THIN",
                "severity": "HIGH",
                "message": f"Épaisseur des murs ({self.wall_thickness_cm}cm) inférieure à la norme de 15cm pour murs de charge. Risque de flambement."
            })
        else:
            self.passed_checks.append("Épaisseur des murs porteurs conforme aux normes BAEL 91 (>= 15cm).")

    def check_beam_spans(self):
        """Vérifie la portée maximale des poutres sans poteau intermédiaire (seuil 6.50m)"""
        if self.max_beam_span_m > 6.50:
            self.warnings.append({
                "code": "WARN_BEAM_SPAN_EXCEEDED",
                "severity": "MEDIUM",
                "message": f"Portée de poutre importante ({self.max_beam_span_m}m > 6.50m). Nécessite une retombée de poutre armée h >= {round(self.max_beam_span_m / 10, 2)}m ou poteau intermédiaire."
            })
        else:
            self.passed_checks.append(f"Portée maximale de poutre ({self.max_beam_span_m}m) dans les limites standards sans armatures spéciales.")

    def check_glazing_ratio(self):
        """Vérifie le ratio baies vitrées / surface habitable (Norme minimale 1/6ème)"""
        total_surface = sum(self.room_surfaces)
        ratio = self.window_area_m2 / total_surface if total_surface > 0 else 0
        min_required_glazing = total_surface / 6.0

        if ratio < (1.0 / 6.0):
            self.warnings.append({
                "code": "WARN_INSUFFICIENT_LIGHT",
                "severity": "LOW",
                "message": f"Surface vitrée totale ({self.window_area_m2}m²) inférieure au ratio réglementaire 1/6ème (Requis: {round(min_required_glazing, 2)}m² pour {total_surface}m² habitables)."
            })
        else:
            self.passed_checks.append(f"Éclairage et aération naturels conformes (Ratio baies/surface = {round(ratio * 100, 1)}% >= 16.7%).")

    def run_full_audit(self):
        self.check_wall_thickness()
        self.check_beam_spans()
        self.check_glazing_ratio()

        score = max(0, 100 - (len(self.warnings) * 15))

        return {
            "status": "APPROVED" if score >= 70 else "REJECTED",
            "safetyScore": score,
            "passedChecksCount": len(self.passed_checks),
            "warningsCount": len(self.warnings),
            "warnings": self.warnings,
            "passedChecks": self.passed_checks,
            "standard": "BAEL 91 / Eurocode 2 / POS Cameroun"
        }

if __name__ == "__main__":
    checker = DeterministicStructuralSanityChecker(wall_thickness_cm=20.0, max_beam_span_m=5.20)
    res = checker.run_full_audit()
    print(json.dumps(res, indent=2, ensure_ascii=False))
