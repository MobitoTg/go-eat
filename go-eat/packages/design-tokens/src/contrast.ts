/**
 * WCAG 2.x relative luminance and contrast ratio.
 *
 * Constitution VI.5: "Ratios are recorded, not estimated." This module is what makes that
 * enforceable — every ratio in `semantics.ts` is recomputed from the primitives by the contrast
 * gate rather than copied forward from a previous revision.
 *
 * Implements WCAG 2.1 §1.4.3 / §1.4.11 exactly. Do not substitute a perceptual model (APCA, CIE
 * ΔL*) here: the thresholds in the constitution are WCAG thresholds, and mixing a different metric
 * with WCAG numbers would produce ratios that pass the gate while failing an actual audit.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse `#RGB` or `#RRGGBB` into 0–255 channels. */
export function parseHex(hex: string): Rgb {
  const raw = hex.trim().replace(/^#/, '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a valid hex color: ${hex}`);
  }

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/**
 * WCAG relative luminance.
 *
 * The 0.03928 breakpoint and 2.4 exponent are from the spec verbatim. The linearization is the
 * whole point — averaging raw sRGB channels would overstate the contrast of mid-tones, which is
 * precisely the range where the palette's traps live (gray-6, blue-7).
 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);

  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Contrast ratio between two colors, 1:1 to 21:1.
 *
 * Order-independent by construction — the lighter color is always the numerator.
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Rounded to 2dp, the precision the semantic map records ratios at. */
export function ratio2dp(a: string, b: string): number {
  return Math.round(contrastRatio(a, b) * 100) / 100;
}

/**
 * The contrast bars from Constitution VI.5.
 *
 * `largeText` is 3:1 rather than 4.5:1 per WCAG 1.4.3, which defines large as ≥18pt, or ≥14pt
 * bold. A token marked `largeOnly` in the semantic map is asserting that it will never be used
 * below that size — the gate can check the ratio, but only a human can check the usage.
 */
export const CONTRAST_REQUIREMENTS = {
  /** Body text and anything below the large-text threshold. */
  text: 4.5,
  /** ≥18pt, or ≥14pt bold. */
  largeText: 3.0,
  /** Interactive boundaries and meaningful non-text (WCAG 1.4.11). */
  nonText: 3.0,
} as const;

export type ContrastRequirement = keyof typeof CONTRAST_REQUIREMENTS;

export function meetsRequirement(
  foreground: string,
  background: string,
  requirement: ContrastRequirement,
): boolean {
  return contrastRatio(foreground, background) >= CONTRAST_REQUIREMENTS[requirement];
}
