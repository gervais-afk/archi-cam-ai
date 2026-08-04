"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Info } from "lucide-react";
import { createBimClippingCollection } from "@/lib/cesium/tileClippingUtils";

interface CesiumBimViewerProps {
  cesiumIonToken?: string;
  targetBoundingBox?: { min_x: number; min_y: number; min_z: number; max_x: number; max_y: number; max_z: number };
  highlightColor?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  city?: string;
}

export const CesiumBimViewer: React.FC<CesiumBimViewerProps> = ({
  cesiumIonToken,
  targetBoundingBox,
  highlightColor = "#c5a059", // Couleur ocre or par défaut
  latitude,
  longitude,
  elevation,
  city
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [Cesium, setCesium] = useState<any>(null);

  // Déterminer les coordonnées finales (choix utilisateur ou fallback Yaoundé)
  const lat = latitude !== undefined ? latitude : 3.8480;
  const lng = longitude !== undefined ? longitude : 11.5021;
  const elev = elevation !== undefined ? elevation : 730;

  // 1. Charger dynamiquement CesiumJS depuis le CDN
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Charger widgets.css
    const cssId = "cesium-cdn-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Widgets/widgets.css";
      document.head.appendChild(link);
    }

    // Charger Cesium.js
    const scriptId = "cesium-cdn-js";
    const initCesium = () => {
      const cesiumObj = (window as any).Cesium;
      if (cesiumObj) {
        setCesium(cesiumObj);
      }
    };

    if (!(window as any).Cesium) {
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Cesium.js";
        script.async = true;
        script.onload = initCesium;
        document.body.appendChild(script);
      }
    } else {
      initCesium();
    }
  }, []);

  // 2. Initialiser le globe 3D Cesium
  useEffect(() => {
    if (!Cesium || !containerRef.current || viewerRef.current) return;

    const token = cesiumIonToken || process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
    if (token && token !== "your_cesium_ion_token_here") {
      Cesium.Ion.defaultAccessToken = token;
    }

    // Initialisation du viewer Cesium sans fioritures (pas d'animation, timeline, etc.)
    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      infoBox: false,
      selectionIndicator: false,
      baseLayerPicker: true,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      attributionControl: false
    });

    viewerRef.current = viewer;
    setLoading(false);

    // Activer le relief terrestre en 3D
    Cesium.createWorldTerrainAsync()
      .then((terrainProvider: any) => {
        if (viewerRef.current) {
          viewerRef.current.terrainProvider = terrainProvider;
        }
      })
      .catch((err: any) => console.warn("[Cesium] Échec chargement du relief mondial :", err));

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [Cesium, cesiumIonToken]);

  // 3. Mettre à jour la caméra et ajouter l'emprise 3D de la maquette
  useEffect(() => {
    if (!Cesium || !viewerRef.current) return;

    const viewer = viewerRef.current;
    
    // Supprimer les anciennes entités
    viewer.entities.removeAll();

    // Position géographique de la maquette
    const position = Cesium.Cartesian3.fromDegrees(lng, lat, elev);

    // Ajustement de la hauteur du parallélépipède 3D (milieu de hauteur de 15m)
    const boxPosition = Cesium.Cartesian3.fromDegrees(lng, lat, elev + 7.5);

    // Ajouter la boîte 3D de la maquette BIM
    viewer.entities.add({
      position: boxPosition,
      box: {
        dimensions: new Cesium.Cartesian3(25.0, 25.0, 15.0), // Enveloppe 25m x 25m x 15m
        material: Cesium.Color.fromCssColorString(highlightColor).withAlpha(0.35),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString(highlightColor),
        outlineWidth: 2.0
      },
      label: {
        text: `Maquette BIM - ${city || "Yaoundé"}\nAltitude : ${elev}m`,
        font: "12px monospace",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -35)
      }
    });

    // Appliquer la découpe (hollowing out) de terrain pour intégrer les fondations
    const clippingCoords = [
      { longitude: lng - 0.00015, latitude: lat - 0.00015 },
      { longitude: lng + 0.00015, latitude: lat - 0.00015 },
      { longitude: lng + 0.00015, latitude: lat + 0.00015 },
      { longitude: lng - 0.00015, latitude: lat + 0.00015 }
    ];

    const collection = createBimClippingCollection(Cesium, clippingCoords);
    if (collection) {
      viewer.scene.globe.clippingPolygons = collection;
    }

    // Zoomer proprement vers les coordonnées
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat - 0.0018, elev + 180), // Reculer un peu au Sud et monter en Z
      orientation: {
        heading: Cesium.Math.toRadians(0.0),   // Regarder vers le Nord
        pitch: Cesium.Math.toRadians(-45.0),  // Angle de vue de dessus inclinée
        roll: 0.0
      },
      duration: 3.0 // Animation de vol de 3 secondes
    });
  }, [Cesium, lat, lng, elev, city, highlightColor]);

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-[999]">
          <Loader2 className="w-8 h-8 text-wood-ocre animate-spin mb-2" />
          <span className="text-slate-400 text-xs font-mono">Chargement du globe 3D Cesium...</span>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-cyan-400 z-20">
        🌐 CesiumJS 3D Tiles Viewer • Insertion Urbaine
      </div>
      <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-lg border border-slate-700 text-[10px] text-slate-300 font-mono space-y-1.5 z-20 max-w-xs">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
          <Info className="w-3.5 h-3.5" />
          <span>Contrôles de la scène :</span>
        </div>
        <p>• Clic gauche + glisser : Pivoter autour du globe</p>
        <p>• Clic droit + glisser / Molette : Zoomer</p>
        <p>• Ctrl + Clic gauche : Incliner la vue</p>
      </div>
    </div>
  );
};

export default CesiumBimViewer;
