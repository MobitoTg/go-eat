import type { SuggestionBatch } from '@go-eat/contract-types';
import { refresh } from '../src/cycle/refresh.js';
import { setSharedStorageAdapter, readBatch } from '../src/storage/shared-storage.js';
import { setPreferencesStorageAdapter, savePreferences } from '../src/storage/preferences.js';
import { configureApiClient } from '../src/cycle/api-client.js';
import { setLocationProvider } from '../src/location/index.js';

/**
 * T078: An invalidated batch plus a refresh press starts exactly one new cycle (FR-020).
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

const STALE_ANCHOR = { lat: 40.0, lng: -73.0, capturedAt: '2000-01-01T00:00:00.000Z' }; // ancient — always expired

function staleBatch(over: Partial<SuggestionBatch> = {}): SuggestionBatch {
  return {
    cycleId: 'old-cycle',
    seed: 'old-seed',
    issuedAt: STALE_ANCHOR.capturedAt, // far beyond batchTrustSeconds
    anchor: STALE_ANCHOR,
    preferencesHash: '|',
    items: [
      {
        providerPlaceId: 'old-1',
        name: 'Old Place',
        cuisineLabel: 'Restaurant',
        ratingLabel: '4.0',
        reviewCountLabel: '50',
        distanceLabel: '1 mi',
        listingUrl: 'https://www.google.com/maps/place/?q=place_id:old-1',
        fallbackUrl: 'https://www.google.com/maps/search/?api=1&query=Old&query_place_id=old-1',
      },
    ],
    cursor: 0,
    refreshEnabled: true,
    ...over,
  };
}

function mockFetch(): jest.Mock {
  return jest.fn(async () =>
    new Response(
      JSON.stringify({
        cycleId: 'new-cycle',
        seed: 'new-seed',
        issuedAt: new Date().toISOString(),
        anchor: { lat: 41.0, lng: -74.0, capturedAt: new Date().toISOString() },
        items: [
          {
            providerPlaceId: 'new-1',
            name: 'New Place',
            cuisineLabel: 'Restaurant',
            ratingLabel: '4.5',
            reviewCountLabel: '300',
            distanceLabel: '0.4 mi',
            listingUrl: 'https://www.google.com/maps/place/?q=place_id:new-1',
            fallbackUrl: 'https://www.google.com/maps/search/?api=1&query=New&query_place_id=new-1',
          },
        ],
        refreshEnabled: true,
        state: 'suggestion',
      }),
      { status: 200 },
    ),
  );
}

describe('invalidated batch + refresh press (FR-020)', () => {
  let fetchSpy: jest.Mock;

  beforeEach(async () => {
    setSharedStorageAdapter(memoryAdapter());
    setPreferencesStorageAdapter(memoryAdapter());
    await savePreferences({ exclusions: [], preferences: [] });

    setLocationProvider({
      getPermissionState: async () => 'granted',
      requestPermission: async () => 'granted',
      getCurrentPosition: async () => ({ lat: 41.0, lng: -74.0 }),
    });

    fetchSpy = mockFetch();
    configureApiClient('http://localhost:3000', fetchSpy as unknown as typeof fetch);

    const { writeBatch } = await import('../src/storage/shared-storage.js');
    await writeBatch(staleBatch(), 'ios');
  });

  it('starts exactly one new cycle when the batch has expired', async () => {
    const outcome = await refresh({
      platform: 'ios',
      unitSystem: 'imperial',
      currentLocation: { lat: 41.0, lng: -74.0 },
    });

    expect(outcome).toEqual({ kind: 'new_cycle', success: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const batch = await readBatch('ios');
    expect(batch?.cycleId).toBe('new-cycle');
    expect(batch?.items[0]?.name).toBe('New Place');
    expect(batch?.cursor).toBe(0);
  });

  it('starts exactly one new cycle when the location has drifted materially', async () => {
    await (await import('../src/storage/shared-storage.js')).writeBatch(
      staleBatch({ issuedAt: new Date().toISOString() }), // fresh issuedAt, but anchor is far away
      'ios',
    );

    const outcome = await refresh({
      platform: 'ios',
      unitSystem: 'imperial',
      currentLocation: { lat: 41.0, lng: -74.0 }, // ~130km from STALE_ANCHOR — well past the drift threshold
    });

    expect(outcome).toEqual({ kind: 'new_cycle', success: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('a second refresh press while still invalid does not double up — one call per invocation', async () => {
    await refresh({ platform: 'ios', unitSystem: 'imperial', currentLocation: { lat: 41.0, lng: -74.0 } });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // The batch is now fresh and valid (just replaced), so a second call advances instead.
    await refresh({ platform: 'ios', unitSystem: 'imperial', currentLocation: { lat: 41.0, lng: -74.0 } });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
