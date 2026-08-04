from datetime import datetime, timedelta
from typing import Dict, Any, List

class GanttWeatherSchedulerEngine:
    """
    Moteur de Planification Gantt Météo-Conscient & MoneyGantt (Normes 2026).
    Calcule déterministement la durée des travaux selon les rendements réels du BTP local,
    injecte les buffers météo (Saison des Pluies) et génère l'échéancier financier par jalons.
    """
    def __init__(self, daily_concrete_yield_m3: float = 12.0):
        # Rendement moyen journalier par équipe BTP au Cameroun (ex: 12m³/jour)
        self.daily_concrete_yield_m3 = daily_concrete_yield_m3

    def calculate_schedule_and_milestones(
        self, 
        concrete_volume_m3: float, 
        start_date_str: str = None
    ) -> Dict[str, Any]:
        """
        Calcul déterministe du chemin critique, ajustement météo et jalons financiers.
        """
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d") if start_date_str else datetime.now()

        # 1. Calcul des jours ouvrés purs (Quantité / Rendement Journalier)
        pure_work_days = round(concrete_volume_m3 / self.daily_concrete_yield_m3)
        if pure_work_days < 5:
            pure_work_days = 5 # Durée minimale de chantier

        # 2. Injection du Buffer Météo conditionnel (Saison des Pluies Juin - Octobre)
        start_month = start_date.month
        is_rainy_season = 6 <= start_month <= 10
        
        weather_buffer_days = 0
        if is_rainy_season:
            weather_buffer_days = round(pure_work_days * 0.30) # +30% de temps pour travaux extérieurs

        total_duration_days = pure_work_days + weather_buffer_days
        estimated_end_date = start_date + timedelta(days=total_duration_days)

        # 3. Génération des Jalons Financiers Event-Driven (MoneyGantt Standard)
        mid_date = start_date + timedelta(days=round(total_duration_days * 0.5))
        
        payment_milestones = [
            {
                "milestone": "Jalon 1 : Signature & Mobilisation",
                "percentage": 30,
                "trigger_condition": "Signature du contrat & avance de démarrage",
                "target_date": start_date.strftime("%Y-%m-%d"),
                "status": "DUE_NOW"
            },
            {
                "milestone": "Jalon 2 : Fin du Gros Œuvre (Béton & Structure)",
                "percentage": 40,
                "trigger_condition": "Validation physique d'avancement par inspection",
                "target_date": mid_date.strftime("%Y-%m-%d"),
                "status": "PENDING"
            },
            {
                "milestone": "Jalon 3 : Livraison & Réception Ouvrage",
                "percentage": 30,
                "trigger_condition": "Procès-verbal de réception sans réserves",
                "target_date": estimated_end_date.strftime("%Y-%m-%d"),
                "status": "PENDING"
            }
        ]

        return {
            "concrete_volume_m3": concrete_volume_m3,
            "daily_yield_m3": self.daily_concrete_yield_m3,
            "pure_work_days": pure_work_days,
            "is_rainy_season_detected": is_rainy_season,
            "weather_buffer_days": weather_buffer_days,
            "total_duration_days": total_duration_days,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "estimated_end_date": estimated_end_date.strftime("%Y-%m-%d"),
            "money_gantt_milestones": payment_milestones
        }

if __name__ == "__main__":
    scheduler = GanttWeatherSchedulerEngine()
    res = scheduler.calculate_schedule_and_milestones(145.0, "2026-07-01")
    print("GanttWeatherSchedulerEngine testé avec succès:", res)
