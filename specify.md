Build go-eat, a mobile app that solves decision fatigue around where to eat. Users don't want to sift through options, compare reviews, or make a choice — they want to be told where to eat. The entire product experience lives in a home screen widget: using the user's current location, the widget always surfaces exactly one restaurant suggestion, no list, no browsing, no proximity radius the user has to configure.

Restaurant selection isn't proximity-only — candidates are scored on quality signals (rating, review volume, cuisine type) with a lean toward healthier options, so the suggestion is never a low-effort fast food pick. This is a scoring model, not a hardcoded exclusion list, so it can be tuned over time.

On the backend, when a new suggestion cycle starts, pull a small batch of candidate restaurants (initial target: five) from the data source in one call rather than querying per-refresh. The widget shows one restaurant from that batch. The user can manually refresh to see the next one in the batch; after cycling through all five, refreshing loops back to the first. Whether users get this refresh-through-five behavior at all, versus a single suggestion with no refresh option, is an open question we want to validate with real user feedback post-MVP — build the batch-and-cycle mechanic, but keep it isolated enough to strip down to zero-refresh later if the data says so.

Tapping the widget's suggestion opens that restaurant's listing page in the maps/places service being used (business profile, photos, hours, reviews), where the user can then tap through to get directions. Go-eat does not build its own restaurant detail view for v1 — it hands off to the existing maps service page.

The app itself (as opposed to the widget) exists only to support the widget: onboarding, location permissions, and any dietary preferences or exclusions the user wants to set. There is no in-app browsing, list view, or restaurant discovery UI in v1.

Out of scope for v1: the two-coordinate "best restaurant along this route" use case (a future phase, structurally similar to the Detour project), saved favorites, social features, and any restaurant data source beyond a single provider.

Constraint: this must be built in a way that supports running and testing in the iOS/Android simulator throughout development, consistent with a React Native + Expo–based client.
