# 🏛️ Archi Cam AI — Suite IA Agentique & Ingénierie BIM 5D (BTP Cameroun)

[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Firebase Genkit](https://img.shields.io/badge/Firebase_Genkit-Framework_Agentique-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/docs/genkit)
[![Gemma 4 12B QAT](https://img.shields.io/badge/LLM_Local-Gemma_4_12B_QAT-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/gemma)
[![MLflow / MLOps](https://img.shields.io/badge/MLOps-MLflow-0194E2?style=for-the-badge&logo=mlflow)](https://mlflow.org/)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-24.0-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.20-008CC1?style=for-the-badge&logo=neo4j)](https://neo4j.com/)
[![Licence](https://img.shields.io/badge/Licence-Propriétaire-green?style=for-the-badge)](#licence)

> **Archi Cam AI** est la suite logicielle souveraine d'Intelligence Artificielle Agentique et d'Ingénierie BIM 5D conçue pour le secteur du BTP au Cameroun et en Afrique Centrale.

---

## 🌟 Piliers & Moteur de Devis Hybride (Tri-Moteur)

Archi Cam AI combine 3 technologies complémentaires pour générer des devis déterministes et estimatifs d'une précision inégalée :

```mermaid
graph TD
    Input[📄 PDF / Croquis / 📦 IFC 3D] --> Router[🔀 Orchestrateur Firebase Genkit]
    
    Router -->|1. Maquette 3D IFC| BIM[📐 Moteur BIM 5D IfcOpenShell - Précision 100% mm]
    Router -->|2. Plans 2D / PDF| ML[🔮 Modèle Machine Learning R²=0.9872 - 400 Projets BTP]
    Router -->|3. Analyse & Regles| Graph[🕸️ GraphRAG Neo4j - Mercuriale MINMAP 2026 & BAEL 91]
    
    BIM & ML & Graph --> Excel[📊 Devis Excel Harmonisé 6 Onglets Famille NDA]
```

1. **🤖 Orchestration Agentique Firebase Genkit** : Pilotage de 4 agents IA spécialisés (`@agent-metreur`, `@agent-devis`, `@agent-structure`, `@agent-design`) collaborant en parallèle.
2. **🔮 MLOps & Machine Learning (MLflow Pipeline)** : Pré-devis estimatif instantané alimenté par un modèle Gradient Boosting ($R^2 = 0.9872$) entraîné sur 400 projets réels de construction au Cameroun.
3. **🧠 LLM Hybride & Souveraineté (Gemma 4 12B QAT & Gemini 1.5)** : Modèle **Google Gemma 4 (12B QAT)** local via LM Studio pour le traitement ultra-confidentiel hors-ligne, couplé à **Gemini 1.5 Pro** (Vision) et **Imagen 3.0** (Rendus 3D).
4. **📐 Assainissement Altimétrique Z & ControlNet** : Correcteur automatique des calques Archicad par altitude $Z$ et masque filaire rigide anti-hallucination.
5. **📊 Devis Excel Harmonisé (Famille NDA - 6 Onglets)** : Export `.xlsx` complet avec formules automatiques reliées (Fondation, RDC, Étage, Second Œuvre, Récapitulatif DEVIS, Planning GANTT CPM/PERT).

---

## 💻 Stack Technologique Complète

### 🤖 Intelligence Artificielle & Framework Agentique
- **Framework Agentique** : **Firebase Genkit** (`src/genkit/`) — Orchestration multi-agents type Crew.
- **LLM Local Souverain** : **Google Gemma 4 (12B QAT)** via LM Studio (`http://127.0.0.1:1234/v1`).
- **Vision & Photoréalisme** : Google Gemini 1.5 Pro / Flash & Google Imagen 3.0.
- **MLOps & Pipeline ML** : **MLflow** & Scikit-Learn (`scripts/train_cost_predictor.py`).

### 🛠️ Frontend & Visualisation 3D BIM
- **Frontend Framework** : Next.js 14 (App Router), React 18, TypeScript.
- **Styling & UI** : TailwindCSS, Lucide Icons, Radix UI, Framer Motion.
- **Visualiseur 3D BIM** : Three.js & `@thatopen/components` (Web-IFC WebGL).

### ⚙️ Backend, Bases de Données & Infra
- **Calculs Déterministes BIM** : Python 3.11, IfcOpenShell, Pandas, NumPy, OpenPyXL.
- **Bases de Données Conteneurisées (Docker)** :
  - **Neo4j 5.20 GraphRAG** (Ontologie BTP, Mercuriale MINMAP 2026, BAEL 91).
  - **PostgreSQL 16 `pgvector`** (Recherche documentaire vectorielle).
- **Backend Storage & Auth** : Supabase & Firebase Auth.

---

## 🚀 Démarrage Rapide

### 1. Cloner & Installer
```bash
git clone https://github.com/gervais-afk/archi-cam-ai.git
cd archi-cam-ai
npm install
pip install -r requirements.txt
```

### 2. Démarrer les Services
```bash
cp .env.example .env.local
docker-compose up -d
npm run dev
```

---

## 🔒 Sécurité & Protection (DevSecOps)

* ❌ **Zero Secret Commit** : Aucune clé d'API commité (vérifié par audit CI/CD).
* 🛡️ **Isolation des Données** : `.env.local`, logs et scripts temporaires strictement ignorés par `.gitignore`.
* 🇨🇲 **Souveraineté des Données** : Exécution locale par **Gemma 4 (12B QAT)** pour préserver la confidentialité des projets.

---

## 📄 Licence

Proprietary License — All Rights Reserved.
Copyright (c) 2026 **Gervais KOA & Archi Cam AI**. Tous droits réservés.
