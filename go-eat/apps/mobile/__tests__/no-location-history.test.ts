import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  DEFAULT_THRESHOLDS,
  evaluateBatch,
  hasDrifted,
  isStale,
  metersBetween,
} from '../src/cycle/invalidation.js';

/**
 * Constitution V — location is borrowed, not kept (FR-031).
 *
 * These assert the guarantee that justifies asking for continuous location access at all. The
 * trade the product offers is "we read your position to name a restaurant and then let it go", and
 * that is only defensible if there is nowhere for the data to accumulate.
 */

const SRC = join(__dirname, '..', 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : path.endsWith('.ts') || path.endsWith('.tsx')
        ? [path]
        : [];
  });
}

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('the anchor is overwritten, never appended to', () => {
  it('has no array or list of anchors, positions, or history anywhere in src/', () => {
    // Read from the source rather than mocked at runtime. A runtime assertion only covers the
    // paths a test happens to exercise; this covers every path that exists.
    const offenders: string[] = [];

    for (const file of sourceFiles(SRC)) {
      const code = stripComments(readFileSync(file, 'utf8'));

      const forbidden = [
        /\b(anchors|positions|locationHistory|coordinateHistory|suggestionHistory|visited|seenPlaces)\b/,
        /\.push\s*\(\s*(anchor|position|coords|coordinate|location)\b/i,
      ];

      for (const pattern of forbidden) {
        if (pattern.test(code)) {
          offenders.push(`${file}: matched ${pattern}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('exposes no API that would return more than one anchor', () => {
    const location = readFileSync(join(SRC, 'location', 'index.ts'), 'utf8');

    // captureAnchor returns a single anchor or null. A plural return type here would be the first
    // step toward a trail.
    expect(location).toMatch(/captureAnchor.*Promise<LocationAnchor \| null>/s);
    expect(stripComments(location)).not.toMatch(/LocationAnchor\[\]/);
  });

  it('writes no coordinate to device storage outside the active batch', () => {
    // The batch is the ONLY sanctioned home for a coordinate on device, and the next cycle
    // overwrites it. Anything else writing lat/lng to storage would outlive its cycle.
    const storage = sourceFiles(join(SRC, 'storage'));

    for (const file of storage) {
      const code = stripComments(readFileSync(file, 'utf8'));
      expect(code).not.toMatch(/\b(lat|lng|latitude|longitude)\b/);
    }
  });
});

describe('threshold relationship (R12)', () => {
  it('keeps batchTrustSeconds greater than anchorFreshnessSeconds', () => {
    // The anchor must go stale — and the widget must say so — BEFORE the batch expires and forces
    // a paid refetch. Inverting these presents a suggestion as current while it rests on an
    // anchor the app already distrusts.
    expect(DEFAULT_THRESHOLDS.batchTrustSeconds).toBeGreaterThan(
      DEFAULT_THRESHOLDS.anchorFreshnessSeconds,
    );
  });

  it('uses the recorded R12 starting values', () => {
    expect(DEFAULT_THRESHOLDS).toEqual({
      locationDriftThresholdMeters: 750,
      anchorFreshnessSeconds: 900,
      batchTrustSeconds: 1800,
    });
  });
});

describe('invalidation predicates (FR-021)', () => {
  const anchor = { lat: 47.6097, lng: -122.3331, capturedAt: '2026-08-14T12:00:00.000Z' };
  const now = new Date('2026-08-14T12:05:00.000Z');

  it('measures distance sanely', () => {
    expect(metersBetween({ lat: 47.6097, lng: -122.3331 }, { lat: 47.6097, lng: -122.3331 })).toBe(0);
    // ~1.11 km per 0.01° of latitude.
    expect(metersBetween({ lat: 47.6, lng: -122.3 }, { lat: 47.61, lng: -122.3 })).toBeCloseTo(1112, -2);
  });

  it('treats an anchor inside the freshness window as fresh', () => {
    expect(isStale(anchor, now)).toBe(false);
  });

  it('treats an anchor beyond 900s as stale', () => {
    expect(isStale(anchor, new Date('2026-08-14T12:16:00.000Z'))).toBe(true);
  });

  it('does not treat movement below 750 m as drift', () => {
    expect(hasDrifted(anchor, { lat: 47.6117, lng: -122.3331 })).toBe(false);
  });

  it('treats movement beyond 750 m as drift', () => {
    expect(hasDrifted(anchor, { lat: 47.62, lng: -122.3331 })).toBe(true);
  });

  it('invalidates on a preferences change', () => {
    const result = evaluateBatch({
      anchor,
      issuedAt: '2026-08-14T12:00:00.000Z',
      preferencesHash: 'a|b',
      currentLocation: { lat: 47.6097, lng: -122.3331 },
      currentPreferencesHash: 'a|c',
      now,
    });

    expect(result).toEqual({ valid: false, reason: 'preferences_changed' });
  });

  it('invalidates once the batch trust window has passed', () => {
    const result = evaluateBatch({
      anchor,
      issuedAt: '2026-08-14T12:00:00.000Z',
      preferencesHash: 'x',
      currentLocation: { lat: 47.6097, lng: -122.3331 },
      currentPreferencesHash: 'x',
      now: new Date('2026-08-14T12:31:00.000Z'),
    });

    expect(result.reason).toBe('expired');
  });

  it('does not treat a missing location fix as drift', () => {
    // Without a position we cannot claim the user moved, and guessing would burn a paid cycle.
    const result = evaluateBatch({
      anchor,
      issuedAt: '2026-08-14T12:00:00.000Z',
      preferencesHash: 'x',
      currentLocation: null,
      currentPreferencesHash: 'x',
      now,
    });

    expect(result).toEqual({ valid: true, reason: 'valid' });
  });
});
