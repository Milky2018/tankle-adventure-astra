import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {foldedEnemyModel,ENEMY_KINDS} from './folded-enemies.js';
import {batchRigidParts} from './rigid-batching.js';

function census(root){
  const result={meshes:0,triangles:0};
  root.traverse(m=>{if(m.isMesh){result.meshes++;result.triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;}});
  return result;
}

test('enemy batching preserves geometry and articulated parts for every enemy kind',()=>{
  for(const type of Object.keys(ENEMY_KINDS)){
    const model=foldedEnemyModel(type),before=census(model.root);
    const bounds=new T.Box3().setFromObject(model.root,true);
    const moving=[...model.tracks,...(model.moving||[]),model.frontArmor,model.radiator].filter(Boolean);
    const parents=moving.map(m=>m.parent);
    batchRigidParts(model.root,moving);
    const after=census(model.root),actual=new T.Box3().setFromObject(model.root,true);
    assert.equal(after.triangles,before.triangles,type);
    assert(after.meshes<=before.meshes,`${type}: more draw calls`);
    if(type==='guard'||type==='scout')assert(after.meshes<before.meshes,`${type}: insufficient batching`);
    assert(actual.min.distanceTo(bounds.min)<1e-5,type);
    assert(actual.max.distanceTo(bounds.max)<1e-5,type);
    moving.forEach((m,i)=>assert.equal(m.parent,parents[i],`${type}: detached animated part`));
    const rotations=model.tracks.map(m=>m.quaternion.clone());
    model.rollWheels(.5);model.animate('warn',.3,1,1/60,true);
    model.tracks.forEach((m,i)=>assert(m.quaternion.angleTo(rotations[i])>.1,type));
    model.turret.rotation.y=.7;model.body.rotation.y=-.4;model.root.updateMatrixWorld(true);
    assert(Number.isFinite(new T.Box3().setFromObject(model.root,true).max.x),type);
  }
});

test('batching preserves material identity, shadow flags and independently visible meshes',()=>{
  const root=new T.Group(),material=new T.MeshBasicMaterial(),geometry=new T.BoxGeometry();
  const moving=new T.Mesh(geometry,material);root.add(moving);
  for(let i=0;i<4;i++){const mesh=new T.Mesh(geometry,material);mesh.position.x=i+2;mesh.castShadow=i<2;root.add(mesh);}
  batchRigidParts(root,[moving]);
  assert.equal(root.children.length,3);
  assert(root.children.every(m=>m.material===material));
  assert.equal(root.children.filter(m=>m.castShadow).length,1);
  moving.visible=false;
  assert.equal(root.children.filter(m=>m.visible).length,2);
  material.color.setHex(0xff0000);
  assert(root.children.every(m=>m.material.color.getHex()===0xff0000));
});
