import { assertDisjoint, OverlappingTagError, savePreferences, setPreferencesStorageAdapter } from '../src/storage/preferences.js';

/**
 * T090: Overlapping exclusions and preferences are rejected (data-model.md: "exclusions and
 * preferences MUST be disjoint — the same tag cannot be both. Reject at the settings UI, not at
 * request time.").
 */

function memoryAdapter() {
  const store = new Map<string, string>();
  return {
    async getItem(key: string) {
      return store.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('assertDisjoint', () => {
  it('allows disjoint sets', () => {
    expect(() => assertDisjoint(['vegan'], ['pescatarian'])).not.toThrow();
  });

  it('allows both being empty', () => {
    expect(() => assertDisjoint([], [])).not.toThrow();
  });

  it('rejects a tag present in both', () => {
    expect(() => assertDisjoint(['vegan', 'halal'], ['halal'])).toThrow(OverlappingTagError);
  });

  it('names every overlapping tag in the error', () => {
    try {
      assertDisjoint(['vegan', 'halal', 'kosher'], ['halal', 'kosher']);
      throw new Error('expected assertDisjoint to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(OverlappingTagError);
      expect((error as OverlappingTagError).tags).toEqual(['halal', 'kosher']);
    }
  });
});

describe('savePreferences rejects overlap at write time (the settings-UI validation boundary)', () => {
  beforeEach(() => {
    setPreferencesStorageAdapter(memoryAdapter());
  });

  it('rejects saving overlapping exclusions and preferences', async () => {
    await expect(savePreferences({ exclusions: ['vegan'], preferences: ['vegan'] })).rejects.toThrow(
      OverlappingTagError,
    );
  });

  it('does not persist a rejected update', async () => {
    const adapter = memoryAdapter();
    setPreferencesStorageAdapter(adapter);

    await savePreferences({ exclusions: [], preferences: [] });
    await expect(savePreferences({ exclusions: ['vegan'], preferences: ['vegan'] })).rejects.toThrow();

    expect(await adapter.getItem('goeat.preferences')).not.toContain('"vegan"');
  });
});
