# ADR-001: Android dynamic color (Material You) is not adopted for the v1 widget

**Status**: Accepted
**Date**: 2026-08-14
**Deciders**: Go-Eat maintainers
**Supersedes**: none
**Related**: Constitution VI.5, VI.6, VI.7 · research R2, R10 · `platform-mapping.md` · FR-036, FR-039, SC-015

---

## Context

Android 12+ exposes Material You dynamic color: a palette derived from the user's wallpaper and
surfaced to apps as system color resources. Widgets that adopt it blend into the home screen;
widgets that do not read as slightly foreign next to ones that do.

Go-Eat's only product surface is the widget (Principle I), so "looks foreign on the home screen" is
not a cosmetic concern — it is a concern about the entire product. There is real pressure to adopt
dynamic color, and there is an obvious-looking way to do it safely.

**The obvious compromise**: take neutrals and surfaces from the system palette, keep the status and
accent colors fixed. It sounds like the best of both — the widget picks up the user's wallpaper
where it matters visually, and the colors that carry *meaning* stay under our control and stay
verified.

This ADR exists because that compromise is wrong, and because it is intuitive enough that it will be
proposed again by anyone who has not worked through why.

## Decision

**The v1 Android widget uses the fixed Open Color palette on every Android version.** The generator
emits `res/values/colors.xml` and `res/values-night/colors.xml` from the semantic map in
`packages/design-tokens`, with **no system-palette branch**.

## Why the hybrid fails

It fails structurally, not marginally. Two reasons, and the second closes the escape hatch opened
by the first.

**1. Surfaces are the reference side of every contrast pairing.**

Contrast is a relation, not a property. `text.primary` is not verified in isolation — it is verified
*against* `surface.base`. Look at what the semantic map actually records: nearly every token in both
themes declares `against: surface.base`.

So "dynamic surfaces, fixed foregrounds" does not split the palette into a verified half and an
unverified half. Making the surface wallpaper-derived invalidates **every** text ratio and **every**
boundary ratio simultaneously, because the thing they were all measured against is now unknown until
runtime. There is no useful verified subset left. The compromise keeps the half of the palette that
was never the problem and surrenders the half that everything else depends on.

**2. The standard remedy requires logic, and this renderer cannot run logic.**

A normal Android app solves this at runtime: read the system-derived surface, compute contrast, pick
whichever foreground clears 4.5:1. That is a completely standard technique and it is why dynamic
color is safe in ordinary app UI.

Android home-screen widgets are **RemoteViews** (research R2). They are a serialized view hierarchy
handed to the launcher's process. They cannot execute code at render time — no branch, no
measurement, no conditional color selection. The single platform that would *need* runtime contrast
resolution to make dynamic color safe is the single platform that is structurally incapable of
performing it.

**Why this decides the matter rather than merely complicating it.** Constitution VI.5 makes the
contrast gate blocking and requires verification in CI for both themes. A design whose verifiability
depends on the end user's wallpaper cannot be verified in CI at all — not partially, not with
caveats. The only way to adopt the hybrid would be to weaken VI.5, which would invert the
relationship between the constitution and the work: the principle exists precisely to stop
individual design decisions from re-litigating legibility. So the work adjusts, not the principle.

## Consequences

**Accepted cost.** On Android 12+ the widget will not tint to the user's wallpaper and will look
slightly out of place beside widgets that do. On a product whose entire surface is one widget this
is a genuine cost, recorded deliberately rather than discovered later. Quickstart Scenario 7 notes
it explicitly so it is not filed as a bug.

**What is gained:**

- The contrast gate is exhaustive rather than partial — every pairing, both themes, in CI.
- SC-015's 100% claim becomes achievable rather than aspirational.
- Both themes are independently specified and verified (FR-039, VI.7).
- The Android generator loses an entire conditional branch, and with it the class of bug where a
  widget renders correctly on the developer's wallpaper and illegibly on the user's.
- VI.6 is satisfied for free: the widget already must paint its own opaque `surface.base`, and a
  known base is what makes that paintable.

## Revisit when

A surface exists that **can resolve contrast at runtime**. Two are foreseeable:

- **The React Native app screens** (onboarding, preferences) already can — they run JavaScript and
  can select a foreground against a measured background. Dynamic color is a reasonable candidate
  there in a later release. Note this would make the app and the widget diverge visually, which is
  its own tradeoff.
- **A Glance/Compose widget** could, if the composition ran in a context permitting the measurement.

Neither changes the v1 decision. Revisiting means re-running the contrast gate against whatever
guarantee the new surface can actually offer — not relaxing the gate to fit.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Full dynamic color | Every ratio in the map becomes unverifiable; VI.5 cannot be satisfied at all |
| **Hybrid: dynamic neutrals/surfaces, fixed status colors** | The two reasons above. Surfaces are the reference side of every pairing, and RemoteViews cannot resolve contrast at runtime. This is the intuitive answer and it does not hold |
| Dynamic with a fixed high-contrast fallback | Requires detecting *when* to fall back, which is a runtime decision RemoteViews cannot make |
| Ship dynamic color and verify manually against common wallpapers | "Verified against the wallpapers we happened to try" is not verification; VI.5 requires recorded ratios, and there is no finite set of wallpapers to record against |
