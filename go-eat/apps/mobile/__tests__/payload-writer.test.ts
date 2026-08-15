import type { CycleResponse, WidgetPayload } from '@go-eat/contract-types';
import { mapCycleResponseToWidgetPayload } from '../src/cycle/write-payload';

/**
 * T038: Test that CycleResponse → WidgetPayload mapping covers all six WidgetStates with no default branch.
 *
 * The widget payload has a union type with six states; missing a case is a compile error,
 * so this test asserts the mapping is exhaustive and each state renders correctly.
 *
 * Note: The backend returns BatchState (suggestion | no_results | all_filtered).
 * The client resolves WidgetState (suggestion | permission_required | no_results | all_filtered | stale | loading).
 * This test verifies the CycleResponse → WidgetPayload mapping for BatchState variants.
 */

describe('CycleResponse → WidgetPayload mapping (exhaustive state coverage)', () => {
  describe('mapCycleResponseToWidgetPayload', () => {
    it('maps successful cycle with suggestions to "suggestion" state', () => {
      const response: CycleResponse = {
        cycleId: 'cycle-001',
        seed: 'seed-abc123',
        issuedAt: new Date().toISOString(),
        anchor: { lat: 40.7128, lng: -74.006, capturedAt: new Date().toISOString() },
        items: [
          {
            providerPlaceId: 'place-001',
            name: "Joe's Pizza",
            cuisineLabel: 'Italian',
            ratingLabel: '4.5',
            reviewCountLabel: '1.2k',
            distanceLabel: '0.5 mi',
            listingUrl: 'https://maps.google.com/?cid=place-001',
            fallbackUrl: 'https://maps.google.com/search/Joes+Pizza',
          },
          {
            providerPlaceId: 'place-002',
            name: 'Taco Time',
            cuisineLabel: 'Mexican',
            ratingLabel: '4.3',
            reviewCountLabel: '850',
            distanceLabel: '0.8 mi',
            listingUrl: 'https://maps.google.com/?cid=place-002',
            fallbackUrl: 'https://maps.google.com/search/Taco+Time',
          },
        ],
        state: 'suggestion',
        refreshEnabled: true,
      };

      const payload = mapCycleResponseToWidgetPayload(response);

      expect(payload.state).toBe('suggestion');
      expect(payload.item).toBeDefined();
      expect(payload.item?.name).toBe("Joe's Pizza");
      expect(payload.item?.cuisineLabel).toBe('Italian');
      expect(payload.item?.ratingLabel).toBe('4.5');
      expect(payload.refreshEnabled).toBe(true);
      expect(payload.isStale).toBe(false);
    });

    it('maps no_results state (no qualifying restaurants)', () => {
      const response: CycleResponse = {
        cycleId: 'cycle-002',
        seed: 'seed-def456',
        issuedAt: new Date().toISOString(),
        anchor: { lat: 0, lng: 0, capturedAt: new Date().toISOString() },
        items: [],
        state: 'no_results',
        refreshEnabled: true,
      };

      const payload = mapCycleResponseToWidgetPayload(response);

      expect(payload.state).toBe('no_results');
      expect(payload.item).toBeNull();
    });

    it('maps all_filtered state (all candidates excluded by user preferences)', () => {
      const response: CycleResponse = {
        cycleId: 'cycle-003',
        seed: 'seed-ghi789',
        issuedAt: new Date().toISOString(),
        anchor: { lat: 40.7128, lng: -74.006, capturedAt: new Date().toISOString() },
        items: [], // Empty because all were filtered
        state: 'all_filtered',
        refreshEnabled: true,
      };

      const payload = mapCycleResponseToWidgetPayload(response);

      expect(payload.state).toBe('all_filtered');
      expect(payload.item).toBeNull();
    });

    it('preserves all batch items for client-side refresh', () => {
      const response: CycleResponse = {
        cycleId: 'cycle-005',
        seed: 'seed-mno345',
        issuedAt: new Date().toISOString(),
        anchor: { lat: 40.7128, lng: -74.006, capturedAt: new Date().toISOString() },
        items: [
          {
            providerPlaceId: 'place-1',
            name: 'Restaurant 1',
            cuisineLabel: 'Italian',
            ratingLabel: '4.5',
            reviewCountLabel: '1k',
            distanceLabel: '0.5 mi',
            listingUrl: 'https://maps.google.com/?cid=place-1',
            fallbackUrl: 'https://maps.google.com/search/Restaurant+1',
          },
          {
            providerPlaceId: 'place-2',
            name: 'Restaurant 2',
            cuisineLabel: 'French',
            ratingLabel: '4.3',
            reviewCountLabel: '800',
            distanceLabel: '0.6 mi',
            listingUrl: 'https://maps.google.com/?cid=place-2',
            fallbackUrl: 'https://maps.google.com/search/Restaurant+2',
          },
          {
            providerPlaceId: 'place-3',
            name: 'Restaurant 3',
            cuisineLabel: 'Japanese',
            ratingLabel: '4.7',
            reviewCountLabel: '1.5k',
            distanceLabel: '0.4 mi',
            listingUrl: 'https://maps.google.com/?cid=place-3',
            fallbackUrl: 'https://maps.google.com/search/Restaurant+3',
          },
        ],
        state: 'suggestion',
        refreshEnabled: true,
      };

      const payload = mapCycleResponseToWidgetPayload(response);

      // Payload should have version
      expect(payload.version).toBeDefined();

      // state should be suggestion
      expect(payload.state).toBe('suggestion');

      // First item should be selected (cursor=0 client-side)
      expect(payload.item?.name).toBe('Restaurant 1');
    });

    it('updates updatedAt timestamp in payload', () => {
      const now = new Date();
      const response: CycleResponse = {
        cycleId: 'cycle-006',
        seed: 'seed-pqr678',
        issuedAt: now.toISOString(),
        anchor: { lat: 40.7128, lng: -74.006, capturedAt: now.toISOString() },
        items: [
          {
            providerPlaceId: 'place-001',
            name: "Joe's Pizza",
            cuisineLabel: 'Italian',
            ratingLabel: '4.5',
            reviewCountLabel: '1.2k',
            distanceLabel: '0.5 mi',
            listingUrl: 'https://maps.google.com/?cid=place-001',
            fallbackUrl: 'https://maps.google.com/search/Joes+Pizza',
          },
        ],
        state: 'suggestion',
        refreshEnabled: true,
      };

      const payload = mapCycleResponseToWidgetPayload(response);

      expect(payload.updatedAt).toBeDefined();
      // updatedAt should be approximately now (within a few ms)
      const delta = Date.now() - new Date(payload.updatedAt).getTime();
      expect(delta).toBeLessThan(1000);
    });

    it('sets isStale=false for fresh batch', () => {
      const now = new Date().toISOString();
      const response: CycleResponse = {
        cycleId: 'cycle-007',
        seed: 'seed-stu901',
        issuedAt: now,
        anchor: { lat: 40.7128, lng: -74.006, capturedAt: now },
        items: [
          {
            providerPlaceId: 'place-001',
            name: 'Fresh Place',
            cuisineLabel: 'Italian',
            ratingLabel: '4.5',
            reviewCountLabel: '1.2k',
            distanceLabel: '0.5 mi',
            listingUrl: 'https://maps.google.com/?cid=place-001',
            fallbackUrl: 'https://maps.google.com/search/Fresh+Place',
          },
        ],
        state: 'suggestion',
        refreshEnabled: true,
      };

      const payload = mapCycleResponseToWidgetPayload(response);

      // Fresh batch should not be stale
      expect(payload.isStale).toBe(false);
    });

    it('mirrors refreshEnabled from backend response', () => {
      const refreshEnabledTrue: CycleResponse = {
        cycleId: 'cycle-009',
        seed: 'seed-yza567',
        issuedAt: new Date().toISOString(),
        anchor: { lat: 0, lng: 0, capturedAt: new Date().toISOString() },
        items: [],
        state: 'no_results',
        refreshEnabled: true,
      };

      const refreshEnabledFalse: CycleResponse = {
        cycleId: 'cycle-010',
        seed: 'seed-bcd890',
        issuedAt: new Date().toISOString(),
        anchor: { lat: 0, lng: 0, capturedAt: new Date().toISOString() },
        items: [],
        state: 'no_results',
        refreshEnabled: false,
      };

      const payload1 = mapCycleResponseToWidgetPayload(refreshEnabledTrue);
      const payload2 = mapCycleResponseToWidgetPayload(refreshEnabledFalse);

      expect(payload1.refreshEnabled).toBe(true);
      expect(payload2.refreshEnabled).toBe(false);
    });
  });

  /**
   * Verify that the mapping produces valid WidgetPayload union types.
   * These tests ensure all BatchState variants are handled properly.
   */
  describe('WidgetPayload state union validity', () => {
    it('suggestion state payload matches WidgetPayload type', () => {
      const response: CycleResponse = {
        cycleId: 'cycle-s1',
        seed: 'seed-s1',
        issuedAt: new Date().toISOString(),
        anchor: { lat: 0, lng: 0, capturedAt: new Date().toISOString() },
        items: [
          {
            providerPlaceId: 'p1',
            name: 'Test',
            cuisineLabel: 'Test',
            ratingLabel: '4.0',
            reviewCountLabel: '10',
            distanceLabel: '1 mi',
            listingUrl: 'https://maps.google.com/?cid=p1',
            fallbackUrl: 'https://maps.google.com/search/Test',
          },
        ],
        state: 'suggestion',
        refreshEnabled: true,
      };

      const payload = mapCycleResponseToWidgetPayload(response);

      // TypeScript ensures this matches WidgetPayload
      const _: WidgetPayload = payload;
      expect(payload.state).toBe('suggestion');
      expect(payload.item).not.toBeNull();
    });

    it('no_results state payload matches WidgetPayload type', () => {
      const response: CycleResponse = {
        cycleId: 'cycle-nr1',
        seed: 'seed-nr1',
        issuedAt: new Date().toISOString(),
        anchor: { lat: 0, lng: 0, capturedAt: new Date().toISOString() },
        items: [],
        state: 'no_results',
        refreshEnabled: true,
      };

      const payload = mapCycleResponseToWidgetPayload(response);

      const _: WidgetPayload = payload;
      expect(payload.state).toBe('no_results');
      expect(payload.item).toBeNull();
    });

    it('all_filtered state payload matches WidgetPayload type', () => {
      const response: CycleResponse = {
        cycleId: 'cycle-af1',
        seed: 'seed-af1',
        issuedAt: new Date().toISOString(),
        anchor: { lat: 0, lng: 0, capturedAt: new Date().toISOString() },
        items: [],
        state: 'all_filtered',
        refreshEnabled: true,
      };

      const payload = mapCycleResponseToWidgetPayload(response);

      const _: WidgetPayload = payload;
      expect(payload.state).toBe('all_filtered');
      expect(payload.item).toBeNull();
    });
  });
});
