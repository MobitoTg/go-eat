<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Rationale: MINOR. A new Core Principle (VI. Color Is a Contract, Not a Choice) is added and
the quality gates are materially expanded with a contrast gate. No existing principle is
removed, renamed, or redefined, so no MAJOR bump is warranted.

Modified principles: none renamed or redefined.

Added sections:
  - Core Principle VI. Color Is a Contract, Not a Choice (clauses VI.1–VI.7)
  - Contrast gate paragraph under Development Workflow & Quality Gates
  - Color review check added to the existing review-checks list
  - Both-themes and tinted-mode conditions added to Definition of done

Removed sections: none

Source of derived content:
  User-supplied addendum at .specify/memory/constitution-addeundum.md ("Article VII — Color
  System"). Content preserved verbatim in substance. Two adjustments were required to make it
  consistent with this document:
    1. Renumbered Article VII → Principle VI. This constitution numbers Core Principles I–V;
       an "Article VII" implied Articles I–VI that do not exist.
    2. Corrected the color-semantics path. The addendum cited
       specs/design-system/color-semantics.md while the file sat under feature 001's
       contracts/. The design-system files were moved to specs/design-system/ so that
       project-wide design law does not depend on one feature's directory.

Deferred TODOs:
  - TODO(BRAND_IDENTITY_COLOR): VI.2 prohibits Open Color as the product's brand identity
    color. No brand color has been chosen. Not blocking v1; blocks any brand-facing surface.
  - RESOLVED(ANDROID_DYNAMIC_COLOR_ADR): decided as fixed Open Color palette for v1, with
    Material You dynamic color deferred. The intuitive hybrid — dynamic neutrals and surfaces,
    fixed status colors — cannot satisfy VI.5, because surfaces are the reference side of every
    contrast pairing and RemoteViews widgets cannot resolve contrast at runtime. Recorded in
    research R10 and ADR-001.
-->

# Go-Eat Constitution

## Core Principles

### I. The Widget Is the Product

The home screen widget is the entire product surface. Every unit of work MUST be justified by
how it makes the widget's single suggestion appear, improve, or resolve to a destination.

- The app exists only to serve the widget: onboarding, permissions, and preferences. Nothing else.
- No browsing, list view, search field, map explorer, or discovery interface may be added to the
  app, in any form, at any priority.
- Go-Eat MUST NOT rebuild capability that the maps provider already owns — restaurant detail,
  photos, reviews, hours, and directions are handed off, never reimplemented.

**Rationale**: A product that tells you where to eat competes directly with the instinct to build
a restaurant app. Without a hard boundary, "just a small list view" arrives by increment and the
thesis dies. Traces to FR-001, FR-024, FR-028.

### II. One Decision, Never a Menu

The user is told where to eat. They are never asked to choose, compare, or configure.

- The widget MUST display exactly one restaurant. No list, carousel, ranked alternatives, or
  preview of what else was considered.
- Tuning knobs belong to operators, not users. Search distance, scoring weights, and near-tie
  thresholds MUST NOT be exposed as user-facing controls.
- User-facing settings are limited to what constrains suggestions on the user's behalf — dietary
  preferences and exclusions — not what re-opens the decision.
- New UI that asks the user a question MUST be treated as a violation until proven otherwise.

**Rationale**: Decision fatigue is the problem being solved. Every added choice is a partial
return of the burden the product exists to remove. Traces to FR-001, FR-003.

### III. Tunable Models, Not Hardcoded Rules

Selection behavior lives in adjustable configuration, never in branching logic or named lists.

- Venue de-prioritization MUST be expressed as scoring weights. Hardcoded lists of brand names,
  business names, or venue identifiers are prohibited outright.
- All scoring inputs — rating, review volume, cuisine/health lean, distance, near-tie threshold —
  MUST be adjustable without modifying selection logic and without shipping a client release.
- Changing a weight MUST measurably change rankings; if it does not, the weight is decorative and
  MUST be removed or fixed.

**Rationale**: Suggestion quality is the product's only defensible asset and it will be wrong at
first. A model that can be tuned from data survives; a model expressed as accumulated special
cases calcifies and cannot be reasoned about. Traces to FR-008, FR-009, FR-013.

### IV. Deterministic, Simulator-Verifiable Behavior

Every behavior MUST be reproducible on demand and exercisable in an iOS or Android simulator at
every stage of development.

- Randomness MUST be seeded and the seed injectable. Unseeded randomness in selection is prohibited.
- Location, provider responses, clock, and permission state MUST be injectable so that scenarios —
  sparse areas, closed venues, denied permissions, offline, stale data — are testable without a
  physical device or a real trip.
- Scoring MUST be assertable independently of presentation and of post-scoring ordering.
- A change that can only be verified by walking around with a phone is not verified.

**Rationale**: A location-driven widget is the hardest possible thing to test by hand. Determinism
and injectable inputs are what make suggestion quality a measurable engineering property instead of
an anecdote. Traces to FR-013, FR-022b, SC-012, SC-014.

### V. Location Is Borrowed, Not Kept

The product reads the user's location to answer one question and then lets it go.

- Precise location MUST be used only to serve the active suggestion cycle and MUST NOT be retained
  beyond it.
- No history of suggested restaurants may be stored. Variety MUST come from mechanisms that require
  no memory of the user.
- v1 MUST function with no account, no login, and no server-side user identity. Preferences are
  device-scoped.
- Provider credentials MUST NOT be embedded in the client.

**Rationale**: The product asks for continuous location access in exchange for a restaurant name.
That trade is only defensible if the data genuinely does not accumulate, and the cheapest way to
guarantee that is to build so there is nowhere for it to accumulate. Traces to FR-022a, FR-031, FR-032.

### VI. Color Is a Contract, Not a Choice

**VI.1 Single source of truth**: All color MUST resolve to a semantic token defined in
`specs/design-system/color-semantics.md`. Raw hex literals in component code are a build failure.
Primitives (Open Color) are referenced ONLY by the semantic layer, never by a component.

**VI.2 Palette provenance**: Primitives are Open Color v1.9.1 (MIT, yeun/open-color), pinned.
Upstream states that colors may change between versions; a version bump therefore requires
re-running the contrast gate (VI.5) before merge. Open Color MUST NOT be used as the product's
brand identity color.

**VI.3 Two-layer token architecture**: Layer 1 (primitive) is `oc.<hue>.<0-9>` — immutable, no
semantics. Layer 2 (semantic) is `color.<role>.<variant>` — theme-aware, and the only layer
components may reference. There is no third layer and there are no component-scoped color tokens.

**VI.4 Minimalist constraint**: Any single widget surface renders at most THREE chromatic values:
one neutral ramp, one accent, one optional status color. A fourth requires an explicit ADR.

**VI.5 Contrast gate (blocking)**: Text MUST meet 4.5:1. Large or bold text MUST meet 3:1.
Interactive and meaningful non-text boundaries MUST meet 3:1. Verified in CI for BOTH themes
against the semantic map. Ratios are recorded, not estimated.

**VI.6 Widget backdrop rule**: A widget cannot assume its backdrop. Every widget MUST paint its own
opaque base surface, or opt into the platform material and derive text from that material's own
vibrancy roles. Contrast is never computed against the wallpaper.

**VI.7 Theme steps are not mirrored**: Dark theme MUST NOT be derived by inverting step indices.
Each theme has an independently specified and independently verified step assignment.

**Rationale**: The widget is the entire product surface (I), and it renders over an unknown
wallpaper, in two themes, on two platforms, in native code that must be written twice (research R2).
Color decided per-component under those conditions is not a matter of taste — it is a legibility
failure waiting to ship, and it would have to be re-litigated in Swift and again in Kotlin. A
recorded, CI-gated token map turns contrast into a build-time property instead of a per-component
judgment call. Traces to Principle I, FR-002, FR-004, SC-001.

## Product & Platform Constraints

**Single provider**: v1 MUST use exactly one maps/places provider for restaurant data, ratings,
review counts, cuisine categories, hours, and the listing page that tap-through targets. Provider
access MUST be mediated by the backend so weights can be tuned and credentials kept off the client.

**Provider call discipline**: A suggestion cycle MUST consume exactly one provider request
regardless of how many times the user refreshes within it. Per-refresh provider calls are prohibited.

**Client platform**: The client is React Native + Expo with native home-screen widget extensions for
iOS and Android. Simulator/emulator parity is a release gate, not a convenience — onboarding,
permissions, widget rendering, refresh cycling, and tap-through MUST all be exercisable there.

**Provisional mechanics stay removable**: Any mechanic explicitly flagged as an unvalidated product
bet MUST sit behind an isolation boundary with a demonstrated removal path. The batch-and-cycle
refresh mechanic is the current instance: disabling it MUST yield a working single-suggestion widget
with selection, presentation, and tap-through unchanged, verified by the same acceptance tests
passing unmodified. A bet that cannot be cheaply unwound MUST NOT be taken.

**Honest states over empty ones**: The widget MUST never render blank and MUST never present stale
data as current. Every failure mode — no results, all filtered out, no permission, offline, no
location fix — requires a distinct state that tells the user the truth.

**Out of scope for v1**: Route-based ("best restaurant between two coordinates") suggestions, saved
favorites, social or sharing features, and any secondary data provider. These MUST NOT be built
speculatively, though the architecture SHOULD avoid foreclosing the route-based case.

## Development Workflow & Quality Gates

**Spec Kit flow**: Features move through `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
`/speckit-implement`. Requirements are settled in the spec before implementation begins. Where a
clarification answer conflicts with an existing requirement, the conflict MUST be surfaced and
resolved in the spec rather than reconciled silently in code.

**Scoring regression gate**: Suggestion quality MUST be validated against a fixed set of
representative coordinates covering dense urban, suburban, and sparse rural conditions. Any change
touching scoring, weights, or candidate assembly MUST report its effect on that sample. Unexplained
movement blocks the change.

**Contrast gate**: Any change touching the semantic token map, the primitive palette, or widget
rendering MUST run the contrast gate for both themes. Recorded ratios MUST be recomputed from the
primitives, never copied forward from a previous revision. A failing ratio blocks the change.

**Review checks**: A change MUST be rejected if it introduces a user-facing choice (II), a hardcoded
venue list (III), unseeded randomness in selection (IV), retained location or suggestion history (V),
a raw hex literal or a component referencing a primitive directly (VI), a second data provider, or a
provider call per refresh.

**Definition of done**: A feature is done when its acceptance scenarios pass, it runs in both
simulators, it renders legibly in both themes and in iOS tinted mode, its failure states render
honestly, and no requirement it touches has been left contradicted elsewhere in the spec.

## Governance

This constitution supersedes other practices and conventions. Where guidance conflicts, the
constitution governs.

**Amendment procedure**: Amendments MUST be proposed as an explicit change to this document,
including the rationale and the version bump with its justification. Amendments that remove or
redefine a principle MUST state what replaces the guarantee being dropped. Silent divergence between
this document and practice is itself a violation — if a principle is no longer being followed, either
the practice or the principle MUST change on the record.

**Versioning policy**: Semantic versioning applies to this document.

- MAJOR: A principle is removed or redefined in a backward-incompatible way.
- MINOR: A principle or section is added, or existing guidance is materially expanded.
- PATCH: Clarifications, wording, and non-semantic refinements.

**Compliance review**: Plans and reviews MUST verify compliance with the Core Principles and the
review checks above. Complexity that appears to violate a principle MUST be justified explicitly in
the plan's complexity tracking, naming the principle and the reason no simpler approach suffices.
An unjustified violation blocks the work.

**Version**: 1.1.0 | **Ratified**: 2026-08-14 | **Last Amended**: 2026-08-14
