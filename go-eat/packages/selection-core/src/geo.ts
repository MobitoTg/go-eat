import type { LatLng } from './types.js';

/**
 * Great-circle distance in metres (haversine).
 *
 * Pure and IO-free like everything else here. Accuracy is far beyond what a walking-distance
 * suggestion needs — the error against a proper geodesic is well under a metre at these ranges,
 * and the search radius is 1500 m.
 */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371008.8; // IUGG mean Earth radius.
  const toRad = (d: number): number => (d * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
