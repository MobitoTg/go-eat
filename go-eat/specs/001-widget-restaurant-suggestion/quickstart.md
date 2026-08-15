# Quickstart: Go-Eat Widget Restaurant Suggestion

**Feature**: `001-widget-restaurant-suggestion` | **Date**: 2026-08-14

How to run the feature and prove it works. Validation scenarios map to the spec's acceptance
criteria. Implementation detail belongs in `tasks.md`, not here.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node 22+ | Backend and tooling |
| Expo SDK 57+ | `expo-widgets` requires it |
| Xcode 16+ with iOS 17+ Simulator | App Intent widget refresh needs iOS 17+ |
| Android Studio, API 31+ emulator | Use a Google APIs image so Maps deep links resolve |
| Google Places API key | Backend `.env` only — **never** in the client |

> **Expo Go will not work.** `expo-widgets` is unavailable in Expo Go, so all widget work requires a
> development build. Simulator/emulator testing is unaffected (SC-012) — `expo run:ios` and
> `expo run:android` replace `expo start`.

> **Before writing provider code**, confirm current Google Places pricing, per-SKU free allowances,
> and content retention terms (research R3). The cost model in R4 depends on it.

---

## Setup

```bash
npm install

# Backend config — the only place the provider key lives
cp services/suggestion-api/.env.example services/suggestion-api/.env
# set GOOGLE_PLACES_API_KEY

npm run dev --workspace=services/suggestion-api   # http://localhost:3000
```

Point the client at the local backend. Note that `localhost` differs per platform:

```bash
# apps/mobile/.env
EXPO_PUBLIC_API_URL=http://localhost:3000        # iOS Simulator
# EXPO_PUBLIC_API_URL=http://10.0.2.2:3000       # Android emulator
```

Build and install a development build (first run is slow; subsequent runs are incremental):

```bash
npm run ios --workspace=apps/mobile       # or: npx expo run:ios
npm run android --workspace=apps/mobile   # or: npx expo run:android
```

---

## Tier 1 — Logic validation (no simulator, no network, no API key)

The fastest and highest-value loop. Most confidence should come from here.

```bash
npm test --workspace=packages/selection-core
```

**Proves**:

| Check | Spec |
|---|---|
| Distance never solely determines the winner | FR-006 |
| Healthier-leaning venues outrank comparable fast food | FR-007 |
| High rating on few reviews is tempered by volume | FR-010 |
| Hard filters run before scoring; excluded venues never enter the shuffle | FR-011, FR-012 |
| Same inputs + same seed → identical ordering | FR-013, SC-014 |
| Near-tied candidates reorder across seeds; non-tied keep strict order | FR-022 |
| Cursor advances and wraps, including short batches | FR-016, FR-017, FR-018 |
| No weight key names a brand or business | FR-008 |

### Scoring regression gate

```bash
npm run fixtures:report --workspace=packages/selection-core
```

Prints rankings across the fixed coordinate sample (dense urban, suburban, sparse rural). **Any
change touching scoring, weights, or candidate assembly must include this report's before/after.**
Unexplained movement blocks the change (Constitution: scoring regression gate).

To verify a weight is not decorative (Constitution III), change it and confirm the report moves.

The report is printed for humans; the thresholds are asserted separately and block the build:

| Check | Spec |
|---|---|
| ≥ 80% of suggestions rated ≥ 4.0 with ≥ 25 reviews | SC-005 |
| ≤ 10% in fast-food / takeaway category types | SC-005 |
| First-shown venue varies across ≥ 50% of cycles | SC-013 |

### Contrast gate (blocking)

```bash
npm run contrast:gate --workspace=packages/design-tokens
```

Recomputes every semantic pairing from the pinned Open Color primitives, for **both** themes, and
asserts text ≥ 4.5:1, large/bold ≥ 3:1, and interactive or meaningful non-text boundaries ≥ 3:1. It
also asserts that each ratio recorded in `specs/design-system/color-semantics.md` matches the
computed value — recorded, never estimated (Constitution VI.5).

**This gate blocks all widget UI work.** Widget rendering must not begin against an unverified token
map. It runs in CI on every change; run it locally before touching color.

```bash
npm run tokens:generate      # regenerate iOS Asset Catalog + Android colors.xml from the map
```

Never hand-edit the generated platform color assets — they are outputs. A raw hex literal in
component code is a build failure (VI.1).

---

## Tier 2 — Contract validation (no simulator)

```bash
npm test --workspace=services/suggestion-api
```

**Proves**:

- Responses conform to `contracts/suggestion-api.yaml`.
- `POST /v1/cycle` issues **exactly one** provider request (SC-007) — asserted against a spy on the
  provider adapter, so a regression to per-refresh calls fails loudly.
- Supplying `seed` reproduces a prior cycle's ordering exactly.
- Zero-item batches return `no_results` vs `all_filtered` correctly.
- Logged coordinates are coarse, never full precision (Principle V).

---

## Tier 3 — Integration validation (simulator/emulator)

Simulating location: **iOS** — Simulator → Features → Location → Custom Location. **Android** —
Extended controls (`…`) → Location → set coordinates → Send.

### Scenario 1 — One suggestion, one tap (User Story 1, P1)

1. Fresh install, grant location, set a dense-urban coordinate.
2. Add the Go-Eat widget to the home screen.

**Expect**: exactly one restaurant with name, cuisine, rating, distance. No list, no alternatives, no
radius control (FR-001, FR-002, FR-003).

3. Tap the suggestion.

**Expect**: that specific business's Google Maps listing opens. On a simulator without the Maps app,
the web fallback serves — this is the intended fallback path, not a failure (see
`contracts/deep-link.md`).

### Scenario 2 — Selection quality (User Story 2, P1)

Run the fixture report (Tier 1) rather than judging by eye — quality is a measured property, not an
impression. Spot-check a few live coordinates for sanity, but the gate is the report.

### Scenario 3 — Refresh cycling (User Story 3, P2)

1. With a batch loaded, tap refresh and watch the network log.

**Expect**: the next restaurant appears in under 1s (SC-006) with **zero** backend calls (FR-015).

2. Keep tapping past the fifth.

**Expect**: wraps to the first (FR-017). Total backend calls for the whole walk: **one** (SC-007).

3. Set `refreshEnabled: false` in backend config, restart, reload the widget.

**Expect**: no refresh control; one suggestion; selection, presentation, and tap-through unchanged.
Scenarios 1 and 2 still pass **unmodified** (SC-008, FR-019).

### Scenario 4 — Onboarding (User Story 4, P2)

Fresh install → complete onboarding.

**Expect**: purpose explained, permission requested with rationale, preferences persist across
restart, widget-install guidance shown, under 2 minutes (SC-003). Confirm no list, search, or map
browsing exists anywhere in the app (FR-028).

### Scenario 5 — Honest failure states

| Setup | Expect |
|---|---|
| Deny location permission | `permission_required`, taps into the app's rationale screen (FR-004) |
| Set a remote rural coordinate | `no_results` — "Nothing worth recommending nearby", not a bad pick |
| Set exclusions that eliminate everything | `all_filtered` with a route into preferences — **distinct** from `no_results` |
| Kill the backend, then refresh | last suggestion + stale indicator; never blank, never presented as current |
| Set device clock to 3am | no closed venue shown; empty state explains (FR-012) |
| Revoke permission after setup | reverts to `permission_required` |

Never acceptable in any of these: a blank widget, or stale data shown as current.

### Scenario 7 — Themes, tinted rendering, and backdrop

1. Toggle the system appearance between light and dark with the widget on screen.

**Expect**: every state re-renders legibly. Dark is its own specified assignment, not an inversion
of light (FR-039) — dark elevation reads as a surface step, not a hairline.

2. On iOS 17+, switch the home screen to tinted/accented widget rendering.

**Expect**: all six states remain distinguishable **with hue removed** — tinted mode desaturates to
one system hue and keys off luminance only, so `status.danger` and `status.success` collapse to
near-identical values. States must differ by shape, icon, or position (FR-038, SC-016). This is a
distinct acceptance case, not a nice-to-have.

3. Set a light wallpaper, a dark wallpaper, and a visually busy photo.

**Expect**: the widget paints its own opaque `surface.base` and is equally legible over all three
(FR-036, SC-017). Contrast is never computed against the wallpaper.

4. Count the chromatic values on any single widget surface.

**Expect**: at most three — one neutral ramp, one accent, one optional status color (FR-037).

**Note on Android**: v1 uses the fixed Open Color palette on every Android version. The widget will
not tint to the user's wallpaper, and that is the recorded decision (ADR-001), not a bug.

### Scenario 6 — Batch invalidation

| Setup | Expect |
|---|---|
| Move simulated location beyond the drift threshold, refresh | new cycle; suggestions near the new location (FR-021) |
| Change dietary preferences, refresh | new cycle; previously-excluded venues gone (FR-021) |
| Stay put, refresh repeatedly | cursor walks the same batch; no new cycle; no backend call (FR-021a) |

---

## Known risks to validate early

| Risk | Validation | Source |
|---|---|---|
| Widget may not get a fresh location fix without foregrounding the app | Spike in a dev build **on device** before polishing widget UI | R7 |
| Places pricing/terms unconfirmed | Verify against Google's official pricing before provider code | R3 |
| iOS and Android widgets are separate implementations | Confirm both render all six states identically from the same payload | R2 |
| Widget illegible under iOS tinted rendering, where hue carries nothing | Scenario 7 step 2, as a distinct acceptance case | R11 |
| Fixed palette means the Android widget will not match a themed home screen | Accepted and recorded in ADR-001; revisit only for surfaces that can resolve contrast at runtime | R10 |
| Threshold values are starting points, not tuned answers | Revisit after the fixture report and first real usage; `nearTieThreshold` trades SC-005 against SC-013 | R12 |

---

## Definition of done

- [ ] Tier 1 and Tier 2 pass with no simulator required
- [ ] Fixture report generated and reviewed
- [ ] SC-005 quality bar and SC-013 variety rate asserted, not just printed
- [ ] **Contrast gate passes for both themes** — blocking (SC-015, Constitution VI.5)
- [ ] Platform color assets regenerated from the semantic map; no hand-edited color, no raw hex
- [ ] All seven Tier 3 scenarios pass on **both** iOS Simulator and Android emulator
- [ ] All six states distinguishable under iOS tinted rendering (SC-016)
- [ ] Widget legible over light, dark, and busy wallpapers (SC-017)
- [ ] `refreshEnabled: false` verified — Scenarios 1 and 2 pass unmodified (SC-008)
- [ ] One backend call per cycle confirmed by network log (SC-007)
- [ ] No blank widget reachable in any state
