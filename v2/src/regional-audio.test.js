import test from 'node:test';
import assert from 'node:assert/strict';
import {FactoryAudio} from './audio.js';
const fixture=()=>{
  const audio=new FactoryAudio(),sounds=[];audio.ctx={};audio.tone=(...args)=>sounds.push(['tone',...args]);audio.noise=(...args)=>sounds.push(['noise',...args]);return {audio,sounds};
};
test('regional machinery respects sound mute and distance, and does not retrigger within a beat',()=>{
  const {audio,sounds}=fixture(),p={x:226,y:-24,z:130,hp:50};
  audio.sfx=false;audio.environment(4,p,'circulation',{},0);assert.equal(sounds.length,0);
  audio.sfx=true;audio.environment(4,{...p,x:1000},'circulation',{},0);assert.equal(sounds.length,0);
  audio.environment(4,p,'circulation',{},0);assert.ok(sounds.length>0);const count=sounds.length;
  audio.environment(4,p,'circulation',{},0);assert.equal(sounds.length,count);
});
test('restored circulation changes the pump sound and the silent array remains silent',()=>{
  const p={x:226,y:-24,z:130,hp:50},broken=fixture(),restored=fixture();
  broken.audio.environment(4,p,'circulation',{},0);restored.audio.environment(4,p,'circulation',{rig:true},0);
  assert.ok(broken.sounds.some(s=>s[0]==='noise'));assert.ok(restored.sounds.some(s=>s[0]==='tone'&&s[1]===58));
  const signal=fixture(),at={x:204,y:40,z:146,hp:50};signal.audio.environment(1,at,'optics',{},0);assert.equal(signal.sounds.length,0);
  signal.audio.environment(10,at,'optics',{signal:true},0);assert.ok(signal.sounds.some(s=>s[1]===660));
});

test('defeating the foundry quiets its reclaim press without muting the whole city',()=>{
 const p={x:-46,y:-8,z:40,hp:50},before=fixture(),after=fixture();
 before.audio.environment(5,p,'foundry',{},0);after.audio.environment(5,p,'foundry',{foundry:true},0);
 assert.ok(before.sounds.some(s=>s[0]==='tone'&&s[1]===48));
 assert.equal(after.sounds.some(s=>s[0]==='tone'&&s[1]===48),false);
});
