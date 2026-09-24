import * as T from 'three';
import {box,mat} from './factory-models.js';
import {deckHeight} from '../world/deck-geometry.js';
import {batchRigidParts} from './rigid-batching.js';

export function makeThermalFloors(scene,floors){
  const items=floors.map(f=>{
    const root=new T.Group();root.name=`thermal-floor:${f.id}`;scene.add(root);
    const glow=mat(0xf58b36,true),plates=mat(0x7b3426),vents=[];
    for(let x=f.x;x<f.x+f.w;x+=6)for(let z=f.z;z<f.z+f.d;z+=6){
      const w=Math.min(6,f.x+f.w-x),d=Math.min(6,f.z+f.d-z),tile=new T.Group();
      tile.position.set(x+w/2,deckHeight(f,z+d/2)+.27,z+d/2);tile.rotation.x=-Math.atan((f.rise||0)/f.d);root.add(tile);
      box(tile,w-.2,.04,d-.2,0,0,0,plates,0);
      for(let offset=-d/2+.6;offset<d/2;offset+=1)box(tile,w-.6,.035,.16,0,.05,offset,glow,0);
      vents.push([x+w/2,z+d/2]);
      tile.updateMatrix();
      for(const mesh of [...tile.children]){mesh.applyMatrix4(tile.matrix);root.add(mesh);}
      root.remove(tile);
    }
    batchRigidParts(root);
    const positions=new Float32Array(vents.length*3),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
    const particles=new T.Points(geometry,new T.PointsMaterial({color:0xffb563,size:.14,transparent:true,opacity:.65,depthWrite:false}));particles.frustumCulled=false;root.add(particles);
    // Particle positions are world-space; the root cannot sort them against distant batches.
    particles.renderOrder=1;
    return {f,root,glow,plates,particles,positions,vents};
  });
  return {items,update(time,state){for(const item of items){
    const {f,glow,plates,particles,positions,vents}=item,active=!(f.release&&state[f.release]||f.stop&&state[f.stop]);
    glow.color.setHex(active?0xff943d:0x657b70);glow.color.multiplyScalar(active?.8+.2*Math.sin(time*3):1);plates.color.setHex(active?0x7b3426:0x3e504a);
    particles.visible=active;
    if(active){for(let i=0;i<vents.length;i++){const [x,z]=vents[i],phase=(time*.55+i*.37)%1;positions.set([x+Math.sin(time+i)*.25,deckHeight(f,z)+.35+phase*1.6,z],i*3);}particles.geometry.attributes.position.needsUpdate=true;}
  }}};
}
