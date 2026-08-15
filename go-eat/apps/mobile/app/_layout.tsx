/**
 * T054/T093/T100: Root layout and route registration.
 *
 * Registers the `goeat://` scheme's inbound routes (contracts/deep-link.md):
 * - `goeat://onboarding` → `/onboarding`
 * - `goeat://permission` → `/permission` (a thin redirect into the onboarding step, so the
 *   permission screen has one implementation regardless of entry point)
 * - `goeat://preferences` → `/preferences`
 *
 * No route here resolves to a list, search, or discovery screen (FR-028, Principle I) — the file
 * tree under `app/` is the complete inventory of reachable screens, and
 * `__tests__/no-browsing-ui.test.ts` asserts that by reading it.
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';

import { bootstrap } from '../src/bootstrap';

export default function RootLayout() {
  useEffect(() => {
    void bootstrap();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding/index" />
      <Stack.Screen name="onboarding/permission" />
      <Stack.Screen name="onboarding/preferences" />
      <Stack.Screen name="onboarding/widget-install" />
      <Stack.Screen name="permission" />
      <Stack.Screen name="preferences/index" />
    </Stack>
  );
}
