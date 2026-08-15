import type { WidgetPayload } from '@go-eat/contract-types';
import { PAYLOAD_STORAGE, PAYLOAD_VERSION } from '@go-eat/contract-types';

/**
 * The app→widget shared-storage bridge.
 *
 * iOS writes into the App Group container, Android into SharedPreferences. Both are read by
 * native widget code that cannot run JavaScript, so this module is the only writer.
 *
 * **Writes MUST be atomic.** A widget reload can land mid-write, and a half-written payload
 * renders as a blank widget — which the constitution forbids outright ("honest states over empty
 * ones"). Atomicity here is not a nicety; it is the difference between a wrong state and no state.
 */

export interface SharedStorageAdapter {
  /** Must replace the value atomically — write-then-rename, not truncate-then-write. */
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
}

let adapter: SharedStorageAdapter | null = null;

/** Injected at app start, and swapped for an in-memory double in tests (Principle IV). */
export function setSharedStorageAdapter(next: SharedStorageAdapter): void {
  adapter = next;
}

function requireAdapter(): SharedStorageAdapter {
  if (!adapter) {
    throw new Error('Shared storage adapter not configured. Call setSharedStorageAdapter() first.');
  }
  return adapter;
}

export function payloadKey(platform: 'ios' | 'android'): string {
  return platform === 'ios' ? PAYLOAD_STORAGE.ios.key : PAYLOAD_STORAGE.android.key;
}

export async function writePayload(
  payload: WidgetPayload,
  platform: 'ios' | 'android',
): Promise<void> {
  // Serialize first. If the payload is somehow unserializable we fail before touching storage,
  // leaving the previous good payload in place rather than a truncated one.
  const serialized = JSON.stringify(payload);
  await requireAdapter().setItem(payloadKey(platform), serialized);
}

export async function readPayload(platform: 'ios' | 'android'): Promise<WidgetPayload | null> {
  const raw = await requireAdapter().getItem(payloadKey(platform));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as WidgetPayload;
    // An unknown version is not a crash and not a blank. The widget renders `stale` and the next
    // cycle corrects it (contracts/widget-payload.md, Versioning).
    if (parsed.version !== PAYLOAD_VERSION) return { ...parsed, state: 'stale', isStale: true };
    return parsed;
  } catch {
    return null;
  }
}
