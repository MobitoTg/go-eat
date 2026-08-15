/**
 * T098/FR-027: Post-onboarding preferences screen — view and change exclusions/preferences after
 * setup. Reachable at `/preferences` both as a normal app screen and as the target of
 * `goeat://preferences` (the widget's `all_filtered` state, FR-021/FR-004).
 *
 * Changing anything here invalidates the active batch immediately (T099, FR-021) — this screen
 * doesn't invalidate it directly; `savePreferences` stamps `updatedAt`, and
 * `cycle/invalidation.ts`'s `evaluateBatch` compares the resulting `preferencesHash` against the
 * batch's on every read, which is what actually triggers the next cycle.
 */

import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { DIETARY_TAGS, type DietaryTag } from '@go-eat/contract-types';

import { useTheme } from '../../src/theme/index.js';
import { loadPreferences, savePreferences, type UserPreferences } from '../../src/storage/preferences.js';

function toggle(list: DietaryTag[], tag: DietaryTag): DietaryTag[] {
  return list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag];
}

export default function PreferencesScreen() {
  const theme = useTheme();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);

  useEffect(() => {
    void loadPreferences().then(setPrefs);
  }, []);

  if (!prefs) {
    return <View style={[styles.container, { backgroundColor: theme['surface.base'] }]} />;
  }

  async function handleExclude(tag: DietaryTag): Promise<void> {
    const next = await savePreferences({
      exclusions: toggle(prefs!.exclusions, tag),
      preferences: prefs!.preferences.filter((t) => t !== tag),
    });
    setPrefs(next);
  }

  async function handlePrefer(tag: DietaryTag): Promise<void> {
    const next = await savePreferences({
      preferences: toggle(prefs!.preferences, tag),
      exclusions: prefs!.exclusions.filter((t) => t !== tag),
    });
    setPrefs(next);
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme['surface.base'] }]}>
      <Text style={[styles.title, { color: theme['text.primary'] }]}>Preferences</Text>

      <Text style={[styles.sectionLabel, { color: theme['text.primary'] }]}>Exclude</Text>
      <View style={styles.tagRow}>
        {DIETARY_TAGS.map((tag) => (
          <Pressable
            key={`exclude-${tag}`}
            accessibilityRole="button"
            accessibilityState={{ selected: prefs.exclusions.includes(tag) }}
            onPress={() => void handleExclude(tag)}
            style={[
              styles.tag,
              {
                backgroundColor: prefs.exclusions.includes(tag) ? theme['accent.fill'] : theme['surface.raised'],
                borderColor: theme['border.hairline'],
              },
            ]}
          >
            <Text style={{ color: prefs.exclusions.includes(tag) ? theme['accent.onFill'] : theme['text.primary'] }}>
              {prefs.exclusions.includes(tag) ? '✕ ' : ''}
              {tag.replace(/_/g, ' ')}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: theme['text.primary'] }]}>Prefer</Text>
      <View style={styles.tagRow}>
        {DIETARY_TAGS.map((tag) => (
          <Pressable
            key={`prefer-${tag}`}
            accessibilityRole="button"
            accessibilityState={{ selected: prefs.preferences.includes(tag) }}
            onPress={() => void handlePrefer(tag)}
            style={[
              styles.tag,
              {
                backgroundColor: prefs.preferences.includes(tag) ? theme['accent.fill'] : theme['surface.raised'],
                borderColor: theme['border.hairline'],
              },
            ]}
          >
            <Text style={{ color: prefs.preferences.includes(tag) ? theme['accent.onFill'] : theme['text.primary'] }}>
              {prefs.preferences.includes(tag) ? '♥ ' : ''}
              {tag.replace(/_/g, ' ')}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '700' },
  sectionLabel: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
});
