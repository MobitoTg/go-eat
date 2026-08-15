import type { ThemeName } from './semantics.js';
import { TOKEN_NAMES, resolveToken } from './semantics.js';

/**
 * Semantic tokens as a TypeScript module, for the React Native app surfaces.
 *
 * The widgets read the *generated native* assets (Asset Catalog / colors.xml) because they cannot
 * run JavaScript. The app screens are the opposite case: they are styled in JS and cannot read a
 * native asset catalog at all. Both must nonetheless resolve to the same semantic map — FR-034
 * covers the app as well as the widget, and two divergent sources of colour would defeat the
 * point of having one.
 *
 * So this file is a THIRD emitter of the same map, not a second source of truth. It resolves
 * through `semantics.ts` at import time; it never restates a value.
 */

export type ColorTokens = Record<string, string>;

function buildTheme(theme: ThemeName): ColorTokens {
  const out: ColorTokens = {};
  for (const name of TOKEN_NAMES) {
    out[name] = resolveToken(theme, name);
  }
  return out;
}

export const lightTokens: ColorTokens = buildTheme('light');
export const darkTokens: ColorTokens = buildTheme('dark');

export const colorTokens: Record<ThemeName, ColorTokens> = {
  light: lightTokens,
  dark: darkTokens,
};

/**
 * Resolve a semantic token for the active theme.
 *
 * Throws on an unknown name rather than falling back to a default colour. A silent fallback is how
 * an unverified colour reaches a screen — the failure should be loud and at development time.
 */
export function color(theme: ThemeName, token: string): string {
  const value = colorTokens[theme][token];
  if (!value) {
    throw new Error(
      `Unknown semantic token "${token}". Available: ${TOKEN_NAMES.join(', ')}`,
    );
  }
  return value;
}

export { TOKEN_NAMES };
export type { ThemeName };
