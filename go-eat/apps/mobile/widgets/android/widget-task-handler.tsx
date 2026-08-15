/**
 * T082: Android widget task handler.
 *
 * The single entry point react-native-android-widget invokes for every widget lifecycle event —
 * added, resized, a periodic system-scheduled update, deletion, or a tap. Registered once at app
 * start via `registerWidgetTaskHandler` (index entry point).
 *
 * `WIDGET_CLICK` with `clickAction: 'refresh'` is the ENTIRE refresh mechanic (FR-016, FR-017):
 * advance the cursor over the already-fetched batch and re-render, no network call (FR-015,
 * FR-021a), no app launch (FR-005) — `renderWidget` updates the RemoteViews in place. Every other
 * `clickAction` (`'OPEN_URI'`, the deep links) is handled natively by the library before this
 * handler is even invoked.
 */

import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import type { WidgetPayload } from '@go-eat/contract-types';

import { advance } from '../../src/cycle/cursor';
import { batchToWidgetPayload, loadingPayload } from '../../src/cycle/write-payload';
import { log } from '../../src/lib/logging';
import { readBatch, readPayload, writeBatch, writePayload } from '../../src/storage/shared-storage';
import { GoEatWidget } from './GoEatWidget';

const REFRESH_ACTION = 'refresh';
const WIDGET_NAME = 'GoEat';

/**
 * FR-039: dark is independently specified, never derived by inverting light. Passing both variants
 * lets the OS switch instantly with no re-render round trip.
 */
function renderBothThemes(payload: WidgetPayload) {
  return {
    light: <GoEatWidget payload={payload} theme="light" />,
    dark: <GoEatWidget payload={payload} theme="dark" />,
  };
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== WIDGET_NAME) return;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const payload = (await readPayload('android')) ?? loadingPayload(true);
      props.renderWidget(renderBothThemes(payload));
      return;
    }

    case 'WIDGET_CLICK': {
      if (props.clickAction !== REFRESH_ACTION) return;

      const batch = await readBatch('android');
      if (!batch || batch.items.length === 0) {
        log.warn('android refresh: no active batch to advance');
        return;
      }

      const next = advance(batch);
      await writeBatch(next, 'android');

      const payload = batchToWidgetPayload(next, null, { isStale: false });
      await writePayload(payload, 'android');

      props.renderWidget(renderBothThemes(payload));
      return;
    }

    case 'WIDGET_DELETED':
      // No per-widget cleanup: nothing is keyed by widget instance id (Principle V — no history to
      // clean up in the first place).
      return;
  }
}
