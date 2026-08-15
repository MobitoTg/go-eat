/**
 * T096: Dietary preferences and exclusions step, with disjoint validation (data-model.md).
 *
 * Optional — the product works fully with neither set (spec.md Assumptions). A tag tapped as an
 * exclusion is removed from preferences and vice versa, so the two selections can never overlap in
 * the UI itself, which is the "reject at the settings UI, not at request time" data-model.md calls
 * for; `savePreferences` still asserts it as a hard backstop.
 */

import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { DIETARY_TAGS, type DietaryTag } from '@go-eat/contract-types';

import { useTheme } from '../../src/theme/index.js';
import { savePreferences } from '../../src/storage/preferences.js';

function toggle(list: DietaryTag[], tag: DietaryTag): DietaryTag[] {
  return list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag];
}

export default function OnboardingPreferencesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [exclusions, setExclusions] = useState<DietaryTag[]>([]);
  const [preferences, setPreferences] = useState<DietaryTag[]>([]);

  function handleExclude(tag: DietaryTag): void {
    setExclusions((prev) => toggle(prev, tag));
    setPreferences((prev) => prev.filter((t) => t !== tag)); // never both (data-model.md)
  }

  function handlePrefer(tag: DietaryTag): void {
    setPreferences((prev) => toggle(prev, tag));
    setExclusions((prev) => prev.filter((t) => t !== tag));
  }

  async function handleContinue(): Promise<void> {
    await savePreferences({ exclusions, preferences });
    router.push('/onboarding/widget-install');
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme['surface.base'] }]}>
      <Text style={[styles.title, { color: theme['text.primary'] }]}>Dietary Preferences</Text>
      <Text style={[styles.body, { color: theme['text.secondary'] }]}>
        Optional. Exclusions never appear in your suggestions; preferences are just a lean, not a
        rule.
      </Text>

      {/*
        Selected state uses the one verified fill pairing (accent.fill/accent.onFill) for BOTH
        lists — there is no verified "danger fill" pairing in the semantic map (status.danger is a
        TEXT-role token, measured against surface.base, not a background). Exclude vs. prefer is
        differentiated by section label and by the selected LABEL TEXT color below, not by a second
        background fill (VI.4: at most one accent chromatic value per surface).
      */}
      <Text style={[styles.sectionLabel, { color: theme['text.primary'] }]}>Exclude</Text>
      <View style={styles.tagRow}>
        {DIETARY_TAGS.map((tag) => (
          <Pressable
            key={`exclude-${tag}`}
            accessibilityRole="button"
            accessibilityState={{ selected: exclusions.includes(tag) }}
            onPress={() => handleExclude(tag)}
            style={[
              styles.tag,
              {
                backgroundColor: exclusions.includes(tag) ? theme['accent.fill'] : theme['surface.raised'],
                borderColor: theme['border.hairline'],
              },
            ]}
          >
            <Text
              style={{
                color: exclusions.includes(tag) ? theme['accent.onFill'] : theme['text.primary'],
                fontWeight: exclusions.includes(tag) ? '700' : '400',
              }}
            >
              {exclusions.includes(tag) ? '✕ ' : ''}
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
            accessibilityState={{ selected: preferences.includes(tag) }}
            onPress={() => handlePrefer(tag)}
            style={[
              styles.tag,
              {
                backgroundColor: preferences.includes(tag) ? theme['accent.fill'] : theme['surface.raised'],
                borderColor: theme['border.hairline'],
              },
            ]}
          >
            <Text style={{ color: preferences.includes(tag) ? theme['accent.onFill'] : theme['text.primary'] }}>
              {preferences.includes(tag) ? '♥ ' : ''}
              {tag.replace(/_/g, ' ')}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => void handleContinue()}
        style={[styles.button, { backgroundColor: theme['accent.fill'] }]}
      >
        <Text style={[styles.buttonText, { color: theme['accent.onFill'] }]}>Continue</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 20 },
  sectionLabel: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  button: { marginTop: 24, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
