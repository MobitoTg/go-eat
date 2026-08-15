/**
 * T051/T051a/T053/T053a: Android home screen widget, via `react-native-android-widget` (research
 * R2). Unlike the iOS side, this DOES run as JavaScript — inside a headless RN task
 * (`widget-task-handler.ts`), not the widget process itself, which only ever renders the
 * `RemoteViews` tree this function returns. Render-only: no formatting, no URL construction —
 * everything arrives pre-computed in `WidgetPayload` via `widgetContentFor`, shared with the iOS
 * widget so the two implementations diverge only in layout (plan.md).
 *
 * Tap-through (FR-023) and the `goeat://` state links use `clickAction="OPEN_URI"` directly —
 * react-native-android-widget dispatches that without any handler code on our side. The refresh
 * control (FR-005, FR-016) uses a distinct `clickAction="refresh"`, handled in
 * `widget-task-handler.ts`, which is the only clickAction requiring app-side logic.
 */

import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetPayload } from '@go-eat/contract-types';
import { color } from '@go-eat/design-tokens/tokens';

import { widgetContentFor, type WidgetContent } from '../../src/widget/content';

export interface GoEatAndroidWidgetProps {
  payload: WidgetPayload;
  theme: 'light' | 'dark';
}

const hex = (value: string): `#${string}` => (value.startsWith('#') ? (value as `#${string}`) : `#${value}`);

/** Non-hue glyphs (FR-038, research R11) — plain characters, matching the iOS widget exactly. */
const GLYPHS: Record<WidgetContent['glyph'], string> = {
  plate: '🍽',
  clock: '🕐',
  'pin-slash': '📍',
  info: 'ⓘ',
  filter: '⚙',
  spinner: '⟳',
};

export function GoEatWidget({ payload, theme }: GoEatAndroidWidgetProps) {
  const content = widgetContentFor(payload);
  const tapAction = content.tapUrl && !content.showRefresh
    ? { clickAction: 'OPEN_URI' as const, clickActionData: { uri: content.tapUrl } }
    : {};

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 12,
        // VI.6: the widget paints its own opaque base — never computed against the wallpaper.
        backgroundColor: hex(color(theme, 'surface.base')),
      }}
      {...tapAction}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextWidget text={GLYPHS[content.glyph]} style={{ fontSize: 16, marginRight: 4 }} />
        <TextWidget
          text={content.title}
          truncate="END"
          maxLines={1}
          style={{ fontSize: 15, fontWeight: 'bold', color: hex(color(theme, 'text.primary')) }}
        />
      </FlexWidget>

      {content.subtitle ? (
        <TextWidget
          text={content.subtitle}
          truncate="END"
          maxLines={1}
          style={{ fontSize: 13, color: hex(color(theme, 'text.secondary')), marginTop: 2 }}
        />
      ) : null}

      {/*
        `status.warning` is a TEXT-role token (verified against surface.base only) — rendered as
        colored text with no fill for `stale`. There is no verified "text-on-warning" pairing in
        the semantic map (VI.5), so `permission_required`'s SETTINGS action uses the one verified
        fill pairing, accent.fill/accent.onFill, same as the suggestion tap label.
      */}
      {content.actionLabel && content.state === 'stale' ? (
        <TextWidget
          text={content.actionLabel}
          style={{ marginTop: 6, fontSize: 12, fontWeight: 'bold', color: hex(color(theme, 'status.warning')) }}
        />
      ) : null}

      {content.actionLabel && content.state !== 'stale' ? (
        <FlexWidget
          style={{
            marginTop: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: hex(color(theme, 'accent.fill')),
          }}
        >
          <TextWidget
            text={content.actionLabel}
            style={{ fontSize: 12, fontWeight: 'bold', color: hex(color(theme, 'accent.onFill')) }}
          />
        </FlexWidget>
      ) : null}

      {content.showRefresh ? (
        <FlexWidget style={{ marginTop: 6 }} clickAction="refresh">
          <TextWidget text="Next" style={{ fontSize: 12, color: hex(color(theme, 'text.secondary')) }} />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}
