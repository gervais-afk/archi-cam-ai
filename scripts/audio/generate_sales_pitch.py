"""
GÉNÉRATEUR DE PITCH VOCAL — ARCHI CAM AI
══════════════════════════════════════════════════════════════
Convertit les données SCoT (pièces, surfaces, normes BTP) en présentation
audio MP3 professionnelle via Fal.ai Kokoro-TTS (voix française naturelle).

IMPORTANT : Whisper = Speech-to-TEXT (transcription vocale → texte).
            Pour TEXT-to-Speech, on utilise : fal-ai/kokoro-tts

Usage client :
  - Mme Ekani publie son plan sur WhatsApp avec un audio pro
  - L'architecte joint le fichier MP3 à son dossier de permis de construire
  - Le commercial présente le projet sans lire ses notes
"""

import os
import requests
import json
from typing import Optional

def _get_fal_key() -> str:
    """Lit FAL_KEY depuis .env.local ou la variable d'environnement."""
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
    env_path = os.path.normpath(env_path)

    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("FAL_KEY=") or line.startswith("FAL_AI_KEY="):
                    return line.split("=", 1)[1].strip()

    return os.getenv("FAL_KEY", "") or os.getenv("FAL_AI_KEY", "")


def build_sales_text(room_data: dict, project_name: str = "votre résidence") -> str:
    """
    Construit un texte de présentation commerciale structuré et naturel
    à partir des données SCoT.
    """
    lines = [
        f"Bienvenue dans la présentation de {project_name}, "
        f"une réalisation certifiée conforme aux normes POS du Cameroun.",
        "",
    ]

    total_area = room_data.get("total_area_m2", 0)
    if total_area:
        lines.append(
            f"Ce projet offre une surface totale de {total_area:.0f} mètres carrés, "
            f"optimisée pour le confort de toute la famille."
        )

    # Description des pièces principales
    rooms = room_data.get("rooms", [])
    for room in rooms:
        label = room.get("label", "Pièce")
        area  = room.get("area_m2", 0)
        label_lower = label.lower()

        if "salon" in label_lower or "sejour" in label_lower:
            lines.append(
                f"Le séjour de {area:.0f} mètres carrés est idéal pour accueillir "
                f"votre famille et vos invités dans un espace généreux et lumineux."
            )
        elif "chambre parent" in label_lower or ("chambre" in label_lower and area >= 15):
            lines.append(
                f"La chambre parentale de {area:.0f} mètres carrés dispose d'un "
                f"espace dressing intégré pour votre confort quotidien."
            )
        elif "chambre" in label_lower:
            lines.append(
                f"La chambre de {area:.0f} mètres carrés garantit intimité "
                f"et sérénité pour chacun."
            )
        elif "cuisine" in label_lower:
            lines.append(
                f"La cuisine de {area:.0f} mètres carrés est conçue pour "
                f"faciliter la préparation des repas en famille."
            )

    # Conclusion commerciale
    lines += [
        "",
        "Ce projet respecte le Code de l'Urbanisme du Cameroun et est éligible "
        "aux financements FEICOM et CFC.",
        "Pour obtenir votre devis personnalisé, contactez Archi Cam AI dès aujourd'hui.",
    ]

    return " ".join(line for line in lines if line)


def generate_voice_over(
    room_data: dict,
    project_name: str = "votre résidence",
    output_path: Optional[str] = None,
) -> str:
    """
    Génère un fichier audio MP3 de présentation commerciale via fal-ai/kokoro-tts.

    Args:
        room_data: Dictionnaire SCoT avec 'rooms' et 'total_area_m2'
        project_name: Nom du projet à prononcer
        output_path: Chemin de sortie du fichier audio (optionnel)

    Returns:
        URL du fichier audio hébergé sur Fal.ai
    """
    fal_key = _get_fal_key()
    if not fal_key:
        raise ValueError("[VoiceOver] FAL_KEY introuvable dans .env.local")

    text = build_sales_text(room_data, project_name)
    print(f"[VoiceOver] 📝 Texte généré ({len(text)} caractères) :")
    print(f"   {text[:150]}...")

    # Appel Fal.ai Kokoro-TTS (TTS multilingue, voix naturelles)
    payload = {
        "input": {
            "text":  text,
            "voice": "af_heart",   # Voix féminine naturelle (multilingue, français natif)
            "speed": 1.0,
        }
    }

    headers = {
        "Authorization": f"Key {fal_key}",
        "Content-Type":  "application/json",
    }

    print("[VoiceOver] 🎙️ Envoi vers fal-ai/kokoro-tts...")
    response = requests.post(
        "https://queue.fal.run/fal-ai/kokoro-tts",
        headers=headers,
        json=payload,
        timeout=60,
    )

    if not response.ok:
        raise RuntimeError(
            f"[VoiceOver] Erreur API Fal.ai ({response.status_code}) : {response.text[:300]}"
        )

    data = response.json()
    audio_url = data.get("audio_url") or (data.get("audio", {}) or {}).get("url")

    if not audio_url:
        raise RuntimeError(f"[VoiceOver] Pas d'URL audio dans la réponse : {data}")

    print(f"[VoiceOver] ✅ Audio généré → {audio_url}")

    # Téléchargement optionnel en local
    if output_path:
        audio_data = requests.get(audio_url, timeout=30).content
        with open(output_path, "wb") as f:
            f.write(audio_data)
        print(f"[VoiceOver] 💾 Fichier sauvegardé → {output_path}")

    return audio_url


# ── Test local ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  TEST VoiceOver — Archi Cam AI")
    print("=" * 60)

    mock_data = {
        "total_area_m2": 120,
        "rooms": [
            {"label": "Salon",          "area_m2": 32},
            {"label": "Chambre Parent", "area_m2": 20},
            {"label": "Chambre 2",      "area_m2": 14},
            {"label": "Cuisine",        "area_m2": 12},
        ]
    }

    try:
        url = generate_voice_over(
            room_data=mock_data,
            project_name="Résidence Famille Ekani",
            output_path="test_pitch_audio.mp3"
        )
        print(f"\n✅ Test réussi ! URL audio : {url}")
    except Exception as e:
        print(f"\n❌ Erreur : {e}")
