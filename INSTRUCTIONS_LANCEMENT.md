# 🚀 GUIDE ET INSTRUCTIONS DE LANCEMENT — ARCHI CAM AI

---

## 📌 1. Lancement Ultra-Rapide (2 Méthodes au choix)

### 🟢 Méthode 1 : En 1 Clic depuis votre Bureau (Recommandé)
1. Allez sur votre Bureau Windows.
2. Double-cliquez sur le fichier **`Lancer_Archi_Cam_AI.bat`**.
3. Une fenêtre noire s'ouvrira et démarrera le serveur sur **`http://localhost:3000`**.
4. Ouvrez votre navigateur (Chrome / Edge) et accédez à **`http://localhost:3000`**.

---

### 🟡 Méthode 2 : Via le Terminal PowerShell
1. Ouvrez PowerShell ou VS Code.
2. Déplacez-vous dans le dossier du projet :
   ```powershell
   cd "C:\Users\HP\Desktop\Archi Cam AI\archi-cameroun-ai"
   ```
3. Lancez le serveur de développement :
   ```powershell
   npm run dev
   ```
4. Ouvrez votre navigateur sur **`http://localhost:3000`**.

---

## 🌐 2. Liens Directs vers les Différents Espaces

Une fois l'application lancée sur `http://localhost:3000` :

* 🏠 **Page d'Accueil officielle** : [http://localhost:3000](http://localhost:3000)
* 📐 **Espace Particulier (Devis Rapide & Rendus 3D)** : [http://localhost:3000/dashboard/particulier](http://localhost:3000/dashboard/particulier)
* 🏗️ **Espace Professionnel (Maquette IFC 3D & Export Excel 6 Onglets)** : [http://localhost:3000/dashboard/pro](http://localhost:3000/dashboard/pro)

---

## ⚙️ 3. Démarrage des Services Optionnels (Neo4j & Local LLM)

### A. GraphRAG Neo4j (Base de Prix Mercuriale MINMAP 2026)
Si vous souhaitez interroger la base de données de prix et de normes BAPEL :
1. Lancez Docker Desktop.
2. Dans le terminal du projet, tapez :
   ```powershell
   docker-compose up -d
   ```
3. Accédez à l'interface Neo4j Browser sur `http://localhost:7474`.

### B. Moteur IA Local Gemma 4 12B QAT (Mode 0 FCFA Hors-Ligne)
Si vous souhaitez exécuter le modèle LLM localement sans clé API payante :
1. Lancez **LM Studio**.
2. Chargez le modèle `google/gemma-4-12b-qat`.
3. Démarrez le serveur local sur le port `1234`.

---

## 🔧 4. Résolution des Problèmes Fréquents (Troubleshooting)

### ❓ Problème 1 : "L'application s'affiche en texte brut ou mal mise en forme (CSS non chargé)"
* **Solution** : Le cache Next.js est corrompu ou obsolète. 
* Fermez le serveur (`Ctrl + C`), puis supprimez le dossier `.next` et relancez :
  ```powershell
  Remove-Item -Recurse -Force .next
  npm run dev
  ```

### ❓ Problème 2 : "Le port 3000 est déjà utilisé (EADDRINUSE)"
* **Solution** : Lancez le serveur sur le port 3001 :
  ```powershell
  npm run dev -- -p 3001
  ```
* Et accédez à **`http://localhost:3001`**.
