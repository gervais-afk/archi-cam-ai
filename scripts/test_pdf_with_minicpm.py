import os
import sys
import json
import base64
import urllib.request
import urllib.error
import pypdfium2 as pdfium
from PIL import Image
import io

LM_STUDIO_URL = os.environ.get("LM_STUDIO_URL", "http://127.0.0.1:1234/v1")

def test_pdf_with_minicpm(pdf_path: str):
    if not os.path.exists(pdf_path):
        print(f"❌ Fichier PDF introuvable : {pdf_path}")
        return

    print("==================================================")
    print(f"📄 TEST D'ANALYSE VLM MINICPM-V 2.6 SUR PLAN PDF")
    print(f"📁 Fichier : {pdf_path}")
    print("==================================================\n")

    # 1. Conversion du PDF en image via pypdfium2
    print("1️⃣ Conversion de la page 1 du PDF en PNG HD...")
    pdf = pdfium.PdfDocument(pdf_path)
    page = pdf[0]
    pil_image = page.render(scale=2.0).to_pil().convert("RGB")
    
    # Redimensionnement max 512px pour inférence VLM ultra-rapide
    pil_image.thumbnail((512, 512))
    
    buf = io.BytesIO()
    pil_image.save(buf, format="JPEG", quality=75)
    img_bytes = buf.getvalue()
    base64_img = base64.b64encode(img_bytes).decode("utf-8")
    print(f"   ✓ Image optimisée ({len(img_bytes)/1024:.1f} Ko, {pil_image.width}x{pil_image.height} px)\n")

    # 2. Envoi au serveur local LM Studio (MiniCPM-V 2.6)
    print("2️⃣ Envoi de l'image du plan au VLM MiniCPM-V 2.6 (http://127.0.0.1:1234)...")
    prompt_text = """Analyze this floorplan image and return a JSON with:
1. "titre_plan": title or name of the plan
2. "pieces": list of detected room names
3. "elements": structural elements (doors, stairs, walls)
Return raw JSON ONLY."""

    payload = {
        "model": "minicpm-v-2_6",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_img}"
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt_text
                    }
                ]
            }
        ],
        "temperature": 0.1,
        "max_tokens": 500
    }

    req = urllib.request.Request(
        f"{LM_STUDIO_URL}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    try:
        # Timeout étendu à 600s (10 min) pour laisser le temps complet à l'inférence VLM
        with urllib.request.urlopen(req, timeout=600) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw_content = data["choices"][0]["message"]["content"]
            print("3️⃣ Réponse brute de MiniCPM-V 2.6 :")
            print("--------------------------------------------------")
            print(raw_content)
            print("--------------------------------------------------")

            # Nettoyage JSON si enveloppé dans du markdown ```json ... ```
            cleaned = raw_content.replace("```json", "").replace("```", "").strip()
            try:
                parsed_json = json.loads(cleaned)
                print("\n✅ JSON extrait et validé avec succès :")
                print(json.dumps(parsed_json, indent=2, ensure_ascii=False))
            except Exception as e:
                print(f"\n⚠️ Le texte retourné n'est pas du JSON pur, mais l'analyse visuelle a réussi.")

    except Exception as e:
        print(f"❌ Erreur lors de la requête VLM : {e}")

if __name__ == "__main__":
    pdf_to_test = sys.argv[1] if len(sys.argv) > 1 else "2D RDC.pdf"
    test_pdf_with_minicpm(pdf_to_test)
