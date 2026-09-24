import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { cameraApertureOpacity, viewportPyramidMatrix } from './visibility.js';

const player=new Vector3(),apex=new Vector3(0,1.6,0);
function camera(aspect=2){
  const c=new PerspectiveCamera(60,aspect,1,100);
  c.position.set(0,1.6,12);c.lookAt(apex);c.updateMatrixWorld();return c;
}
const sample=(c,x,y,t)=>{
  const depth=apex.clone().project(c).z;
  const offset=new Vector3(x,y,depth).unproject(c).sub(new Vector3(0,0,depth).unproject(c));
  return apex.clone().lerp(new Vector3(0,0,-1).unproject(c).add(offset),t);
};

test('viewport pyramid includes rectangular corners and grows toward the screen',()=>{
  const c=camera(),pyramid=viewportPyramidMatrix(player,c);
  for(const t of [.1,.5,.95])for(const [x,y]of [[0,0],[.8,.8],[-.8,.8],[.8,-.8],[-.8,-.8]])
    assert.ok(cameraApertureOpacity(sample(c,x,y,t),pyramid)<.3);
  for(const [x,y]of [[1.05,0],[-1.05,0],[0,1.05],[0,-1.05]])
    assert.equal(cameraApertureOpacity(sample(c,x,y,.5),pyramid),1);
  const offset=sample(c,.8,0,.9).x;
  assert.ok(cameraApertureOpacity(sample(c,0,0,.9).setX(offset),pyramid)<.3);
  assert.equal(cameraApertureOpacity(sample(c,0,0,.1).setX(offset),pyramid),1);
  for(const t of [-.1,0,1.01])assert.equal(cameraApertureOpacity(sample(c,0,0,t),pyramid),1);
});

test('viewport pyramid follows aspect, FOV, zoom, view offset and camera rotation',()=>{
  const c=camera(),point=sample(c,.8,0,.5);
  assert.ok(cameraApertureOpacity(point,viewportPyramidMatrix(player,c))<.3);
  c.aspect=.5;c.updateProjectionMatrix();
  assert.equal(cameraApertureOpacity(point,viewportPyramidMatrix(player,c)),1);
  c.aspect=2;c.fov=20;c.updateProjectionMatrix();
  assert.equal(cameraApertureOpacity(point,viewportPyramidMatrix(player,c)),1);
  c.fov=60;c.zoom=3;c.updateProjectionMatrix();
  assert.equal(cameraApertureOpacity(point,viewportPyramidMatrix(player,c)),1);
  c.zoom=1;c.position.set(8,6,-12);c.lookAt(2,3,0);
  c.setViewOffset(1600,900,100,50,1200,700);c.updateMatrixWorld();
  const pyramid=viewportPyramidMatrix(player,c);
  for(const t of [.15,.5,.9]){
    assert.ok(cameraApertureOpacity(sample(c,.8,-.8,t),pyramid)<.3);
    assert.equal(cameraApertureOpacity(sample(c,1.1,0,t),pyramid),1);
  }
});

test('pyramid edges fade continuously and supporting surfaces remain opaque',()=>{
  const c=camera(),pyramid=viewportPyramidMatrix(player,c),point=sample(c,0,0,.5);
  const patches=[{x:point.x-1,z:point.z-1,y:point.y,w:2,d:2}];
  assert.ok(cameraApertureOpacity(point,pyramid)<.3);
  assert.equal(cameraApertureOpacity(point,pyramid,patches),1);
  const edge=cameraApertureOpacity(sample(c,.95,0,.5),pyramid);
  assert.ok(edge>.3&&edge<1);
  assert.ok(Math.abs(edge-cameraApertureOpacity(sample(c,.95001,0,.5),pyramid))<.001);
});
