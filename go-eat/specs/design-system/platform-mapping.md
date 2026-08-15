# Platform Mapping

## Shared constraint: the backdrop is unknown
Widgets composite onto arbitrary wallpaper. Never rely on the OS
background for contrast. Paint surface.base, or opt into platform
material and derive text from the material's own vibrancy roles.

## iOS
Emit an Asset Catalog Color Set per SEMANTIC token (not per
primitive), each with Any/Dark appearance variants. Components
reference `Color("accent.text")`. Primitives never ship to the
bundle.

iOS 18 tinted/accented widget rendering desaturates the widget to a
single system-derived hue and keys off LUMINANCE only. This means:
- Hue can never be the sole carrier of meaning. status.danger and
  status.success must differ in shape/icon/position too, because in
  tinted mode red-8 and teal-9 collapse to near-identical values.
- Verify the widget in tinted mode as a distinct acceptance case.
- Use `.widgetAccentable()` deliberately to choose which layer
  becomes the accent group.

Widgets are static snapshots — no hover, focus, or pressed states.
Delete those variants from the token set; they are dead weight.

## Android
Emit `res/values/colors.xml` + `res/values-night/colors.xml` for
semantic tokens, or a Compose ColorScheme with light/dark builders.

Material You / dynamic color is the real decision. Android 12+
widgets are expected to adopt wallpaper-derived theming. Pick one
and record it as an ADR:
  (a) Dynamic-first: map semantic tokens onto
      `@android:color/system_neutral1_*` and `system_accent1_*`,
      and use Open Color ONLY as the pre-Android-12 fallback.
  (b) Fixed-palette: hold Open Color in both cases, accepting the
      widget will not match the user's system theme.
A minimalist widget usually wants (a) for neutrals and surfaces and
(b) for status colors, since status meaning must not drift with the
wallpaper.

> **RESOLVED for v1 — (b), fixed palette. See ADR-001.**
> The split above is the intuitive answer and it does not hold here.
> Surfaces are the reference side of every contrast pairing, so a
> wallpaper-derived `surface.base` invalidates every text and
> boundary ratio rather than a subset — there is no verifiable
> remainder. The normal remedy, resolving the foreground at runtime
> against the actual surface, needs logic at render time, and
> RemoteViews widgets cannot run logic. Constitution VI.5 makes the
> contrast gate blocking, so v1 holds Open Color in both cases and
> accepts that the widget will not tint to the wallpaper.
> Revisit for surfaces that CAN resolve contrast at runtime — the
> React Native app screens already can.

RemoteViews supports a restricted view/attribute set. Confirm each
token's target attribute is settable via RemoteViews before
specifying it.

## Both
Provide a true-black variant of surface.base for OLED only if
measured; gray-9 (#212529) is intentionally not black and preserves
the ramp's relative contrast. Switching to #000000 changes every
dark-theme ratio and re-triggers the contrast gate.