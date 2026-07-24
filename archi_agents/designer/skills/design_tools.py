from typing import Dict

def estimate_global_budget(surface_m2: float, standing: str) -> Dict:
    """
    Calcule une estimation budgétaire globale pour une construction au Cameroun.
    
    Args:
        surface_m2: Surface totale à construire en mètres carrés.
        standing: Niveau de finition ('économique', 'moyen', 'haut_standing', 'luxe').
    """
    # Ratios au m2 (Moyenne Douala/Yaoundé - Gros Oeuvre + Second Oeuvre)
    ratios = {
        "économique": 180000,     # Standard social
        "moyen": 250000,          # Standard résidentiel classique
        "haut_standing": 450000,  # Finitions importées, domotique de base
        "luxe": 750000            # Matériaux premium, design complexe, piscine
    }
    
    price_per_m2 = ratios.get(standing.lower(), 250000)
    total_estimate = surface_m2 * price_per_m2
    
    return {
        "surface": surface_m2,
        "standing": standing,
        "prix_m2_estimé": price_per_m2,
        "budget_total_fcfa": total_estimate,
        "devise": "FCFA",
        "note": "Estimation basée sur les mercuriales locales 2024. Hors coût du terrain et VRD."
    }

def generate_3d_render_prompt(client_request: str, style: str) -> str:
    """
    Génère un prompt ultra-détaillé pour un moteur de rendu 3D photoréaliste.
    
    Args:
        client_request: La description brute du client.
        style: Le style architectural ('luxe-tropical', 'africain-contemporain', etc.).
    """
    styles_presets = {
        "luxe-tropical": (
            "modern tropical architecture, large cantilevered roofs, local stone and dark wood textures, "
            "lush cameroonian vegetation, floor-to-ceiling glass walls, warm sunset lighting, 8k, cinematic architecture photography"
        ),
        "africain-contemporain": (
            "contemporary african architecture, geometric patterns, terracotta and earthen tones, "
            "integrated greenery, brutalist inspiration mixed with ethnic elements, vibrant sunlight, hyper-realistic, volumetric lighting"
        )
    }
    
    base_style = styles_presets.get(style.lower(), "modern architecture, highly detailed")
    
    super_prompt = (
        f"Masterpiece, {style} architecture, {client_request}. {base_style}. "
        f"Unreal Engine 5 render style, photorealistic, cinematic composition, depth of field, sharp focus."
    )
    
    return super_prompt
