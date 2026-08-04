# ── STAGE 1: Build & Dependencies ──────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Installation des dépendances système de build
RUN apt-get update -o Acquire::https::Verify-Peer=false || true && \
    apt-get install -y --allow-unauthenticated python3 python3-pip python3-venv build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

# Build Next.js
RUN npm run build

# ── STAGE 2: Production Runtime ─────────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Installation de Python 3 et des bibliothèques système OpenCV/PDFium pour le moteur 2D/3D
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Création du venv Python et installation des dépendances
COPY pyproject.toml ./
RUN python3 -m venv .venv && \
    .venv/bin/pip install --no-cache-dir pypdfium2 pillow numpy opencv-python-headless ifcopenshell

# Copie de l'application compilée
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/data ./data
COPY --from=builder /app/knowledge_base ./knowledge_base
COPY --from=builder /app/lib ./lib

EXPOSE 3000

CMD ["npm", "run", "start"]
