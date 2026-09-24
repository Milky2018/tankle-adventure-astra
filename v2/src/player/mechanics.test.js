import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newPlayer, shootHeat, updateHeat, screenMovement, damagePlayer, BASE_SPEED, segmentCircle } from './mechanics.js';

function tick(p,start,duration,boost=false,moving=false){for(let t=start;t<start+duration-1e-8;t+=1/120)updateHeat(p,1/120,t+1/120,boost,moving);}
test('four safe shots, fifth overheats; holding fire cannot bypass the interval',()=>{
 const p=newPlayer();for(let i=0;i<4;i++){assert.equal(shootHeat(p,i*.5),true);assert.equal(shootHeat(p,i*.5+.1),false);assert.equal(p.overheated,false);}assert.equal(p.heat,80);assert.equal(shootHeat(p,2),true);assert.equal(p.overheated,true);assert.equal(shootHeat(p,3),false);
});
test('cooling waits 0.75 seconds and preserves thirty-heat recovery',()=>{
 const p=newPlayer();for(let i=0;i<5;i++)shootHeat(p,i*.5);
 tick(p,2,.74);assert.equal(p.heat,100);assert.equal(p.overheated,true);
 tick(p,2.74,1.3);assert(p.heat>30);assert.equal(p.overheated,true);
 tick(p,4.04,.2);assert(p.heat<=30&&p.heat>0);assert.equal(p.overheated,false);assert.equal(shootHeat(p,4.24),true);
});
test('stationary Overdrive produces neither acceleration nor heat',()=>{
 const p=newPlayer();p.overdrive=true;tick(p,0,2,true,false);assert.equal(p.speed,1);assert.equal(p.heat,0);
});
test('boost release cools independently of speed but shooting retains its delay',()=>{
 const p=newPlayer();p.overdrive=true;
 tick(p,0,.25,true,true);assert(Math.abs(p.speed-1.3)<1e-6);assert(Math.abs(p.heat-3.75)<1e-6);
 tick(p,.25,.25,true,true);assert.equal(p.speed,1.6);assert(Math.abs(p.heat-7.5)<1e-6);
 assert(shootHeat(p,.5));assert(Math.abs(p.heat-27.5)<1e-6);
 tick(p,.5,.1,false,true);assert(p.speed>1&&p.speed<1.6);assert(Math.abs(p.heat-27.5)<1e-6);
 const speed=p.speed;tick(p,.6,.1,true,true);assert(p.speed>speed);
 const heat=p.heat;tick(p,.7,.1,false,true);assert.equal(p.heat,heat);
 tick(p,.8,.46);assert(p.heat<heat);
 assert(shootHeat(p,1.3));const afterShot=p.heat;tick(p,1.3,.74);assert.equal(p.heat,afterShot);
 tick(p,2.04,.1);assert(p.heat<afterShot);
});
test('screen-relative movement is normalized and preserves orthogonal axes',()=>{
 const up=screenMovement(0,-1),right=screenMovement(1,0),diagonal=screenMovement(1,-1);assert(Math.abs(Math.hypot(diagonal.x,diagonal.z)-1)<1e-9);assert(Math.abs(up.x*right.x+up.z*right.z)<1e-9);assert(up.x<0&&up.z<0);assert(right.x>0&&right.z<0);
});
test('opposing belt defeats normal movement and becomes traversable only above equilibrium',()=>{
 assert(BASE_SPEED-BASE_SPEED*1.15<0);assert(BASE_SPEED*1.6-BASE_SPEED*1.15>0);
});
test('direct protection does not block furnace damage or normal movement',()=>{
 const p=newPlayer();assert(damagePlayer(p,8,1));assert(!damagePlayer(p,8,1.3));assert(damagePlayer(p,5,1.3,true));assert.equal(p.hp,12);assert(damagePlayer(p,8,1.7));assert.equal(p.hp,4);
});
test('fast projectile sweeps intersect targets even between frames',()=>{
 assert(segmentCircle(-10,0,10,0,0,0,1));assert(!segmentCircle(-10,2,10,2,0,0,1));assert(segmentCircle(0,0,0,0,0,0,1));
});

test('continuous stationary Mortar fire accumulates heat and enters overheat',()=>{
 const p=newPlayer();let overheats=0,shots=0;
 for(let i=0;i<1200;i++){
  const time=i/60;updateHeat(p,1/60,time,false,false);
  if(shootHeat(p,time,35,1.05)){shots++;if(p.overheated)overheats++;}
 }
 assert.ok(shots>10);assert.ok(overheats>=2);
});

test('releasing Boost immediately cools while Phoenix still coasts at high speed',()=>{
 const p={...newPlayer(),overdrive:true,phoenix:true};
 tick(p,0,2,true,true);const heat=p.heat;
 updateHeat(p,1/60,2+1/60,false,true);
 assert.ok(p.speed>3);assert.ok(Math.abs(p.heat-(heat-50/60))<1e-8);
});
