import type { WidgetItem, WidgetPayload, WidgetState } from '@go-eat/contract-types';
import { WIDGET_STATES } from '@go-eat/contract-types';
import { widgetContentFor } from '../src/widget/content.js';

/**
 * T053a/T053b/T056d: The shared state → content decision both widget views consume.
 *
 * FR-038: every state must be distinguishable by shape/icon/position, not color alone — asserted
 * here as "every state has a distinct glyph."
 * FR-040: no hover/focus/pressed variant exists anywhere in this module (there is no such concept
 * in its output type at all — asserted by construction, not by inspection).
 * FR-003/Principle II: no radius, distance-scope, or comparison affordance is ever produced.
 */

const ITEM: WidgetItem = {
  name: "Joe's Pizza",
  cuisineLabel: 'Pizza',
  ratingLabel: '4.5',
  reviewCountLabel: '1.2k',
  distanceLabel: '0.4 mi',
  listingUrl: 'https://www.google.com/maps/place/?q=place_id:abc',
  fallbackUrl: 'https://www.google.com/maps/search/?api=1&query=Joe%27s+Pizza&query_place_id=abc',
};

function payloadFor(state: WidgetState, overrides: Partial<WidgetPayload> = {}): WidgetPayload {
  const needsItem = state === 'suggestion' || state === 'stale';
  return {
    version: 1,
    state,
    updatedAt: new Date().toISOString(),
    isStale: state === 'stale',
    refreshEnabled: true,
    item: needsItem ? ITEM : null,
    ...overrides,
  };
}

describe('widgetContentFor — exhaustive state coverage (FR-004)', () => {
  it('produces content for every declared WidgetState with no default branch needed', () => {
    for (const state of WIDGET_STATES) {
      const content = widgetContentFor(payloadFor(state));
      expect(content.state).toBe(state);
      expect(typeof content.title).toBe('string');
      expect(content.title.length).toBeGreaterThan(0);
    }
  });

  it('every state has a distinct, stable glyph (FR-038 — hue is never the only differentiator)', () => {
    const glyphs = WIDGET_STATES.map((state) => widgetContentFor(payloadFor(state)).glyph);
    expect(new Set(glyphs).size).toBe(WIDGET_STATES.length);
  });

  it('suggestion renders name, cuisine, rating, and distance (FR-002)', () => {
    const content = widgetContentFor(payloadFor('suggestion'));
    expect(content.title).toBe("Joe's Pizza");
    expect(content.subtitle).toContain('Pizza');
    expect(content.subtitle).toContain('4.5');
    expect(content.subtitle).toContain('0.4 mi');
  });

  it('suggestion taps through to the listing URL, never a fabricated one (FR-023)', () => {
    const content = widgetContentFor(payloadFor('suggestion'));
    expect(content.tapUrl).toBe(ITEM.listingUrl);
  });

  it('stale shows the last-known item with a visibly distinct action label, never presented as current', () => {
    const content = widgetContentFor(payloadFor('stale'));
    expect(content.title).toBe("Joe's Pizza");
    expect(content.actionLabel).toBe('STALE');
    expect(content.actionLabel).not.toBe(widgetContentFor(payloadFor('suggestion')).actionLabel);
  });

  it('permission_required routes into the app rationale screen, never straight to OS settings (FR-029)', () => {
    const content = widgetContentFor(payloadFor('permission_required'));
    expect(content.tapUrl).toBe('goeat://permission');
  });

  it('all_filtered routes into preferences, never a browsing or list surface (FR-028, Principle I)', () => {
    const content = widgetContentFor(payloadFor('all_filtered'));
    expect(content.tapUrl).toBe('goeat://preferences');
    expect(content.tapUrl).not.toMatch(/list|search|browse/i);
  });

  it('no_results and loading have no tap target — an honest dead end, not a fabricated action', () => {
    expect(widgetContentFor(payloadFor('no_results')).tapUrl).toBeNull();
    expect(widgetContentFor(payloadFor('loading')).tapUrl).toBeNull();
  });

  it('never exposes a radius, distance-scope, or comparison affordance (FR-003, Principle II)', () => {
    for (const state of WIDGET_STATES) {
      const content = widgetContentFor(payloadFor(state));
      const serialized = JSON.stringify(content).toLowerCase();
      expect(serialized).not.toMatch(/radius|\bscope\b|compare|alternative/);
    }
  });

  it('shows refresh only for a live suggestion with refresh enabled', () => {
    expect(widgetContentFor(payloadFor('suggestion', { refreshEnabled: true })).showRefresh).toBe(true);
    expect(widgetContentFor(payloadFor('suggestion', { refreshEnabled: false })).showRefresh).toBe(false);
    expect(widgetContentFor(payloadFor('stale')).showRefresh).toBe(false);
    expect(widgetContentFor(payloadFor('no_results')).showRefresh).toBe(false);
  });

  it('falls back to a loading-shaped content if item is unexpectedly null for suggestion/stale', () => {
    const content = widgetContentFor(payloadFor('suggestion', { item: null }));
    expect(content.glyph).toBe('spinner');
    expect(content.tapUrl).toBeNull();
  });
});

describe('no hover/focus/pressed concept exists in widget content (FR-040)', () => {
  it('WidgetContent has no such field for any state', () => {
    // Static guarantee: the type itself has no hover/focus/pressed member, so there is nothing for
    // a widget view to reference. Asserted here by construction — every key on every produced
    // object is one of the documented ones.
    const allowedKeys = new Set(['state', 'title', 'subtitle', 'actionLabel', 'tapUrl', 'glyph', 'showRefresh']);
    for (const state of WIDGET_STATES) {
      for (const key of Object.keys(widgetContentFor(payloadFor(state)))) {
        expect(allowedKeys.has(key)).toBe(true);
      }
    }
  });
});
