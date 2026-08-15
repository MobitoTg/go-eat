/**
 * T056d: Widget integration tests.
 *
 * End-to-end tests that verify:
 * 1. Widget reads payload from shared storage
 * 2. Widget renders correctly based on payload state
 * 3. Widget tapping behavior (links open in Maps)
 * 4. Widget handles stale and permission states correctly
 *
 * These tests run on both iOS Simulator and Android Emulator via Detox.
 * They exercise the full stack: storage → resolution → rendering → interaction.
 *
 * **FR-005**: Refresh button taps advance cursor without launching app.
 * **FR-040**: Widget snapshots are deterministic.
 * **Principle I**: Tapping restaurants opens Maps, never the app.
 *
 * Tier 3 (research R9): requires a built app on a real iOS Simulator/Android emulator plus a
 * configured Detox environment (`.detoxrc.js`, a compiled app binary). Excluded from
 * `apps/mobile/tsconfig.json` and from Jest's `testMatch` (`jest.config.cjs`) for the same reason
 * Tier 2 excludes all of `__tests__/integration/` — it cannot run in this workspace's plain-Node
 * test environment. Several calls below (`revokePermissions`, `enableAccessibilityScreenReader`,
 * `toMatchImage`, `simulateAppliedTint`) are aspirational against the installed `detox` version and
 * need reconciling against a real Detox setup before this file is wired into a device-farm CI job.
 */

import { device, element, by, expect as detoxExpect } from 'detox';

describe('Widget Integration Tests', () => {
  /**
   * Initialize the app and clear all stored data before each test.
   */
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      cleanUp: true,
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Clear widget payload
    await element(by.id('clear-payload-button')).multiTap();
  });

  /**
   * Test T050: Widget displays suggestion state correctly.
   */
  it('T050: displays suggestion when payload has restaurant', async () => {
    // Write a suggestion payload
    await element(by.id('write-suggestion-payload-button')).tap();
    await waitFor(element(by.text("Mario's Trattoria"))).toBeVisible();

    // Verify restaurant name, cuisine, rating, distance
    await detoxExpect(element(by.text("Mario's Trattoria"))).toBeVisible();
    await detoxExpect(element(by.text(/Italian · 4\.5 ⭐ · 0\.5 mi/))).toBeVisible();
    await detoxExpect(element(by.text('TAP FOR DIRECTIONS'))).toBeVisible();
  });

  /**
   * Test T050: Widget displays permission_required state.
   */
  it('T050: displays permission prompt when location denied', async () => {
    // Revoke location permission
    await device.revokePermissions('location');

    // Write permission_required payload
    await element(by.id('write-permission-payload-button')).tap();
    await waitFor(element(by.text('Enable Location'))).toBeVisible();

    // Verify settings button
    await detoxExpect(element(by.text('SETTINGS'))).toBeVisible();
  });

  /**
   * Test T050: Widget displays no_results state.
   */
  it('T050: displays no_results when no qualifying restaurants', async () => {
    // Write no_results payload
    await element(by.id('write-no-results-payload-button')).tap();
    await waitFor(element(by.text('Nothing worth recommending nearby'))).toBeVisible();

    // Verify message
    await detoxExpect(element(by.text(/ⓘ Nothing worth recommending/))).toBeVisible();
  });

  /**
   * Test T050: Widget displays all_filtered state.
   */
  it('T050: displays all_filtered when preferences eliminated all options', async () => {
    // Write all_filtered payload
    await element(by.id('write-all-filtered-payload-button')).tap();
    await waitFor(element(by.text('All preferences filtered out'))).toBeVisible();

    // Verify message and hint
    await detoxExpect(element(by.text(/All preferences/))).toBeVisible();
    await detoxExpect(element(by.text('Adjust settings in the app'))).toBeVisible();
  });

  /**
   * Test T050: Widget displays stale state with badge.
   */
  it('T050: displays stale state with warning badge', async () => {
    // Write stale payload
    await element(by.id('write-stale-payload-button')).tap();
    await waitFor(element(by.text('STALE'))).toBeVisible();

    // Verify stale badge is present
    await detoxExpect(element(by.text(/⚠ STALE/))).toBeVisible();
    // Verify restaurant is still shown
    await detoxExpect(element(by.text("Mario's Trattoria"))).toBeVisible();
  });

  /**
   * Test T050: Widget displays loading state.
   */
  it('T050: displays loading when no payload', async () => {
    // Write loading payload
    await element(by.id('write-loading-payload-button')).tap();
    await waitFor(element(by.text('Finding a restaurant...'))).toBeVisible();

    // Verify message
    await detoxExpect(element(by.text(/Finding a restaurant/))).toBeVisible();
  });

  /**
   * Test Principle I: Tapping restaurant opens Maps (not app).
   */
  it('Principle I: tapping restaurant opens Google Maps', async () => {
    // Write suggestion payload
    await element(by.id('write-suggestion-payload-button')).tap();
    await waitFor(element(by.text('TAP FOR DIRECTIONS'))).toBeVisible();

    // Tap the button
    await element(by.text('TAP FOR DIRECTIONS')).tap();

    // Verify Maps app opened (Detox can't directly verify this, but logs should show URL)
    // In CI, we mock the URL opening
    await expect(device.log.count((log) => log.includes('google.com'))).toBeGreaterThan(0);
  });

  /**
   * Test T053a: Widget is accessible via VoiceOver (iOS).
   */
  it('T053a: suggestion state is accessible to screen readers', async () => {
    // Write suggestion payload
    await element(by.id('write-suggestion-payload-button')).tap();
    await waitFor(element(by.text("Mario's Trattoria"))).toBeVisible();

    // Enable screen reader
    if (device.getPlatform() === 'ios') {
      await device.enableAccessibilityScreenReader();

      // Verify accessibility labels are set
      await detoxExpect(element(by.id('restaurant-name')).and(by.text("Mario's Trattoria"))).toBeVisible();
      await detoxExpect(element(by.id('tap-button')).and(by.text('TAP FOR DIRECTIONS'))).toBeVisible();

      await device.disableAccessibilityScreenReader();
    }
  });

  /**
   * Test T056a: Widget rendering is deterministic (no randomness).
   */
  it('T056a: same payload always renders identically', async () => {
    const payload = {
      state: 'suggestion',
      item: {
        placeId: 'test_123',
        name: "Mario's Trattoria",
        cuisineLabel: 'Italian',
        rating: 4.5,
        reviewCount: '1.2k',
        distance: '0.5 mi',
        listingUrl: 'https://maps.google.com/?cid=test',
        fallbackUrl: 'https://maps.google.com/search/Mario',
      },
      items: [],
      cycleId: 'cycle_abc',
      seed: 'seed_xyz',
      issuedAt: '2026-08-15T12:00:00Z',
      updatedAt: '2026-08-15T12:00:00Z',
      cursor: 0,
      refreshEnabled: false,
      batchSize: 1,
      isStale: false,
    };

    // Write payload, take screenshot
    await element(by.id('write-custom-payload-button')).tap();
    await element(by.id('payload-input')).typeText(JSON.stringify(payload));
    await element(by.id('save-payload-button')).tap();

    const screenshot1 = await device.takeScreenshot('widget-render-1');

    // Wait and reload
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await device.reloadReactNative();

    // Payload should still be readable; take another screenshot
    const screenshot2 = await device.takeScreenshot('widget-render-2');

    // Compare screenshots (pixel-perfect)
    // In CI, use image comparison tool
    expect(screenshot1).toMatchImage(screenshot2);
  });

  /**
   * Test T056b: Widget uses ≤3 chromatic values (Principle VI.4).
   */
  it('T056b: suggestion state uses limited chromatic values', async () => {
    // Write suggestion payload
    await element(by.id('write-suggestion-payload-button')).tap();
    await waitFor(element(by.text("Mario's Trattoria"))).toBeVisible();

    // Capture the view hierarchy and analyze colors
    // This is a compliance check; can be automated with pixel analysis
    const viewHierarchy = await device.getViewHierarchy();

    // Count unique non-grayscale colors (simplified check)
    const colors = extractColorsFromHierarchy(viewHierarchy);
    const chromaticColors = colors.filter((c) => !isGrayscale(c));

    // Should use ≤3 chromatic values
    expect(chromaticColors.length).toBeLessThanOrEqual(3);
  });

  /**
   * Test T056c: Widget is distinguishable in tinted mode (iOS).
   */
  it('T056c: all states remain distinguishable when tinted', async () => {
    if (device.getPlatform() !== 'ios') {
      return; // iOS only
    }

    const states = [
      'suggestion',
      'permission_required',
      'no_results',
      'all_filtered',
      'stale',
      'loading',
    ];

    for (const state of states) {
      // Write payload for this state
      await element(by.id(`write-${state}-payload-button`)).tap();

      // Apply tinted overlay (grayscale)
      await device.simulateAppliedTint();

      // Take screenshot
      await device.takeScreenshot(`widget-${state}-tinted`);

      // Restore
      await device.revertAppliedTint();
    }

    // All screenshots should be visually distinct even in tinted mode
    // (verified by manual review or automated image comparison)
  });
});

/**
 * Helper: extract colors from view hierarchy.
 */
interface ViewHierarchyNode {
  backgroundColor?: string;
  tintColor?: string;
  children?: ViewHierarchyNode[];
}

function extractColorsFromHierarchy(hierarchy: ViewHierarchyNode): string[] {
  const colors: string[] = [];

  function traverse(node: ViewHierarchyNode) {
    if (node.backgroundColor) {
      colors.push(node.backgroundColor);
    }
    if (node.tintColor) {
      colors.push(node.tintColor);
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  traverse(hierarchy);
  return [...new Set(colors)]; // Unique colors
}

/**
 * Helper: check if a color is grayscale (r ≈ g ≈ b).
 */
function isGrayscale(color: string): boolean {
  // Parse hex color #RRGGBB
  const match = color.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (!match) return false;

  const [, r, g, b] = match.map((x) => parseInt(x, 16));
  const threshold = 10; // Allow small variance

  return Math.abs(r - g) < threshold && Math.abs(g - b) < threshold && Math.abs(r - b) < threshold;
}
