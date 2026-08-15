/**
 * The app→widget contract, from `contracts/widget-payload.md`.
 *
 * This is the ONLY channel through which the two widget implementations receive data. Widgets do
 * not run JavaScript — iOS views compile to Swift, Android widgets are RemoteViews — so anything
 * this payload leaves undone must be implemented twice, in two languages, and tested on two
 * simulators. Every string here is therefore already truncated, rounded, abbreviated, and
 * unit-converted.
 *
 * Note what is NOT here: no color, no theme, no scores, no sibling items, no counts. Theme is
 * resolved natively from the generated semantic color assets; the payload carries the *state*,
 * the platform carries the *appearance*.
 */

import type { LocationAnchor, SuggestionItem } from './suggestion-api.js';

/**
 * Payload schema version. Bump on any breaking field change.
 *
 * App and widget ship in the same binary, but during an update a widget can briefly read a payload
 * written by the previous app version. An unknown version renders `stale` rather than crashing —
 * the next cycle corrects it.
 */
export const PAYLOAD_VERSION = 1;

/**
 * Every renderable state. Enumerated so a missing case is a compile error rather than a blank
 * widget, which the constitution forbids ("honest states over empty ones").
 *
 * Widgets MUST handle all six explicitly. There is no default branch.
 */
export type WidgetState =
  /** Valid batch, non-empty. Renders name, cuisine, rating, distance (FR-002). */
  | 'suggestion'
  /** Location permission not granted. Taps into the app's permission step (FR-004). */
  | 'permission_required'
  /** Batch returned zero items. "Nothing worth recommending nearby." */
  | 'no_results'
  /** Candidates existed; exclusions removed all of them. Links into preferences. */
  | 'all_filtered'
  /** Network or location fix unavailable. Last item + stale indicator, never shown as current. */
  | 'stale'
  /** First render, no cycle completed. Never a placeholder restaurant. */
  | 'loading';

export const WIDGET_STATES: readonly WidgetState[] = [
  'suggestion',
  'permission_required',
  'no_results',
  'all_filtered',
  'stale',
  'loading',
] as const;

/**
 * The displayable subset of `SuggestionItem`.
 *
 * `providerPlaceId` is deliberately dropped — the widget has no use for it, and the deep links are
 * already built. Rendering is the whole job.
 */
export interface WidgetItem {
  name: string;
  cuisineLabel: string;
  ratingLabel: string;
  reviewCountLabel: string;
  distanceLabel: string;
  listingUrl: string;
  fallbackUrl: string;
}

export interface WidgetPayload {
  version: number;
  state: WidgetState;
  /** ISO 8601. When the payload was written. */
  updatedAt: string;
  /** True when displaying data the app could not refresh. Drives the stale indicator. */
  isStale: boolean;
  /** False hides the refresh control entirely (FR-019). */
  refreshEnabled: boolean;
  /** Non-null ONLY when `state === 'suggestion'` or `state === 'stale'`. */
  item: WidgetItem | null;
}

/** Shared-storage locations. Both widget implementations read from exactly these. */
export const PAYLOAD_STORAGE = {
  /** iOS App Group shared container key. */
  ios: { key: 'goeat.widget.payload' },
  /** Android SharedPreferences file and key. */
  android: { preferences: 'goeat_widget', key: 'payload' },
} as const;

/**
 * The app-local batch record, from data-model.md's `SuggestionBatch` entity.
 *
 * Distinct from `WidgetPayload`: this carries the FULL ordered batch and the cursor, because the
 * refresh handler (a native App Intent on iOS, a broadcast receiver on Android — FR-005) must be
 * able to advance the cursor and recompute a `WidgetPayload` WITHOUT launching the JS app. Both
 * live in the same shared-storage container (data-model.md storage boundaries table), under
 * separate keys, so the refresh handler never needs the app process running.
 *
 * `WidgetPayload` never carries this shape directly — no score, no rank, no sibling reference
 * reaches the render layer (FR-001, Principle II). This type is the one place `items` and `cursor`
 * are allowed to travel together.
 */
export interface SuggestionBatch {
  cycleId: string;
  seed: string;
  issuedAt: string;
  anchor: LocationAnchor;
  /** Cheap equality check for FR-021 preference-change invalidation. */
  preferencesHash: string;
  /** Ordered, render-ready, 0–5 items. The client never reorders (FR-013). */
  items: SuggestionItem[];
  /** Index of the displayed item. `0 <= cursor < items.length` whenever items is non-empty. */
  cursor: number;
  /** Mirrors backend config (FR-019). False ⇒ refresh is never called, cursor stays 0. */
  refreshEnabled: boolean;
}

export const BATCH_STORAGE = {
  ios: { key: 'goeat.widget.batch' },
  android: { preferences: 'goeat_widget', key: 'batch' },
} as const;
