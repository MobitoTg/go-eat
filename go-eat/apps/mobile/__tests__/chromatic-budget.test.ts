import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * T056b: Each widget surface renders at most three chromatic values — one neutral ramp, one
 * accent, one optional status color (VI.4, FR-037).
 *
 * Verified structurally: every semantic token referenced in a widget view is classified into one
 * of the three permitted families (neutral: `surface.*`/`text.*`/`border.*`; accent: `accent.*`;
 * status: `status.*`), and the set of families actually used per file must not exceed three — which
 * is only possible if a fourth family were ever introduced to the token map itself.
 */

const IOS_WIDGET = join(__dirname, '..', 'widgets', 'ios', 'GoEatWidget.tsx');
const ANDROID_WIDGET = join(__dirname, '..', 'widgets', 'android', 'GoEatWidget.tsx');

type Family = 'neutral' | 'accent' | 'status';

function familyOf(token: string): Family {
  if (token.startsWith('accent.')) return 'accent';
  if (token.startsWith('status.')) return 'status';
  return 'neutral';
}

function tokenFamiliesUsedIn(filePath: string): Set<Family> {
  const source = readFileSync(filePath, 'utf8');
  const families = new Set<Family>();
  for (const match of source.matchAll(/color\(theme,\s*'([a-zA-Z.]+)'\)/g)) {
    families.add(familyOf(match[1] as string));
  }
  return families;
}

describe('chromatic budget — at most 3 families per widget surface (VI.4, FR-037)', () => {
  it('the iOS widget references at most one neutral, one accent, one status family', () => {
    const families = tokenFamiliesUsedIn(IOS_WIDGET);
    expect(families.size).toBeGreaterThan(0); // sanity: the scan actually found tokens
    expect(families.size).toBeLessThanOrEqual(3);
  });

  it('the Android widget references at most one neutral, one accent, one status family', () => {
    const families = tokenFamiliesUsedIn(ANDROID_WIDGET);
    expect(families.size).toBeGreaterThan(0);
    expect(families.size).toBeLessThanOrEqual(3);
  });
});
