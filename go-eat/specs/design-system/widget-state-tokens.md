# Widget State → Semantic Token Mapping

**Date**: 2026-08-15  
**Status**: Specification  
**Related**: Constitution VI.3 (one specification, two implementations), widget-snapshots.test.ts, both iOS and Android widget views

---

## Purpose

Both widget implementations (iOS and Android) must render the six widget states consistently and distinctly. This document defines which semantic tokens to use for each state, so the two widget codebases diverge only in layout and rendering, never in colors or semantic intent.

**Critical principle**: Token NAMES only. No hex values, no color literals. The tokens are defined in `packages/design-tokens/src/semantics.ts` and generated into platform assets (iOS Asset Catalog, Android colors.xml) at build time.

---

## Six Widget States

### 1. `suggestion` — Restaurant showing

**Purpose**: User is looking at a suggestion and can tap to navigate.

**Visual intent**: Highlight the restaurant prominently; make it clear this is actionable.

**Tokens**:
- **Text (name, cuisine, distance)**: `text.primary`
- **Accent (rating, visual emphasis)**: `accent.fill` for highlight/background
- **Accent text** (if white on accent): `accent.onFill`
- **Container background**: `surface.base`
- **Optional divider**: `border.subtle`

**Example layout**:
```
[surface.base background]
  Restaurant Name (text.primary)
  Italian · 4.5 ⭐ · 0.5 mi (text.primary)
  [accent.fill button] TAP FOR DIRECTIONS
```

---

### 2. `permission_required` — Location permission needed

**Purpose**: Location permission not granted; prompt user to enable it.

**Visual intent**: Warn that the widget needs permission; make the action clear.

**Tokens**:
- **Prompt text**: `text.secondary` (muted, since this is a blocker)
- **CTA button**: `status.warning` for the "Enable Location" button
- **Text on warning**: `text.primary` for readability
- **Container background**: `surface.base`

**Example layout**:
```
[surface.base background]
  Enable Location (text.secondary)
  [status.warning button] SETTINGS
```

---

### 3. `no_results` — No qualifying restaurants

**Purpose**: No restaurants match the quality bar; honest state, not a malfunction.

**Visual intent**: Acknowledge the situation; don't pretend there's a suggestion.

**Tokens**:
- **Message text**: `text.secondary` (calm, informational)
- **Optional icon**: Use neutral icon (not an error)
- **Container background**: `surface.base`

**Example layout**:
```
[surface.base background]
  ⓘ Nothing worth recommending nearby (text.secondary)
```

---

### 4. `all_filtered` — Preferences filtered everything

**Purpose**: User's dietary exclusions or preferences eliminated all candidates.

**Visual intent**: Explain the situation and invite adjustment.

**Tokens**:
- **Message text**: `text.secondary`
- **Hint text** (smaller): `text.tertiary`
- **Optional CTA icon**: `accent.fill` (subtle, not aggressive)
- **Container background**: `surface.base`

**Example layout**:
```
[surface.base background]
  ⚙ All preferences filtered out (text.secondary)
  Adjust settings in the app (text.tertiary)
```

---

### 5. `stale` — Last known suggestion (may be outdated)

**Purpose**: Widget has a cached suggestion but can't refresh (no network, etc.).

**Visual intent**: Show the suggestion but indicate it may be outdated.

**Tokens**:
- **Restaurant text**: `text.primary` (same as `suggestion`)
- **Stale indicator badge**: `status.warning` (amber/orange)
- **Stale indicator text**: `text.inverse` (high contrast on status color)
- **Container background**: `surface.base`

**Example layout**:
```
[surface.base background]
  Restaurant Name (text.primary)
  Italian · 4.5 ⭐ · 0.5 mi (text.primary)
  [status.warning badge] STALE (text.inverse)
```

---

### 6. `loading` — Cycle in progress

**Purpose**: Widget is fetching a new suggestion; show progress.

**Visual intent**: Indicate activity without alarming the user.

**Tokens**:
- **Placeholder text**: `text.tertiary` (muted, temporary)
- **Spinner or pulse animation**: `status.info` or `accent.fill` (optional, depending on platform)
- **Container background**: `surface.base`

**Example layout**:
```
[surface.base background]
  ⟳ Finding a restaurant... (text.tertiary + animation)
```

---

## Rendering Rules

1. **All states use `surface.base` as the opaque container background.** Contrast is never computed against wallpaper (VI.6).

2. **Every state must be distinguishable without color alone.** Use shape, icon, position, or text in addition to token color (FR-038, R11).
   - Example: `suggestion` has a TAP button; `permission_required` has SETTINGS button; `no_results` has an info icon.

3. **No state uses hover, focus, or pressed variants.** Widgets are static snapshots (FR-040).

4. **Status tokens (`status.success`, `status.warning`, `status.danger`) are for transient states only.** Use sparingly; most text is `text.primary` or `text.secondary`.

5. **All token names referenced here are defined in `packages/design-tokens/src/semantics.ts`.** If a token doesn't exist, the build fails (ESLint rule `no-primitive-reference`).

---

## Constraints from Earlier Decisions

- **No dynamic color**: Fixed Open Color palette, no system-color branches (ADR-001).
- **No color in the payload**: State is determined client-side; colors are applied by native platform code (VI.7).
- **Semantic layer only**: No component-scoped or one-off colors (VI.3).

---

## Testing & Validation

- **Snapshot tests** (T056c): Render all six states in light, dark, and iOS tinted mode; assert no regressions.
- **Chromatic budget test** (T056b): Each surface uses ≤3 chromatic values (VI.4).
- **Guard test** (T053b): No hover/focus/pressed variants exist.
- **Contrast gate** (T013d): All token pairings meet WCAG thresholds.
- **Manual acceptance** (T056a): iOS tinted rendering removes all hue; confirm all six states stay distinguishable.
