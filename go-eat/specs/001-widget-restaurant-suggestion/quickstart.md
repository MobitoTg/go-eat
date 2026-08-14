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

---

## Definition of done

- [ ] Tier 1 and Tier 2 pass with no simulator required
- [ ] Fixture report generated and reviewed
- [ ] All six Tier 3 scenarios pass on **both** iOS Simulator and Android emulator
- [ ] `refreshEnabled: false` verified — Scenarios 1 and 2 pass unmodified (SC-008)
- [ ] One backend call per cycle confirmed by network log (SC-007)
- [ ] No blank widget reachable in any state
