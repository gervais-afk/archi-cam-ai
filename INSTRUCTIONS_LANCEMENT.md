# 🚀 GUIDE ET INSTRUCTIONS DE LANCEMENT — ARCHI CAM AI

---

## 📌 1. Lancement Ultra-Rapide (2 Méthodes au choix)

### 🟢 Méthode 1 : En 1 Clic (Fichier Batch Windows)
1. Double-cliquez sur **`Lancer_Archi_Cam_AI.bat`** à la racine du projet.
   Ou lancez la commande suivante depuis votre terminal :
   ```cmd
   cmd /c "c:\Users\HP\Desktop\Archi Cam AI\Lancer_Archi_Cam_AI.bat"
   ```
2. 5 terminaux s'ouvrent automatiquement (YOLO, FastMCP, ADK, Neo4j, Next.js).
3. Le navigateur s'ouvre sur **`http://localhost:3000`**.

---

### 🟡 Méthode 2 : Via PowerShell / Bash
```powershell
cd "C:\Users\HP\Desktop\Archi Cam AI\archi-cameroun-ai"
npm run dev
```

---

## 🌐 2. Services & Endpoints Actifs

| Service | URL | Description |
|---|---|---|
| 🏠 Dashboard principal | http://localhost:3000 | Next.js 14 App |
| 📐 Espace Particulier | http://localhost:3000/dashboard/particulier | B2C Devis FCFA & Voice Assistant |
| 🏗️ Espace Pro BIM | http://localhost:3000/dashboard/pro | B2B IFC/DQE & Teaser 3D |
| 🩺 Health Check | http://localhost:3000/api/health | Statut JSON global |
| 💰 API Devis BTP | http://localhost:3000/api/btp/estimate | Tarifs FCFA MINMAP 2026 |
| 🎙️ Assistant Vocal | http://localhost:3000/api/voice/assistant | Inférence Audio & Q/R BTP |
| 🎬 Teaser Vidéo 3D | http://localhost:3000/api/render/video | Survol drone (Veo 3) |
| 🔍 Search Vectoriel | http://localhost:3000/api/search/multimodal | Embedding RAG multimodal |
| 🤖 YOLO FastAPI | http://localhost:8000/health | Segmentation sémantique |
| 💪 FastMCP Workers | http://localhost:8001 | Workers Python BTP |
| 🧠 ADK Agents API | http://localhost:8080 | Orchestrateur multi-agents |
| 🕸️ Neo4j Browser | http://localhost:7474 | Base Graphe & POS Cameroun |

---

## ⚙️ 3. Architecture Inférence Cloud & Souveraine

```
Client (Web / Mobile)
       │
       ▼
 ┌────────────────────────────────────────────────────────┐
 │  Routeur API Lean & Protégé (Credit Manager)           │
 └─────────────────────────┬──────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
   ☁️ ÉTAPE 1 : CLOUD          🛡️ ÉTAPE 2 : SOUVERAIN
   OpenRouter.ai               OpenCV Local 2.5D
   • Gemini 2.5 Flash          • Python script déterministe
   • DeepSeek v4 Flash         • Rendus < 2s sans Internet
   • Nano Banana / Flux        • Textures & Sprites réels
   • Veo 3 Video               • Découpe & Canny maps
   • GPT Audio Mini
```

---

## 🛠️ 4. Commandes de Vérification & Maintenance

```powershell
cd "C:\Users\HP\Desktop\Archi Cam AI\archi-cameroun-ai"

# Vérification TypeScript (0 erreur)
npx tsc --noEmit

# Test des textures HD et sprites mobilier
python scripts/check_assets.py

# Validation des 30 scripts Python
python scripts/validate_python_scripts.py

# Ingestion RAG des textes juridiques et Mercuriale MINMAP
npx tsx scripts/ingest_btp_docs.ts
```
