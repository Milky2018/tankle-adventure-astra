import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Soundtrack, scoreTrack, loopOffset, EXPLORATION_TRACKS, BATTLE_TRACKS } from './soundtrack.js';
const manifest = JSON.parse(await readFile(new URL('../../public/music/manifest.json', import.meta.url)));
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
test('exactly nine imported recordings retain source hashes and native loop metadata', async () => {
  assert.equal(manifest.tracks.length, 9);
  assert.equal(manifest.tracks.filter(t => t.kind === 'exploration').length, 4);
  const ids = new Set(manifest.tracks.map(t => t.id));
  for (const id of [...Object.values(EXPLORATION_TRACKS), ...Object.values(BATTLE_TRACKS)]) assert.ok(ids.has(id), id);
  for (const track of manifest.tracks) {
    assert.equal(track.artist, 'KADOKAWA');
    assert.equal(track.album, 'RPG Maker MZ');
    assert.ok(track.peakDbfs <= -3);
    assert.ok(Math.abs(track.gain - 10 ** (track.gainDb / 20)) < 1e-7);
    assert.ok(track.duration > 0);
    for (const [file, hash] of [[track.original, track.sourceSha256], [track.assets.mix, track.playbackSha256]]) {
      const path = new URL(`../../public/music/${file}`, import.meta.url);
      assert.ok((await stat(path)).size > 1000);
      assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'), hash);
    }
    assert.equal(Math.round(track.loopStart * track.sampleRate), track.loopStartFrame);
    assert.equal(Math.round(track.loopEnd * track.sampleRate), track.loopEndFrameExclusive);
    assert.ok(track.loopEndFrameExclusive <= track.frames);
    assert.ok(track.loopEnd > track.loopStart);
    assert.ok(Math.abs(loopOffset(track, track.loopEnd) - track.loopStart) < 1e-9);
    assert.ok(Math.abs(loopOffset(track, track.loopEnd + 3 * (track.loopEnd - track.loopStart) + .25) - track.loopStart - .25) < 1e-7);
  }
});
test('the shipped soundtrack stays compressed without obsolete lossless duplicates', async () => {
  const root=new URL('../../public/music/mz/',import.meta.url);
  const files=await readdir(root);
  assert.ok(files.every(file=>/\.(ogg|webm)$/.test(file)));
  let bytes=0;for(const file of files)bytes+=(await stat(new URL(file,root))).size;
  assert.ok(bytes<20_000_000,`Music payload grew to ${bytes} bytes`);
});
const stages = [
  [{}, 'mz-castle3'],
  [{overdrive:true}, 'mz-scene5'],
  [{overdrive:true,phoenix:true}, 'mz-scene7'],
  [{overdrive:true,phoenix:true,circulation:true}, 'mz-dungeon1'],
];
test('permanent ability milestones select exploration everywhere and each Boss has its own cue', () => {
  const expected={prototype:'mz-battle1',foundry:'mz-battle3',sorter:'mz-battle4',guardian:'mz-battle6',keeper:'mz-battle8'};
  assert.deepEqual(BATTLE_TRACKS,expected);
  assert.equal(new Set(Object.values(BATTLE_TRACKS)).size,5);
  for (const area of ['r1-foundry', 'r2-transit', 'r3-garden', 'r4-optics', 'r5-testworks', 'r6-circulation', 'r7-furnace']) {
    for(const [abilities,id]of stages){
      assert.equal(scoreTrack({area,...abilities}),id);
      for(const [boss,track]of Object.entries(expected)) assert.equal(scoreTrack({area,...abilities,boss}),track);
    }
  }
  assert.equal(scoreTrack({phoenix:true}), 'mz-scene7');
  assert.equal(scoreTrack({circulation:true}), 'mz-dungeon1');
  assert.equal(scoreTrack({ boss: 'keeper', endingTime: 1 }), 'mz-dungeon1');
});
test('pause stops the recording and resumes at its native loop position', async () => {
  const { music, ctx, sources, state } = fixture(); music.update(state); await tick();
  assert.equal(sources.length, 1);
  const track = manifest.tracks.find(t => t.id === 'mz-castle3');
  assert.equal(sources[0].loop, true); assert.equal(sources[0].loopStart, track.loopStart); assert.equal(sources[0].loopEnd, track.loopEnd);
  assert.equal(music.current.gains.mix.gain.value,track.gain);
  ctx.currentTime = track.loopEnd + 2.025; music.update({ ...state, paused: true }); assert.ok(sources.every(s => s.stopped != null));
  ctx.currentTime += 8; music.update(state); assert.equal(sources.length, 2);
  assert.ok(Math.abs(sources[1].started[1] - track.loopStart - 2) < 1e-8); music.dispose();
});
test('ordinary fights and backtracking never restart a cue; each acquisition changes it once', async () => {
  const { music, ctx, sources, state } = fixture();
  for(const [abilities,id]of stages){
    const count=sources.length;
    music.update({...state,...abilities});await tick();
    assert.equal(music.current.track.id,id);assert.equal(sources.length,count+1);
    for(let i=0;i<4;i++){ctx.currentTime++;music.update({...state,...abilities,area:'r1-foundry',combat:i%2===0,speed:i+1});await tick();}
    assert.equal(sources.length,count+1);
  }
  music.dispose();
});
test('each Boss overrides every acquisition stage and victory restores its main cue', async () => {
  for(const [abilities,id]of stages){
    const {music,sources,state}=fixture();
    for(const [boss,track]of Object.entries(BATTLE_TRACKS)){
      const count=sources.length;
      music.update({...state,...abilities,boss});await tick();
      assert.equal(music.current.track.id,track);assert.equal(sources.length,count+1);
      music.update({...state,...abilities});await tick();
      assert.equal(music.current.track.id,id);
    }
    music.dispose();
  }
});
test('mute while downloading prevents a late load from starting audio', async () => {
  let release; const gate = new Promise(resolve => release = resolve);
  const { music, sources, state } = fixture(async () => ({ ok: true, json: async () => manifest, arrayBuffer: async () => { await gate; return new ArrayBuffer(0); } }));
  music.update(state); await tick(); music.update({ ...state, enabled: false }); release(); await tick(); assert.equal(sources.length, 0);
  music.update(state); await tick(); assert.equal(sources.length, 1); music.dispose();
});
test('the ending reuses the final exploration cue without seeking or adding a recording', async () => {
  const { music, sources, state } = fixture(); music.update({ ...state, circulation: true, quiet: true }); await tick();
  assert.equal(music.output.gain.value, 0);
  music.update({ ...state, circulation: true, quiet: true, endingTime: .001 }); await tick();
  music.update({ ...state, circulation: true, quiet: true, endingTime: 26 }); await tick();
  assert.equal(music.output.gain.value, 1); assert.equal(sources.length, 1); assert.equal(sources[0].loop, true); music.dispose();
});
test('fetch retains browser global receiver semantics', async () => {
  const { music, sources, state } = fixture(async function () { assert.equal(this, undefined); return { ok: true, json: async () => manifest, arrayBuffer: async () => new ArrayBuffer(0) }; });
  music.update(state); await tick(); assert.equal(sources.length, 1); music.dispose();
});
test('death discards the Boss cue and restarts the correct progression cue after respawn', async () => {
  for (const [abilities,id] of stages) {
    const { music, ctx, state } = fixture();
    music.update({ ...state, ...abilities, boss: 'keeper' }); await tick();
    ctx.currentTime = .5; music.update({ ...state, ...abilities, dead: true }); assert.equal(music.current, null);
    ctx.currentTime = 1; music.update({ ...state, ...abilities, area: 'r2-transit' }); await tick();
    assert.equal(music.current.track.id, id); assert.equal(music.current.offset, 0); music.dispose();
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
  music.update({ ...state, phoenix: true }); await tick(); assert.equal(music.current.track.id, 'mz-scene7'); music.dispose();
});
