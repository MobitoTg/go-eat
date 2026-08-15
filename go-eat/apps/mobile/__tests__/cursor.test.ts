import type { SuggestionBatch } from '@go-eat/contract-types';
import { advance } from '../src/cycle/cursor.js';

/**
 * T075: Cursor advance and wrap, including short and single-item batches (FR-016, FR-017, FR-018).
 */

function batch(over: Partial<SuggestionBatch> = {}): SuggestionBatch {
  return {
    cycleId: 'cycle-1',
    seed: 'seed-1',
    issuedAt: '2026-08-15T12:00:00.000Z',
    anchor: { lat: 0, lng: 0, capturedAt: '2026-08-15T12:00:00.000Z' },
    preferencesHash: '|',
    items: [],
    cursor: 0,
    refreshEnabled: true,
    ...over,
  };
}

const ITEM = (n: number) => ({
  providerPlaceId: `p${n}`,
  name: `Place ${n}`,
  cuisineLabel: 'Restaurant',
  ratingLabel: '4.0',
  reviewCountLabel: '100',
  distanceLabel: '0.5 mi',
  listingUrl: `https://www.google.com/maps/place/?q=place_id:p${n}`,
  fallbackUrl: `https://www.google.com/maps/search/?api=1&query=Place&query_place_id=p${n}`,
});

describe('advance (FR-016, FR-017, FR-018)', () => {
  it('advances to the next item in a full batch', () => {
    const b = batch({ items: [ITEM(1), ITEM(2), ITEM(3), ITEM(4), ITEM(5)], cursor: 1 });
    expect(advance(b).cursor).toBe(2);
  });

  it('wraps from the last item back to the first', () => {
    const b = batch({ items: [ITEM(1), ITEM(2), ITEM(3), ITEM(4), ITEM(5)], cursor: 4 });
    expect(advance(b).cursor).toBe(0);
  });

  it('wraps a two-item batch after just one advance', () => {
    const b = batch({ items: [ITEM(1), ITEM(2)], cursor: 1 });
    expect(advance(b).cursor).toBe(0);
  });

  it('a single-item batch always wraps to itself', () => {
    const b = batch({ items: [ITEM(1)], cursor: 0 });
    expect(advance(b).cursor).toBe(0);
    expect(advance(advance(b)).cursor).toBe(0);
  });

  it('an empty batch is a no-op — nothing to advance to', () => {
    const b = batch({ items: [], cursor: 0 });
    expect(advance(b)).toEqual(b);
  });

  it('does not mutate the input batch', () => {
    const b = batch({ items: [ITEM(1), ITEM(2)], cursor: 0 });
    const copy = JSON.parse(JSON.stringify(b));
    advance(b);
    expect(b).toEqual(copy);
  });

  it('preserves every other field of the batch unchanged', () => {
    const b = batch({ items: [ITEM(1), ITEM(2)], cursor: 0 });
    const next = advance(b);
    expect(next.cycleId).toBe(b.cycleId);
    expect(next.seed).toBe(b.seed);
    expect(next.items).toBe(b.items);
    expect(next.anchor).toBe(b.anchor);
  });

  it('rapid repeated advance moves exactly one step each time (no debounce needed)', () => {
    let b = batch({ items: [ITEM(1), ITEM(2), ITEM(3)], cursor: 0 });
    const cursors = [b.cursor];
    for (let i = 0; i < 6; i += 1) {
      b = advance(b);
      cursors.push(b.cursor);
    }
    expect(cursors).toEqual([0, 1, 2, 0, 1, 2, 0]);
  });
});
