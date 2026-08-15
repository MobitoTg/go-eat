import type { PrimitiveRef } from './primitives.js';
import { resolvePrimitive } from './primitives.js';

/**
 * Layer 2 — semantic tokens. Transcribed from `specs/design-system/color-semantics.md`, which is
 * the source of truth.
 *
 * Constitution VI.3: this is the ONLY layer components may reference. There is no third layer and
 * there are no component-scoped color tokens.
 *
 * Constitution VI.7: dark is NOT derived by inverting step indices. Each theme has an
 * independently specified and independently verified step assignment — compare `text.secondary`
 * (gray-7 light, gray-4 dark) against `border.strong` (gray-4 light, gray-7 dark) and note they
 * are not mirror images of one another in role, only coincidentally in index.
 *
 * The `verifiedRatio` fields are RECORDED, not estimated (VI.5). The contrast gate recomputes each
 * one from the primitives and fails if a recorded value has drifted from the computed value, so a
 * copied-forward ratio cannot survive a palette change.
 */

export type ThemeName = 'light' | 'dark';

/** What a token is used for, which determines which contrast bar applies. */
export type TokenRole =
  /** A background. Never a foreground; it is the reference side of a pairing. */
  | 'surface'
  /** Foreground text held to 4.5:1. */
  | 'text'
  /** Foreground text held to 3:1 — only valid at ≥18pt, or ≥14pt bold. */
  | 'textLarge'
  /** Interactive or meaningful non-text boundary, held to 3:1 (WCAG 1.4.11). */
  | 'nonText'
  /** Purely decorative. Carries no meaning, so no contrast bar applies. */
  | 'decorative';

export interface SemanticToken {
  primitive: PrimitiveRef;
  role: TokenRole;
  /**
   * The token this one is measured against. Omitted for surfaces (nothing to measure) and for
   * decorative tokens (nothing to prove).
   */
  against?: string;
  /** Recorded ratio to 2dp. The gate asserts this matches the computed value. */
  verifiedRatio?: number;
  note?: string;
}

export type SemanticMap = Record<string, SemanticToken>;

/**
 * LIGHT theme.
 *
 * Trap 1 (color-semantics.md): blue-7 is 4.20:1 on white and FAILS body text. blue-8 is the
 * lightest accessible blue accent on white — do not "brighten" the accent.
 * Trap 2: green is the weakest hue here for light text; even green-9 reaches only 4.37:1, so
 * success uses teal-9.
 */
export const LIGHT: SemanticMap = {
  'surface.base': { primitive: 'white', role: 'surface' },
  'surface.sunken': { primitive: 'oc.gray.1', role: 'surface' },
  'surface.raised': {
    primitive: 'white',
    role: 'surface',
    note: 'Light has no step above white, so elevation is carried by shadow, not by a step (note 6).',
  },
  'surface.accentSubtle': { primitive: 'oc.blue.0', role: 'surface' },

  'border.hairline': { primitive: 'oc.gray.2', role: 'decorative' },
  'border.strong': { primitive: 'oc.gray.4', role: 'decorative' },

  'text.primary': {
    primitive: 'oc.gray.9',
    role: 'text',
    against: 'surface.base',
    verifiedRatio: 15.43,
  },
  'text.secondary': {
    primitive: 'oc.gray.7',
    role: 'text',
    against: 'surface.base',
    verifiedRatio: 8.18,
  },
  'text.tertiary': {
    primitive: 'oc.gray.6',
    role: 'textLarge',
    against: 'surface.base',
    verifiedRatio: 3.32,
    note: 'LARGE ONLY. gray-6 is the contrast cliff — passes 3:1 on white, fails 4.5:1.',
  },
  'text.disabled': {
    primitive: 'oc.gray.5',
    role: 'decorative',
    against: 'surface.base',
    verifiedRatio: 2.07,
    note: 'Disabled text is exempt from WCAG 1.4.3. Never use for meaningful content.',
  },

  'accent.text': {
    primitive: 'oc.blue.8',
    role: 'text',
    against: 'surface.base',
    verifiedRatio: 5.02,
  },
  'accent.fill': {
    primitive: 'oc.blue.8',
    role: 'nonText',
    against: 'surface.base',
    verifiedRatio: 5.02,
  },
  'accent.onFill': {
    primitive: 'white',
    role: 'text',
    against: 'accent.fill',
    verifiedRatio: 5.02,
    note: 'Trap 5: white on accent in LIGHT only. Never white-on-accent in dark.',
  },

  'status.danger': {
    primitive: 'oc.red.8',
    role: 'text',
    against: 'surface.base',
    verifiedRatio: 4.51,
  },
  'status.success': {
    primitive: 'oc.teal.9',
    role: 'text',
    against: 'surface.base',
    verifiedRatio: 5.0,
    note: 'Trap 2: teal-9, not green-9 (4.37:1 — fails).',
  },
  'status.warning': {
    primitive: 'oc.orange.9',
    role: 'textLarge',
    against: 'surface.base',
    verifiedRatio: 4.3,
    note: 'LARGE ONLY.',
  },
};

/**
 * DARK theme — independently specified, not an inversion (VI.7).
 *
 * Trap 4: gray-7 hairlines on gray-9 are 1.89:1 and invisible to many users. Dark elevation is
 * expressed with surface steps (gray-9 → gray-8) at 1.34:1. That number is numerically LOWER than
 * the hairline it replaces and this is deliberate — perceptibility scales with area, so a large
 * filled region at 1.34:1 reads clearly where a 1px line at 1.89:1 disappears. Do not "correct" it.
 */
export const DARK: SemanticMap = {
  'surface.base': { primitive: 'oc.gray.9', role: 'surface' },
  'surface.raised': {
    primitive: 'oc.gray.8',
    role: 'surface',
    against: 'surface.base',
    verifiedRatio: 1.34,
    note: 'Trap 4: elevation as a surface step. Area, not ratio, carries this.',
  },
  'surface.sunken': {
    primitive: 'oc.gray.9',
    role: 'surface',
    note: 'Equals base (note 6). Dark has no step below gray-9 — #000000 would re-trigger every dark ratio — so depth is carried by an inset hairline.',
  },
  'surface.accentSubtle': { primitive: 'oc.blue.9', role: 'surface' },

  'border.hairline': { primitive: 'oc.gray.8', role: 'decorative' },
  'border.strong': {
    primitive: 'oc.gray.7',
    role: 'decorative',
    against: 'surface.base',
    verifiedRatio: 1.89,
    note: 'Trap 4: decorative only in dark. Never carry meaning with this.',
  },

  'text.primary': {
    primitive: 'oc.gray.0',
    role: 'text',
    against: 'surface.base',
    verifiedRatio: 14.63,
  },
  'text.secondary': {
    primitive: 'oc.gray.4',
    role: 'text',
    against: 'surface.base',
    verifiedRatio: 10.32,
  },
  'text.tertiary': {
    primitive: 'oc.gray.5',
    role: 'text',
    against: 'surface.base',
    verifiedRatio: 7.43,
    note: 'Unlike light, tertiary clears 4.5:1 in dark — hence VI.7, roles are not mirrored.',
  },
  'text.disabled': {
    primitive: 'oc.gray.6',
    role: 'decorative',
    against: 'surface.base',
    verifiedRatio: 4.64,
  },

  'accent.text': {
    primitive: 'oc.blue.4',
    role: 'text',
    against: 'surface.base',
    verifiedRatio: 6.23,
  },
  'accent.fill': {
    primitive: 'oc.blue.4',
    role: 'nonText',
    against: 'surface.base',
    verifiedRatio: 6.23,
  },
  'accent.onFill': {
    primitive: 'oc.gray.9',
    role: 'text',
    against: 'accent.fill',
    verifiedRatio: 6.23,
    note: 'Trap 5: gray-9 on accent in DARK. White here would be illegible.',
  },

  'status.danger': {
    primitive: 'oc.red.4',
    role: 'text',
    against: 'surface.base',
    verifiedRatio: 6.66,
  },
  'status.success': {
    primitive: 'oc.teal.3',
    role: 'text',
    against: 'surface.base',
    verifiedRatio: 9.99,
    note: 'teal-3, not teal-4. The map originally labelled this teal-4 while recording teal-3\'s hex and ratio; the gate caught the disagreement. Step 3 here rather than the step 4 the other dark chromatics use — VI.7, themes are not mirrored and roles are not index-matched.',
  },
  'status.warning': {
    primitive: 'oc.orange.4',
    role: 'text',
    against: 'surface.base',
    verifiedRatio: 8.11,
  },
};

export const THEMES: Record<ThemeName, SemanticMap> = { light: LIGHT, dark: DARK };

/** Every semantic token name. Both themes MUST define the same set (VI.7 verification). */
export const TOKEN_NAMES = Object.keys(LIGHT).sort();

/** Resolve a semantic token to its hex value in a given theme. */
export function resolveToken(theme: ThemeName, token: string): string {
  const entry = THEMES[theme][token];
  if (!entry) throw new Error(`Unknown semantic token "${token}" in theme "${theme}"`);
  return resolvePrimitive(entry.primitive);
}
