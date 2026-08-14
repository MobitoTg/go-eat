# How to create your first Widget

> **Source:** [Expo Blog: Home-screen widgets and live activities in Expo](https://expo.dev/blog/home-screen-widgets-and-live-activities-in-expo#how-to-create-your-first-widget)

After installing the library and configuring your first widget, here's what a minimal widget looks like — one that tracks a coffee count and lets the user increment it directly from the home screen:

## Code Example

```typescript
import { Button, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { createWidget, WidgetBase } from 'expo-widgets';

type Props = { count: number };

const CoffeeCounter = (p: WidgetBase<Props>) => {
  'widget';

  return (
    <VStack spacing={8}>
      <Text modifiers={[font({ size: 48 })]}>☕</Text>
      <Text modifiers={[font({ size: 32, weight: 'bold' })]}>{p.count}</Text>
      <Button
        modifiers={[foregroundStyle('white')]}
        label="+"
        target="increment"
        onPress={() => ({ count: p.count + 1 })}
      />
    </VStack>
  );
};

export default createWidget('CoffeeCounter', CoffeeCounter);
```

## How It Works

- The `'widget'` directive at the top of the function body marks it as the widget
- `onPress` returns a partial state update — this will be merged with the current state and re-rendered
- No app launch required