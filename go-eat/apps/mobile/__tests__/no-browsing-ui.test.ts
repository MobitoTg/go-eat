import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * T091/T091a: No list, search, map, or discovery component exists under `apps/mobile/app/`
 * (FR-028, Principle I), and Go-Eat builds no restaurant detail view, photo gallery, review view,
 * or directions/navigation URL anywhere in `apps/mobile/` — the tap-through hands off to the maps
 * service and must never be reimplemented (FR-024).
 */

const APP_DIR = join(__dirname, '..', 'app');
const SRC_DIR = join(__dirname, '..', 'src');
const WIDGETS_DIR = join(__dirname, '..', 'widgets');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function tsFiles(dir: string): string[] {
  return walk(dir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
}

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('no browsing, list, search, or discovery UI (FR-028, Principle I)', () => {
  it('the entire app/ route tree is exactly onboarding, permission, preferences, and index', () => {
    const routeFiles = walk(APP_DIR)
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => f.slice(APP_DIR.length + 1).replace(/\\/g, '/'));

    const allowed = new Set([
      '_layout.tsx',
      'index.tsx',
      'permission.tsx',
      'onboarding/index.tsx',
      'onboarding/permission.tsx',
      'onboarding/preferences.tsx',
      'onboarding/widget-install.tsx',
      'preferences/index.tsx',
    ]);

    for (const file of routeFiles) {
      expect(allowed.has(file)).toBe(true);
    }
    // And nothing allowed is missing, so this test fails loudly if a route is renamed rather than
    // silently passing on an empty tree.
    expect(routeFiles.length).toBe(allowed.size);
  });

  it('no source file under app/ or src/ names a list, search, map, or discovery component', () => {
    const forbidden = /\b(RestaurantList|SearchBar|SearchField|MapView|MapBrowser|DiscoverScreen|BrowseScreen|ResultsList)\b/;
    const offenders: string[] = [];

    for (const file of [...tsFiles(APP_DIR), ...tsFiles(SRC_DIR)]) {
      if (forbidden.test(stripComments(readFileSync(file, 'utf8')))) offenders.push(file);
    }

    expect(offenders).toEqual([]);
  });

  it('no route under app/ is named list, search, browse, discover, or results', () => {
    const forbiddenPath = /\b(list|search|browse|discover|results)\b/i;
    const offenders = walk(APP_DIR).filter((f) => forbiddenPath.test(f.slice(APP_DIR.length)));
    expect(offenders).toEqual([]);
  });
});

describe('no restaurant detail view, photo gallery, review view, or navigation URL (FR-024)', () => {
  it('no source file constructs a directions/navigation URL of its own', () => {
    // The ONLY place a maps URL is built is services/suggestion-api/src/links/google-maps.ts — the
    // client never constructs one; it only opens the `listingUrl`/`fallbackUrl` it was given.
    const forbidden = /google\.com\/maps\/dir|maps:\/\/\?daddr|comgooglemaps:\/\/\?daddr/;
    const offenders: string[] = [];

    for (const file of [...tsFiles(APP_DIR), ...tsFiles(SRC_DIR), ...tsFiles(WIDGETS_DIR)]) {
      if (forbidden.test(stripComments(readFileSync(file, 'utf8')))) offenders.push(file);
    }

    expect(offenders).toEqual([]);
  });

  it('no component under app/, src/, or widgets/ names a detail, gallery, or review view', () => {
    const forbidden = /\b(RestaurantDetail|PhotoGallery|ReviewView|ReviewList|DirectionsView|NavigationView)\b/;
    const offenders: string[] = [];

    for (const file of [...tsFiles(APP_DIR), ...tsFiles(SRC_DIR), ...tsFiles(WIDGETS_DIR)]) {
      if (forbidden.test(stripComments(readFileSync(file, 'utf8')))) offenders.push(file);
    }

    expect(offenders).toEqual([]);
  });
});
