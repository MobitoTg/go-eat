/**
 * App entry point. Not itself a screen with content — decides where to send the user, since
 * "no further reason to open the app" after setup means there is nothing to show here directly
 * (Principle I: no browsing, list, or discovery UI anywhere, including at the root).
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useTheme } from '../src/theme/index.js';
import { loadPreferences } from '../src/storage/preferences.js';
import { bootstrap } from '../src/bootstrap.js';

export default function Index() {
  const theme = useTheme();
  const [destination, setDestination] = useState<'/onboarding' | '/preferences' | null>(null);

  useEffect(() => {
    void (async () => {
      await bootstrap();
      const prefs = await loadPreferences();
      setDestination(prefs.onboardingComplete ? '/preferences' : '/onboarding');
    })();
  }, []);

  if (!destination) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme['surface.base'] }}>
        <ActivityIndicator color={theme['accent.fill']} />
      </View>
    );
  }

  return <Redirect href={destination} />;
}
