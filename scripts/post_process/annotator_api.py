"""
ANNOTATOR API — ARCHI CAM AI
Port 8002 (Séparé du VIM TopologyBuilder sur 8001)
Expose le ProfessionalAnnotator comme microservice FastAPI.
"""
import os
import sys
import tempfile
import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Optional

# Résolution du chemin vers auto_annotator
sys.path.insert(0, os.path.dirname(__file__))
from auto_annotator import ProfessionalAnnotator

app = FastAPI(
    title="Archi Cam AI — Professional Annotator API",
    description="Ajoute cotations, surfaces et cartouche sur un plan texturé par Fal.ai",
    version="1.0.0"
)

annotator = ProfessionalAnnotator()


class Room(BaseModel):
    label:    str
    area_m2:  float
    centroid: Optional[Dict[str, float]] = None


class AnnotateRequest(BaseModel):
    image_url:     str             # URL Fal.ai de l'image texturée
    rooms:         List[Room]      # Données du VIM TopologyBuilder
    project_name:  str  = "RÉSIDENCE"
    total_area_m2: float = 0.0
    scale:         str  = "Éch. 1:100"


class AnnotateResponse(BaseModel):
    success:      bool
    output_path:  str             # Chemin local du fichier annoté
    public_url:   str             # URL publique Next.js (/renders/xxx.png)
    rooms_count:  int


@app.get("/health")
async def health():
    return {"status": "ok", "service": "annotator", "port": 8002}


@app.post("/annotate", response_model=AnnotateResponse)
async def annotate(req: AnnotateRequest):
    print(f"[AnnotatorAPI] 📥 Requête reçue : {req.project_name} — {len(req.rooms)} pièces")
    print(f"[AnnotatorAPI] 🔗 Source image : {req.image_url[:80]}...")

    # Détermination absolue du dossier public Next.js (archi-cameroun-ai/public/renders)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    public_dir = os.path.join(base_dir, "public", "renders")
    os.makedirs(public_dir, exist_ok=True)

    import time
    timestamp = int(time.time())
    output_filename = f"plan_annotated_{timestamp}.png"
    output_path = os.path.join(public_dir, output_filename)

    # Conversion des rooms Pydantic → dicts pour l'annotateur
    vim_rooms = [r.dict() for r in req.rooms]

    try:
        # Vérifier si c'est une URL ou une data URI base64
        if req.image_url.startswith("http"):
            result_path = annotator.annotate_from_url(
                image_url=req.image_url,
                vim_rooms=vim_rooms,
                project_name=req.project_name,
                total_area_m2=req.total_area_m2,
                scale=req.scale,
                output_path=output_path
            )
        else:
            # Data URI base64 → fichier temporaire
            import base64, re
            match = re.match(r"data:image/\w+;base64,(.+)", req.image_url)
            if not match:
                raise HTTPException(status_code=400, detail="Format image_url invalide (URL ou data URI attendu).")
            tmp_path = os.path.join(tempfile.gettempdir(), f"fal_input_{timestamp}.png")
            with open(tmp_path, "wb") as f:
                f.write(base64.b64decode(match.group(1)))

            result_path = annotator.annotate_from_path(
                image_path=tmp_path,
                vim_rooms=vim_rooms,
                project_name=req.project_name,
                total_area_m2=req.total_area_m2,
                scale=req.scale,
                output_path=output_path
            )
            os.remove(tmp_path)

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Impossible de télécharger l'image depuis Fal.ai : {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'annotation : {str(e)}")

    public_url = f"/renders/{output_filename}"
    print(f"[AnnotatorAPI] ✅ Plan annoté disponible → {public_url}")

    return AnnotateResponse(
        success=True,
        output_path=result_path,
        public_url=public_url,
        rooms_count=len(vim_rooms)
    )


if __name__ == "__main__":
    import uvicorn
    print("[AnnotatorAPI] 🚀 Démarrage sur http://127.0.0.1:8002")
    uvicorn.run(app, host="127.0.0.1", port=8002, reload=False)
