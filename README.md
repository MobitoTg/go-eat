# go-eat

go-eat kills decision fatigue around where to eat. Instead of scrolling through lists and reviews, a home screen widget uses your location to surface exactly one quality-filtered restaurant suggestion at a time. Tap it, get directions, done.

## Table of Contents

- [What We're Building](#what-were-building)
- [Architecture](#architecture)
  - [Technical Stack](#technical-stack)
  - [System Design](#system-design)
  - [Data Flow](#data-flow)
- [User Interface & Experience](#user-interface--experience)
  - [Widget Experience](#widget-experience)
  - [App Experience](#app-experience)
  - [UX Principles](#ux-principles)
- [Demo](#demo)
- [Deployment Strategy](#deployment-strategy)
  - [Development Workflow](#development-workflow)
  - [Testing Strategy](#testing-strategy)
  - [Release Process](#release-process)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)

---

## What We're Building

Go-Eat is a mobile application that solves decision fatigue around restaurant selection. The entire product experience lives in a **home screen widget** that displays exactly one restaurant suggestion at a time.

### Core Value Proposition

- **Single, confident suggestion**: Users get one restaurant recommendation per viewing, not a list to browse
- **Quality-filtered, not proximity-only**: Suggestions are scored on rating, review volume, cuisine health-lean, and distance — never just the nearest option
- **Instant action**: Tap the suggestion to open the restaurant's listing in Maps and get directions
- **Setup and forget**: Onboarding takes one pass; the app then exists only to support the widget

### Key Features

1. **Location-based suggestions**: Uses current device location to find nearby restaurants
2. **Batch-and-refresh**: Fetches a batch of 5 candidate restaurants in a single backend call; users can refresh through them without additional network requests
3. **Configurable scoring**: Restaurant selection uses a tunable scoring model (rating, review volume, cuisine type, distance) with a lean toward healthier options
4. **Dietary preferences**: Users can configure dietary exclusions that filter out candidate restaurants
5. **Maps integration**: Tapping a suggestion opens that restaurant's full listing in the device's maps service
6. **One-time onboarding**: Location permission request, optional dietary preferences, and widget installation guidance; no ongoing app interaction required

### Out of Scope for v1

- Restaurant detail view (hands off to maps service)
- Saved favorites or social features
- In-app browsing, list view, or discovery UI
- Multiple restaurant data providers
- "Best restaurant along a route" (future phase)

---

## Architecture

### Technical Stack

**Frontend**
- **React Native** with New Architecture
- **Expo SDK 57+** for cross-platform development
- **TypeScript 5.x** throughout
- **Widget frameworks**: `expo-widgets` (iOS), `react-native-android-widget` (Android)
- **Routing**: `expo-router`
- **Location**: `expo-location`
- **Storage**: iOS App Group, Android SharedPreferences, `expo-secure-store`, `AsyncStorage`

**Backend**
- **Node.js 22** + **Fastify**
- **TypeScript 5.x**
- **Stateless** per-request design
- **Google Places API** as primary restaurant data source

**Testing & Build**
- **Jest** for pure logic and contract testing
- **Maestro** or **Detox** for integration testing on iOS Simulator and Android emulator
- **Monorepo**: Nx-based workspace with shared packages

### System Design

The architecture prioritizes pushing logic away from the widget, since **home screen widgets cannot run JavaScript** and require platform-specific implementations.

**Widget as a Dumb Renderer**
- The widget is a thin view layer that renders a JSON payload assembled by the backend
- Platform-specific code (Swift/iOS, Kotlin/Android) is generated from Expo declarations
- No business logic, selection logic, or state management lives in the widget itself

**Selection Core as Portable Logic**
- `selection-core` is a pure, IO-free TypeScript package that scoring logic lives in
- Imported by the backend at request time and by Jest during testing
- Deterministic: given identical inputs (candidates, weights, seed), always produces identical rankings
- Seeded randomness makes testing repeatable without sacrificing controlled randomness

**Stateless Backend**
- No user database or server-side session storage
- Each request is independent
- Google Places API key lives only on the backend
- Weights are configuration, served per request, tunable without a client release

**Device-Local Storage**
- Widget state and current suggestion batch stored locally in platform shared storage
- Location history and suggestion history explicitly never retained
- Preferences persist across app launches in local storage

### Data Flow

```
1. Cycle Start (User views widget or taps refresh with empty batch)
   ├─ Client queries backend with: location coordinates, user preferences
   ├─ Backend fetches 5 candidate restaurants from Google Places
   ├─ Backend imports selection-core and scores candidates
   ├─ Backend assembles widget payload (1 restaurant + batch)
   └─ Client stores payload in platform shared storage

2. Refresh (User taps refresh within same batch)
   ├─ Client increments cursor in stored batch
   ├─ Widget re-renders with next restaurant
   └─ No network call

3. Tap (User taps restaurant suggestion)
   ├─ Client deep-links to restaurant's Google Maps listing
   └─ Maps app opens with full business profile, photos, hours, reviews
```

---

## User Interface & Experience

### Widget Experience

**Visual Design**
- Compact, single-restaurant display showing:
  - Restaurant name
  - Cuisine type
  - Rating (with review volume signal)
  - Distance from user (walking/driving)
  - Optional: dietary preference filter status
- No list, no browse affordance, no radius controls
- Dark and light theme support via design tokens

**Interactions**
- **Tap suggestion**: Opens restaurant's Google Maps listing
- **Tap refresh** (if enabled): Advances to next restaurant in batch
- **Long-press or settings**: Opens Go-Eat app to adjust preferences (if needed)
- **Location permission prompt**: Tapping prompts user to enable location via app

**States**
- **Idle**: Displaying a fresh suggestion
- **Stale**: Suggestion is older than configured TTL; shows subtle indicator
- **No permission**: Shows prompt to enable location
- **No results**: "Nothing worth recommending nearby" if no candidates meet quality bar
- **Preferences filter all**: Explains that dietary exclusions eliminated all candidates
- **Offline**: Shows last-known suggestion with stale indicator; recovers on next successful cycle

### App Experience

The app exists solely to support the widget. Users encounter it only during onboarding or to adjust preferences.

**Screens**
1. **Onboarding / Purpose**: Explains what Go-Eat does and why you'll want the widget
2. **Location Permission**: Requests location with clear rationale; offers path to settings if denied
3. **Dietary Preferences** (optional): Configure dietary exclusions (vegan, keto, shellfish allergy, etc.)
4. **Widget Installation Guide**: Step-by-step instructions for adding the widget to home screen
5. **Preferences / Settings** (if accessed from widget): Adjust dietary choices; no other features

**Non-existent Features** (by design)
- No restaurant list or search
- No map browser
- No restaurant detail view
- No favorites or history
- No discovery or browsing

### UX Principles

1. **One decision, never a menu**: Exactly one suggestion per viewing; no user-facing tuning knobs
2. **Quality over proximity**: Suggestions are judged by rating, review volume, health-lean, not distance alone
3. **Honest states over empty ones**: When results are unavailable, the widget explains why (no permission, no open restaurants, preferences filter all) rather than showing a blank or generic state
4. **Setup and forget**: No ongoing interaction required; preferences persist locally
5. **Location is borrowed, not kept**: No location or suggestion history retained; no user accounts
6. **Instant local refresh**: Changing through a batch requires zero network calls after the initial fetch

---

## Demo

### Quick Demo Flow

1. **Prerequisite**: Device (iOS 17+ or Android 12+) or simulator with location permission granted
2. **Install widget**: Add Go-Eat widget to home screen
3. **View suggestion**: Widget displays one nearby restaurant with name, cuisine, rating, distance
4. **Tap suggestion**: Maps app opens to that restaurant's listing with business profile, photos, hours, reviews
5. **Tap refresh** (optional): Widget shows next restaurant in batch (no network call)
6. **Return to home**: Tap and hold widget to access preferences

### Testing Locally

**iOS Simulator**
```
cd go-eat
npm run build:ios
npm run ios
```
Requires development build (native widget code cannot run in Expo Go).

**Android Emulator**
```
npm run build:android
npm run android
```

**Widget Testing in Isolation**
- Widget payload is a predictable JSON contract
- Integration tests use Maestro (record/replay) or Detox (JavaScript API)
- Scoring logic is testable via Jest without any device or simulator

---

## Deployment Strategy

### Development Workflow

1. **Local development**:
   - Frontend: `npm start` for app iterating; `expo run:ios` / `expo run:android` for widget work
   - Backend: `npm run dev` in `services/suggestion-api` (Fastify with hot reload)
   - Scoring logic: Develop in `packages/selection-core`; test with Jest

2. **Simulator/Emulator parity**:
   - iOS Simulator: Full native widget support via `@expo/ui` + `expo-widgets`
   - Android Emulator: Full native widget support via `react-native-android-widget`
   - Backend: Runs locally or against staging API
   - **Note**: `expo-widgets` is iOS-only; Android uses a separate widget framework. Both support local testing.

3. **Branch strategy**:
   - Feature development on feature branches
   - PR review with simulator testing
   - Merge to `main` after approval

### Testing Strategy

**Unit & Contract Testing** (Jest, no simulator required)
- Pure business logic in `selection-core` (scoring, filtering, ranking)
- Widget payload contract validation
- API request/response contracts
- Design token contrast gating
- Golden fixture suite for scoring regression

**Integration Testing** (Maestro or Detox)
- Full onboarding flow
- Location permission request/grant/revoke
- Widget refresh and tap behavior
- Preference persistence
- Edge cases (no network, stale location, no results)

**Manual Testing** (Simulator)
- Widget rendering at various zoom levels and text sizes
- Dark/light theme switching
- Permission state changes
- Network failure and recovery

### Release Process

1. **Version bump**: Update `package.json` version in `go-eat/`
2. **Changelog**: Document changes in release notes
3. **Build**:
   - iOS: `expo build --platform ios` (Expo Application Services)
   - Android: `expo build --platform android`
4. **Test**: Validate builds in TestFlight (iOS) and Google Play Console (Android)
5. **Deploy**:
   - iOS: Submit to App Store
   - Android: Submit to Google Play
6. **Backend**: Deploy service separately to hosting (Node host, AWS Lambda, etc.)

### Configuration & Weights Management

Scoring weights and feature flags are served by the backend and can be updated without a client release:
- `weights.rating`: How much to favor high ratings
- `weights.reviewVolume`: How much to favor venues with more reviews (confidence signal)
- `weights.healthLean`: How much to favor healthier cuisine types
- `weights.distance`: How much to favor nearer restaurants
- `refreshEnabled`: Boolean to enable/disable refresh affordance in widget
- Dietary exclusion categories: Vegan, Keto, Gluten-Free, etc.

Updates to these values can be deployed server-side and take effect on the next widget refresh.

---

## Project Structure

```
go-eat/
├── apps/
│   └── mobile/                     # React Native + Expo app & widget code
│       ├── app/                    # App screens (onboarding, permissions, preferences)
│       ├── widgets/                # Widget implementations
│       │   ├── ios/                # iOS widget code (Swift, Expo UI)
│       │   └── android/            # Android widget code (RemoteViews)
│       ├── src/
│       │   ├── api/                # API client & suggestion fetching
│       │   ├── location/           # Location services
│       │   ├── storage/            # Device-local storage (shared storage, preferences)
│       │   ├── theme/              # Design token imports & theming
│       │   └── cycle/              # Widget lifecycle management
│       └── __tests__/              # Integration tests
│
├── packages/                        # Shared TypeScript packages
│   ├── contract-types/            # Shared TypeScript types for API contracts
│   ├── design-tokens/             # Design system: colors, semantic tokens, generators
│   └── selection-core/            # Pure scoring & filtering logic (testable without device)
│
├── services/
│   └── suggestion-api/            # Node.js + Fastify backend API
│       ├── src/
│       │   ├── app.ts
│       │   ├── server.ts
│       │   ├── config/            # Scoring weights & feature flags
│       │   ├── lib/               # Logging, error handling
│       │   ├── provider/          # Google Places API adapter
│       │   ├── routes/            # API endpoints
│       │   └── shaping/           # Response payload assembly
│       └── __tests__/             # API tests with fixtures
│
├── specs/                           # Design & specification documents
│   └── 001-widget-restaurant-suggestion/
│       ├── spec.md                # Feature specification
│       ├── plan.md                # Implementation plan
│       ├── data-model.md          # Data contracts
│       ├── quickstart.md          # Developer quickstart
│       └── tasks.md               # Sprint tasks
│
└── scripts/                         # Build, generate, and utility scripts
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Xcode (for iOS development)
- Android SDK and Android Studio (for Android development)
- Expo CLI: `npm install -g expo-cli`

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd go-eat

# Install dependencies (monorepo)
npm install

# Install app-specific dependencies
cd go-eat
npm install
```

### Running the App Locally

**iOS Simulator**
```bash
cd go-eat
npm run build:ios
npm run ios
```

**Android Emulator**
```bash
cd go-eat
npm run build:android
npm run android
```

### Running the Backend

```bash
cd services/suggestion-api
npm run dev
```

The API will start at `http://localhost:3000` (or configured port).

### Running Tests

**Unit & contract tests** (Jest)
```bash
npm run test
```

**Specific package** (e.g., selection-core)
```bash
cd packages/selection-core
npm run test
```

**Integration tests** (Maestro or Detox)
```bash
npm run test:e2e
```

### Documentation

- [Feature Specification](./go-eat/specs/001-widget-restaurant-suggestion/spec.md)
- [Implementation Plan](./go-eat/specs/001-widget-restaurant-suggestion/plan.md)
- [Data Model & Contracts](./go-eat/specs/001-widget-restaurant-suggestion/data-model.md)
- [Quick Start Guide](./go-eat/specs/001-widget-restaurant-suggestion/quickstart.md)
