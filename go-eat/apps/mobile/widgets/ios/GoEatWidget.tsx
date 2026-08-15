/**
 * T050/T050a/T052/T053a: iOS home screen widget, via `expo-widgets` (research R1).
 *
 * This is genuinely TSX, but it does NOT run as JavaScript on device: the `'widget'` directive
 * marks this component for Continuous Native Generation to compile to a native SwiftUI WidgetKit
 * extension at build time. There is no React runtime inside the widget — every string and URL
 * arrives pre-computed via `WidgetPayload`; this file only decides which `@expo/ui` primitives
 * paint `widgetContentFor`'s output. The same `createWidget(...)` call below is also the app-side
 * handle: `apps/mobile/src/cycle/write-payload.ts`'s caller imports this module's default export
 * and calls `.updateSnapshot(payload)` after every cycle and every refresh.
 *
 * State → text/action/glyph selection lives in `../../src/widget/content.ts`, shared with the
 * Android widget, so the two implementations can diverge only in layout (plan.md: "the two widgets
 * duplicate layout, never values").
 *
 * Tap-through (FR-023) uses `widgetURL` — a widget supports exactly one, a good structural fit for
 * "exactly one restaurant, exactly one action" (Principle II). The refresh control (FR-005,
 * FR-016) is a `Button` identified by `target="refresh"`: a widget-directive component cannot run
 * an `onPress` callback itself (no JS runtime), so the tap is delivered to the APP process via
 * `addUserInteractionListener` (`../../src/widget/ios-refresh.ts`), which does the actual cursor
 * advance and calls `.updateSnapshot()` — no network call, and per Expo's documented interactive-
 * widget model, no app launch.
 */

import { Button, HStack, Text, VStack } from '@expo/ui/swift-ui';
import { background, font, foregroundStyle, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetPayload } from '@go-eat/contract-types';
import { color } from '@go-eat/design-tokens/tokens';

import { widgetContentFor, type WidgetContent } from '../../src/widget/content';

export interface GoEatWidgetProps {
  payload: WidgetPayload;
}

/**
 * Non-hue glyphs (FR-038, research R11): plain characters rather than an icon font, so tinted
 * rendering — which strips all hue to a single tint — still reads as six visibly different marks.
 */
const GLYPHS: Record<WidgetContent['glyph'], string> = {
  plate: '🍽',
  clock: '🕐',
  'pin-slash': '📍',
  info: 'ⓘ',
  filter: '⚙',
  spinner: '⟳',
};

const GoEatWidget = (props: GoEatWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  const theme = environment.colorScheme === 'dark' ? 'dark' : 'light';
  const content = widgetContentFor(props.payload);

  return (
    <VStack
      modifiers={[
        // VI.6: the widget paints its own opaque base — contrast is never computed against
        // whatever wallpaper happens to sit behind it.
        background(color(theme, 'surface.base')),
        padding({ all: 12 }),
        // A widget supports exactly one widgetURL. Skipped when the refresh button is shown, so a
        // tap on the surrounding VStack can never race with the button's own target.
        ...(content.tapUrl && !content.showRefresh ? [widgetURL(content.tapUrl)] : []),
      ]}
    >
      <HStack>
        <Text modifiers={[font({ size: 16 })]}>{GLYPHS[content.glyph]}</Text>
        <Text modifiers={[font({ weight: 'bold', size: 15 }), foregroundStyle(color(theme, 'text.primary'))]}>
          {content.title}
        </Text>
      </HStack>

      {content.subtitle ? (
        <Text modifiers={[font({ size: 13 }), foregroundStyle(color(theme, 'text.secondary'))]}>
          {content.subtitle}
        </Text>
      ) : null}

      {content.actionLabel && content.state === 'stale' ? (
        // `status.warning` is a TEXT-role token (verified against surface.base only) — rendered as
        // colored text on the normal background, never as a fill. There is no verified
        // "text-on-warning" pairing in the semantic map (VI.5).
        <Text modifiers={[font({ weight: 'bold', size: 12 }), foregroundStyle(color(theme, 'status.warning'))]}>
          {content.actionLabel}
        </Text>
      ) : null}

      {content.actionLabel && content.state !== 'stale' ? (
        <Text
          modifiers={[
            font({ weight: 'bold', size: 12 }),
            background(color(theme, 'accent.fill')),
            foregroundStyle(color(theme, 'accent.onFill')),
          ]}
        >
          {content.actionLabel}
        </Text>
      ) : null}

      {content.showRefresh ? (
        <Button label="Next" target="refresh" modifiers={[foregroundStyle(color(theme, 'text.secondary'))]} />
      ) : null}
    </VStack>
  );
};

export default createWidget<GoEatWidgetProps>('GoEatWidget', GoEatWidget);
