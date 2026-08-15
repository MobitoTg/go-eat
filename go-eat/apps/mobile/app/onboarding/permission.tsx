/**
 * T094/T095/FR-026/FR-029: Location permission rationale, request, and the denied path.
 *
 * The rationale is shown BEFORE the OS prompt, and again — with a direct path to system settings,
 * never a dead end — if the user denies. Reachable at `/onboarding/permission` as the second
 * onboarding step, and at `/permission` for `goeat://permission` (the widget's
 * `permission_required` state, FR-004) via the redirect in `app/permission.tsx`.
 */

import { useState } from 'react';
import { Linking, Text, View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '../../src/theme/index.js';
import { requestPermission, getPermissionState } from '../../src/location/index.js';
import { savePreferences } from '../../src/storage/preferences.js';

export default function OnboardingPermissionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [denied, setDenied] = useState(false);

  async function handleEnable(): Promise<void> {
    const result = await requestPermission();
    await savePreferences({ locationPermission: result });

    if (result === 'granted') {
      router.push('/onboarding/preferences');
      return;
    }

    // A denial that's still 'undetermined' (rare, some platforms) is re-askable; a hard 'denied'
    // needs system settings. Either way we never dead-end here (FR-029).
    setDenied(true);
  }

  async function handleOpenSettings(): Promise<void> {
    await Linking.openSettings();
    // Re-check on return — the widget's own resolve-state.ts also re-reads permission on every
    // foreground rather than trusting a cached value (data-model.md).
    const status = await getPermissionState();
    await savePreferences({ locationPermission: status });
    if (status === 'granted') router.push('/onboarding/preferences');
  }

  return (
    <View style={[styles.container, { backgroundColor: theme['surface.base'] }]}>
      <Text style={[styles.title, { color: theme['text.primary'] }]}>Enable Location</Text>
      <Text style={[styles.body, { color: theme['text.secondary'] }]}>
        Go-Eat reads your location once per suggestion to find a restaurant near you. It is never
        stored, never shared, and never used for anything else.
      </Text>

      {!denied ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleEnable()}
          style={[styles.button, { backgroundColor: theme['accent.fill'] }]}
        >
          <Text style={[styles.buttonText, { color: theme['accent.onFill'] }]}>Enable Location</Text>
        </Pressable>
      ) : (
        <>
          <Text style={[styles.body, { color: theme['status.warning'] }]}>
            Without location, Go-Eat's widget can't find a restaurant near you — it will show a
            prompt to enable location instead of a suggestion.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleOpenSettings()}
            style={[styles.button, { backgroundColor: theme['accent.fill'] }]}
          >
            <Text style={[styles.buttonText, { color: theme['accent.onFill'] }]}>Open Settings</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  button: { marginTop: 16, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
