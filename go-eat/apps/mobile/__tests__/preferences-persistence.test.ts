import {
  loadPreferences,
  savePreferences,
  setPreferencesStorageAdapter,
  DEFAULT_PREFERENCES,
} from '../src/storage/preferences.js';

/**
 * T089: Preferences persist across app and device restart (FR-027).
 *
 * "Restart" is simulated by re-reading through a FRESH adapter instance backed by the SAME
 * underlying store — the module holds no in-memory cache of its own, so a real restart (new JS
 * process, same disk file) behaves identically to this.
 */

function fileLikeAdapter() {
  const disk = new Map<string, string>(); // stands in for the persisted file
  return {
    async getItem(key: string) {
      return disk.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      disk.set(key, value);
    },
  };
}

describe('preferences persistence (FR-027)', () => {
  it('returns defaults when nothing has been saved yet', async () => {
    setPreferencesStorageAdapter(fileLikeAdapter());
    expect(await loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('persists exclusions and preferences across a simulated restart', async () => {
    const disk = fileLikeAdapter();
    setPreferencesStorageAdapter(disk);

    await savePreferences({ exclusions: ['vegan'], preferences: ['pescatarian'] });

    // "Restart": swap in the same backing store as a fresh adapter object.
    setPreferencesStorageAdapter(disk);
    const reloaded = await loadPreferences();

    expect(reloaded.exclusions).toEqual(['vegan']);
    expect(reloaded.preferences).toEqual(['pescatarian']);
  });

  it('persists onboardingComplete and locationPermission across restart', async () => {
    const disk = fileLikeAdapter();
    setPreferencesStorageAdapter(disk);

    await savePreferences({ onboardingComplete: true, locationPermission: 'granted' });

    setPreferencesStorageAdapter(disk);
    const reloaded = await loadPreferences();

    expect(reloaded.onboardingComplete).toBe(true);
    expect(reloaded.locationPermission).toBe('granted');
  });

  it('stamps updatedAt on every save, so a later save is detectable as later', async () => {
    setPreferencesStorageAdapter(fileLikeAdapter());
    const first = await savePreferences({ exclusions: ['halal'] });
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = await savePreferences({ exclusions: ['halal', 'kosher'] });

    expect(new Date(second.updatedAt).getTime()).toBeGreaterThan(new Date(first.updatedAt).getTime());
  });

  it('a partial update preserves fields it did not touch', async () => {
    setPreferencesStorageAdapter(fileLikeAdapter());
    await savePreferences({ exclusions: ['vegan'], onboardingComplete: true });
    const after = await savePreferences({ preferences: ['pescatarian'] });

    expect(after.exclusions).toEqual(['vegan']);
    expect(after.onboardingComplete).toBe(true);
    expect(after.preferences).toEqual(['pescatarian']);
  });
});
