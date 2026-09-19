import test from 'node:test';
import assert from 'node:assert/strict';
import { basinSupports } from './folded-backdrop.js';
import { foldedDecks, foldedLiftDefs } from './folded-layout.js';

test('basin foundations touch their slabs without occupying lower routes or lift shafts', () => {
  const supports = basinSupports(foldedDecks, foldedLiftDefs);
  assert.ok(supports.length > 20);
  for (const p of supports) {
    const slab = foldedDecks.find((d) => d.id === p.deck);
    assert.ok(p.top < slab.y && p.top > slab.y - 1);
    for (const d of foldedDecks) {
      const contains = p.x > d.x - 2 && p.x < d.x + d.w + 2 && p.z > d.z - 2 && p.z < d.z + d.d + 2;
      if (!contains) continue;
      const height = d.y + (d.rise || 0) * Math.max(0, Math.min(1, (p.z - d.z) / d.d));
      assert.ok(height >= p.top || height + 3 <= p.bottom, `${p.deck} pier crosses ${d.id}`);
    }
    for (const l of foldedLiftDefs)
      assert.ok(
        p.x <= l.x - 2 || p.x >= l.x + l.w + 2 || p.z <= l.z - 2 || p.z >= l.z + l.d + 2,
        `Pier crosses ${l.id}`,
      );
  }
});
