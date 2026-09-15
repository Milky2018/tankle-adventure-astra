import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const STATIC_CELL_SIZE = 32;
const slabGeometry = new Map();

export function batchStatic(fixed) {
  fixed.updateWorldMatrix(true,true);
  const inverse=new T.Matrix4().copy(fixed.matrixWorld).invert(),center=new T.Vector3(),groups=new Map();
  const collect=(mesh,geometry,worldMatrix)=>{
    if(!geometry.boundingSphere)geometry.computeBoundingSphere();
    center.copy(geometry.boundingSphere.center).applyMatrix4(worldMatrix);
    // Indexed and non-indexed geometry need separate BatchedMesh buffers.
    const attributes=Object.entries(geometry.attributes).map(([name,a])=>`${name}:${a.itemSize}:${a.normalized}`).sort().join(',');
    const key=[Math.floor(center.x/STATIC_CELL_SIZE),Math.floor(center.z/STATIC_CELL_SIZE),mesh.material.id,!!geometry.index,attributes,mesh.castShadow,mesh.receiveShadow,mesh.renderOrder].join('/');
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push({mesh,geometry,matrix:new T.Matrix4().multiplyMatrices(inverse,worldMatrix)});
  };
  fixed.traverseVisible(mesh=>{
    if(!mesh.isMesh)return;
    const g=mesh.geometry,p=g.parameters;
    if((g.type==='BoxGeometry'||g.type==='RoundedBoxGeometry')&&(p.width>STATIC_CELL_SIZE||p.depth>STATIC_CELL_SIZE)){
      // Flat segments meet without interior bevel seams; collider bounds stay independent.
      for(let x=0;x<p.width;x+=STATIC_CELL_SIZE)for(let z=0;z<p.depth;z+=STATIC_CELL_SIZE){
        const w=Math.min(STATIC_CELL_SIZE,p.width-x),d=Math.min(STATIC_CELL_SIZE,p.depth-z),key=[w,p.height,d].join('/');
        if(!slabGeometry.has(key))slabGeometry.set(key,new T.BoxGeometry(w,p.height,d));
        const matrix=new T.Matrix4().makeTranslation(x+w/2-p.width/2,0,z+d/2-p.depth/2).premultiply(mesh.matrixWorld);
        collect(mesh,slabGeometry.get(key),matrix);
      }
    }else collect(mesh,g,mesh.matrixWorld);
  });
  fixed.clear();
  fixed.matrixAutoUpdate=false;
  const batches=new Map();
  const add=(mesh,source,key)=>{
    mesh.name=`static/${key}`;mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;mesh.renderOrder=source.renderOrder;
    mesh.matrixAutoUpdate=false;fixed.add(mesh);
  };
  for(const [key,entries] of groups){
    const source=entries[0].mesh,byGeometry=new Map();
    for(const entry of entries){
      const g=entry.geometry;
      if(!byGeometry.has(g))byGeometry.set(g,[]);
      byGeometry.get(g).push(entry);
    }
    const remaining=[];
    for(const [geometry,instances] of byGeometry){
      if(instances.length>=4&&!source.material.transparent){
        const mesh=new T.InstancedMesh(geometry,source.material,instances.length);
        instances.forEach((entry,i)=>mesh.setMatrixAt(i,entry.matrix));
        mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();add(mesh,source,key);
      }else remaining.push(...instances);
    }
    if(remaining.length&&!source.material.transparent){
      const geometries=remaining.map(entry=>entry.geometry.clone().applyMatrix4(entry.matrix));
      const mesh=new T.Mesh(mergeGeometries(geometries),source.material);
      mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();add(mesh,source,key);
      for(const geometry of geometries)geometry.dispose();
      continue;
    }
    // Transparent objects retain per-instance sorting and culling across cells.
    const batchKey=key.split('/').slice(2).join('/');
    if(!batches.has(batchKey))batches.set(batchKey,[]);
    batches.get(batchKey).push(...remaining);
  }
  for(const [key,entries] of batches){
    if(!entries.length)continue;
    const source=entries[0].mesh;
    if(entries.length===1){
      const {geometry,matrix}=entries[0],mesh=new T.Mesh(geometry,source.material);
      mesh.matrix.copy(matrix);add(mesh,source,key);
    }else{
      const geometries=[...new Set(entries.map(e=>e.geometry))];
      const vertices=geometries.reduce((n,g)=>n+g.attributes.position.count,0),indices=geometries.reduce((n,g)=>n+(g.index?.count??0),0);
      const mesh=new T.BatchedMesh(entries.length,vertices,indices,source.material),ids=new Map();
      for(const g of geometries)ids.set(g,mesh.addGeometry(g));
      for(const entry of entries)mesh.setMatrixAt(mesh.addInstance(ids.get(entry.geometry)),entry.matrix);
      mesh.perObjectFrustumCulled=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();add(mesh,source,key);
    }
  }
}
