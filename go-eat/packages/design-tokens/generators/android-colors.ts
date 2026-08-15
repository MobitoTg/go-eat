import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { TOKEN_NAMES, resolveToken } from '../src/semantics.js';

/**
 * Android color resource generator.
 *
 * Emits `res/values/colors.xml` (light) and `res/values-night/colors.xml` (dark) from the fixed
 * semantic map. The Android resource system picks the file by system appearance, so the widget
 * references a name and never branches on theme.
 *
 * **No system-palette branch, by decision.** ADR-001 records why the intuitive hybrid — dynamic
 * neutrals and surfaces, fixed status colors — is not viable: surfaces are the reference side of
 * every contrast pairing, and RemoteViews cannot resolve contrast at runtime. Do not add a
 * `@android:color/system_*` reference here without superseding that ADR.
 *
 * Output is a build artifact. Never hand-edit it; run `npm run tokens:generate`.
 */

/**
 * `accent.onFill` → `goeat_accent_on_fill`.
 *
 * Android resource names must be lowercase with underscores; anything else fails aapt2. The
 * `goeat_` prefix keeps our tokens from colliding with library resources merged into the same
 * namespace.
 */
export function resourceName(token: string): string {
  return `goeat_${token
    .replace(/\./g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()}`;
}

/**
 * RemoteViews can only set a colour on attributes the framework exposes a remotable setter for
 * (`setTextColor`, `setBackgroundColor`, `setColorFilter`, and the tint attributes). This list is
 * the set of jobs our tokens actually do, mapped to how a widget would apply them — checked here
 * so an unsettable token is caught at generation time rather than discovered as a widget that
 * silently renders the wrong colour on device.
 */
const REMOTEVIEWS_APPLICATION: Record<string, string> = {
  surface: 'setBackgroundColor / setInt(…, "setBackgroundColor")',
  text: 'setTextColor',
  textLarge: 'setTextColor',
  nonText: 'setColorFilter / drawable tint',
  decorative: 'setBackgroundColor on a divider View',
};

function xmlDocument(theme: 'light' | 'dark'): string {
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!--',
    '  GENERATED FILE — do not edit.',
    '  Source: packages/design-tokens/src/semantics.ts',
    '  Regenerate: npm run tokens:generate',
    '',
    '  Fixed palette by decision (ADR-001). No Material You / system_* references belong here:',
    '  RemoteViews cannot resolve contrast at runtime, and surfaces are the reference side of',
    '  every pairing the contrast gate verifies.',
    '-->',
    '<resources>',
  ];

  for (const token of TOKEN_NAMES) {
    const hex = resolveToken(theme, token).toUpperCase().replace('#', '');
    lines.push(`    <color name="${resourceName(token)}">#FF${hex}</color>`);
  }

  lines.push('</resources>', '');
  return lines.join('\n');
}

export function generateAndroidColors(resDir: string): string[] {
  const written: string[] = [];

  for (const [theme, dir] of [
    ['light', 'values'],
    ['dark', 'values-night'],
  ] as const) {
    const target = join(resDir, dir);
    mkdirSync(target, { recursive: true });

    const path = join(target, 'colors.xml');
    writeFileSync(path, xmlDocument(theme));
    written.push(path);
  }

  return written;
}

/** How each token is expected to be applied in a RemoteViews tree. Documentation, and a check. */
export function remoteViewsApplication(role: string): string {
  const application = REMOTEVIEWS_APPLICATION[role];
  if (!application) {
    throw new Error(
      `No RemoteViews application path for role "${role}". A token whose colour cannot be set on a ` +
        `RemoteViews attribute cannot be rendered by an Android widget.`,
    );
  }
  return application;
}
