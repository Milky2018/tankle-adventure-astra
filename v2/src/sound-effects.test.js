import test from 'node:test';
import assert from 'node:assert/strict';
import { FactoryAudio } from './audio.js';
import { spatialSound } from './sound-effects.js';

test('combat sound follows camera rotation and distinguishes distance and floor height', () => {
  const listener = { x: 0, y: 0, z: 0, yaw: 0 };
  const left = spatialSound({ x: 12, y: 0, z: 0 }, listener);
  const right = spatialSound({ x: -12, y: 0, z: 0 }, listener);
  assert.ok(left.pan < 0 && right.pan > 0);
  assert.equal(left.gain, right.gain);
  assert.ok(spatialSound({ x: 12, y: 0, z: 0 }, { ...listener, yaw: Math.PI }).pan > 0);
  const far = spatialSound({ x: 60, y: 0, z: 0 }, listener);
  assert.ok(far.gain < left.gain && far.cutoff < left.cutoff);
  assert.ok(spatialSound({ x: 12, y: 40, z: 0 }, listener).gain < left.gain);
  assert.equal(spatialSound({ x: 111, y: 0, z: 0 }, listener).gain, 0);
  assert.equal(spatialSound(listener, listener).gain, 1);
});

test('event dispatch keeps player effects centered, positions enemy effects and respects mute', () => {
  const audio = new FactoryAudio(),
    events = [];
  audio.ctx = { currentTime: 10 };
  audio.effects = { play: (...args) => events.push(args) };
  // Listener state updates even while machinery sound is muted.
  audio.sfx = false;
  audio.environment(0, { x: 0, y: 0, z: 0 }, '', {}, 0);
  audio.event('shot');
  assert.equal(events.length, 0);
  audio.sfx = true;
  audio.event('shot');
  audio.event('rail-shot', { position: { x: 25, y: 0, z: 0 } });
  audio.event('warn', 0.4);
  assert.deepEqual(events[0], ['shot', { pan: 0 }]);
  assert.ok(events[1][1].pan < 0 && events[1][1].gain < 1);
  assert.deepEqual(events[2], ['warn', { pan: 0.4 }]);
  assert.equal(audio.duckUntil, 11.2);
  audio.event('warn', { position: { x: 60, y: 0, z: 0 } });
  assert.equal(events.at(-1)[1].gain, 0.6);
  assert.ok(events.at(-1)[1].pan < 0);
});

test('pause, death and SFX mute silence drive without stopping regional music selection', () => {
  const audio = new FactoryAudio(),
    enabled = [],
    drive = [],
    music = [];
  audio.ctx = { currentTime: 1 };
  audio.master = { gain: { setTargetAtTime() {} } };
  audio.effects = { setEnabled: (value) => enabled.push(value) };
  audio.drive = { update: (...args) => drive.push(args) };
  audio.score = { update: (value) => music.push(value) };
  const p = { hp: 50, speed: 1, heat: 0 };
  audio.update(1, p, false, 'r1-foundry', false, true);
  assert.ok(drive.at(-1)[2] > 0);
  audio.update(1, p, false, 'r1-foundry', true, true);
  assert.equal(enabled.at(-1), false);
  assert.equal(drive.at(-1)[2], 0);
  audio.update(1, { ...p, hp: 0 }, false, 'r1-foundry', false, true);
  assert.equal(drive.at(-1)[2], 0);
  assert.equal(enabled.at(-1), true); // Wreck/machinery still audible.
  assert.equal(music.at(-1).dead, true);
  audio.sfx = false;
  audio.update(1, p, false, 'r1-foundry', false, true);
  assert.equal(enabled.at(-1), false);
  assert.equal(music.at(-1).enabled, true);
});
