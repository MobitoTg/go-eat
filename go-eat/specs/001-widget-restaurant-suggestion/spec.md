# Feature Specification: Go-Eat Widget Restaurant Suggestion

**Feature Branch**: `001-widget-restaurant-suggestion`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "Build go-eat, a mobile app that solves decision fatigue around where to eat. Users don't want to sift through options, compare reviews, or make a choice — they want to be told where to eat. The entire product experience lives in a home screen widget: using the user's current location, the widget always surfaces exactly one restaurant suggestion, no list, no browsing, no proximity radius the user has to configure. Restaurant selection isn't proximity-only — candidates are scored on quality signals (rating, review volume, cuisine type) with a lean toward healthier options, so the suggestion is never a low-effort fast food pick. This is a scoring model, not a hardcoded exclusion list, so it can be tuned over time. On the backend, when a new suggestion cycle starts, pull a small batch of candidate restaurants (initial target: five) from the data source in one call rather than querying per-refresh. The widget shows one restaurant from that batch. The user can manually refresh to see the next one in the batch; after cycling through all five, refreshing loops back to the first. Whether users get this refresh-through-five behavior at all, versus a single suggestion with no refresh option, is an open question we want to validate with real user feedback post-MVP — build the batch-and-cycle mechanic, but keep it isolated enough to strip down to zero-refresh later if the data says so. Tapping the widget's suggestion opens that restaurant's listing page in the maps/places service being used (business profile, photos, hours, reviews), where the user can then tap through to get directions. Go-eat does not build its own restaurant detail view for v1 — it hands off to the existing maps service page. The app itself (as opposed to the widget) exists only to support the widget: onboarding, location permissions, and any dietary preferences or exclusions the user wants to set. There is no in-app browsing, list view, or restaurant discovery UI in v1. Out of scope for v1: the two-coordinate 'best restaurant along this route' use case (a future phase, structurally similar to the Detour project), saved favorites, social features, and any restaurant data source beyond a single provider. Constraint: this must be built in a way that supports running and testing in the iOS/Android simulator throughout development, consistent with a React Native + Expo–based client."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get told where to eat, right now (Priority: P1)

A hungry user glances at their phone's home screen. Without opening any app, tapping into a list, or setting a search radius, they see a single named restaurant near them with just enough context to accept it (name, cuisine, rating, walking/driving distance). They tap it, land on that restaurant's listing in the maps service, and get directions. The decision was made for them.

**Why this priority**: This is the entire product thesis. If a user can look at their home screen and be told exactly one place to eat that is nearby and non-generic, the product delivers its core value even with nothing else built. Every other story exists to support or refine this one.

**Independent Test**: Install the widget with location permission already granted, place the device in a populated area (or simulate a coordinate), and confirm the widget renders exactly one restaurant with the required fields, and that tapping it opens that specific restaurant's listing page in the maps service. Delivers standalone value: a user can be told where to eat and navigate there.

**Acceptance Scenarios**:

1. **Given** the widget is installed and location permission is granted, **When** the user views their home screen, **Then** the widget displays exactly one restaurant suggestion showing at minimum name, cuisine type, rating, and distance from the user — with no list, no alternatives, and no radius control visible.
2. **Given** the widget is displaying a suggestion, **When** the user taps the suggestion, **Then** the device opens that exact restaurant's listing page in the maps/places service (showing the provider's business profile, photos, hours, and reviews), and Go-Eat does not render its own restaurant detail screen.
3. **Given** the user has moved to a materially different location since the last suggestion cycle, **When** the user next refreshes, **Then** a new cycle begins and the suggestion reflects restaurants near the user's new location, not the previous one.
4. **Given** location permission has not been granted, **When** the user views the widget, **Then** the widget shows a clear prompt to enable location that opens the Go-Eat app to the permission step, rather than showing a stale or fabricated suggestion.

---

### User Story 2 - Suggestions feel worth eating, not just close by (Priority: P1)

The user notices that what Go-Eat surfaces is consistently a place they'd actually be willing to eat at — well-reviewed, real, and skewing toward healthier or more considered food — rather than the nearest drive-through. They trust the suggestion enough to act on it without second-guessing.

**Why this priority**: Proximity-only suggestions destroy trust on the first bad pick and make the product indistinguishable from a map search. Selection quality is what makes "just tell me" acceptable to a user who is giving up control. It is co-critical with Story 1 — a widget that shows one bad restaurant is not a viable MVP.

**Independent Test**: Run the selection process against a set of fixed test coordinates in areas with a known mix of venue types, and verify that the ranked output favors higher-rated, better-reviewed, healthier-leaning venues over nearer but lower-quality ones — and that changing scoring weights changes the ranking without any code representing a banned-brand list.

**Acceptance Scenarios**:

1. **Given** two candidate restaurants where the nearer one has a materially lower rating and lower review volume, **When** candidates are scored, **Then** the higher-quality restaurant can outrank the nearer one — proximity alone never determines the winner.
2. **Given** a candidate pool containing both fast-food-style venues and healthier-leaning venues of comparable rating and distance, **When** candidates are scored, **Then** the healthier-leaning venues rank higher on average.
3. **Given** the selection system is configured with a set of scoring weights, **When** an operator changes a weight value, **Then** the resulting ranking changes accordingly with no change to selection logic and with no per-brand or per-name exclusion list involved anywhere in the process.
4. **Given** a restaurant has a very high rating derived from an extremely small number of reviews, **When** it is scored, **Then** its score is tempered by the low review volume so it does not automatically win over well-established higher-confidence options.
5. **Given** the user has set a dietary exclusion in the app, **When** candidates are assembled, **Then** no restaurant that conflicts with that exclusion is ever presented in the widget.
6. **Given** several candidates score within the near-tie threshold of one another, **When** successive cycles run at the same location, **Then** their presentation order varies between cycles while candidates separated by more than the threshold keep their strict score order.
7. **Given** a fixed cycle seed, **When** scoring and ordering run twice on identical inputs, **Then** both runs produce an identical ordering — randomization never makes selection untestable.
8. **Given** any number of completed cycles, **When** the system's stored state is inspected, **Then** no record of previously suggested restaurants exists anywhere.

---

### User Story 3 - Refresh to the next option in the batch (Priority: P2)

The user sees the suggestion but isn't feeling it today. They tap refresh on the widget and get a different restaurant. They can do this a few times; after the fifth, refreshing brings them back around to the first one. The experience stays instant because the options were already fetched.

**Why this priority**: This is a deliberately provisional mechanic. It rescues the cases where the single suggestion misses, but the team explicitly wants to validate post-MVP whether users need it at all versus a single no-refresh suggestion. It must be built, and it must be removable without disturbing Stories 1 and 2.

**Independent Test**: With a batch already fetched, tap refresh repeatedly and confirm the widget walks through each batch member exactly once in order, wraps to the first after the last, and issues no new data-source request during the walk. Separately, confirm the refresh affordance can be disabled by configuration so the widget behaves as a single-suggestion widget with the rest of the experience unchanged.

**Acceptance Scenarios**:

1. **Given** a suggestion cycle has started and a batch of candidates has been fetched, **When** the user taps refresh, **Then** the widget displays the next restaurant in the batch.
2. **Given** the widget is displaying the last restaurant in the batch, **When** the user taps refresh, **Then** the widget displays the first restaurant in the batch again.
3. **Given** a batch has been fetched for the current cycle, **When** the user refreshes through every member of the batch, **Then** no additional request is made to the restaurant data source for that cycle.
4. **Given** the refresh capability is turned off by configuration, **When** the user views the widget, **Then** no refresh affordance is shown, exactly one suggestion is presented for the cycle, and suggestion quality and tap-through behavior are unaffected.
5. **Given** the data source returns fewer candidates than the batch target for a sparse location, **When** the user refreshes, **Then** the widget cycles through only the candidates that exist and wraps at the end without showing empty or duplicate-looking entries.
6. **Given** no batch has been fetched yet, or the current batch has been invalidated, **When** the user presses refresh, **Then** a new suggestion cycle begins with a single provider call and the widget shows the first candidate of the new batch.
7. **Given** a valid, uninvalidated batch, **When** the user refreshes repeatedly — including past the last candidate and around again — **Then** no new cycle starts and no provider call is made, regardless of how much time has passed.
8. **Given** the refresh capability is turned off by configuration, **When** the widget first renders after setup, **Then** a cycle still begins automatically and one suggestion is shown, so the zero-refresh variant is not dependent on a control that no longer exists.

---

### User Story 4 - One-time setup, then get out of the way (Priority: P2)

A new user installs Go-Eat, opens it once, is told plainly what the app does, grants location permission, optionally sets dietary preferences or exclusions, and is walked through adding the widget to their home screen. They then have no further reason to open the app.

**Why this priority**: Without permission and widget installation, the widget experience cannot exist — so onboarding gates everything. It is P2 rather than P1 only because Stories 1–3 can be tested independently with permissions pre-granted, and because the setup flow carries no ongoing value on its own.

**Independent Test**: Launch the app fresh on a simulator, complete onboarding end to end, and verify location permission is requested with a clear rationale, preferences persist, widget-install guidance is shown, and no browsing, list, or search UI is reachable anywhere in the app.

**Acceptance Scenarios**:

1. **Given** a first launch, **When** the user proceeds through onboarding, **Then** they are shown the app's purpose, asked for location permission with an explanation of why it is needed, and guided to add the widget to their home screen.
2. **Given** the user is in the app, **When** they set dietary preferences or exclusions and leave the app, **Then** those settings persist and are applied to subsequent suggestion cycles.
3. **Given** the user denies location permission, **When** onboarding continues, **Then** the app explains that the widget cannot function without location and offers a direct path to the system settings, without dead-ending the user.
4. **Given** the user is anywhere in the app, **When** they navigate through all available screens, **Then** no restaurant list, search field, map browser, or discovery UI is present.

---

### Edge Cases

- **No qualifying restaurants nearby**: When the user is somewhere with no restaurants that meet the quality bar within a reasonable distance, the widget shows an honest empty state ("Nothing worth recommending nearby") rather than degrading to a low-quality pick or showing a blank widget.
- **Sparse results**: When the data source returns fewer than the batch target, the cycle proceeds with what is available and refresh wraps over the smaller set.
- **All candidates excluded by preferences**: When dietary exclusions eliminate every candidate, the widget explains that preferences are filtering everything out and links into the app to adjust them.
- **No network at refresh time**: The widget continues showing the last-known suggestion with a subtle stale indicator rather than blanking, and recovers on the next successful cycle.
- **Location unavailable or imprecise**: When a fix cannot be obtained, the widget shows the last suggestion with a stale indicator; it never guesses a location or silently reuses a distant old one as if current.
- **Location permission revoked after setup**: The widget reverts to the permission prompt state and stops showing suggestions tied to a location it can no longer verify.
- **Restaurant listing unavailable on tap**: When the maps service cannot open the specific listing, the user is taken to the closest available representation of that business rather than a generic map or an error dead-end.
- **Permanently closed or stale venue**: A venue the data source reports as permanently closed is never presented as a suggestion.
- **Rapid repeated refresh**: Fast successive refresh taps advance the batch predictably by one step each and never trigger duplicate data-source requests.
- **Widget viewed at unusual hours**: The user viewing the widget at 3am is not shown a restaurant that is closed; if nothing is open, the empty state explains that rather than suggesting an unreachable venue.
- **User crosses into a new area mid-cycle**: A materially different location invalidates the current batch, so the next refresh starts a fresh cycle and the user is never told to eat somewhere they've since driven away from.
- **User stays in one place indefinitely**: With no automatic cycle trigger, a stationary user continues cycling the existing batch until they move or change preferences. Near-tie randomization is what keeps the set from feeling fixed; there is no time-based refetch.
- **Preferences changed mid-cycle**: Changing dietary settings invalidates the batch immediately, so the widget never keeps showing a venue the new exclusions would rule out.

## Requirements *(mandatory)*

### Functional Requirements

**Widget presentation**

- **FR-001**: The widget MUST display exactly one restaurant suggestion at any time. It MUST NOT display a list, carousel, ranked alternatives, or any preview of other candidates.
- **FR-002**: The widget MUST display, for the current suggestion, at minimum: restaurant name, cuisine type, rating, and distance from the user's current location.
- **FR-003**: The widget MUST NOT expose any proximity radius, distance slider, or search-scope control to the user.
- **FR-004**: The widget MUST render a distinct, non-suggestion state for each of: location permission not granted, no qualifying results, all results excluded by user preferences, and stale/offline data.
- **FR-005**: The widget MUST render its current state without requiring the user to open the Go-Eat app.

**Visual design and legibility**

- **FR-034**: All color in the widget and the app MUST resolve to a semantic token defined by the design system. Raw color literals in component code MUST fail the build, and components MUST NOT reference palette primitives directly.
- **FR-035**: Every color pairing MUST meet contrast minimums — 4.5:1 for text, 3:1 for large or bold text, and 3:1 for interactive and meaningful non-text boundaries — verified independently for both light and dark themes.
- **FR-036**: The widget MUST paint its own opaque base surface. It MUST NOT rely on the device wallpaper or any assumed backdrop for contrast.
- **FR-037**: Any single widget surface MUST render at most three chromatic values: one neutral ramp, one accent, and one optional status color.
- **FR-038**: The widget's states MUST be distinguishable without relying on hue. Each state MUST differ in shape, icon, or position as well as color, so states remain distinguishable when the platform desaturates the widget to a single hue and keys only off luminance.
- **FR-039**: Light and dark themes MUST each carry an independently specified and independently verified color assignment. Dark MUST NOT be derived by inverting the light assignment.
- **FR-040**: The widget MUST NOT define hover, focus, or pressed color states. Widgets render as static snapshots and such states are unreachable.

**Suggestion selection**

- **FR-006**: The system MUST select suggestions using a scoring model that combines, at minimum, rating, review volume, cuisine type, and distance. Distance MUST NOT be the sole determinant.
- **FR-007**: The scoring model MUST apply a positive weighting toward healthier-leaning cuisine categories such that lower-effort fast-food venues rank below comparable healthier venues.
- **FR-008**: The system MUST NOT implement venue suppression via a hardcoded list of brand names, business names, or specific venue identifiers. Any de-prioritization MUST be expressed as scoring weights.
- **FR-009**: All scoring weights MUST be externally adjustable without changing selection logic, so the model can be tuned over time.
- **FR-010**: The scoring model MUST temper rating by review volume so that a high rating from very few reviews does not outrank a well-established comparable venue.
- **FR-011**: The system MUST exclude from the candidate pool any venue that conflicts with the user's configured dietary exclusions, and MUST exclude any venue reported as permanently closed.
- **FR-012**: The system MUST NOT present a venue that is closed at the time the suggestion is shown.
- **FR-013**: Each scoring run MUST be reproducible: identical inputs (location, preferences, candidate data, weights, and the cycle seed defined in FR-022b) MUST produce an identical ranking, so selection behavior is testable. Scoring MUST be separable from the near-tie randomization applied afterward, so that raw scores can be asserted independently of ordering.

**Batch and refresh cycle**

- **FR-014**: When a new suggestion cycle starts, the system MUST retrieve a batch of candidate restaurants from the data source in a single request, targeting five candidates.
- **FR-015**: The system MUST NOT issue a request to the restaurant data source in response to an individual user refresh within an active cycle.
- **FR-016**: Refreshing MUST advance the widget to the next candidate in the batch in a stable, deterministic order.
- **FR-017**: Refreshing past the final candidate in the batch MUST wrap around to the first candidate.
- **FR-018**: When the batch contains fewer candidates than the target, refresh MUST cycle over only the available candidates and wrap at the end of that smaller set.
- **FR-019**: The batch-and-cycle mechanic MUST be isolated behind a configuration switch such that turning refresh off yields a single-suggestion, no-refresh widget with all other behavior — selection quality, presentation, and tap-through — unchanged, and requires no rework of suggestion selection or presentation.
- **FR-020**: A new suggestion cycle MUST begin when the widget needs a suggestion and no valid batch exists. This condition arises when: (a) the user presses the refresh control and the current batch has been invalidated or none has been fetched, (b) the widget renders for the first time after setup, or (c) the current batch has been invalidated per FR-021. The system MUST NOT start a new cycle on a time schedule, on meal windows, or on any other automatic trigger — user refresh and batch invalidation are the only paths to a new provider call.
- **FR-021**: The system MUST invalidate the current batch when the user's location has changed materially enough that the batch no longer reflects nearby options, when the user changes their dietary preferences or exclusions, or when the batch's open/closed data can no longer be trusted to be accurate.
- **FR-021a**: While a valid batch exists, pressing refresh MUST advance within that batch (per FR-016 and FR-017) and MUST NOT start a new cycle or trigger a provider call.
- **FR-022**: The system MUST introduce variety across cycles by randomizing the order of candidates whose scores fall within a defined near-tie threshold of each other, rather than always presenting a strict score ordering. Candidates whose scores differ by more than the threshold MUST retain their strict score ordering, so randomization never promotes a materially worse venue over a materially better one.
- **FR-022a**: The system MUST NOT retain any history of previously suggested restaurants. Variety comes solely from the near-tie randomization in FR-022, with no memory of past cycles and no per-user suggestion log.
- **FR-022b**: The near-tie randomization MUST be driven by a seed established once per suggestion cycle, so that ordering is stable for the whole cycle (refresh walks a fixed order) and fully reproducible when the seed is supplied.

**Tap-through**

- **FR-023**: Tapping the widget's suggestion MUST open that specific restaurant's listing page in the maps/places service, where the user can view the business profile, photos, hours, and reviews and initiate directions.
- **FR-024**: The system MUST NOT provide its own restaurant detail view, photo gallery, review view, or directions/navigation experience.
- **FR-025**: When the specific listing cannot be opened, the system MUST fall back to the closest available representation of that business in the maps service rather than failing silently or landing the user on an unrelated view.

**App (setup surface)**

- **FR-026**: The app MUST provide a first-run onboarding flow covering: what the product does, location permission with a stated rationale, optional dietary preferences and exclusions, and guidance for adding the widget to the home screen.
- **FR-027**: The app MUST allow the user to view and change their dietary preferences and exclusions after onboarding, and these MUST persist across app and device restarts.
- **FR-028**: The app MUST NOT contain any restaurant list, search, map browsing, or discovery interface.
- **FR-029**: When location permission is denied or later revoked, the app MUST explain the consequence and provide a direct path to the system location settings.

**Data and privacy**

- **FR-030**: The system MUST use exactly one restaurant data provider for v1.
- **FR-031**: The system MUST use the user's location only to produce suggestions, and MUST NOT retain precise location history beyond what is required to serve the active suggestion cycle.
- **FR-032**: Dietary preferences and exclusions MUST be scoped to the user's own device/installation and MUST NOT require an account to function.

**Out of scope for v1**

- **FR-033**: The system MUST NOT implement route-based ("best restaurant between two coordinates") suggestions, saved favorites, social or sharing features, or any secondary restaurant data provider.

### Key Entities

- **User Preferences**: The user's dietary preferences and exclusions, plus onboarding/permission completion state. Device-scoped, persistent, no account required. Directly constrains the candidate pool.
- **Location Fix**: A point-in-time reading of the user's current position used to anchor a suggestion cycle. Transient; the basis for distance calculation and batch invalidation.
- **Restaurant Candidate**: A single venue returned by the data provider, carrying the attributes selection depends on — name, cuisine type, rating, review volume, position/distance, open/closed status, permanently-closed status, and the provider reference needed to open its listing page.
- **Suggestion Batch**: The ordered set of candidates (target five) fetched in one request at the start of a cycle, together with the location fix and preference state it was built from, and the user's current position within the cycle. The unit that refresh walks over and that location change invalidates.
- **Scoring Model Configuration**: The externally adjustable set of weights (rating, review volume, cuisine/health lean, distance) plus the near-tie threshold that governs variety. Tunable without changing selection logic; the switch that enables or disables refresh lives alongside it.
- **Cycle Seed**: A value established once per suggestion cycle that drives near-tie randomization. Makes ordering stable across refreshes within a cycle and reproducible in tests when supplied explicitly. Not retained after the cycle ends.
- **Current Suggestion**: The single candidate the widget is presently displaying, with the freshness state (live vs. stale) needed to render honestly and the reference used for tap-through.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From glancing at the home screen, a user can identify where they are being told to eat in under 3 seconds, without any tap, scroll, or app launch.
- **SC-002**: A user goes from seeing the suggestion to viewing that restaurant's listing in the maps service in a single tap, 100% of the time.
- **SC-003**: A new user completes setup — permission granted, preferences set, widget installed — in under 2 minutes on first launch.
- **SC-004**: The widget presents a current suggestion or an honest explanatory state 99% of the times it is viewed; it is never blank and never shows a suggestion presented as current when the underlying data is stale.
- **SC-005**: Across a representative sample of test locations, at least 80% of surfaced suggestions meet the defined quality bar (established rating and review volume) and no more than 10% fall into low-effort fast-food categories.
- **SC-006**: Refreshing to the next option updates the displayed restaurant in under 1 second, with zero calls to the restaurant data provider during an active cycle.
- **SC-007**: A suggestion cycle consumes exactly one restaurant-data-provider request regardless of how many times the user refreshes within it.
- **SC-008**: Turning off the refresh capability produces a working single-suggestion widget with no changes to selection, presentation, or tap-through behavior, verified by the same Stories 1 and 2 acceptance tests passing unmodified.
- **SC-009**: 0% of suggestions shown are permanently closed venues, closed-at-time-of-display venues, or venues conflicting with the user's stated dietary exclusions.
- **SC-010**: Users report the suggestion as "somewhere I'd actually eat" in at least 70% of instances during post-MVP feedback collection.
- **SC-011**: Adjusting a scoring weight measurably changes suggestion rankings across the test-location sample with no modification to selection logic.
- **SC-013**: Across repeated cycles at an identical location with identical preferences, the first-shown restaurant varies in at least 50% of cycles, while no venue scoring below the near-tie threshold of the top candidate is ever shown first.
- **SC-014**: Given a fixed cycle seed, scoring and ordering are 100% reproducible across runs, so selection quality can be regression-tested despite the randomization.
- **SC-012**: The full end-to-end experience — onboarding, permissions, widget rendering, refresh cycling, and tap-through — is exercisable on both iOS and Android simulators/emulators at every stage of development.
- **SC-015**: 100% of semantic color pairings meet their contrast requirement in both themes, verified automatically on every change to the palette, the token map, or widget rendering, with ratios recomputed from the primitives rather than carried forward.
- **SC-016**: All six widget states remain distinguishable from one another when the platform renders the widget desaturated to a single hue, where color carries no information.
- **SC-017**: The widget remains legible over any wallpaper, verified against light, dark, and visually busy backdrops on both platforms.

## Assumptions

- **Single provider**: One maps/places provider supplies restaurant data, ratings, review counts, cuisine categories, hours, and the listing page that tap-through targets. Its cuisine categorization is sufficient to drive the health-lean weighting without a separate nutrition data source.
- **Health lean via cuisine category**: "Healthier" is inferred from provider cuisine/category signals, not from menu or nutritional analysis. This is a scoring input, not a guarantee about any individual dish.
- **Search distance**: The system chooses a sensible search distance internally and adapts it to venue density (wider in sparse areas, tighter in dense ones). The user never sees or configures it.
- **Dietary settings semantics**: "Exclusions" are treated as hard filters that remove candidates entirely; "preferences" are treated as positive scoring inputs. Both are optional — the product works fully with neither set.
- **Open-now filtering**: Suggestions are restricted to venues open at the time of display, per provider hours data. Provider hours are treated as authoritative.
- **No accounts**: v1 requires no sign-up, login, or user identity. All state is device-local, which also means preferences do not follow the user to a new device.
- **Widget refresh limits**: Platform widget refresh budgets constrain how often the widget can update on its own. The design assumes user-initiated refresh and platform-scheduled updates only — not continuous live updating.
- **Location permission scope**: The widget obtains location under the standard permission the platform grants for widget use; background/always-on location tracking is not assumed or required.
- **Client platform**: The client is a React Native + Expo application with native home-screen widget extensions for iOS and Android, and the whole experience must remain runnable and testable in simulators/emulators throughout development. Location is simulated during development where a real fix is unavailable.
- **Backend responsibility**: A backend service performs the batched provider call and scoring so weights can be tuned without shipping a client release, and so provider credentials are never embedded in the client.
- **Refresh mechanic is provisional**: The batch-and-cycle behavior is explicitly an open product question to be validated post-MVP. It is built behind an isolation boundary specifically so it can be reduced to zero-refresh based on user feedback without reworking the rest of the product.
- **User-driven cycles only**: Suggestion cycles are triggered by user refresh and by batch invalidation (location change, preference change, untrustworthy hours data) — never on a timer or meal schedule. This keeps provider usage proportional to actual user intent, at the cost of a stationary user not receiving a spontaneously updated pick.
- **Variety without history**: Freshness comes from seeded randomization among near-tied candidates rather than from suppressing previously seen venues, so the product keeps its "no history, no tracking" posture. The near-tie threshold is a tunable value alongside the scoring weights, and a stationary user may still encounter repeats.
- **Cold-start behavior**: On first widget render before any cycle has completed, the widget shows a brief loading state rather than a placeholder restaurant.
- **Test coordinates**: Selection quality is validated against a fixed set of representative coordinates (dense urban, suburban, sparse rural) so scoring changes are measurable and regressions are detectable.
- **Design system scope**: Color is governed by a two-layer token system — pinned Open Color primitives resolved through a semantic token map — specified in `specs/design-system/`. For v1 the design system covers color only; typography, spacing, and iconography are not yet specified and are chosen per-surface within the color constraints.
- **Theme is an OS concern**: Light/dark selection is made by the operating system and resolved natively at render time from platform-generated token assets. No color or theme information travels in the widget payload, so the payload stays purely informational.
