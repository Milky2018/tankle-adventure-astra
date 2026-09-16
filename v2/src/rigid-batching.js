import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Merge only rigid siblings. Articulated groups and referenced moving meshes stay intact.
export function batchRigidParts(root,moving=[]){
  const excluded=new Set(moving);
  function visit(parent){
    const groups=new Map();
    for(const mesh of [...parent.children]){
      if(mesh.isGroup){visit(mesh);continue;}
      if(!mesh.isMesh||mesh.children.length||excluded.has(mesh)||!mesh.visible||Array.isArray(mesh.material)||mesh.material.transparent)continue;
      const key=[mesh.material.id,mesh.castShadow,mesh.receiveShadow,mesh.renderOrder,mesh.layers.mask].join('/');
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(mesh);
    }
    for(const meshes of groups.values()){
      if(meshes.length<2)continue;
      const indexed=meshes.every(mesh=>mesh.geometry.index);
      const geometries=meshes.map(mesh=>{mesh.updateMatrix();const geometry=!indexed&&mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();return geometry.applyMatrix4(mesh.matrix);});
      const source=meshes[0],batch=new T.Mesh(mergeGeometries(geometries),source.material);
      batch.name='rigid-parts';batch.castShadow=source.castShadow;batch.receiveShadow=source.receiveShadow;
      batch.renderOrder=source.renderOrder;batch.layers.mask=source.layers.mask;batch.matrixAutoUpdate=false;
      batch.geometry.computeBoundingBox();batch.geometry.computeBoundingSphere();
      parent.remove(...meshes);parent.add(batch);
      for(const geometry of geometries)geometry.dispose();
    }
  }
  visit(root);
}
