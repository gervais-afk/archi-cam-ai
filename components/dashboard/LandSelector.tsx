"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Info, Loader2 } from "lucide-react";

interface LandSelection {
  latitude: number;
  longitude: number;
  elevation: number;
  city: string;
}

interface LandSelectorProps {
  onSelect: (selection: LandSelection) => void;
  initialSelection?: Partial<LandSelection>;
}

// Villes clés du Cameroun avec coordonnées et altitudes par défaut (fallbacks)
const CAMEROON_CITIES = [
  { name: "Yaoundé", lat: 3.8480, lng: 11.5021, defaultElev: 730 },
  { name: "Douala", lat: 4.0511, lng: 9.7679, defaultElev: 13 },
  { name: "Kribi (Zone Côtière)", lat: 2.9506, lng: 9.9079, defaultElev: 10 },
  { name: "Bafoussam (Ouest)", lat: 5.4777, lng: 10.4176, defaultElev: 1400 },
  { name: "Garoua (Nord)", lat: 9.3089, lng: 13.3982, defaultElev: 249 }
];

export default function LandSelector({ onSelect, initialSelection }: LandSelectorProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [L, setL] = useState<any>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    initialSelection?.latitude && initialSelection?.longitude 
      ? { lat: initialSelection.latitude, lng: initialSelection.longitude }
      : null
  );
  const [elevation, setElevation] = useState<number | null>(initialSelection?.elevation || null);
  const [detectedCity, setDetectedCity] = useState<string>(initialSelection?.city || "");

  // 1. Charger Leaflet depuis le CDN (JS et CSS)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Charger le CSS Leaflet
    const linkId = "leaflet-cdn-css";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Charger le JS Leaflet
    const scriptId = "leaflet-cdn-js";
    const initLeaflet = () => {
      const leaflet = (window as any).L;
      if (leaflet) {
        setL(leaflet);
      }
    };

    if (!(window as any).L) {
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = initLeaflet;
        document.body.appendChild(script);
      }
    } else {
      initLeaflet();
    }
  }, []);

  // 2. Initialiser la carte Leaflet une fois le SDK chargé
  useEffect(() => {
    if (!L || !mapContainerRef.current || mapInstanceRef.current) return;

    // Coordonnées de départ : Cameroun (Centre) ou position initiale
    const startLat = selectedCoords?.lat || 5.5;
    const startLng = selectedCoords?.lng || 12.0;
    const startZoom = selectedCoords ? 12 : 6;

    // Création de la carte
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true
    }).setView([startLat, startLng], startZoom);

    // Ajout des tuiles OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Icône personnalisée pour le marqueur (pour éviter le bug d'affichage des chemins d'images Leaflet par défaut)
    const customIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Ajouter le marqueur si coordonnées initiales
    if (selectedCoords) {
      markerInstanceRef.current = L.marker([selectedCoords.lat, selectedCoords.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup("Terrain Sélectionné")
        .openPopup();
    }

    // Gestion du clic pour placer un marqueur
    map.on("click", async (e: any) => {
      const { lat, lng } = e.latlng;
      handleLocationSelect(lat, lng, customIcon);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [L]);

  // Fonction pour gérer le clic et appeler l'API d'élévation
  const handleLocationSelect = async (lat: number, lng: number, iconObj?: any) => {
    if (!mapInstanceRef.current || !L) return;

    const leafletIcon = iconObj || L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      shadowSize: [41, 41]
    });

    // Déplacer/Créer le marqueur
    if (markerInstanceRef.current) {
      markerInstanceRef.current.setLatLng([lat, lng]);
    } else {
      markerInstanceRef.current = L.marker([lat, lng], { icon: leafletIcon })
        .addTo(mapInstanceRef.current);
    }

    setSelectedCoords({ lat, lng });
    setLoading(true);

    // Détecter la ville camerounaise la plus proche pour les fallbacks réglementaires
    let nearestCity = "Yaoundé";
    let minDistance = Infinity;
    let fallbackElev = 730;

    CAMEROON_CITIES.forEach((city) => {
      const d = Math.sqrt(Math.pow(city.lat - lat, 2) + Math.pow(city.lng - lng, 2));
      if (d < minDistance) {
        minDistance = d;
        nearestCity = city.name;
        fallbackElev = city.defaultElev;
      }
    });

    setDetectedCity(nearestCity);

    // Récupérer l'altitude réelle via l'API
    let finalElevation = fallbackElev;
    const apiUrl = process.env.NEXT_PUBLIC_ELEVATION_API_URL || "https://api.open-elevation.com/api/v1/lookup";

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locations: [{ latitude: lat, longitude: lng }]
        })
      });

      if (response.ok) {
        const result = await response.json();
        const elev = result.results?.[0]?.elevation;
        if (typeof elev === "number") {
          finalElevation = Math.round(elev);
        }
      }
    } catch (err) {
      console.warn("[LandSelector] Échec de récupération de l'altitude, utilisation du fallback:", err);
    } finally {
      setElevation(finalElevation);
      setLoading(false);
      
      // Notifier le parent
      onSelect({
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        elevation: finalElevation,
        city: nearestCity
      });

      // Ouvrir le popup d'information
      markerInstanceRef.current
        .bindPopup(`<b>Terrain posé</b><br/>Commune : ${nearestCity}<br/>Altitude : ${finalElevation}m`)
        .openPopup();
    }
  };

  // Zoomer rapidement sur une ville prédéfinie
  const handleCityQuickSelect = (city: typeof CAMEROON_CITIES[0]) => {
    if (!mapInstanceRef.current || !L) return;
    mapInstanceRef.current.setView([city.lat, city.lng], 13);
    const customIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      shadowSize: [41, 41]
    });
    handleLocationSelect(city.lat, city.lng, customIcon);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Navigation className="w-4 h-4 text-amber-500 animate-pulse" />
          Zoom rapide par région :
        </span>
        {CAMEROON_CITIES.map((city) => (
          <button
            key={city.name}
            type="button"
            onClick={() => handleCityQuickSelect(city)}
            className="px-3 py-1 text-xs rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium transition cursor-pointer"
          >
            {city.name}
          </button>
        ))}
      </div>

      <div className="relative w-full h-[380px] rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner">
        {!L && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-[999]">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-2" />
            <span className="text-slate-400 text-xs font-mono">Chargement de la carte interactive...</span>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full z-10" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Latitude</span>
          <span className="text-white font-mono text-sm font-bold mt-1">
            {selectedCoords ? selectedCoords.lat.toFixed(6) : "Non définie"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Longitude</span>
          <span className="text-white font-mono text-sm font-bold mt-1">
            {selectedCoords ? selectedCoords.lng.toFixed(6) : "Non définie"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Altitude (Z)</span>
          <span className="text-cyan-400 font-mono text-sm font-black mt-1 flex items-center gap-1">
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : elevation !== null ? (
              `${elevation} m`
            ) : (
              "Non définie"
            )}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Réglementation Commune</span>
          <span className="text-amber-500 font-mono text-sm font-bold mt-1">
            {detectedCity ? `${detectedCity}` : "Non identifiée"}
          </span>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed flex items-start gap-2.5">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          <b>Notice technique</b> : Sélectionner un terrain côtier comme <i>Kribi</i> forcera l'agent Structure à durdir les exigences sur les fondations (air salin corrosif, enrobage des armatures acier fixé à 50mm min).
        </span>
      </div>
    </div>
  );
}
