import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { batchStatic } from './factory-models.js';

test('static batches preserve world bounds and share repeated geometry in separate spatial cells', () => {
  const scene=new T.Group(),fixed=new T.Group(),nested=new T.Group();scene.add(fixed);fixed.add(nested);
  fixed.position.set(5,2,-7);fixed.rotation.y=.2;nested.rotation.y=-.4;
  const geometry=new T.BoxGeometry(2,3,4),material=new T.MeshBasicMaterial();
  for(const x of [-100,100])for(let i=0;i<32;i++){
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x+i*.02,0,-2);nested.add(mesh);
  }
  const expected=new T.Box3().setFromObject(fixed);
  batchStatic(fixed);
  fixed.updateMatrixWorld(true);
  const actual=new T.Box3(),matrix=new T.Matrix4();
  for(const mesh of fixed.children)for(let i=0;i<(mesh.count??1);i++){
    if(mesh.isInstancedMesh){mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);}else matrix.copy(mesh.matrixWorld);
    mesh.geometry.computeBoundingBox();actual.union(mesh.geometry.boundingBox.clone().applyMatrix4(matrix));
  }
  assert(actual.min.distanceTo(expected.min)<1e-4);
  assert(actual.max.distanceTo(expected.max)<1e-4);
  assert.equal(fixed.children.length,2);
  for(const mesh of fixed.children){
    assert(mesh.isInstancedMesh);
    assert.equal(mesh.count,32);
    assert.equal(mesh.geometry,geometry);
    assert(mesh.boundingSphere.radius<5);
  }
});

test('mixed geometry keeps per-object visibility and independent shadow settings', () => {
  const fixed=new T.Group(),material=new T.MeshBasicMaterial({transparent:true,opacity:.5});
  for(let i=0;i<3;i++){
    const mesh=new T.Mesh(new T.BoxGeometry(i+1,2,1),material);
    mesh.position.set(4+i*3,0,-2);mesh.castShadow=true;mesh.receiveShadow=true;fixed.add(mesh);
  }
  const noShadow=new T.Mesh(new T.BoxGeometry(1,1,1),material);noShadow.position.set(8,0,-8);fixed.add(noShadow);
  batchStatic(fixed);
  const batch=fixed.children.find(m=>m.isBatchedMesh);
  assert(batch);
  assert.equal(batch.instanceCount,3);
  assert.equal(batch.perObjectFrustumCulled,true);
  assert.equal(batch.castShadow,true);
  assert(fixed.children.some(m=>!m.castShadow));
  const ray=new T.Raycaster(new T.Vector3(4,10,-2),new T.Vector3(0,-1,0));
  fixed.updateMatrixWorld(true);
  assert(ray.intersectObjects(fixed.children).some(hit=>Math.abs(hit.point.y-1)<1e-6));
});

test('opaque geometry is merged only with nearby objects', () => {
  const fixed=new T.Group(),material=new T.MeshBasicMaterial();
  for(const x of [-100,100])for(let i=0;i<3;i++){
    const mesh=new T.Mesh(new T.BoxGeometry(i+1,2,1),material);mesh.position.set(x+i,0,-2);fixed.add(mesh);
  }
  batchStatic(fixed);
  assert.equal(fixed.children.length,2);
  for(const mesh of fixed.children){
    assert(!mesh.isBatchedMesh&&!mesh.isInstancedMesh);
    assert(mesh.geometry.boundingSphere.radius<5);
    assert.equal(mesh.geometry.index.count/3,36);
  }
});

test('transparent repeated surfaces retain per-object sorting', () => {
  const fixed=new T.Group(),geometry=new T.PlaneGeometry(2,2);
  const material=new T.MeshBasicMaterial({transparent:true,opacity:.2});
  for(let i=0;i<8;i++){const mesh=new T.Mesh(geometry,material);mesh.position.set(i,0,2);fixed.add(mesh);}
  batchStatic(fixed);
  assert.equal(fixed.children.length,1);
  assert(fixed.children[0].isBatchedMesh);
  assert.equal(fixed.children[0].sortObjects,true);
});

test('long rotated slabs remain continuous while their render bounds stay local', () => {
  const fixed=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(8,1,300),new T.MeshBasicMaterial());
  mesh.position.set(-60,-1,-150);mesh.rotation.y=.4;fixed.add(mesh);mesh.updateMatrixWorld(true);
  const matrix=mesh.matrixWorld.clone();
  batchStatic(fixed);fixed.updateMatrixWorld(true);
  for(const mesh of fixed.children){
    if(mesh.isBatchedMesh){
      assert(mesh.perObjectFrustumCulled);
      for(let i=0;i<mesh.instanceCount;i++)assert(mesh.getBoundingSphereAt(mesh.getGeometryIdAt(i),new T.Sphere()).radius<24);
      continue;
    }
    if(!mesh.boundingSphere&&!mesh.geometry.boundingSphere)mesh.geometry.computeBoundingSphere();
    assert((mesh.boundingSphere??mesh.geometry.boundingSphere).radius<48);
  }
  for(let z=-149.5;z<=149;z+=1){
    const origin=new T.Vector3(0,10,z).applyMatrix4(matrix);
    const ray=new T.Raycaster(origin,new T.Vector3(0,-1,0));
    const hits=ray.intersectObjects(fixed.children);
    assert(hits.some(hit=>Math.abs(hit.point.y+.5)<1e-5),`missing floor at ${z}`);
  }
});

test('geometry-preserving batches retain textured slabs in opaque and transparent modes',()=>{
  const color=new T.Group(),depth=new T.Group();
  const colorMaterial=new T.MeshBasicMaterial({transparent:true}),depthMaterial=new T.MeshBasicMaterial();
  const originals=[];
  for(let i=0;i<3;i++){
    const geometry=new T.BoxGeometry(8,.65,70),uv=geometry.attributes.uv;
    for(let n=0;n<uv.count;n++)uv.setXY(n,uv.getX(n)*5+i,uv.getY(n)*9);
    originals.push(geometry);
    for(const [root,material]of [[color,colorMaterial],[depth,depthMaterial]]){
      const mesh=new T.Mesh(geometry,material);mesh.position.set(20*i,-8.325,60);mesh.rotation.x=.2;root.add(mesh);
    }
  }
  batchStatic(color,{preserveGeometry:true});batchStatic(depth,{preserveGeometry:true});
  assert.equal(color.children.length,1);assert.equal(depth.children.length,1);
  const a=color.children[0],b=depth.children[0];assert(a.isBatchedMesh&&b.isBatchedMesh);
  assert.equal(a.instanceCount,3);assert.equal(b.instanceCount,3);
  const ma=new T.Matrix4(),mb=new T.Matrix4();
  for(let i=0;i<3;i++){
    a.getMatrixAt(i,ma);b.getMatrixAt(i,mb);assert.deepEqual(ma.elements,mb.elements);
    const range=a.getGeometryRangeAt(a.getGeometryIdAt(i));
    assert.equal(range.vertexCount,originals[i].attributes.position.count);
    const actual=a.geometry.attributes.uv.array.slice(range.vertexStart*2,(range.vertexStart+range.vertexCount)*2);
    assert.deepEqual(actual,originals[i].attributes.uv.array);
  }
});
