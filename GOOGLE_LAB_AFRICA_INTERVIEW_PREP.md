# 🏛️ Google Applied AI Lab Africa — Executive Interview Prep Guide

This document is engineered to help you present yourself, your background, and your portfolio of sovereign AI projects confidently in English during your interview with the Google selection committee.

---

## 👤 1. "TELL ME ABOUT YOURSELF" — THE PITCH (L'introduction)
*Use these scripts to introduce yourself. Focus on your double-competency (Civil Engineering & Aviation Security) and how it led you to Applied AI.*

### ⏱️ Short Version (1 Minute)
> "Hi, my name is **Marie Gervais Nelly Koa**. I am a Lead AI Engineer, Data Architect, and Civil Engineer from Cameroon. I am currently pursuing my **Professional Master's in Applied Artificial Intelligence** at the University of Ngaoundéré, and I hold a **B.Sc. in Civil Engineering**.
> For the last 8 years, I have also worked as an **ICAO Certified Aviation Security Officer** at the Cameroon Civil Aviation Authority.
> My background is unique because I bridge strict operational fields—like structural civil engineering calculations and aviation safety—with advanced AI systems. I build **sovereign, local-first (Edge AI), neuro-symbolic architectures** that eliminate LLM hallucinations and operate offline. I am the founder of **Archi Cam AI**, which I created specifically to solve the construction cost estimating crisis in Africa."

### ⏱️ Extended Version (3 Minutes)
> "Thank you for this opportunity. I describe myself as a **Hybrid AI Engineer** because my engineering career started in **Civil Engineering**. I spent years studying structural codes like **BAEL 91** and managing Quantity Surveying (QS). At the same time, I specialized in **Aviation Security (AVSEC)**, auditing high-risk systems under strict international safety regulations.
> 
> Through these two fields, I noticed a massive challenge: **safety-critical industries in Africa cannot afford errors, and they cannot always depend on stable cloud internet connection.** 
> This inspired me to pursue my **Master's in Applied AI at the University of Ngaoundéré**. I wanted to build AI systems that are:
> 1. **100% Deterministic (Zero-Hallucination):** They use symbolic math engines instead of letting LLMs guess numbers.
> 2. **Sovereign and Offline-First (Edge AI):** They run locally on quantized models like Google Gemma 4 to protect sensitive data and function on remote sites.
> 
> I have put this theory into practice through a suite of 5 flagship production projects, led by **Archi Cam AI**, a platform that automates 3D/2D building estimation from days to seconds with millimeter accuracy. I am extremely excited about the prospect of joining the Google Applied AI Lab in Accra to scale these solutions and drive massive ROI for the African AEC sector."

---

## 📐 2. HOW TO PITCH "ARCHI CAM AI" (Le pitch du projet phare)
*This is your primary project. Explain the hybrid cloud/edge architecture and neuro-symbolic split.*

### The Problem
* "In Africa, calculating construction cost estimates (Bill of Quantities / BOQ) manually from architectural plans takes **3 to 7 working days**, with a human error rate of up to 25%, causing major budget overruns."
* "Public cloud LLMs cannot do this because they **hallucinate calculations** and violate sovereign data confidentiality by uploading public infrastructure blueprints to public servers."

### The Solution (Archi Cam AI)
* **Speed & Accuracy:** "We accelerate the estimation process by **99.2%**, generating a full, bankable 6-sheet Excel BOQ from a 3D IFC or 2D PDF file in under **45 seconds** with millimeter precision ($R^2 = 0.9872$)."
* **The Neuro-Symbolic Architecture:** 
  * *"The LLM (Gemini / local Gemma) does not do the math.* It is used as a natural language orchestrator (semantic parser) via **Firebase Genkit**. It maps construction terms to Uniclass 2015 and Cameroon's MINMAP 2026 price index."
  * *The Python Sandbox (IfcOpenShell & NumPy)* does 100% of the geometry calculations, door/window deductions, and concrete stress audits deterministically.
* **Offline Edge Resiliency:** "It runs in the cloud using **Google Gemini 2.5/1.5 Flash**, but automatically fails over to a local, quantized **Google Gemma 4 12B QAT** model running via LM Studio on port 1234. This guarantees that if a construction manager is on a remote African building site with no internet, the system still runs locally with zero cloud dependencies."
* **Imagen 3.0 & ControlNet Guardrails:** "When rendering design options, we lock the geometry using a 3-layer depth and edge ControlNet. This prevents the AI from shifting walls, windows, or load-bearing columns."

---

## 💼 3. TALKING ABOUT YOUR OTHER 4 FLAGSHIP PROJECTS (Les autres projets)
*Be ready to explain how your other projects showcase your MLOps, Data Engineering, and Safety capabilities.*

### 📊 1. Sovereign.BI (Agentic Business Intelligence)
* **What it is:** "An agentic SQL & Knowledge Graph BI query engine."
* **The Tech:** TypeScript, Neo4j (GraphRAG using N10S), PostgreSQL (pgvector), FastAPI.
* **How it works:** "It allows executives to ask complex business questions in natural language. The AI translates the request into SQL or Neo4j Cypher queries, retrieves the data, and returns it in under 5 seconds."
* **Key Innovation:** "It includes an active game-theory explainability auditor (**SHAP Sentinel**) and dynamic Attribute-Based Access Control (**ABAC**) to sanitize and protect personally identifiable information (PII)."

### ⚙️ 2. Dataset Automator (Autonomous MLOps Factory)
* **What it is:** "An automated Data Engineering, quality audit, and ETL governance pipeline."
* **The Tech:** Pytest, Great Expectations, Neo4j Knowledge Graph, MLflow, Genkit.
* **How it works:** "It automatically ingests data, audits its quality using strict programmatic rules, and tracks model performance."
* **Key Innovation:** "It continuously monitors **Data Drift** (using Kolmogorov-Smirnov statistical tests and the Population Stability Index) inside **MLflow**. If the data distribution drifts, it automatically triggers a retraining alert."

### ✈️ 3. ASU-Audit-Ready (Aviation Security Compliance)
* **What it is:** "An airport compliance and risk simulation software engineered for the Cameroon Civil Aviation Authority (CCAA)."
* **The Tech:** Python, Streamlit, docx automation.
* **How it works:** "It automates the creation of standard monthly AVSEC compliance reports, tracks security KPIs across screening points (PIF) and security zones (ZSAR), and simulates interactive aviation security audits based on ICAO Annex 17."
* **Key Innovation:** "It translates my 8 years of operational aviation security expertise into a digital system, ensuring Cameroon's compliance audits are 100% audit-ready."

### 🌾 4. VigieSahel (Climate Predictive ML)
* **What it is:** "An MLOps platform for real-time agricultural risk mitigation and health forecasting in the Sahel."
* **The Tech:** XGBoost ($R^2 > 94\%$), MQTT, WebSockets, Supabase, MLflow.
* **How it works:** "It tracks real-time Harmattan dust storms (PM2.5 particles) to anticipate meningitis epidemics 14 days in advance and reduce agricultural crop sowing failures by 35%."
* **Key Innovation:** "Combines real-time edge telemetry with time-series forecasting, managed under strict MLOps lifecycle tracking in MLflow."

---

## 🧠 4. KEY TECHNICAL ANSWERS FOR GOOGLE INTERVIEWERS
*Prepare for these technical questions from Google researchers.*

### Q1: "Why did you choose a Hybrid Cloud/Edge architecture?"
> *"In Africa, cloud-only systems fail due to unstable network bandwidth, and public cloud queries pose data security risks for sovereign state infrastructure. By building a hybrid architecture, we use Google Gemini APIs for high-performance cloud processing when internet is available, and automatically switch to a local Google Gemma 4 12B QAT instance running on-site when offline. This ensures operational continuity and absolute data privacy."*

### Q2: "How do you integrate Firebase Genkit with a local Gemma model?"
> *"Genkit is highly extensible. We define a custom model provider that routes API calls to a local OpenAI-compatible endpoint hosted by LM Studio (running `google/gemma-4-12b-qat` on port 1234). Genkit acts as the schema-enforcer and agent supervisor, while local Gemma does the text token generation. This keeps the agent runtime lightweight and fully local."*

### Q3: "How does your MLOps pipeline prevent Model/Data Drift?"
> *"We use MLflow to track all model parameters and metrics. For VigieSahel, weather and dust distributions change seasonally. Our CI/CD pipeline runs automated scripts that calculate the Kolmogorov-Smirnov (KS) test and the Population Stability Index (PSI) between the baseline training data and real-time inference data. If the statistical drift exceeds our threshold, MLflow triggers a webhook to automatically retrain the pipeline."*

### Q4: "Explain the benefit of GraphRAG over VectorRAG."
> *"Traditional VectorRAG performs similarity search on flat, fragmented text chunks. This breaks structural relations (like parent-child elements in an IFC file or hierarchical chapters in civil engineering codes). Neo4j GraphRAG (via N10S) stores these relationships as nodes and edges. The agent can traverse the graph (e.g., finding which room contains which walls and which doors) to retrieve 100% contextually accurate information without losing structural hierarchy."*

---

## 🗣️ 5. KEY VOCABULARY CHEAT SHEET (Lexique Anglais-Français)
*Use these words during your interview to sound highly technical and professional.*

| English Term | French Equivalent | Context / Example |
| :--- | :--- | :--- |
| **Quantity Surveying (QS)** | Métré / Estimation | *"I have a B.Sc. in Civil Engineering and specialized in Quantity Surveying."* |
| **Bill of Quantities (BOQ)** | Devis Quantitatif Estimatif (DQE) | *"Archi Cam AI generates 6-sheet BOQs in under 45 seconds."* |
| **Hallucination** | Hallucination (erreurs de l'IA) | *"We use deterministic sandbox math to prevent AI hallucinations."* |
| **Sovereign / Sovereignty** | Souverain / Souveraineté | *"Sovereign Edge AI protects sensitive architectural data."* |
| **Air-gapped / Local-first** | Hors-ligne / Sans connexion | *"Our local execution is fully air-gapped for airport security audits."* |
| **Quantized / Quantization** | Quantifié / Quantification | *"We run a quantized Gemma 4 12B model locally."* |
| **Failover** | Basculement automatique | *"The system has a cloud-to-edge failover mechanism."* |
| **Data Drift / Concept Drift** | Dérive des données / du concept | *"We monitor data drift in MLflow using the KS-test."* |
| **Explainability** | Explicabilité | *"We use SHAP Sentinel to guarantee model explainability."* |
| **Syllabus / Skill Blocks** | Programme / Blocs de compétences | *"My Master's in Applied AI is structured around 5 skill blocks."* |
| **Tender / Bidding** | Appel d'offres | *"We map items to the official MINMAP 2026 tender price index."* |
| **Load-bearing columns** | Poteaux porteurs | *"ControlNet prevents the AI from moving load-bearing columns."* |
| **Apertures / Openings** | Baies / Ouvertures (portes/fenêtres) | *"Deterministic logic handles aperture subtractions above 0.50 m²."* |

---

## 📈 6. PRO TIPS FOR THE CALL (Conseils pratiques pour l'entretien)
1. **Slow down and breathe:** Speak slowly. Using technical terms correctly is much more important than speaking fast.
2. **Lean on the cheat sheet:** Keep this document open on your screen during the call so you can quickly refer to the English expressions.
3. **Use the "STAR" method for project questions:**
   * **S**ituation (The problem: e.g. manual BOQ takes 7 days and has 25% errors).
   * **T**ask (What you needed to do: build an automated, zero-hallucination, offline system).
   * **A**ction (What you did: built Firebase Genkit agentic router + Python IfcOpenShell sandbox + local Gemma 4).
   * **R**esult (The impact: reduced time to 45 seconds, $R^2 = 0.9872$, fully secure).
4. **Be proud of your unique background:** Having a civil engineering degree and working in aviation security is an *advantage*. It shows you understand the real-world operational environments where AI needs to be deployed. Google loves engineers who can bridge complex industries with AI.
