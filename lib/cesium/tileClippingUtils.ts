/**
 * Utilitaire de découpe dynamique de tuiles 3D (ClippingPolygon / ClippingPolygonCollection)
 * et de Calage Altimétrique MSL vs Ellipsoïde basé sur la documentation CesiumJS 2026.
 * Permet d'isoler l'emprise au sol (footprint) d'une maquette BIM et d'évider le terrain/bâtiments réels de Google Maps.
 */

export interface LatLngCoordinate {
  longitude: number;
  latitude: number;
}

/**
 * Calcule l'ajustement altimétrique déterministe entre le Niveau Moyen de la Mer (MSL) du BIM 
 * et la hauteur ellipsoïdale WGS84 de CesiumJS / Google 3D Tiles.
 */
export function calculateVerticalDatumOffset(mslHeight: number, geoidUndulationMeters: number = 24.5): number {
  // Hauteur Ellipsoïdale = Hauteur Orthométrique (MSL) + Ondulation du Géoïde (N)
  return mslHeight + geoidUndulationMeters;
}

/**
 * Construit un objet ClippingPolygonCollection pour CesiumJS.
 * @param Cesium Instance du SDK CesiumJS global
 * @param coordinates Liste des coordonnées (lon, lat) délimitant le contour du projet
 * @param inverse Logique d'inversion (false = faire un trou dans le monde pour le BIM)
 */
export function createBimClippingCollection(
  Cesium: any,
  coordinates: LatLngCoordinate[],
  inverse: boolean = false
) {
  if (!coordinates || coordinates.length < 3) {
    console.warn("Un ClippingPolygon nécessite au moins 3 coordonnées géographiques.");
    return null;
  }

  const degreesArray: number[] = [];
  coordinates.forEach((coord) => {
    degreesArray.push(coord.longitude, coord.latitude);
  });

  const cartesianPositions = Cesium.Cartesian3.fromDegreesArray(degreesArray);

  const bimPolygon = new Cesium.ClippingPolygon({
    positions: cartesianPositions,
  });

  const collection = new Cesium.ClippingPolygonCollection({
    polygons: [bimPolygon],
    enabled: true,
    inverse: inverse, // false = masque l'intérieur (fait un trou net)
  });

  return collection;
}
