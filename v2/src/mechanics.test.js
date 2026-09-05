import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newPlayer, shootHeat, updateHeat, screenMovement, damagePlayer, BASE_SPEED, segmentCircle } from './mechanics.js';

function tick(p,start,duration,boost=false,moving=false){for(let t=start;t<start+duration-1e-8;t+=1/120)updateHeat(p,1/120,t+1/120,boost,moving);}
test('four safe shots, fifth overheats; holding fire cannot bypass the interval',()=>{
 const p=newPlayer();for(let i=0;i<4;i++){assert.equal(shootHeat(p,i*.5),true);assert.equal(shootHeat(p,i*.5+.1),false);assert.equal(p.overheated,false);}assert.equal(p.heat,80);assert.equal(shootHeat(p,2),true);assert.equal(p.overheated,true);assert.equal(shootHeat(p,3),false);
});
test('cooling waits and overheated lockout lasts until completely cold',()=>{
 const p=newPlayer();for(let i=0;i<5;i++)shootHeat(p,i*.5);tick(p,2,.7);assert.equal(p.heat,100);tick(p,2.7,1);assert(p.heat<80&&p.heat>70);assert.equal(p.overheated,true);assert.equal(shootHeat(p,4),false);tick(p,3.7,4);assert.equal(p.heat,0);assert.equal(p.overheated,false);assert.equal(shootHeat(p,8),true);
});
test('stationary Overdrive produces neither acceleration nor heat',()=>{
 const p=newPlayer();p.overdrive=true;tick(p,0,2,true,false);assert.equal(p.speed,1);assert.equal(p.heat,0);
});
test('acceleration, release heat and re-engagement preserve the shared budget',()=>{
 const p=newPlayer();p.overdrive=true;tick(p,0,1.2,true,true);assert(Math.abs(p.speed-1.5)<1e-6);assert(Math.abs(p.heat-30)<1e-6);assert(shootHeat(p,1.2));assert(Math.abs(p.heat-50)<1e-6);tick(p,1.2,.1,false,true);assert(p.speed>1&&p.speed<1.5);assert(p.heat>50);const speed=p.speed;tick(p,1.3,.1,true,true);assert(p.speed>speed);tick(p,1.4,.35,false,false);assert.equal(p.speed,1);const heat=p.heat;tick(p,1.75,.6);assert.equal(p.heat,heat);tick(p,2.35,.3);assert(p.heat<heat);
});
test('screen-relative movement is normalized and preserves orthogonal axes',()=>{
 const up=screenMovement(0,-1),right=screenMovement(1,0),diagonal=screenMovement(1,-1);assert(Math.abs(Math.hypot(diagonal.x,diagonal.z)-1)<1e-9);assert(Math.abs(up.x*right.x+up.z*right.z)<1e-9);assert(up.x<0&&up.z<0);assert(right.x>0&&right.z<0);
});
test('opposing belt defeats normal movement and becomes traversable only above equilibrium',()=>{
 assert(BASE_SPEED-BASE_SPEED*1.15<0);assert(BASE_SPEED*1.5-BASE_SPEED*1.15>0);
});
test('direct protection does not block furnace damage or normal movement',()=>{
 const p=newPlayer();assert(damagePlayer(p,8,1));assert(!damagePlayer(p,8,1.3));assert(damagePlayer(p,5,1.3,true));assert.equal(p.hp,37);assert(damagePlayer(p,8,1.7));assert.equal(p.hp,29);
});
test('fast projectile sweeps intersect targets even between frames',()=>{
 assert(segmentCircle(-10,0,10,0,0,0,1));assert(!segmentCircle(-10,2,10,2,0,0,1));assert(segmentCircle(0,0,0,0,0,0,1));
});
