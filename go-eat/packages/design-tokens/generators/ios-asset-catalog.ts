import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseHex } from '../src/contrast.js';
import { LIGHT, TOKEN_NAMES, resolveToken } from '../src/semantics.js';

/**
 * iOS Asset Catalog generator.
 *
 * Emits one Color Set per SEMANTIC token, each with an Any (light) and a Dark variant. The
 * platform picks the variant at render time from the system appearance — which is what lets the
 * widget be theme-aware without any theme data in the payload and without a branch in the widget
 * view (VI.3, contracts/widget-payload.md).
 *
 * Primitives never ship to the bundle. Only Layer 2 names exist on the device, so a native view
 * physically cannot reference `oc.blue.8` — VI.1 is enforced by absence, not by review.
 *
 * Output is a build artifact. Never hand-edit it; run `npm run tokens:generate`.
 */

/** Asset Catalog wants 0–1 floats, not 0–255 ints. */
function toComponents(hex: string): { red: string; green: string; blue: string; alpha: string } {
  const { r, g, b } = parseHex(hex);
  const f = (v: number): string => (v / 255).toFixed(5);
  return { red: f(r), green: f(g), blue: f(b), alpha: '1.00000' };
}

function colorEntry(hex: string, appearance: 'any' | 'dark'): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    color: {
      'color-space': 'srgb',
      components: toComponents(hex),
    },
    idiom: 'universal',
  };

  if (appearance === 'dark') {
    entry.appearances = [{ appearance: 'luminosity', value: 'dark' }];
  }

  return entry;
}

/** `accent.onFill` → `AccentOnFill`. Asset names cannot contain dots. */
export function assetName(token: string): string {
  return token
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function generateIosAssetCatalog(outDir: string): string[] {
  const written: string[] = [];

  // Regenerated wholesale so a token deleted from the map does not linger as a stale Color Set
  // that a view could still compile against.
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  writeFileSync(
    join(outDir, 'Contents.json'),
    `${JSON.stringify({ info: { author: 'go-eat-tokens', version: 1 } }, null, 2)}\n`,
  );

  for (const token of TOKEN_NAMES) {
    const dir = join(outDir, `${assetName(token)}.colorset`);
    mkdirSync(dir, { recursive: true });

    const contents = {
      colors: [
        colorEntry(resolveToken('light', token), 'any'),
        colorEntry(resolveToken('dark', token), 'dark'),
      ],
      info: { author: 'go-eat-tokens', version: 1 },
    };

    const path = join(dir, 'Contents.json');
    writeFileSync(path, `${JSON.stringify(contents, null, 2)}\n`);
    written.push(path);
  }

  return written;
}

/** Sanity check: every token must exist in both themes before we emit anything. */
export function assertGeneratable(): void {
  for (const token of TOKEN_NAMES) {
    if (!LIGHT[token]) throw new Error(`Token ${token} missing from light theme`);
    resolveToken('light', token);
    resolveToken('dark', token);
  }
}
