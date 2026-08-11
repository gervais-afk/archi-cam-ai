from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from topology_builder import ArchitecturalTopologist

app = FastAPI(title="Vector Interpretation Module (VIM) API")

class TopologyRequest(BaseModel):
    walls: List[List[float]]  # MLSD lines
    symbols: List[Dict]       # YOLO boxes
    texts: List[Dict]         # PaddleOCR outputs

@app.post("/build-topology")
async def build_topology(req: TopologyRequest):
    print("VIM: Réception des données brutes (MLSD, YOLO, OCR)...")
    
    topologist = ArchitecturalTopologist(
        mlsd_lines=req.walls,
        yolo_symbols=req.symbols,
        ocr_texts=req.texts
    )
    
    result = topologist.build_plan_graph()
    
    if not result.get("topology_valid", False):
        raise HTTPException(
            status_code=400, 
            detail=result.get("error", "Topologie non fermable.")
        )
        
    return result

if __name__ == "__main__":
    import uvicorn
    # Le blueprint indique le port 8001 pour ce worker spécialisé
    uvicorn.run(app, host="127.0.0.1", port=8001)
