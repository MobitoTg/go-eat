import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOKEN_NAMES, THEMES } from '../src/semantics.js';
import { generateAndroidColors, remoteViewsApplication } from './android-colors.js';
import { assertGeneratable, generateIosAssetCatalog } from './ios-asset-catalog.js';

/**
 * `npm run tokens:generate`.
 *
 * Regenerates both platforms' color assets from the one semantic map. This is the mechanism that
 * keeps the R2 duplication tax off the palette: the two widgets duplicate layout, never values.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const IOS_OUT = join(REPO_ROOT, 'apps', 'mobile', 'generated', 'ios', 'Colors.xcassets');
const ANDROID_OUT = join(REPO_ROOT, 'apps', 'mobile', 'generated', 'android', 'res');

function main(): void {
  assertGeneratable();

  // Fail before writing anything if a token could not actually be applied on Android. Catching it
  // here beats shipping a widget that silently renders the wrong colour on device.
  for (const token of TOKEN_NAMES) {
    remoteViewsApplication(THEMES.light[token]!.role);
  }

  const ios = generateIosAssetCatalog(IOS_OUT);
  const android = generateAndroidColors(ANDROID_OUT);

  console.log(`tokens:generate — ${TOKEN_NAMES.length} semantic tokens, both themes`);
  console.log(`  iOS      ${ios.length} Color Sets → ${IOS_OUT}`);
  console.log(`  Android  ${android.length} files    → ${ANDROID_OUT}`);
  console.log('\nThese are build artifacts. Never hand-edit them (Constitution VI.1).');
}

main();
