# OBJECT KNOWLEDGE FRAMEWORK (OKF) : GROS-ŒUVRE & SECOND-ŒUVRE (CAMEROUN)

---
document_type: "Modélisation de Connaissances Métier & RAG"
domaine: "Construction, Métrologie BTP et Estimation Budgétaire"
version: "1.0.0"
source_prix: "Mercuriale NDA FAMILY Excel & Grilles Camerounaises"
---

Ce document constitue la source de vérité ultime (OKF) pour l'orchestrateur de devis et les agents conversationnels d'Archi Cam AI. Il combine les règles de calcul déterministes du Gros-Œuvre/Second-Œuvre avec la base tarifaire réelle issue du projet "NDA FAMILY".

---

## 1. RÈGLES DE DOSAGE DE RESSOURCES ET PERTES (GROS-ŒUVRE)

Tout ouvrage en béton armé ou maçonnerie est décomposé en ses composants élémentaires de ressources. L'IA doit appliquer les règles d'approvisionnement déterministes suivantes extraites du projet NDA FAMILY :

### A. Ratios de dosage par m³ de Béton Structural (Dalle, Poteaux, Poutres)
- **Ciment CPJ** : Masse (tonnes) = Volume Béton (m³) × 0.350 (soit 350 kg/m³ ou 7 sacs de 50 kg par m³).
- **Sable de Sanaga** : Volume Sable (m³) = Volume Béton (m³) × 0.45.
- **Gravier** : Volume Gravier (tonnes) = Volume Béton (m³) × 1.12 (soit 0.80 m³ avec une densité de 1.4).
- **Ratio d'Acier HA** : Masse Acier (kg) = Volume Béton (m³) × 80 (pour poteaux/poutres).

### B. Coefficients de Perte (Majoration)
- **Matériaux bruts** : Appliquer un coefficient de 1.03 à 1.05 (soit 3% à 5% de pertes pour casse et gâchis).
- **Béton de plancher** : Quantité approvisionnée = Quantité œuvre × 1.05 (5% de pertes).

---

## 2. MERCURIALE DES PRIX UNITAIRES DE RÉFÉRENCE (Mise à jour 2025)

Les prix unitaires (fourniture) de référence issus des mercuriales officielles et du projet NDA FAMILY sont :

| Code Interne | Désignation de la Ressource / Ouvrage | Unité | Prix Unitaire (FCFA) | Notes de localisation / Normes |
|---|---|---|---|---|
| **MAT-CIM** | Ciment CPJ 32.5 | Sac (50kg) | 4 900 | Douala (5 100 à Yaoundé, 6 200 à Garoua) |
| **MAT-CIM-HA** | Ciment CPJ 42.5 | Sac (50kg) | 5 500 | Douala (5 700 à Yaoundé, 6 800 à Maroua) |
| **MAT-SAB** | Sable de Sanaga 0/5 | m³ | 23 000 | Rendu Douala/Yaoundé |
| **MAT-GRA** | Gravier de carrière 15/25 | Tonne | 13 000 | Densité de 1.4, rendu chantier |
| **MAT-ACI** | Armatures en aciers HA (Fe500) | kg | 700 | Standard camerounais (FeE500) |
| **MAT-BOI** | Bois de coffrage (Planches de 3m) | Unité | 2 500 | Essence locale (Ebiara / Ayous) |
| **OUV-MAC** | Maçonnerie agglos creux 15x20x40 | m² | 7 500 | Fourniture et pose |
| **OUV-BAP** | Béton armé pour semelles (350kg/m³) | m³ | 250 000 | Fourniture et pose |
| **OUV-BAE** | Éléments d'ossature verticale (poteaux) | m³ | 280 000 | Fourniture et pose |
| **MAT-REV-SOL** | Carreaux sol intérieur | m² | 6 500 | Importation ou Grès local |

---

## 3. FORMULATION COMPOSITE ET CASCADE FINANCIÈRE

Le coût final d'un ouvrage ou du devis total intègre les frais généraux et taxes de chantier :

### A. Décomposition du Déboursé Sec (DS)
$$DS = C_{mat} + C_{mpo} + C_{matr}$$
- $C_{mat}$ : Coût des matériaux (pertes incluses).
- $C_{mpo}$ : Coût de la main-d'œuvre (Temps Unitaire × Déboursé Horaire).
- $C_{matr}$ : Coût du matériel (Bétonnière, vibreur, etc.).

### B. Calcul du Prix de Vente Hors Taxes (PVHT)
$$PVHT = DS \times k$$
Où $k = 1.3333$ (soit $k = \frac{1 - b}{1 + a}$ avec $a$ frais de chantier, et $b$ frais généraux/bénéfices).

### C. Cascade Financière Forfaitaire (si appliquée au Total)
1. **Total de Base** = Somme des Fournitures.
2. **Frais d'Imprévus & Aléas** = Total de Base × 0.03 (3%).
3. **Main-d'œuvre forfaitaire** = Total de Base × 0.20 (20%).
4. **Total Général (Devis Final)** = Total de Base + Imprévus (3%) + Main-d'œuvre (20%).

---

## 4. DIRECTIVES TEMPORELLES ET DÉPENDANCES DE CHANTIER

- **Décoffrage vertical (Poteaux)** : Autorisé après **48 heures** de séchage.
- **Décoffrage horizontal (Dalles/Poutres)** : Autorisé après **7 jours** de séchage.
- **Cure du béton** : Maintenir humide pendant au moins **7 jours consécutifs**.
- **Lag de séchage semelles** : Attendre **+3 jours** avant le remblai.
- **Lag de séchage dalle RDC** : Attendre **+14 jours** avant de poser des charges lourdes.

---

## 5. RÈGLES SOCIALES ET SANITY CHECKS (VÉRIFICATION IA)

- **Garantie Tâcheron** : Prélèvement de 10% sur le tâcheron au titre de la retenue de garantie.
- **Impôts (AIR)** : Retenue à la source de 2.2% au titre de l'Acompte sur l'Impôt sur le Revenu.
- **Sécurité CNPS** : Inscription des ouvriers obligatoire pour accéder au chantier.
- **Météo Pluvieuse** : Coulage strictement interdit sous la pluie sans abri sécurisé.

---

## 6. TRIPLET SÉMANTIQUES (POUR NEO4J / GRAPHRAG)

Pour permettre la modélisation sous forme de graphe relationnel, voici les connexions sémantiques clés :

```
(Devis, EST_DIVISE_EN, Lots)
(Lots, CONTIENT, Ouvrage)
(Ouvrage, S_APPLIQUE_A, Element_IFC)
(Ouvrage, NECESSITE, Ressource)
(Ressource, A_POUR_PRIX, Prix_Mercuriale)
(Dalle_Beton, NECESSITE_DELAI, Sechage_14j)
(Séchage_14j, BLOQUE, Elevation_Etage)
(Ouvrier, GENERE_CHARGE, CNPS_16pct)
```

---

## 7. RECOMMANDATIONS MATÉRIAUX LOCAUX (MIPROMALO)

Afin d'optimiser le budget (jusqu'à 25% d'économie sur le second-œuvre), l'IA doit systématiquement proposer ces alternatives locales dans ses conseils :
*   **Au lieu d'agglos de ciment de 15** : Proposer les Blocs de Terre Comprimée (BTC) stabilisés au ciment. (Résistance : 3.5 MPa, excellent isolant thermique naturel).
*   **Au lieu de tôles ondulées simples** : Proposer les tuiles en micro-béton MIPROMALO ou briques de terre cuite locales pour un meilleur confort acoustique face aux pluies équatoriales.
