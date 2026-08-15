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
