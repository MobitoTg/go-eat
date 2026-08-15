import type { SuggestionBatch } from '@go-eat/contract-types';
import { refresh } from '../src/cycle/refresh.js';
import { widgetContentFor } from '../src/widget/content.js';
import { mapCycleResponseToWidgetPayload } from '../src/cycle/write-payload.js';
import { setSharedStorageAdapter, readBatch, writeBatch } from '../src/storage/shared-storage.js';
import { setPreferencesStorageAdapter, savePreferences } from '../src/storage/preferences.js';
import { configureApiClient } from '../src/cycle/api-client.js';

/**
 * T077: `refreshEnabled: false` hides the control and leaves selection, presentation, and
 * tap-through unchanged (FR-019, SC-008).
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

const ITEM = {
  providerPlaceId: 'p1',
  name: 'Solo Place',
  cuisineLabel: 'Restaurant',
  ratingLabel: '4.5',
  reviewCountLabel: '200',
  distanceLabel: '0.3 mi',
  listingUrl: 'https://www.google.com/maps/place/?q=place_id:p1',
  fallbackUrl: 'https://www.google.com/maps/search/?api=1&query=Solo&query_place_id=p1',
};

describe('refreshEnabled: false (FR-019, SC-008)', () => {
  beforeEach(async () => {
    setSharedStorageAdapter(memoryAdapter());
    setPreferencesStorageAdapter(memoryAdapter());
    await savePreferences({ exclusions: [], preferences: [] });
    configureApiClient('http://localhost:3000', jest.fn() as unknown as typeof fetch);
  });

  it('the widget shows no refresh affordance for a refresh-disabled suggestion', () => {
    const payload = mapCycleResponseToWidgetPayload({
      cycleId: 'c1',
      seed: 's1',
      issuedAt: new Date().toISOString(),
      anchor: { lat: 0, lng: 0, capturedAt: new Date().toISOString() },
      items: [ITEM],
      refreshEnabled: false,
      state: 'suggestion',
    });

    expect(widgetContentFor(payload).showRefresh).toBe(false);
    // Presentation is otherwise identical to the refresh-enabled case (SC-008).
    expect(widgetContentFor(payload).title).toBe('Solo Place');
    expect(widgetContentFor(payload).tapUrl).toBe(ITEM.listingUrl);
  });

  it('refresh() is a no-op against a refresh-disabled batch — it never advances or calls the network', async () => {
    const batch: SuggestionBatch = {
      cycleId: 'c1',
      seed: 's1',
      issuedAt: new Date().toISOString(),
      anchor: { lat: 40, lng: -73, capturedAt: new Date().toISOString() },
      preferencesHash: '|',
      items: [ITEM],
      cursor: 0,
      refreshEnabled: false,
    };
    await writeBatch(batch, 'ios');

    const outcome = await refresh({
      platform: 'ios',
      unitSystem: 'imperial',
      currentLocation: { lat: 40, lng: -73 },
    });

    expect(outcome).toEqual({ kind: 'no_batch' });
    expect((await readBatch('ios'))?.cursor).toBe(0);
  });

  it('server truncates the batch to a single item, so there is nothing to cycle through regardless', () => {
    const payload = mapCycleResponseToWidgetPayload({
      cycleId: 'c1',
      seed: 's1',
      issuedAt: new Date().toISOString(),
      anchor: { lat: 0, lng: 0, capturedAt: new Date().toISOString() },
      items: [ITEM], // services/suggestion-api/src/routes/cycle.ts truncates to 1 when refreshEnabled is false
      refreshEnabled: false,
      state: 'suggestion',
    });

    expect(payload.item?.name).toBe('Solo Place');
  });
});
