❯ /speckit-implement

I'll start by running prerequisites and checking the gate conditions.

  Ran 1 shell command

No extensions.yml, so hooks are skipped. Running prerequisites:

  Ran 1 shell command

All checklist items pass:

┌─────────────────┬───────┬─────────┬───────────┬────────┐
│    Checklist    │ Total │ Checked │ Unchecked │ Status │
├─────────────────┼───────┼─────────┼───────────┼────────┤
│ requirements.md │ 16    │ 16      │ 0         │ ✓ PASS │
└─────────────────┴───────┴─────────┴───────────┴────────┘

Proceeding. Loading the implementation context:

  Read 4 files, ran 1 shell command

Context loaded. Starting Phase 1: Setup.

  Ran 1 shell command

Now the root workspace config (T001, T007):

● Write(package.json)
Wrote 40 lines to package.json
{
  "name": "go-eat",
  "version": "0.1.0",
  "private": true,
  "description": "Go-Eat — a home screen widget that tells you where to eat",
  "license": "UNLICENSED",
  "engines": {
    "node": ">=22"
  },
  "workspaces": [
… +30 lines

T002 — shared TypeScript config:

● Write(tsconfig.base.json)
Wrote 29 lines to tsconfig.base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
… +19 lines

  Ran 1 shell command

T003 — ESLint and Prettier:

● Write(.eslintrc.cjs)
Wrote 76 lines to .eslintrc.cjs
/**
 * Root ESLint config.
 *
 * The custom design-system rules (no-raw-hex, no-primitive-reference) are registered by the
 * `goeat` plugin from packages/design-tokens/eslint-rules — see the overrides below. They are
 * errors, not warnings: Constitution VI.1 makes a raw hex literal in component code a build
 * failure, and a component referencing a primitive directly a review rejection.
 */
module.exports = {
  root: true,
… +66 lines

  Ran 1 shell command

T004 — Jest configs for the Node-only workspaces:

  Ran 1 shell command

Now the workspace package.json files, plus T005/T006 env examples:

  Ran 1 shell command

T005, T006 — env examples:

  Ran 1 shell command

Project setup verification — creating .gitignore (git repo, Node/TS/Expo stack):

● Write(~\Desktop\go-eat\.gitignore)
Wrote 47 lines to ..\.gitignore
# Dependencies
node_modules/

# Build output
dist/
build/
*.tsbuildinfo

# Environment — the Google Places key lives in services/suggestion-api/.env and must never be
# committed (Constitution V). Only the .env.example templates are tracked.
… +37 lines

T007a — CI workflow (Principle VI.5 requires the contrast gate to run in CI):

● Write(.github\workflows\ci.yml)
Wrote 48 lines to .github\workflows\ci.yml
name: CI

on:
  push:
    branches: ['**']
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
… +38 lines

Installing dependencies to verify the workspace graph resolves:

  Ran 1 shell command

Phase 1 complete. Marking tasks:

  Ran 1 shell command

Phase 1 complete (8/8). Now Phase 2: Foundational — starting with the T008 gate, which blocks T025.

● Fetch(https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
Received 203KB (200 OK)

● Fetch(https://developers.google.com/maps/billing-and-pricing/pricing)
Received 232.6KB (200 OK)

● Fetch(https://cloud.google.com/maps-platform/terms)
Received 2.3MB (200 OK)

● Web Search("Google Maps Platform Terms 3.2.3(b) caching Places API 30 consecutive calendar days Place ID indefinitely")
Did 1 search in 5s

● Fetch(https://developers.google.com/maps/documentation/places/web-service/nearby-search)
Received 300.5KB (200 OK)

Gate resolved. Recording the outcome in research.md (T008):

  Read 1 file, ran 1 shell command

● Update(specs\001-widget-restaurant-suggestion\research.md)
Added 1 line, removed 1 line

---

## R3. Restaurant data provider — DECIDED, pricing UNVERIFIED
## R3. Restaurant data provider — DECIDED, pricing VERIFIED

**Decision**: Google Places API (New), accessed exclusively through the backend.


● Update(specs\001-widget-restaurant-suggestion\research.md)
Added 61 lines, removed 6 lines
- **OpenStreetMap / Overpass** — free, but carries no ratings or review counts, which removes the
  entire scoring model and Constitution Principle III with it.

> **UNVERIFIED — BLOCKING BEFORE IMPLEMENTATION.** Current Places API pricing and free-tier
> allowances were **not** confirmed during this phase (the pricing lookup was declined). Google has
> restructured Maps billing and free tiers in the recent past, and the fields this product needs
> (rating, review count, opening hours) sit in higher-priced field tiers. **Confirm live pricing,
> per-SKU free-call allowances, and the Places content caching/retention terms against Google's
> official pricing page before writing provider code.** See R4 for why this number is load-bearing.
### R3a. Pricing and terms verification — RESOLVED 2026-08-14 (T008 gate)

Verified against Google's official pricing and terms pages. The gate is closed; provider code (T025)
is unblocked. Three findings, one of which changes the implementation.

**SKU tier — Nearby Search Enterprise.** Field masks are billed by tier, and the three fields the
scoring model cannot work without sit above the cheap tiers:

| Field | Tier | Required by |
|---|---|---|
| `places.id`, `displayName`, `types`, `location`, `businessStatus` | Essentials / Pro | FR-002, FR-007, FR-011 |
| `places.rating`, `userRatingCount` | **Enterprise** | FR-006, FR-010 |
| `places.currentOpeningHours` | **Enterprise** | FR-012 |

The whole scoring model (Principle III) depends on rating and review volume, so the Enterprise tier
is not optional. `Enterprise + Atmosphere` is **not** needed — it adds review text, editorial
summaries and amenity flags that Principle I forbids us from rebuilding anyway.

**Price**: `Places API Nearby Search Enterprise` (SKU 772E-9975-BE34), **$35.00 per 1,000 requests**
in the 0–100k monthly band, dropping to $28.00 (100k–500k) and $21.00 (500k–1M). Free allowance is
**1,000 requests per month** — the Enterprise cap, not the 5,000 that Essentials/Pro get.

**What this does to the cost model** — carried into R4:

| | Value |
|---|---|
| Cost per cycle | **$0.035** beyond the free 1,000/month |
| Free allowance in cycles | 1,000/month **total, across all users** |
| Cost of one user at 2 cycles/day | ≈ **$2.10 / user / month** |

That is a serious number for a free consumer widget, and it retroactively justifies the
batch-and-cycle mechanic: one billed request amortized over up to five refreshes drops the effective
cost per *suggestion viewed* to $0.007. It also promotes the R4 rate limit (T045) and
`batchTrustSeconds` from hygiene to primary cost levers — they are the two things that directly cap
spend per user.

**Implementation change — request 20 candidates, not 5.** `maxResultCount` accepts 1–20 and pricing
is **per request, not per result**. Asking for 5 and asking for 20 cost exactly the same. Since the
hard filters (`businessStatus`, `openNow`, user exclusions) run *after* the fetch, requesting 5 risks
a batch that filters down to one or zero — an avoidable `no_results` at full price. The adapter
therefore requests 20, filters, scores, and keeps the top 5 for the batch. This widens the SC-005
quality pool at zero marginal cost. Recorded here because it is a pricing consequence, not a
scoring choice.

**Caching and retention terms** (Maps Platform Service Specific Terms §3.2.3(b)):

- **Place IDs are exempt** from the caching restriction and may be stored indefinitely.
- **All other Places content** — name, rating, review count, hours, coordinates — may be cached for
  at most **30 consecutive calendar days**.
- No permanent storage, no scraping, no bulk extraction.

Go-Eat is comfortably inside this. The batch lives in device shared storage until the next cycle
replaces it, bounded by `batchTrustSeconds` (1800s), and the backend persists nothing at all. The
R4 decision against cross-user response caching is confirmed as correct — but note the constraint
was never the binding one here; Principle V (location borrowed, not kept) is stricter than Google's
terms in every dimension that overlaps.

> **Follow-up, non-blocking**: Places policies impose attribution requirements when Places content is
> displayed. The widget shows a name and rating sourced from Places, so confirm the required
> attribution surface before store submission and record it in `THIRD_PARTY.md` alongside the Open
> Color notice (FR-041). Not a v1 build blocker; it is a submission blocker.

---

## R4. Cost model — the constraint that shapes the architecture

Now updating R4's cost model with the verified numbers:

● Update(specs\001-widget-restaurant-suggestion\research.md)
Added 6 lines
**Finding**: Every candidate provider bills per request. Combined with FR-014 (one call per cycle),
**a suggestion cycle has a direct unit cost**, and total spend scales with cycles, not with installs.

**The unit cost is now known** (R3a, verified 2026-08-14): **$0.035 per cycle**, with only 1,000
free cycles per month across the entire service. At 2 cycles/day a single user costs ≈ $2.10/month.
This is high enough that the cost model is a product constraint, not an ops detail — it means the
free allowance is exhausted by roughly 16 daily-active users, and every architectural decision below
is load-bearing rather than precautionary.

**Why the spec's cycle-trigger decision matters more than it first appeared**: FR-020 restricts new
cycles to user refresh and batch invalidation, with no timer and no meal-window trigger. That means
spend tracks actual user intent. A meal-window trigger would have billed for every installed user

● Update(specs\001-widget-restaurant-suggestion\research.md)
Added 5 lines, removed 1 line

**Decisions carried forward**:

- Batch size stays at 5 (FR-014). One request amortized across up to five refreshes.
- Batch size stays at 5 (FR-014). One request amortized across up to five refreshes, which is what
  takes the cost per *suggestion viewed* from $0.035 down to $0.007.
- The provider request asks for `maxResultCount: 20`, not 5. Pricing is per request regardless of
  result count (R3a), so the larger pool is free and protects the batch from being filtered down to
  nothing. Fetch 20 → hard-filter → score → keep 5.
- The backend MUST emit a per-cycle counter so cost per active user is observable from day one.
- The backend MUST enforce a per-installation cycle rate limit as an abuse/runaway-cost guard. This
  is a backstop, not a product feature, and MUST NOT surface as a user-facing restriction.

● Update(specs\001-widget-restaurant-suggestion\plan.md)
Added 5 lines, removed 2 lines

**Three gates carried into implementation** (none blocks Phase 1 design):

1. **Places API pricing and terms unverified** (R3). Must be confirmed before provider code is
   written — it validates the cost model and the caching/retention posture.
1. **Places API pricing and terms** (R3). **RESOLVED 2026-08-14.** Nearby Search *Enterprise* SKU at
   $35/1,000 with a 1,000-request monthly free cap — $0.035 per cycle. Content caching is capped at
   30 days (Place IDs exempt), which the device-local batch never approaches. One implementation
   consequence: request `maxResultCount: 20`, since pricing is per request and the larger pool is
   free. Recorded in R3a.
2. **Widget location acquisition spike** (R7). Must be proven in a development build before widget
   UI is polished.
3. **Android dynamic color ADR** (R10). Resolved: fixed Open Color palette in v1, dynamic color

T008 gate resolved. Now T009–T011 — contract types. Reading the API contract:

  Read 1 file

● Write(packages\contract-types\src\suggestion-api.ts)
Wrote 148 lines to packages\contract-types\src\suggestion-api.ts
/**
 * Types for the Go-Eat suggestion API, generated by hand from
 * `specs/001-widget-restaurant-suggestion/contracts/suggestion-api.yaml`.
 *
 * The YAML is the source of truth. If the two disagree, the YAML wins and this file is the bug.
 */

/**
 * Dietary tags. The same vocabulary serves two different mechanisms:
 * `exclusions` are hard filters (FR-011), `preferences` are positive scoring inputs. A tag may
… +138 lines

T010 — widget payload types. Reading that contract first:

  Read 1 file

● Write(packages\contract-types\src\widget-payload.ts)
Wrote 88 lines to packages\contract-types\src\widget-payload.ts
/**
 * The app→widget contract, from `contracts/widget-payload.md`.
 *
 * This is the ONLY channel through which the two widget implementations receive data. Widgets do
 * not run JavaScript — iOS views compile to Swift, Android widgets are RemoteViews — so anything
 * this payload leaves undone must be implemented twice, in two languages, and tested on two
 * simulators. Every string here is therefore already truncated, rounded, abbreviated, and
 * unit-converted.
 *
 * Note what is NOT here: no color, no theme, no scores, no sibling items, no counts. Theme is
… +78 lines

The contract has an internal contradiction I need to resolve: item is documented as non-null "only when state === "suggestion"", but stale is specified to render "Last known item with a stale indicator". Fixing:

● Update(specs\001-widget-restaurant-suggestion\contracts\widget-payload.md)
Added 1 line, removed 1 line
| `updatedAt` | `ISO8601` | When the payload was written |
| `isStale` | `boolean` | True when displaying data the app could not refresh. Drives the stale indicator |
| `refreshEnabled` | `boolean` | False hides the refresh control entirely (FR-019) |
| `item` | `object \| null` | Non-null **only** when `state === "suggestion"` |
| `item` | `object \| null` | Non-null **only** when `state` is `"suggestion"` or `"stale"`. `stale` renders the last known item alongside the stale indicator,
 so it needs the item too — null in every other state |

### WidgetState


T011 — export barrel, then T012/T013 (core domain types and the seeded PRNG):

● Write(packages\contract-types\src\index.ts)
Wrote 17 lines to packages\contract-types\src\index.ts
export type {
  ApiError,
  BatchState,
  ClientConfig,
  CycleRequest,
  CycleResponse,
  DietaryTag,
  ErrorCode,
  HealthResponse,
  LocationAnchor,
… +7 lines

● Write(packages\selection-core\src\types.ts)
Wrote 99 lines to packages\selection-core\src\types.ts
import type { DietaryTag } from '@go-eat/contract-types';

/**
 * Domain types for the pure selection core, from data-model.md.
 *
 * Nothing in this package performs IO. No network, no clock, no filesystem, no `Math.random`.
 * That is what makes Principle IV mechanically enforceable rather than aspirational: scoring can
 * be exercised in plain Node against fixtures with no simulator and no provider key.
 */
… +89 lines

T013 — the seeded PRNG:

● Write(packages\selection-core\src\rng.ts)
Wrote 80 lines to packages\selection-core\src\rng.ts
/**
 * Seeded deterministic PRNG.
 *
 * Constitution Principle IV: "Randomness MUST be seeded and the seed injectable. Unseeded
 * randomness in selection is prohibited." `Math.random` therefore appears nowhere in this package —
 * ESLint enforces that via `no-restricted-properties`, and `__tests__/rng.test.ts` asserts it by
 * reading the source.
 *
 * The property that matters is not statistical quality. It is that a cycle seed round-trips: the
 * backend returns the seed it used (FR-022b), and replaying it reproduces the ordering exactly
… +70 lines

Now the design-tokens track (T013a–T013k), which contains the blocking gate. Reading the design law:

  Read 1 file, ran 2 shell commands

T013a — load the pinned primitives:

● Write(packages\design-tokens\src\primitives.ts)
Wrote 213 lines to packages\design-tokens\src\primitives.ts
/**
 * Layer 1 — primitives.
 *
 * Constitution VI.1: this file is the ONLY place in the repository where a hex literal is
 * permitted. Constitution VI.3: primitives carry no semantics and are referenced ONLY by the
 * semantic layer in `semantics.ts` — never by a component. The `goeat/no-primitive-reference`
 * ESLint rule enforces the second half of that.
 *
 * Constitution VI.2: Open Color v1.9.1 (MIT, yeun/open-color), PINNED. Upstream states colors may
 * change between versions, so a version bump requires re-running the contrast gate before merge —
… +203 lines

I transcribed hues beyond gray/blue from memory — verifying every value against the pinned JSON before going further:

  Made 1 scratchpad edit +37, ran 2 shell commands

All 130 values match the pinned JSON. T013c — contrast math (needed before the gate can assert anything):

● Write(packages\design-tokens\src\contrast.ts)
Wrote 101 lines to packages\design-tokens\src\contrast.ts
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
… +91 lines

T013b — the semantic map as data, with the recorded ratios:

● Write(packages\design-tokens\src\semantics.ts)
Wrote 250 lines to packages\design-tokens\src\semantics.ts
import type { PrimitiveRef } from './primitives.js';
import { resolvePrimitive } from './primitives.js';

/**
 * Layer 2 — semantic tokens. Transcribed from `specs/design-system/color-semantics.md`, which is
 * the source of truth.
 *
 * Constitution VI.3: this is the ONLY layer components may reference. There is no third layer and
 * there are no component-scoped color tokens.
 *
… +240 lines

Now T013d — the blocking contrast gate:

● Write(packages\design-tokens\__tests__\contrast-gate.test.ts)
Wrote 211 lines to packages\design-tokens\__tests__\contrast-gate.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CONTRAST_REQUIREMENTS, contrastRatio, ratio2dp } from '../src/contrast.js';
import { PALETTE_VERSION, PRIMITIVES, resolvePrimitive } from '../src/primitives.js';
import type { ThemeName } from '../src/semantics.js';
import { DARK, LIGHT, THEMES, TOKEN_NAMES, resolveToken } from '../src/semantics.js';

/**
 * THE CONTRAST GATE — blocking (Constitution VI.5).
… +201 lines

  Ran 1 shell command

"type": "module" conflicts with the CommonJS jest configs — renaming to .cjs:

  Ran 2 shell commands

The gate caught a drift on its first run. Verifying independently before trusting either number:

  Ran 1 shell command

Real inconsistency in the design law, not a test bug. color-semantics.md records dark status.success as oc.teal.4 but with hex #63E6BE — and teal.4 is #38D9A9; #63E6BE is teal.3. The hex and the recorded 9.99:1 agree with each other, so the step label is the outlier. Fixing the label:

● Update(specs\design-system\color-semantics.md)
Error editing file

  Ran 1 shell command

● Update(specs\design-system\color-semantics.md)
Added 1 line, removed 1 line
| accent.fill            | oc.blue.4   | #4DABF7  |  6.23:1 w/ gray.9   |
| accent.onFill          | oc.gray.9   | #212529  |                     |
| status.danger          | oc.red.4    | #FF8787  |  6.66:1 on base     |
| status.success         | oc.teal.4   | #63E6BE  |  9.99:1 on base     |
| status.success         | oc.teal.3   | #63E6BE  |  9.99:1 on base     |
| status.warning         | oc.orange.4 | #FFA94D  |  8.11:1 on base     |

## Traps this map encodes (do not "simplify" these)

● Update(packages\design-tokens\src\semantics.ts)
Added 2 lines, removed 1 line
    verifiedRatio: 6.66,
  },
  'status.success': {
    primitive: 'oc.teal.4',
    primitive: 'oc.teal.3',
    role: 'text',
    against: 'surface.base',
    verifiedRatio: 9.99,
    note: 'teal-3, not teal-4. The map originally labelled this teal-4 while recording teal-3\'s hex and ratio; the gate caught the disagreement. Step 3 here
rather than the step 4 the other dark chromatics use — VI.7, themes are not mirrored and roles are not index-matched.',
  },
  'status.warning': {
    primitive: 'oc.orange.4',

  Ran 1 shell command

T013d passes — 18/18. The blocking gate is green, so widget UI work is unblocked. Now T013e, the ADR that blocks T013g:

  Ran 1 shell command

● Write(specs\design-system\adr-001-android-dynamic-color.md)
Wrote 108 lines to specs\design-system\adr-001-android-dynamic-color.md
# ADR-001: Android dynamic color (Material You) is not adopted for the v1 widget

**Status**: Accepted
**Date**: 2026-08-14
**Deciders**: Go-Eat maintainers
**Supersedes**: none
**Related**: Constitution VI.5, VI.6, VI.7 · research R2, R10 · `platform-mapping.md` · FR-036, FR-039, SC-015

---
… +100 lines

Now the generators — T013f (iOS Asset Catalog) and T013g (Android, unblocked by the ADR):

● Write(packages\design-tokens\generators\ios-asset-catalog.ts)
Wrote 92 lines to packages\design-tokens\generators\ios-asset-catalog.ts
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseHex } from '../src/contrast.js';
import { LIGHT, TOKEN_NAMES, resolveToken } from '../src/semantics.js';

/**
 * iOS Asset Catalog generator.
 *
 * Emits one Color Set per SEMANTIC token, each with an Any (light) and a Dark variant. The
… +82 lines

● Write(packages\design-tokens\generators\android-colors.ts)
Wrote 102 lines to packages\design-tokens\generators\android-colors.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { TOKEN_NAMES, resolveToken } from '../src/semantics.js';

/**
 * Android color resource generator.
 *
 * Emits `res/values/colors.xml` (light) and `res/values-night/colors.xml` (dark) from the fixed
 * semantic map. The Android resource system picks the file by system appearance, so the widget
… +92 lines

● Write(packages\design-tokens\generators\run.ts)
Wrote 36 lines to packages\design-tokens\generators\run.ts
import { join } from 'node:path';

import { TOKEN_NAMES, THEMES } from '../src/semantics.js';
import { generateAndroidColors, remoteViewsApplication } from './android-colors.js';
import { assertGeneratable, generateIosAssetCatalog } from './ios-asset-catalog.js';

/**
 * `npm run tokens:generate`.
 *
 * Regenerates both platforms' color assets from the one semantic map. This is the mechanism that
… +26 lines

  Ran 1 shell command

● Update(packages\design-tokens\generators\run.ts)
Added 2 lines, removed 1 line
import { join } from 'node:path';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOKEN_NAMES, THEMES } from '../src/semantics.js';
import { generateAndroidColors, remoteViewsApplication } from './android-colors.js';

● Update(packages\design-tokens\generators\run.ts)
Added 2 lines, removed 1 line
 * keeps the R2 duplication tax off the palette: the two widgets duplicate layout, never values.
 */

const REPO_ROOT = join(__dirname, '..', '..', '..');
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const IOS_OUT = join(REPO_ROOT, 'apps', 'mobile', 'generated', 'ios', 'Colors.xcassets');
const ANDROID_OUT = join(REPO_ROOT, 'apps', 'mobile', 'generated', 'android', 'res');


  Ran 1 shell command

T013h — the lint rules that make VI.1 a build failure:

● Write(packages\design-tokens\eslint-rules\index.js)
Wrote 110 lines to packages\design-tokens\eslint-rules\index.js
/**
 * eslint-plugin-goeat — the design-system rules that make Constitution VI mechanically enforceable.
 *
 * VI.1: "Raw hex literals in component code are a build failure. Primitives (Open Color) are
 * referenced ONLY by the semantic layer, never by a component."
 *
 * A review check would catch most violations most of the time. These rules catch all of them every
 * time, which matters here because a stray hex in a widget view is not merely inconsistent — it is
 * a value that would then have to be maintained in Swift AND in Kotlin, and that no contrast gate
 * would ever see.
… +102 lines

  Ran 1 shell command

Verifying the lint rules actually fire:

  Ran 1 shell command

All three rules fire. T013k — TypeScript token export for the RN screens, and T013j — MIT attribution:

● Write(packages\design-tokens\src\tokens.ts)
Wrote 52 lines to packages\design-tokens\src\tokens.ts
import type { ThemeName } from './semantics.js';
import { TOKEN_NAMES, resolveToken } from './semantics.js';

/**
 * Semantic tokens as a TypeScript module, for the React Native app surfaces.
 *
 * The widgets read the *generated native* assets (Asset Catalog / colors.xml) because they cannot
 * run JavaScript. The app screens are the opposite case: they are styled in JS and cannot read a
 * native asset catalog at all. Both must nonetheless resolve to the same semantic map — FR-034
 * covers the app as well as the widget, and two divergent sources of colour would defeat the
… +42 lines

● Write(THIRD_PARTY.md)
Wrote 69 lines to THIRD_PARTY.md
# Third-party notices

Go-Eat incorporates the third-party material listed below. Constitution VI.2 pins the palette
version, and the MIT license requires the notice to travel with the work (FR-041).

---

## Open Color

- **Version**: 1.9.1 (**pinned**)
… +59 lines

T013i — wire tokens:generate into the mobile build, plus the design-tokens barrel:

  Ran 1 shell command

Now the selection-core foundation — T014 (hard filters) and T015 (the ordering seam):

● Write(packages\selection-core\src\filters.ts)
Wrote 73 lines to packages\selection-core\src\filters.ts
import type { DietaryTag } from '@go-eat/contract-types';

import type { RestaurantCandidate } from './types.js';

/**
 * Hard filters, applied in a FIXED order before any scoring happens (FR-011, FR-012).
 *
 * Order matters and is specified in data-model.md:
 *   1. businessStatus !== OPERATIONAL
 *   2. openNow === false
… +63 lines

  Ran 1 shell command

● Write(packages\selection-core\src\index.ts)
Wrote 111 lines to packages\selection-core\src\index.ts
import type { LatLng, RestaurantCandidate, ScoredCandidate, ScoringWeights, UserSelectionInput } from './types.js';
import { applyHardFilters, batchStateFor } from './filters.js';
import { distanceMeters } from './geo.js';
import { createRng } from './rng.js';

/**
 * The public surface of the selection core.
 *
 * `orderCandidates` is deliberately a SEAM. User Story 1 ships against the baseline ordering
 * below; User Story 2 replaces the internals with the real scoring pipeline without touching this
… +101 lines

T016 and T017 — the foundational tests:

● Write(packages\selection-core\__tests__\filters.test.ts)
Wrote 135 lines to packages\selection-core\__tests__\filters.test.ts
import { applyHardFilters, batchStateFor } from '../src/filters.js';
import { orderCandidates } from '../src/index.js';
import type { RestaurantCandidate, ScoringWeights } from '../src/types.js';

/**
 * Hard filters run before ordering, and excluded venues never reach the shuffle (SC-009).
 */

function candidate(over: Partial<RestaurantCandidate> = {}): RestaurantCandidate {
  return {
… +125 lines

● Write(packages\selection-core\__tests__\rng.test.ts)
Wrote 117 lines to packages\selection-core\__tests__\rng.test.ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { createRng, hashSeed, shuffle } from '../src/rng.js';

/**
 * Seeded PRNG determinism, and the absence of `Math.random` (Constitution IV).
 */

describe('seeded PRNG', () => {
… +107 lines

  Ran 1 shell command

● Update(packages\selection-core\__tests__\rng.test.ts)
Added 2 lines, removed 2 lines
    // same venue first, defeating the entire point — so this asserts real distribution.
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i += 1) {
      const result = shuffle([0, 1, 2, 3], createRng(`seed-${i}`));
      counts[result[0]!] += 1;
      const first = shuffle([0, 1, 2, 3], createRng(`seed-${i}`))[0] as number;
      counts[first] = (counts[first] ?? 0) + 1;
    }
    for (const c of counts) {
      expect(c).toBeGreaterThan(700); // Expected 1000 each; generous band, catches real bias.

  Ran 1 shell command

The guard is firing on the comments that document the prohibition. Stripping comments before the check:

● Update(packages\selection-core\__tests__\rng.test.ts)
Added 7 lines, removed 1 line
        return statSync(path).isDirectory() ? walk(path) : [path];
      });

    // Comments are stripped first. Several files legitimately *mention* Math.random to explain
    // why it is banned, and a guard that fired on its own documentation would push people to stop
    // writing the explanation.
    const stripComments = (source: string): string =>
      source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    const offenders = walk(srcDir).filter(
      (file) => file.endsWith('.ts') && readFileSync(file, 'utf8').includes('Math.random'),
      (file) => file.endsWith('.ts') && stripComments(readFileSync(file, 'utf8')).includes('Math.random'),
    );

    expect(offenders).toEqual([]);

  Ran 1 shell command

22 passing. Now the backend shell (T018–T024):

  Ran 1 shell command

● Write(services\suggestion-api\src\config\index.ts)
Wrote 140 lines to services\suggestion-api\src\config\index.ts
import type { ClientConfig } from '@go-eat/contract-types';
import type { ScoringWeights } from '@go-eat/selection-core';

import { WEIGHTS } from './weights.js';

/**
 * Operator-owned configuration.
 *
 * Constitution III: every value here is adjustable without modifying selection logic and without
 * shipping a client release. Constitution II: none of it is a user-facing control — search
… +130 lines

● Write(services\suggestion-api\src\config\weights.ts)
Wrote 61 lines to services\suggestion-api\src\config\weights.ts
import type { ScoringWeights } from '@go-eat/selection-core';

/**
 * Scoring weights — operator-owned, never user-visible (Principle II), tunable without a client
 * release (Principle III).
 *
 * The four relative weights are deliberately NOT design-time decisions. Data-model.md leaves them
 * unset because they are established by tuning against the golden fixtures (T072), and the values
 * below are a starting point for that tuning, not an answer.
 *
… +51 lines

T020, T021 — coarse logging and the error envelope:

  Ran 1 shell command

T018, T022, T023 — the Fastify skeleton and the two simple routes:

  Ran 1 shell command

T024 — the config contract test, which asserts weights never leak:

● Write(services\suggestion-api\__tests__\config.contract.test.ts)
Wrote 120 lines to services\suggestion-api\__tests__\config.contract.test.ts
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.js';
import { assertInvariants, loadConfig, toClientConfig } from '../src/config/index.js';

/**
 * GET /v1/config conforms to the schema and leaks no scoring weights (Principle II).
 */

const REQUIRED_FIELDS = [
… +110 lines

  Ran 2 shell commands

Replacing the deprecated option with an explicit redacting serializer:

● Update(services\suggestion-api\src\app.ts)
Added 13 lines, removed 5 lines
  const config = options.config ?? loadConfig();

  const app = Fastify({
    logger: options.logger ?? false,
    // Coordinates arrive in the body and must never be echoed into request logs at full
    // precision (Constitution V). Disabling Fastify's automatic request logging is the simplest
    // way to guarantee that; deliberate logging goes through lib/logging.ts.
    disableRequestLogging: true,
    logger: options.logger
      ? {
          // Constitution V. Fastify does not log request bodies, so coordinates do not reach the
          // log by default — but the default request serializer DOES log `remoteAddress`, and an
          // IP is precisely the identifier that would turn aggregate diagnostics back into a
          // per-user trail. Redacted here rather than trusted to stay absent.
          serializers: {
            req(request: { method: string; url: string }) {
              return { method: request.method, url: request.url };
            },
          },
        }
      : false,
  });

  app.setErrorHandler((error, _request, reply) => {

Now T025 — the Google Places adapter, unblocked by T008:

● Write(services\suggestion-api\src\provider\places.ts)
Wrote 196 lines to services\suggestion-api\src\provider\places.ts
import type { DietaryTag } from '@go-eat/contract-types';
import type { BusinessStatus, LatLng, RestaurantCandidate } from '@go-eat/selection-core';

import { providerUnavailable } from '../lib/errors.js';

/**
 * Google Places API (New) — Nearby Search adapter.
 *
 * THE ONLY place the provider credential is read, and the only outbound restaurant-data call in
 * the system (`scripts/check-single-provider.ts` asserts both).
… +186 lines

T026 — provider response fixtures across the three coordinate profiles:

  Made 1 scratchpad edit +106, ran 1 shell command

Now the client-side foundation — T029–T032, plus T031a's guard test:

  Ran 2 shell commands

T031a — the Principle V guard test. Setting up the mobile Jest config first:

  Ran 1 shell command

● Write(apps\mobile\__tests__\no-location-history.test.ts)
Wrote 165 lines to apps\mobile\__tests__\no-location-history.test.ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  DEFAULT_THRESHOLDS,
  evaluateBatch,
  hasDrifted,
  isStale,
  metersBetween,
} from '../src/cycle/invalidation.js';
… +155 lines

  Ran 1 shell command

T027, T028 — Expo app config with both widget plugins:

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Wrote 98 lines to apps\mobile\app.config.ts
import type { ExpoConfig } from 'expo/config';

/**
 * Expo app configuration.
 *
 * Two widget plugins, because there is no cross-platform widget layer (research R2):
 * `expo-widgets` compiles SwiftUI views for iOS, `react-native-android-widget` produces
 * RemoteViews for Android. Both are configured here so the shared-storage keys in
 * `contracts/widget-payload.md` are declared in exactly one place.
 *
… +88 lines

Marking Phase 2 progress and running the full suite:

  Ran 1 shell command
You've hit your monthly spend limit.
/usage-credits to adjust your monthly spend limit.

