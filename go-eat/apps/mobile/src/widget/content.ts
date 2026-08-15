import type { WidgetPayload, WidgetState } from '@go-eat/contract-types';

/**
 * T049a/T053a: The one place that decides WHAT each of the six widget states says.
 *
 * `research.md` R2 is unambiguous: there is no shared widget UI layer — `expo-widgets` compiles to
 * Swift, `react-native-android-widget` compiles to RemoteViews, and neither can share a JSX
 * component tree with the other. What CAN be shared, and MUST be to avoid the two states drifting
 * (VI.3, `specs/design-system/widget-state-tokens.md`), is the pure decision of which text, action,
 * and glyph a state renders. Both widget views call this function and differ only in which native
 * primitives paint the result — the "duplicate layout, never values" rule from plan.md.
 *
 * `glyph` exists because iOS tinted rendering strips all hue (FR-038, research R11): color alone
 * can never be the only thing distinguishing two states, so every state also carries a distinct,
 * stable non-color identifier.
 */

export interface WidgetContent {
  state: WidgetState;
  /** Primary line: the restaurant name, or a state headline. */
  title: string;
  /** Secondary line, or `null` when the state has none. */
  subtitle: string | null;
  /** CTA button label, or `null` when the state has no action. */
  actionLabel: string | null;
  /** Where a tap should go — a `goeat://` deep link or an `https://` maps URL — or `null`. */
  tapUrl: string | null;
  /** Stable per-state identifier. Never a color. */
  glyph: 'plate' | 'clock' | 'pin-slash' | 'info' | 'filter' | 'spinner';
  /** True only when refresh is meaningful right now: a live `suggestion`, refresh enabled. */
  showRefresh: boolean;
}

const FALLBACK_LOADING: Omit<WidgetContent, 'state' | 'showRefresh'> = {
  title: 'Finding a restaurant...',
  subtitle: null,
  actionLabel: null,
  tapUrl: null,
  glyph: 'spinner',
};

export function widgetContentFor(payload: WidgetPayload): WidgetContent {
  const showRefresh = payload.refreshEnabled && payload.state === 'suggestion' && payload.item !== null;

  switch (payload.state) {
    case 'suggestion':
    case 'stale': {
      const item = payload.item;
      if (!item) {
        // Contractually `item` is non-null for these two states (widget-payload.ts), but the type
        // system doesn't encode that correlation — guard rather than assume.
        return { state: payload.state, showRefresh: false, ...FALLBACK_LOADING };
      }
      return {
        state: payload.state,
        title: item.name,
        subtitle: `${item.cuisineLabel} · ${item.ratingLabel} · ${item.distanceLabel}`,
        actionLabel: payload.state === 'stale' ? 'STALE' : 'TAP FOR DIRECTIONS',
        tapUrl: item.listingUrl,
        glyph: payload.state === 'stale' ? 'clock' : 'plate',
        showRefresh,
      };
    }

    case 'permission_required':
      return {
        state: 'permission_required',
        title: 'Enable Location',
        subtitle: 'Go-Eat needs your location to suggest a restaurant nearby.',
        actionLabel: 'SETTINGS',
        tapUrl: 'goeat://permission',
        glyph: 'pin-slash',
        showRefresh: false,
      };

    case 'no_results':
      return {
        state: 'no_results',
        title: 'Nothing worth recommending nearby',
        subtitle: null,
        actionLabel: null,
        tapUrl: null,
        glyph: 'info',
        showRefresh: false,
      };

    case 'all_filtered':
      return {
        state: 'all_filtered',
        title: 'All preferences filtered out',
        subtitle: 'Adjust settings in the app',
        actionLabel: null,
        tapUrl: 'goeat://preferences',
        glyph: 'filter',
        showRefresh: false,
      };

    case 'loading':
      return { state: 'loading', showRefresh: false, ...FALLBACK_LOADING };
  }
}
