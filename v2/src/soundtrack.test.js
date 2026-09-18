import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {Soundtrack,scoreTrack,loopOffset,REGION_TRACKS,BATTLE_TRACKS} from './soundtrack.js';
const manifest=JSON.parse(await readFile(new URL('../public/music/manifest.json',import.meta.url)));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(fetcher){
 const sources=[];
 const param=()=>({value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}});
 const node=()=>({gain:param(),connect(){},disconnect(){this.disconnected=true;}});
 const ctx={currentTime:0,createGain:node,createBufferSource(){const source={...node(),start(...args){this.started=args;},stop(t){this.stopped=t;}};sources.push(source);return source;},async decodeAudioData(){return {duration:60};}};
 const get=fetcher|| (async url=>({ok:true,json:async()=>manifest,arrayBuffer:async()=>new ArrayBuffer(0)}));
 const music=new Soundtrack(ctx,node(),{fetcher:get});
 const state={area:'r1-foundry',enabled:true,overdrive:true,paused:false,dead:false,combat:false};
 return {music,ctx,sources,state};
}
test('every regional and boss route has a shipped score and exact aligned loop metadata',async()=>{
 assert.equal(manifest.tracks.length,11);
 const ids=new Set(manifest.tracks.map(t=>t.id));
 for(const id of [...Object.values(REGION_TRACKS),...Object.values(BATTLE_TRACKS),'morning-without-us'])assert.ok(ids.has(id),id);
 for(const track of manifest.tracks){
  assert.ok(track.peakDbfs< -2);
  assert.ok(track.duration>=90&&track.duration<=180,`${track.id}: ${track.duration}`);
  for(const file of [...Object.values(track.assets),track.preview])assert.ok((await stat(new URL(`../public/music/${file}`,import.meta.url))).size>1000);
  if(track.kind==='ending'){assert.equal(track.loopStart,null);continue;}
  assert.equal(Math.round(track.loopStart*track.sampleRate),track.loopStartFrame);
  assert.equal(Math.round(track.loopEnd*track.sampleRate),track.loopEndFrameExclusive);
  assert.ok(Math.abs(loopOffset(track,track.loopEnd)-track.loopStart)<1e-9);
  assert.ok(Math.abs(loopOffset(track,track.loopEnd+3*(track.loopEnd-track.loopStart)+.25)-track.loopStart-.25)<1e-7);
 }
});
test('boss and ending cues override geography',()=>{
 assert.equal(scoreTrack({area:'r3-garden'}),'water-remembers');
 assert.equal(scoreTrack({area:'r4-optics',boss:'guardian'}),'mirror-hunt');
 assert.equal(scoreTrack({area:'r7-furnace',boss:'keeper',endingTime:1}),'morning-without-us');
});
test('stems share a start time and loop; pause stops every voice and resumes at its musical position',async()=>{
 const {music,ctx,sources,state}=fixture();music.update(state);await tick();
 assert.equal(sources.length,3);assert.equal(new Set(sources.map(s=>s.started[0])).size,1);
 const track=manifest.tracks.find(t=>t.id==='clockwork-crypt');
 for(const s of sources){assert.equal(s.loop,true);assert.equal(s.loopStart,track.loopStart);assert.equal(s.loopEnd,track.loopEnd);}
 ctx.currentTime=track.loopEnd+2.025;music.update({...state,paused:true});assert.ok(sources.every(s=>s.stopped!=null));
 ctx.currentTime+=8;music.update(state);assert.equal(sources.length,6);
 for(const s of sources.slice(3))assert.ok(Math.abs(s.started[1]-track.loopStart-2)<1e-8);
 music.dispose();
});
test('a transient regional boundary does not restart music; combat recovery does not flap with warnings',async()=>{
 const {music,ctx,sources,state}=fixture();music.update(state);await tick();
 ctx.currentTime=1;music.update({...state,area:'r2-transit'});await tick();assert.equal(sources.length,3);
 ctx.currentTime=1.2;music.update({...state,combat:true});const pulse=music.current.gains.pulse;
 assert.equal(pulse.gain.value,1);ctx.currentTime=3;music.update(state);assert.equal(pulse.gain.value,1);
 ctx.currentTime=8;music.update(state);assert.equal(pulse.gain.value,.7);
 ctx.currentTime=9;music.update({...state,area:'r2-transit'});ctx.currentTime=11.1;music.update({...state,area:'r2-transit'});await tick();assert.equal(sources.length,6);
 music.dispose();
});
test('mute while downloading prevents a late load from starting audio',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);
 const {music,sources,state}=fixture(async url=>({ok:true,json:async()=>manifest,arrayBuffer:async()=>{await gate;return new ArrayBuffer(0);}}));
 music.update(state);await tick();music.update({...state,enabled:false});release();await tick();assert.equal(sources.length,0);
 music.update(state);await tick();assert.equal(sources.length,3);music.dispose();
});
test('skipping the finale seeks its final chord and the ending source never loops',async()=>{
 const {music,ctx,sources,state}=fixture();music.update({...state,endingTime:.001});await tick();
 assert.equal(sources.length,1);assert.equal(sources[0].loop,false);
 ctx.currentTime=2;music.update({...state,endingTime:26});assert.equal(sources.length,2);assert.equal(sources[1].started[1],26);music.dispose();
});

test('fetch retains the browser global receiver semantics',async()=>{
 const {music,sources,state}=fixture(async function(url){assert.equal(this,undefined);return {ok:true,json:async()=>manifest,arrayBuffer:async()=>new ArrayBuffer(0)};});
 music.update(state);await tick();assert.equal(sources.length,3);music.dispose();
});

test('the revised suite has eleven musical identities and one organ arrangement',()=>{
 assert.equal(new Set(manifest.tracks.map(t=>t.genre)).size,11);
 assert.deepEqual(manifest.tracks.filter(t=>t.instruments.includes('organ')).map(t=>t.id),['clockwork-crypt']);
 for(const track of manifest.tracks){
  assert.ok(track.sections.length>=3,track.id);
  if(track.kind!=='ending')assert.ok(track.loopEnd-track.loopStart>=90,track.id);
 }
 const ending=manifest.tracks.find(t=>t.kind==='ending');
 assert.equal(ending.cues.at(-1).time,ending.duration);
 assert.ok(ending.cues.some(c=>c.time===26&&c.name==='Title'));
});
