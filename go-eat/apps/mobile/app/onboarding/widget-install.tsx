/**
 * T097/FR-026: Widget-install guide — the last onboarding step. Per-platform, since the
 * installation gesture differs (research R1/R2: no shared widget UI layer, and no shared install
 * flow either).
 */

import { Platform, Text, View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '../../src/theme/index.js';
import { savePreferences } from '../../src/storage/preferences.js';

const STEPS =
  Platform.OS === 'ios'
    ? ['Touch and hold your home screen', 'Tap the + in the top corner', 'Search "Go-Eat"', 'Tap Add Widget']
    : ['Touch and hold your home screen', 'Tap Widgets', 'Find "Go-Eat" and drag it to your home screen'];

export default function WidgetInstallScreen() {
  const router = useRouter();
  const theme = useTheme();

  async function handleDone(): Promise<void> {
    await savePreferences({ onboardingComplete: true });
    router.replace('/');
  }

  return (
    <View style={[styles.container, { backgroundColor: theme['surface.base'] }]}>
      <Text style={[styles.title, { color: theme['text.primary'] }]}>Add the Widget</Text>
      <Text style={[styles.body, { color: theme['text.secondary'] }]}>
        This is the whole app — once the widget is on your home screen, you shouldn't need to open
        Go-Eat again.
      </Text>

      {STEPS.map((step, index) => (
        <Text key={step} style={[styles.step, { color: theme['text.primary'] }]}>
          {index + 1}. {step}
        </Text>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={() => void handleDone()}
        style={[styles.button, { backgroundColor: theme['accent.fill'] }]}
      >
        <Text style={[styles.buttonText, { color: theme['accent.onFill'] }]}>Done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, marginBottom: 8 },
  step: { fontSize: 16, lineHeight: 24 },
  button: { marginTop: 24, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
