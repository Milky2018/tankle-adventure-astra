import test from 'node:test';
import assert from 'node:assert/strict';
import { explorationPickups, explorationEnemies, explorationSolids } from './folded-exploration-layout.js';
import { applyUpgrades, weaponDamage, UPGRADE_IDS } from './folded-upgrades.js';
import { newPlayer, playerMaxHp, updateHeat, BASE_SPEED, OVERDRIVE_MAX_SPEED, PHOENIX_MAX_SPEED } from './mechanics.js';
import { initialFoldedState, foldedSolids, foldedBlocked, foldedSupport, moveFolded } from './folded-layout.js';

test('optional equipment survives saving without compounding and leaves the original heat delay intact', () => {
  const p = newPlayer();
  const state = initialFoldedState(Object.fromEntries(UPGRADE_IDS.map(id => [id, true])));
  applyUpgrades(p, initialFoldedState(JSON.parse(JSON.stringify(state))));
  applyUpgrades(p, state);
  assert.equal(playerMaxHp(p), 75);
  assert.equal(weaponDamage(p, 'cannon', 1), 1.5);
  assert.equal(weaponDamage(p, 'mortar', 3), 4.5);
  assert.equal(weaponDamage(p, 'laser', 4.5), 6.75);
  p.heat = 100; p.lastHeat = 0;
  updateHeat(p, .1, .74, false, false); assert.equal(p.heat, 100);
  updateHeat(p, .1, .75, false, false); assert.equal(p.heat, 93.75);
  const plain = newPlayer(); plain.heat = 100; plain.lastHeat = 0;
  updateHeat(plain, .1, .75, false, false); assert.equal(plain.heat, 95);
  assert.equal(BASE_SPEED, 9.8); assert.equal(OVERDRIVE_MAX_SPEED, 1.6); assert.equal(PHOENIX_MAX_SPEED, 3.2);
  assert.equal(playerMaxHp(plain), 50);
});

test('finds, defenders and added machinery stand on supported, unblocked surfaces', () => {
  const state = initialFoldedState();
  assert.equal(explorationPickups.filter(p => p.upgrade === 'armor').length, 5);
  assert.equal(explorationPickups.length, 9);
  for (const p of [...explorationPickups, ...explorationEnemies]) {
    assert.ok(foldedSupport(p.x, p.z, p.y), p.id);
    if(p.requires) state[p.requires]=true;
    assert.equal(foldedBlocked(p.x, p.y, p.z, state), undefined, p.id);
  }
  for (const s of explorationSolids) for (const [x,z] of [[s.x+.1,s.z+.1],[s.x+s.w-.1,s.z+s.d-.1]])
    assert.ok(foldedSupport(x,z,s.ground??s.y),s.id);
});

const paths = {
  'armor-foundry': {start:[-56,-16,114],points:[[-67,114]]},
  'cannon-coil': {start:[-136,8,-54],points:[[-162,-54],[-162,-66],[-180,-66],[-190,-76],[-190,-92],[-187,-92]]},
  'armor-reservoir': {start:[-164,-8,88],points:[[-154,92],[-145,92]],deployed:true},
  'cooling-filter': {start:[-104,-8,114],points:[[-104,98],[-122,98],[-122,90],[-123,84]]},
  'armor-proving': {start:[188,16,-124],points:[[240,-124]]},
  'mortar-charge': {start:[112,16,-176],points:[[106,-176],[106,-146],[161,-146],[161,-134],[165,-134]]},
  'armor-lens': {start:[271,24,-88],points:[[275,-88],[275,-94],[269,-94]]},
  'laser-focus': {start:[350,-24,186],points:[[350,193],[348,193]]},
  'armor-hearth': {start:[146,-40,6],points:[[155,6],[155,-8],[150,-8]]},
};
for (const q of explorationPickups) test(`${q.id} can be approached and left through a physical detour`, () => {
  const route = paths[q.id], state = initialFoldedState();
  for (const wall of foldedSolids) if (!wall.permanent) state[wall.id] = true;
  const p = {x:route.start[0],y:route.start[1],z:route.start[2],speed:1,deployed:!!route.deployed};
  function walk(x,z) {
    for(let i=0;i<3000&&Math.hypot(p.x-x,p.z-z)>.1;i++){
      const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);
      moveFolded(p,dx/d*.1,dz/d*.1,state);
    }
    assert.ok(Math.hypot(p.x-x,p.z-z)<.15,`${q.id}: ${p.x},${p.y},${p.z} -> ${x},${z}`);
  }
  for(const [x,z] of route.points)walk(x,z);
  assert.ok(Math.abs(p.y-q.y)<.1);
  for(const [x,z] of [...route.points.slice(0,-1)].reverse())walk(x,z);
  walk(route.start[0],route.start[2]);
});

test('the upper return sniper cannot cover the lower waiting landing from its entire pursuit envelope', () => {
  const sniper=explorationEnemies.find(e=>e.id==='freight-watch');
  const nearest=Math.hypot(sniper.x-52,sniper.y+8,sniper.z+79)-33;
  assert.ok(nearest>86,'A concealed upper sniper can fire into the lift waiting area');
});


test('previously collected reinforcements keep their new cabinets open after loading', () => {
  for(const q of explorationPickups.filter(q=>q.requires)) {
    const state=initialFoldedState({[q.id]:true});
    assert.equal(state[q.requires],true,q.id);
    assert.equal(foldedBlocked(q.x,q.y,q.z,state),undefined,q.id);
  }
});


test('optional cabinets leave the main separator corner clear at off-centre wheel positions', () => {
  for(const x of [359.7,360,360.3]) {
    const state=initialFoldedState(),p={x,y:-24,z:186,speed:1,deployed:false};
    for(let i=0;i<260;i++)moveFolded(p,0,-.1,state);
    assert.ok(p.z<160.1,`blocked through lane at ${p.x},${p.z}`);
    assert.equal(state['laser-cache'],false);
  }
});


test('the separator corner also admits the horizontal approach before the turn', () => {
  for(const z of [185.7,186,186.3]) {
    const state=initialFoldedState(),p={x:340,y:-24,z,speed:1,deployed:false};
    for(let i=0;i<200;i++)moveFolded(p,.1,0,state);
    assert.ok(p.x>359.9,`blocked horizontal approach at ${p.x},${p.z}`);
    for(let i=0;i<260;i++)moveFolded(p,0,-.1,state);
    assert.ok(p.z<160.5,`blocked turn at ${p.x},${p.z}`);
  }
});

test('optional mechanisms and their circuit origins are grounded on their actual floor', async () => {
  const {explorationControls}=await import('./folded-exploration-layout.js');
  for(const c of explorationControls) {
    const ground=c.ground??c.y-1.3;
    const floor=foldedSupport(c.x,c.z,ground);
    assert.ok(floor,`Floating mechanism base: ${c.id}`);
    assert.ok(Math.abs(floor.height-ground)<.01,c.id);
  }
});
