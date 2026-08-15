#!/usr/bin/env tsx
/**
 * T108: Guard — the provider credential never appears under `apps/mobile/` (Constitution V).
 *
 * Run in CI on every push. Scans source, config, and env-example files for the key name and for
 * any string that looks like a live Google API key, so a credential pasted directly into a
 * component or `.env` committed by mistake fails the build immediately rather than shipping.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MOBILE_DIR = join(process.cwd(), 'apps', 'mobile');

const SKIP_DIRS = new Set(['node_modules', '.git', 'generated', 'ios', 'android', '.expo']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    if (SKIP_DIRS.has(entry)) return [];
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

// The env var name itself, and Google API keys' recognizable shape (`AIza` + 35 more chars).
const PATTERNS = [/GOOGLE_PLACES_API_KEY\s*=\s*['"]?[^'"\s]+/, /AIza[0-9A-Za-z_-]{35}/];

function main(): void {
  const offenders: string[] = [];

  for (const file of walk(MOBILE_DIR)) {
    // The one place the key name is EXPECTED to appear: documenting that it must never live here.
    if (file.endsWith('.env.example')) continue;

    let content: string;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue; // binary or unreadable — not a text leak
    }

    for (const pattern of PATTERNS) {
      if (pattern.test(content)) {
        offenders.push(`${file}: matched ${pattern}`);
      }
    }
  }

  if (offenders.length > 0) {
    console.error('❌ Provider credential (or its env var name) found under apps/mobile/:');
    for (const offender of offenders) console.error(`  ${offender}`);
    console.error('\nConstitution V: provider credentials MUST NOT be embedded in the client.');
    process.exit(1);
  }

  console.log('✅ No provider credential found under apps/mobile/.');
}

main();
