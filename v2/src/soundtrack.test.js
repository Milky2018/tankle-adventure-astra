import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Soundtrack, scoreTrack, loopOffset, EXPLORATION_TRACKS, BATTLE_TRACKS } from './soundtrack.js';
const manifest = JSON.parse(await readFile(new URL('../public/music/manifest.json', import.meta.url)));
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(fetcher) {
  const sources = [];
  const param = () => ({ value: 0, setTargetAtTime(v) { this.value = v; }, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; }, cancelScheduledValues() {} });
  const node = () => ({ gain: param(), connect() {}, disconnect() { this.disconnected = true; } });
  const ctx = { currentTime: 0, createGain: node, createBufferSource() { const source = { ...node(), start(...args) { this.started = args; }, stop(t) { this.stopped = t; } }; sources.push(source); return source; }, async decodeAudioData() { return { duration: 180 }; } };
  const get = fetcher || (async () => ({ ok: true, json: async () => manifest, arrayBuffer: async () => new ArrayBuffer(0) }));
  const music = new Soundtrack(ctx, node(), { fetcher: get });
  const state = { area: 'r1-foundry', enabled: true, phoenix: false, paused: false, dead: false, combat: false };
  return { music, ctx, sources, state };
}
test('exactly four imported recordings retain source hashes and native loop metadata', async () => {
  assert.equal(manifest.tracks.length, 4);
  assert.equal(manifest.tracks.filter(t => t.kind === 'exploration').length, 2);
  const ids = new Set(manifest.tracks.map(t => t.id));
  for (const id of [...Object.values(EXPLORATION_TRACKS), ...Object.values(BATTLE_TRACKS)]) assert.ok(ids.has(id), id);
  for (const track of manifest.tracks) {
    assert.equal(track.artist, 'KADOKAWA');
    assert.equal(track.album, 'RPG Maker MZ');
    assert.ok(track.peakDbfs <= -3);
    assert.ok(track.duration >= 90 && track.duration <= 180);
    for (const [file, hash] of [[track.original, track.sourceSha256], [track.assets.mix, track.playbackSha256]]) {
      const path = new URL(`../public/music/${file}`, import.meta.url);
      assert.ok((await stat(path)).size > 1000);
      assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'), hash);
    }
    assert.equal(Math.round(track.loopStart * track.sampleRate), track.loopStartFrame);
    assert.equal(Math.round(track.loopEnd * track.sampleRate), track.loopEndFrameExclusive);
    assert.ok(track.loopEndFrameExclusive <= track.frames);
    assert.ok(track.loopEnd - track.loopStart >= 90);
    assert.ok(Math.abs(loopOffset(track, track.loopEnd) - track.loopStart) < 1e-9);
    assert.ok(Math.abs(loopOffset(track, track.loopEnd + 3 * (track.loopEnd - track.loopStart) + .25) - track.loopStart - .25) < 1e-7);
  }
});
test('Phoenix ownership selects exploration everywhere; Boss arenas override it', () => {
  for (const area of ['r1-foundry', 'r2-transit', 'r3-garden', 'r4-optics', 'r5-testworks', 'r6-circulation', 'r7-furnace']) {
    assert.equal(scoreTrack({ area }), 'mz-dungeon2');
    assert.equal(scoreTrack({ area, phoenix: true }), 'mz-theme1');
    for (const boss of ['prototype', 'foundry', 'guardian', 'sorter']) assert.equal(scoreTrack({ area, boss, phoenix: true }), 'mz-battle4');
    assert.equal(scoreTrack({ area, boss: 'keeper' }), 'mz-battle8');
  }
  assert.equal(scoreTrack({ boss: 'keeper', endingTime: 1 }), 'mz-theme1');
});
test('pause stops the recording and resumes at its native loop position', async () => {
  const { music, ctx, sources, state } = fixture(); music.update(state); await tick();
  assert.equal(sources.length, 1);
  const track = manifest.tracks.find(t => t.id === 'mz-dungeon2');
  assert.equal(sources[0].loop, true); assert.equal(sources[0].loopStart, track.loopStart); assert.equal(sources[0].loopEnd, track.loopEnd);
  ctx.currentTime = track.loopEnd + 2.025; music.update({ ...state, paused: true }); assert.ok(sources.every(s => s.stopped != null));
  ctx.currentTime += 8; music.update(state); assert.equal(sources.length, 2);
  assert.ok(Math.abs(sources[1].started[1] - track.loopStart - 2) < 1e-8); music.dispose();
});
test('ordinary fights and backtracking never restart a main cue; Phoenix changes it once', async () => {
  const { music, ctx, sources, state } = fixture(); music.update(state); await tick();
  for (let i = 0; i < 4; i++) { ctx.currentTime++; music.update({ ...state, area: 'r2-transit', combat: i % 2 === 0 }); await tick(); }
  assert.equal(sources.length, 1);
  music.update({ ...state, phoenix: true }); await tick();
  assert.equal(music.current.track.id, 'mz-theme1'); assert.equal(sources.length, 2);
  music.update({ ...state, phoenix: true, area: 'r1-foundry' }); await tick(); assert.equal(sources.length, 2); music.dispose();
});
test('Boss victory restores the correct main cue and common Bosses share one recording', async () => {
  for (const phoenix of [false, true]) {
    const { music, sources, state } = fixture();
    music.update({ ...state, phoenix, boss: 'guardian' }); await tick();
    music.update({ ...state, phoenix, boss: 'sorter' }); await tick(); assert.equal(sources.length, 1);
    music.update({ ...state, phoenix }); await tick();
    assert.equal(music.current.track.id, phoenix ? 'mz-theme1' : 'mz-dungeon2'); music.dispose();
  }
});
test('mute while downloading prevents a late load from starting audio', async () => {
  let release; const gate = new Promise(resolve => release = resolve);
  const { music, sources, state } = fixture(async () => ({ ok: true, json: async () => manifest, arrayBuffer: async () => { await gate; return new ArrayBuffer(0); } }));
  music.update(state); await tick(); music.update({ ...state, enabled: false }); release(); await tick(); assert.equal(sources.length, 0);
  music.update(state); await tick(); assert.equal(sources.length, 1); music.dispose();
});
test('the ending reuses the second main cue without seeking or introducing a fifth track', async () => {
  const { music, sources, state } = fixture(); music.update({ ...state, phoenix: true, quiet: true }); await tick();
  assert.equal(music.output.gain.value, 0);
  music.update({ ...state, phoenix: true, quiet: true, endingTime: .001 }); await tick();
  music.update({ ...state, phoenix: true, quiet: true, endingTime: 26 }); await tick();
  assert.equal(music.output.gain.value, 1); assert.equal(sources.length, 1); assert.equal(sources[0].loop, true); music.dispose();
});
test('fetch retains browser global receiver semantics', async () => {
  const { music, sources, state } = fixture(async function () { assert.equal(this, undefined); return { ok: true, json: async () => manifest, arrayBuffer: async () => new ArrayBuffer(0) }; });
  music.update(state); await tick(); assert.equal(sources.length, 1); music.dispose();
});
test('death discards the Boss cue and restarts the correct progression cue after respawn', async () => {
  for (const phoenix of [false, true]) {
    const { music, ctx, state } = fixture();
    music.update({ ...state, phoenix, boss: 'keeper' }); await tick();
    ctx.currentTime = .5; music.update({ ...state, phoenix, dead: true }); assert.equal(music.current, null);
    ctx.currentTime = 1; music.update({ ...state, phoenix, area: 'r2-transit' }); await tick();
    assert.equal(music.current.track.id, phoenix ? 'mz-theme1' : 'mz-dungeon2'); assert.equal(music.current.offset, 0); music.dispose();
  }
});
test('death while paused cannot resume the saved musical position', async () => {
  const { music, ctx, state } = fixture(); music.update(state); await tick();
  ctx.currentTime = 12; music.update({ ...state, paused: true }); assert.ok(music.saved);
  music.update({ ...state, paused: true, dead: true }); assert.equal(music.saved, null);
  ctx.currentTime = 13; music.update(state); await tick(); assert.equal(music.current.offset, 0); music.dispose();
});
test('an unfinished Boss download stays silent after death', async () => {
  let release; const gate = new Promise(resolve => release = resolve);
  const { music, sources, state } = fixture(async () => ({ ok: true, json: async () => manifest, arrayBuffer: async () => { await gate; return new ArrayBuffer(0); } }));
  music.update({ ...state, boss: 'guardian' }); await tick(); music.update({ ...state, dead: true }); release(); await tick();
  assert.equal(music.current, null); assert.equal(sources.length, 0);
  music.update({ ...state, phoenix: true }); await tick(); assert.equal(music.current.track.id, 'mz-theme1'); music.dispose();
});
