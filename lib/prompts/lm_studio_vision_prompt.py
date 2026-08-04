# lib/prompts/lm_studio_vision_prompt.py
# ═══════════════════════════════════════════════════════════════
# PROMPT UNIVERSEL LM STUDIO VISION
# Compatible : LLaVA, BakLLaVA, Moondream2, MiniCPM-V, Phi-3 Vision, Gemma 4
# ═══════════════════════════════════════════════════════════════

LM_STUDIO_SYSTEM_PROMPT = """
You are an expert architectural plan analyzer specialized in 
African residential floor plans (Cameroon, Côte d'Ivoire, Senegal).

Your task is to analyze the provided floor plan image and return 
a SINGLE valid JSON object with NO additional text, NO markdown, 
NO explanation before or after the JSON.

CRITICAL RULES:
1. Return ONLY raw JSON — no ```json``` blocks, no comments
2. All coordinates are in pixels relative to the image dimensions
3. Detect ALL furniture items visible as drawn symbols on the plan
4. For each room, assign the correct floor texture from the list
5. Detect the carport/garage and vehicle position if present
6. Preserve ALL French room labels exactly as written
""".strip()

LM_STUDIO_USER_PROMPT = """
Analyze this architectural floor plan image carefully.

Return a JSON object with EXACTLY this structure:

{
  "plan_info": {
    "title": "string — cartouche title at bottom of plan",
    "scale": "string — scale notation if visible (ex: 1/100)",
    "total_area": 150.0,
    "floors": "RDC | R+1 | R+2",
    "image_width_px": 1786,
    "image_height_px": 2526
  },

  "rooms": [
    {
      "id": "room_01",
      "name": "string — EXACT French label from plan",
      "area_m2": 43.32,
      "texture": "parquet | marble_tile | cobblestone | concrete | azulejo_tile | garden",
      "bbox": {
        "x": 600,
        "y": 800,
        "w": 800,
        "h": 1000
      },
      "center": {
        "x": 1000,
        "y": 1300
      }
    }
  ],

  "furniture": [
    {
      "id": "furn_01",
      "type": "bed_double | bed_single | sofa_3seat | sofa_2seat | dining_table_6 | dining_table_8 | coffee_table | rug_round | armchair | kitchen_counter | toilet | sink | shower | bathtub | desk | wardrobe | plant_large | plant_small | car_sedan | car_suv | staircase | elevator",
      "room_id": "room_01",
      "bbox": {
        "x": 700,
        "y": 900,
        "w": 120,
        "h": 140
      },
      "rotation_deg": 0,
      "wall_snap": "top | bottom | left | right | center | none",
      "confidence": 0.95
    }
  ],

  "walls": {
    "color_hex": "#1E293B",
    "thickness_px": 25,
    "has_annex_building": true,
    "annex_position": "left"
  },

  "carport": {
    "present": true,
    "bbox": {
      "x": 100,
      "y": 1450,
      "w": 500,
      "h": 450
    },
    "vehicle_type": "car_sedan",
    "vehicle_color": "red"
  },

  "outdoor": {
    "has_garden": true,
    "has_veranda": true,
    "has_pool": false,
    "veranda_bbox": {
      "x": 600,
      "y": 1500,
      "w": 500,
      "h": 200
    }
  },

  "dimensions": [
    {
      "label": "10.65",
      "unit": "m",
      "bbox": {
        "x": 500,
        "y": 300,
        "w": 100,
        "h": 30
      }
    }
  ]
}

TEXTURE ASSIGNMENT RULES (apply strictly):
- chambre / bedroom / room           → "parquet"
- séjour / salon / living / SAM      → "parquet"
- bureau / office / study            → "parquet"
- cuisine / kitchen                  → "marble_tile"
- couloir / hallway / corridor       → "marble_tile"
- toilette / WC / toilet             → "azulejo_tile"
- salle de bain / SDB / bathroom     → "azulejo_tile"
- douche / shower room               → "azulejo_tile"
- véranda / terrasse / terrace       → "concrete"
- carport / parking / garage         → "cobblestone"
- jardin / garden / extérieur        → "garden"
- dépendance / annexe / annex rooms  → "parquet"
- réception / accueil / lobby        → "marble_tile"
- magasin / stockroom / storage      → "concrete"

FURNITURE DETECTION RULES:
- Detect furniture from drawn symbols (rectangles, circles, arcs)
- bed_double: large rectangle ~80×100px with pillow indicators
- bed_single: medium rectangle ~60×90px
- sofa: L-shape or rectangle with backrest line
- dining_table_6: rectangle with 6 small rectangles around it
- dining_table_8: rectangle with 8 small rectangles around it  
- toilet: small rounded rectangle ~30×45px
- sink: small square/rectangle ~30×30px
- shower: square with diagonal lines or circle ~50×50px
- car: large rectangle in carport zone ~80×140px
- staircase: series of parallel lines in rectangle
- kitchen_counter: L or U shaped lines along wall

ROTATION RULES (wall_snap determines rotation):
- wall_snap "top"    → rotation_deg: 0   (headboard/back faces up)
- wall_snap "right"  → rotation_deg: 90  (headboard/back faces right)
- wall_snap "bottom" → rotation_deg: 180 (headboard/back faces down)
- wall_snap "left"   → rotation_deg: 270 (headboard/back faces left)
- wall_snap "center" → rotation_deg: 0   (centered in room, no snap)

Analyze the floor plan now and return the JSON:
""".strip()


# ═══════════════════════════════════════════════════════════════
# MAPPING ASSETS — Sprite PNG pour chaque type de meuble
# ═══════════════════════════════════════════════════════════════

FURNITURE_ASSET_MAP = {
    # Chambre
    "bed_double"      : "bed_double.png",
    "bed_single"      : "bed_single.png",
    "wardrobe"        : "wardrobe.png",
    "desk"            : "desk.png",

    # Salon / Séjour
    "sofa_3seat"      : "sofa_3seat.png",
    "sofa_2seat"      : "sofa_2seat.png",
    "coffee_table"    : "coffee_table.png",
    "armchair"        : "armchair_red.png",
    "rug_round"       : "rug_round_rattan.png",

    # SAM / Salle à manger
    "dining_table_6"  : "dining_table_6.png",
    "dining_table_8"  : "dining_table_8p.png",

    # Cuisine
    "kitchen_counter" : "kitchen_counter.png",

    # Sanitaires
    "toilet"          : "toilet.png",
    "sink"            : "sink.png",
    "shower"          : "shower.png",
    "bathtub"         : "bathtub.png",

    # Décoration
    "plant_large"     : "plant_large.png",
    "plant_small"     : "plant_small.png",

    # Véhicule
    "car_sedan"       : "car_red_sedan.png",
    "car_suv"         : "car_red_sedan.png",  # fallback

    # Circulation
    "staircase"       : "staircase.png",
    "elevator"        : "elevator.png",
}

TEXTURE_ASSET_MAP = {
    "parquet"       : "parquet.jpg",
    "marble_tile"   : "marble_tile.jpg",
    "cobblestone"   : "cobblestone.jpg",
    "concrete"      : "concrete.jpg",
    "azulejo_tile"  : "azulejo_tile.jpg",
    "garden"        : None,  # couleur procédurale #E5EFE2
}
