import { orderCandidates } from '../src/index.js';
import { ANCHORS, DENSE_URBAN, FIXTURE_WEIGHTS, NO_PREFERENCES } from './fixtures/index.js';

/**
 * T073b: SC-013 variety over repeated cycles at a fixed location.
 *
 * Across repeated cycles at an identical location with identical preferences, the first-shown
 * venue must vary — no single venue may dominate first place — while nothing scoring more than
 * `nearTieThreshold` below the top candidate is ever shown first.
 */

const CYCLES = 60;
const TOP_SCORE_MIN_GAP = FIXTURE_WEIGHTS.nearTieThreshold;

describe('SC-013 — variety across repeated cycles at one fixed location', () => {
  const runs = Array.from({ length: CYCLES }, (_, i) =>
    orderCandidates({
      candidates: DENSE_URBAN,
      anchor: ANCHORS.denseUrban,
      weights: FIXTURE_WEIGHTS,
      user: NO_PREFERENCES,
      seed: `variety-${i}`,
    }),
  );

  it('no single venue leads more than 60% of cycles — the first pick genuinely varies', () => {
    const firstPlaceCounts = new Map<string, number>();
    for (const run of runs) {
      const id = run.ordered[0]!.candidate.providerPlaceId;
      firstPlaceCounts.set(id, (firstPlaceCounts.get(id) ?? 0) + 1);
    }

    const maxShare = Math.max(...firstPlaceCounts.values()) / CYCLES;
    expect(firstPlaceCounts.size).toBeGreaterThan(1);
    expect(maxShare).toBeLessThanOrEqual(0.6);
  });

  it('never shows a venue first that scores more than nearTieThreshold below the top score', () => {
    const trueTopScore = Math.max(...runs[0]!.ordered.map((c) => c.score));

    for (const run of runs) {
      const shownFirst = run.ordered[0]!;
      expect(trueTopScore - shownFirst.score).toBeLessThanOrEqual(TOP_SCORE_MIN_GAP + 1e-9);
    }
  });
});
