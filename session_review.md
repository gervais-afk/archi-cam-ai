# 🚀 Next Actions

- **Commencer par exécuter le test d'ingestion RAG** sur le fichier `duplex.ifc`.
- Vérifier la table `project_memory` (synthèses & embeddings) via `psql`.
- Connecter l'Agent Conducteur de Travaux au backend RAG (outil `search_similar_projects`).
- Tester l'endpoint `/api/estimate` avec une requête type "villa R+1 sur sol marécageux".
- Réviser les éventuels retours d’erreurs et itérer sur les prompts / métadonnées.

---

# 📋 À Revoir / Prochaines Étapes (Résumé de la session)

## Studio de Rendu Multimodal & Cache
- **Prompt Engine** (Pivot Ingénieur) implémenté avec Gemini Vision pour analyser les plans 2D et réduire les hallucinations.

## UI Premium (Anthracite / Ocre)
- `MediaViewerPro.tsx` enrichi avec les boutons **"Passer en 4K"** et **"Animer la scène (Veo 3.1)"** – style premium appliqué.

## Migration du Cache Sémantique
- Cache pgvector migré de Supabase vers Google Cloud SQL (connexion native `pg`).

## Moteur de Facturation (PDF)
- `generer_decompte_pdf.py` (ReportLab) mis à jour : TVA 19,25 % camérounaise, marges appliquées, et zone sécurisée pour les matériaux "À CHIFFRER" (0 FCFA).
- Route API Next.js **`/api/generate-pdf`** créée.
- Bouton de téléchargement PDF ajouté dans `EstimateTable.tsx` avec état de chargement.

## Fondations de la Mémoire RAG (DevOps Local)
- Script `ingest_ifc_to_memory.py` créé : vecteur 1536‑D via **Google GenAI `text‑embedding‑004`**, métadonnées : zone climatique, type de sol, accessibilité.
- Table SQL `project_memory` préparée (extension `vector`, index `ivfflat`).

## Prochaine Session
- Exécuter l’ingestion du fichier `duplex.ifc`.
- Valider les données dans `project_memory`.
- Connecter l’Agent Conducteur de Travaux au RAG (outil `search_similar_projects`).
- Tester le flux complet d’estimation de coûts.
