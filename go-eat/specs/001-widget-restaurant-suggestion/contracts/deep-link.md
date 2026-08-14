# Contract: Deep Links

**Feature**: `001-widget-restaurant-suggestion` | **Date**: 2026-08-14

Two directions: **outbound** to the provider listing (the product's payoff), and **inbound** from the
widget into the app (setup and settings).

---

## Outbound: widget → provider listing

Satisfies FR-023. Go-Eat builds no restaurant detail view (FR-024), so this handoff *is* the detail
experience — it must land on the right business every time.

### Fallback chain

Tried in order; the first that resolves wins.

| # | Target | URL form | Lands on |
|---|---|---|---|
| 1 | Google Maps app | `comgooglemaps://?q=place_id:<ID>` (iOS) / implicit `VIEW` intent on `geo:` with place ID (Android) | Native listing: profile, photos, hours, reviews, directions |
| 2 | Google Maps web | `https://www.google.com/maps/place/?q=place_id:<ID>` | Same listing in browser or via app link interception |
| 3 | Name + coordinate search | `https://www.google.com/maps/search/?api=1&query=<name>&query_place_id=<ID>` | Closest available representation (FR-025) |

Steps 1–2 are `listingUrl`; step 3 is `fallbackUrl`. Both are **constructed server-side** and shipped
in the payload, because widgets cannot build URLs.

### Rules

- The user MUST reach the specific business, never a generic map or a bare coordinate pin.
- A failed link MUST NOT dead-end (FR-025) — falling through the chain is required behavior.
- Directions are the provider's affordance on that page. Go-Eat MUST NOT construct a directions or
  navigation URL itself (FR-024).

### Testing

Simulators may lack the Google Maps app, so step 1 typically fails there and step 2 serves. This is
expected, and makes the simulator a **good** environment for exercising the fallback path. Step 1
needs a physical device or an emulator image with Google Maps installed.

---

## Inbound: widget → app

Scheme: `goeat://`

| URL | Opens | Triggered from |
|---|---|---|
| `goeat://onboarding` | Onboarding flow | `loading` state before setup is complete |
| `goeat://permission` | Location permission step, with rationale | `permission_required` state (FR-004) |
| `goeat://preferences` | Dietary preferences and exclusions | `all_filtered` state — the user's route to fixing it |

### Rules

- Every non-`suggestion` widget state that a user can act on MUST link to the screen that resolves
  it. A dead-end state is a bug.
- Inbound links resolve **only** to setup surfaces. There is no route to a list, search, or
  discovery screen because none exists (FR-028, Principle I). Any future `goeat://` route pointing
  at browsing UI is a constitutional violation.
- `permission_required` MUST route to the app's rationale screen rather than straight to OS
  settings, so the user is told *why* before being asked (FR-029).
