#!/usr/bin/env tsx
/**
 * T073: `npm run fixtures:report` — the constitution's scoring regression gate, made executable.
 *
 * "Any change touching scoring, weights, or candidate assembly must report its effect on that
 * sample." (Development Workflow & Quality Gates). Prints the ranked top-5 for each fixture
 * location so a before/after diff is a `git diff` on this output, not a manual re-derivation.
 */

import { orderCandidates } from '../src/index.js';
import { FIXTURE_LOCATIONS, FIXTURE_WEIGHTS, NO_PREFERENCES } from '../__tests__/fixtures/index.js';

const SEED = 'fixtures-report';

for (const { name, anchor, candidates } of FIXTURE_LOCATIONS) {
  const { ordered, state } = orderCandidates({
    candidates,
    anchor,
    weights: FIXTURE_WEIGHTS,
    user: NO_PREFERENCES,
    seed: SEED,
  });

  console.log(`\n=== ${name} (state: ${state}) ===`);
  ordered.slice(0, 5).forEach((scored, rank) => {
    const { candidate, score, components, distanceMeters } = scored;
    console.log(
      `${rank + 1}. ${candidate.name.padEnd(20)} score=${score.toFixed(3)} ` +
        `rating=${components.rating.toFixed(2)} confidence=${components.confidence.toFixed(2)} ` +
        `healthLean=${components.healthLean.toFixed(2)} distance=${components.distance.toFixed(2)} ` +
        `(${Math.round(distanceMeters)}m)`,
    );
  });
}

console.log('\nWeights used:');
console.log(JSON.stringify(FIXTURE_WEIGHTS, null, 2));
