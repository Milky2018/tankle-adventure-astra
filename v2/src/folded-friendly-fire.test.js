import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {cityDamage,armorAbsorbs} from './folded-combat.js';
import {refugeAt,refugeRayDistance} from './folded-refuges.js';
import {BARRAGE,RAIL} from './folded-attacks.js';
import {MORTAR} from './abilities.js';
import {clamp,damagePlayer} from './mechanics.js';

// Run the actual projectile/impact functions without a renderer or browser.
const source=readFileSync(new URL('./folded.js',import.meta.url),'utf8');
function declaration(name){
 const start=source.indexOf(`function ${name}(`),end=source.indexOf('\nfunction ',start+1);
 assert.ok(start>=0&&end>start,name);return source.slice(start,end);
}
function enemy(id,x,z,extra={}){return {id,x,y:0,z,hp:10,max:10,type:'turret',radius:1,aim:Math.PI,phase:'idle',parts:[],model:{},...extra};}
function fixture(enemies,{walls=[],hives=[],controls=[]}={}){
 const p={x:0,y:0,z:20,hp:50,invincible:0},state={},shots=[],events=[];
 const world={enemies,hives,controls,lifts:[],signalRelease(){},cast(origin,dir,range,options={}){
  const ray=new T.Ray(origin,dir);let nearest=null;
  for(const wall of walls){const point=ray.intersectBox(wall,new T.Vector3());if(point){const distance=point.distanceTo(origin);if(distance<=range&&(!nearest||distance<nearest.distance))nearest={point,distance};}}
  if(options.targets!==false)for(const target of controls){const point=ray.intersectSphere(new T.Sphere(new T.Vector3(target.x,target.y,target.z),target.radius),new T.Vector3());if(point){const distance=point.distanceTo(origin);if(distance<=range&&(!nearest||distance<nearest.distance))nearest={point,distance,target};}}
  return nearest;
 }};
 const values={T,p,state,shots,world,BARRAGE,RAIL,MORTAR,clamp,damagePlayer,cityDamage,armorAbsorbs,refugeAt,refugeRayDistance,
  scene:{remove(){}},mines:[],C:{orange:0,mint:0,yellow:0,lightYellow:0},SIGNAL:{magnet:0},
  projectile:()=>new T.Mesh(new T.SphereGeometry(.1),new T.MeshBasicMaterial()),ring:()=>new T.Mesh(),mat:()=>new T.MeshBasicMaterial(),
  burst(){},ripple:()=>new T.Mesh(),refugeImpact(){},rejectImpact(){},audio:{event(){}},alertSquad(){},save(){},enemyPan:()=>0,
  setState:id=>events.push(id),detonateMine(){},layMine(){},foldedSupport:()=>({height:0})};
 const functions=['hurt','castWeapon','hitEnemy','impact','shootEnemy','updateShots'].map(declaration).join('\n');
 const api=new Function(...Object.keys(values),`let time=1,hitAt=-1,deathAt=-1;const keys=new Set();${functions}\nreturn {shootEnemy,impact,step(dt){time+=dt;updateShots(dt);}};`)(...Object.values(values));
 return {...api,p,shots,events,world};
}
function fireThrough(f,shooter){f.shootEnemy(shooter,0,null,new T.Vector3(f.p.x,1.2,f.p.z));for(let i=0;i<150;i++)f.step(1/60);}

test('hostile direct fire hits the first ally, ignores its shooter and never operates controls',()=>{
 const shooter=enemy('shooter',0,0),front=enemy('front',0,6),back=enemy('back',0,11);
 const f=fixture([shooter,front,back],{controls:[{id:'switch',x:0,y:1.5,z:3,radius:1}]});
 fireThrough(f,shooter);
 assert.equal(shooter.hp,10);assert.equal(front.hp,9);assert.equal(back.hp,10);assert.equal(f.p.hp,50);assert.deepEqual(f.events,[]);
});

test('hostile direct fire respects walls and sanctuary boundaries before an ally',()=>{
 for(const options of [{walls:[new T.Box3(new T.Vector3(-2,0,3),new T.Vector3(2,4,4))]},{hives:[{x:0,y:0,z:8}]}]){
  const shooter=enemy('shooter',0,0),ally=enemy('ally',0,8),f=fixture([shooter,ally],options);fireThrough(f,shooter);
  assert.equal(ally.hp,10);assert.equal(f.p.hp,50);
 }
});

test('crossfire uses target armour and living boss parts instead of player-scale damage',()=>{
 const shooter=enemy('shooter',0,0),guard=enemy('guard',0,6,{type:'guard',aim:Math.PI});
 fireThrough(fixture([shooter,guard]),shooter);assert.equal(guard.hp,9.6);
 const boss=enemy('keeper',0,8,{type:'boss',radius:2});
 const part={x:3,y:1.7,z:8,hp:6,radius:1.45,enemy:boss};boss.parts=[part];
 const side=enemy('side',3,0),f=fixture([side,boss]);f.p.x=3;fireThrough(f,side);
 assert.equal(part.hp,5);assert.equal(boss.hp,9);
});

test('hostile mortar blast excludes its owner and respects cover and sanctuary',()=>{
 const owner=enemy('owner',0,0,{type:'artillery'}),open=enemy('open',0,2),covered=enemy('covered',3,0),safe=enemy('safe',-3,0);
 const f=fixture([owner,open,covered,safe],{walls:[new T.Box3(new T.Vector3(1,0,-2),new T.Vector3(2,4,2))],hives:[{x:-7,y:0,z:0}]});
 f.impact({point:new T.Vector3(0,.1,0)},{hostile:true,mortar:true,owner:owner.id,origin:new T.Vector3(0,1.5,-10)});
 assert.equal(owner.hp,10);assert.equal(open.hp,7);assert.equal(covered.hp,10);assert.equal(safe.hp,10);assert.deepEqual(f.events,[]);
});

test('hostile mortar splash preserves boss armour and exposed part rules',()=>{
 const boss=enemy('keeper',0,0,{type:'boss'}),part={x:3,y:1.7,z:0,hp:6,radius:1.45,enemy:boss};boss.parts=[part];
 const guardian=enemy('guardian',0,3,{guardian:true,aim:Math.PI});
 const f=fixture([boss,guardian]);f.impact({point:new T.Vector3(3,.1,0)},{hostile:true,mortar:true,owner:'artillery',origin:new T.Vector3(0,1.5,-10)});
 assert.equal(boss.hp,7);assert.equal(part.hp,3);assert.equal(guardian.hp,10);
});

test('lobbed shots leave their launcher and its parts before any friendly impact',()=>{
 const owner=enemy('artillery',0,0,{type:'artillery'});owner.parts=[{x:0,y:1.7,z:0,hp:6,radius:2,enemy:owner}];
 const f=fixture([owner]);f.shootEnemy(owner,0,null,new T.Vector3(0,.05,20));
 assert.equal(f.shots[0].owner,owner.id);f.step(.05);
 assert.equal(f.shots.length,1);assert.equal(owner.hp,10);assert.equal(owner.parts[0].hp,6);
});
