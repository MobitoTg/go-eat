import { scoreCandidate } from '../src/score.js';
import { shuffleNearTies } from '../src/near-tie.js';
import { createRng } from '../src/rng.js';
import type { RestaurantCandidate, ScoringWeights } from '../src/types.js';
import { FIXTURE_WEIGHTS, NO_PREFERENCES } from './fixtures/index.js';

/**
 * T063: Every scoring weight measurably moves rankings (FR-009, SC-011, Constitution III). A
 * weight that changes nothing is decorative and must be removed — this is the regression test that
 * catches one.
 */

function candidate(over: Partial<RestaurantCandidate> = {}): RestaurantCandidate {
  return {
    providerPlaceId: 'p',
    name: 'Test Venue',
    types: ['vegan_restaurant'],
    rating: 4.2,
    reviewCount: 150,
    location: { lat: 0.005, lng: 0.005 },
    openNow: true,
    businessStatus: 'OPERATIONAL',
    dietaryTags: ['vegetarian'],
    ...over,
  };
}

const anchor = { lat: 0, lng: 0 };

function scoreWith(weights: Partial<ScoringWeights>): number {
  return scoreCandidate(candidate(), anchor, { ...FIXTURE_WEIGHTS, ...weights }, NO_PREFERENCES).score;
}

describe('each scoring weight measurably moves the score (FR-009)', () => {
  it('rating', () => {
    expect(scoreWith({ rating: 0.2 })).not.toBeCloseTo(scoreWith({ rating: 2.0 }), 3);
  });

  it('reviewVolume', () => {
    expect(scoreWith({ reviewVolume: 0.1 })).not.toBeCloseTo(scoreWith({ reviewVolume: 1.5 }), 3);
  });

  it('distance', () => {
    expect(scoreWith({ distance: 0.1 })).not.toBeCloseTo(scoreWith({ distance: 2.0 }), 3);
  });

  it('preferenceBonus (with a matched user preference)', () => {
    const withPref = (bonus: number): number =>
      scoreCandidate(
        candidate(),
        anchor,
        { ...FIXTURE_WEIGHTS, preferenceBonus: bonus },
        { exclusions: [], preferences: ['vegetarian'] },
      ).score;

    expect(withPref(0.05)).not.toBeCloseTo(withPref(0.5), 3);
  });

  it('a healthLean per-type value (the map value IS the weight, FR-007/FR-008)', () => {
    const withHealthLean = (value: number): number =>
      scoreCandidate(
        candidate(),
        anchor,
        { ...FIXTURE_WEIGHTS, healthLean: { ...FIXTURE_WEIGHTS.healthLean, vegan_restaurant: value } },
        NO_PREFERENCES,
      ).score;

    expect(withHealthLean(-0.3)).not.toBeCloseTo(withHealthLean(0.3), 3);
  });

  it('minReviewCount, via the confidence it drives', () => {
    const c = candidate({ reviewCount: 10 });
    const low = scoreCandidate(c, anchor, { ...FIXTURE_WEIGHTS, minReviewCount: 10 }, NO_PREFERENCES).score;
    const high = scoreCandidate(c, anchor, { ...FIXTURE_WEIGHTS, minReviewCount: 200 }, NO_PREFERENCES).score;
    expect(low).not.toBeCloseTo(high, 3);
  });

  it('searchRadiusMeters, via the distance decay curve', () => {
    const c = candidate({ location: { lat: 0.01, lng: 0 } });
    const tight = scoreCandidate(c, anchor, { ...FIXTURE_WEIGHTS, searchRadiusMeters: 300 }, NO_PREFERENCES).score;
    const wide = scoreCandidate(c, anchor, { ...FIXTURE_WEIGHTS, searchRadiusMeters: 5000 }, NO_PREFERENCES).score;
    expect(tight).not.toBeCloseTo(wide, 3);
  });
});

describe('nearTieThreshold measurably changes ordering behavior (FR-022)', () => {
  it('a wider threshold groups candidates a narrower one would keep separate', () => {
    const a = scoreCandidate(candidate({ providerPlaceId: 'a' }), anchor, FIXTURE_WEIGHTS, NO_PREFERENCES);
    const b = scoreCandidate(candidate({ providerPlaceId: 'b' }), anchor, FIXTURE_WEIGHTS, NO_PREFERENCES);
    const sorted = [{ ...a, score: 1.0 }, { ...b, score: 0.9 }];

    const narrowBandFirsts = new Set(
      Array.from({ length: 20 }, (_, i) => shuffleNearTies(sorted, 0.01, createRng(`n-${i}`))[0]!.candidate.providerPlaceId),
    );
    const wideBandFirsts = new Set(
      Array.from({ length: 20 }, (_, i) => shuffleNearTies(sorted, 0.2, createRng(`w-${i}`))[0]!.candidate.providerPlaceId),
    );

    expect(narrowBandFirsts.size).toBe(1); // 0.1 gap exceeds a 0.01 threshold — always strict order
    expect(wideBandFirsts.size).toBe(2); // 0.1 gap is within a 0.2 threshold — both lead sometimes
  });
});
