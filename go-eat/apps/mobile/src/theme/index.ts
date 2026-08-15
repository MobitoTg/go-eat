import { useColorScheme } from 'react-native';
import { colorTokens, type ColorTokens, type ThemeName } from '@go-eat/design-tokens/tokens';

/**
 * T092a: Wires the semantic token export (T013k) into the app screens.
 *
 * FR-034 covers the app as well as the widget — onboarding and preferences are held to the same
 * "no raw color, semantic tokens only" bar. The RN screens style in JS and cannot read the native
 * Asset Catalog / colors.xml the widgets consume, so they resolve theme from the OS directly
 * (`useColorScheme`) against the same `packages/design-tokens/src/semantics.ts` map instead.
 */
export function useTheme(): ColorTokens {
  const scheme = useColorScheme();
  const theme: ThemeName = scheme === 'dark' ? 'dark' : 'light';
  return colorTokens[theme];
}
