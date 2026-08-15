/**
 * Coordinate truncation for logs.
 *
 * Constitution V: "Backend logs MUST truncate coordinates to a coarse grid — enough for aggregate
 * diagnostics, not enough to reconstruct a movement trail."
 *
 * This is the entire reason the product can honestly claim it does not keep location. Logs are
 * where "we don't store your location" quietly becomes false: nobody thinks of a log line as
 * storage, and yet a log of full-precision coordinates keyed by installation IS a movement trail,
 * retained for however long the log retention policy says.
 */

/**
 * 2 decimal places ≈ 1.1 km at the equator.
 *
 * Chosen to be coarser than `searchRadiusMeters` (1500 m), so a logged coordinate cannot even
 * identify which search a user ran, let alone where they were standing.
 */
const LOG_PRECISION_DP = 2;

export function coarsen(value: number): number {
  const factor = 10 ** LOG_PRECISION_DP;
  return Math.round(value * factor) / factor;
}

export interface CoarseLocation {
  lat: number;
  lng: number;
  precision: string;
}

export function coarseLocation(lat: number, lng: number): CoarseLocation {
  return {
    lat: coarsen(lat),
    lng: coarsen(lng),
    precision: `${LOG_PRECISION_DP}dp`,
  };
}

/**
 * Redact anything that must never reach a log line.
 *
 * Full-precision coordinates are stripped rather than coarsened here, because a caller reaching
 * for a raw `lat`/`lng` in a log payload has already made the mistake — `coarseLocation` is the
 * intended path, and silently coarsening would hide the error instead of preventing it.
 */
export function safeLogPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (key === 'lat' || key === 'lng' || key === 'location' || key === 'anchor') {
      out[key] = '[redacted: use coarseLocation]';
      continue;
    }
    if (/key|token|secret|authorization/i.test(key)) {
      out[key] = '[redacted]';
      continue;
    }
    out[key] = value;
  }

  return out;
}
