/**
 * T081: iOS refresh handler.
 *
 * `GoEatWidget.tsx`'s `Button target="refresh"` cannot run JS itself (no runtime inside a
 * widget-directive component). The tap is delivered to this APP-process listener via
 * `addUserInteractionListener` (`expo-widgets`). This is the entire refresh mechanic: advance the
 * cursor over the already-fetched batch (FR-016, FR-017), never touch the network (FR-015,
 * FR-021a), and push the result straight back to the widget with no app launch (FR-005).
 *
 * Call `registerIosRefreshHandler()` once, at app start, alongside the Android widget task handler
 * registration.
 */

import GoEatWidget from '../../widgets/ios/GoEatWidget';
import { addUserInteractionListener } from 'expo-widgets';

import { advance } from '../cycle/cursor';
import { batchToWidgetPayload } from '../cycle/write-payload';
import { readBatch, writeBatch, writePayload } from '../storage/shared-storage';
import { log } from '../lib/logging';

const REFRESH_TARGET = 'refresh';

export function registerIosRefreshHandler(): { remove: () => void } {
  return addUserInteractionListener((event) => {
    if (event.target !== REFRESH_TARGET) return;
    void handleRefresh();
  });
}

async function handleRefresh(): Promise<void> {
  const batch = await readBatch('ios');
  if (!batch || batch.items.length === 0) {
    log.warn('ios refresh: no active batch to advance');
    return;
  }

  const next = advance(batch);
  await writeBatch(next, 'ios');

  const payload = batchToWidgetPayload(next, null, { isStale: false });
  await writePayload(payload, 'ios');

  GoEatWidget.updateSnapshot({ payload });
}
