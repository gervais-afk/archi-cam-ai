/**
 * MOTEUR DE DÉTECTION DE CONFLITS BIM (CLASH DETECTION) — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Analyse les objets géométriques 3D et détecte les collisions physiques (Hard)
 * et les non-respects de distances de sécurité (Soft) selon la norme ISO 19650.
 * ════════════════════════════════════════════════════════════════════════════
 */

export interface BoundingBox3D {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface BIMElement3D {
  id: string;
  type: "COLUMN" | "BEAM" | "WALL" | "SLAB" | "DUCT" | "PIPE" | "DOOR";
  boundingBox: BoundingBox3D;
}

export interface ClashResult {
  type: "HARD" | "SOFT";
  severity: "CRITICAL" | "WARNING" | "INFO";
  elementA: string;
  elementB: string;
  location: { x: number; y: number; z: number };
  description: string;
  suggestedFix: string;
}

export class ClashDetectionEngine {
  private checkOverlap(boxA: BoundingBox3D, boxB: BoundingBox3D, margin: number = 0): boolean {
    return (
      boxA.minX - margin <= boxB.maxX &&
      boxA.maxX + margin >= boxB.minX &&
      boxA.minY - margin <= boxB.maxY &&
      boxA.maxY + margin >= boxB.minY &&
      boxA.minZ - margin <= boxB.maxZ &&
      boxA.maxZ + margin >= boxB.minZ
    );
  }

  public detectClashes(elements: BIMElement3D[]): ClashResult[] {
    const clashes: ClashResult[] = [];

    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const elA = elements[i];
        const elB = elements[j];

        // Règle 1 : Collision directe entre Porte et Poteau
        if (
          (elA.type === "DOOR" && elB.type === "COLUMN") ||
          (elA.type === "COLUMN" && elB.type === "DOOR")
        ) {
          if (this.checkOverlap(elA.boundingBox, elB.boundingBox, 0)) {
            clashes.push({
              type: "HARD",
              severity: "CRITICAL",
              elementA: elA.id,
              elementB: elB.id,
              location: {
                x: (elA.boundingBox.minX + elA.boundingBox.maxX) / 2,
                y: (elA.boundingBox.minY + elA.boundingBox.maxY) / 2,
                z: (elA.boundingBox.minZ + elA.boundingBox.maxZ) / 2,
              },
              description: `Collision physique entre la porte '${elA.id}' et le poteau structurel '${elB.id}'.`,
              suggestedFix: "Décaler la baie de porte de 30cm pour éviter l'armature du poteau.",
            });
          }
        }

        // Règle 2 : Distances de sécurité (Soft Clash) entre Gaine/Plomberie et Poutres
        if (
          (elA.type === "DUCT" && elB.type === "BEAM") ||
          (elA.type === "PIPE" && elB.type === "BEAM")
        ) {
          if (this.checkOverlap(elA.boundingBox, elB.boundingBox, 0.1)) {
            clashes.push({
              type: "SOFT",
              severity: "WARNING",
              elementA: elA.id,
              elementB: elB.id,
              location: {
                x: (elA.boundingBox.minX + elA.boundingBox.maxX) / 2,
                y: (elA.boundingBox.minY + elA.boundingBox.maxY) / 2,
                z: (elA.boundingBox.minZ + elA.boundingBox.maxZ) / 2,
              },
              description: `Espace d'enrobage insuffisant (< 10cm) entre la canalisation '${elA.id}' et la poutre '${elB.id}'.`,
              suggestedFix: "Abaisser le faux-plafond de 15cm ou dérouter la gaine sous retombée de poutre.",
            });
          }
        }
      }
    }

    return clashes;
  }
}
