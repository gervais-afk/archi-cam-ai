# 🚀 GUIDE ET INSTRUCTIONS DE LANCEMENT — ARCHI CAM AI (PRODUCTION)

---

## 📌 1. Lancement Ultra-Rapide (2 Méthodes au choix)

### 🟢 Méthode 1 : En 1 Clic (Fichier Batch Windows)
1. Double-cliquez sur le fichier **`Lancer_Archi_Cam_AI.bat`** à la racine du projet.
2. Le serveur de développement démarrera automatiquement sur **`http://localhost:3000`**.
3. Ouvrez votre navigateur (Chrome / Edge / Firefox) et accédez à **`http://localhost:3000`**.

---

### 🟡 Méthode 2 : Via le Terminal PowerShell / Bash
1. Ouvrez PowerShell ou VS Code dans le dossier du projet :
   ```powershell
   cd "C:\Users\HP\Desktop\Archi Cam AI\archi-cameroun-ai"
   ```
2. Lancez la vérification globale (TypeScript + Python + Assets) :
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/check-all.ps1
   ```
3. Démarrez le serveur :
   ```powershell
   npm run dev
   ```
4. Testez le rendu local en 1 ligne dans un autre terminal :
   ```powershell
   npm run test:local-render
   ```

---

## 🌐 2. Espaces & Liens Utiles

Une fois l'application lancée sur `http://localhost:3000` :

* 🏠 **Page d'Accueil officielle** : [http://localhost:3000](http://localhost:3000)
* 📐 **Espace Particulier (Devis Rapide FCFA & Rendus 2.5D)** : [http://localhost:3000/dashboard/particulier](http://localhost:3000/dashboard/particulier)
* 🏗️ **Espace Professionnel (Maquette IFC 3D & Export DQE / BTP)** : [http://localhost:3000/dashboard/pro](http://localhost:3000/dashboard/pro)

---

## ⚙️ 3. Intégration IA & Multimodalité Locale

### A. Moteur Vision LM Studio Local (google/gemma-4-12b-qat)
* Serveur local sur `http://localhost:1234/v1/chat/completions`.
* Timeout configuré à 45 minutes pour garantir l'analyse complète sans coupure.
* Extraction JSON sémantique : Pièces, surfaces ($m^2$), cotations, meublage $x, y, w, h$ et orientation *wall-snap*.

### B. Fallback Souverain OpenCV Local
* Si LM Studio ou les APIs Cloud sont désactivés ou hors-ligne, le moteur OpenCV prend le relais déterministe en **< 3 secondes** et retourne un rendu 2.5D HD avec textures réelles et 16 sprites de mobilier.

---

## 🛠️ 4. Commandes de Vérification & Maintenance

```powershell
# Vérification globale 100% automatisée
npm run validate:local

# Audit direct des 5 textures HD et 16 sprites mobilier
python scripts/check_assets.py

# Validation de compilation des 30 scripts Python
python scripts/validate_python_scripts.py

# Test d'intégration API Rendu HTTP 200
npm run test:local-render
```
