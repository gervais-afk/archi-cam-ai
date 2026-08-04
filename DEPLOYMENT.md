# 🌐 Guide de Déploiement en Production — Archi Cam AI

Ce guide documente l'architecture de déploiement en production, le découpage **Vercel Serverless (Next.js)** vs **VPS Linux Docker (Python FastMCP & Neo4j)**, et la configuration des passerelles **Firebase Prod** et **Mobile Money Cameroun**.

---

## 🏛️ Architecture Globale Cible

```
┌─────────────────────────────────────────────────────────────┐
│  Vercel Serverless (Paris cdg1)    VPS Ubuntu 22.04 LTS     │
│  https://archicamai.cm             https://vps.archicamai.cm│
│                                                             │
│  → Next.js 14 App Router           → FastMCP Worker (:8000) │
│  → Auth & Storage Firebase Prod    → Neo4j GraphRAG (:7687) │
│  → Mobile Money Payments           → OpenCV & IfcOpenShell  │
│  → FastMCP Bridge HTTPS            → DuckDB Analytics       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Étape 1 : Déploiement du Frontend Next.js sur Vercel

1. Connectez votre compte GitHub à **Vercel** (`https://vercel.com`).
2. Importez le projet `archi-cameroun-ai`.
3. Vercel détectera automatiquement la configuration dans [vercel.json](file:///c:/Users/HP/Desktop/Archi%20Cam%20AI/archi-cameroun-ai/vercel.json).
4. Ajoutez les variables d'environnement de production dans l'interface Vercel (copier les valeurs depuis [.env.production](file:///c:/Users/HP/Desktop/Archi%20Cam%20AI/archi-cameroun-ai/.env.production)) :
   - `NEXT_PUBLIC_APP_URL` = `https://archicamai.cm`
   - `FASTMCP_BASE_URL` = `https://vps.archicamai.cm`
   - `FIREBASE_USE_EMULATOR` = `false`
   - Clés Firebase Production (`NEXT_PUBLIC_FIREBASE_API_KEY`, etc.)
   - Clés IA Cloud (`GEMINI_API_KEY`, `REPLICATE_API_TOKEN`, etc.)

---

## ⚙️ Étape 2 : Déploiement du VPS Cloud Python (Hetzner / Contabo / DigitalOcean)

### Spécifications minimales requises pour le VPS :
- **CPU** : 2 vCPU
- **RAM** : 4 Go à 8 Go RAM (OpenCV, Neo4j, DuckDB, IfcOpenShell)
- **Stockage** : 50 Go SSD
- **OS** : Ubuntu 22.04 LTS
- **Ports ouverts** : `80` (HTTP), `443` (HTTPS Nginx), `7687` (Neo4j Bolt)

### Déploiement en 1 ligne sur le VPS :
```bash
git clone https://github.com/votre-compte/archi-cameroun-ai.git
cd archi-cameroun-ai
chmod +x scripts/deploy-vps.sh
./scripts/deploy-vps.sh vps.archicamai.cm admin@archicamai.cm
```

---

## 💳 Étape 3 : Activation des Paiements Mobile Money Cameroun

1. **Orange Money Cameroun** :
   - Inscription sur le portal Orange Developer.
   - Renseigner `ORANGE_MONEY_CLIENT_ID` et `ORANGE_MONEY_CLIENT_SECRET`.
   - L'API gère automatiquement le switch entre la sandbox de test et l'API `webpayment` de production.

2. **MTN Mobile Money** :
   - Inscription sur le portal MTN Developer.
   - Renseigner `MTN_MOMO_SUBSCRIPTION_KEY` et `MTN_MOMO_USER_ID`.

---

## 🔔 Étape 4 : Monitoring & Alertes Telegram

Pour recevoir des alertes instantanées sur votre téléphone en cas d'échec d'un moteur cloud ou de bascule sur OpenCV :
1. Créez un bot Telegram via `@BotFather`.
2. Obtenez votre ID de tchat via `@userinfobot`.
3. Renseignez `TELEGRAM_BOT_TOKEN` et `TELEGRAM_CHAT_ID` dans l'environnement Vercel.

---

## ✅ Checklist d'Acceptation avant Ouverture Commerciale

- [x] `npm run build` compilé sans aucune erreur.
- [x] `vercel deploy` validé sur `https://archicamai.vercel.app`.
- [x] Le conteneur FastMCP répond en HTTPS sur `https://vps.archicamai.cm/health`.
- [x] La base Neo4j est sécurisée par mot de passe fort sur le port `7687`.
- [x] Les utilisateurs peuvent créer un compte et téléverser des plans vers Firebase Storage Prod.
- [x] Le devis DQE FCFA et le rendu 3D sont générés en moins de 90 secondes.
- [x] Les alertes Telegram avertissent immédiatement l'équipe technique en cas de problème.
