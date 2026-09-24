import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Ray,Vector3,Box3} from 'three';
import {foldedArchitecture,foldedSolids,foldedControls,foldedEnemies,foldedSupport,initialFoldedState,moveFolded} from '../world/terrain.js';
import {makeRegionalLights} from '../rendering/regional-scenery.js';

function walk(p,state,points){
  for(const [x,z]of points){
    for(let i=0;i<2000&&Math.hypot(p.x-x,p.z-z)>.08;i++){
      const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);
      moveFolded(p,dx/d*Math.min(.15,d),dz/d*Math.min(.15,d),state);
    }
    assert.ok(Math.hypot(p.x-x,p.z-z)<.1,`Blocked at ${p.x},${p.z} toward ${x},${z}`);
    assert.ok(foldedSupport(p.x,p.z,p.y,true));
  }
}

test('flooded ruins provide solid cover with a broad doorway and preserve the calm first crossing',()=>{
  const state=initialFoldedState(),p={x:-164,y:-8,z:64,speed:1,deployed:true};
  walk(p,state,[[-146,64],[-94,64],[-94,34],[-76,34]]);
  p.x=-128;p.z=47;
  walk(p,state,[[-111,47],[-111,60],[-128,60],[-128,47]]);
  const hunter=foldedEnemies.find(e=>e.id==='reservoir-patrol-hunter');
  walk({...hunter,speed:1,deployed:true},state,[...hunter.swimPatrol,...hunter.swimPatrol]);
  const walls=foldedSolids.filter(s=>s.masonry),hits=(origin,dir)=>{
    const ray=new Ray(new Vector3(...origin),new Vector3(...dir));
    return walls.some(s=>ray.intersectBox(new Box3(new Vector3(s.x,s.y,s.z),new Vector3(s.x+s.w,s.y+s.h,s.z+s.d)),new Vector3()));
  };
  assert.ok(hits([-128,-6,40],[1,0,0]),'Intact wall must stop a level shot');
  assert.equal(hits([-128,-6,47],[1,0,0]),false,'Broken doorway must pass shots');
  for(const s of walls)for(const q of [...foldedControls,...foldedEnemies]){
    assert.ok(Math.abs(q.y-s.y)>4||q.x<s.x-1||q.x>s.x+s.w+1||q.z<s.z-1||q.z>s.z+s.d+1,`${s.id} overlaps ${q.id}`);
  }
});

test('new window headers have a supporting sill, and optical galleries keep the close camera view open',()=>{
  for(const s of foldedArchitecture.solids.filter(s=>s.kind==='lintel'&&s.room!=='lens-west-gallery')){
    assert.ok(foldedArchitecture.solids.some(base=>base.room===s.room&&base.kind==='wall'&&Math.abs(base.x-s.x)<.01&&Math.abs(base.z-s.z)<.01&&base.y<s.y),s.id);
  }
  for(const s of foldedArchitecture.solids.filter(s=>s.kind==='wall'&&['lens-west-gallery','lens-east-gallery','lens-north-gallery'].includes(s.room))){
    assert.ok(s.h<=1.25,'Upper mass should sit at the shaft, not around the camera boom');
  }
});

test('local lights use three fixed sources, fade before moving and do not leak across storeys',()=>{
  const scene=new Scene(),sources=[0,5,10,60].map(x=>({x,y:3,z:0,ground:0,color:0xffe0ba}));
  sources.push({x:0,y:27,z:0,ground:24,color:0xffffff});
  const pool=makeRegionalLights(scene,sources);
  for(let i=1;i<=60;i++)pool.update(i/60,{x:0,y:0,z:0});
  assert.equal(scene.children.length,3);
  assert.ok(pool.slots.every(s=>s.light.position.y===3&&s.light.intensity>3.3));
  const positions=pool.slots.map(s=>s.light.position.clone());
  pool.update(61/60,{x:60,y:0,z:0});
  assert.ok(pool.slots.every((s,i)=>s.light.position.equals(positions[i])));
  for(let i=62;i<180;i++)pool.update(i/60,{x:60,y:0,z:0});
  assert.equal(pool.slots.filter(s=>s.light.intensity>1).length,1);
  assert.equal(pool.slots.find(s=>s.light.intensity>1).light.position.x,60);
});


test('neighboring room ceilings never share a coplanar overlapping area',()=>{
  const roofs=foldedArchitecture.solids.filter(s=>s.kind==='roof');
  for(let i=0;i<roofs.length;i++)for(let j=i+1;j<roofs.length;j++){
    const a=roofs[i],b=roofs[j];
    assert.ok(Math.abs(a.y-b.y)>.01||a.x>=b.x+b.w-.001||a.x+a.w<=b.x+.001||a.z>=b.z+b.d-.001||a.z+a.d<=b.z+.001,`${a.room} overlaps ${b.room}`);
  }
});
