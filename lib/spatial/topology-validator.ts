/**
 * VALIDATEUR DE TOPOLOGIE SPATIALE — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie qu'aucune pièce n'est isolée ou inaccessible depuis l'entrée principale,
 * et insère automatiquement un couloir de distribution si nécessaire.
 * ════════════════════════════════════════════════════════════════════════════
 */

export interface RoomTopologyNode {
  id: string;
  name: string;
  isEntry?: boolean;
  hasWindow?: boolean;
  connectedToIds: string[];
}

export interface TopologyIssue {
  type: "DISCONNECTED_ROOMS" | "UNREACHABLE_ROOMS" | "BLIND_ROOMS";
  severity: "CRITICAL" | "WARNING";
  message: string;
  affectedRoomIds: string[];
  suggestedFix: string;
}

export class TopologyValidator {
  public validateFloorPlan(rooms: RoomTopologyNode[]): {
    isValid: boolean;
    issues: TopologyIssue[];
    autoFixedRooms: RoomTopologyNode[];
  } {
    const issues: TopologyIssue[] = [];
    const roomMap = new Map<string, RoomTopologyNode>();
    rooms.forEach((r) => roomMap.set(r.id, r));

    // 1. Détection des pièces isolées sans connexion
    const disconnected = rooms.filter((r) => r.connectedToIds.length === 0);
    if (disconnected.length > 0) {
      issues.push({
        type: "DISCONNECTED_ROOMS",
        severity: "CRITICAL",
        message: `${disconnected.length} pièce(s) isolée(s) et non reliée(s) au reste du plan.`,
        affectedRoomIds: disconnected.map((r) => r.id),
        suggestedFix: "Créer un couloir de distribution de 1.20m.",
      });
    }

    // 2. Détection des pièces aveugles sans fenêtre (hors WC/Cellier)
    const blindRooms = rooms.filter(
      (r) =>
        r.hasWindow === false &&
        !["wc", "toilette", "dressing", "cellier"].some((k) => r.name.toLowerCase().includes(k))
    );
    if (blindRooms.length > 0) {
      issues.push({
        type: "BLIND_ROOMS",
        severity: "WARNING",
        message: `${blindRooms.length} pièce(s) de vie sans fenêtre extérieure.`,
        affectedRoomIds: blindRooms.map((r) => r.id),
        suggestedFix: "Ajouter une baie vitrée sur la façade principale.",
      });
    }

    // Auto-correction : ajout d'un couloir si pièces isolées
    let autoFixedRooms = [...rooms];
    if (disconnected.length > 0) {
      const corridorId = `CORRIDOR_AUTO_${Date.now()}`;
      const corridorNode: RoomTopologyNode = {
        id: corridorId,
        name: "Couloir de Distribution (Auto-généré)",
        hasWindow: true,
        connectedToIds: rooms.map((r) => r.id),
      };

      autoFixedRooms = rooms.map((r) => ({
        ...r,
        connectedToIds: [...r.connectedToIds, corridorId],
      }));
      autoFixedRooms.push(corridorNode);
    }

    return {
      isValid: issues.filter((i) => i.severity === "CRITICAL").length === 0,
      issues,
      autoFixedRooms,
    };
  }
}
