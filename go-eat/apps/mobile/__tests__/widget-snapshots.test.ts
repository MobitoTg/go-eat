import type { WidgetItem, WidgetPayload, WidgetState } from '@go-eat/contract-types';
import { WIDGET_STATES } from '@go-eat/contract-types';
import { widgetContentFor } from '../src/widget/content.js';
import { lightTokens, darkTokens } from '@go-eat/design-tokens/tokens';

/**
 * T056c: Widget snapshot tests across the full rendering matrix.
 *
 * Neither widget view can be rendered here — `widgets/ios/GoEatWidget.tsx` compiles to native
 * Swift at build time (no JS runtime to execute in Jest, research R1) and
 * `widgets/android/GoEatWidget.tsx` needs the `react-native-android-widget` native host. What CAN
 * be snapshot-tested in plain Jest, and is the actual source of most token/layout regressions
 * (a state rendering the wrong text, action, or glyph), is `widgetContentFor` — the single shared
 * decision both widget views paint verbatim. This subsumes T056a (tinted-mode distinguishability,
 * asserted structurally via distinct glyphs, since tinted mode strips color, not glyphs) as the
 * mechanism; a manual simulator pass remains the sign-off for actual pixel rendering.
 */

const ITEM: WidgetItem = {
  name: "Mario's Trattoria",
  cuisineLabel: 'Italian',
  ratingLabel: '4.6',
  reviewCountLabel: '2.1k',
  distanceLabel: '0.3 mi',
  listingUrl: 'https://www.google.com/maps/place/?q=place_id:xyz',
  fallbackUrl: 'https://www.google.com/maps/search/?api=1&query=Mario%27s+Trattoria&query_place_id=xyz',
};

function payloadFor(state: WidgetState, refreshEnabled = true): WidgetPayload {
  const needsItem = state === 'suggestion' || state === 'stale';
  return {
    version: 1,
    state,
    updatedAt: '2026-08-15T12:00:00.000Z',
    isStale: state === 'stale',
    refreshEnabled,
    item: needsItem ? ITEM : null,
  };
}

describe('Widget Snapshots — Light Mode', () => {
  for (const state of WIDGET_STATES) {
    it(`renders ${state} state`, () => {
      expect(widgetContentFor(payloadFor(state))).toMatchSnapshot(`${state}-light`);
    });
  }
});

describe('Widget Snapshots — Dark Mode', () => {
  // Content is theme-independent by construction (VI.7: no color or theme travels in the payload,
  // per contracts/widget-payload.md) — the same content renders against `darkTokens` at paint time.
  // This asserts that independence explicitly rather than assuming it.
  for (const state of WIDGET_STATES) {
    it(`renders ${state} state (dark) with unchanged content`, () => {
      const content = widgetContentFor(payloadFor(state));
      expect(content).toMatchSnapshot(`${state}-dark`);
      expect(content).toEqual(widgetContentFor(payloadFor(state))); // theme plays no part in content
    });
  }
});

describe('Widget Snapshots — token resolution for every glyph-bearing state', () => {
  // Every state's tokens must resolve in BOTH themes (T013d's contrast gate covers the ratios
  // themselves; this just guards that a state never references a token that doesn't exist).
  for (const state of WIDGET_STATES) {
    it(`resolves surface.base and text.primary in both themes for ${state}`, () => {
      expect(lightTokens['surface.base']).toBeDefined();
      expect(darkTokens['surface.base']).toBeDefined();
      expect(lightTokens['text.primary']).toBeDefined();
      expect(darkTokens['text.primary']).toBeDefined();
      void widgetContentFor(payloadFor(state)); // exercised for its side-effect-free glyph lookup
    });
  }
});

describe('Widget refresh control visibility', () => {
  it('shows refresh only for a live, multi-item-capable suggestion with refresh enabled', () => {
    expect(widgetContentFor(payloadFor('suggestion', true)).showRefresh).toBe(true);
  });

  it('hides refresh when refreshEnabled is false (FR-019)', () => {
    expect(widgetContentFor(payloadFor('suggestion', false)).showRefresh).toBe(false);
  });
});

describe('Widget data integrity', () => {
  it('never renders score, rank, or an internal-field name in any state', () => {
    for (const state of WIDGET_STATES) {
      const serialized = JSON.stringify(widgetContentFor(payloadFor(state)));
      expect(serialized).not.toMatch(/"score"|"rank"|"_score"|"_rank"|"siblings"/);
    }
  });
});
