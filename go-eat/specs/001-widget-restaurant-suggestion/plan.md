# Implementation Plan: Go-Eat Widget Restaurant Suggestion

**Branch**: `001-widget-restaurant-suggestion` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-widget-restaurant-suggestion/spec.md`

## Summary

Go-Eat tells the user where to eat from a home screen widget: one restaurant, no list, no browsing,
no radius control. A backend service fetches a batch of five nearby candidates from Google Places in
a single request, scores them on rating, review volume, cuisine health-lean and distance, and returns
a render-ready ordered batch. The client stores that batch in platform shared storage; refreshing
advances a cursor through it with no further network call and wraps at the end. Tapping hands off to
the restaurant's Google Maps listing.

The technical approach is shaped by one hard platform fact discovered in Phase 0: **home screen
widgets cannot run JavaScript, and iOS and Android require entirely separate widget implementations**
(`expo-widgets` is iOS-only). Everything therefore pushes logic away from the widget — the widget is
a dumb renderer of a payload assembled elsewhere, and scoring lives in a pure, IO-free package the
backend imports and Jest can test without a simulator.

## Technical Context

**Language/Version**: TypeScript 5.x throughout. Widget views compile to native Swift (iOS, via
`@expo/ui`) and Android RemoteViews — neither is hand-written by us.

**Primary Dependencies**: Expo SDK 57+, React Native (New Architecture), `expo-widgets` (iOS
widget), `react-native-android-widget` (Android widget), `expo-location`, `expo-router`. Backend:
Node 22 + Fastify. Provider: Google Places API (New).

**Storage**: Device-local only. iOS App Group (`group.<bundle id>`), Android `SharedPreferences`,
plus `expo-secure-store`/`AsyncStorage` for preferences. **No server-side user database** — the
backend is stateless per request.

**Testing**: Jest (pure logic + contract tests, Node, no simulator). Maestro or Detox for
integration flows on iOS Simulator and Android emulator. Golden-fixture suite for scoring regression.
Blocking contrast gate over the semantic token map, both themes, in CI (Principle VI.5).

**Target Platform**: iOS 17+ (App Intent–driven widget refresh), Android 12+ (Glance/RemoteViews).
Backend on any Node host.

**Project Type**: Mobile app + supporting API (Option 3).

**Performance Goals**: Widget refresh renders the next candidate in under 1s (SC-006) — achievable
because refresh is a local cursor increment. Cycle start (network) target under 2s. Widget glance-to-
comprehension under 3s (SC-001) is a layout concern, not a latency one.

**Constraints**: Exactly one provider request per cycle (FR-014/FR-015). No provider credentials on
the client. No retained location history or suggestion history (FR-022a, FR-031). Weights tunable
without a client release (FR-009). Refresh removable by configuration without touching selection or
presentation (FR-019). Everything exercisable in simulator/emulator (SC-012).

**Scale/Scope**: v1 MVP. ~4 app screens (onboarding, permission, preferences, widget-install guide),
2 widget implementations, 2 backend endpoints, 1 provider adapter, 1 scoring core.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-Phase 0 | Post-Phase 1 |
|---|---|---|---|
| I. The Widget Is the Product | No work that isn't in service of the widget; no rebuilt detail view | PASS | PASS — tap-through deep links out (R8); no detail view planned |
| II. One Decision, Never a Menu | Exactly one suggestion; no user-facing tuning knobs | PASS | PASS — payload carries one item at a time; weights are server-side operator config |
| III. Tunable Models, Not Hardcoded Rules | Weights external and adjustable without a client release; no name lists | PASS | PASS — weights served from backend config (R5); `selection-core` takes weights as an argument |
| IV. Deterministic, Simulator-Verifiable | Seeded randomness, injectable inputs, scoring assertable separately | PASS | PASS — `selection-core` is pure and IO-free; seed is an explicit parameter; golden fixtures (R9) |
| V. Location Is Borrowed, Not Kept | No retained location or suggestion history; no accounts; no client-side keys | PASS | PASS — stateless backend, device-local storage, provider key server-side only |
| VI. Color Is a Contract, Not a Choice | Semantic tokens only; contrast gated in CI for both themes; widget paints its own backdrop | PASS | PASS — `design-tokens` generates platform assets from one recorded map (R10); contrast gate runs in Jest; no color in the payload |

**Product & Platform Constraints check**

- Single provider — PASS (Google Places only, R3).
- One provider call per cycle — PASS (cursor is client-side, R6).
- Simulator parity — **PASS WITH NOTE**: `expo-widgets` cannot run in Expo Go, so widget work
  requires development builds. Simulator/emulator testing is preserved; the workflow changes from
  `expo start` to `expo run:ios` / `expo run:android`. Recorded in R9 and quickstart.md.
- Provisional mechanics stay removable — PASS. Refresh is isolated behind a `refreshEnabled` config
  flag; the cursor module is the only code that would be deleted. Design detail in data-model.md.
- Honest states over empty ones — PASS. Widget states are an explicit enum in the payload contract,
  so a missing state is a type error rather than a blank widget.

**Result: PASS.** No violations requiring justification. Two items in Complexity Tracking are
platform-imposed rather than chosen, and are recorded there for transparency.

**Three gates carried into implementation** (none blocks Phase 1 design):

1. **Places API pricing and terms unverified** (R3). Must be confirmed before provider code is
   written — it validates the cost model and the caching/retention posture.
2. **Widget location acquisition spike** (R7). Must be proven in a development build before widget
   UI is polished.
3. **Android dynamic color ADR** (R10). Must be decided before the Android token generator is
   written, because it determines whether neutrals resolve from the system palette or from Open
   Color. Recommended: hybrid — dynamic neutrals and surfaces, fixed status colors.

## Project Structure

### Documentation (this feature)

```text
specs/001-widget-restaurant-suggestion/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── suggestion-api.yaml
│   ├── widget-payload.md
│   └── deep-link.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

Design law lives outside this feature, because it outlives it and the constitution references it
directly:

```text
specs/design-system/
├── color-primitives.json   # Open Color v1.9.1, pinned. The only place hex literals are allowed
├── color-semantics.md      # Semantic token map, both themes, with recorded contrast ratios
└── platform-mapping.md     # iOS Asset Catalog / Android colors.xml emission, tinted mode, ADR
```

### Source Code (repository root)

```text
apps/
└── mobile/                        # Expo app — the setup surface + both widgets
    ├── app/                       # expo-router screens
    │   ├── onboarding/            # purpose, permission rationale, widget-install guide
    │   └── preferences/           # dietary preferences and exclusions
    ├── src/
    │   ├── cycle/                 # cursor advance/wrap, invalidation predicates, cycle start
    │   ├── storage/               # App Group / SharedPreferences bridge
    │   ├── location/              # expo-location wrapper, anchor freshness
    │   └── api/                   # suggestion-api client
    ├── widgets/
    │   ├── ios/                   # expo-widgets @expo/ui views — render only
    │   └── android/               # react-native-android-widget views — render only
    └── __tests__/

packages/
├── selection-core/                # PURE: scoring, near-tie shuffle, ordering. No IO.
│   ├── src/
│   └── __tests__/                 # golden fixtures live here
├── contract-types/                # shared payload types, generated from contracts/
└── design-tokens/                 # PURE: semantic map → platform color assets
    ├── src/                       # primitives + semantic map as data; contrast math
    ├── generators/                # iOS Asset Catalog, Android colors.xml + values-night
    └── __tests__/                 # the blocking contrast gate, both themes

services/
└── suggestion-api/                # stateless backend
    ├── src/
    │   ├── routes/                # POST /v1/cycle, GET /v1/config
    │   ├── provider/              # Google Places adapter (the only place the key lives)
    │   └── config/                # scoring weights, thresholds, refreshEnabled
    └── __tests__/
```

**Structure Decision**: Mobile + API. The split is forced by the constitution rather than chosen for
convenience — Principle III requires weights tunable without a client release and Principle V
requires provider credentials off the device, and both are only satisfiable with a backend.

`packages/selection-core` is deliberately isolated and IO-free: it is where Principle IV becomes
mechanically enforceable, since scoring can be exercised in plain Node against fixtures with no
simulator, no network, and no provider key.

`apps/mobile/widgets/ios` and `apps/mobile/widgets/android` are parallel implementations by
necessity (R2), not by preference. Both are render-only. Any logic appearing in either directory is
a design failure, because it must then be written and tested twice.

`packages/design-tokens` exists for the same reason as `selection-core`: it is the second place
where a constitutional rule becomes mechanically enforceable rather than aspirational. It holds the
semantic map as data, computes contrast from the primitives, and **generates** the iOS Asset Catalog
Color Sets and Android `colors.xml` / `values-night/colors.xml` at build time. Nothing hand-writes a
color on either platform, so the R2 duplication tax does not extend to the palette — the two widgets
duplicate layout, never values. Primitives never ship to either bundle; only semantic tokens do.

**Where color does not go**: not into the widget payload. Theme is selected by the OS and resolved
natively from the generated assets at render time, so `contracts/widget-payload.md` stays purely
informational. The payload carries the *state*; the platform carries the *appearance*.

## Complexity Tracking

> Both entries are platform- or constitution-imposed, not discretionary. Recorded for transparency.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Two separate widget implementations (iOS + Android) | `expo-widgets` is iOS-only; Android widgets use a different rendering model entirely (R2). There is no cross-platform widget UI layer available | A single shared widget UI does not exist as an option. Mitigated by making both widgets pure renderers so the duplicated surface is layout only |
| Backend service for a device-local product | Principle III (tune weights without a client release) and Principle V (no provider key on the client) both require it. Provider terms also restrict client-side data handling | Client-only with a bundled key was rejected: it leaks credentials, freezes weights until the next App Store release, and would put scoring in the one place that cannot be tested without a simulator |
