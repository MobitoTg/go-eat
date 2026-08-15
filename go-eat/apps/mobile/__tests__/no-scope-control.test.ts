import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * T056d: Neither widget view exposes a radius, distance, or search-scope control, and no such
 * control exists in the app (FR-003, Principle II).
 */

const IOS_WIDGET = join(__dirname, '..', 'widgets', 'ios', 'GoEatWidget.tsx');
const ANDROID_WIDGET = join(__dirname, '..', 'widgets', 'android', 'GoEatWidget.tsx');

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const FORBIDDEN = /\b(radius|Slider|SearchScope|distanceControl|proximityControl|Stepper)\b/i;

describe('no proximity/radius/search-scope control in either widget (FR-003, Principle II)', () => {
  it('the iOS widget view contains no scope control', () => {
    expect(FORBIDDEN.test(stripComments(readFileSync(IOS_WIDGET, 'utf8')))).toBe(false);
  });

  it('the Android widget view contains no scope control', () => {
    expect(FORBIDDEN.test(stripComments(readFileSync(ANDROID_WIDGET, 'utf8')))).toBe(false);
  });

  it('the shared widget content decision never produces a radius/scope field', () => {
    // widgetContentFor's own output type is fixed (state, title, subtitle, actionLabel, tapUrl,
    // glyph, showRefresh) — asserted structurally in widget-content.test.ts. This test guards the
    // SOURCE, so a future field addition is caught even before a test exercises it.
    const content = readFileSync(join(__dirname, '..', 'src', 'widget', 'content.ts'), 'utf8');
    expect(FORBIDDEN.test(stripComments(content))).toBe(false);
  });
});
