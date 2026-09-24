import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {FollowCamera,cameraMovement,cameraPropOpacity} from './camera.js';

test('third-person movement follows yaw with equal cardinal and diagonal speed',()=>{
  for(const yaw of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
    const forward=cameraMovement(0,-1,yaw),right=cameraMovement(1,0,yaw),diagonal=cameraMovement(1,-1,yaw);
    assert.ok(Math.abs(forward.x-Math.sin(yaw))<1e-10);
    assert.ok(Math.abs(forward.z-Math.cos(yaw))<1e-10);
    assert.ok(Math.abs(forward.x*right.x+forward.z*right.z)<1e-10);
    assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-1)<1e-10);
  }
  assert.deepEqual(cameraMovement(0,0,1),{x:0,z:0});
});

test('third-person camera keeps its configured boom through obstructions',()=>{
  const rig=new FollowCamera(16/9),player={x:0,y:0,z:0};
  rig.update(player,1,(_o,_d,d)=>d);
  rig.update(player,1/60,()=>4);
  assert.ok(rig.distance>12);
  assert.ok(Math.abs(rig.camera.position.distanceTo(rig.pivot)-rig.distance)<1e-10);
  const distance=rig.distance;
  rig.update(player,1/60,(_o,_d,d)=>d);
  assert.equal(rig.distance,distance);
});

test('third-person camera does not query collision to change its distance',()=>{
  const rig=new FollowCamera(16/9);let probes=0;
  rig.update({x:0,y:-16,z:0},1,()=>++probes===4?2:12);
  assert.equal(probes,0);assert.ok(rig.distance>12);
  assert.ok(rig.camera.position.y>-16,'a horizontal floor does not become the camera target');
});

test('mouse pitch stays bounded and never changes the player or movement speed',()=>{
  const rig=new FollowCamera(16/9),player={x:0,y:24,z:0},before={...player};
  rig.turn(400,1e6);assert.equal(rig.pitch,.95);
  rig.turn(0,-1e6);assert.equal(rig.pitch,-.65);
  rig.update(player,1,(_o,_d,d)=>d);
  assert.deepEqual(player,before);
  assert.ok(rig.camera.isPerspectiveCamera);
});

test('small props fade along the view corridor, including when the camera is inside',()=>{
  const post=new Box3(new Vector3(-.325,0,-.4),new Vector3(.325,2.8,.4));
  assert.equal(cameraPropOpacity(post,new Vector3(0,1.8,0),new Vector3(0,1.6,-10)),.16);
  assert.equal(cameraPropOpacity(post,new Vector3(0,5,10),new Vector3(0,1.6,0)),.16);
  assert.equal(cameraPropOpacity(post,new Vector3(5,5,10),new Vector3(5,1.6,0)),1);
  let previous=.16;
  for(let x=0;x<=3;x+=.05){
    const opacity=cameraPropOpacity(post,new Vector3(x,5,10),new Vector3(x,1.6,0));
    assert.ok(opacity>=previous&&opacity-previous<.05,'spatial fade must not pop at a boundary');previous=opacity;
  }
});

test('looking upward keeps the shoulder camera above the hull instead of orbiting into the floor',()=>{
 const follow=new FollowCamera(16/9,Math.PI),p={x:90,y:0,z:-18};
 for(const pitch of [-.12,-.24,-.6]){
  follow.pitch=pitch;follow.update(p,1,(_origin,_direction,distance)=>distance+.5);
  assert.ok(follow.camera.position.y>=p.y+1.8+follow.height-.001);
  const forward=follow.camera.getWorldDirection(new Vector3());
  assert.ok(Math.abs(forward.y+Math.sin(pitch))<1e-9,'mouse pitch still controls the actual view without smoothing');
 }
});
