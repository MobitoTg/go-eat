# Go-Eat

Tells you where to eat. One restaurant, on your home screen widget — no list, no browsing, no
search. See `specs/001-widget-restaurant-suggestion/spec.md` for the full feature specification and
`.specify/memory/constitution.md` for the non-negotiable product principles this repo is built to.

## Layout

```text
apps/mobile/            Expo app — onboarding/preferences screens, both widget implementations
packages/selection-core/  Pure, IO-free scoring (no simulator, no network, no provider key)
packages/contract-types/  Shared payload types (API contract + widget payload)
packages/design-tokens/   Semantic color map, contrast gate, platform asset generators
services/suggestion-api/  Stateless backend — the only place the provider key lives
specs/design-system/      Project-wide color law (outside any one feature)
```

## Setup

```bash
npm install
cp services/suggestion-api/.env.example services/suggestion-api/.env   # set GOOGLE_PLACES_API_KEY
cp apps/mobile/.env.example apps/mobile/.env                            # set EXPO_PUBLIC_API_URL
npm run tokens:generate   # regenerate platform color assets from the semantic map
```

## The three test tiers

Research R9 defines these; `.github/workflows/ci.yml` runs Tier 1 and 2 on every push.

- **Tier 1 — pure logic** (`packages/selection-core`, `packages/design-tokens`): no simulator, no
  network, no provider key. `npm test --workspace=packages/selection-core`,
  `npm test --workspace=packages/design-tokens`.
- **Tier 2 — contract & client logic** (`services/suggestion-api`, `apps/mobile`): no simulator.
  The backend's HTTP contract and the client's cycle/cursor/storage logic, run against in-memory
  fakes for storage, location, and the network. `npm test --workspace=services/suggestion-api`,
  `npm test --workspace=apps/mobile`.
- **Tier 3 — integration** (`apps/mobile/__tests__/integration/`): a real iOS Simulator/Android
  emulator plus Detox. Not runnable in a plain CI container or this kind of sandboxed environment —
  see `specs/001-widget-restaurant-suggestion/quickstart.md` for the manual scenario walkthroughs.

Regenerate the scoring regression report after any change to scoring, weights, or candidate
assembly:

```bash
npm run fixtures:report --workspace=packages/selection-core
```

## Constitution review checks

A change should be rejected if it introduces:

- a user-facing choice (Principle II — the widget shows exactly one suggestion, never a list)
- a hardcoded venue name or brand list (Principle III — `packages/selection-core/__tests__/no-brand-list.test.ts`)
- unseeded randomness in selection (Principle IV — `packages/selection-core/__tests__/rng.test.ts`)
- retained location or suggestion history (Principle V — `apps/mobile/__tests__/no-location-history.test.ts`, `packages/selection-core/__tests__/no-history.test.ts`)
- a second restaurant data provider, or a provider call per refresh (`npm run check:provider`, `packages/selection-api/__tests__/one-call.test.ts`)
- a raw hex literal or a component referencing a primitive token directly (Principle VI — `packages/design-tokens/eslint-rules/`)
- the provider credential appearing under `apps/mobile/` (Principle V — `npm run check:secrets`)

## Known gaps

- **Native widget builds**: `apps/mobile/widgets/ios/GoEatWidget.tsx` (`expo-widgets`) and
  `apps/mobile/widgets/android/GoEatWidget.tsx` (`react-native-android-widget`) are written against
  each library's real, installed type declarations, but neither has been built or run on a device —
  that needs `expo run:ios` / `expo run:android` on real hardware/Simulator, not available in this
  environment (research R1/R7).
- **iOS App Group / Android SharedPreferences bridge**: `apps/mobile/src/bootstrap.ts` currently
  wires `shared-storage.ts` to `AsyncStorage`, which does NOT cross into the widget's actual shared
  container. See that file's header for what real bridge is still needed.
- **T033 spike** (whether a widget refresh can get a fresh location fix without foregrounding the
  app) and the Tier 3 Detox scenarios all require a real device/Simulator and remain open — see
  `specs/001-widget-restaurant-suggestion/tasks.md` for the current status of every task.
