# Color Semantics

## Step-band theory
The 0–9 scale is a perceived-brightness axis, not a saturation axis.
Bands have fixed jobs, and the job is stable across every hue:

  0–1  page & card surfaces, tinted fills, hover washes
  2–3  dividers, hairlines, disabled surfaces
  4–5  disabled text, placeholders, decorative strokes
  6    the contrast cliff — passes 3:1 on white, FAILS 4.5:1
  7–9  body text, icons, accents on LIGHT surfaces
  3–4  body text, icons, accents on DARK surfaces

Because equal steps carry equal perceived brightness, re-theming is a
hue substitution at a fixed step. Changing `blue-8` to `violet-8`
requires no other change. Changing `blue-8` to `blue-5` breaks the
hierarchy. Constrain re-theming to the hue axis.

## Neutral temperature
Open Color's gray is cool/blue-leaning (gray-7 = #495057, B>G>R).
Cool accents (blue, indigo, violet, teal, cyan) sit harmoniously on
it. Warm accents (orange, yellow) read as deliberate tension — use
them for a single alert affordance, never as the ambient accent.

## Semantic tokens — LIGHT
| token                  | primitive   | hex      | verified            |
|------------------------|-------------|----------|---------------------|
| surface.base           | white       | #FFFFFF  | —                   |
| surface.sunken         | oc.gray.1   | #F1F3F5  | —                   |
| surface.raised         | white       | #FFFFFF  | elevation = shadow  |
| surface.accentSubtle   | oc.blue.0   | #E7F5FF  | —                   |
| border.hairline        | oc.gray.2   | #E9ECEF  | decorative only     |
| border.strong          | oc.gray.4   | #CED4DA  | decorative only     |
| text.primary           | oc.gray.9   | #212529  | 15.43:1 on base     |
| text.secondary         | oc.gray.7   | #495057  |  8.18:1 on base     |
| text.tertiary          | oc.gray.6   | #868E96  |  3.32:1 LARGE ONLY  |
| text.disabled          | oc.gray.5   | #ADB5BD  |  2.07:1 non-text    |
| accent.text            | oc.blue.8   | #1971C2  |  5.02:1 on base     |
| accent.fill            | oc.blue.8   | #1971C2  |  5.02:1 w/ white    |
| accent.onFill          | white       | #FFFFFF  |                     |
| status.danger          | oc.red.8    | #E03131  |  4.51:1 on base     |
| status.success         | oc.teal.9   | #087F5B  |  5.00:1 on base     |
| status.warning         | oc.orange.9 | #D9480F  |  4.30:1 LARGE ONLY  |

## Semantic tokens — DARK
| token                  | primitive   | hex      | verified            |
|------------------------|-------------|----------|---------------------|
| surface.base           | oc.gray.9   | #212529  | —                   |
| surface.raised         | oc.gray.8   | #343A40  | 1.34:1 vs base      |
| surface.sunken         | oc.gray.9   | #212529  | = base, see note 6  |
| surface.accentSubtle   | oc.blue.9   | #1864AB  | —                   |
| border.hairline        | oc.gray.8   | #343A40  | see note            |
| border.strong          | oc.gray.7   | #495057  | 1.89:1 — see note   |
| text.primary           | oc.gray.0   | #F8F9FA  | 14.63:1 on base     |
| text.secondary         | oc.gray.4   | #CED4DA  | 10.32:1 on base     |
| text.tertiary          | oc.gray.5   | #ADB5BD  |  7.43:1 on base     |
| text.disabled          | oc.gray.6   | #868E96  |  4.64:1 on base     |
| accent.text            | oc.blue.4   | #4DABF7  |  6.23:1 on base     |
| accent.fill            | oc.blue.4   | #4DABF7  |  6.23:1 w/ gray.9   |
| accent.onFill          | oc.gray.9   | #212529  |                     |
| status.danger          | oc.red.4    | #FF8787  |  6.66:1 on base     |
| status.success         | oc.teal.3   | #63E6BE  |  9.99:1 on base     |
| status.warning         | oc.orange.4 | #FFA94D  |  8.11:1 on base     |

## Traps this map encodes (do not "simplify" these)
1. blue-7 (#1C7ED6) is 4.20:1 on white — it FAILS body text. The
   lightest accessible blue accent on white is blue-8. Same story
   for white-on-fill: white on blue-7 is also 4.20:1.
2. Green is the weakest hue in this palette for light-theme text.
   Even green-9 reaches only 4.37:1. Use teal-9 (5.00:1) for
   "success" on light. Green is fine on dark (green-4 = 8.83:1).
3. Yellow can never be text on a light surface. yellow-9 on
   yellow-0 is 2.83:1. Yellow is a fill/indicator hue only.
4. In dark theme, gray-7 borders on gray-9 are 1.89:1 and are
   invisible to many users. Express dark-theme elevation with
   surface steps (gray-9 → gray-8), not hairlines.
   Note the surface step is 1.34:1 — numerically LOWER than the
   1.89:1 hairline it replaces. This is not a contradiction:
   perceptibility scales with area, and a large filled region at
   1.34:1 reads clearly where a 1px line at 1.89:1 disappears.
   Do not "correct" this by restoring hairlines.
5. Filled accents invert their text color per theme: white on the
   accent in light, gray-9 on the accent in dark. Never white-on-
   accent in dark theme.
6. Elevation runs in ONE direction per theme, and the directions
   are opposite. Light has no step above white, so surface.raised
   is white and elevation is carried by shadow. Dark has no step
   below gray-9 — reaching for #000000 would re-trigger every
   dark-theme ratio (see platform-mapping.md) — so surface.sunken
   equals base and depth is carried by an inset hairline. Both
   tokens are defined in both themes so a component never
   references a token that resolves in only one of them.