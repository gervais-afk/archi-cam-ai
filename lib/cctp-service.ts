/**
 * SERVICE DE GÉNÉRATION DU CCTP (CAHIER DES CLAUSES TECHNIQUES PARTICULIÈRES)
 * Génération dynamique par IA (Gemini 2.5 Flash) des clauses contractuelles
 * basées sur les métrés réels extraits du fichier IFC ou du devis.
 */

export async function generateCctp(ifcData: any, metadata?: { ville?: string; standing?: string }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!ifcData) {
    return "Aucune donnée géométrique ou tarifaire disponible pour rédiger le CCTP.";
  }

  const prompt = `Tu es un Ingénieur Principal BTP spécialisé dans la rédaction de CCTP (Cahier des Clauses Techniques Particulières) pour le marché du bâtiment au Cameroun.

À partir des métadonnées du projet ci-dessous, rédige un document CCTP complet, rigoureux et contractuellement exécutoire.

DONNÉES DU PROJET :
- Ville : ${metadata?.ville || "Yaoundé"}
- Standing : ${metadata?.standing || "moyen"}
- Données IFC / Métrés : ${JSON.stringify(ifcData, null, 2)}

STRUCTURE DU CCTP EN MARKDOWN :
1. ARTICLE 100 : TERRASSEMENTS & GROS-ŒUVRE (Dosages ciment CPJ 42.5, sables de Sanaga, aciers HA FeE400, coffrages et vibration).
2. ARTICLE 200 : SECOND-ŒUVRE & ENVELOPPE (Maçonneries en parpaings vibrés ou BTC MIPROMALO, étanchéité, enduits).
3. ARTICLE 300 : MENUISERIES & FLUIDES (Aluminium, vitrages, installations électriques et plomberie).
4. ARTICLE 400 : RECEPTIONS & CONTRÔLE QUALITE (Règles d'essais, tolérances d'aplomb, normes camerounaises NC / BAEL 91).

Style : Impératif, formel ("L'entrepreneur devra...").
Rédige le CCTP complet sous format Markdown.`;

  if (!apiKey) {
    return generateFallbackCctp(ifcData);
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!res.ok) throw new Error(`Gemini status ${res.status}`);

    const json = await res.json();
    const cctpText = json.candidates?.[0]?.content?.parts?.[0]?.text;

    if (cctpText && cctpText.length > 50) {
      return cctpText;
    }
  } catch (err: any) {
    console.warn("[CCTP Service] Erreur génération IA, utilisation du fallback :", err.message);
  }

  return generateFallbackCctp(ifcData);
}

function generateFallbackCctp(ifcData: any): string {
  return `## Cahier des Clauses Techniques Particulières (CCTP) — SCoT BTP Cameroun

### ARTICLE 100 : TERRASSEMENTS ET GROS-OEUVRE
#### 101 — Maçonnerie de parpaings
Les murs identifiés dans la maquette seront réalisés en blocs de béton manufacturés (parpaings) de 15x20x40. 
- **Résistance** : 25 bars minimum à 28 jours.
- **Mortier de pose** : Sable Sanaga criblé, dosé à 350kg de ciment CPJ 42.5 par m³.

#### 102 — Béton Armé en infrastructure
Pour les dalles et poteaux :
- **Dosage** : 350kg/m³ pour les dalles, 400kg/m³ pour les poteaux et poutres.
- **Armatures** : Aciers Haute Adhérence (HA) de nuance FeE400 (BAEL 91).

---
*Généré par Archi Cam AI Engine v2.5*`;
}

// Rétrocompatibilité
export const generateCctpMock = generateCctp;
