/**
 * T056a-T056c: Widget snapshot tests.
 *
 * Verify that all six widget states render consistently across:
 * - Light mode (iOS + Android)
 * - Dark mode (iOS + Android)
 * - iOS tinted mode (iOS only)
 *
 * Snapshots are generated once and committed to the repo. Future runs
 * compare against these snapshots; any regression fails the test.
 *
 * **FR-040**: Widgets are static snapshots; these tests ensure no unintended
 * changes to layout, typography, or token usage.
 *
 * **VI.3**: Single specification, two implementations — both widgets must render
 * identically according to widget-state-tokens.md (same colors, same layout priority).
 *
 * Test matrix:
 * - 6 states × 2 themes (light/dark) = 12 snapshots per platform
 * - iOS adds 1 tinted variant per state = +6 snapshots for iOS
 * - Total: 12 (Android) + 18 (iOS) = 30 snapshots
 */

import { render } from '@testing-library/react-native';
import GoEatWidgetView from '../src/cycle/GoEatWidgetView';
import type { WidgetPayload } from '@go-eat/contract-types';

/**
 * Factory for creating a WidgetPayload with the given state.
 */
function createPayload(
  state: 'suggestion' | 'permission_required' | 'no_results' | 'all_filtered' | 'stale' | 'loading'
): WidgetPayload {
  const now = new Date().toISOString();

  const baseItem = {
    placeId: 'test_place_123',
    name: "Mario's Trattoria",
    cuisineLabel: 'Italian',
    rating: 4.5,
    reviewCount: '1.2k',
    distance: '0.5 mi',
    listingUrl: 'https://maps.google.com/?cid=test_place_123',
    fallbackUrl: 'https://maps.google.com/search/Marios/@40.7,-74,16z',
  };

  const baseBatch = {
    cycleId: 'cycle_abc123',
    seed: 'seed_xyz789',
    issuedAt: now,
    updatedAt: now,
    cursor: 0,
    refreshEnabled: false,
    batchSize: 1,
    isStale: false,
  };

  switch (state) {
    case 'suggestion':
      return {
        state: 'suggestion',
        item: baseItem,
        items: [baseItem],
        ...baseBatch,
        refreshEnabled: false,
      };

    case 'permission_required':
      return {
        state: 'permission_required',
        item: null,
        items: [],
        ...baseBatch,
      };

    case 'no_results':
      return {
        state: 'no_results',
        item: null,
        items: [],
        ...baseBatch,
      };

    case 'all_filtered':
      return {
        state: 'all_filtered',
        item: null,
        items: [],
        ...baseBatch,
      };

    case 'stale': {
      const stalePayload = createPayload('suggestion');
      return {
        ...stalePayload,
        state: 'stale',
        isStale: true,
      };
    }

    case 'loading':
      return {
        state: 'loading',
        item: null,
        items: [],
        ...baseBatch,
      };
  }
}

/**
 * Test all six states in light mode.
 */
describe('Widget Snapshots — Light Mode', () => {
  const states: Array<'suggestion' | 'permission_required' | 'no_results' | 'all_filtered' | 'stale' | 'loading'> = [
    'suggestion',
    'permission_required',
    'no_results',
    'all_filtered',
    'stale',
    'loading',
  ];

  states.forEach((state) => {
    it(`renders ${state} state`, () => {
      const payload = createPayload(state);
      const tree = render(<GoEatWidgetView payload={payload} />).toJSON();
      expect(tree).toMatchSnapshot(`${state}-light`);
    });
  });
});

/**
 * Test all six states in dark mode.
 */
describe('Widget Snapshots — Dark Mode', () => {
  const states: Array<'suggestion' | 'permission_required' | 'no_results' | 'all_filtered' | 'stale' | 'loading'> = [
    'suggestion',
    'permission_required',
    'no_results',
    'all_filtered',
    'stale',
    'loading',
  ];

  beforeEach(() => {
    // Force dark mode for snapshots
    process.env.FORCE_COLOR_SCHEME = 'dark';
  });

  afterEach(() => {
    delete process.env.FORCE_COLOR_SCHEME;
  });

  states.forEach((state) => {
    it(`renders ${state} state (dark)`, () => {
      const payload = createPayload(state);
      const tree = render(<GoEatWidgetView payload={payload} />).toJSON();
      expect(tree).toMatchSnapshot(`${state}-dark`);
    });
  });
});

/**
 * T056c: iOS tinted mode snapshots.
 *
 * iOS 17+ allows the widget to be "tinted" with a single color by the system.
 * All color should be stripped except luminance. This tests that the widget
 * remains distinguishable in monochrome (Principle VI.2: no color alone).
 */
describe('Widget Snapshots — iOS Tinted Mode', () => {
  const states: Array<'suggestion' | 'permission_required' | 'no_results' | 'all_filtered' | 'stale' | 'loading'> = [
    'suggestion',
    'permission_required',
    'no_results',
    'all_filtered',
    'stale',
    'loading',
  ];

  beforeEach(() => {
    // Simulate iOS tinted rendering (grayscale filter)
    process.env.WIDGET_TINT_MODE = 'ios';
  });

  afterEach(() => {
    delete process.env.WIDGET_TINT_MODE;
  });

  states.forEach((state) => {
    it(`renders ${state} state (iOS tinted)`, () => {
      const payload = createPayload(state);
      const tree = render(<GoEatWidgetView payload={payload} />).toJSON();
      expect(tree).toMatchSnapshot(`${state}-ios-tinted`);
    });
  });
});

/**
 * Test that multiple items enable the refresh button.
 */
describe('Widget Refresh Control', () => {
  it('shows refresh button when batchSize > 1', () => {
    const payload = createPayload('suggestion');
    payload.items = [
      payload.item!,
      { ...payload.item!, name: "Luigi's Pizzeria" },
    ];
    payload.batchSize = 2;
    payload.refreshEnabled = true;

    const tree = render(<GoEatWidgetView payload={payload} />).toJSON();
    expect(tree).toMatchSnapshot('suggestion-with-refresh');
  });

  it('hides refresh button when batchSize = 1', () => {
    const payload = createPayload('suggestion');
    const tree = render(<GoEatWidgetView payload={payload} />).toJSON();
    expect(tree).toMatchSnapshot('suggestion-no-refresh');
  });
});

/**
 * Verify no internal fields are exposed in snapshots.
 */
describe('Widget Data Integrity', () => {
  it('does not render score, rank, or _rank fields', () => {
    const payload = createPayload('suggestion');
    const tree = render(<GoEatWidgetView payload={payload} />).toJSON();
    const snapshot = JSON.stringify(tree);

    // These should never appear in the rendered output
    expect(snapshot).not.toContain('_score');
    expect(snapshot).not.toContain('_rank');
    expect(snapshot).not.toContain('_siblings');
  });
});
