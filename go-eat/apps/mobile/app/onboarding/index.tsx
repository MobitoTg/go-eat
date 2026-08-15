/**
 * T093/FR-026: Onboarding purpose screen — the first thing a new user sees.
 *
 * States plainly what the product does: one restaurant on the home screen, no browsing. No list,
 * search, or discovery affordance appears here or anywhere else in the app (FR-028, Principle I).
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '../../src/theme/index.js';

export default function OnboardingPurposeScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme['surface.base'] }]}>
      <Text style={[styles.title, { color: theme['text.primary'] }]}>Go-Eat</Text>
      <Text style={[styles.body, { color: theme['text.secondary'] }]}>
        Go-Eat tells you where to eat. One restaurant, right on your home screen — no list to
        browse, no search, no deciding.
      </Text>
      <Text style={[styles.body, { color: theme['text.secondary'] }]}>
        We use your location once per suggestion to find somewhere nearby worth eating at. Tap it
        and you're on your way — the rest of the app exists only to set that up.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/onboarding/permission')}
        style={[styles.button, { backgroundColor: theme['accent.fill'] }]}
      >
        <Text style={[styles.buttonText, { color: theme['accent.onFill'] }]}>Get Started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 32, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  button: { marginTop: 24, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
