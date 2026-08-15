---

description: "Task list for Go-Eat Widget Restaurant Suggestion"
---

# Tasks: Go-Eat Widget Restaurant Suggestion

**Input**: Design documents from `/specs/001-widget-restaurant-suggestion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks ARE included. Research R9 defines a three-tier testing strategy, the
constitution makes the scoring regression gate mandatory, and quickstart.md specifies the runners.
Tests are therefore an explicit requirement of this feature, not an optional addition.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and
delivered independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths are included in every task

## Path Conventions

Paths are relative to the Spec Kit project root (`go-eat/`), matching the Source Code layout in
plan.md:

- `apps/mobile/` — Expo app, both widget implementations
- `packages/selection-core/` — pure, IO-free scoring (no simulator, no network, no provider key)
- `packages/contract-types/` — shared payload types generated from `contracts/`
- `packages/design-tokens/` — semantic color map, contrast gate, platform asset generators
- `services/suggestion-api/` — stateless backend, the only place the provider key lives

Design law lives at `specs/design-system/` (outside this feature — the constitution references it):
`color-primitives.json`, `color-semantics.md`, `platform-mapping.md`, plus `widget-state-tokens.md`
and `adr-001-android-dynamic-color.md` produced by T049a and T013e.

**Suffixed IDs** (T013a, T050a…) are tasks added after the initial generation, placed in execution
order without renumbering the tasks around them. The convention matches the spec's own FR-021a /
FR-022b numbering.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo initialization and tooling

- [X] T001 Create the monorepo workspace layout (`apps/mobile/`, `packages/selection-core/`, `packages/contract-types/`, `services/suggestion-api/`) and root `package.json` with npm workspaces, per plan.md
- [X] T002 [P] Add shared TypeScript config in `tsconfig.base.json` (TS 5.x, strict) plus a per-workspace `tsconfig.json` in each of the four workspaces
- [X] T003 [P] Configure ESLint and Prettier in `.eslintrc.cjs` and `.prettierrc`
- [X] T004 [P] Configure Jest for the Node-only workspaces in `packages/selection-core/jest.config.js` and `services/suggestion-api/jest.config.js`
- [X] T005 [P] Create `services/suggestion-api/.env.example` with `GOOGLE_PLACES_API_KEY` and `PORT`, documenting that the key never leaves the backend
- [X] T006 [P] Create `apps/mobile/.env.example` with `EXPO_PUBLIC_API_URL` and the iOS Simulator (`localhost`) vs Android emulator (`10.0.2.2`) note from quickstart.md
- [X] T007 Add root `package.json` scripts (`dev`, `test`, `fixtures:report`, `ios`, `android`, `tokens:generate`, `contrast:gate`) matching the commands documented in quickstart.md
- [X] T007a Add the CI workflow in `.github/workflows/ci.yml` running lint, both Jest suites, and the contrast gate — Principle VI.5 requires the gate to run in CI, and no CI exists yet

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contract types, the pure-logic package skeleton, the backend shell, the provider adapter, and the app shell. Nothing renders a suggestion until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 **GATE** Verify current Google Places API (New) pricing, per-SKU free-call allowances, and Places content caching/retention terms; record the outcome in `specs/001-widget-restaurant-suggestion/research.md` under R3. **Blocks T025** — no provider code before this resolves
- [X] T009 [P] Define API contract types (CycleRequest, CycleResponse, SuggestionItem, BatchState, ClientConfig, LocationAnchor, DietaryTag, Error) in `packages/contract-types/src/suggestion-api.ts` from `contracts/suggestion-api.yaml`
- [X] T010 [P] Define widget payload types (WidgetPayload, the six-case WidgetState union, `PAYLOAD_VERSION = 1`) in `packages/contract-types/src/widget-payload.ts` per `contracts/widget-payload.md`
- [X] T011 [P] Add the export barrel in `packages/contract-types/src/index.ts`
- [X] T012 [P] Define core domain types (RestaurantCandidate, ScoringWeights, ScoredCandidate) in `packages/selection-core/src/types.ts` per data-model.md
- [X] T013 [P] Implement a seeded deterministic PRNG in `packages/selection-core/src/rng.ts` — `Math.random` is prohibited anywhere in this package (Principle IV)
- [X] T013a [P] Create `packages/design-tokens` and load the pinned Open Color primitives from `specs/design-system/color-primitives.json` into `packages/design-tokens/src/primitives.ts` — the only place in the repo where hex literals are permitted (VI.1, VI.2)
- [X] T013b [P] Encode the semantic token map for both themes as data in `packages/design-tokens/src/semantics.ts`, transcribed from `specs/design-system/color-semantics.md` including the recorded ratios (VI.3)
- [X] T013c Implement WCAG relative-luminance and contrast-ratio computation in `packages/design-tokens/src/contrast.ts`
- [X] T013d **GATE** Implement the blocking contrast gate in `packages/design-tokens/__tests__/contrast-gate.test.ts` — recompute every pairing from the primitives for BOTH themes, assert text ≥ 4.5:1, large/bold ≥ 3:1, interactive and meaningful non-text boundaries ≥ 3:1, and assert each recorded ratio matches the computed value (VI.5, FR-035, SC-015). **Blocks all widget UI work**
- [X] T013e **ADR** Record the Android dynamic-color decision (research R10 — fixed Open Color palette in v1, dynamic color deferred) in `specs/design-system/adr-001-android-dynamic-color.md`, including why the hybrid fails: surfaces are the reference side of every contrast pairing, and RemoteViews cannot resolve contrast at runtime. **Blocks T013g**
- [X] T013f [P] Implement the iOS Asset Catalog generator in `packages/design-tokens/generators/ios-asset-catalog.ts` — one Color Set per SEMANTIC token with Any/Dark variants; primitives never ship to the bundle
- [X] T013g Implement the Android generator in `packages/design-tokens/generators/android-colors.ts` emitting `res/values/colors.xml` and `res/values-night/colors.xml` from the fixed semantic map with no system-palette branch (T013e ADR); confirm each token's target attribute is settable via RemoteViews before specifying it
- [X] T013h [P] Implement the no-raw-hex and no-primitive-reference lint rules in `packages/design-tokens/eslint-rules/` and register them so a violation fails the build (VI.1, FR-034)
- [X] T013i Wire `tokens:generate` into the mobile build so platform color assets regenerate from the semantic map rather than being hand-maintained
- [X] T013j [P] Vendor `open-color@1.9.1` pinned and record the MIT notice in `THIRD_PARTY.md` — VI.2 pins the version, and the license requires attribution (FR-041)
- [X] T013k [P] Export semantic tokens as a TypeScript module in `packages/design-tokens/src/tokens.ts` for the React Native app surfaces (onboarding, preferences), which are styled in JS and cannot consume the native asset catalogs
- [X] T014 Implement the hard-filter pipeline in fixed order (businessStatus ≠ OPERATIONAL → `openNow === false` → user exclusions) in `packages/selection-core/src/filters.ts` (FR-011, FR-012)
- [X] T015 Define the public ordering surface `orderCandidates(candidates, weights, preferences, seed)` in `packages/selection-core/src/index.ts`, with a deterministic baseline ordering as the seam US2 replaces
- [X] T016 [P] Test that hard filters run before ordering and excluded venues never reach the shuffle in `packages/selection-core/__tests__/filters.test.ts` (SC-009)
- [X] T017 [P] Test seeded PRNG determinism and absence of `Math.random` in `packages/selection-core/__tests__/rng.test.ts`
- [X] T018 Create the Fastify application skeleton in `services/suggestion-api/src/app.ts` and `services/suggestion-api/src/server.ts`
- [X] T019 [P] Implement operator config loading (weights, nearTieThreshold, searchRadiusMeters, minReviewCount, batchSize, refreshEnabled, drift/freshness/trust thresholds) in `services/suggestion-api/src/config/index.ts`
- [X] T020 [P] Implement coarse-coordinate log truncation in `services/suggestion-api/src/lib/logging.ts` so full-precision coordinates are never logged (Principle V)
- [X] T021 [P] Implement the error envelope (codes `bad_request`, `rate_limited`, `provider_unavailable`, `internal`) in `services/suggestion-api/src/lib/errors.ts`
- [X] T022 Implement `GET /health` in `services/suggestion-api/src/routes/health.ts`
- [X] T023 Implement `GET /v1/config` returning ClientConfig in `services/suggestion-api/src/routes/config.ts` — scoring weights MUST NOT be exposed (Principle II)
- [X] T024 [P] Contract test asserting `GET /v1/config` conforms to the schema and leaks no scoring weights, in `services/suggestion-api/__tests__/config.contract.test.ts`
- [X] T025 Implement the Google Places (New) Nearby Search adapter in `services/suggestion-api/src/provider/places.ts` — exactly one request per invocation, key read from env only (depends on T008)
- [X] T026 [P] Record provider response fixtures for dense-urban, suburban, and sparse-rural coordinates in `services/suggestion-api/__tests__/fixtures/`
- [ ] T027 [P] Initialize the Expo app (SDK 57+, New Architecture, expo-router) in `apps/mobile/`
- [X] T028 Configure both widget config plugins in `apps/mobile/app.config.ts`: `expo-widgets` with App Group `group.<bundle id>` (iOS) and `react-native-android-widget` with SharedPreferences `goeat_widget` (Android), per `contracts/widget-payload.md`
- [X] T029 [P] Implement the atomic shared-storage bridge in `apps/mobile/src/storage/shared-storage.ts` — writes must be atomic so a widget reload never reads a half-written payload
- [X] T030 [P] Implement the expo-location wrapper (permission state, anchor capture) in `apps/mobile/src/location/index.ts`
- [X] T031 [P] Implement pure invalidation predicates (`isStale`, `hasDrifted`, preferences-hash mismatch, batch trust window) in `apps/mobile/src/cycle/invalidation.ts` using the R12 thresholds — `anchorFreshnessSeconds` 900, `locationDriftThresholdMeters` 750, `batchTrustSeconds` 1800 (FR-021)
- [X] T031a [P] Guard test asserting the location anchor is overwritten and never appended to, that no coordinate is written to device storage outside the active batch, and that `batchTrustSeconds > anchorFreshnessSeconds` holds, in `apps/mobile/__tests__/no-location-history.test.ts` (FR-031, Principle V)
- [X] T032 [P] Implement the suggestion-api client in `apps/mobile/src/api/suggestion-api.ts`
- [ ] T033 **SPIKE** Prove whether a widget refresh can obtain a sufficiently fresh location anchor without foregrounding the app, on a device development build; record the outcome in research.md under R7. Blocks widget UI polish only — not backend, selection-core, or app-shell work

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Get told where to eat, right now (Priority: P1) 🎯 MVP

**Goal**: A user glances at the home screen and sees exactly one restaurant with name, cuisine, rating, and distance; one tap lands on that business's Google Maps listing. All six widget states render honestly.

**Independent Test**: Install the widget with location granted, set a dense-urban simulator coordinate, and confirm the widget renders exactly one restaurant with the four required fields, no list and no radius control, and that tapping opens that specific listing.

### Tests for User Story 1

- [ ] T034 [P] [US1] Contract test asserting `POST /v1/cycle` responses conform to `contracts/suggestion-api.yaml` in `services/suggestion-api/__tests__/cycle.contract.test.ts`
- [ ] T035 [P] [US1] Test that one cycle issues exactly one provider request, via a spy on the provider adapter, in `services/suggestion-api/__tests__/one-call.test.ts` (FR-014, FR-015, SC-007)
- [ ] T036 [P] [US1] Test display formatting — name truncation, rating, review-count abbreviation, and distance in both unit systems — in `services/suggestion-api/__tests__/shaping.test.ts` (FR-002)
- [ ] T037 [P] [US1] Test deep-link construction of `listingUrl` and `fallbackUrl` against `contracts/deep-link.md` in `services/suggestion-api/__tests__/links.test.ts`
- [ ] T038 [P] [US1] Test that CycleResponse → WidgetPayload mapping covers all six WidgetStates with no default branch, in `apps/mobile/__tests__/payload-writer.test.ts`

### Implementation for User Story 1

- [ ] T039 [US1] Implement display formatting (name ≤60, cuisineLabel ≤30 derived from provider types, ratingLabel, abbreviated reviewCountLabel, distanceLabel in the requested unit system) in `services/suggestion-api/src/shaping/format.ts`
- [ ] T040 [US1] Implement the Google Maps deep-link builder with the three-step fallback chain in `services/suggestion-api/src/links/google-maps.ts` (FR-023, FR-025)
- [ ] T041 [US1] Implement SuggestionItem assembly in `services/suggestion-api/src/shaping/item.ts` — deliberately excludes score, rank, and any sibling reference (FR-001, Principle II)
- [ ] T042 [US1] Implement BatchState resolution distinguishing `no_results` from `all_filtered` in `services/suggestion-api/src/shaping/state.ts`
- [ ] T043 [US1] Implement `POST /v1/cycle` in `services/suggestion-api/src/routes/cycle.ts`, orchestrating validate → provider (one call) → hard filter → order → shape → respond with cycleId, seed, issuedAt, anchor, items, refreshEnabled, state
- [ ] T044 [US1] Implement request validation and 400 handling (coordinate ranges, exclusions/preferences disjoint) in `services/suggestion-api/src/routes/cycle.ts`
- [ ] T045 [US1] Implement per-installation cycle rate limiting returning 429 in `services/suggestion-api/src/lib/rate-limit.ts` — a cost backstop (R4); `installationId` is used for nothing else and never joined to location
- [ ] T046 [US1] Implement 502 provider-failure handling in `services/suggestion-api/src/routes/cycle.ts`
- [ ] T047 [US1] Implement cycle start (capture anchor, call the API once, persist batch with cursor 0) in `apps/mobile/src/cycle/start-cycle.ts`
- [ ] T048 [US1] Implement the payload writer mapping batch + cursor + freshness to WidgetPayload in `apps/mobile/src/cycle/write-payload.ts`
- [ ] T049 [US1] Implement client-side widget state resolution (`suggestion`, `permission_required`, `no_results`, `all_filtered`, `stale`, `loading`) in `apps/mobile/src/cycle/resolve-state.ts` (FR-004)
- [ ] T049a [US1] Define the state → semantic-token mapping (token NAMES only, never color values) in `specs/design-system/widget-state-tokens.md`, so both widget implementations render the six states from one specification rather than diverging (VI.3)
- [ ] T050 [P] [US1] Implement the iOS widget view in `apps/mobile/widgets/ios/GoEatWidget.tsx` — render-only, all six states, strings rendered verbatim, no formatting or URL construction
- [ ] T050a [P] [US1] Paint an opaque `surface.base` behind the iOS widget, or opt into the platform material and derive text from its vibrancy roles — contrast is never computed against wallpaper (VI.6, FR-036)
- [ ] T051 [P] [US1] Implement the Android widget view in `apps/mobile/widgets/android/GoEatWidget.tsx` — render-only, all six states, strings rendered verbatim, no formatting or URL construction
- [ ] T051a [P] [US1] Paint an opaque `surface.base` behind the Android widget (VI.6, FR-036)
- [ ] T052 [P] [US1] Implement tap-through on the iOS widget opening `listingUrl` and falling through to `fallbackUrl` in `apps/mobile/widgets/ios/GoEatWidget.tsx`
- [ ] T053 [P] [US1] Implement tap-through on the Android widget opening `listingUrl` and falling through to `fallbackUrl` in `apps/mobile/widgets/android/GoEatWidget.tsx`
- [ ] T054 [US1] Register the `goeat://` scheme and the `onboarding` / `permission` routes in `apps/mobile/app.config.ts` and `apps/mobile/app/_layout.tsx` per `contracts/deep-link.md`
- [ ] T055 [US1] Wire the `permission_required` widget state's tap target to `goeat://permission` in both widget views
- [ ] T053a [P] [US1] Differentiate all six widget states by shape, icon, or position in addition to color, in both widget views — hue must never be the sole carrier of meaning, because iOS tinted rendering desaturates to a single hue and keys off luminance only (FR-038, research R11)
- [ ] T053b [P] [US1] Guard test asserting no hover, focus, or pressed color variant is defined in the token set or referenced by either widget view — widgets are static snapshots, so these states are unreachable and must never be generated (FR-040)
- [ ] T056 [P] [US1] Integration test of quickstart Scenario 1 on iOS Simulator and Android emulator in `apps/mobile/__tests__/integration/one-suggestion.test.ts` (SC-002)
- [ ] T056a [P] [US1] Acceptance test of iOS tinted rendering as a distinct case — confirm all six states stay distinguishable with hue removed — in `apps/mobile/__tests__/integration/tinted-mode.test.ts` (SC-016)
- [ ] T056b [P] [US1] Verify each widget surface renders at most three chromatic values (one neutral ramp, one accent, one optional status color) in `apps/mobile/__tests__/chromatic-budget.test.ts` (VI.4, FR-037)
- [ ] T056d [P] [US1] Guard test asserting neither widget view exposes a radius, distance, or search-scope control, and that no such control exists in the app (FR-003, Principle II) in `apps/mobile/__tests__/no-scope-control.test.ts`
- [ ] T056c [P] [US1] Add widget snapshot tests across the full rendering matrix — light, dark, and iOS tinted, for all six states — in `apps/mobile/__tests__/widget-snapshots.test.ts`, so a token or layout regression is caught without a manual simulator pass. Subsumes T056a and T107a as the mechanism; those remain as manual sign-off

**Checkpoint**: The widget shows one restaurant and taps through, legibly in both themes and in tinted mode. Selection quality is still baseline — US2 supplies the real model.

---

## Phase 4: User Story 2 - Suggestions feel worth eating, not just close by (Priority: P1)

**Goal**: The scoring model favors well-reviewed, healthier-leaning venues over nearer low-quality ones, is tunable by weight alone, and is fully reproducible from a seed.

**Independent Test**: Run the golden-fixture suite in plain Node against the fixed coordinate sample and verify the ranked output favors higher-rated, better-reviewed, healthier-leaning venues over nearer but lower-quality ones — and that changing a weight changes the ranking with no brand list anywhere.

### Tests for User Story 2

- [ ] T057 [P] [US2] Build the golden-fixture harness covering dense urban, suburban, and sparse rural coordinates in `packages/selection-core/__tests__/fixtures/`
- [ ] T058 [P] [US2] Test that distance alone never determines the winner in `packages/selection-core/__tests__/scoring.test.ts` (FR-006)
- [ ] T059 [P] [US2] Test that healthier-leaning venues outrank comparable fast-food venues in `packages/selection-core/__tests__/health-lean.test.ts` (FR-007)
- [ ] T060 [P] [US2] Test that a high rating from very few reviews is tempered by volume in `packages/selection-core/__tests__/confidence.test.ts` (FR-010)
- [ ] T061 [P] [US2] Test that identical inputs plus an identical seed produce identical ordering in `packages/selection-core/__tests__/determinism.test.ts` (FR-013, SC-014)
- [ ] T062 [P] [US2] Test that near-tied candidates reorder across seeds while candidates outside the threshold keep strict order, in `packages/selection-core/__tests__/near-tie.test.ts` (FR-022)
- [ ] T063 [P] [US2] Test that changing each weight measurably moves rankings — a decorative weight fails the suite — in `packages/selection-core/__tests__/weights.test.ts` (FR-009, SC-011)
- [ ] T064 [P] [US2] Guard test asserting no weight key or source identifier names a brand or business in `packages/selection-core/__tests__/no-brand-list.test.ts` (FR-008)
- [ ] T065 [P] [US2] Guard test asserting no suggestion history is written or retained anywhere in `packages/selection-core/__tests__/no-history.test.ts` (FR-022a)

### Implementation for User Story 2

- [ ] T066 [US2] Implement rating normalization and the weighted score in `packages/selection-core/src/score.ts`
- [ ] T067 [US2] Implement review-volume confidence tempering in `packages/selection-core/src/confidence.ts`, treating missing `rating`/`reviewCount` as low confidence rather than zero
- [ ] T068 [US2] Implement the health-lean adjustment keyed by provider place type only in `packages/selection-core/src/health-lean.ts` (FR-007, FR-008)
- [ ] T069 [US2] Implement dietary preferences as positive scoring inputs — distinct from exclusions, which remain hard filters — in `packages/selection-core/src/preferences.ts`
- [ ] T070 [US2] Implement the seeded near-tie shuffle in `packages/selection-core/src/near-tie.ts`, preserving strict order outside the threshold band (FR-022, FR-022b)
- [ ] T071 [US2] Replace the baseline ordering seam in `packages/selection-core/src/index.ts` with the real scoring pipeline, keeping scoring assertable independently of ordering (FR-013)
- [ ] T072 [US2] Populate real weight values (rating, reviewVolume, healthLean map, distance, nearTieThreshold, minReviewCount, searchRadiusMeters) in `services/suggestion-api/src/config/weights.ts`
- [ ] T073 [US2] Implement the `fixtures:report` script printing rankings across the coordinate sample in `packages/selection-core/scripts/fixtures-report.ts` — the constitution's scoring regression gate made executable
- [ ] T073a [US2] Assert the SC-005 quality bar over the fixture sample in `packages/selection-core/__tests__/quality-bar.test.ts` — at least 80% of surfaced suggestions rated ≥ 4.0 with ≥ 25 reviews, and at most 10% in fast-food or takeaway category types. Failing this fails the build; a printed report nobody asserts on is not a gate
- [ ] T073b [US2] Assert the SC-013 variety rate in `packages/selection-core/__tests__/variety.test.ts` — across repeated cycles at one fixture coordinate with fixed preferences and varying seeds, the first-shown venue differs in at least 50% of cycles, and no venue scoring more than `nearTieThreshold` below the top candidate is ever shown first
- [ ] T074 [US2] Generate a cycle seed per cycle and echo it in CycleResponse in `services/suggestion-api/src/routes/cycle.ts` (FR-022b)

**Checkpoint**: MVP complete — the widget shows one restaurant that is actually worth eating at, and quality is measurable.

---

## Phase 5: User Story 3 - Refresh to the next option in the batch (Priority: P2)

**Goal**: Refresh advances through the batch instantly with zero provider calls, wraps at the end, and can be turned off by configuration without disturbing Stories 1 and 2.

**Independent Test**: With a batch loaded, tap refresh repeatedly and confirm the widget walks each member once in order, wraps to the first, and issues no network request during the walk. Then set `refreshEnabled: false` and confirm the widget behaves as a single-suggestion widget with Scenarios 1 and 2 passing unmodified.

### Tests for User Story 3

- [ ] T075 [P] [US3] Test cursor advance and wrap including short and single-item batches in `apps/mobile/__tests__/cursor.test.ts` (FR-016, FR-017, FR-018)
- [ ] T076 [P] [US3] Test that a full walk of the batch issues zero API calls in `apps/mobile/__tests__/refresh-no-network.test.ts` (FR-015, FR-021a, SC-007)
- [ ] T077 [P] [US3] Test that `refreshEnabled: false` hides the control and leaves selection, presentation, and tap-through unchanged in `apps/mobile/__tests__/refresh-disabled.test.ts` (FR-019, SC-008)
- [ ] T078 [P] [US3] Test that an invalidated batch plus a refresh press starts exactly one new cycle in `apps/mobile/__tests__/invalid-batch-refresh.test.ts` (FR-020)

### Implementation for User Story 3

- [ ] T079 [US3] Implement `advance(batch)` as `(cursor + 1) % items.length` in `apps/mobile/src/cycle/cursor.ts` — the single expression satisfying FR-016, FR-017, and FR-018, and the only code the FR-019 removal path deletes
- [ ] T080 [US3] Implement refresh dispatch in `apps/mobile/src/cycle/refresh.ts`: valid batch → advance and rewrite payload; invalid batch → start a new cycle
- [ ] T081 [US3] Implement the iOS App Intent refresh handler (advance cursor, rewrite payload, `reloadTimelines`, no app launch — FR-005) in `apps/mobile/widgets/ios/RefreshIntent.tsx`
- [ ] T082 [US3] Implement the Android broadcast refresh handler (advance cursor, rewrite payload, `updateAppWidget`, no app launch — FR-005) in `apps/mobile/widgets/android/refresh-handler.ts`
- [ ] T083 [P] [US3] Gate the refresh control on `refreshEnabled` in `apps/mobile/widgets/ios/GoEatWidget.tsx`
- [ ] T084 [P] [US3] Gate the refresh control on `refreshEnabled` in `apps/mobile/widgets/android/GoEatWidget.tsx`
- [ ] T085 [US3] Make rapid repeated refresh idempotent per tap — advance exactly one step, never trigger duplicate cycle starts — in `apps/mobile/src/cycle/refresh.ts`
- [ ] T086 [US3] Truncate `items` to 1 server-side when `refreshEnabled` is false in `services/suggestion-api/src/routes/cycle.ts` (FR-019)
- [ ] T087 [US3] Document the zero-refresh removal path — the exact files and fields deleted — in `apps/mobile/src/cycle/README.md` (FR-019, constitution: provisional mechanics stay removable)
- [ ] T088 [P] [US3] Integration test of quickstart Scenario 3 on both simulators in `apps/mobile/__tests__/integration/refresh-cycling.test.ts`

**Checkpoint**: Refresh works and is provably removable.

---

## Phase 6: User Story 4 - One-time setup, then get out of the way (Priority: P2)

**Goal**: A new user completes onboarding — purpose, location permission with rationale, optional dietary settings, widget-install guidance — in under two minutes, and never needs the app again.

**Independent Test**: Launch fresh on a simulator, complete onboarding end to end, verify permission is requested with a rationale, preferences persist across restart, widget-install guidance appears, and no browsing, list, or search UI is reachable anywhere.

### Tests for User Story 4

- [ ] T089 [P] [US4] Test that preferences persist across app and device restart in `apps/mobile/__tests__/preferences-persistence.test.ts` (FR-027)
- [ ] T090 [P] [US4] Test that overlapping exclusions and preferences are rejected at the settings UI in `apps/mobile/__tests__/preferences-validation.test.ts`
- [ ] T091 [P] [US4] Guard test asserting no list, search, map, or discovery component exists under `apps/mobile/app/` in `apps/mobile/__tests__/no-browsing-ui.test.ts` (FR-028, Principle I)
- [ ] T091a [P] [US4] Extend the Principle I guard to assert Go-Eat builds no restaurant detail view, photo gallery, review view, or directions/navigation URL anywhere in `apps/mobile/` — the tap-through hands off and must never be reimplemented (FR-024)

### Implementation for User Story 4

- [ ] T092 [P] [US4] Implement the preferences store (exclusions, preferences, onboardingComplete, locationPermission, updatedAt) in `apps/mobile/src/storage/preferences.ts` — device-scoped, no account (FR-032)
- [ ] T092a [US4] Wire the app screens to the semantic token export from T013k in `apps/mobile/src/theme/index.ts`, resolving light/dark from the OS — FR-034 covers the app as well as the widget, and the RN screens cannot read the native asset catalogs
- [ ] T092b [P] [US4] Extend the contrast gate to cover the app's token usage in both themes, so onboarding and preferences are held to the same bar as the widget (FR-035, SC-015)
- [ ] T093 [US4] Implement the onboarding purpose screen in `apps/mobile/app/onboarding/index.tsx`
- [ ] T094 [US4] Implement the location permission rationale and request screen in `apps/mobile/app/onboarding/permission.tsx` (FR-026)
- [ ] T095 [US4] Implement the denied-permission path explaining the consequence and linking directly to system location settings in `apps/mobile/app/onboarding/permission.tsx` (FR-029)
- [ ] T096 [US4] Implement the dietary preferences and exclusions step with disjoint validation in `apps/mobile/app/onboarding/preferences.tsx`
- [ ] T097 [US4] Implement the widget-install guide with per-platform steps in `apps/mobile/app/onboarding/widget-install.tsx`
- [ ] T098 [US4] Implement the post-onboarding preferences screen in `apps/mobile/app/preferences/index.tsx` (FR-027)
- [ ] T099 [US4] Invalidate the active batch immediately on any preferences change, via `preferencesHash`, in `apps/mobile/src/cycle/invalidation.ts` (FR-021)
- [ ] T100 [US4] Register the `goeat://preferences` route and wire the `all_filtered` widget state to it in `apps/mobile/app/_layout.tsx` and both widget views
- [ ] T101 [P] [US4] Integration test of quickstart Scenario 4 on both simulators in `apps/mobile/__tests__/integration/onboarding.test.ts` (SC-003)

**Checkpoint**: All four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story validation, cost observability, and the release gates from quickstart.md

- [ ] T102 [P] Integration test of quickstart Scenario 5 (honest failure states — denied permission, rural coordinate, all-filtered, backend down, 3am clock, revoked permission) on both simulators in `apps/mobile/__tests__/integration/failure-states.test.ts` (SC-004, SC-009)
- [ ] T103 [P] Integration test of quickstart Scenario 6 (batch invalidation on drift, preference change, and stationary refresh) on both simulators in `apps/mobile/__tests__/integration/invalidation.test.ts`
- [ ] T104 Verify SC-008 by running the Story 1 and Story 2 acceptance tests unmodified with `refreshEnabled: false`
- [ ] T105 Verify SC-007 from the network log — exactly one backend call per cycle regardless of refresh count
- [ ] T106 Verify SC-006 — refresh renders the next candidate in under 1 second on both platforms
- [ ] T106a Verify SC-001 — time five first-time viewers identifying the suggested restaurant from a home screen glance, confirming under 3 seconds with no tap or scroll. A layout property, so it is measured on the built widget rather than asserted in a unit test
- [ ] T107 [P] Confirm both widgets render all six states identically from the same payload (research R2 duplication risk)
- [ ] T107a [P] Verify all six states in BOTH themes on both platforms, confirming dark is the independently specified assignment and not an inversion of light (FR-039, VI.7)
- [ ] T107b [P] Verify widget legibility over light, dark, and visually busy wallpapers on both platforms (SC-017, VI.6)
- [ ] T107c Decide whether a true-black `surface.base` OLED variant is warranted; ship it only if measured, since #000000 changes every dark-theme ratio and re-triggers the contrast gate (platform-mapping.md)
- [ ] T108 [P] Add a guard check asserting `GOOGLE_PLACES_API_KEY` appears nowhere under `apps/mobile/` in `scripts/check-no-client-secrets.ts` (Principle V)
- [ ] T108a [P] Add a guard check asserting exactly one provider adapter exists under `services/suggestion-api/src/provider/` and nothing else issues outbound restaurant-data calls (FR-030, Principle: single provider)
- [ ] T109 [P] Add a per-cycle counter metric so cost per active user is observable from day one, in `services/suggestion-api/src/lib/metrics.ts` (research R4)
- [ ] T110 Record the target cost ceiling per active user per month in `specs/001-widget-restaurant-suggestion/research.md` under R4 — an open user decision that tunes batch size, invalidation thresholds, and rate limits
- [ ] T111 [P] Write `README.md` covering setup, the three test tiers, and the constitution review checks (no user-facing choice, no venue list, no unseeded randomness, no retained history, no second provider, no per-refresh provider call)
- [ ] T112 Run the full quickstart.md Definition of Done checklist and confirm every item passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational. Replaces the T015 ordering seam; testable entirely in `packages/selection-core` without US1
- **User Story 3 (Phase 5)**: Depends on Foundational. Needs US1's widget views to exist before T083/T084 gate a control on them
- **User Story 4 (Phase 6)**: Depends on Foundational. Independent of US1–US3 except T100, which wires an existing widget state to a new route
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### Critical Path Notes

- **T008 blocks T025** — the Places pricing and terms gate must resolve before any provider code is written (research R3)
- **T013d (contrast gate) blocks all widget UI** — T050, T050a, T051, T051a, T053a and everything downstream. Principle VI.5 makes it blocking, so widget rendering cannot begin against an unverified token map
- **T013e (Android ADR) blocks T013g** — the generator cannot be written until dynamic-vs-fixed is decided (research R10)
- **T033 (R7 spike)** blocks widget UI polish only. Backend, `selection-core`, and app-shell work proceed regardless
- **T015 is a deliberate seam** — US1 ships against baseline ordering, US2 replaces the internals without touching US1's call site
- **`packages/design-tokens` shares no files with `selection-core`** — both are pure packages and can be built entirely in parallel

### Within Each User Story

- Tests are written first and must fail before implementation
- Types before logic; logic before routes; routes before client wiring; client wiring before widget rendering
- Story complete and independently verified before moving to the next priority

### Parallel Opportunities

- Setup: T002–T006 all run in parallel
- Foundational: T009–T013 (types and PRNG), T013a–T013b (palette data), T016–T017 (pure tests), T019–T021 (backend libs), and T029–T032 (client modules) each form a parallel batch
- Design tokens: T013a/T013b in parallel, then T013c → T013d (gate). T013f and T013h run in parallel with each other; T013g waits on the T013e ADR
- US1: all five test tasks T034–T038 in parallel; then T050–T053 (the two widget views and their tap handlers) in parallel
- US2: all nine test tasks T057–T065 in parallel — they touch separate files and need no simulator
- US3: T075–T078 in parallel; T083 and T084 in parallel
- US4: T089–T091 in parallel
- Across teams: once Foundational completes, US2 (pure logic) and US4 (app screens) can be built entirely in parallel with US1 — they share no files

---

## Parallel Example: User Story 2

```bash
# All nine US2 test tasks run together — plain Node, no simulator, no network, no API key:
Task: "Golden-fixture harness in packages/selection-core/__tests__/fixtures/"
Task: "Distance never sole determinant in packages/selection-core/__tests__/scoring.test.ts"
Task: "Health-lean ranking in packages/selection-core/__tests__/health-lean.test.ts"
Task: "Confidence tempering in packages/selection-core/__tests__/confidence.test.ts"
Task: "Seed determinism in packages/selection-core/__tests__/determinism.test.ts"
Task: "Near-tie shuffle bounds in packages/selection-core/__tests__/near-tie.test.ts"
Task: "Weight sensitivity in packages/selection-core/__tests__/weights.test.ts"
Task: "No brand list guard in packages/selection-core/__tests__/no-brand-list.test.ts"
Task: "No history guard in packages/selection-core/__tests__/no-history.test.ts"

# Then the scoring modules, which touch separate files:
Task: "Rating normalization in packages/selection-core/src/score.ts"
Task: "Confidence tempering in packages/selection-core/src/confidence.ts"
Task: "Health-lean map in packages/selection-core/src/health-lean.ts"
```

---

## Implementation Strategy

### MVP scope: User Stories 1 AND 2

This deviates from the usual "US1 only" MVP, and the spec says why: Story 2 is co-critical with
Story 1, because "a widget that shows one bad restaurant is not a viable MVP." US1 alone produces a
working widget on baseline ordering — useful as an internal checkpoint, not as a release.

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — resolve the T008 pricing gate and the T013e ADR early, land the T013d contrast gate before any widget UI, run the T033 spike in parallel
3. Complete Phase 3: User Story 1 → **checkpoint**: widget renders and taps through, in both themes and tinted mode
4. Complete Phase 4: User Story 2 → **STOP and VALIDATE**: run `fixtures:report`, confirm quality
5. Ship or demo the MVP

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 + US2 → validate → **MVP**
3. US3 → validate refresh cycling and the removal path → deploy
4. US4 → validate onboarding end to end → deploy
5. Polish → run all release gates

### Parallel Team Strategy

Once Foundational is done, three tracks run without file conflicts:

- **Track A (US1)**: backend shaping and routes, client cycle, both widget views
- **Track B (US2)**: `packages/selection-core` — pure logic, no simulator, no API key needed
- **Track C (US4)**: `apps/mobile/app/` onboarding and preferences screens

`packages/design-tokens` (T013a–T013i) is a fourth track that can run alongside all of them during
Foundational, but Track A's widget views cannot start until T013d passes.

US3 joins Track A after US1's widget views land.

---

## Notes

- Tests are included because research R9, the constitution's scoring regression gate, and quickstart.md all specify them
- Most confidence comes from Tier 1 (`packages/selection-core`) — it needs no simulator, no network, and no provider key
- Any change touching scoring, weights, or candidate assembly must include a before/after `fixtures:report`
- Any logic appearing in `apps/mobile/widgets/ios/` or `apps/mobile/widgets/android/` is a design failure — it must then be written and tested twice
- The same applies to color: a hex literal in a widget view is both a build failure (VI.1) and a value that would have to be maintained in Swift and Kotlin. Widgets reference token names; `design-tokens` generates the values
- No color or theme data travels in the widget payload — the payload carries state, the platform carries appearance
- Commit after each task or logical group; stop at any checkpoint to validate a story independently