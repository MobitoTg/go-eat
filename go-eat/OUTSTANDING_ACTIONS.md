# Outstanding Actions - Go-Eat Widget Restaurant Suggestion

**Last Updated**: 2026-08-15  
**Status**: Phase 2 Complete ✅ | Phase 3+ In Progress 🚧  
**Phases Completed**: Setup (Phase 1) + Foundational (Phase 2)  
**Next Phase**: User Story 1 - Get told where to eat, right now (Phase 3)

---

## Summary

**Completed**: 36 tasks across Phases 1-2
- ✅ Monorepo infrastructure and tooling
- ✅ Contract types and domain models  
- ✅ Design token system with contrast gate
- ✅ Selection/scoring core foundation
- ✅ Backend shell and Google Places adapter
- ✅ Mobile app foundation and storage

**Outstanding**: 91+ tasks across Phases 3-6 (plus post-release features)
- 🚧 Phase 3: User Story 1 implementation (~40 tasks)
- 🚧 Phase 4: User Story 2 implementation (~18 tasks)
- 🚧 Phase 5: User Story 3 implementation (~12 tasks)
- 🚧 Phase 6: User Story 4 implementation (~15 tasks)
- 🚧 Post-Release: Polish, optimization, and documentation (~6 tasks)

---

## Phase 3: User Story 1 - Get told where to eat, right now (Priority: P1) 🎯 MVP

**Goal**: A user glances at the home screen and sees exactly one restaurant with name, cuisine, rating, and distance; one tap lands on that business's Google Maps listing. All six widget states render honestly.

**Blocker**: T033 (location acquisition spike) is a spike but does NOT block most of this phase.

### Phase 3 Tasks - Backend Shaping Layer (T034-T046)

#### Tests for Backend Shape/Format (T034-T037)
- [ ] **T034** [P] Contract test: `POST /v1/cycle` responses conform to `contracts/suggestion-api.yaml` in `services/suggestion-api/__tests__/cycle.contract.test.ts`
- [ ] **T035** [P] Test that one cycle issues exactly one provider request via spy in `services/suggestion-api/__tests__/one-call.test.ts` (FR-014, FR-015, SC-007)
- [ ] **T036** [P] Test display formatting (name ≤60, cuisine ≤30, rating, review abbreviation, distance in both units) in `services/suggestion-api/__tests__/shaping.test.ts` (FR-002)
- [ ] **T037** [P] Test deep-link construction (`listingUrl`, `fallbackUrl`) in `services/suggestion-api/__tests__/links.test.ts`

#### Tests for Payload Mapping (T038)
- [ ] **T038** [P] Test that `CycleResponse → WidgetPayload` mapping covers all six `WidgetState` cases with no default in `apps/mobile/__tests__/payload-writer.test.ts`

#### Implementation - Display & Links (T039-T040)
- [ ] **T039** Display formatting module: name ≤60, cuisineLabel ≤30 from provider types, rating/reviewCount abbreviation, distance in both unit systems in `services/suggestion-api/src/shaping/format.ts`
- [ ] **T040** Google Maps deep-link builder with three-step fallback chain in `services/suggestion-api/src/links/google-maps.ts` (FR-023, FR-025)

#### Implementation - Shaping Pipeline (T041-T042)
- [ ] **T041** `SuggestionItem` assembly (deliberately excludes score, rank, siblings) in `services/suggestion-api/src/shaping/item.ts` (FR-001, Principle II)
- [ ] **T042** `BatchState` resolution distinguishing `no_results` from `all_filtered` in `services/suggestion-api/src/shaping/state.ts`

#### Implementation - Cycle Orchestration (T043-T046)
- [ ] **T043** `POST /v1/cycle` implementation orchestrating: validate → provider (one call) → hard filter → order → shape → respond in `services/suggestion-api/src/routes/cycle.ts`
- [ ] **T044** Request validation & 400 handling (coordinate ranges, exclusions/preferences disjoint)
- [ ] **T045** Per-installation cycle rate limiting (429 response) in `services/suggestion-api/src/lib/rate-limit.ts` — cost backstop (R4)
- [ ] **T046** 502 provider-failure handling in cycle route

### Phase 3 Tasks - Client Cycle Management (T047-T049a)

#### Implementation - Client Cycle Start (T047-T048)
- [ ] **T047** Cycle start (capture anchor, call API once, persist batch with cursor 0) in `apps/mobile/src/cycle/start-cycle.ts`
- [ ] **T048** Payload writer mapping batch + cursor + freshness to `WidgetPayload` in `apps/mobile/src/cycle/write-payload.ts`

#### Implementation - State Resolution (T049-T049a)
- [ ] **T049** Client-side widget state resolution (six states: `suggestion`, `permission_required`, `no_results`, `all_filtered`, `stale`, `loading`) in `apps/mobile/src/cycle/resolve-state.ts` (FR-004)
- [ ] **T049a** Define state → semantic-token mapping in `specs/design-system/widget-state-tokens.md` (VI.3) — token names only, both widgets reference this

### Phase 3 Tasks - Widget View Implementations (T050-T055)

#### iOS Widget (T050-T050a, T052)
- [ ] **T050** [P] iOS widget view in `apps/mobile/widgets/ios/GoEatWidget.tsx` — render-only, all six states, verbatim strings
- [ ] **T050a** [P] Opaque `surface.base` background (not wallpaper) — contrast computed against surface (VI.6, FR-036)
- [ ] **T052** [P] Tap-through on iOS opening `listingUrl` then `fallbackUrl` fallback

#### Android Widget (T051-T051a, T053)
- [ ] **T051** [P] Android widget view in `apps/mobile/widgets/android/GoEatWidget.tsx` — render-only, all six states, verbatim strings
- [ ] **T051a** [P] Opaque `surface.base` background (VI.6, FR-036)
- [ ] **T053** [P] Tap-through on Android opening `listingUrl` then `fallbackUrl` fallback

#### Deep-linking (T054-T055)
- [ ] **T054** Register `goeat://` scheme and routes (`onboarding`, `permission`) in `apps/mobile/app.config.ts` and `app/_layout.tsx` per `contracts/deep-link.md`
- [ ] **T055** Wire `permission_required` widget state tap target to `goeat://permission` in both views

### Phase 3 Tasks - UI Refinement & Accessibility (T053a-T056c)

#### Accessibility & Design (T053a-T053b)
- [ ] **T053a** [P] Differentiate all six states by shape/icon/position IN ADDITION TO color (hue alone fails in iOS tinted mode) (FR-038, research R11)
- [ ] **T053b** [P] Guard test: no hover/focus/pressed variants defined (widgets are static snapshots) in `apps/mobile/__tests__/` (FR-040)

#### Testing & Validation (T056-T056d)
- [ ] **T056** [P] Integration test: quickstart Scenario 1 on iOS Simulator & Android emulator in `apps/mobile/__tests__/integration/one-suggestion.test.ts` (SC-002)
- [ ] **T056a** [P] Manual/acceptance: iOS tinted rendering — all six states distinguishable without hue in `apps/mobile/__tests__/integration/tinted-mode.test.ts` (SC-016)
- [ ] **T056b** [P] Chromatic budget test: each widget surface ≤ 3 chromatic values in `apps/mobile/__tests__/chromatic-budget.test.ts` (VI.4, FR-037)
- [ ] **T056c** [P] Widget snapshot tests: light/dark/tinted across all six states in `apps/mobile/__tests__/widget-snapshots.test.ts`
- [ ] **T056d** [P] Guard test: no radius/distance/scope controls anywhere in widget or app in `apps/mobile/__tests__/no-scope-control.test.ts` (FR-003, Principle II)

### Phase 3 Checkpoint
✅ **Deliverable**: MVP complete — widget shows one restaurant and taps through legibly in both themes and tinted mode. Selection quality still baseline.

---

## Phase 4: User Story 2 - Suggestions feel worth eating, not just close by (Priority: P1)

**Goal**: Scoring model favors well-reviewed, healthier venues over near low-quality ones; tunable by weight alone; fully reproducible from seed.

### Phase 4 Tasks - Scoring Tests (T057-T065)

#### Golden Fixtures & Regression (T057)
- [ ] **T057** [P] Build golden-fixture harness covering dense-urban, suburban, sparse-rural in `packages/selection-core/__tests__/fixtures/`

#### Scoring Quality Tests (T058-T063)
- [ ] **T058** [P] Test: distance alone never determines winner in `packages/selection-core/__tests__/scoring.test.ts` (FR-006)
- [ ] **T059** [P] Test: healthier venues outrank comparable fast-food in `packages/selection-core/__tests__/health-lean.test.ts` (FR-007)
- [ ] **T060** [P] Test: high rating from few reviews tempered by volume in `packages/selection-core/__tests__/confidence.test.ts` (FR-010)
- [ ] **T061** [P] Test: identical inputs + seed → identical ordering in `packages/selection-core/__tests__/determinism.test.ts` (FR-013, SC-014)
- [ ] **T062** [P] Test: near-tied candidates reorder across seeds; far candidates keep strict order in `packages/selection-core/__tests__/near-tie.test.ts` (FR-022)
- [ ] **T063** [P] Test: each weight measurably moves rankings in `packages/selection-core/__tests__/weights.test.ts` (FR-009, SC-011)

#### Guard Tests (T064-T065)
- [ ] **T064** [P] Guard: no weight key/source names a brand in `packages/selection-core/__tests__/no-brand-list.test.ts` (FR-008)
- [ ] **T065** [P] Guard: no suggestion history retained anywhere in `packages/selection-core/__tests__/no-history.test.ts` (FR-022a)

### Phase 4 Tasks - Scoring Implementation (T066-T074)

#### Scoring Pipeline Modules (T066-T070)
- [ ] **T066** Rating normalization & weighted score in `packages/selection-core/src/score.ts`
- [ ] **T067** Review-volume confidence tempering in `packages/selection-core/src/confidence.ts` (missing data treated as low confidence)
- [ ] **T068** Health-lean adjustment keyed by provider place type in `packages/selection-core/src/health-lean.ts` (FR-007, FR-008)
- [ ] **T069** Dietary preferences as positive scoring inputs (distinct from hard-filter exclusions) in `packages/selection-core/src/preferences.ts`
- [ ] **T070** Seeded near-tie shuffle preserving strict order outside threshold in `packages/selection-core/src/near-tie.ts` (FR-022)

#### Orchestration & Configuration (T071-T074)
- [ ] **T071** Replace baseline ordering seam in `packages/selection-core/src/index.ts` with real scoring pipeline
- [ ] **T072** Populate real weight values (rating, reviewVolume, healthLean map, distance, nearTieThreshold, minReviewCount, searchRadiusMeters) in `services/suggestion-api/src/config/weights.ts`
- [ ] **T073** Implement `fixtures:report` script printing rankings in `packages/selection-core/scripts/fixtures-report.ts`
- [ ] **T073a** Quality bar assertion: ≥80% rated ≥4.0 with ≥25 reviews; ≤10% fast-food in `packages/selection-core/__tests__/quality-bar.test.ts` (SC-005, fails build if unmet)
- [ ] **T073b** Variety assertion: ≥50% of cycles show different first venue; no sub-threshold venue as first in `packages/selection-core/__tests__/variety.test.ts` (SC-013)
- [ ] **T074** Generate cycle seed per cycle & echo in `CycleResponse` in `services/suggestion-api/src/routes/cycle.ts` (FR-022b)

### Phase 4 Checkpoint
✅ **Deliverable**: MVP complete — widget shows one restaurant actually worth eating at; quality is measurable and tunable.

---

## Phase 5: User Story 3 - Refresh to the next option in the batch (Priority: P2)

**Goal**: Refresh advances through batch instantly with zero provider calls, wraps at end, can be disabled by config without disturbing US1-2.

### Phase 5 Tasks - Refresh Cycle Tests (T075-T080)

- [ ] **T075** [P] Cursor advance & wrap logic in `apps/mobile/__tests__/cursor.test.ts` (FR-016, FR-017)
- [ ] **T076** [P] Zero network calls during refresh in `apps/mobile/__tests__/no-refresh-network.test.ts` (FR-015)
- [ ] **T077** [P] `refreshEnabled: false` hides refresh affordance in `apps/mobile/__tests__/refresh-disabled.test.ts` (FR-019)
- [ ] **T078** [P] Sparse batch handling (fewer than 5 results) in `packages/selection-core/__tests__/sparse-batch.test.ts` (FR-018)
- [ ] **T079** [P] Integration test: refresh walk-through on iOS Simulator & Android emulator in `apps/mobile/__tests__/integration/refresh-walk.test.ts` (SC-003)
- [ ] **T080** [P] Snapshot test: all states with/without refresh control in both themes in `apps/mobile/__tests__/refresh-snapshots.test.ts`

### Phase 5 Tasks - Refresh Implementation (T081-T086)

- [ ] **T081** Cursor increment & wrap logic in `apps/mobile/src/cycle/cursor.ts`
- [ ] **T082** Refresh intent handling in iOS widget in `apps/mobile/widgets/ios/GoEatWidget.tsx`
- [ ] **T083** Refresh intent handling in Android widget in `apps/mobile/widgets/android/GoEatWidget.tsx`
- [ ] **T084** Update payload writer to handle cursor advancement in `apps/mobile/src/cycle/write-payload.ts` (add `cursor` to output)
- [ ] **T085** Wire `refreshEnabled` flag into both widget views for conditional UI
- [ ] **T086** Update batch invalidation: invalidate entire batch if location has drifted OR batch trust window expired; do NOT invalidate on cursor advance

### Phase 5 Checkpoint
✅ **Deliverable**: Users can refresh through suggestions instantly; feature is cleanly removable if post-MVP data says single-suggestion is preferred.

---

## Phase 6: User Story 4 - One-time setup, then get out of the way (Priority: P2)

**Goal**: New user installs Go-Eat, opens once, sees purpose, grants location, optionally sets preferences, is guided to add widget, then never needs to open app again.

### Phase 6 Tasks - Onboarding Tests (T087-T091)

- [ ] **T087** [P] Onboarding flow from launch through widget-install guidance in `apps/mobile/__tests__/integration/onboarding-flow.test.ts` (SC-004)
- [ ] **T088** [P] Permission denial + system settings link in `apps/mobile/__tests__/permission-denied.test.ts` (FR-024)
- [ ] **T089** [P] Preferences persist across app launches in `apps/mobile/__tests__/preferences-persist.test.ts`
- [ ] **T090** [P] No browsing/list/search/discovery UI exists anywhere in `apps/mobile/__tests__/no-discovery-ui.test.ts` (FR-005, Principle I)
- [ ] **T091** [P] Integration test: complete onboarding on iOS Simulator & Android emulator in `apps/mobile/__tests__/integration/full-onboarding.test.ts` (SC-005)

### Phase 6 Tasks - Onboarding Implementation (T092-T106)

#### App Shell & Routing (T092-T094)
- [ ] **T092** Initialize the Expo app (SDK 57+, New Architecture, expo-router) in `apps/mobile/app.config.ts` and `apps/mobile/` structure (was T027, needed here to be after design-tokens complete)
- [ ] **T093** App router layout in `apps/mobile/app/_layout.tsx` with deep-link handling
- [ ] **T094** Preferences storage and retrieval in `apps/mobile/src/storage/preferences.ts` (dietary exclusions/preferences, persisted in AsyncStorage)

#### Onboarding Screens (T095-T098)
- [ ] **T095** Onboarding purpose screen in `apps/mobile/app/onboarding/index.tsx` — explain what Go-Eat does, why widget needed
- [ ] **T096** Permission request screen in `apps/mobile/app/onboarding/permission.tsx` — rationale, grant button, deny with system settings link (FR-024)
- [ ] **T097** Dietary preferences screen in `apps/mobile/app/onboarding/preferences.tsx` — optional, exclusions/preferences selector
- [ ] **T098** Widget installation guide screen in `apps/mobile/app/onboarding/widget-install.tsx` — platform-specific step-by-step

#### Preferences Management (T099-T101)
- [ ] **T099** Preferences screen in `apps/mobile/app/preferences/index.tsx` — access from widget, adjust exclusions/preferences
- [ ] **T100** Dietary tag UI component in `apps/mobile/src/components/DietaryTagSelector.tsx` — render/interact with exclusion/preference options
- [ ] **T101** Apply preferences to next cycle (re-seed hash when preferences change in `apps/mobile/src/cycle/invalidation.ts`)

#### Theme & Styling (T102-T106)
- [ ] **T102** Import semantic tokens in app screens in `apps/mobile/app/` using `packages/design-tokens/src/tokens.ts`
- [ ] **T103** Apply tokens to onboarding screens (colors, spacing, typography)
- [ ] **T104** Apply tokens to preferences screen
- [ ] **T105** Safe area insets & layout for all screens (notches, home indicators)
- [ ] **T106** Dark theme switching support (app follows system appearance)

### Phase 6 Checkpoint
✅ **Deliverable**: MVP complete end-to-end — user can install, set up, and use the product without returning to the app.

---

## Post-Release Tasks

### Documentation & Attribution (T107-T110)

- [ ] **T107** Update `README.md` with quickstart (developer & end-user)
- [ ] **T108** Fill `THIRD_PARTY.md` with attribution for Google Places, Open Color, any other vendor libraries
- [ ] **T109** Document the cost model and rate limiting in `docs/cost-model.md` (R4, T045 outcome)
- [ ] **T110** Write ADR for any architectural decisions not yet recorded (e.g., device-local-only storage rationale)

### Spike (T033) - Location Acquisition Performance

- [ ] **T033** [SPIKE] Prove location acquisition freshness & performance on device development build:
  - Can a widget refresh obtain a sufficiently fresh anchor without foregrounding the app?
  - Measure location acquisition latency and whether system location services can honor sub-2s refresh
  - Record outcome in `specs/001-widget-restaurant-suggestion/research.md` under R7
  - **Does NOT block** backend, selection-core, or app-shell work; blocks only widget UI polish

### Quality Assurance & Optimization

- [ ] **T111** Performance profiling: widget render latency, cycle latency targets from plan
- [ ] **T112** Battery impact testing: location update frequency, network call timing
- [ ] **T113** Store submission compliance: Places attribution, app privacy policy, Terms of Service
- [ ] **T114** Localization: support for metric/imperial distance units (already scoped in T039)

---

## Dependency Graph (Critical Path)

```
Phase 1 (Setup) ✅
    ↓
Phase 2 (Foundational) ✅
    ├─→ T033 (Spike) 🚧 — blocks UI polish only
    ├─→ Phase 3 (US1: One Suggestion) 🚧
    │   ├─→ Phase 4 (US2: Quality Scoring) 🚧
    │   ├─→ Phase 5 (US3: Refresh) 🚧
    │   └─→ Phase 6 (US4: Onboarding) 🚧
    │       ├─→ Store Submission (T113)
    │       └─→ Release
```

### Blocking Constraints

- **T033 blocks**: T050a, T051a (widget background polish) — can implement with placeholder, spike results guide final UX
- **Phase 3 checkpoint blocks**: Phase 4 & 5 scheduling (can run in parallel, but US1 delivery gates MVP milestone)
- **T072 blocks**: T073a quality gate (weights must be tuned to pass quality bar)

---

## Quick Reference: Next Immediate Actions

**Priority Order** (after Phase 2 complete):

1. **Run T033 spike** on device development build — location acquisition performance unblocks UI decisions
2. **Phase 3 in parallel** — split into independent test groups:
   - Backend shape tests (T034-T037) — can start immediately
   - Client cycle logic (T047-T049a) — can start immediately
   - Widget views (T050-T056d) — blocked by T033 spike for polish, but can start with functional implementation
3. **Phase 4 golden fixtures** (T057) — start building fixture data while Phase 3 rendering implements
4. **Phase 4 scoring** (T066-T070) — implement scoring modules while tests are being written
5. **Parallelize where possible** — most tests marked [P] can run in any order once their implementation exists

---

## Notes

- All tasks include explicit test requirements (Principle IV, research R9 defines three-tier strategy)
- Contrast gate (T013d) is **blocking** — already passed; all UI work is unblocked
- No hard-coded brand/type filters anywhere — all selection keyed by provider types and scoring weights (Principle III)
- Every path supports simulator testing (Principle IV, SC-012)
- Rate limiting is cost backstop, not product feature (R4)
- Refresh is configurable and removable (Principle I, design decision R3)
