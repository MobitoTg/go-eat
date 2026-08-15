import type { SuggestionBatch } from '@go-eat/contract-types';
import { refresh } from '../src/cycle/refresh.js';
import { setSharedStorageAdapter, readBatch, readPayload, writeBatch } from '../src/storage/shared-storage.js';
import { setPreferencesStorageAdapter, savePreferences } from '../src/storage/preferences.js';
import { configureApiClient } from '../src/cycle/api-client.js';

/**
 * T076: A full walk of a valid batch issues zero API calls (FR-015, FR-021a, SC-007).
 */

function memoryAdapter() {
  const store = new Map<string, string>();
  return {
    async getItem(key: string) {
      return store.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
    async removeItem(key: string) {
      store.delete(key);
    },
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

const VALID_ANCHOR = { lat: 40.0, lng: -73.0, capturedAt: new Date().toISOString() };

function validBatch(over: Partial<SuggestionBatch> = {}): SuggestionBatch {
  return {
    cycleId: 'cycle-1',
    seed: 'seed-1',
    issuedAt: new Date().toISOString(), // fresh — within batchTrustSeconds
    anchor: VALID_ANCHOR,
    preferencesHash: '|',
    items: [ITEM(1), ITEM(2), ITEM(3)],
    cursor: 0,
    refreshEnabled: true,
    ...over,
  };
}

describe('refresh — zero network calls while the batch remains valid (FR-015, FR-021a, SC-007)', () => {
  let fetchSpy: jest.Mock;

  beforeEach(async () => {
    setSharedStorageAdapter(memoryAdapter());
    setPreferencesStorageAdapter(memoryAdapter());
    await savePreferences({ exclusions: [], preferences: [] });

    fetchSpy = jest.fn();
    configureApiClient('http://localhost:3000', fetchSpy as unknown as typeof fetch);
  });

  it('advances the cursor with zero fetch calls when the batch is still valid', async () => {
    await writeBatch(validBatch({ cursor: 0 }), 'ios');

    const outcome = await refresh({ platform: 'ios', unitSystem: 'imperial', currentLocation: VALID_ANCHOR });

    expect(outcome).toEqual({ kind: 'advanced' });
    expect(fetchSpy).not.toHaveBeenCalled();

    const batch = await readBatch('ios');
    expect(batch?.cursor).toBe(1);
  });

  it('walking the full batch — including past the last item and around again — makes zero calls', async () => {
    await writeBatch(validBatch({ cursor: 0 }), 'ios');

    for (let i = 0; i < 7; i += 1) {
      await refresh({ platform: 'ios', unitSystem: 'imperial', currentLocation: VALID_ANCHOR });
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    const batch = await readBatch('ios');
    // 7 advances over a 3-item batch: (0 + 7) % 3 = 1
    expect(batch?.cursor).toBe(1);
  });

  it('rewrites the widget payload to the new cursor position on every advance', async () => {
    await writeBatch(validBatch({ cursor: 0 }), 'ios');
    await refresh({ platform: 'ios', unitSystem: 'imperial', currentLocation: VALID_ANCHOR });

    const payload = await readPayload('ios');
    expect(payload?.item?.name).toBe('Place 2');
  });
});
