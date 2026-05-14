/**
 * SERVICE DE GÉNÉRATION DU CCTP (CAHIER DES CLAUSES TECHNIQUES PARTICULIÈRES)
 * Ce service utilise l'IA pour rédiger les spécifications techniques
 * basées sur les données extraites du fichier IFC.
 */

export const CCTP_PROMPT_TEMPLATE = `
Tu es un ingénieur expert en BTP au Cameroun, spécialisé dans la rédaction de documents contractuels.
Ta mission est de rédiger les clauses techniques (CCTP) pour un projet de construction basé sur les éléments IFC suivants.

DONNÉES IFC :
{{IFC_JSON}}

DIRECTIVES DE RÉDACTION :
1. Style : Formel, technique, impératif (ex: "L'entrepreneur devra...").
2. Normes : Référence aux normes camerounaises (NC) ou françaises (NF) applicables au Cameroun.
3. Détails : Précise les dosages (ciment, eau), les tolérances (aplomb, planéité) et les modes de mise en œuvre.
4. Structure : Divise par articles (100, 200, etc.).

FORMAT DE SORTIE :
Markdown uniquement.
`;

export function generateCctpMock(ifcData: any): string {
  if (!ifcData || !ifcData.elements) return "Aucune donnée IFC disponible pour générer le CCTP.";

  // Simulation de la réponse de l'IA pour le MVP
  return `## Cahier des Clauses Techniques Particulières (CCTP)

### ARTICLE 100 : TERRASSEMENTS ET GROS-OEUVRE
#### 101 — Maçonnerie de parpaings
Les murs identifiés dans la maquette (IfcWall) seront réalisés en blocs de béton manufacturés (parpaings) de 15x20x40. 
- **Résistance** : 25 bars minimum à 28 jours.
- **Mortier de pose** : Sable Sanaga criblé, dosé à 350kg de ciment CPJ 42.5 par m3.
- **Mise en œuvre** : Les joints verticaux et horizontaux auront une épaisseur comprise entre 10 et 15mm. L'aplomb devra être rigoureusement vérifié tous les 3 rangs.

#### 102 — Béton Armé en infrastructure
Pour les dalles (IfcSlab) et poteaux :
- **Dosage** : 350kg/m3 pour les dalles, 400kg/m3 pour les poteaux et poutres.
- **Armatures** : Aciers Haute Adhérence (HA) de nuance FeE400. Le recouvrement minimum des barres sera de 40 fois le diamètre.
- **Vibration** : Le béton devra être obligatoirement vibré à l'aide d'une aiguille vibrante pour garantir la compacité.

### ARTICLE 200 : SECOND-OEUVRE ET FINITIONS
#### 201 — Enduits intérieurs et extérieurs
Tous les murs en parpaings recevront un enduit au mortier de ciment en deux couches :
1. Une couche d'accrochage (gobetis) richement dosée.
2. Une couche de finition (corps d'enduit) dressée à la règle et talochée.

#### 202 — Menuiseries Aluminium
Les ouvertures (IfcWindow/IfcDoor) seront en aluminium de type "Noir de Luxe" avec profilés à rupture de pont thermique. Vitrage clair de 6mm minimum.

---
*Note : Ce document est généré par l'Intelligence Artificielle Archi-Cameroun AI sur la base de la maquette numérique fournie.*`;
}
