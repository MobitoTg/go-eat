import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { FIXTURE_WEIGHTS } from './fixtures/index.js';

/**
 * T064: No weight key or source identifier names a brand or business (FR-008, Constitution III).
 *
 * `healthLean` is keyed by PROVIDER PLACE TYPE only. A brand name would be capitalized, contain a
 * space, an apostrophe, or otherwise fail to look like a Google Places `snake_case` type — this
 * guard checks the shape of every key rather than maintaining a denylist of specific brand names,
 * which would itself be exactly the kind of hardcoded list Principle III forbids.
 */

const PROVIDER_TYPE_SHAPE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

describe('healthLean keys are provider place types, never brand names (FR-008)', () => {
  it('every key matches the shape of a Google Places type — lowercase, snake_case', () => {
    for (const key of Object.keys(FIXTURE_WEIGHTS.healthLean)) {
      expect(key).toMatch(PROVIDER_TYPE_SHAPE);
    }
  });

  it('no key contains a space, apostrophe, or capital letter', () => {
    for (const key of Object.keys(FIXTURE_WEIGHTS.healthLean)) {
      expect(key).not.toMatch(/[\sA-Z']/);
    }
  });
});

describe('the source tree contains no hardcoded venue name or brand list (Constitution III)', () => {
  it('no .ts file under src/ references `candidate.name` for scoring or filtering purposes', () => {
    // Scoring and filtering may read `.types`, `.dietaryTags`, `.businessStatus`, `.openNow`,
    // `.rating`, `.reviewCount`, `.location` — never `.name`. Reading `.name` anywhere outside a
    // display/label context is exactly how a brand list would sneak back in.
    const srcDir = join(__dirname, '..', 'src');
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);
        return statSync(path).isDirectory() ? walk(path) : [path];
      });

    const offenders = walk(srcDir).filter((file) => {
      if (!file.endsWith('.ts')) return false;
      const source = readFileSync(file, 'utf8');
      return /candidate\.name\b/.test(source);
    });

    expect(offenders).toEqual([]);
  });
});
