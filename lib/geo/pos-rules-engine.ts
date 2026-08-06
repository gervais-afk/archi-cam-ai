export interface LatLng {
  lat: number;
  lng: number;
}

export interface POSRules {
  zone: string;
  city: string;
  quartier: string;
  cos: number; // Coefficient d'Occupation du Sol
  shon: number; // Surface Hors Œuvre Nette max (m2)
  maxHeight: number; // Hauteur max (m)
  maxFloors: number; // Nombre d'étages max
  setbacks: {
    street: number; // Recul route (m)
    side: number; // Recul latéral (m)
    rear: number; // Recul arrière (m)
  };
  restrictions: string[];
}

export class POSRulesEngine {
  private rulesDatabase: Map<string, POSRules>;

  constructor() {
    this.rulesDatabase = this.loadPOSDatabase();
  }

  async getRulesForLocation(coords: LatLng): Promise<POSRules> {
    // 1. Proximité locale pour déterminer le quartier (fallback robuste)
    const matchedZoneKey = this.getZoneByProximity(coords);
    const rules = this.rulesDatabase.get(matchedZoneKey);

    if (rules) {
      return rules;
    }

    // 2. Par défaut : Bastos
    return this.rulesDatabase.get("YDE_BASTOS")!;
  }

  private getZoneByProximity(coords: LatLng): string {
    const zones = [
      { key: "YDE_BASTOS", lat: 3.89, lng: 11.51 }, // Yaoundé Bastos
      { key: "DLA_AKWA", lat: 4.05, lng: 9.70 },    // Douala Akwa
      { key: "KRB_LITTORAL", lat: 2.94, lng: 9.91 } // Kribi Littoral
    ];

    let closestZone = "YDE_BASTOS";
    let minDistance = Infinity;

    for (const zone of zones) {
      const dist = Math.sqrt(Math.pow(coords.lat - zone.lat, 2) + Math.pow(coords.lng - zone.lng, 2));
      if (dist < minDistance && dist < 0.1) { // 0.1 degree limit (~11km)
        minDistance = dist;
        closestZone = zone.key;
      }
    }

    return closestZone;
  }

  private loadPOSDatabase(): Map<string, POSRules> {
    const db = new Map<string, POSRules>();

    // Yaoundé - Bastos (Zone résidentielle haut standing)
    db.set("YDE_BASTOS", {
      zone: "ZR1",
      city: "Yaoundé",
      quartier: "Bastos",
      cos: 0.4,
      shon: 1000,
      maxHeight: 12,
      maxFloors: 2, // R+2 max
      setbacks: {
        street: 5.0,
        side: 3.0,
        rear: 4.0
      },
      restrictions: ["Façade harmonisée obligatoire", "Arbres à conserver"]
    });

    // Douala - Akwa (Zone commerciale)
    db.set("DLA_AKWA", {
      zone: "ZC",
      city: "Douala",
      quartier: "Akwa",
      cos: 0.6,
      shon: 2500,
      maxHeight: 20,
      maxFloors: 5, // R+5 max
      setbacks: {
        street: 3.0,
        side: 2.0,
        rear: 3.0
      },
      restrictions: ["Parking obligatoire 1 place/50m²"]
    });

    // Kribi - Bord de mer (Zone littorale)
    db.set("KRB_LITTORAL", {
      zone: "ZL",
      city: "Kribi",
      quartier: "Bord de mer",
      cos: 0.3,
      shon: 600,
      maxHeight: 9,
      maxFloors: 2,
      setbacks: {
        street: 10.0,
        side: 5.0,
        rear: 15.0 // 15m de la mer (loi littorale)
      },
      restrictions: [
        "Zone inondable saison des pluies",
        "Pilotis obligatoires",
        "Matériaux résistants corrosion saline"
      ]
    });

    return db;
  }

  validateProject(
    project: {
      parcelArea: number;
      buildingFootprint: number;
      totalFloorArea: number;
      height: number;
      floors: number;
      setbacks: { street: number; side: number; rear: number };
    },
    rules: POSRules
  ) {
    const violations: Array<{ rule: string; current: number | string; required: number | string; severity: "ERROR" | "WARNING" }> = [];

    // Vérif COS
    const actualCOS = project.buildingFootprint / project.parcelArea;
    if (actualCOS > rules.cos) {
      violations.push({
        rule: "Coefficient d'Occupation du Sol (COS)",
        current: `${Math.round(actualCOS * 100)}%`,
        required: `${Math.round(rules.cos * 100)}%`,
        severity: "ERROR"
      });
    }

    // Vérif SHON
    if (project.totalFloorArea > rules.shon) {
      violations.push({
        rule: "Surface Hors Œuvre Nette (SHON)",
        current: `${project.totalFloorArea}m²`,
        required: `${rules.shon}m²`,
        severity: "ERROR"
      });
    }

    // Vérif Hauteur
    if (project.height > rules.maxHeight) {
      violations.push({
        rule: "Hauteur maximale",
        current: `${project.height}m`,
        required: `${rules.maxHeight}m`,
        severity: "ERROR"
      });
    }

    // Vérif Étages
    if (project.floors > rules.maxFloors) {
      violations.push({
        rule: "Nombre d'étages maximum",
        current: `R+${project.floors}`,
        required: `R+${rules.maxFloors}`,
        severity: "ERROR"
      });
    }

    // Vérif Reculs
    if (project.setbacks.street < rules.setbacks.street) {
      violations.push({
        rule: "Recul par rapport à la route",
        current: `${project.setbacks.street}m`,
        required: `${rules.setbacks.street}m`,
        severity: "ERROR"
      });
    }

    return {
      isCompliant: violations.length === 0,
      violations
    };
  }
}
