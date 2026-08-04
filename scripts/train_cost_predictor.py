#!/usr/bin/env python3
"""
train_cost_predictor.py — Archi Cam AI MLOps Cost Prediction Pipeline

Entraîne un modèle de régression (MLOps 19-cellules) pour estimer le coût total
d'un projet de construction au Cameroun en fonction du niveau de finition,
de la région, du nombre d'étages et de la surface bâtie.
"""

import os
import sys
import json
import logging
from pathlib import Path

import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

def generate_synthetic_btp_data(n_samples=500, seed=42):
    np.random.seed(seed)
    regions = ['CENTRE', 'LITTORAL', 'OUEST', 'NORD', 'SUD']
    finitions = ['ECONOMIQUE', 'STANDARD', 'STANDING', 'HAUT_STANDING']
    
    data = []
    for _ in range(n_samples):
        reg = np.random.choice(regions)
        fin = np.random.choice(finitions)
        surface = np.random.uniform(50, 600)
        etages = np.random.choice([0, 1, 2, 3, 4])
        
        # Facteur région
        coeff_reg = {'CENTRE': 1.1, 'LITTORAL': 1.15, 'OUEST': 0.95, 'NORD': 1.05, 'SUD': 1.08}[reg]
        # Facteur finition (Prix au m2 de base)
        base_m2 = {'ECONOMIQUE': 150000, 'STANDARD': 220000, 'STANDING': 350000, 'HAUT_STANDING': 550000}[fin]
        
        cost = (surface * base_m2 * coeff_reg * (1 + 0.12 * etages)) + np.random.normal(0, 1500000)
        
        data.append({
            'region': reg,
            'finition': fin,
            'surface_m2': round(surface, 2),
            'nb_etages': etages,
            'cout_total_xaf': max(5000000, round(cost, -3))
        })
    return pd.DataFrame(data)

def train_pipeline():
    logging.info("📊 Génération / Chargement des données de coûts BTP Cameroun...")
    df = generate_synthetic_btp_data()
    
    # Encodage One-Hot des variables catégorielles
    df_encoded = pd.get_dummies(df, columns=['region', 'finition'], drop_first=True)
    
    X = df_encoded.drop(columns=['cout_total_xaf'])
    y = df_encoded['cout_total_xaf']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    logging.info(f"🤖 Entraînement du modèle Gradient Boosting sur {len(X_train)} projets...")
    model = GradientBoostingRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    logging.info(f"✅ Entraînement terminé !")
    logging.info(f"   MAE  : {mae:,.0f} XAF")
    logging.info(f"   R²   : {r2:.4f}")
    
    # ---------------------------------------------------------------
    # Sauvegarde du modèle entraîné (pickle) pour usage LIVE FastMCP
    # Le tool MCP 'predict_cost_ml' charge ce fichier à chaque requête
    # ---------------------------------------------------------------
    import pickle
    model_pkl_path = MODELS_DIR / "cost_predictor.pkl"
    with open(model_pkl_path, "wb") as f:
        pickle.dump({"model": model, "feature_names": list(X.columns)}, f)
    logging.info(f"💾 Modèle ML sérialisé (pickle) → {model_pkl_path}")
    
    # Sauvegarde des métriques et du rapport de modèle (model card MLOps)
    model_card = {
        "model_type": "GradientBoostingRegressor",
        "dataset_samples": len(df),
        "metrics": {
            "mae_xaf": round(mae, 2),
            "r2_score": round(r2, 4)
        },
        "features": list(X.columns),
        "pipeline_integration": "fastmcp/main.py → predict_cost_ml()"
    }
    
    card_path = MODELS_DIR / "cost_predictor_card.json"
    with open(card_path, "w", encoding="utf-8") as f:
        json.dump(model_card, f, indent=2, ensure_ascii=False)
        
    logging.info(f"💾 Fiche MLOps sauvegardée → {card_path}")
    logging.info(f"🚀 Modèle prêt pour usage LIVE via l'outil MCP 'predict_cost_ml'")

if __name__ == "__main__":
    train_pipeline()
