import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {foldedEnemyModel,prepareEnemyMaterials,animateEnemy} from './folded-enemies.js';
import {C} from './world.js';

const factoryTypes=['scout','turret','guard','elite','boss'];
const types=[...factoryTypes,'skirmisher','sniper','artillery','miner','welder','repairer','reflector','sorter'];
const create=type=>{const model=foldedEnemyModel(type);return {model,materials:prepareEnemyMaterials(model),body:{phase:'warn',timer:.5,flash:0,armor:0}};};
const visibleMaterials=model=>{const materials=new Set();model.root.traverse(mesh=>{if(mesh.isMesh)materials.add(mesh.material);});return [...materials];};
const hasColor=(model,color)=>visibleMaterials(model).some(m=>m.isMeshBasicMaterial&&!m.transparent&&m.color.getHex()===color);

for(const type of types)test(`${type} phase lamps survive production batching and frame updates`,()=>{
  const enemy=create(type),warning=factoryTypes.includes(type)?0xffdb8b:C.lightYellow;
  animateEnemy(enemy.body,enemy,1,1/60,true);
  assert.ok(hasColor(enemy.model,warning),'warning must reach a rendered lamp');
  enemy.body.phase='vent';animateEnemy(enemy.body,enemy,2,1/60,true);
  assert.ok(hasColor(enemy.model,C.orange),'vent must reach a rendered lamp');
  enemy.body.phase='idle';animateEnemy(enemy.body,enemy,3,1/60,false);
  assert.ok(hasColor(enemy.model,factoryTypes.includes(type)?0x8f6854:C.dark),'inactive lamp must reset');
});

test('damage and armour tint compose over the phase colour and recover next frame',()=>{
  for(const type of ['scout','sniper']){
    const enemy=create(type),warning=factoryTypes.includes(type)?0xffdb8b:C.lightYellow;
    const body=enemy.materials.find(({m})=>m.isMeshToonMaterial);
    for(const kind of ['flash','armor']){
      enemy.body[kind]=.1;animateEnemy(enemy.body,enemy,1,1/60,true);
      const tint=new T.Color(kind==='armor'?C.lightYellow:0xffffff);
      const expected=new T.Color(warning).lerp(tint,.65).getHex();
      assert.ok(hasColor(enemy.model,expected),`${type} ${kind}`);
      assert.equal(body.m.color.getHex(),body.color.clone().lerp(tint,.65).getHex(),`${type} body ${kind}`);
      enemy.body[kind]=0;animateEnemy(enemy.body,enemy,2,1/60,true);
      assert.ok(hasColor(enemy.model,warning),`${type} recovered ${kind}`);
      assert.equal(body.m.color.getHex(),body.color.getHex(),`${type} recovered body ${kind}`);
    }
  }
});

test('phase and impact colours stay isolated between enemies without disabling batching',()=>{
  const first=create('sniper'),second=create('sniper'),raw=foldedEnemyModel('sniper');
  const firstMaterials=new Set(visibleMaterials(first.model));
  assert.ok(visibleMaterials(second.model).every(m=>!firstMaterials.has(m)));
  const before=visibleMaterials(second.model).map(m=>m.color?.getHex());
  first.body.flash=.1;animateEnemy(first.body,first,1,1/60,true);
  assert.deepEqual(visibleMaterials(second.model).map(m=>m.color?.getHex()),before);
  const count=model=>{let n=0;model.root.traverse(m=>{if(m.isMesh)n++;});return n;};
  assert.ok(count(first.model)<count(raw),'rigid siblings remain batched');
  const vertices=model=>{let n=0;model.root.traverse(m=>{if(m.isMesh)n+=m.geometry.index?.count??m.geometry.attributes.position.count;});return n;};
  assert.equal(vertices(first.model),vertices(raw),'all authored triangles remain');
});

test('sorter arm marks warning, sweep and recovery without changing its geometry',()=>{
  const enemy=create('sorter'),arm=enemy.model.arm.children.find(m=>m.material?.color.getHex()===C.yellow);
  const geometry=arm.geometry;
  for(const [phase,color]of [['warn',C.lightYellow],['sweep',C.red],['vent',0x8f6854]]){
    enemy.body.phase=phase;animateEnemy(enemy.body,enemy,1,1/60,true);
    assert.equal(arm.material.color.getHex(),color,phase);
    assert.equal(arm.geometry,geometry);
  }
});
