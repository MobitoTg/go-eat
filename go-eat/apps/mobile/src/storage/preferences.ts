import type { DietaryTag } from '@go-eat/contract-types';
import { preferencesHash } from '../cycle/invalidation.js';

/**
 * T092: The preferences store.
 *
 * Device-scoped, no account (FR-032) — this is APP storage, not the shared App
 * Group/SharedPreferences container `shared-storage.ts` writes to. It never crosses to the widget;
 * only its `exclusions`/`preferences` fields (via a cycle request) and `preferencesHash` (via
 * `cycle/invalidation.ts`) ever leave this module.
 */

export interface UserPreferences {
  /** Hard filters (FR-011). Empty by default. */
  exclusions: DietaryTag[];
  /** Positive scoring inputs. Empty by default. Disjoint from `exclusions`. */
  preferences: DietaryTag[];
  /** Gates the widget-install guide. */
  onboardingComplete: boolean;
  /** Mirrors OS state; re-read on foreground, never trusted as cached truth. */
  locationPermission: 'granted' | 'denied' | 'undetermined';
  /** ISO 8601. Any change invalidates the active batch (FR-021). */
  updatedAt: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  exclusions: [],
  preferences: [],
  onboardingComplete: false,
  locationPermission: 'undetermined',
  updatedAt: new Date(0).toISOString(),
};

const STORAGE_KEY = 'goeat.preferences';

export interface PreferencesStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

let adapter: PreferencesStorageAdapter | null = null;

/** Injected at app start, and swapped for an in-memory double in tests (Principle IV). */
export function setPreferencesStorageAdapter(next: PreferencesStorageAdapter): void {
  adapter = next;
}

function requireAdapter(): PreferencesStorageAdapter {
  if (!adapter) {
    throw new Error('Preferences storage adapter not configured. Call setPreferencesStorageAdapter() first.');
  }
  return adapter;
}

export async function loadPreferences(): Promise<UserPreferences> {
  const raw = await requireAdapter().getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_PREFERENCES;

  try {
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<UserPreferences>) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** Data-model.md validation: `exclusions` and `preferences` MUST be disjoint. */
export class OverlappingTagError extends Error {
  constructor(public readonly tags: DietaryTag[]) {
    super(`Tag(s) cannot be both an exclusion and a preference: ${tags.join(', ')}`);
    this.name = 'OverlappingTagError';
  }
}

export function assertDisjoint(exclusions: DietaryTag[], preferences: DietaryTag[]): void {
  const overlap = exclusions.filter((tag) => preferences.includes(tag));
  if (overlap.length > 0) throw new OverlappingTagError(overlap);
}

/**
 * Persist a full or partial update, validating disjointness, and stamping `updatedAt` so
 * `cycle/invalidation.ts` sees the change (FR-021).
 */
export async function savePreferences(update: Partial<UserPreferences>): Promise<UserPreferences> {
  const current = await loadPreferences();
  const next: UserPreferences = { ...current, ...update, updatedAt: new Date().toISOString() };

  assertDisjoint(next.exclusions, next.preferences);

  await requireAdapter().setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/**
 * Cheap equality check for FR-021 preference-change invalidation. Delegates to
 * `cycle/invalidation.ts`'s `preferencesHash` so there is exactly one hashing implementation for
 * `start-cycle.ts`, `refresh.ts`, and the batch-writing side to agree on.
 */
export function preferencesHashFor(prefs: Pick<UserPreferences, 'exclusions' | 'preferences'>): string {
  return preferencesHash(prefs.exclusions, prefs.preferences);
}
