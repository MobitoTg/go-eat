/**
 * App start wiring: injects the real platform adapters behind the seams `Principle IV` requires to
 * be swappable (tests use in-memory doubles instead — see `setSharedStorageAdapter`,
 * `setPreferencesStorageAdapter`, `setLocationProvider`).
 *
 * **Known gap**: `setSharedStorageAdapter` below is backed by `AsyncStorage`, which is scoped to
 * the app's own sandbox and does NOT cross into an iOS App Group or Android widget
 * `SharedPreferences` file the way `contracts/widget-payload.md` requires. Bridging that requires
 * either a native module (e.g. wrapping `UserDefaults(suiteName:)` / `Context.getSharedPreferences`
 * directly) or a package such as `react-native-shared-group-preferences` — genuinely native work
 * that needs a development build to verify (plan.md: "workflow changes from `expo start` to
 * `expo run:ios` / `expo run:android`"). `AsyncStorage` is used here so the rest of the app (cycle
 * orchestration, refresh dispatch, tests) is fully wired and exercisable in the interim; swapping
 * this one function for a real bridge is the only change needed once that native piece lands.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { setSharedStorageAdapter } from './storage/shared-storage.js';
import { setPreferencesStorageAdapter } from './storage/preferences.js';
import { setLocationProvider, type PermissionState } from './location/index.js';
import { configureApiClient } from './cycle/api-client.js';

let bootstrapped = false;

export async function bootstrap(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  setSharedStorageAdapter({
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
  });

  setPreferencesStorageAdapter({
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
  });

  setLocationProvider({
    async getPermissionState(): Promise<PermissionState> {
      const { status } = await Location.getForegroundPermissionsAsync();
      return toPermissionState(status);
    },
    async requestPermission(): Promise<PermissionState> {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return toPermissionState(status);
    },
    async getCurrentPosition() {
      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        return { lat: position.coords.latitude, lng: position.coords.longitude };
      } catch {
        return null; // No fix — captureAnchor() returns null, never a stale or guessed coordinate.
      }
    },
  });

  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
  configureApiClient(apiUrl);
}

function toPermissionState(status: Location.PermissionStatus): PermissionState {
  switch (status) {
    case Location.PermissionStatus.GRANTED:
      return 'granted';
    case Location.PermissionStatus.DENIED:
      return 'denied';
    default:
      return 'undetermined';
  }
}
