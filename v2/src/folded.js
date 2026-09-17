import {sideObstacles} from './folded-side-layout.js';
import {barrageTargets,RAIL,BARRAGE,SORTER_REACH} from './folded-attacks.js';
import {refugeAt,refugeRayDistance,REFUGE_CLEARANCE} from './folded-refuges.js';
import {createEncounterPacing,canTelegraph} from './folded-pacing.js';
import {expansionHeat,expansionBattles} from './folded-expansion-layout.js';
import {gateAbility} from './folded-guidance.js';
import {FollowCamera,cameraMovement} from './folded-camera.js';
import {cityDamage,cityContact,armorAbsorbs,magnetPullable} from './folded-combat.js';
import {moveWithConveyor,stepLifts} from './folded-machinery.js';
import {SIGNAL} from './folded-visibility.js';
import {ENEMY_KINDS,woundedAlly,animateEnemy} from './folded-enemies.js';
import * as T from 'three';
import './style.css';
import './folded.css';
import {tankModel,box,cylinder,ring,mat,C} from './world.js';
import {FactoryAudio} from './audio.js';
import {flotationAssembly} from './gardens.js';
import {toggleFlotation,FLOTATION,MORTAR,mortarTarget} from './abilities.js';
import {newPlayer,DEFAULT_BINDINGS,MAX_HP,BASE_SPEED,shootHeat,updateHeat,screenMovement,damagePlayer,clamp,angleDelta,redContact} from './mechanics.js';
import {foldedArchitecture,foldedSolids,foldedDecks,foldedHives,initialFoldedState,releaseFolded,foldedSupport,moveFolded,foldedAimHeight,inRect,deckHeight} from './folded-layout.js';
import {makeFoldedWorld} from './folded-world.js';
import {createAbilityHud,createThreatHud,abilityIcon} from './folded-hud.js';
import {createJourneyMenu} from './journey-menu.js';
import {createEnding} from './folded-ending.js';
import {mountFoldedInterface} from './folded-interface.js';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),route=params.get('route'),freight=route==='freight',garden=route==='garden',preview=freight||garden||route==='foundry';
const interfaceView=mountFoldedInterface();
const SAVE_KEY=preview?`furnace-born-v2-folded-${route}`:'furnace-born-v2-city',SETTINGS_KEY='furnace-born-v2-settings';
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function write(key,data){try{localStorage.setItem(key,JSON.stringify(data));}catch{/* Storage denial must not interrupt movement. */}}
const start=freight||garden?{anchor:freight?'loading-entry':'garden-entry',discovered:[freight?'loading':'ferry-approach']}:{anchor:'awakening',discovered:['foundry-awakening']};
const prior=freight||garden?{foundry:true,prototype:true,overdrive:true,'overdrive-return':true,relays:true,'relay-west':true,'relay-east':true,...(garden?{magnetModule:true}:{mortarModule:true,'bridge-crane':true})}:{};
const state=initialFoldedState({...read(SAVE_KEY)||start,...prior}),prefs=read(SETTINGS_KEY)||{};
const FOLDED_BINDINGS={...DEFAULT_BINDINGS,camera:'KeyC'};
let bindings={...FOLDED_BINDINGS,...prefs.bindings};
const p=Object.assign(newPlayer(),{overdrive:freight||garden||state.overdrive,magnet:garden||state.magnetModule,mortar:freight||state.mortarModule,flotation:state.flotation,phoenix:state.phoenix,laser:state.laser,circulation:state.circulation,y:0});
Object.assign(p,foldedHives.find(h=>h.id===state.anchor));
const scene=new T.Scene();scene.background=new T.Color(0x1b3032);scene.fog=new T.Fog(0x1b3032,100,220);
const renderer=new T.WebGLRenderer({canvas:$('game'),antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const overheadCamera=new T.OrthographicCamera(-30,30,17,-17,.1,350),follow=new FollowCamera(innerWidth/innerHeight,p.heading),focus=new T.Vector3(p.x,p.y,p.z),offset=new T.Vector3(28,39.6,28);
const cameraFields={
  third:[['pitch','俯仰角',-30,54,1,.32*180/Math.PI,'°'],['distance','跟随距离',6,20,.5,12,''],['height','镜头高度',0,5,.1,1.6,''],['shoulder','左右偏移',-3,3,.1,1.2,''],['sensitivity','鼠标灵敏度',.25,3,.05,1,'×']],
  overhead:[['angle','俯视角度',30,70,1,Math.atan2(39.6,Math.hypot(28,28))*180/Math.PI,'°'],['scale','视野范围',12,28,.5,17,'']]
};
const cameraSettings=Object.fromEntries(Object.entries(cameraFields).map(([view,fields])=>[view,Object.fromEntries(fields.map(([key,,min,max,,fallback])=>{const saved=prefs.cameraSettings?.[view]?.[key];return [key,Number.isFinite(saved)?clamp(saved,min,max):fallback];}))]));
follow.pitch=cameraSettings.third.pitch*Math.PI/180;follow.boom=cameraSettings.third.distance;follow.height=cameraSettings.third.height;follow.shoulder=cameraSettings.third.shoulder;follow.sensitivity=cameraSettings.third.sensitivity;
function updateOverheadAngle(){const angle=cameraSettings.overhead.angle*Math.PI/180,length=Math.hypot(28,39.6,28);offset.set(Math.cos(angle)*length/Math.SQRT2,Math.sin(angle)*length,Math.cos(angle)*length/Math.SQRT2);}
updateOverheadAngle();
let thirdPerson=(params.get('view')||prefs.cameraView||'third')!=='overhead',camera=thirdPerson?follow.camera:overheadCamera;
scene.add(new T.HemisphereLight(0xf6ead3,0x7e948b,1.8));
// Indirect fill keeps undersides and shaded routes readable from either camera.
scene.add(new T.AmbientLight(0xdce7df,1.2));
const sun=new T.DirectionalLight(0xffe3b1,3.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=sun.shadow.camera.bottom=-45;sun.shadow.camera.right=sun.shadow.camera.top=45;sun.shadow.camera.far=180;sun.shadow.bias=-.0001;sun.shadow.normalBias=.04;scene.add(sun,sun.target);
const fill=new T.DirectionalLight(0x9ec5d5,.65);fill.position.set(20,12,-30);scene.add(fill);
const world=makeFoldedWorld(scene,state),model=tankModel();scene.add(model.root);world.setThirdPerson(thirdPerson);
const encounterPacing=createEncounterPacing(world.enemies);
const endingCamera=new T.PerspectiveCamera(55,innerWidth/innerHeight,.15,350);
const endingShots=[
  {from:2.5,to:3.7,eye:[3,8,31],at:[0,7,17]},
  {from:3.7,to:4.8,eye:[77,-5.3,-25],at:[77,-4,-37]},
  {from:4.8,to:5.9,eye:[220,52,131],at:[204,47,146]},
  {from:5.9,to:Infinity,eye:[113,-20,35],at:[110,-23,30]}
];
// Rotate the actual trunnion, so pitch does not swing the whole barrel below the hull.
for(const child of model.barrel.children)child.position.y-=2;model.barrel.position.y=2;
const flotation=flotationAssembly(model.body);
const hullMaterials=[];model.root.traverse(m=>{if(m.isMesh&&m.material.color){m.material=m.material.clone();hullMaterials.push({m:m.material,color:m.material.color.clone(),opacity:m.material.opacity,transparent:m.material.transparent,depthWrite:m.material.depthWrite});}});
const laserBeam=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(36),3).setUsage(T.DynamicDrawUsage)),new T.LineBasicMaterial({color:0xffedbe}));scene.add(laserBeam);laserBeam.visible=false;laserBeam.frustumCulled=false;
const laserCores=Array.from({length:6},()=>cylinder(laserBeam,.055,1,0,0,0,mat(0xffedbe,true),6));
const mortarGuide=new T.Line(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(75),3)),new T.LineDashedMaterial({color:0xffe4a9,transparent:true,opacity:.5,dashSize:.6,gapSize:.5}));scene.add(mortarGuide);mortarGuide.visible=false;mortarGuide.frustumCulled=false;
const magneticBeam=new T.Group();scene.add(magneticBeam);magneticBeam.visible=false;
const magneticCore=cylinder(magneticBeam,.07,1,0,0,0,mat(0xc8e7ff,true),8);
const magneticGlow=cylinder(magneticBeam,.22,1,0,0,0,new T.MeshBasicMaterial({color:SIGNAL.magnet,transparent:true,opacity:.35,depthWrite:false}),8);
const magneticRings=Array.from({length:5},()=>{const r=new T.Mesh(new T.TorusGeometry(.36,.055,6,18),mat(SIGNAL.magnet,true));magneticBeam.add(r);return r;});
const magnetEmitter=new T.Group();model.turret.add(magnetEmitter);
for(const x of [.8,1.2])box(magnetEmitter,.12,.18,.6,x,2,1,SIGNAL.magnet);
box(magnetEmitter,.5,.18,.16,1,2,.72,SIGNAL.magnet);
const audio=new FactoryAudio();audio.volume=prefs.volume??.55;audio.music=prefs.music??true;audio.sfx=prefs.sfx??true;
const keys=new Set(),pointer=new T.Vector2(0,0),picker=new T.Raycaster(),aim=new T.Vector3(p.x,p.y+2,p.z-10);
const shots=[],sparks=[],waves=[],mines=[],discovered=new Set(state.discovered);
const projectileGeometry=new T.SphereGeometry(.23,10,6),blastGeometry=new T.RingGeometry(.78,1,40);
let time=0,frames=0,paused=false,mapOpen=false,chosenLayer=Math.round(p.y/8)*8,deathAt=-1,hitAt=-10,rebind=null,resetArmed=false,last=performance.now(),mapAt=-1,moved=false,fired=false,mapped=false;
let pointerLockFailed=false,capturePending=false,hadPointerLock=false,orbiting=false;
let manual=false,pointerOver=false,magnetic=null,magnetLock=null,recoil=0,laserSoundAt=-1,repairAt=-10,wakeAt=-1,magnetSoundAt=-10;
const hp=$('hp');for(let i=0;i<10;i++)hp.append(document.createElement('i'));
const abilityHud=createAbilityHud($('tools'),$('acquired'),keyGlyph);
const cameraToggle=document.createElement('button');cameraToggle.id='camera-toggle';cameraToggle.className='icon-button';cameraToggle.setAttribute('aria-label','切换视角');cameraToggle.innerHTML='<svg viewBox="0 0 24 24"><path d="m3 7 7-4 7 4-7 4zM3 7v8l7 4 7-4V7M10 11v8M18 3l3 3-3 3M21 6h-5"/></svg><kbd></kbd>';$('hud').append(cameraToggle);cameraToggle.onclick=()=>input(bindings.camera);
const lookHint=document.createElement('div');lookHint.id='look-hint';lookHint.setAttribute('role','img');lookHint.setAttribute('aria-label','按住鼠标中键拖动视角，也可点击画面后移动鼠标');lookHint.innerHTML='<kbd></kbd><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg>';keyGlyph(lookHint.querySelector('kbd'),'Mouse1');$('hud').append(lookHint);
let looked=false,minimapBounds;
const threatHud=createThreatHud($('hud'));
const layers=document.createElement('div');layers.id='folded-layers';$('region').append(layers);
for(const [label,delta]of [['▲',1],['▼',-1]]){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-label',delta>0?'查看已发现的上一层':'查看已发现的下一层');b.addEventListener('click',()=>changeLayer(delta));layers.append(b);}
const bars=document.createElement('div');bars.id='folded-layer-bars';layers.insertBefore(bars,layers.lastChild);
const journeyMenu=createJourneyMenu(()=>{});
const ending=createEnding(()=>{ending.hide();respawn();setPause(false);$('settings-button').focus();},()=>{location.href='/';});
const dockProgress=document.createElementNS('http://www.w3.org/2000/svg','svg');dockProgress.id='dock-progress';dockProgress.setAttribute('viewBox','0 0 48 48');dockProgress.setAttribute('aria-hidden','true');dockProgress.innerHTML='<circle class="dock-track" cx="24" cy="24" r="21"/><circle class="dock-fill" cx="24" cy="24" r="21" pathLength="100"/>';$('interaction').append(dockProgress);
$('journey-button').onclick=()=>journeyMenu.show();
document.querySelector('#settings .subtitle').textContent=preview?`独立试玩 · ${freight?'货运路线入口':garden?'花园路线入口':'第一关 · 回收铸造厂'}`:'完整旅程 · 机械城';
$('new-game').textContent=preview?'重新开始当前试玩':'重新开始当前旅程';
$('reset-confirm').textContent=preview?'再次点击将重置当前试玩，完整旅程不受影响。':'再次点击将重置完整旅程，从第一关开始。';

function save(){world.sidePuzzles.persist();state.discovered=[...discovered];write(SAVE_KEY,state);}
let rejectedAt=-10;
function rejectImpact(kind){if(kind!=='laser'||time-rejectedAt>.12){audio.event('armor');rejectedAt=time;}}
function setState(id,kind){
  if(id==='maintenance'){const changed=kind==='cannon'&&!state['maintenance-started']&&!state.maintenance;if(changed){state['maintenance-started']=true;audio.event('lever');save();}else rejectImpact(kind);return changed;}
  if(world.sidePuzzles.targets.some(t=>t.id===id)){const changed=(kind==='cannon'||id==='rail-signal'&&kind==='use')&&world.sidePuzzles.act(id);if(changed){audio.event('lever');save();}else rejectImpact(kind);return changed;}
  if(!releaseFolded(id,kind,p,state,world.lifts,time)){rejectImpact(kind);return false;}
  world.signalRelease(id,time);
  if(!state.relays&&state['relay-west']&&state['relay-east']){state.relays=true;world.signalRelease('relays',time);}
  audio.event('lever');save();return true;
}
function project(x,y,z){const v=new T.Vector3(x,y,z).project(camera);return {x:(v.x*.5+.5)*innerWidth,y:(-.5*v.y+.5)*innerHeight,visible:Math.abs(v.x)<.92&&Math.abs(v.y)<.9&&v.z>=-1&&v.z<=1};}
function updateCamera(dt){
  if(thirdPerson){follow.update(p,dt);focus.set(p.x,p.y,p.z);}
  else {focus.lerp(new T.Vector3(p.x,p.y,p.z),1-Math.exp(-dt*7));camera.position.copy(focus).add(offset);camera.lookAt(focus);camera.updateMatrixWorld();}
  sun.position.copy(focus).add(new T.Vector3(-18,55,16));sun.target.position.copy(focus);sun.target.updateMatrixWorld();world.updateCameraOcclusion(camera,p,0);
}
function updateAim(){
  if(thirdPerson)pointer.set(0,0);
  picker.setFromCamera(pointer,camera);
  const direct=world.cast(picker.ray.origin,picker.ray.direction,300,{aiming:true,extras:mines});
  const hit=p.weapon==='mortar'&&!direct?.target?world.cast(picker.ray.origin,picker.ray.direction,300,{aiming:true,terrainOnly:true}):direct;
  if(thirdPerson){
    if(hit)aim.copy(hit.point);else aim.copy(picker.ray.origin).addScaledVector(picker.ray.direction,150);
    const muzzle=new T.Vector3(p.x,p.y+2,p.z);
    if(aim.clone().sub(muzzle).dot(follow.forward)<1)aim.copy(muzzle).addScaledVector(follow.forward,2);
  }else if(hit?.target||hit?.mirror)aim.copy(hit.point);
  else if(hit){
    if(p.weapon==='mortar')aim.copy(hit.point);
    else {const plane=new T.Plane(new T.Vector3(0,1,0),-hit.point.y-2);picker.ray.intersectPlane(plane,aim);}
  }else picker.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-p.y-2),aim);
  const distance=Math.hypot(aim.x-p.x,aim.z-p.z);
  if(p.weapon==='mortar'){
    const t=mortarTarget(p.x,p.z,aim.x,aim.z);aim.x=t.x;aim.z=t.z;
    // A range-clamped target must land on the selected floor, never an unseen lower one.
    if(distance>MORTAR.range)aim.y=p.y;
  }else aim.y=foldedAimHeight(p,aim);
  p.aim=Math.atan2(aim.x-p.x,aim.z-p.z);
  mortarGuide.visible=p.weapon==='mortar'&&p.hp>0&&!p.endingTime;
  if(mortarGuide.visible){
    const position=mortarGuide.geometry.attributes.position,previous=new T.Vector3(p.x,p.y+2,p.z),next=new T.Vector3(),segment=new T.Vector3();let count=25;
    for(let i=0;i<25;i++){
      const t=i/24;next.set(p.x+(aim.x-p.x)*t,(p.y+2)*(1-t)+aim.y*t+4*MORTAR.height*t*(1-t),p.z+(aim.z-p.z)*t);
      segment.subVectors(next,previous);const length=segment.length(),boundary=i?refugeRayDistance(previous,segment.normalize(),length,world.hives,state):Infinity;
      if(Number.isFinite(boundary)){next.copy(previous).addScaledVector(segment,boundary);count=i+1;}
      position.setXYZ(i,next.x,next.y,next.z);previous.copy(next);if(count!==25)break;
    }
    mortarGuide.geometry.setDrawRange(0,count);
    position.needsUpdate=true;mortarGuide.computeLineDistances();
  }
}
function burst(pos,color=C.yellow,count=8){
  for(let i=0;i<count;i++){
    const mesh=box(scene,.13,.13,.38,pos.x,pos.y,pos.z,mat(color,true),0);
    sparks.push({mesh,velocity:new T.Vector3(Math.sin(i*2.4)*5,2+i%3,Math.cos(i*2.4)*5),age:0});
  }
}
function hurt(amount){if(!refugeAt(p,world.hives,state)&&damagePlayer(p,amount,time)){hitAt=time;audio.event('hit');if(p.hp<=0){deathAt=time;keys.clear();audio.event('death');}}}
function castWeapon(origin,dir,distance,options){
  const hit=world.cast(origin,dir,distance,options),boundary=refugeRayDistance(origin,dir,hit?.distance??distance,world.hives,state);
  return Number.isFinite(boundary)?{point:origin.clone().addScaledVector(dir,boundary),distance:boundary,refuge:true}:hit;
}
function hitEnemy(e,damage,origin,kind='cannon',part=null){
  if(e.hp<=0)return;
  if(refugeAt(origin,world.hives,state)||refugeAt(e,world.hives,state))return;
  alertSquad(e);
  const armored=armorAbsorbs(e,damage,origin,kind,part),dealt=cityDamage(e,damage,origin,kind,part);
  if(armored){e.armor=.2;rejectImpact(kind);if(kind!=='laser'||time-(e.sparkAt||0)>.12){burst(new T.Vector3(e.x,e.y+1.5,e.z),C.lightYellow,6);e.sparkAt=time;}}
  else if(kind!=='laser')audio.event('hit');
  e.hp=Math.max(0,e.hp-dealt);e.flash=.14;
  if(dealt>0&&kind==='mortar'&&!e.persistent)e.stunnedUntil=time+.6;
  if(!e.hp){
    e.deadAt=time;e.warning.visible=false;audio.event('explode');burst(new T.Vector3(e.x,e.y+1,e.z),C.orange,14);
    if(e.persistent){state[e.id]=true;world.signalRelease(e.id,time);if(e.id==='prototype')state['overdrive-return']=true;save();}
  }
}
function updateLaser(dt){
  laserBeam.visible=false;if(p.weapon!=='laser'||!keys.has(bindings.fire)||!p.laser||p.overheated||p.hp<=0)return;
  p.heat=Math.min(100,p.heat+24*dt);p.lastHeat=time;if(p.heat>=100)p.overheated=true;
  let origin=new T.Vector3(p.x,p.y+2,p.z),dir=aim.clone().sub(origin).normalize(),remaining=90;const points=[];
  for(let bounce=0;bounce<6&&remaining>.05;bounce++){
    const hit=castWeapon(origin,dir,remaining,{extras:mines}),end=hit?hit.point:origin.clone().addScaledVector(dir,remaining);points.push(origin.clone(),end.clone());
    if(hit?.refuge){refugeImpact(end,origin);break;}
    if(hit?.mirror){hit.mirror.flash=.15;remaining-=hit.distance;dir.reflect(hit.mirror.normal);origin=end.clone().addScaledVector(dir,.03);continue;}
    if(hit?.target?.mirror&&Math.cos(Math.atan2(origin.x-hit.target.x,origin.z-hit.target.z)-hit.target.aim)>.55){remaining-=hit.distance;dir.reflect(new T.Vector3(Math.sin(hit.target.aim),0,Math.cos(hit.target.aim)));origin=hit.point.clone().addScaledVector(dir,.05);continue;}
    if(hit?.target){const t=hit.target;if(t.kind==='mine')detonateMine(t);else if(t.enemy||t.model)hitEnemy(t.enemy||t,2.5*dt,origin,'laser',t.enemy?t:null);else setState(t.id,'laser');}break;
  }
  if(time-laserSoundAt>.13){audio.event('laser');laserSoundAt=time;}
  laserBeam.geometry.setFromPoints(points);laserBeam.geometry.setDrawRange(0,points.length);laserBeam.visible=true;
  for(let i=0;i<laserCores.length;i++){const core=laserCores[i];core.visible=i*2<points.length;if(core.visible){const a=points[i*2],b=points[i*2+1],delta=b.clone().sub(a);core.position.copy(a).addScaledVector(delta,.5);core.scale.y=delta.length();core.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());}}
  fired=true;
}

function ripple(point,radius,color,life,opacity){
  const mesh=new T.Mesh(blastGeometry,new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide}));
  mesh.rotation.x=-Math.PI/2;mesh.position.copy(point);mesh.position.y+=.08;scene.add(mesh);waves.push({mesh,age:0,radius,life,opacity});return mesh;
}

let refugeImpactAt=-10;
function refugeImpact(point,origin){
  if(time-refugeImpactAt<.3)return;
  refugeImpactAt=time;burst(point,C.mint,8);
  const pulse=ripple(point,1.8,C.mint,.6,.9),normal=origin.clone().sub(point).normalize();
  pulse.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);audio.event('blocked');
}

function impact(hit,shot){
  if(hit.refuge){refugeImpact(hit.point,shot.origin);return;}
  if(hit.blockedTarget&&!shot.mortar){burst(hit.point,0xf5f1d7,7);audio.event('armor');return;}
  burst(hit.point,shot.hostile?C.orange:C.yellow);
  if(shot.hostile){
    if(shot.mineOwner){const floor=foldedSupport(hit.point.x,hit.point.z,hit.point.y,false,world.lifts);if(floor)layMine({id:shot.mineOwner,x:hit.point.x,y:floor.height,z:hit.point.z});return;}
    if(shot.mortar){
      ripple(hit.point,BARRAGE.radius,C.orange,.6,.8);audio.event('explode');
      const delta=new T.Vector3(p.x,p.y+1,p.z).sub(hit.point),distance=delta.length();
      if(distance<BARRAGE.radius&&!world.cast(hit.point.clone().add(new T.Vector3(0,.15,0)),delta.normalize(),Math.max(0,distance-.8),{targets:false}))hurt(8);
      for(const e of world.enemies)if(e.hp>0&&e.id!==shot.owner){
        for(const target of [e,...e.parts.filter(part=>part.hp>0)]){
          const center=new T.Vector3(target.x,target.y+(target.model?1.5:0),target.z),path=center.sub(hit.point),length=path.length();
          if(length<BARRAGE.radius+(target===e?e.radius:0)&&!world.cast(hit.point.clone().addScaledVector(path.clone().normalize(),.05),path.normalize(),Math.max(0,length-.2),{targets:false}))hitEnemy(e,3,shot.origin,'mortar',target===e?null:target);
        }
      }
    }else if(hit.target){const target=hit.target;hitEnemy(target.enemy||target,1,shot.origin,'cannon',target.enemy?target:null);}
    return;
  }
  if(shot.mortar){
    audio.event('explode');
    ripple(hit.point,MORTAR.radius,C.lightYellow,.5,.8);
    for(const e of world.enemies)if(e.hp>0&&new T.Vector3(e.x,e.y+1.5,e.z).distanceTo(hit.point)<MORTAR.radius+e.radius){
      const center=new T.Vector3(e.x,e.y+1.5,e.z),path=center.clone().sub(hit.point),length=path.length();
      if(!world.cast(hit.point.clone().addScaledVector(path.clone().normalize(),.05),path.normalize(),Math.max(0,length-.2),{targets:false}))hitEnemy(e,MORTAR.damage,shot.origin,'mortar');
    }
    for(const e of world.enemies)if(e.hp>0)for(const part of e.parts)if(part.hp>0){const to=new T.Vector3(part.x,part.y,part.z).sub(hit.point),distance=to.length();if(distance<MORTAR.radius&&!world.cast(hit.point,to.normalize(),Math.max(0,distance-.2),{targets:false}))hitEnemy(e,MORTAR.damage,shot.origin,'mortar',part);}
    for(const c of world.controls)if(new T.Vector3(c.x,c.y,c.z).distanceTo(hit.point)<2){
      const to=new T.Vector3(c.x,c.y,c.z).sub(hit.point),length=to.length();
      if(!world.cast(hit.point,to.normalize(),Math.max(0,length-.2),{targets:false})){c.flash=.2;setState(c.id,'mortar');}
    }
  }else if(hit.target){
    if(hit.target.kind==='mine')detonateMine(hit.target);
    else if(hit.target.enemy||hit.target.model)hitEnemy(hit.target.enemy||hit.target,1,shot.origin,'cannon',hit.target.enemy?hit.target:null);
    else {hit.target.flash=.2;setState(hit.target.id,'cannon');}
  }
}
function projectile(origin,dir,mortar=false,hostile=false,heavy=false){
  const material=mat(hostile?0xff783e:0xfff1b0,true),mesh=new T.Mesh(projectileGeometry,material);
  mesh.scale.setScalar(mortar?2:heavy?2.4:hostile?1.65:1.3);
  if(!mortar)box(mesh,.4,.4,2.2,0,0,-.5,material,.1).castShadow=false;
  mesh.position.copy(origin);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),dir);scene.add(mesh);return mesh;
}
function fire(){
  if(p.weapon==='laser')return false;
  const mortar=p.weapon==='mortar';
  if(paused||mapOpen||!shootHeat(p,time,mortar?MORTAR.heat:20,mortar?MORTAR.cooldown:.5))return false;
  const origin=new T.Vector3(p.x,p.y+2,p.z),dir=aim.clone().sub(origin).normalize();
  const mesh=projectile(origin,dir,mortar);
  shots.push({origin:origin.clone(),position:origin.clone(),dir,mesh,mortar,target:aim.clone(),age:0,distance:0});
  burst(origin.clone().addScaledVector(dir,2.6),0xfff1b0,4);
  audio.event(mortar?'mortar':'shot');recoil=.38;fired=true;return true;
}
function enemyPan(e){const yaw=thirdPerson?follow.yaw:Math.PI*1.25;return clamp((-(e.x-p.x)*Math.cos(yaw)+(e.z-p.z)*Math.sin(yaw))/18,-1,1);}
function shootEnemy(e,offset=0,source=null,target=e.lock,delay=0){
  const origin=source?new T.Vector3(source.x,source.y,source.z):new T.Vector3(e.x,e.y+(e.type==='boss'?4:e.guardian?2.8:1.5),e.z),dir=target.clone().sub(origin).normalize();
  if(offset)dir.applyAxisAngle(new T.Vector3(0,1,0),offset);
  const mortar=e.type==='artillery'||e.type==='miner',mesh=projectile(origin,dir,mortar,true,e.guardian||e.type==='boss');
  if(mortar)mesh.material.color.setHex(SIGNAL.magnet);
  let marker=null;
  if(e.type==='artillery'){marker=ring(scene,BARRAGE.radius,.12,target.x,target.y+.15,target.z,mat(C.red,true));}
  shots.push({owner:e.id,marker,delay,duration:e.type==='artillery'?BARRAGE.duration:MORTAR.duration,arc:e.type==='artillery'?BARRAGE.height:MORTAR.height,range:e.id==='keeper'?94:e.type==='sniper'?RAIL.range:55,mineOwner:e.type==='miner'?e.id:null,damage:e.id==='keeper'?7:e.guardian||e.type==='boss'?12:e.type==='sniper'?11:e.type==='skirmisher'?4:6,speed:e.id==='keeper'?Math.max(15,origin.distanceTo(target)/2.5):e.type==='sniper'?RAIL.speed:15,origin:origin.clone(),position:origin.clone(),dir,mesh,mortar,target:target.clone(),hostile:true,age:0,distance:0});audio.event(mortar?'mortar':e.type==='boss'?'foundry-shot':e.guardian?'guard-shot':'welder-shot');
}
function updateShots(dt){
  for(let i=shots.length-1;i>=0;i--){
    const s=shots[i];let next;
    if(s.delay>0){s.delay-=dt;continue;}
    s.age+=dt;
    if(s.captured){scene.remove(s.mesh);s.mesh.material.dispose();if(s.marker){scene.remove(s.marker);s.marker.geometry.dispose();s.marker.material.dispose();}shots.splice(i,1);continue;}
    if(s.mortar){const t=clamp(s.age/(s.duration||MORTAR.duration),0,1);next=s.origin.clone().lerp(s.target,t);next.y+=4*(s.arc||MORTAR.height)*t*(1-t);}
    else next=s.position.clone().addScaledVector(s.dir,dt*(s.hostile?s.speed||15:38));
    const path=next.clone().sub(s.position),distance=path.length();
    let hit=castWeapon(s.position,path.clone().normalize(),distance,{targets:!s.hostile,extras:mines});
    if(s.hostile&&!s.mineOwner){
      const ray=new T.Ray(s.position,path.clone().normalize());
      // Friendly bodies stop a shot before the player; machinery stays out of this query.
      for(const e of world.enemies)if(e.hp>0&&e.id!==s.owner)for(const target of [e,...e.parts.filter(part=>part.hp>0)]){
        const center=new T.Vector3(target.x,target.y+(target.model?1.5:0),target.z),point=ray.intersectSphere(new T.Sphere(center,target.radius),new T.Vector3());
        if(point){const length=point.distanceTo(s.position);if(length<=distance&&(!hit||length<hit.distance))hit={point,distance:length,target};}
      }
      const point=ray.intersectSphere(new T.Sphere(new T.Vector3(p.x,p.y+1.2,p.z),.8),new T.Vector3());
      if(point&&point.distanceTo(s.position)<=distance&&(!hit||point.distanceTo(s.position)<hit.distance)){hurt(s.damage);hit={point,distance:point.distanceTo(s.position)};}
    }
    s.distance+=distance;
    if(hit||s.mortar&&s.age>=(s.duration||MORTAR.duration)||!s.mortar&&s.distance>(s.hostile?s.range||55:24)||s.age>4){
      if(hit||s.mortar&&s.age>=(s.duration||MORTAR.duration))impact(hit||{point:next},s);
      scene.remove(s.mesh);s.mesh.material.dispose();if(s.marker){scene.remove(s.marker);s.marker.geometry.dispose();s.marker.material.dispose();}shots.splice(i,1);
    }else {s.position.copy(next);s.mesh.position.copy(next);s.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),path.normalize());}
  }
}
function target(){
  const pickup=world.pickups.find(q=>!state[q.id]&&(!q.requires||state[q.requires])&&Math.hypot(q.x-p.x,q.z-p.z)<3.5&&Math.abs(q.y-p.y)<.5);if(pickup)return {...pickup,kind:'pickup'};
  const hive=world.hives.find(h=>(!h.requires||state[h.requires])&&Math.hypot(h.x-p.x,h.z-p.z)<3.5&&Math.abs(h.y-p.y)<.5);if(hive)return {...hive,kind:'hive'};
  const signal=world.sidePuzzles.rail.state.moving?world.sidePuzzles.targets.filter(t=>t.id==='rail-signal').map(t=>({...t,kind:'use'})):[];
  const use=[...world.controls,...signal].find(c=>['use','dock'].includes(c.kind)&&!state[c.id]&&(c.kind!=='dock'||state.keeper)&&Math.abs(c.y-1.3-p.y)<.6&&Math.hypot(c.x-p.x,c.z-p.z)<3);if(use)return use;
}
function interact(){
  const t=target();if(!t||p.hp<=0)return false;
  if(t.kind==='pickup'){state[t.id]=p[t.ability||t.id]=true;abilityHud.acquire(t.ability||t.id,time);audio.event('unlock');save();}
  if(t.kind==='hive'){state.anchor=t.id;p.hp=MAX_HP;p.heat=0;p.overheated=false;p.speed=1;p.invincible=time+1.5;repairAt=time;resetEnemies();clearShots();world.pulseHive(t.id);audio.event('repair');save();}
  if(t.kind==='use')setState(t.id,'use');
  return true;
}
function updateLifts(dt){
  stepLifts(world.lifts,state,p,dt,world.enemies);
}
function resetEnemies(){
  encounterPacing.reset();
  for(const e of world.enemies){e.attackCycle=0;e.source=null;e.deploy=0;}
  for(const e of world.enemies){Object.assign(e,e.spawn);e.hp=e.persistent&&state[e.id]?0:e.max;e.phase='idle';e.timer=1.5;e.alertUntil=0;e.lastSeen=null;e.deadAt=null;e.stunnedUntil=0;e.shieldPull=0;e.shieldRemoved=false;e.zone.visible=e.supportBeam.visible=false;if(e.batteryWarning)e.batteryWarning.visible=false;e.model.root.scale.copy(e.baseScale);e.model.root.rotation.z=0;e.model.root.position.set(e.x,e.y,e.z);e.model.root.visible=e.hp>0;e.warning.visible=false;for(const part of e.parts)part.hp=part.max;}
}
function clearShots(){for(const s of [...shots,...waves]){scene.remove(s.mesh);s.mesh.material.dispose();if(s.marker){scene.remove(s.marker);s.marker.geometry.dispose();s.marker.material.dispose();}}shots.length=0;waves.length=0;for(const m of mines){scene.remove(m.root);m.lamp.material.dispose();m.lamp.geometry.dispose();}mines.length=0;}
function respawn(){
  camera=thirdPerson?follow.camera:overheadCamera;world.setThirdPerson(thirdPerson);
  const h=foldedHives.find(h=>h.id===state.anchor);Object.assign(p,h,{hp:MAX_HP,heat:0,overheated:false,deployed:false,afloat:false,speed:1,lastHeat:-10,lastShot:-10,invincible:time+1});
  clearShots();
  resetEnemies();
  p.dockHold=0;p.endingTime=0;ending.hide();$('hud').classList.remove('ending-active');
  for(const l of world.lifts){l.y=l.destination=l.stops[0];l.wait=0;}
  deathAt=-1;keys.clear();focus.set(p.x,p.y,p.z);updateCamera(1);
  repairAt=time;world.pulseHive(h.id,'respawn');audio.event('repair');
}
function alertSquad(enemy){
  encounterPacing.wake(enemy);
  for(const e of world.enemies)if(e.hp>0&&(e===enemy||enemy.encounter&&e.encounter===enemy.encounter)){
    e.alertUntil=time+5;e.lastSeen={x:p.x,y:p.y,z:p.z};
  }
}
function moveEnemy(e,angle,speed,dt){
  for(const turn of [0,.75,-.75]){
    const body={x:e.x,y:e.y,z:e.z,speed:1,deployed:false};
    moveFolded(body,Math.sin(angle+turn)*speed*dt,Math.cos(angle+turn)*speed*dt,state,world.lifts);
    if(refugeAt(body,world.hives,state,REFUGE_CLEARANCE))continue;
    if(Math.hypot(body.x-e.x,body.z-e.z)<Math.abs(speed*dt)*.3)continue;
    if(world.enemies.some(o=>o!==e&&o.hp>0&&Math.abs(o.y-body.y)<2&&Math.hypot(o.x-body.x,o.z-body.z)<e.radius+o.radius+.15))continue;
    e.x=body.x;e.y=body.y;e.z=body.z;e.model.rollWheels(speed*dt*2.4);break;
  }
}
function approachEnemy(e,goal,dt){
  if(Math.abs(goal.y-e.y)>3||Math.hypot(e.x-e.spawn.x,e.z-e.spawn.z)>22)return;
  moveEnemy(e,Math.atan2(goal.x-e.x,goal.z-e.z),ENEMY_KINDS[e.type].speed,dt);
}
function layMine(e){
  if(refugeAt(e,world.hives,state,REFUGE_CLEARANCE))return;
  if(mines.filter(m=>m.owner===e.id).length>=3)return;
  const root=new T.Group();scene.add(root);
  cylinder(root,.6,.22,0,.18,0,SIGNAL.magnet,8);const lamp=ring(root,.65,.07,0,.34,0,mat(C.orange,true));
  const mine={id:`mine-${e.id}-${time}`,owner:e.id,x:e.x,y:e.y,z:e.z,root,lamp,age:0,trigger:0,radius:.7,kind:'mine'};
  root.position.set(e.x,e.y,e.z);mines.push(mine);
}
function detonateMine(m){
  if(m.disarmed)return;m.disarmed=true;
  const pos=new T.Vector3(m.x,m.y+.3,m.z);ripple(pos,3,C.orange,.6,.8);audio.event('explode');
  if(Math.abs(m.y-p.y)<2&&Math.hypot(m.x-p.x,m.z-p.z)<3.4)hurt(7);
  for(const e of world.enemies)if(e.hp>0&&Math.abs(e.y-m.y)<2&&Math.hypot(e.x-m.x,e.z-m.z)<3)hitEnemy(e,2,pos,'mortar');
}
function updateMines(dt){
  for(let i=mines.length-1;i>=0;i--){
    const m=mines[i];m.age+=dt;moveWithConveyor(m,0,0,dt,state,world.lifts,world.enemies);m.root.position.set(m.x,m.y,m.z);
    if(refugeAt(m,world.hives,state,REFUGE_CLEARANCE))m.disarmed=true;
    if(m.age>1&&Math.abs(m.y-p.y)<2&&Math.hypot(m.x-p.x,m.z-p.z)<2.8)m.trigger=Math.max(m.trigger,.001);
    if(m.trigger)m.trigger+=dt;
    m.lamp.scale.setScalar(m.trigger?1+Math.sin(time*25)*.25:1);m.lamp.material.color.setHex(m.disarmed?SIGNAL.open:m.age<1?SIGNAL.ready:C.red);
    if(m.disarmed||m.age>14||m.trigger>.9){
      if(!m.disarmed&&m.trigger>.9)detonateMine(m);
      scene.remove(m.root);m.lamp.material.dispose();m.lamp.geometry.dispose();mines.splice(i,1);
    }
  }
}
function updateFoundry(e){
  const parts=e.parts.filter(part=>part.hp>0);
  if(e.phase==='idle'&&e.timer<=0){
    e.attackCycle=(e.attackCycle||0)+1;e.source=parts[(e.attackCycle-1)%Math.max(1,parts.length)]||null;
    e.aim=Math.atan2(p.x-e.x,p.z-e.z);
    e.lock=new T.Vector3(p.x,p.y+1.2,p.z);e.phase='warn';e.timer=parts.length?1.6:1.9;
    audio.event('press-warn',enemyPan(e));
  }
  if(e.phase==='warn'){
    const source=e.source||{x:e.x,y:e.y+4,z:e.z},origin=new T.Vector3(source.x,source.y,source.z),direction=e.lock.clone().sub(origin).normalize(),points=[];
    for(const offset of [-.18,0,.18])points.push(origin,origin.clone().addScaledVector(direction.clone().applyAxisAngle(new T.Vector3(0,1,0),offset),30));
    e.batteryWarning.visible=true;e.batteryWarning.geometry.setFromPoints(points);e.batteryWarning.geometry.setDrawRange(0,points.length);
    if(e.timer<=0){for(const offset of [-.18,0,.18])shootEnemy(e,offset,e.source);e.phase='vent';e.timer=parts.length?3:3.6;audio.event('vent',enemyPan(e));}
  }else if(e.phase==='vent'&&e.timer<=0){e.phase='idle';e.timer=.8;}
}
function updateKeeper(e){
  const origin=new T.Vector3(e.x,e.y+1.8,e.z),parts=e.parts.filter(p=>p.hp>0);
  if(e.phase==='idle'&&e.timer<=0){
    e.aim=Math.atan2(p.x-e.x,p.z-e.z);e.lock=new T.Vector3(p.x,p.y+1.2,p.z);
    e.attackCycle=(e.attackCycle||0)+1;
    e.attack=parts.length?'batteries':Math.hypot(p.x-e.x,p.z-e.z)<28&&e.attackCycle%2?'sweep':'fan';e.phase='warn';e.timer=e.attack==='sweep'?1.8:1.5;
    e.source=parts[(e.attackCycle-1)%Math.max(1,parts.length)]||null;
    e.sweepSign=(e.sweepSign||1)*-1;audio.event('press-warn',enemyPan(e));
  }
  if(e.phase==='warn'){
    const points=[];
    if(e.attack==='batteries')for(const part of [e.source].filter(part=>part?.hp>0)){
      const source=new T.Vector3(part.x,part.y,part.z),direction=e.lock.clone().sub(source).normalize();
      for(const offset of [-.16,0,.16]){const dir=direction.clone().applyAxisAngle(new T.Vector3(0,1,0),offset),reach=Math.max(30,source.distanceTo(e.lock)+2),hit=world.cast(source,dir,reach,{targets:false});points.push(source,source.clone().addScaledVector(dir,hit?.distance??reach));}
    }else if(e.attack==='fan'){
      origin.y=e.y+4;const direction=e.lock.clone().sub(origin).normalize();
      for(const offset of [-.32,-.16,0,.16,.32]){const dir=direction.clone().applyAxisAngle(new T.Vector3(0,1,0),offset),reach=Math.max(32,origin.distanceTo(e.lock)+2),hit=world.cast(origin,dir,reach,{targets:false});points.push(origin,origin.clone().addScaledVector(dir,hit?.distance??reach));}
    }else for(const offset of [-.8,.8])points.push(origin,origin.clone().add(new T.Vector3(Math.sin(e.aim+offset)*32,0,Math.cos(e.aim+offset)*32)));
    e.batteryWarning.visible=true;e.batteryWarning.geometry.setFromPoints(points);e.batteryWarning.geometry.setDrawRange(0,points.length);
    if(e.timer<=0){
      if(e.attack==='batteries'){
        if(e.source?.hp>0)for(const offset of [-.16,0,.16])shootEnemy(e,offset,e.source);
        e.phase='vent';e.timer=2.8;
      }else if(e.attack==='fan'){
        for(const offset of [-.32,-.16,0,.16,.32])shootEnemy(e,offset);
        e.phase='vent';e.timer=3.4;
      }else {e.phase='sweep';e.timer=2.2;audio.event('vent',enemyPan(e));}
    }
  }else if(e.phase==='sweep'){
    const angle=e.aim+e.sweepSign*(-.8+1.6*(1-e.timer/2.2)),dir=new T.Vector3(Math.sin(angle),0,Math.cos(angle));
    const hit=world.cast(origin,dir,32,{targets:false}),length=hit?hit.distance:32,end=origin.clone().addScaledVector(dir,length);
    e.warning.visible=true;e.warning.geometry.setFromPoints([origin,end]);
    e.flame.visible=true;e.flame.position.copy(origin).addScaledVector(dir,length/2);e.flame.scale.set(.65,length,.65);e.flame.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.clone().negate());
    const dx=p.x-e.x,dz=p.z-e.z,along=dx*dir.x+dz*dir.z,side=Math.abs(dx*dir.z-dz*dir.x);
    if(Math.abs(p.y-e.y)<2&&along>0&&along<length&&side<1.2)hurt(6);
    if(e.timer<=0){e.phase='vent';e.timer=3.4;}
  }else if(e.phase!=='idle'&&e.timer<=0){e.phase='idle';e.timer=.6;}
}
function updateSorter(e,dt){
  if(e.phase==='idle'&&e.timer<=0&&e.readable){e.phase='warn';e.timer=1.6;e.aim=Math.atan2(p.x-e.x,p.z-e.z);audio.event('vent',enemyPan(e));}
  e.zone.visible=e.phase==='warn';
  if(e.zone.visible){e.zone.position.set(e.x,e.y+.12,e.z);e.zone.rotation.y=e.aim;}
  if(e.phase==='warn'||e.phase==='sweep'){
    const angle=e.aim+(e.phase==='warn'?-.9:-.9+1.8*(1-e.timer/2.4)),dir=new T.Vector3(Math.sin(angle),0,Math.cos(angle)),origin=new T.Vector3(e.x,e.y+1.8,e.z);
    const obstruction=world.cast(origin,dir,SORTER_REACH,{targets:false}),reach=obstruction?.distance??SORTER_REACH;
    e.warning.visible=true;e.warning.geometry.setFromPoints([origin,origin.clone().addScaledVector(dir,reach)]);e.warning.material.color.setHex(e.phase==='warn'?C.orange:C.red);e.model.arm.rotation.y=angle-e.aim;e.model.arm.scale.z=Math.max(.1,reach/SORTER_REACH);
    if(e.phase==='sweep'){
      if(obstruction?.object?.userData.sortingCover){
        burst(obstruction.point,C.lightYellow,10);audio.event('armor',enemyPan(e));
        e.phase='vent';e.timer=3.4;e.sweepRight=!e.sweepRight;e.warning.visible=false;return;
      }
      const dx=p.x-e.x,dz=p.z-e.z,along=dx*dir.x+dz*dir.z,side=Math.abs(dx*dir.z-dz*dir.x);
      if(Math.abs(p.y-e.y)<2&&along>2&&along<reach&&side<1.1)hurt(7);
      const cover=sideObstacles.find(s=>s.id==='sorter-cover'),next=cover.x+dt*(e.sweepRight?-5:5);
      if(time>world.sidePuzzles.coverHeldUntil&&next>=116&&next<=138&&!(Math.abs(p.y-cover.y)<3&&p.x>next-1&&p.x<next+cover.w+1&&p.z>cover.z-1&&p.z<cover.z+cover.d+1))cover.x=next;
    }
    if(e.timer<=0){if(e.phase==='warn'){e.phase='sweep';e.timer=2.4;}else{e.phase='vent';e.timer=3.4;e.sweepRight=!e.sweepRight;audio.event('vent',enemyPan(e));}}
  }else if(e.phase==='vent'){
    e.model.arm.scale.z=T.MathUtils.damp(e.model.arm.scale.z,.28,6,dt);
    if(e.timer<=0){e.phase='idle';e.timer=.7;}
  }
}
function updateEnemies(dt){
  const resting=!!refugeAt(p,world.hives,state);
  encounterPacing.update(dt,p,resting);
  for(const battle of expansionBattles)if(!state[battle.id]&&world.enemies.filter(e=>e.battle===battle.battle).every(e=>e.hp<=0)){
    state[battle.id]=true;world.signalRelease(battle.id,time);audio.event('lever');save();
  }
  for(const e of world.enemies){
    e.warning.visible=e.zone.visible=e.supportBeam.visible=false;if(e.batteryWarning)e.batteryWarning.visible=false;if(e.charge)e.charge.root.visible=false;if(e.flame)e.flame.visible=false;
    const beforeDrift={x:e.x,y:e.y,z:e.z};
    moveWithConveyor(e,0,0,dt,state,world.lifts,world.enemies);
    if(refugeAt(e,world.hives,state,REFUGE_CLEARANCE))Object.assign(e,beforeDrift);
    e.model.root.position.set(e.x,e.y,e.z);
    if(e.deployment){e.deployment.visible=e.hp>0&&!e.awake;e.deployment.material.color.setHex(e.deploy?C.lightYellow:C.metal);e.deployment.scale.setScalar(e.deploy?1+Math.sin(time*10)*.1:1);}
    if(!e.hp){if(e.deadAt!=null){const collapse=Math.min(1,(time-e.deadAt)/.45);e.model.root.scale.y=e.baseScale.y*(1-collapse*.7);e.model.root.rotation.z=collapse*.12;for(const {m,color}of e.materials)m.color.copy(color).lerp(new T.Color(C.dark),collapse*.85);}continue;}
    const spec=ENEMY_KINDS[e.type];
    if(!e.awake){e.readable=false;e.model.animate('idle',0,time,dt,false);continue;}
    if(e.guardian)e.aim=Math.atan2(p.x-e.x,p.z-e.z);e.flash=Math.max(0,e.flash-dt);e.armor=Math.max(0,e.armor-dt);
    const origin=new T.Vector3(e.x,e.y+(e.type==='boss'?4:e.guardian?2.8:1.5),e.z),to=new T.Vector3(p.x,p.y+1.2,p.z).sub(origin),distance=to.length();
    const retaliating=e.id==='keeper'&&e.alertUntil>time&&Math.abs(e.y-p.y)<4,engageRange=retaliating?94:Math.max(30,spec.reach);
    if(distance>Math.max(45,engageRange+8)){e.phase='idle';e.timer=1.2;e.readable=false;continue;}
    const view=project(e.x,e.y+1.5,e.z),cameraPath=origin.clone().sub(camera.position);
    e.readable=view.visible&&!world.cast(camera.position,cameraPath.clone().normalize(),cameraPath.length()-1.8,{targets:false,aiming:true});
    const clearSight=!world.cast(origin,to.clone().normalize(),Math.max(0,distance-1),{targets:false});
    const supported=e.type==='artillery'&&e.alertUntil>time||e.type==='repairer'&&woundedAlly(e,world.enemies);
    const committed=['warn','charge','burst','rail','flame','sweep','repair','vent'].includes(e.phase);
    const active=distance<engageRange&&p.hp>0&&!resting&&(clearSight||(supported||committed)&&Math.abs(e.y-p.y)<4);
    if(active&&clearSight)alertSquad(e);
    if(e.stunnedUntil>time){e.phase='stunned';e.timer=.5;}
    else if(!active){
      if(resting){
        e.alertUntil=0;e.lastSeen=null;
        if(spec.speed&&Math.hypot(e.x-e.spawn.x,e.z-e.spawn.z)>1)moveEnemy(e,Math.atan2(e.spawn.x-e.x,e.spawn.z-e.z),spec.speed,dt);
      }
      if(!resting&&p.hp>0&&spec.speed&&time<e.alertUntil&&e.lastSeen&&Math.hypot(e.x-e.lastSeen.x,e.z-e.lastSeen.z)>3)approachEnemy(e,e.lastSeen,dt);
      e.phase='idle';e.timer=1.2;
    }else{
      e.timer-=dt;
      if(e.id==='keeper')updateKeeper(e);
      else if(e.id==='foundry')updateFoundry(e);
      else if(e.id==='sorter')updateSorter(e,dt);
      else if(e.phase==='idle'){
        e.aim=Math.atan2(p.x-e.x,p.z-e.z);
        const ally=e.type==='repairer'?woundedAlly(e,world.enemies):null;
        if(e.type==='repairer'){
          if(ally&&Math.hypot(ally.x-e.x,ally.z-e.z)>8)approachEnemy(e,ally,dt);
          if(!ally||Math.hypot(ally.x-e.x,ally.z-e.z)>10){e.timer=Math.max(e.timer,.2);}
          else e.patient=ally;
        }else if((e.type==='sniper'&&distance<11||e.type==='artillery'&&distance<9||e.type==='miner'&&distance<8)&&Math.hypot(e.x-e.spawn.x,e.z-e.spawn.z)<18)moveEnemy(e,e.aim+Math.PI,spec.speed,dt);
        else if(e.type==='skirmisher'&&distance<20)moveEnemy(e,e.aim+(e.id.length%2?1:-1)*Math.PI/2,spec.speed,dt);
        else if(spec.speed&&!e.guardian&&distance>(e.type==='guard'?5:spec.reach)){approachEnemy(e,p,dt);if(distance>spec.reach)e.timer=Math.max(e.timer,.2);}
        if(e.timer<=0&&canTelegraph(e,world.enemies)){
          const sighting=clearSight?p:e.lastSeen||p;
          e.phase='warn';e.timer=e.guardian?1.8:spec.warn;e.lock=new T.Vector3(sighting.x,['artillery','miner'].includes(e.type)?sighting.y+.05:sighting.y+1.2,sighting.z);
          if(e.type==='miner'){const range=Math.hypot(e.lock.x-e.x,e.lock.z-e.z),fraction=Math.min(1,8/range);e.lock.x=e.x+(e.lock.x-e.x)*fraction;e.lock.z=e.z+(e.lock.z-e.z)*fraction;}
          audio.event('warn',enemyPan(e));
        }
      }else if(e.phase==='warn'){
        if(e.type==='sniper'&&e.timer>RAIL.lockTime&&clearSight){e.lock.set(p.x,p.y+1.2,p.z);e.aim=Math.atan2(p.x-e.x,p.z-e.z);}
        if(e.type==='artillery'){e.zone.visible=true;e.zone.position.copy(e.lock);e.zone.position.y+=.1;e.zone.scale.setScalar(1+Math.sin(time*14)*.06);}
        else if(e.type==='repairer'&&e.patient){e.supportBeam.visible=true;e.supportBeam.geometry.setFromPoints([origin,new T.Vector3(e.patient.x,e.patient.y+1.5,e.patient.z)]);}
        else if(e.type==='welder'){const points=[origin.clone()];for(let i=0;i<=12;i++){const angle=e.aim-.7+i*1.4/12;points.push(origin.clone().add(new T.Vector3(Math.sin(angle)*8,0,Math.cos(angle)*8)));}points.push(origin.clone());e.warning.visible=true;e.warning.geometry.setFromPoints(points);e.warning.geometry.setDrawRange(0,points.length);}
        else {e.warning.visible=true;e.warning.geometry.setFromPoints([origin,e.lock]);}
        if(e.charge){e.charge.root.visible=true;e.charge.root.position.set(e.x,e.y,e.z);e.charge.root.rotation.y=e.aim;}
        if(e.timer<=0){
          if(spec.attack==='charge'){e.phase='charge';e.timer=e.type==='elite'?1.2:.75;}
          else if(spec.attack==='sweep'){e.phase='flame';e.timer=1.8;}
          else if(spec.attack==='repair'){e.phase='repair';e.timer=1.6;}
          else if(spec.attack==='rail'){
            const dir=e.lock.clone().sub(origin).normalize(),hit=world.cast(origin,dir,RAIL.range,{targets:false});
            e.railEnd=origin.clone().addScaledVector(dir,hit?hit.distance:RAIL.range);
            shootEnemy(e);e.phase='rail';e.timer=.18;
          }
          else if(spec.attack==='lob'){
            for(const t of barrageTargets(origin,e.lock))shootEnemy(e,0,null,new T.Vector3(t.x,t.y,t.z),t.delay);
            e.phase='vent';e.timer=spec.recovery;
          }
          else if(spec.attack==='burst'){shootEnemy(e,-.08);e.phase='burst';e.timer=.18;e.burstLeft=2;}
          else {shootEnemy(e,spec.attack==='reflect'?-.1:0);if(spec.attack==='reflect')shootEnemy(e,.1);e.phase='vent';e.timer=e.guardian?3.4:spec.recovery;}
        }
      }else if(e.phase==='charge'){
        const oldX=e.x,oldZ=e.z,speed=e.type==='elite'?19:13;
        const body={x:e.x,y:e.y,z:e.z,speed:1};moveFolded(body,Math.sin(e.aim)*speed*dt,Math.cos(e.aim)*speed*dt,state,world.lifts);
        if(!refugeAt(body,world.hives,state,REFUGE_CLEARANCE)){e.x=body.x;e.z=body.z;e.y=body.y;}
        if(e.timer<=0||Math.hypot(e.x-oldX,e.z-oldZ)<.001){e.phase='vent';e.timer=spec.recovery;}
      }else if(e.phase==='burst'){
        if(e.timer<=0){shootEnemy(e,e.burstLeft===2?0:.08);e.burstLeft--;e.timer=.18;if(!e.burstLeft){e.phase='vent';e.timer=spec.recovery;}}
      }else if(e.phase==='rail'){
        e.warning.visible=true;e.warning.geometry.setFromPoints([origin,e.railEnd]);
        if(e.timer<=0){e.phase='vent';e.timer=spec.recovery;}
      }else if(e.phase==='flame'){
        const angle=e.aim-.7+(1.8-e.timer)/1.8*1.4,dir=new T.Vector3(Math.sin(angle),0,Math.cos(angle));
        const hit=world.cast(origin,dir,8,{targets:false}),length=hit?hit.distance:8,end=origin.clone().addScaledVector(dir,length);
        e.warning.visible=true;e.warning.geometry.setFromPoints([origin,end]);e.warning.geometry.setDrawRange(0,2);
        e.flame.visible=true;e.flame.position.copy(origin).addScaledVector(dir,length/2);e.flame.scale.set(1,length,1);e.flame.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.clone().negate());
        const across=to.x*dir.x+to.z*dir.z,side=Math.abs(to.x*dir.z-to.z*dir.x);
        if(Math.abs(p.y-e.y)<2&&across>0&&across<length&&side<1)hurt(5);
        if(time-(e.flameAt||0)>.12){burst(end,C.orange,3);e.flameAt=time;}
        if(e.timer<=0){e.phase='vent';e.timer=spec.recovery;}
      }else if(e.phase==='repair'){
        const ally=e.patient;
        if(ally?.hp>0){const end=new T.Vector3(ally.x,ally.y+1.5,ally.z),path=end.clone().sub(origin);if(path.length()<11&&!world.cast(origin,path.clone().normalize(),path.length()-.8,{targets:false})){ally.hp=Math.min(ally.max,ally.hp+dt*.8);e.supportBeam.visible=true;e.supportBeam.geometry.setFromPoints([origin,end]);}}
        if(e.timer<=0){e.phase='vent';e.timer=spec.recovery;}
      }else if(e.timer<=0){e.phase='idle';e.timer=.6+(e.id.length%3)*.2;}
    }
    if(active&&e.type==='skirmisher'&&['burst','vent'].includes(e.phase)&&Math.hypot(e.x-e.spawn.x,e.z-e.spawn.z)<18)moveEnemy(e,e.aim+(e.id.length%2?1:-1)*Math.PI/2,spec.speed*.5,dt);
    if(Math.abs(p.y-e.y)<2&&Math.hypot(p.x-e.x,p.z-e.z)<e.radius+.8){
      if(time-e.ramAt>.5){
        e.ramAt=time;const damage=cityContact(p,e);
        if(damage){hitEnemy(e,damage,new T.Vector3(p.x,p.y,p.z),redContact(p)?'red':'ram');audio.event('ram');if(!redContact(p)&&p.speed<3.19)p.speed=1;}
        else hurt(p.speed>=1.3&&e.type==='guard'?5:4);
      }
      // A surviving body stays solid between damage ticks; engine speed is not phasing.
      if(e.hp>0){const distance=Math.hypot(p.x-e.x,p.z-e.z),angle=distance>.001?Math.atan2(p.x-e.x,p.z-e.z):p.heading+Math.PI,overlap=e.radius+.81-distance;moveFolded(p,Math.sin(angle)*overlap,Math.cos(angle)*overlap,state,world.lifts);p.speed=1;}
    }
    e.model.root.position.set(e.x,e.y,e.z);e.model.turret.rotation.y=e.aim;e.model.body.rotation.y=e.aim;
    animateEnemy(e,time,dt,active);
    if(e.magneticShield){e.model.frontArmor.visible=!e.shieldRemoved;e.model.frontArmor.position.z=1.05+e.shieldPull*.9;e.model.frontArmor.rotation.z=Math.sin(time*40)*e.shieldPull*.1;}
  }
}
function updateMagnet(dt){
  magnetic=null;magneticBeam.visible=false;magnetEmitter.visible=p.magnet;
  if(!p.magnet||!keys.has(bindings.magnet)||p.hp<=0){if(magnetLock?.id==='sorting-cover')save();magnetLock=null;return;}
  const origin=new T.Vector3(p.x,p.y+2,p.z),aimDir=aim.clone().sub(origin).normalize();
  const candidates=[...world.sidePuzzles.targets.filter(c=>c.kind==='magnet'),...world.controls.filter(c=>c.kind==='magnet'&&!state[c.id]),...world.enemies.filter(e=>(e.magneticShield&&!e.shieldRemoved||magnetPullable(e))&&e.hp>0&&!refugeAt(p,world.hives,state)),...mines.filter(m=>!m.disarmed),...shots.filter(s=>s.hostile&&s.mortar).map(s=>({kind:'shell',id:'shell',shot:s,...s.position}))];
  const selected=candidates.map(c=>{const pos=new T.Vector3(c.x,c.y+(c.model?1.5:0),c.z),delta=pos.clone().sub(origin);return {c,pos,delta,locked:c===magnetLock,distance:delta.length(),alignment:delta.clone().normalize().dot(aimDir)};})
    .filter(q=>q.distance<13&&q.alignment>(q.locked?.75:.95)).sort((a,b)=>Number(b.locked)-Number(a.locked)||b.alignment-a.alignment||a.distance-b.distance)
    .find(q=>{const h=world.cast(origin,q.delta.clone().normalize(),q.distance,{extras:mines});return !h||h.target===q.c||h.distance>q.distance-.8;});
  const c=p.overheated?null:selected?.c;
  magnetLock=c||null;
  let end=selected&&!p.overheated?selected.pos:origin.clone().addScaledVector(aimDir,p.overheated?2:13);
  if(!c){const delta=end.clone().sub(origin),hit=world.cast(origin,delta.clone().normalize(),delta.length());if(hit)end=hit.point;}
  const axis=end.clone().sub(origin),length=axis.length(),dir=axis.clone().normalize();
  magnetic=c?.id||(p.overheated?'blocked':'search');magneticBeam.visible=true;
  for(const shaft of [magneticCore,magneticGlow]){shaft.position.copy(origin).addScaledVector(axis,.5);shaft.scale.y=length;shaft.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir);}
  magneticGlow.material.color.setHex(p.overheated?C.red:SIGNAL.magnet);
  for(let i=0;i<magneticRings.length;i++){const t=(i/5+time*(c?-1.4:1.4))%1;const u=(t+1)%1,r=magneticRings[i];r.position.copy(origin).addScaledVector(axis,u);r.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),dir);r.scale.setScalar(c?1:1+u*1.5);r.material.color.setHex(p.overheated?C.red:SIGNAL.magnet);}
  if(time-magnetSoundAt>.7){audio.event(p.overheated?'blocked':'magnet');magnetSoundAt=time;}
  if(p.overheated)return;
  p.heat=Math.min(100,p.heat+(c?12:3)*dt);p.lastHeat=time;if(p.heat>=100)p.overheated=true;
  if(!c)return;
  if(c.id==='sorting-cover')world.sidePuzzles.pullCover(dt,p,world.enemies,time);
  else if(c.model&&magnetPullable(c)){
    const body={x:c.x,y:c.y,z:c.z,speed:1};
    if(length>c.radius+1.4)moveFolded(body,-dir.x*5*dt,-dir.z*5*dt,state,world.lifts);
    if(!refugeAt(body,world.hives,state,REFUGE_CLEARANCE)){c.x=body.x;c.y=body.y;c.z=body.z;}
    c.stunnedUntil=time+.2;alertSquad(c);
  }else if(c.model){
    c.shieldPull=Math.min(1,c.shieldPull+dt/ .7);c.stunnedUntil=time+.2;
    if(c.shieldPull>=1){c.shieldRemoved=true;c.stunnedUntil=time+2.2;audio.event('armor');const fragment=box(scene,1.8,1.2,.25,c.x,c.y+1.5,c.z,mat(SIGNAL.magnet));sparks.push({mesh:fragment,velocity:origin.clone().sub(fragment.position).normalize().multiplyScalar(18),age:0});}
  }else if(c.kind==='mine'){
    c.pull=(c.pull||0)+dt;const body={x:c.x,y:c.y,z:c.z,speed:1};moveFolded(body,-dir.x*5*dt,-dir.z*5*dt,state,world.lifts);c.x=body.x;c.z=body.z;
    if(c.pull>.4){c.disarmed=true;burst(new T.Vector3(c.x,c.y+.5,c.z),SIGNAL.magnet,6);audio.event('lever');}
  }else if(c.kind==='shell'){c.shot.captured=true;burst(end,SIGNAL.magnet,8);audio.event('armor');}
  else {c.pull=(c.pull||0)+dt;c.moving.position.z=Math.min(.9,c.pull);c.root.rotation.z=Math.sin(time*30)*.08;if(c.pull>.6){setState(c.id,'magnet');audio.event('lever');c.root.rotation.z=0;}}
}
function advance(dt){
  if(paused||mapOpen)return;time+=dt;
  if(deathAt>=0){if(time-deathAt>2.5)respawn();return;}
  if(p.endingTime){
    p.endingTime+=dt;updateLifts(dt);audio.update(time,p,false,'r7-furnace',false,false);
    const shot=endingShots.find(s=>p.endingTime>=s.from&&p.endingTime<s.to);
    if(shot){
      if(camera!==endingCamera){camera=endingCamera;world.setThirdPerson(true);}endingCamera.aspect=innerWidth/innerHeight;endingCamera.updateProjectionMatrix();
      const tenderShot=shot===endingShots.at(-1),at=tenderShot?world.sidePuzzles.delivery.position:shot.at,eye=tenderShot?[at[0]+3,at[1]+4,at[2]+5]:shot.eye;
      camera.position.set(...eye);camera.lookAt(new T.Vector3(...at));camera.updateMatrixWorld();
      const view={...p,x:at[0],y:at[1],z:at[2]};sun.position.set(view.x-18,view.y+55,view.z+16);sun.target.position.set(view.x,view.y,view.z);sun.target.updateMatrixWorld();world.update(dt,time,view,camera);
      audio.environment(time,view,world.presentation.region,state,Math.PI);
    }else world.update(dt,time,p,camera);
    for(const {m,color}of hullMaterials)m.color.copy(color).lerp(new T.Color(0xe99955),Math.min(.55,p.endingTime*.25));model.radiator.material.color.setHex(C.orange);
    model.antenna.rotation.z=Math.sin(p.endingTime*2)*Math.max(0,.18-p.endingTime*.08);
    if(p.endingTime>=7&&!ending.visible){paused=true;keys.clear();audio.update(time,p,false,'r3-garden',true);audio.event('ending');ending.show();if(document.pointerLockElement)document.exitPointerLock();}
    return;
  }
  const dock=target();
  const walking=[bindings.up,bindings.down,bindings.left,bindings.right].some(k=>keys.has(k));
  p.dockHold=dock?.kind==='dock'&&keys.has(bindings.repair)&&!walking?(p.dockHold||0)+dt:0;
  if(p.dockHold){p.x*=Math.exp(-dt*2.5);p.z*=Math.exp(-dt*2.5);p.heading+=angleDelta(p.heading,Math.PI)*Math.min(1,dt*4);}
  if(p.dockHold>=2){p.endingTime=.001;state.endingSeen=true;state.anchor='last-refuge';save();keys.clear();laserBeam.visible=magneticBeam.visible=mortarGuide.visible=false;for(const s of shots){scene.remove(s.mesh);s.mesh.material.dispose();if(s.marker){scene.remove(s.marker);s.marker.geometry.dispose();s.marker.material.dispose();}}shots.length=0;audio.event('unlock');return;}
  p.pumpPressure=Math.abs(p.y+8)<.5&&Math.hypot(p.x-58,p.z-4)<1.5?Math.min(1,(p.pumpPressure||0)+dt):0;
  updateLifts(dt);
  const horizontal=Number(keys.has(bindings.right))-Number(keys.has(bindings.left)),vertical=Number(keys.has(bindings.down))-Number(keys.has(bindings.up));
  const move=thirdPerson?cameraMovement(horizontal,vertical,follow.yaw):screenMovement(horizontal,vertical);
  const moving=!!(move.x||move.z),wasOverheated=p.overheated;updateHeat(p,dt,time,keys.has(bindings.overdrive),moving);
  const hotFloor=expansionHeat.find(q=>Math.abs(q.y-p.y)<.5&&inRect(p.x,p.z,q));
  if(hotFloor&&!refugeAt(p,world.hives,state)){p.heat=Math.min(100,p.heat+hotFloor.heat*dt);p.lastHeat=time;if(p.heat>=100)p.overheated=true;}
  if(wasOverheated&&!p.overheated)audio.event('ready');
  const breakable=foldedSolids.filter(s=>s.red||s.phoenix||['launch','optics','pressure'].includes(s.id)),before=breakable.map(s=>state[s.id]),oldX=p.x,oldZ=p.z;
  const travelScale=p.deployed?(p.afloat?1.15:FLOTATION.speed):1;
  const impactSpeed=p.speed;
  moveWithConveyor(p,move.x*BASE_SPEED*p.speed*travelScale*dt,move.z*BASE_SPEED*p.speed*travelScale*dt,dt,state,world.lifts,world.enemies);
  if(before.some((v,i)=>v!==state[breakable[i].id])){audio.event('ram');burst(new T.Vector3(p.x,p.y+1,p.z),C.orange,18);save();}
  if(moving){p.heading+=angleDelta(p.heading,Math.atan2(move.x,move.z))*Math.min(1,dt*12);moved=true;}
  if(moving&&world.sidePuzzles.pushCarrier(p,impactSpeed)){audio.event('ram');save();}
  if(world.sidePuzzles.update(dt,p,world.enemies)) {audio.event('lever');save();}
  updateCamera(dt);world.update(dt,time,p,camera);updateAim();
  if(keys.has(bindings.fire))fire();updateLaser(dt);updateMagnet(dt);updateEnemies(dt);updateShots(dt);updateMines(dt);if(!wasOverheated&&p.overheated)audio.event('heat');
  model.root.position.set(p.x,p.y+(p.afloat?-.12:0),p.z);model.body.rotation.y=p.heading;model.turret.rotation.y=p.aim;
  const pitch=p.weapon==='mortar'?.4:Math.atan2(aim.y-p.y-2,Math.hypot(aim.x-p.x,aim.z-p.z));model.barrel.rotation.x=-pitch;
  recoil=Math.max(0,recoil-dt*2);model.barrel.position.z=-recoil;model.rollWheels(Math.hypot(p.x-oldX,p.z-oldZ)*2.4);
  for(const {m,color,opacity,transparent,depthWrite}of hullMaterials){const fade=thirdPerson?clamp((follow.distance-1.25)/1.75,0,1):1;m.opacity=opacity*fade;m.transparent=transparent||fade<1;m.depthWrite=depthWrite&&fade===1;m.color.copy(color).lerp(new T.Color(C.red),redContact(p)?.75:0);if(time-repairAt<1.5)m.color.lerp(new T.Color(C.mint),Math.max(0,1-(time-repairAt)/1.5)*.65);}
  flotation.update(p.deployed,time,moving);model.radiator.material.color.setHex(p.overheated?C.red:C.orange);
  for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.age+=dt;s.velocity.y-=dt*14;s.mesh.position.addScaledVector(s.velocity,dt);if(s.age>.4){scene.remove(s.mesh);s.mesh.material.dispose();sparks.splice(i,1);}}
  if(p.afloat&&moving&&Math.hypot(p.x-oldX,p.z-oldZ)>.01&&time-wakeAt>.18){ripple(new T.Vector3(p.x,p.y,p.z),2.6,0xd9f3e6,1.1,.28);wakeAt=time;}
  for(let i=waves.length-1;i>=0;i--){const w=waves[i];w.age+=dt;w.mesh.scale.setScalar(w.radius*Math.min(1,w.age/(w.life*.4)));w.mesh.material.opacity=w.opacity*Math.max(0,1-w.age/w.life);if(w.age>=w.life){scene.remove(w.mesh);w.mesh.material.dispose();waves.splice(i,1);}}
  const pickup=target();if(pickup?.kind==='pickup'&&Math.hypot(pickup.x-p.x,pickup.z-p.z)<2.6)interact();
  const support=foldedSupport(p.x,p.z,p.y,p.deployed,world.lifts);let learned=false;
  for(const d of foldedDecks)if(!discovered.has(d.id)&&(Math.abs(deckHeight(d,clamp(p.z,d.z,d.z+d.d))-p.y)<3&&Math.hypot(p.x-clamp(p.x,d.x,d.x+d.w),p.z-clamp(p.z,d.z,d.z+d.d))<12)){discovered.add(d.id);learned=true;}
  if(support&&!discovered.has(support.id)){discovered.add(support.id);learned=true;}if(!state['inner-transit']&&p.circulation&&p.y<=-39.9&&p.x>259&&p.x<273&&p.z<16){state['inner-transit']=true;world.signalRelease('inner-transit',time);audio.event('lever');learned=true;}if(learned)save();
  const region=world.presentation.region,area={foundry:'r1-foundry',transit:'r2-transit',garden:'r3-garden',optics:'r4-optics',testworks:'r5-testworks',circulation:'r6-circulation',furnace:'r7-furnace'}[region];
  audio.update(time,p,world.enemies.some(e=>e.phase==='warn'),area,false,moving);audio.environment(time,p,region,state,thirdPerson?follow.yaw:Math.PI*1.25);
}

function knownLayers(){return [...new Set(foldedDecks.filter(d=>discovered.has(d.id)).flatMap(d=>[d.y,d.y+(d.rise||0)]))].sort((a,b)=>a-b);}
function changeLayer(delta){const known=knownLayers(),i=known.indexOf(chosenLayer);chosenLayer=known[clamp(i+delta,0,known.length-1)];drawMap(true);}
let mapLinks=[];
function drawMap(large=false){
  if(large)mapLinks=[];
  const canvas=large?$('region-map'):$('minimap'),ctx=canvas.getContext('2d');if(large){canvas.width=innerWidth;canvas.height=innerHeight;}
  const w=canvas.width,h=canvas.height,known=foldedDecks.filter(d=>discovered.has(d.id)),layer=large?chosenLayer:Math.round(p.y/8)*8;
  const onLayer=d=>layer>=Math.min(d.y,d.y+(d.rise||0))&&layer<=Math.max(d.y,d.y+(d.rise||0));
  const framed=large?known.filter(onLayer):known;
  const x0=Math.min(...framed.map(d=>d.x))-8,x1=Math.max(...framed.map(d=>d.x+d.w))+8,z0=Math.min(...framed.map(d=>d.z))-8,z1=Math.max(...framed.map(d=>d.z+d.d))+8;
  const scale=large?Math.min((w-160)/(x1-x0),(h-100)/(z1-z0))/Math.SQRT2:3,ox=large?w/2-(x0+x1)/2*scale:w/2-p.x*scale,oz=large?h/2-(z0+z1)/2*scale:h/2-p.z*scale;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#102b2e';ctx.fillRect(0,0,w,h);
  // The minimap follows the driving camera; the full map keeps a stable orientation.
  ctx.save();ctx.translate(w/2,h/2);ctx.rotate(thirdPerson&&!large?follow.yaw+Math.PI:Math.PI/4);ctx.translate(-w/2,-h/2);
  for(const d of known){const current=layer>=Math.min(d.y,d.y+(d.rise||0))&&layer<=Math.max(d.y,d.y+(d.rise||0));ctx.globalAlpha=current?1:Math.abs(d.y-layer)<=8?.08:0;ctx.fillStyle=d.water?'#4e8587':'#829185';ctx.strokeStyle='#c1c7a0';ctx.lineWidth=1;ctx.fillRect(ox+d.x*scale,oz+d.z*scale,d.w*scale,d.d*scale);ctx.strokeRect(ox+d.x*scale,oz+d.z*scale,d.w*scale,d.d*scale);}
  ctx.globalAlpha=1;
  function mapIcon(id,x,z,color,size=14){
    ctx.save();ctx.translate(ox+x*scale,oz+z*scale);ctx.rotate(-(thirdPerson&&!large?follow.yaw+Math.PI:Math.PI/4));ctx.fillStyle='#102b2e';ctx.fillRect(-size/2-2,-size/2-2,size+4,size+4);ctx.scale(size/48,size/48);ctx.translate(-24,-24);ctx.strokeStyle=color;ctx.lineWidth=5;ctx.stroke(new Path2D(abilityIcon(id)));ctx.restore();
  }
  const seen=(x,y,z)=>known.some(d=>inRect(x,z,d,2)&&Math.abs(deckHeight(d,clamp(z,d.z,d.z+d.d))-y)<3);
  // Draw actual same-floor barriers, so floor outlines do not promise a passage.
  ctx.fillStyle='#263f40';ctx.strokeStyle='#c1c7a0';ctx.lineWidth=1;
  for(const wall of [...foldedArchitecture.solids,...world.walls.filter(w=>w.permanent),...sideObstacles]){
    if(wall.y>layer+1.5||wall.y+wall.h<layer+.4||!seen(wall.x+wall.w/2,layer,wall.z+wall.d/2))continue;
    ctx.fillRect(ox+wall.x*scale,oz+wall.z*scale,wall.w*scale,wall.d*scale);ctx.strokeRect(ox+wall.x*scale,oz+wall.z*scale,wall.w*scale,wall.d*scale);
  }
  // Reveal only the visited portion of a circuit, never unexplored destinations.
  for(const feed of world.controlFeeds){
    ctx.strokeStyle=state[feed.id]?'#85db58':'#f3d250';ctx.lineWidth=large?1.5:1;ctx.globalAlpha=.7;
    for(let i=1;i<feed.points.length;i++){const a=feed.points[i-1],b=feed.points[i];if(Math.abs(a[1]-layer)>4||Math.abs(b[1]-layer)>4||!seen(...a)||!seen(...b))continue;ctx.beginPath();ctx.moveTo(ox+a[0]*scale,oz+a[2]*scale);ctx.lineTo(ox+b[0]*scale,oz+b[2]*scale);ctx.stroke();}
  }
  ctx.globalAlpha=1;
  const markedGates=new Set();
  for(const wall of world.walls)if(!wall.permanent&&seen(wall.x+wall.w/2,wall.y,wall.z+wall.d/2)&&Math.abs(wall.y-layer)<5){
    ctx.strokeStyle=state[wall.id]?'#85db58':'#f3d250';ctx.lineWidth=state[wall.id]?1:3;
    ctx.beginPath();if(wall.w>wall.d){ctx.moveTo(ox+wall.x*scale,oz+(wall.z+wall.d/2)*scale);ctx.lineTo(ox+(wall.x+wall.w)*scale,oz+(wall.z+wall.d/2)*scale);}else {ctx.moveTo(ox+(wall.x+wall.w/2)*scale,oz+wall.z*scale);ctx.lineTo(ox+(wall.x+wall.w/2)*scale,oz+(wall.z+wall.d)*scale);}ctx.stroke();
    const ability=gateAbility(wall);if(ability&&!state[wall.id]&&!markedGates.has(wall.id)){mapIcon(ability,wall.x+wall.w/2,wall.z+wall.d/2,ability==='magnet'?'#82bdff':'#ffe4a9');markedGates.add(wall.id);}
  }
  for(const l of world.lifts)if(l.stops.includes(layer)&&l.stops.some(y=>seen(l.x+l.w/2,y,l.z+l.d/2))){ctx.strokeStyle=state[l.lock||l.id]?'#a6e3cd':'#e8bd62';ctx.lineWidth=2;ctx.strokeRect(ox+l.x*scale,oz+l.z*scale,l.w*scale,l.d*scale);const x=ox+(l.x+l.w/2)*scale,z=oz+(l.z+l.d/2)*scale;ctx.beginPath();ctx.moveTo(x,z-6);ctx.lineTo(x,z+6);ctx.moveTo(x-3,z-3);ctx.lineTo(x,z-6);ctx.lineTo(x+3,z-3);ctx.moveTo(x-3,z+3);ctx.lineTo(x,z+6);ctx.lineTo(x+3,z+3);ctx.stroke();
    const destination=l.stops.find(y=>y!==layer);
    if(large&&knownLayers().includes(destination)){const point=ctx.getTransform().transformPoint(new DOMPoint(x,z));mapLinks.push({x:point.x,y:point.y,destination});}
  }
  for(const c of world.controls)if(c.kind!=='dock'&&Math.abs(c.y-1.3-layer)<4&&seen(c.x,c.y-1.3,c.z)){
    const x=ox+c.x*scale,z=oz+c.z*scale;ctx.strokeStyle=state[c.id]?'#85db58':c.kind==='magnet'?'#328fff':'#f3d250';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,z,4,0,Math.PI*2);ctx.stroke();if(!state[c.id]){ctx.beginPath();ctx.moveTo(x-3,z);ctx.lineTo(x+3,z);ctx.moveTo(x,z-3);ctx.lineTo(x,z+3);ctx.stroke();}
  }
  for(const q of world.pickups)if(!state[q.id]&&(!q.requires||state[q.requires])&&Math.abs(q.y-layer)<1&&seen(q.x,q.y,q.z))mapIcon(q.ability||q.id,q.x,q.z,'#ffe09a',18);

  for(const h of world.hives)if(known.some(d=>inRect(h.x,h.z,d)&&Math.abs(deckHeight(d,h.z)-h.y)<.5)){ctx.globalAlpha=h.y===layer?1:.2;ctx.strokeStyle='#b5ffe0';ctx.beginPath();ctx.arc(ox+h.x*scale,oz+h.z*scale,5,0,Math.PI*2);ctx.stroke();}
  ctx.globalAlpha=1;ctx.fillStyle='#ffe19b';ctx.save();ctx.translate(ox+p.x*scale,oz+p.z*scale);ctx.rotate(-p.heading);ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(-4,-4);ctx.lineTo(4,-4);ctx.closePath();ctx.fill();ctx.restore();ctx.restore();
  if(large){bars.replaceChildren();for(const y of knownLayers().reverse()){const b=document.createElement('button');b.className=`layer-bar${y===layer?' selected':''}${y===Math.round(p.y/8)*8?' player-layer':''}`;b.setAttribute('aria-label',`查看高度 ${y} 的楼层`);b.onclick=()=>{chosenLayer=y;drawMap(true);};bars.append(b);}layers.firstChild.disabled=layer===knownLayers().at(-1);layers.lastChild.disabled=layer===knownLayers()[0];}
}
function mapConnection(event){const bounds=$('region-map').getBoundingClientRect();return mapLinks.find(l=>Math.hypot(l.x-(event.clientX-bounds.left),l.y-(event.clientY-bounds.top))<18);}
$('region-map').addEventListener('mousemove',event=>{$('region-map').style.cursor=mapConnection(event)?'pointer':'default';});
$('region-map').addEventListener('click',event=>{const connection=mapConnection(event);if(connection){chosenLayer=connection.destination;drawMap(true);}});
function setMap(value){mapOpen=value;keys.clear();if(value&&document.pointerLockElement)document.exitPointerLock();if(!value)captureMouse();$('region').hidden=!value;$('minimap-wrap').hidden=value;if(!value)minimapBounds=$('minimap-wrap').getBoundingClientRect();if(value){mapped=true;const known=knownLayers();chosenLayer=known.reduce((a,b)=>Math.abs(b-p.y)<Math.abs(a-p.y)?b:a);drawMap(true);}audio.update(time,p,false,'r2-transit',true);}
function hud(){
  $('hud').classList.toggle('ending-active',!!p.endingTime);
  const boss=world.enemies.find(e=>e.hp>0&&(e.type==='boss'||e.guardian)&&e.readable&&Math.abs(p.y-e.y)<4&&Math.hypot(p.x-e.x,p.z-e.z)<30);$('boss-health').style.display=boss&&!p.endingTime?'flex':'none';if(boss)$('boss-health').querySelector('span').style.width=`${boss.hp/boss.max*100}%`;
  [...hp.children].forEach((e,i)=>e.className=p.hp<=i*5?'empty':p.hp<(i+1)*5?'half':'');
  $('status').classList.toggle('critical',p.hp>0&&p.hp<=15);
  $('heat').style.strokeDashoffset=String(100-p.heat);$('reticle').style.setProperty('--heat-color',`hsl(${48-40*(p.overheated?1:p.heat/100)} 100% ${82-15*p.heat/100}%)`);
  $('reticle').classList.toggle('hot',p.overheated);$('reticle').classList.toggle('mortar',p.weapon==='mortar');
  // The cursor expresses intent; only the barrel and shot obey physical aim limits.
  $('reticle').style.left=`${(pointer.x+1)*.5*innerWidth}px`;$('reticle').style.top=`${(1-pointer.y)*.5*innerHeight}px`;$('reticle').style.display=pointerOver&&!paused&&!mapOpen&&p.hp>0&&!p.endingTime?'block':'none';
  abilityHud.update(p,time,magnetic);
  lookHint.hidden=!thirdPerson||looked||!!document.pointerLockElement||paused||mapOpen||p.hp<=0||!!p.endingTime;
  const cursorX=(pointer.x+1)*.5*innerWidth,cursorY=(1-pointer.y)*.5*innerHeight;
  $('minimap-wrap').classList.toggle('aim-through',!thirdPerson&&pointerOver&&!paused&&!mapOpen&&!!minimapBounds&&cursorX>minimapBounds.left-28&&cursorX<minimapBounds.right+28&&cursorY>minimapBounds.top-28&&cursorY<minimapBounds.bottom+28);
  const warningPhases=['warn','charge','burst','rail','flame','sweep'];
  const threats=world.enemies.filter(e=>e.hp>0&&!e.readable&&warningPhases.includes(e.phase)&&e.type!=='repairer').map(e=>{
    const dx=e.x-p.x,dz=e.z-p.z,yaw=thirdPerson?follow.yaw:Math.PI*1.25;
    return {angle:yaw-Math.atan2(dx,dz),distance:Math.hypot(dx,dz)};
  }).sort((a,b)=>a.distance-b.distance);
  threatHud(threats,paused||mapOpen||p.hp<=0||!!p.endingTime);
  $('overdrive').style.opacity=p.overdrive?1:0;$('overdrive').querySelector('span').style.width=`${(p.speed-1)/(p.phoenix?2.2:.6)*100}%`;
  const near=target(),v=near?project(near.x,near.y+3,near.z):null;$('interaction').style.display=near&&!paused&&!mapOpen&&p.hp>0&&!p.endingTime?'block':'none';if(v&&!v.visible)$('interaction').style.display='none';if(v){$('interaction').style.left=`${v.x}px`;$('interaction').style.top=`${v.y}px`;}
  dockProgress.style.display=near?.kind==='dock'?'block':'none';dockProgress.querySelector('.dock-fill').style.strokeDashoffset=String(100-Math.min(1,(p.dockHold||0)/2)*100);
  $('glyphs').hidden=!!boss||paused||mapOpen||!!p.endingTime;$('glyphs').style.opacity=moved&&fired&&mapped?'0':'.6';$('damage').style.opacity=String(Math.max(0,1-(time-hitAt)*3)*.6);$('minimap-wrap').hidden=mapOpen;
  if(time-mapAt>.15){drawMap();mapAt=time;}
}
function keyGlyph(el,code){el.classList.toggle('mouse-key',code.startsWith('Mouse'));el.dataset.button=code;el.textContent=code.startsWith('Mouse')?'':code.replace('Key','').replace('Left','');}
function renderBindings(){
  $('bindings').replaceChildren();const labels={up:'前进',left:'向左',down:'后退',right:'向右',fire:'射击',magnet:'磁力牵引',weapon:'切换武器',camera:'切换视角',flotation:'浮航',overdrive:'加速',map:'地图',repair:'使用 / 修复',skip:'跳过',pause:'暂停'};
  for(const action of Object.keys(FOLDED_BINDINGS)){const label=document.createElement('span'),b=document.createElement('button');label.textContent=labels[action];b.setAttribute('aria-label',`${labels[action]}：${bindings[action]}`);b.classList.toggle('binding-listening',rebind===action);b.textContent=rebind===action?'按下新按键…':bindings[action].replace(/^Key/,'').replace('ShiftLeft','左 Shift').replace('ShiftRight','右 Shift').replace('Mouse0','鼠标左键').replace('Mouse1','鼠标中键').replace('Mouse2','鼠标右键').replace('Space','空格').replace('Escape','Esc');b.onclick=()=>{rebind=action;renderBindings();$('bindings').querySelector('.binding-listening').focus();};$('bindings').append(label,b);}
  const glyph=$('glyphs');keyGlyph(glyph.children[0],bindings.up);[bindings.left,bindings.down,bindings.right].forEach((b,i)=>keyGlyph(glyph.children[1].children[i],b));keyGlyph(glyph.children[3],bindings.map);keyGlyph($('interaction').firstElementChild,bindings.repair);
  abilityHud.updateBindings(bindings);
  keyGlyph(cameraToggle.querySelector('kbd'),bindings.camera);
  interfaceView.bindings(bindings,keyGlyph);
}
function savePrefs(){write(SETTINGS_KEY,{...prefs,bindings,volume:audio.volume,music:audio.music,sfx:audio.sfx,quality:$('quality').value,cameraView:thirdPerson?'third':'overhead',cameraSettings});}
function setPause(value){if(ending.visible)return;$('resume').textContent=p.endingTime?'继续探索':'继续游戏';paused=value;if(!value)closeCameraTuning();keys.clear();orbiting=false;if(value&&document.pointerLockElement)document.exitPointerLock();$('settings').hidden=!value;rebind=null;resetArmed=false;$('reset-confirm').hidden=true;renderBindings();if(value)interfaceView.open();else $('game').focus();audio.update(time,p,false,'r2-transit',true);}
function input(code,repeat=false){
  audio.start();
  if(rebind){const actionIndex=Object.keys(FOLDED_BINDINGS).indexOf(rebind),old=bindings[rebind];for(const action of Object.keys(bindings))if(action!==rebind&&bindings[action]===code)bindings[action]=old;bindings[rebind]=code;rebind=null;renderBindings();$('bindings').querySelectorAll('button')[actionIndex].focus();savePrefs();return;}
  if(code===bindings.pause&&!repeat){if(mapOpen)setMap(false);else {setPause(!paused);if(!paused)captureMouse();}return;}
  if(paused||p.endingTime)return;
  if(code===bindings.map&&!repeat){setMap(!mapOpen);return;}if(mapOpen)return;
  if(code===bindings.camera&&!repeat){setCameraView(thirdPerson?'overhead':'third');savePrefs();if(thirdPerson)captureMouse();return;}
  if(code===bindings.skip&&deathAt>=0){respawn();return;}
  keys.add(code);if(repeat)return;
  if(code===bindings.repair)interact();
  if(code===bindings.weapon){const weapons=['cannon',...(p.mortar?['mortar']:[]),...(p.laser?['laser']:[])];p.weapon=weapons[(weapons.indexOf(p.weapon)+1)%weapons.length];}
  if(code===bindings.flotation){if(toggleFlotation(p,(x,z)=>!!foldedSupport(x,z,p.y,false,world.lifts)))audio.event('flotation');else if(p.flotation)audio.event('blocked');}
  if(code===bindings.fire)fire();
}
addEventListener('keydown',e=>{if(paused&&!rebind&&e.code!==bindings.pause)return;if(Object.values(bindings).includes(e.code)||rebind){e.preventDefault();input(e.code,e.repeat);}});
addEventListener('keyup',e=>keys.delete(e.code));
function pointerLockUnavailable(){
  pointerLockFailed=true;pointerOver=true;
  cameraNote.textContent='第三人称：按住鼠标中键拖动视角，WASD 移动；左键射击，右键磁力牵引。';
}
async function captureMouse(){
  if(!thirdPerson||paused||mapOpen||ending.visible||pointerLockFailed||capturePending)return;
  const canvas=$('game');
  if(!canvas.requestPointerLock){pointerLockUnavailable();return;}
  capturePending=true;
  try{
    try{await canvas.requestPointerLock({unadjustedMovement:true});}
    catch(error){
      if(error.name!=='NotSupportedError')throw error;
      await canvas.requestPointerLock();
    }
    if((!thirdPerson||paused||mapOpen||ending.visible)&&document.pointerLockElement===canvas)document.exitPointerLock();
  }catch{pointerLockUnavailable();}
  finally{capturePending=false;}
}
document.addEventListener('pointerlockerror',()=>{
  // Promise failures are handled above, including the retry without raw input.
  if(!capturePending&&!document.pointerLockElement)pointerLockUnavailable();
});
document.addEventListener('pointerlockchange',()=>{
  const locked=document.pointerLockElement===$('game'),wasLocked=hadPointerLock;hadPointerLock=locked;pointerOver=locked;keys.clear();
  document.body.classList.toggle('mouse-look',locked);
  if(thirdPerson&&wasLocked&&!locked&&!paused&&!mapOpen&&!ending.visible)setPause(true);
});
document.addEventListener('mousemove',e=>{
  // Keep high-rate input cheap; advance resolves collision and aim once per frame.
  if(thirdPerson&&(document.pointerLockElement===$('game')||orbiting)&&!paused&&!mapOpen){follow.turn(e.movementX,e.movementY);if(e.movementX||e.movementY)looked=true;}
});
$('game').addEventListener('pointermove',e=>{if(!thirdPerson){pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);pointerOver=true;}});
$('game').addEventListener('pointerleave',()=>{if(!document.pointerLockElement&&!orbiting)pointerOver=false;});
$('game').addEventListener('mousedown',e=>{
  e.preventDefault();
  if(thirdPerson&&e.button===1&&document.pointerLockElement!==$('game')){orbiting=true;pointerOver=true;return;}
  if(thirdPerson&&!pointerLockFailed&&document.pointerLockElement!==$('game')){captureMouse();return;}
  if(!thirdPerson)pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);
  if(thirdPerson)updateCamera(0);
  updateAim();input(`Mouse${e.button}`);
});
addEventListener('mouseup',e=>{keys.delete(`Mouse${e.button}`);if(e.button===1)orbiting=false;});addEventListener('contextmenu',e=>e.preventDefault());
$('settings').addEventListener('pointerdown',e=>{if(rebind){e.preventDefault();e.stopPropagation();input(`Mouse${e.button}`);}});
addEventListener('blur',()=>{keys.clear();setPause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
$('settings-button').onclick=()=>setPause(true);$('resume').onclick=()=>{if(p.endingTime)respawn();setPause(false);captureMouse();};document.querySelector('.close-map').onclick=()=>setMap(false);
$('new-game').onclick=()=>{if(!resetArmed){resetArmed=true;$('reset-confirm').hidden=false;return;}try{localStorage.removeItem(SAVE_KEY);}catch{}location.reload();};
$('reset-bindings').onclick=()=>{bindings={...FOLDED_BINDINGS};renderBindings();savePrefs();};
$('fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
$('volume').value=audio.volume;$('music').checked=audio.music;$('sfx').checked=audio.sfx;
for(const id of ['volume','music','sfx'])$(id).onchange=()=>{audio.volume=Number($('volume').value);audio.music=$('music').checked;audio.sfx=$('sfx').checked;savePrefs();};
function quality(){const low=$('quality').value==='low';renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=!low;}
$('quality').value=prefs.quality||'high';$('quality').onchange=()=>{quality();savePrefs();};quality();
const viewLabel=document.createElement('label');viewLabel.textContent='视角';
const viewSelect=document.createElement('select');viewSelect.id='camera-view';viewSelect.setAttribute('aria-label','视角');
viewSelect.innerHTML='<option value="third">第三人称</option><option value="overhead">俯视</option>';viewLabel.append(viewSelect);$('quality').parentElement.after(viewLabel);
const cameraNote=document.createElement('p');cameraNote.className='binding-note';cameraNote.textContent='第三人称：点击画面后移动鼠标转动视角，WASD 移动；Esc 释放鼠标。';viewLabel.after(cameraNote);
const cameraTuning=document.createElement('section');cameraTuning.id='camera-tuning';cameraTuning.hidden=true;cameraTuning.setAttribute('aria-label','镜头调整');$('settings').append(cameraTuning);
const tuneButton=document.createElement('button');tuneButton.textContent='调整镜头';cameraNote.after(tuneButton);
function closeCameraTuning(){const wasOpen=!cameraTuning.hidden;cameraTuning.hidden=true;$('settings').classList.remove('camera-tuning');if(wasOpen)tuneButton.focus();}
function previewCamera(){
  follow.boom=cameraSettings.third.distance;follow.height=cameraSettings.third.height;follow.shoulder=cameraSettings.third.shoulder;follow.sensitivity=cameraSettings.third.sensitivity;
  updateOverheadAngle();resize();updateCamera(1);world.update(0,time,p,camera);updateAim();renderer.render(scene,camera);savePrefs();
}
function openCameraTuning(){
  const view=thirdPerson?'third':'overhead';
  cameraTuning.replaceChildren();cameraTuning.hidden=false;$('settings').classList.add('camera-tuning');
  const heading=document.createElement('h2');heading.textContent=thirdPerson?'第三人称镜头':'俯视镜头';cameraTuning.append(heading);
  const note=document.createElement('p');note.className='binding-note';note.textContent=thirdPerson?'拖动滑块实时预览。游戏已暂停；遮挡物会半透明化，跟随距离保持不变。俯仰角作为下次进入游戏的起始角度，游玩时仍可用鼠标转动。':'拖动滑块实时预览。视野范围越大，能看到的区域越广。';cameraTuning.append(note);
  for(const [key,title,min,max,step,,suffix]of cameraFields[view]){
    const label=document.createElement('label'),name=document.createElement('span'),output=document.createElement('output'),slider=document.createElement('input');
    name.textContent=title;slider.type='range';slider.id=`camera-${view}-${key}`;slider.min=min;slider.max=max;slider.step=step;slider.setAttribute('aria-label',title);
    const value=thirdPerson&&key==='pitch'?follow.pitch*180/Math.PI:cameraSettings[view][key];slider.value=clamp(value,min,max);
    output.textContent=`${Number(value.toFixed(1))}${suffix}`;output.htmlFor=slider.id;label.append(name,output,slider);cameraTuning.append(label);
    slider.oninput=()=>{const value=Number(slider.value);cameraSettings[view][key]=value;output.textContent=`${value}${suffix}`;if(view==='third'&&key==='pitch')follow.pitch=value*Math.PI/180;previewCamera();};
  }
  const reset=document.createElement('button');reset.textContent='恢复此视角默认';reset.onclick=()=>{for(const [key,,,,,value]of cameraFields[view])cameraSettings[view][key]=value;if(thirdPerson)follow.pitch=cameraSettings.third.pitch*Math.PI/180;previewCamera();openCameraTuning();};
  const back=document.createElement('button');back.textContent='返回设置';back.onclick=closeCameraTuning;
  const resume=document.createElement('button');resume.textContent='继续游戏';resume.onclick=()=>{setPause(false);captureMouse();};cameraTuning.append(reset,back,resume);cameraTuning.querySelector('input').focus();
}
tuneButton.onclick=openCameraTuning;
function setCameraView(value){
  thirdPerson=value!=='overhead';camera=thirdPerson?follow.camera:overheadCamera;world.setThirdPerson(thirdPerson);
  viewSelect.value=thirdPerson?'third':'overhead';document.body.classList.toggle('third-person',thirdPerson);cameraNote.hidden=!thirdPerson;
  if(!thirdPerson&&document.pointerLockElement)document.exitPointerLock();
  focus.set(p.x,p.y,p.z);pointer.set(0,0);keys.clear();updateCamera(1);world.update(0,time,p,camera);updateAim();renderer.render(scene,camera);
}
viewSelect.onchange=()=>{setCameraView(viewSelect.value);savePrefs();};
function resize(){const size=cameraSettings.overhead.scale,w=size*innerWidth/innerHeight;overheadCamera.left=-w;overheadCamera.right=w;overheadCamera.top=size;overheadCamera.bottom=-size;overheadCamera.updateProjectionMatrix();follow.camera.aspect=innerWidth/innerHeight;follow.camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(paused)renderer.render(scene,camera);if(mapOpen)drawMap(true);else minimapBounds=$('minimap-wrap').getBoundingClientRect();}
setCameraView(thirdPerson?'third':'overhead');
addEventListener('resize',resize);resize();renderBindings();updateCamera(1);world.update(1,0,p,camera);advance(1/60);
if(freight||garden)abilityHud.acquire(freight?'mortar':'magnet',time);
function frame(now){const dt=clamp((now-last)/1000,0,.05);last=now;if(!manual&&!document.hidden&&!paused&&!mapOpen){advance(dt);renderer.render(scene,camera);frames++;}hud();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
if(import.meta.env.DEV&&params.has('test'))window.__game={
  snapshot:()=>({camera:{view:thirdPerson?'third':'overhead',position:camera.position.toArray(),yaw:follow.yaw,pitch:follow.pitch,distance:follow.distance,locked:document.pointerLockElement===$('game'),dragLook:pointerLockFailed},player:{...p,height:p.y},state:{...state},aim:{x:aim.x,y:aim.y,z:aim.z},time,frames,paused,mapOpen,chosenLayer,laserSegments:laserBeam.visible?Array.from(laserBeam.geometry.attributes.position.array.slice(0,laserBeam.geometry.drawRange.count*3)):[],bindings:{...bindings},enemies:world.enemies.map(e=>({id:e.id,x:e.x,y:e.y,z:e.z,hp:e.hp,parts:e.parts.map(p=>({x:p.x,y:p.y,z:p.z,hp:p.hp})),aim:e.aim,phase:e.phase,readable:e.readable})),lifts:world.lifts.map(l=>({id:l.id,y:l.y,destination:l.destination})),surfaces:world.surfaces.filter(s=>s.opacity<.99).map(s=>({id:s.id,opacity:s.opacity})),drawCalls:renderer.info.render.calls,geometries:renderer.info.memory.geometries}),
  step:(seconds,render=true)=>{for(let t=0;t<seconds-1e-7;t+=1/60)advance(Math.min(1/60,seconds-t));if(render){renderer.render(scene,camera);hud();}},
  scenario:values=>{if(values.player)Object.assign(p,values.player);if(values.state)Object.assign(state,values.state);if(values.enemies)for(const [id,hp]of Object.entries(values.enemies)){const e=world.enemies.find(e=>e.id===id);e.hp=hp;e.model.root.visible=hp>0;}focus.set(p.x,p.y,p.z);world.update(1,time,p,camera);updateCamera(1);updateAim();},
  manual:value=>{manual=value;keys.clear();},setInput:list=>{keys.clear();list.forEach(k=>keys.add(k));},
  aimAt:(x,z,y=p.y+2)=>{const v=project(x,y,z);pointer.set(v.x/innerWidth*2-1,1-v.y/innerHeight*2);updateAim();return v;},
  look:(yaw,pitch)=>{follow.yaw=yaw;follow.pitch=clamp(pitch,-.65,.95);updateCamera(1);updateAim();},
  project:(x,z,y=0)=>project(x,y,z),fire,interact,respawn,save,
  toggleFlotation:()=>toggleFlotation(p,(x,z)=>!!foldedSupport(x,z,p.y,false,world.lifts)),
  pixel:()=>{renderer.render(scene,camera);return $('game').toDataURL();}
};
