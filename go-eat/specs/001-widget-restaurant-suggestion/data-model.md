# Phase 1 Data Model: Go-Eat Widget Restaurant Suggestion

**Feature**: `001-widget-restaurant-suggestion` | **Date**: 2026-08-14

Entities derive from the spec's Key Entities section. Every field is annotated with where it lives,
because the storage boundary is what enforces Principle V (location borrowed, not kept).

---

## Storage boundaries

| Location | Holds | Lifetime |
|---|---|---|
| Backend (in-memory, per request) | Provider response, scoring intermediates | Duration of one request. Never persisted |
| Backend config | Scoring weights, thresholds, `refreshEnabled` | Until an operator changes it |
| Device shared storage (App Group / SharedPreferences) | Active batch, cursor, anchor, widget state | Until replaced by the next cycle |
| Device app storage | User preferences, onboarding state | Until the user changes it or uninstalls |
| **Nowhere** | Suggestion history, location history, user identity | — (FR-022a, FR-031, FR-032) |

---

## UserPreferences

Device-local. Never leaves the device except as a filter payload on a cycle request.

| Field | Type | Rules |
|---|---|---|
| `exclusions` | `DietaryTag[]` | Hard filters (FR-011). Empty by default |
| `preferences` | `DietaryTag[]` | Positive scoring inputs. Empty by default |
| `onboardingComplete` | `boolean` | Gates the widget-install guide |
| `locationPermission` | `'granted' \| 'denied' \| 'undetermined'` | Mirrors OS state; re-read on foreground, never trusted as cached truth |
| `updatedAt` | `ISO8601` | Any change invalidates the active batch (FR-021) |

**Validation**: `exclusions` and `preferences` MUST be disjoint — the same tag cannot be both. Reject
at the settings UI, not at request time.

**No account, no sync** (FR-032). Preferences do not follow the user to a new device.

---

## LocationAnchor

The point the active batch was built from. Transient by design.

| Field | Type | Rules |
|---|---|---|
| `lat`, `lng` | `number` | Full precision in memory and in the request |
| `capturedAt` | `ISO8601` | Drives staleness |

**Retention**: overwritten on each new cycle. Never appended to a list, never logged at full
precision. Backend logs MUST truncate coordinates to a coarse grid — enough for aggregate diagnostics,
not enough to reconstruct a movement trail (Principle V).

**Derived predicates** (pure, in `apps/mobile/src/cycle`):

- `isStale(anchor, now)` → `capturedAt` older than `anchorFreshnessSeconds` (start: `900`).
- `hasDrifted(anchor, current)` → distance exceeds `locationDriftThresholdMeters` (start: `750`);
  triggers FR-021 invalidation. This is what "changed materially enough" in FR-021 resolves to.

Both thresholds are config, not literals, so they are tunable alongside scoring weights. Rationale
in research.md R12. Note `batchTrustSeconds` (start: `1800`) is deliberately longer than
`anchorFreshnessSeconds`, so the anchor goes stale — and the widget says so — before the batch
expires and forces a refetch.

---

## RestaurantCandidate

Provider-shaped. Exists only inside a backend request; **never reaches the device in this form**.

| Field | Type | Source | Used for |
|---|---|---|---|
| `providerPlaceId` | `string` | `id` | Deep link, dedupe |
| `name` | `string` | `displayName` | Display |
| `types` | `string[]` | `types` | Health-lean scoring (FR-007), cuisine label |
| `rating` | `number \| null` | `rating` | Scoring (FR-006) |
| `reviewCount` | `number \| null` | `userRatingCount` | Confidence tempering (FR-010) |
| `location` | `{lat, lng}` | `location` | Distance |
| `openNow` | `boolean \| null` | `currentOpeningHours` | Hard filter (FR-012) |
| `businessStatus` | `enum` | `businessStatus` | Hard filter (FR-011) |

**Filter order (hard filters before scoring, always)**:

1. Drop `businessStatus !== OPERATIONAL` (FR-011)
2. Drop `openNow === false` (FR-012)
3. Drop anything matching a user exclusion (FR-011)
4. Score whatever survives

Filtering before scoring keeps excluded venues out of the near-tie shuffle entirely — a venue that
can never be shown must never influence ordering.

**Null handling**: a candidate missing `rating` or `reviewCount` scores as *low confidence*, not as
zero. Absent data must not be punished as though it were bad data.

---

## ScoringWeights

Backend config. The whole of Principle III lives here.

| Field | Type | Start | Purpose |
|---|---|---:|---|
| `rating` | `number` | — | Weight on normalized rating |
| `reviewVolume` | `number` | — | Weight on confidence from review count |
| `healthLean` | `Record<placeType, number>` | — | Per-type adjustment (FR-007) |
| `distance` | `number` | — | Weight on distance decay |
| `nearTieThreshold` | `number` | `0.05` | Score band treated as tied (FR-022) |
| `searchRadiusMeters` | `number` | `1500` | Provider query radius; never user-visible (FR-003) |
| `minReviewCount` | `number` | `25` | Floor below which confidence tempering dominates |

Starting values and their rationale are recorded in research.md R12. The four relative weights are
deliberately left unset here — they are established by tuning against the golden fixtures (T072),
not chosen up front.

**Hard constraints**:

- `healthLean` is keyed by **provider place type**, never by brand or business name (FR-008). A key
  that names a company is a constitutional violation and should fail review.
- Every weight MUST measurably move rankings on the golden fixtures. A weight that changes nothing is
  decorative and must be removed (Constitution III).

---

## SuggestionBatch

Produced by the backend, stored on the device, read by both widgets.

| Field | Type | Rules |
|---|---|---|
| `cycleId` | `uuid` | Correlates client state with backend telemetry |
| `seed` | `string` | The FR-022b cycle seed. Returned so a cycle is exactly reproducible |
| `issuedAt` | `ISO8601` | Staleness |
| `anchor` | `LocationAnchor` | What the batch was built from; drives drift invalidation |
| `preferencesHash` | `string` | Cheap equality check for FR-021 preference-change invalidation |
| `items` | `SuggestionItem[]` | 0–5, already ordered. **Never more than 5** |
| `cursor` | `number` | Client-owned. Index of the displayed item |
| `refreshEnabled` | `boolean` | Mirrors backend config (FR-019) |

**Invariants**:

- `0 <= cursor < items.length` whenever `items` is non-empty.
- `items` arrives ordered. **The client never reorders** — ordering is a backend concern, and a
  client that sorts would break FR-013 reproducibility.
- `items.length === 0` is legitimate (sparse area, everything filtered) and renders an honest empty
  state, never a blank widget.

**Cursor transition** — the entirety of the refresh mechanic:

```
advance(batch) → { ...batch, cursor: (batch.cursor + 1) % batch.items.length }
```

One expression satisfies FR-016, FR-017, and FR-018 together. Wrap-around is modulo, and a short
batch wraps early for free with no special case.

**Invalidation** (FR-021) — batch is invalid when any holds:

- `hasDrifted(batch.anchor, currentLocation)`
- `preferencesHash !== hash(currentPreferences)`
- `issuedAt` older than the open/closed trust window

Invalid batch + refresh press → new cycle (FR-020). Valid batch + refresh press → `advance` only,
no network (FR-021a).

**Removability (FR-019)**: with `refreshEnabled: false`, the widget hides the refresh control and
`advance` is never called. `cursor` stays 0 and `items` may be truncated to 1 server-side. Stripping
the mechanic permanently means deleting `advance` and the cursor field — nothing in scoring,
payload shaping, or rendering changes. This is the isolation boundary the constitution requires.

---

## SuggestionItem

One render-ready restaurant. **Fully formatted by the backend** — because widgets cannot run JS
(R1/R2), any formatting left undone here would have to be implemented twice in native code.

| Field | Type | Notes |
|---|---|---|
| `providerPlaceId` | `string` | Correlation |
| `name` | `string` | Pre-truncated to the widget's display budget |
| `cuisineLabel` | `string` | Human-readable, derived from `types` — not a raw enum |
| `ratingLabel` | `string` | Pre-formatted, e.g. `"4.6"` |
| `reviewCountLabel` | `string` | Pre-formatted and abbreviated, e.g. `"1.2k"` |
| `distanceLabel` | `string` | Pre-formatted **in the user's unit system**, e.g. `"0.4 mi"` |
| `listingUrl` | `string` | Primary deep link (FR-023) |
| `fallbackUrl` | `string` | Used when the primary fails (FR-025) |

**Design rule**: the widget performs **no** string formatting, unit conversion, rounding, or URL
construction. It draws labels and opens URLs. Locale and unit decisions are made once, server-side,
using a hint sent with the cycle request.

**Excluded on purpose**: score, rank, and any sibling-item reference. The widget must have no way to
render a comparison, a position indicator, or a hint that alternatives exist (FR-001, Principle II).
Withholding the data makes the violation unbuildable rather than merely discouraged.

---

## WidgetState

A discriminated union covering every renderable state. Enumerated in the payload so a missing case
is a compile error, not a blank widget.

| State | Trigger | Renders |
|---|---|---|
| `suggestion` | Valid batch, non-empty | Name, cuisine, rating, distance (FR-002) |
| `permission_required` | Location permission not granted | Prompt that opens the app to the permission step (FR-004) |
| `no_results` | Batch returned 0 items | "Nothing worth recommending nearby" |
| `all_filtered` | Candidates existed, exclusions removed all | Explanation + link into preferences |
| `stale` | Network or location fix unavailable | Last suggestion + stale indicator (never presented as current) |
| `loading` | First render, no cycle completed yet | Brief loading state — never a placeholder restaurant |

`no_results` and `all_filtered` are deliberately distinct: "nothing good here" and "your filters
removed everything" call for different user actions, and collapsing them would strand a user who
could fix the problem in settings.

**How a state becomes pixels**: each state maps to semantic **token names** — never color values —
via `specs/design-system/widget-state-tokens.md`, which both widget implementations follow so they
cannot drift. States must also differ by shape, icon, or position, because iOS tinted rendering
strips hue entirely and would otherwise collapse them (FR-038, research R11).

---

## Entity relationships

```
UserPreferences ──filters──┐
                           ├──► [Backend: fetch → hard-filter → score → shuffle near-ties]
LocationAnchor ──anchors───┘                            │
                                                        ▼
                                                 SuggestionBatch
                                                  (≤5 items, ordered, + seed)
                                                        │
                                          cursor selects one
                                                        ▼
                                                 SuggestionItem
                                                        │
                                                 wrapped in
                                                        ▼
                                                  WidgetState ──► iOS widget / Android widget
                                                                   (render only)
```

`ScoringWeights` sits outside this flow entirely — operator-owned config, injected into scoring,
never touching the device.
