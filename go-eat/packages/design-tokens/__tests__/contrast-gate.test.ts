import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CONTRAST_REQUIREMENTS, contrastRatio, ratio2dp } from '../src/contrast.js';
import { PALETTE_VERSION, PRIMITIVES, resolvePrimitive } from '../src/primitives.js';
import type { ThemeName } from '../src/semantics.js';
import { DARK, LIGHT, THEMES, TOKEN_NAMES, resolveToken } from '../src/semantics.js';

/**
 * THE CONTRAST GATE — blocking (Constitution VI.5).
 *
 * This suite is the mechanism by which "color is a contract" stops being a slogan. It recomputes
 * every pairing from the pinned primitives, for BOTH themes, and fails the build if:
 *
 *   - any text pairing falls below 4.5:1
 *   - any large/bold text or meaningful non-text boundary falls below 3:1
 *   - any RECORDED ratio disagrees with the computed one (VI.5: recorded, never estimated)
 *   - the primitives drift from the pinned source JSON
 *   - the two themes stop defining the same token set
 *
 * It runs in CI on every change and it blocks all widget UI work. Widget rendering must never
 * begin against an unverified token map.
 */

const SPEC_ROOT = join(__dirname, '..', '..', '..', 'specs', 'design-system');

describe('palette provenance (VI.2)', () => {
  const source = JSON.parse(
    readFileSync(join(SPEC_ROOT, 'color-primitives.json'), 'utf8'),
  ) as { version: string; license: string; scale: Record<string, string[]> };

  it('is pinned to the version the ratios were verified against', () => {
    // A version bump invalidates every recorded ratio below, because upstream states colors may
    // change between versions. Bumping requires re-running this gate, not editing this assertion.
    expect(source.version).toBe(PALETTE_VERSION);
    expect(source.license).toBe('MIT');
  });

  it('matches the pinned source JSON exactly', () => {
    for (const [hue, ramp] of Object.entries(source.scale)) {
      const local = (PRIMITIVES as Record<string, readonly string[]>)[hue];
      expect(local).toBeDefined();
      expect(local!.map((h) => h.toUpperCase())).toEqual(ramp.map((h) => h.toUpperCase()));
    }
  });
});

describe('token map structure (VI.3, VI.7)', () => {
  it('defines the same token set in both themes', () => {
    // A token defined in only one theme compiles in that theme and breaks in the other — the
    // failure mode surface.sunken and surface.raised originally had.
    expect(Object.keys(LIGHT).sort()).toEqual(Object.keys(DARK).sort());
  });

  it('is not a step-index inversion of itself (VI.7)', () => {
    // Dark MUST be independently specified. If every dark step were exactly 9 minus the light
    // step, the map would be a mechanical inversion and VI.7 would be violated in spirit even
    // where the ratios happen to pass.
    const stepOf = (ref: string): number | null => {
      const m = ref.match(/^oc\.[a-z]+\.(\d)$/);
      return m ? Number(m[1]) : null;
    };

    const inversions = TOKEN_NAMES.filter((name) => {
      const l = stepOf(LIGHT[name]!.primitive);
      const d = stepOf(DARK[name]!.primitive);
      return l !== null && d !== null && d === 9 - l;
    });

    expect(inversions.length).toBeLessThan(TOKEN_NAMES.length);
  });

  it('records a ratio for every token that declares what it is measured against', () => {
    for (const theme of Object.keys(THEMES) as ThemeName[]) {
      for (const [name, token] of Object.entries(THEMES[theme])) {
        if (token.against) {
          expect(`${theme}/${name}: ${token.verifiedRatio}`).toMatch(/: \d/);
        }
      }
    }
  });
});

describe.each(['light', 'dark'] as ThemeName[])('contrast gate — %s theme', (theme) => {
  const map = THEMES[theme];

  it('meets the required bar for every token with a declared pairing', () => {
    const failures: string[] = [];

    for (const [name, token] of Object.entries(map)) {
      if (!token.against) continue;

      const fg = resolvePrimitive(token.primitive);
      const bg = resolveToken(theme, token.against);
      const actual = contrastRatio(fg, bg);

      const required =
        token.role === 'text'
          ? CONTRAST_REQUIREMENTS.text
          : token.role === 'textLarge'
            ? CONTRAST_REQUIREMENTS.largeText
            : token.role === 'nonText'
              ? CONTRAST_REQUIREMENTS.nonText
              : null;

      // `surface` and `decorative` carry no meaning and are exempt by role, not by oversight.
      if (required === null) continue;

      if (actual < required) {
        failures.push(
          `${name} (${token.role}) vs ${token.against}: ${actual.toFixed(2)}:1 < ${required}:1`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it('has recorded ratios that match the computed values (VI.5 — recorded, never estimated)', () => {
    const drift: string[] = [];

    for (const [name, token] of Object.entries(map)) {
      if (!token.against || token.verifiedRatio === undefined) continue;

      const computed = ratio2dp(resolvePrimitive(token.primitive), resolveToken(theme, token.against));

      // 0.01 tolerance is rounding at 2dp, not slack. A real drift moves the ratio far more.
      if (Math.abs(computed - token.verifiedRatio) > 0.011) {
        drift.push(`${name}: recorded ${token.verifiedRatio}:1 but computed ${computed}:1`);
      }
    }

    expect(drift).toEqual([]);
  });

  it('keeps primary text far clear of the bar, not balanced on it', () => {
    // text.primary is the single most-used pairing in the product. A value that merely scrapes
    // 4.5:1 would leave no headroom for the OS-level contrast and transparency settings users
    // actually enable.
    const ratio = contrastRatio(resolveToken(theme, 'text.primary'), resolveToken(theme, 'surface.base'));
    expect(ratio).toBeGreaterThan(12);
  });
});

describe('the traps the map encodes (color-semantics.md)', () => {
  // These assert the REASONS behind the map, not just its current values. Without them, a future
  // "simplification" could pass every test above while walking straight back into a known failure.

  it('trap 1: blue-7 fails body text on white, which is why the accent is blue-8', () => {
    expect(ratio2dp(resolvePrimitive('oc.blue.7'), '#FFFFFF')).toBeCloseTo(4.2, 1);
    expect(contrastRatio(resolvePrimitive('oc.blue.7'), '#FFFFFF')).toBeLessThan(
      CONTRAST_REQUIREMENTS.text,
    );
    expect(contrastRatio(resolveToken('light', 'accent.text'), '#FFFFFF')).toBeGreaterThanOrEqual(
      CONTRAST_REQUIREMENTS.text,
    );
  });

  it('trap 2: even green-9 fails on white, which is why success is teal-9', () => {
    expect(ratio2dp(resolvePrimitive('oc.green.9'), '#FFFFFF')).toBeCloseTo(4.37, 1);
    expect(contrastRatio(resolvePrimitive('oc.green.9'), '#FFFFFF')).toBeLessThan(
      CONTRAST_REQUIREMENTS.text,
    );
    expect(LIGHT['status.success']!.primitive).toBe('oc.teal.9');
  });

  it('trap 3: yellow can never be text on a light surface', () => {
    expect(
      contrastRatio(resolvePrimitive('oc.yellow.9'), resolvePrimitive('oc.yellow.0')),
    ).toBeLessThan(CONTRAST_REQUIREMENTS.largeText);
  });

  it('trap 4: the dark surface step is lower than the hairline it replaces, deliberately', () => {
    const step = contrastRatio(resolveToken('dark', 'surface.raised'), resolveToken('dark', 'surface.base'));
    const hairline = contrastRatio(resolvePrimitive('oc.gray.7'), resolveToken('dark', 'surface.base'));

    // Perceptibility scales with area: a large filled region at 1.34:1 reads where a 1px line at
    // 1.89:1 disappears. This test exists so nobody "fixes" the smaller number.
    expect(step).toBeLessThan(hairline);
    expect(DARK['border.strong']!.role).toBe('decorative');
  });

  it('trap 5: filled accents invert their text color per theme', () => {
    expect(LIGHT['accent.onFill']!.primitive).toBe('white');
    expect(DARK['accent.onFill']!.primitive).toBe('oc.gray.9');

    // The point of the inversion: white on the dark-theme accent would be unusable.
    expect(contrastRatio('#FFFFFF', resolveToken('dark', 'accent.fill'))).toBeLessThan(
      CONTRAST_REQUIREMENTS.text,
    );
  });

  it('trap 6: elevation runs one direction per theme, and both tokens resolve in both', () => {
    for (const theme of ['light', 'dark'] as ThemeName[]) {
      expect(() => resolveToken(theme, 'surface.raised')).not.toThrow();
      expect(() => resolveToken(theme, 'surface.sunken')).not.toThrow();
    }
    // Light stacks upward from white (raised === base); dark stacks downward (sunken === base).
    expect(resolveToken('light', 'surface.raised')).toBe(resolveToken('light', 'surface.base'));
    expect(resolveToken('dark', 'surface.sunken')).toBe(resolveToken('dark', 'surface.base'));
  });
});

describe('contrast math', () => {
  it('matches the WCAG reference points', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    // Order must not matter — the lighter color is always the numerator.
    expect(contrastRatio('#1971C2', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#1971C2'), 10);
  });
});
