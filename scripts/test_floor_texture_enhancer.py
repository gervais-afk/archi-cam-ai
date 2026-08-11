#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TEST COMPARATIF — Floor Texture AI Enhancer (Fal.ai Img2Img)
═════════════════════════════════════════════════════════════
Envoie le floor_only.png (sols nus déterministes) à Fal.ai en mode img2img
avec 3 configurations différentes et compare les résultats.

Modèles testés :
  1. fal-ai/flux/schnell/image-to-image  (~$0.003 | ~6s)  — Vitesse
  2. fal-ai/flux-pro/image-to-image      (~$0.08  | ~20s) — Beauté max
  3. fal-ai/flux/dev/image-to-image      (~$0.025 | ~12s) — Équilibre

Usage :
  python scripts/test_floor_texture_enhancer.py
  python scripts/test_floor_texture_enhancer.py --floor public/debug_xxx/floor_only.png
  python scripts/test_floor_texture_enhancer.py --model schnell
"""

import sys
import os
import json
import base64
import time
import argparse
from pathlib import Path
from typing import Optional

try:
    import httpx
except ImportError:
    print("[ERROR] httpx manquant. Installez-le: pip install httpx")
    sys.exit(1)

# ── Configuration ─────────────────────────────────────────────────────────────

FAL_KEY = os.environ.get("FAL_KEY", "82186fe0-a9e8-4de6-a5a6-961279896548:38cbff86e45dc9f2f82481cd28d37253")
FAL_KEY_SECONDARY = os.environ.get("FAL_KEY_SECONDARY", "323b03bd-e5d5-4a5d-8df3-f9f2fb37cb29:b1cf83b858cb87a82a8bfa8cfda2f1bc")
FAL_API_BASE = "https://fal.run"
FAL_STORAGE_URL = "https://fal.ai/storage/upload"

# Prompt chirurgical : on dit à l'IA "applique des matériaux réalistes dans ces zones"
# On ne dit PAS "fais un plan" ni "génère une maison"
ARCHITECTURAL_TEXTURE_PROMPT = """Professional architectural floor plan material rendering, strictly top-down orthographic view.

APPLY THESE REALISTIC MATERIALS TO THE COLORED ZONES ONLY:
- Warm zones (beige/tan areas): Natural oak hardwood parquet with visible wood grain, honey amber tones, soft warm light reflections, subtle plank texture
- Blue/cool zones (bathrooms, wet areas): Large format polished marble or white ceramic tiles with clean grout lines, slight glossy reflections
- Light grey/slate zones (kitchens): Matte porcelain floor tiles, light grey with fine texture, clean minimalist
- Terracotta/brown zones (terraces, balconies): Teak decking or stone pavers, warm natural outdoor material
- Green zones (gardens): Lush vibrant green grass with natural texture
- Neutral grey zones (parking, garage): Smooth polished concrete or asphalt

CRITICAL STYLE RULES:
- Strictly 90-degree top-down (bird's eye view, zero perspective distortion)
- NO walls, NO vertical elements, NO ceiling, NO furniture shapes
- Soft ambient occlusion shadows near zone edges (depth effect without showing walls)
- Photorealistic material quality: Architectural Digest, Dwell magazine standard
- Color temperature: warm 3500K living spaces, cool 5500K wet areas
- Keep EXACT geometry of each zone — do not modify, merge, or expand boundaries"""

NEGATIVE_PROMPT = """walls, black lines, vertical elements, 3D perspective, isometric view,
45-degree angle, cutaway view, furniture, chairs, beds, tables, sofas,
ceiling, shadows of walls, low angle, sketch, blueprint, technical drawing,
cartoon, anime, watermark, signature, logo, distorted geometry, blurry,
extra rooms, merged spaces, hallucinated elements, text, labels"""

MODELS = {
    "schnell": {
        # Img2img FLUX Schnell — ultra-rapide via flux-general
        "model_id": "fal-ai/flux/schnell/image-to-image",
        "fallback_id": "fal-ai/flux-general",
        "display": "FLUX Schnell (ultra-rapide)",
        "price": "$0.003/img",
        "strength": 0.38,
        "num_inference_steps": 8,
        "guidance_scale": 4.0,
    },
    "dev": {
        # Img2img FLUX Dev — l'endpoint qui fonctionne réellement dans le projet
        "model_id": "fal-ai/flux/dev/image-to-image",
        "fallback_id": None,
        "display": "FLUX Dev (équilibré)",
        "price": "$0.025/img",
        "strength": 0.40,
        "num_inference_steps": 20,
        "guidance_scale": 7.5,
    },
    "general": {
        # fal-ai/flux-general (ControlNet + img2img unifié) — le plus puissant pour l'archi
        "model_id": "fal-ai/flux-general",
        "fallback_id": None,
        "display": "FLUX General (ControlNet archi)",
        "price": "$0.03/img",
        "strength": 0.38,
        "num_inference_steps": 20,
        "guidance_scale": 7.5,
    },
}



def upload_to_fal_storage(image_path: str) -> Optional[str]:
    """Upload une image sur Fal Storage et retourne l'URL cloud."""
    headers = {
        "Authorization": f"Key {FAL_KEY}",
    }
    with open(image_path, "rb") as f:
        files = {"file": (Path(image_path).name, f, "image/png")}
        with httpx.Client(timeout=60.0) as client:
            r = client.post("https://storage.googleapis.com/fal-flux-storage", headers=headers, files=files)

    if r.status_code not in (200, 201):
        # Essai de l'upload via l'endpoint fal.ai/upload
        try:
            with open(image_path, "rb") as f:
                data = f.read()
            b64 = base64.b64encode(data).decode()
            with httpx.Client(timeout=60.0) as client:
                r2 = client.post(
                    "https://fal.run/fal-ai/upload",
                    headers={"Authorization": f"Key {FAL_KEY}", "Content-Type": "application/json"},
                    json={"content": f"data:image/png;base64,{b64}", "content_type": "image/png", "file_name": Path(image_path).name}
                )
            if r2.status_code == 200:
                return r2.json().get("url")
        except Exception:
            pass
        print(f"  [WARN] Upload Fal Storage échoué ({r.status_code}), utilisation base64 direct")
        return None

    result = r.json()
    return result.get("url") or result.get("cdn_url")


def submit_fal_img2img(model_id: str, fallback_id: Optional[str], image_path: str,
                        strength: float, num_steps: int, guidance: float) -> Optional[str]:
    """
    Soumet une requête img2img à Fal.ai.
    Tente d'abord l'upload vers Fal Storage (URL cloud),
    sinon utilise base64 inline directement.
    """
    # 1. Tenter l'upload Fal Storage pour obtenir une URL cloud
    fal_url = upload_to_fal_storage(image_path)

    # 2. Si upload échoue, utiliser base64 inline
    if not fal_url:
        image_b64_uri = encode_image_b64(image_path)
        print(f"  [INFO] Utilisation base64 inline ({len(image_b64_uri)//1024} Ko)")
    else:
        image_b64_uri = fal_url
        print(f"  [INFO] Image uploadée → {fal_url}")

    headers = {
        "Authorization": f"Key {FAL_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "image_url": image_b64_uri,
        "prompt": ARCHITECTURAL_TEXTURE_PROMPT,
        "negative_prompt": NEGATIVE_PROMPT,
        "strength": strength,
        "num_inference_steps": num_steps,
        "guidance_scale": guidance,
        "num_images": 1,
        "enable_safety_checker": False,
    }

    # Essai du modèle principal, puis fallback
    endpoints_to_try = [model_id]
    if fallback_id and fallback_id != model_id:
        endpoints_to_try.append(fallback_id)

    for endpoint in endpoints_to_try:
        url = f"{FAL_API_BASE}/{endpoint}"
        print(f"  [INFO] POST → {url}")

        try:
            with httpx.Client(timeout=120.0) as client:
                r = client.post(url, headers=headers, json=payload)

            if r.status_code == 200:
                result = r.json()
                images = result.get("images", [])
                if images:
                    img = images[0]
                    if isinstance(img, dict):
                        return img.get("url")
                    elif isinstance(img, str):
                        return img
                # Format alternatif
                return (result.get("image") or {}).get("url") or result.get("image_url")

            elif r.status_code == 404:
                print(f"  [WARN] Endpoint introuvable : {endpoint}")
                continue  # Essayer le fallback

            else:
                print(f"  [ERROR] HTTP {r.status_code}: {r.text[:300]}")
                # Essayer clé secondaire si erreur d'auth
                if r.status_code in (401, 403) and FAL_KEY_SECONDARY:
                    headers["Authorization"] = f"Key {FAL_KEY_SECONDARY}"
                    print(f"  [INFO] Essai avec la clé secondaire...")
                    with httpx.Client(timeout=120.0) as client:
                        r2 = client.post(url, headers=headers, json=payload)
                    if r2.status_code == 200:
                        result = r2.json()
                        images = result.get("images", [])
                        if images:
                            img = images[0]
                            return img.get("url") if isinstance(img, dict) else img
                return None

        except Exception as e:
            print(f"  [ERROR] Exception: {e}")
            continue

    return None



def encode_image_b64(image_path: str) -> str:
    """Encode une image en base64 (fallback si upload storage échoue)."""
    with open(image_path, "rb") as f:
        data = f.read()
    b64 = base64.b64encode(data).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def download_image(url: str, dest_path: str) -> bool:
    """Télécharge une image depuis une URL vers un fichier local."""
    with httpx.Client(timeout=60.0) as client:
        r = client.get(url)
    if r.status_code == 200:
        Path(dest_path).write_bytes(r.content)
        return True
    print(f"  [ERROR] Téléchargement HTTP {r.status_code}")
    return False


def find_latest_floor_only() -> Optional[str]:
    """Trouve le floor_only.png le plus récent dans les dossiers debug."""
    debug_dirs = sorted(Path("public").glob("debug_*"), reverse=True)
    for d in debug_dirs:
        candidate = d / "floor_only.png"
        if candidate.exists():
            return str(candidate)
    return None


def main():
    parser = argparse.ArgumentParser(description="Test Fal.ai Floor Texture Enhancer")
    parser.add_argument("--floor", type=str, help="Chemin vers floor_only.png à améliorer")
    parser.add_argument("--model", type=str, choices=["schnell", "dev", "general", "all"], default="all",
                        help="Modèle(s) à tester (default: all)")
    parser.add_argument("--output-dir", type=str, default=None,
                        help="Dossier de sortie (default: même que floor_only.png)")
    args = parser.parse_args()

    # Trouver le floor_only.png
    floor_path = args.floor
    if not floor_path:
        floor_path = find_latest_floor_only()
        if not floor_path:
            print("[ERROR] Aucun floor_only.png trouvé dans public/debug_*")
            print("        Générez d'abord un rendu via l'API, puis relancez ce script.")
            sys.exit(1)

    if not Path(floor_path).exists():
        print(f"[ERROR] Fichier introuvable : {floor_path}")
        sys.exit(1)

    output_dir = args.output_dir or str(Path(floor_path).parent)
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    print(f"\n{'═'*60}")
    print(f"  🎨 ARCHI CAM AI — Floor Texture Enhancer (Fal.ai Img2Img)")
    print(f"{'═'*60}")
    print(f"  📂 Source   : {floor_path}")
    print(f"  📁 Output   : {output_dir}")
    print(f"  🤖 Modèle(s): {args.model}")
    print(f"{'═'*60}\n")

    # Choisir les modèles à tester
    models_to_test = [args.model] if args.model != "all" else list(MODELS.keys())

    results_summary = []

    for model_key in models_to_test:
        config = MODELS[model_key]
        print(f"\n  🔄 Test [{config['display']}] ({config['price']}, strength={config['strength']})...")
        t_start = time.time()

        image_url = submit_fal_img2img(
            model_id=config["model_id"],
            fallback_id=config.get("fallback_id"),
            image_path=floor_path,
            strength=config["strength"],
            num_steps=config["num_inference_steps"],
            guidance=config["guidance_scale"],
        )

        elapsed = round(time.time() - t_start, 1)

        if not image_url:
            print(f"  ❌ Échec du modèle {model_key} ({elapsed}s)")
            results_summary.append({"model": model_key, "status": "FAILED", "time": elapsed})
            continue

        # Télécharger le résultat
        out_filename = f"textured_floor_{model_key}.png"
        out_path = os.path.join(output_dir, out_filename)

        if image_url.startswith("http"):
            ok = download_image(image_url, out_path)
        else:
            # base64 inline
            b64_data = image_url.split(",")[-1]
            Path(out_path).write_bytes(base64.b64decode(b64_data))
            ok = True

        if ok:
            size_kb = Path(out_path).stat().st_size // 1024
            print(f"  ✅ {config['display']} → {out_path} ({size_kb} Ko, {elapsed}s)")
            results_summary.append({
                "model": model_key,
                "display": config["display"],
                "price": config["price"],
                "status": "SUCCESS",
                "time_s": elapsed,
                "output_path": out_path,
                "size_kb": size_kb,
            })
        else:
            print(f"  ❌ Téléchargement échoué pour {model_key}")
            results_summary.append({"model": model_key, "status": "DOWNLOAD_FAILED", "time": elapsed})

    # Bilan
    print(f"\n{'═'*60}")
    print("  📊 BILAN COMPARATIF")
    print(f"{'═'*60}")
    for r in results_summary:
        if r["status"] == "SUCCESS":
            print(f"  ✅ {r['display']:30s} | {r['time_s']:5.1f}s | {r['price']:10s} | {r['output_path']}")
        else:
            print(f"  ❌ {r.get('display', r['model']):30s} | {r.get('time', '?'):5}s | ECHEC")
    print(f"{'═'*60}")

    # Sauvegarder le bilan JSON
    results_path = os.path.join(output_dir, "texture_test_results.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(results_summary, f, indent=2, ensure_ascii=False)
    print(f"\n  📋 Bilan sauvegardé dans : {results_path}")
    print(f"\n  🎯 Prochaine étape : Ouvrez les images générées et choisissez le meilleur rendu.\n")


if __name__ == "__main__":
    main()
