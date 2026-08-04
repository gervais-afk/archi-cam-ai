/**
 * useGeolocation.ts — Hook de géolocalisation souverain (Archi Cam AI)
 *
 * Fonctionnement :
 *  1. navigator.geolocation.getCurrentPosition() → lat/lon (Web API native, 0 clé API)
 *  2. Nominatim (OpenStreetMap) → reverse geocoding → ville/pays (0 clé API, gratuit)
 *  3. Mapping ville → région Cameroun → zone climatique BTP
 *
 * Aucune clé API requise. Aucune donnée envoyée à Google.
 */

import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ZoneClimatique =
  | "EQUATORIAL_COTIER"      // Douala, Limbe, Kribi — Chaud/humide toute l'année
  | "EQUATORIAL_INTERIEUR"   // Yaoundé, Ebolowa — 2 saisons sèches
  | "TROPICAL_ALTITUDE"      // Bafoussam, Dschang — Frais, pluvieux
  | "TROPICAL_SAHELIEN"      // Garoua, Ngaoundéré — Sec et chaud
  | "SAHELIEN_ARIDE"         // Maroua, Kousseri — Très sec, harmattan
  | "INCONNUE";              // Hors Cameroun ou position non détectée

export type RegionCameroun =
  | "LITTORAL" | "SUD_OUEST" | "CENTRE" | "SUD"
  | "OUEST" | "NORD_OUEST" | "EST"
  | "NORD" | "ADAMAOUA" | "EXTREME_NORD"
  | "INCONNUE";

export interface GeoLocation {
  ville: string;
  region: RegionCameroun;
  zoneClimatique: ZoneClimatique;
  latitude: number;
  longitude: number;
  pays: string;
  loading: boolean;
  error: string | null;
  detected: boolean;
}

// ─── Table de mapping Villes → Région → Zone Climatique ──────────────────────

const VILLE_MAP: Record<string, { region: RegionCameroun; zone: ZoneClimatique }> = {
  // LITTORAL
  douala:       { region: "LITTORAL",      zone: "EQUATORIAL_COTIER" },
  edéa:         { region: "LITTORAL",      zone: "EQUATORIAL_COTIER" },
  edea:         { region: "LITTORAL",      zone: "EQUATORIAL_COTIER" },
  nkongsamba:   { region: "LITTORAL",      zone: "EQUATORIAL_COTIER" },
  // SUD_OUEST
  limbe:        { region: "SUD_OUEST",     zone: "EQUATORIAL_COTIER" },
  buea:         { region: "SUD_OUEST",     zone: "EQUATORIAL_COTIER" },
  kumba:        { region: "SUD_OUEST",     zone: "EQUATORIAL_COTIER" },
  // CENTRE
  yaoundé:      { region: "CENTRE",        zone: "EQUATORIAL_INTERIEUR" },
  yaounde:      { region: "CENTRE",        zone: "EQUATORIAL_INTERIEUR" },
  mbalmayo:     { region: "CENTRE",        zone: "EQUATORIAL_INTERIEUR" },
  obala:        { region: "CENTRE",        zone: "EQUATORIAL_INTERIEUR" },
  // SUD
  ebolowa:      { region: "SUD",           zone: "EQUATORIAL_INTERIEUR" },
  kribi:        { region: "SUD",           zone: "EQUATORIAL_COTIER" },
  // OUEST
  bafoussam:    { region: "OUEST",         zone: "TROPICAL_ALTITUDE" },
  bangangté:    { region: "OUEST",         zone: "TROPICAL_ALTITUDE" },
  mbouda:       { region: "OUEST",         zone: "TROPICAL_ALTITUDE" },
  // NORD_OUEST
  bamenda:      { region: "NORD_OUEST",    zone: "TROPICAL_ALTITUDE" },
  kumbo:        { region: "NORD_OUEST",    zone: "TROPICAL_ALTITUDE" },
  // EST
  bertoua:      { region: "EST",           zone: "EQUATORIAL_INTERIEUR" },
  batouri:      { region: "EST",           zone: "EQUATORIAL_INTERIEUR" },
  // ADAMAOUA
  ngaoundéré:   { region: "ADAMAOUA",      zone: "TROPICAL_SAHELIEN" },
  ngaoundere:   { region: "ADAMAOUA",      zone: "TROPICAL_SAHELIEN" },
  meiganga:     { region: "ADAMAOUA",      zone: "TROPICAL_SAHELIEN" },
  // NORD
  garoua:       { region: "NORD",          zone: "TROPICAL_SAHELIEN" },
  ngong:        { region: "NORD",          zone: "TROPICAL_SAHELIEN" },
  guider:       { region: "NORD",          zone: "TROPICAL_SAHELIEN" },
  // EXTREME_NORD
  maroua:       { region: "EXTREME_NORD",  zone: "SAHELIEN_ARIDE" },
  kousseri:     { region: "EXTREME_NORD",  zone: "SAHELIEN_ARIDE" },
  mora:         { region: "EXTREME_NORD",  zone: "SAHELIEN_ARIDE" },
  kaélé:        { region: "EXTREME_NORD",  zone: "SAHELIEN_ARIDE" },
  kaele:        { region: "EXTREME_NORD",  zone: "SAHELIEN_ARIDE" },
};

// ─── Mapping Zone → Coefficient de majoration BTP ────────────────────────────

export const ZONE_TO_BTP_COEFF: Record<ZoneClimatique, { label: string; coeff: number; note: string }> = {
  EQUATORIAL_COTIER:    { label: "Équatorial Côtier",    coeff: 1.15, note: "Humidité élevée → béton hydrofuge, acier galvanisé +15%" },
  EQUATORIAL_INTERIEUR: { label: "Équatorial Intérieur", coeff: 1.00, note: "Zone de référence standard" },
  TROPICAL_ALTITUDE:    { label: "Tropical d'Altitude",  coeff: 0.95, note: "Température fraîche → moins d'isolation thermique" },
  TROPICAL_SAHELIEN:    { label: "Tropical Sahélien",    coeff: 1.08, note: "Saison sèche longue → isolation thermique renforcée" },
  SAHELIEN_ARIDE:       { label: "Sahélien Aride",       coeff: 1.20, note: "Harmattan + chaleur extrême → matériaux spéciaux +20%" },
  INCONNUE:             { label: "Zone inconnue",        coeff: 1.00, note: "Utiliser le coefficient standard" },
};

// ─── Fonction Nominatim (reverse geocoding, sans clé API) ────────────────────

async function reverseGeocode(lat: number, lon: number): Promise<{ ville: string; pays: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ArchiCamAI/1.0 (koagervais85@gmail.com)" },
  });
  if (!res.ok) throw new Error("Nominatim indisponible");
  const data = await res.json();
  const addr = data.address || {};
  const ville =
    addr.city || addr.town || addr.village || addr.county || addr.state || "Inconnue";
  const pays = addr.country_code?.toUpperCase() || "??";
  return { ville, pays };
}

// ─── Mapping ville détectée → Région + Zone Climatique ───────────────────────

export function mapVilleToZone(ville: string): { region: RegionCameroun; zone: ZoneClimatique } {
  const key = ville.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Recherche exacte
  for (const [name, val] of Object.entries(VILLE_MAP)) {
    const normalizedName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (key.includes(normalizedName) || normalizedName.includes(key)) {
      return val;
    }
  }
  return { region: "INCONNUE", zone: "INCONNUE" };
}

// ─── Hook Principal ───────────────────────────────────────────────────────────

export function useGeolocation(): GeoLocation & { refresh: () => void } {
  const [geo, setGeo] = useState<GeoLocation>({
    ville: "",
    region: "INCONNUE",
    zoneClimatique: "INCONNUE",
    latitude: 0,
    longitude: 0,
    pays: "",
    loading: false,
    error: null,
    detected: false,
  });

  const detect = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setGeo(g => ({ ...g, error: "Géolocalisation non supportée par ce navigateur.", loading: false }));
      return;
    }

    setGeo(g => ({ ...g, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const { ville, pays } = await reverseGeocode(latitude, longitude);
          const { region, zone } = pays === "CM" ? mapVilleToZone(ville) : { region: "INCONNUE" as RegionCameroun, zone: "INCONNUE" as ZoneClimatique };

          setGeo({
            ville,
            region,
            zoneClimatique: zone,
            latitude,
            longitude,
            pays,
            loading: false,
            error: null,
            detected: true,
          });
        } catch {
          setGeo(g => ({
            ...g,
            latitude,
            longitude,
            loading: false,
            error: "Reverse geocoding échoué. Vérifiez votre connexion.",
            detected: false,
          }));
        }
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Permission refusée. Autorisez la géolocalisation dans votre navigateur.",
          2: "Position indisponible (GPS ou réseau).",
          3: "Délai dépassé. Réessayez.",
        };
        setGeo(g => ({
          ...g,
          loading: false,
          error: messages[err.code] || "Erreur de géolocalisation inconnue.",
          detected: false,
        }));
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
    );
  }, []);

  useEffect(() => {
    detect();
  }, [detect]);

  return { ...geo, refresh: detect };
}
