import test from 'node:test';
import assert from 'node:assert/strict';
import { traceLaser, rearHit, laserHeat } from './laser.js';
import { newPlayer, updateHeat, phoenixReady, contactDamage } from '../player/mechanics.js';
test('finite mirrors reflect toward a receiver and armour uses the final ray direction',()=>{
  const receiver={x:10,z:8,radius:.5};
  const s=traceLaser(0,0,1,0,{mirrors:[{x:10,z:0,angle:Math.PI/4,length:4}],targets:[receiver]});
  assert.equal(s.length,2);assert.equal(s[1].hit,receiver);assert.ok(Math.abs(s[1].dx)<1e-8);assert.ok(s[1].dz>.999);
  assert.equal(rearHit(0,s[1].dx,s[1].dz),true);assert.equal(rearHit(Math.PI,s[1].dx,s[1].dz),false);
  assert.equal(traceLaser(0,4,1,0,{mirrors:[{x:10,z:0,angle:Math.PI/4,length:4}]}).length,1);
});
test('walls and nearer bodies block rays, with one shared range across bounces',()=>{
  const wall={x:5,z:-1,w:1,d:2};assert.equal(traceLaser(0,0,1,0,{walls:[wall],targets:[{x:10,z:0,radius:1}]}).at(-1).hit,wall);
  const s=traceLaser(0,0,1,0,{range:12,mirrors:[{x:10,z:0,angle:Math.PI/4,length:4}]});
  assert.ok(Math.abs(s.at(-1).endZ-2)<1e-6);
  assert.equal(traceLaser(0,0,1,0,{walls:[{x:-1,z:-1,w:2,d:2}]}).at(-1).endX,0);
});
test('Phoenix shares ordinary acceleration and requires maximum speed for its cold ram',()=>{
  const p={...newPlayer(),overdrive:true,phoenix:true};for(let i=0;i<30;i++)updateHeat(p,1/60,i/60,true,true);
  assert.ok(Math.abs(p.speed-1.6)<1e-8);assert.equal(contactDamage(p),0);
  for(let i=30;i<110;i++)updateHeat(p,1/60,i/60,true,true);
  assert.ok(phoenixReady(p));assert.equal(contactDamage(p),12);assert.ok(Math.abs(p.heat-27.5)<1e-6);
});
test('water circulation sustains hot boost and doubles contact while weapons stay locked',()=>{
  const p={...newPlayer(),overdrive:true,phoenix:true,circulation:true,heat:100,overheated:true,speed:3.2};
  updateHeat(p,1,10,true,true);assert.equal(p.speed,3.2);assert.equal(contactDamage(p),24);assert.equal(laserHeat(p,.1,10),false);
  p.speed=1;assert.equal(contactDamage(p),2);p.circulation=false;updateHeat(p,1,11,true,true);assert.equal(p.speed,1);
});
test('continuous laser charges Heat until lockout, without resetting the cooling delay on rejected fire',()=>{
  const p=newPlayer();for(let i=0;i<250;i++)laserHeat(p,1/60,i/60);assert.ok(p.heat>99.9);laserHeat(p,1/60,4.2);assert.ok(p.overheated);const last=p.lastHeat;assert.equal(laserHeat(p,1,5),false);assert.equal(p.lastHeat,last);
});
