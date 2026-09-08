import * as T from 'three';
import './style.css';
import { makeWorld, tankModel, chargeWarning, floorColors, box, sphere, ring, mat, C, rooms, hazardDefinitions, elevation } from './world.js';
import { MAX_HP, BASE_SPEED, OVERDRIVE_MAX_SPEED, PLAYER_HURT_RADIUS, ENEMY_HURT_SCALE, CHARGE, DEFAULT_BINDINGS, newPlayer, shootHeat, updateHeat, screenMovement, damagePlayer, inside, clamp, angleDelta, segmentCircle } from './mechanics.js';
import { FactoryAudio } from './audio.js';

const $=id=>document.getElementById(id);
const SAVE_KEY='furnace-born-v2-save', SETTINGS_KEY='furnace-born-v2-settings';
function readStored(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function writeStored(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Play remains available when storage is disabled. */}}
const saved=readStored(SAVE_KEY),prefs=readStored(SETTINGS_KEY)||{};
let bindings={...DEFAULT_BINDINGS,...prefs.bindings};
const renderer=new T.WebGLRenderer({canvas:$('game'),antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0x192c30);
const scene=new T.Scene();scene.background=new T.Color(0x192c30);scene.fog=new T.Fog(0x192c30,65,150);
const camera=new T.OrthographicCamera(-24,24,17,-17,.1,220);
const ambient=new T.HemisphereLight(0xf8ecd4,0x405763,1.75);scene.add(ambient);
const sun=new T.DirectionalLight(0xffe5b7,3.2);sun.position.set(-18,40,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-40;sun.shadow.camera.right=40;sun.shadow.camera.top=40;sun.shadow.camera.bottom=-40;sun.shadow.camera.far=110;sun.shadow.normalBias=.04;sun.shadow.bias=-.0001;scene.add(sun,sun.target);
const fill=new T.DirectionalLight(0x9ac9d5,.65);fill.position.set(20,12,-30);scene.add(fill);
const world=makeWorld(scene), audio=new FactoryAudio();
const player=newPlayer(),model=tankModel();
player.underpass=false;
const playerHeight=()=>player.underpass?0:elevation(player.x,player.z);
let wasUnderpass=false;
model.root.traverse(m=>{if(m.isMesh)m.material=m.material.clone();});scene.add(model.root);
const knownEncounters=new Set(saved?.encounters||[]);
const discovered=new Set(saved?.discovered||['a']),visitedHives=new Set(saved?.hives||[0]);
let anchor=Number.isInteger(saved?.anchor)&&saved.anchor>=0&&saved.anchor<3?saved.anchor:0;
let eliteDead=!!saved?.eliteDead,bossDead=!!saved?.bossDead,finished=!!saved?.finished;
player.overdrive=eliteDead;
for(const r of world.relays)if(saved?.relays?.includes(r.id)){r.hp=0;r.core.visible=false;r.root.rotation.z=.15;r.cable.material.color.setHex(C.dark);}
for(const h of world.hives)h.active=visitedHives.has(h.id);
if(saved){player.x=world.hives[anchor].x;player.z=world.hives[anchor].z+2;}
let time=0,deathTime=-1,endingTime=-1,opening=1.8,acquiredUntil=0,damageFlash=0,recoil=0,lastHazard=-1,repairCooldown=0,repairPulse=-1;
let paused=false,mapOpen=false,rebind=null,resetArmed=false,area='a',lastArea='a';
let keys=new Set(),pointer={x:innerWidth*.55,y:innerHeight*.48},aim=new T.Vector3(0,0,-5),moving=false,pointerOverGame=true;
let usedMove=false,usedFire=false,usedMap=false,usedRepair=false,readySound=true;
const cameraFocus=new T.Vector3(player.x,0,player.z),cameraOffset=new T.Vector3(28,39.6,28);
const bullets=[],effects=[],enemies=[];
const hpEl=$('hp');for(let i=0;i<10;i++)hpEl.append(document.createElement('i'));
const projectileGeometry=new T.SphereGeometry(.23,10,6),particleGeometry=new T.IcosahedronGeometry(1,1);
const bulletMaterials={player:mat(0xfff1b0,true),enemy:mat(0xff783e,true)};
const enemyDefs=[['scout',27,0],['scout',17,40],['scout',26,45],['turret',15,46],['guard',79,41],['turret',83,25],['elite',52,65],['boss',0,-51]];
const healths={scout:1,turret:2,guard:3,elite:9,boss:14};
function makeEnemy(type,x,z){
  const m=tankModel(type);scene.add(m.root);
  const e={type,x,z,sx:x,sz:z,hp:healths[type],max:healths[type],heading:type==='boss'?0:Math.PI,aim:Math.PI,model:m,r:CHARGE[type]?.radius??(type==='boss'?4.8:type==='turret'?1:1.5),state:'idle',timer:1.5,cooldown:0,active:false,flash:0,armorFlash:0,chargeX:0,chargeZ:0,ramAt:-10,cycle:0,assemblies:[4,4],core:6,openSide:-1};
  e.hurtRadius=e.r*ENEMY_HURT_SCALE;
  if(CHARGE[type]){
    const {root,shape}=chargeWarning(type);e.warning=root;e.warningShape=shape;
  }else{
    e.warning=new T.Group();
    const wm=new T.MeshBasicMaterial({color:C.orange,transparent:true,opacity:.25,depthWrite:false});
    e.warningShape=box(e.warning,type==='boss'?1.1:.28,.025,22,0,.1,12,wm,0);
    e.warningShape.castShadow=false;
  }
  scene.add(e.warning);e.warning.visible=false;
  if(type==='boss'){
    e.coreMesh=box(m.body,1.1,.9,.18,0,1.25,1.58,mat(C.dark,true),.12);
    e.coreDoors=[-1,1].map(side=>box(m.body,.58,1.02,.14,side*.3,1.25,1.72,C.metal));
    e.weakpoints=[];for(const side of [-1,1]){const group=new T.Group();scene.add(group);group.visible=false;const core=box(group,.6,2,1.6,0,1.5,0,mat(C.orange,true),.15);const shield=box(group,.3,2.3,1.9,side*.55,1.5,0,C.dark,.15);box(group,2.2,.65,.7,-side*1.3,1,0,C.teal,.12);e.weakpoints.push({group,core,shield});}
  }
  return e;
}
for(const def of enemyDefs){const e=makeEnemy(...def);if(e.type==='elite'&&eliteDead||e.type==='boss'&&bossDead){e.hp=0;e.model.root.visible=false;}enemies.push(e);}
const elite=enemies.find(e=>e.type==='elite'),boss=enemies.find(e=>e.type==='boss');
function save(){writeStored(SAVE_KEY,{anchor,eliteDead,bossDead,finished,relays:world.relays.filter(r=>r.hp===0).map(r=>r.id),discovered:[...discovered],hives:[...visitedHives],encounters:[...knownEncounters]});}
function pan(x,z){return clamp(((x-player.x)-(z-player.z))/25,-1,1);}
function burst(x,z,color=C.orange,count=15,y=1,power=1){
  for(let i=0;i<count;i++){
    if(effects.length>280)break;
    const material=mat(i%4===0?0x324541:color);material.transparent=true;
    const m=new T.Mesh(particleGeometry,material);m.position.set(x+(Math.random()-.5)*.6,y,z+(Math.random()-.5)*.6);const size=(.12+Math.random()*.4)*power;m.scale.setScalar(size);scene.add(m);
    effects.push({mesh:m,vx:(Math.random()-.5)*8*power,vz:(Math.random()-.5)*8*power,vy:(2+Math.random()*6)*power,life:.4+Math.random()*.7,max:1,kind:'particle',size});
  }
}
function pulse(x,z,color=C.mint,size=8){const m=ring(scene,.8,.065,x,.2,z,mat(color,true));effects.push({mesh:m,life:.9,max:.9,kind:'ring',size});}
function explosion(x,z,power=1){burst(x,z,C.orange,18*power,1,power);burst(x,z,C.lightYellow,8*power,1,power*.7);pulse(x,z,C.orange,5*power);audio.event('explode',pan(x,z));}
function collides(x,z,r=.88,ignore=null){
  for(const [dx,dz] of [[r,0],[-r,0],[0,r],[0,-r],[r*.7,r*.7],[-r*.7,-r*.7],[r*.7,-r*.7],[-r*.7,r*.7]])if(!world.available(x+dx,z+dz))return true;
  if(world.obstacles.some(o=>inside(x,z,o,r)))return true;
  if(world.gates.some(g=>!g.open&&Math.abs(z-g.z)<r+.2&&Math.abs(x-g.x)<g.w/2+r))return true;
  if(ignore==='player')return false;
  return false;
}
function moveEntity(entity,dx,dz,r){
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.3));let hit=false;
  for(let i=0;i<count;i++){
    const oldX=entity.x;
    const tunnelBlocked=(x,z)=>{
      if(entity!==player)return false;
      if(player.underpass)return x>=70&&x<=86&&(z<30.5+r||z>37.5-r);
      return player.x>=70&&player.x<=86&&player.z>=29&&player.z<=39&&(x<70+r||x>86-r);
    };
    if(!collides(entity.x+dx/count,entity.z,r)&&!tunnelBlocked(entity.x+dx/count,entity.z))entity.x+=dx/count;else hit=true;
    if(!collides(entity.x,entity.z+dz/count,r)&&!tunnelBlocked(entity.x,entity.z+dz/count))entity.z+=dz/count;else hit=true;
    if(entity===player){
      if(((oldX<70&&entity.x>=70)||(oldX>86&&entity.x<=86))&&entity.z>31.4&&entity.z<36.6)player.underpass=true;
      if(entity.x<69||entity.x>87||entity.z<24||entity.z>44)player.underpass=false;
    }
  }
  return hit;
}
function lineClear(ax,az,bx,bz){
  const n=Math.ceil(Math.hypot(bx-ax,bz-az)/.5);
  for(let i=1;i<n;i++){const x=ax+(bx-ax)*i/n,z=az+(bz-az)*i/n;if(!world.available(x,z)||world.obstacles.some(o=>inside(x,z,o))||world.gates.some(g=>!g.open&&Math.abs(z-g.z)<.25&&Math.abs(x-g.x)<g.w/2))return false;}
  return true;
}
function enemyVisible(e){
  if(!e.hp)return false;const p=new T.Vector3(e.x,1,e.z).project(camera);
  return Math.abs(p.x)<1&&Math.abs(p.y)<1&&lineClear(player.x,player.z,e.x,e.z);
}
function emitBullet(x,z,angle,owner,damage=1,speed=38,y=.8,heavy=false){
  const mesh=new T.Mesh(projectileGeometry,bulletMaterials[owner]);mesh.scale.setScalar(heavy?2.4:owner==='player'?1.3:1.65);mesh.position.set(x,y,z);scene.add(mesh);
  const tail=box(mesh,.4,.4,2.2,0,0,-.5,bulletMaterials[owner],.1);mesh.rotation.y=angle;
  bullets.push({x,z,px:x,pz:z,y,dx:Math.sin(angle)*speed,dz:Math.cos(angle)*speed,owner,damage,mesh,life:3,heavy});
}
function fire(){
  if(paused||mapOpen||opening>0||deathTime>=0||endingTime>=0)return;
  if(shootHeat(player,time)){
    const d=2.6,mx=player.x+Math.sin(player.aim)*d,mz=player.z+Math.cos(player.aim)*d;
    if(lineClear(player.x,player.z,mx,mz))emitBullet(mx,mz,player.aim,'player',1,38,playerHeight()+1.25);
    recoil=.38;usedFire=true;audio.event('shot');burst(player.x+Math.sin(player.aim)*2.7,player.z+Math.cos(player.aim)*2.7,C.lightYellow,5,playerHeight()+1.7,.4);
    if(player.overheated)audio.event('heat');
  }
}
function hitPlayer(amount,x,z,hazard=false){
  if(!damagePlayer(player,amount,time,hazard))return false;
  damageFlash=1;const d=screenMovement(x-player.x,z-player.z);$('damage').style.transform=`translate(${clamp(d.x,-1,1)*5}px,${clamp(d.z,-1,1)*5}px)`;
  burst(player.x,player.z,C.yellow,9,1,.5);audio.event('hit',pan(x,z));
  if(player.hp===0){deathTime=time;audio.event('death');keys.clear();}
  return true;
}
function armorImpact(e,sx,sz,impact){
  const length=Math.hypot(sx-e.x,sz-e.z)||1,nx=(sx-e.x)/length,nz=(sz-e.z)/length;
  const x=impact?.x??e.x+nx*1.5,z=impact?.z??e.z+nz*1.5,y=impact?.y??elevation(e.x,e.z)+1.25;
  e.armorFlash=.2;e.model.frontArmor.material.emissive.setHex(0xcfffff);e.model.frontArmor.material.emissiveIntensity=1.3;
  for(let i=0;i<10&&effects.length<280;i++){
    const material=mat(i%2?0xe0ffff:0xffffff,true);material.transparent=true;
    const mesh=new T.Mesh(particleGeometry,material),size=.07+Math.random()*.08,speed=5+Math.random()*7,spread=(Math.random()-.5)*7;
    mesh.position.set(x,y,z);mesh.scale.setScalar(size);scene.add(mesh);
    effects.push({mesh,vx:nx*speed-nz*spread,vz:nz*speed+nx*spread,vy:2+Math.random()*4,life:.3+Math.random()*.2,max:.5,kind:'particle',size});
  }
  audio.event('armor',pan(e.x,e.z));
}
function damageEnemy(e,amount,sx,sz,impact){
  if(e.hp<=0)return false;
  const armored=e.type==='guard'&&Math.cos(Math.atan2(sx-e.x,sz-e.z)-e.heading)>.25;
  if(armored)amount*=.4;
  if(e.type==='elite'){
    const a=Math.atan2(sx-e.x,sz-e.z);
    if(e.state!=='vent'||Math.cos(a-e.heading)>.2){burst(e.x,e.z,C.metal,5,2,.3);return false;}
  }
  if(e.type==='boss')return false;
  e.hp=Math.max(0,e.hp-amount);
  if(armored)armorImpact(e,sx,sz,impact);
  else{e.flash=.15;burst(e.x,e.z,C.orange,6,elevation(e.x,e.z)+1.5,.5);audio.event('hit',pan(e.x,e.z));}
  if(e.hp<=0)killEnemy(e);
  return armored?'armor':'hit';
}
function killEnemy(e){
  e.hp=0;e.warning.visible=false;explosion(e.x,e.z,e.type==='elite'?1.5:1);e.model.root.visible=false;
  if(e.type==='elite'){
    eliteDead=true;player.overdrive=true;acquiredUntil=time+5;audio.event('unlock');pulse(player.x,player.z,C.mint,12);
    for(let i=0;i<9;i++){const m=sphere(scene,.15,e.x,2,e.z,mat(C.mint,true));effects.push({mesh:m,life:1.2+i*.05,max:1.6,kind:'module'});}
    save();
  }
  if(e.type==='boss'){bossDead=true;audio.event('unlock');save();}
}
function hitBoss(b){
  if(boss.hp<=0)return false;
  const dx=Math.sin(boss.heading),dz=Math.cos(boss.heading);
  if(boss.assemblies.some(v=>v>0)){
    for(let side=0;side<2;side++){
      const w=boss.weakpoints[side].group.position;
      if(boss.openSide===side&&boss.assemblies[side]>0&&(side===0?b.dx>0:b.dx<0)&&segmentCircle(b.px,b.pz,b.x,b.z,w.x,w.z,1.35*ENEMY_HURT_SCALE)){
        boss.assemblies[side]=Math.max(0,boss.assemblies[side]-b.damage);boss.hp=boss.assemblies[0]+boss.assemblies[1]+boss.core;burst(w.x,w.z,C.orange,10,2);audio.event('hit',pan(w.x,w.z));
        if(boss.assemblies[side]===0)explosion(w.x,w.z,1.5);
        return true;
      }
    }
    return false;
  }
  if(boss.state==='vent'&&segmentCircle(b.px,b.pz,b.x,b.z,boss.x+dx*4.2,boss.z+dz*4.2,2.1*ENEMY_HURT_SCALE)){
    boss.core=Math.max(0,boss.core-b.damage);boss.hp=boss.core;boss.flash=.2;burst(boss.x,boss.z,C.orange,8,3);audio.event('hit');if(!boss.hp)killEnemy(boss);return true;
  }
  return false;
}
function resetOrdinary(){
  for(const e of enemies){
    if((e.type==='elite'&&eliteDead)||(e.type==='boss'&&bossDead))continue;
    e.x=e.sx;e.z=e.sz;e.hp=e.max;e.heading=e.type==='boss'?0:Math.PI;e.state='idle';e.timer=2;e.active=false;e.cooldown=0;e.armorFlash=0;if(e.model.frontArmor)e.model.frontArmor.material.emissiveIntensity=0;e.cycle=0;e.assemblies=[4,4];e.core=6;e.openSide=-1;e.warning.visible=false;e.model.root.visible=true;
    e.model.root.scale.setScalar(e.type==='boss'?2.8:e.type==='elite'?1.35:1);
  }
  for(const b of bullets)scene.remove(b.mesh);bullets.length=0;
}
function repair(){
  if(time<repairCooldown||player.hp<=0)return;
  const h=world.hives.find(h=>Math.hypot(h.x-player.x,h.z-player.z)<3.5&&(h.id!==2||bossDead));
  if(!h)return;
  anchor=h.id;h.active=true;visitedHives.add(h.id);player.hp=MAX_HP;player.heat=0;player.overheated=false;player.speed=1;player.lastHeat=-10;repairCooldown=time+1;repairPulse=time;resetOrdinary();pulse(h.x,h.z,C.mint,35);burst(player.x,player.z,C.mint,25,1,.6);audio.event('repair');usedRepair=true;
  if(h.id===2&&bossDead&&!finished){endingTime=time;keys.clear();}
  save();
}
function respawn(){
  const h=world.hives[anchor];player.x=h.x;player.z=h.z+2;player.underpass=false;player.hp=MAX_HP;player.heat=0;player.overheated=false;player.speed=1;player.invincible=time+1;player.lastHeat=-10;player.lastShot=-10;deathTime=-1;lastHazard=time;resetOrdinary();cameraFocus.set(player.x,0,player.z);pulse(player.x,player.z,C.mint,8);opening=.6;
}
function enemyShoot(e,offset=0,heavy=false){
  const a=Math.atan2(player.x-e.x,player.z-e.z)+offset,r=e.type==='boss'?5:e.type==='turret'?2:2.3;
  emitBullet(e.x+Math.sin(a)*r,e.z+Math.cos(a)*r,a,'enemy',heavy?15:e.type==='guard'?10:8,heavy?13:e.type==='boss'?12:18,elevation(e.x,e.z)+1.1,heavy);
  audio.event(e.type==='boss'?'foundry-shot':e.type==='turret'?'welder-shot':'guard-shot',pan(e.x,e.z));e.model.barrel.position.z=-.3;
}
function updateEnemies(dt){
  for(const e of enemies){
    if(e.hp<=0)continue;
    const previousPosition={x:e.x,z:e.z};
    const dx=player.x-e.x,dz=player.z-e.z,dist=Math.hypot(dx,dz),a=Math.atan2(dx,dz),ordinary=!['elite','boss'].includes(e.type);
    const engaged=dist<22&&lineClear(e.x,e.z,player.x,player.z);
    // Arena membership starts special encounters; distance and sight start ordinary encounters.
    if(e.type==='elite')e.active=area==='elite'&&world.relays.every(r=>r.hp===0);
    else if(e.type==='boss')e.active=area==='boss';
    else e.active=engaged;
    if(!ordinary&&e.active&&!knownEncounters.has(e.type)){knownEncounters.add(e.type);save();}
    e.armorFlash=Math.max(0,e.armorFlash-dt);if(e.model.frontArmor)e.model.frontArmor.material.emissiveIntensity=e.armorFlash/.2*1.3;
    e.flash=Math.max(0,e.flash-dt);e.model.barrel.position.z*=Math.exp(-12*dt);e.warning.visible=false;
    if(e.active&&player.hp>0){
      e.timer-=dt;e.cooldown-=dt;
      e.aim=a;
      if(e.type==='scout'){
        if(e.state==='idle'){
          e.heading+=angleDelta(e.heading,a)*Math.min(1,dt*5);
          if(dist>6)moveEntity(e,(dx/dist+Math.cos(time+e.sx)*.3)*2.3*dt,(dz/dist+Math.sin(time+e.sz)*.3)*2.3*dt,1.1);
          if(e.timer<=0&&dist<14){e.state='warn';e.timer=1.05;e.chargeX=Math.sin(a);e.chargeZ=Math.cos(a);audio.event('clamp-warn',pan(e.x,e.z));burst(e.x,e.z,0xe5edcf,6,1,.4);}
        }else if(e.state==='warn'){
          e.warning.visible=true;e.heading=Math.atan2(e.chargeX,e.chargeZ);
          if(e.timer<=0){e.state='charge';e.timer=CHARGE.scout.duration;}
        }else if(e.state==='charge'){
          const previousX=e.x,previousZ=e.z;
          const travel=CHARGE.scout.speed*Math.min(dt,Math.max(0,e.timer+dt));
          const blocked=moveEntity(e,e.chargeX*travel,e.chargeZ*travel,1.1);
          if(segmentCircle(previousX,previousZ,e.x,e.z,player.x,player.z,e.r+PLAYER_HURT_RADIUS))hitPlayer(5,e.x,e.z);
          if(e.timer<=0||blocked){e.state='idle';e.timer=2;}
        }
      }else if(e.type==='turret'||e.type==='guard'){
        if(e.type==='guard'){e.heading+=clamp(angleDelta(e.heading,a),-dt*.65,dt*.65);if(dist>9)moveEntity(e,Math.sin(e.heading)*1.1*dt,Math.cos(e.heading)*1.1*dt,1.4);}
        if(e.state==='idle'&&e.timer<=0){e.state='warn';e.timer=e.type==='guard'?1.5:1.15;audio.event('warn',pan(e.x,e.z));}
        if(e.state==='warn'){e.warning.visible=true;if(e.timer<=0){enemyShoot(e);e.state='idle';e.timer=e.type==='guard'?3.5:2.8;}}
      }else if(e.type==='elite'){
        if(e.state==='idle'){
          e.heading+=angleDelta(e.heading,a)*Math.min(1,dt*2);
          if(e.timer<=0){e.state='warn';e.timer=1.7;e.chargeX=Math.sin(a);e.chargeZ=Math.cos(a);audio.event('press-warn',pan(e.x,e.z));}
        }else if(e.state==='warn'){
          e.heading=Math.atan2(e.chargeX,e.chargeZ);e.warning.visible=true;
          if(Math.random()<dt*25)burst(e.x,e.z,C.orange,1,1,.5);
          if(e.timer<=0){e.state='charge';e.timer=CHARGE.elite.duration;audio.event('ram',pan(e.x,e.z));}
        }else if(e.state==='charge'){
          const previousX=e.x,previousZ=e.z;
          const travel=CHARGE.elite.speed*Math.min(dt,Math.max(0,e.timer+dt));
          const blocked=moveEntity(e,e.chargeX*travel,e.chargeZ*travel,e.r);
          if(segmentCircle(previousX,previousZ,e.x,e.z,player.x,player.z,e.r+PLAYER_HURT_RADIUS))hitPlayer(12,e.x,e.z);
          if(e.timer<=0||blocked){e.state='vent';e.timer=4.3;burst(e.x,e.z,0xc9d9c5,16,2,.5);audio.event('heat',pan(e.x,e.z));}
        }else if(e.state==='vent'){
          if(Math.random()<dt*9)burst(e.x-Math.sin(e.heading)*1.5,e.z-Math.cos(e.heading)*1.5,0xd5e5cf,1,2,.25);
          if(e.timer<=0){e.state='idle';e.timer=1.7;e.cycle++;}
        }
        if(e.hp<=5&&e.state==='idle'&&e.cooldown<=0){enemyShoot(e);e.cooldown=3;}
        e.model.radiator.material.color.setHex(e.state==='vent'?C.orange:C.dark);
      }else if(e.type==='boss'){
        const phase2=e.assemblies.every(v=>v===0);
        if(phase2)e.heading+=clamp(angleDelta(e.heading,a),-.2*dt,.2*dt);
        if(e.state==='idle'&&e.timer<=0){e.state='warn';e.timer=1.7;audio.event('warn',pan(e.x,e.z));}
        else if(e.state==='warn'){e.warning.visible=true;if(e.timer<=0){enemyShoot(e,0,true);e.state='fan';e.timer=3.2;e.cooldown=.5;}}
        else if(e.state==='fan'){
          if(e.cooldown<=0){for(const offset of [-.52,-.26,0,.26,.52])enemyShoot(e,offset);e.cooldown=phase2?.55:.85;}
          if(e.timer<=0){e.state='vent';e.timer=phase2?3.2:3.6;e.openSide=e.cycle%2;if(e.assemblies[e.openSide]===0)e.openSide=1-e.openSide;pulse(e.x,e.z,C.orange,10);}
        }else if(e.state==='vent'){
          if(e.timer<=0){e.state='idle';e.timer=phase2?2.5:4;e.cycle++;e.openSide=-1;}
        }
        for(let i=0;i<2;i++){
          const w=e.weakpoints[i],side=i?1:-1;
          const lx=side*7.5,lz=1.8;
          w.group.position.set(e.x+lx*Math.cos(e.heading)+lz*Math.sin(e.heading),0,e.z-lx*Math.sin(e.heading)+lz*Math.cos(e.heading));w.group.rotation.y=e.heading;
          w.group.visible=e.assemblies[i]>0;w.shield.position.y=T.MathUtils.damp(w.shield.position.y,e.openSide===i?3.7:1.5,8,dt);
          w.core.material.color.setHex(e.openSide===i?C.orange:C.dark);
        }
        e.coreDoors.forEach((door,i)=>door.position.x=T.MathUtils.damp(door.position.x,(i?1:-1)*(phase2&&e.state==='vent'?.93:.3),9,dt));
        e.model.radiator.material.color.setHex(phase2&&e.state==='vent'?C.orange:C.dark);e.coreMesh.material.color.setHex(phase2&&e.state==='vent'?C.orange:C.dark);
      }
    }
    if(!e.active){e.warning.visible=false;if(!ordinary&&e.state!=='idle'){e.state='idle';e.timer=2;e.openSide=-1;}}
    e.warning.position.set(e.x,elevation(e.x,e.z),e.z);e.warning.rotation.y=e.type==='elite'||e.type==='scout'?e.heading:e.aim;
    e.warningShape.material.opacity=.12+Math.sin(time*14)*.07+(e.state==='warn'?.13:0);
    e.model.root.position.set(e.x,elevation(e.x,e.z)+Math.sin(time*3+e.sx)*.025,e.z);e.model.body.rotation.y=e.heading;e.model.turret.rotation.y=e.type==='elite'?e.heading:e.aim;
    e.model.rollWheels(((e.x-previousPosition.x)*Math.sin(e.heading)+(e.z-previousPosition.z)*Math.cos(e.heading))/.26);e.model.animate(e.state,e.timer,time,dt,e.active);e.model.root.visible=true;
    if(e.flash>0)e.model.root.scale.setScalar((e.type==='boss'?2.8:e.type==='elite'?1.35:1)*(1+e.flash*.2));else e.model.root.scale.setScalar(e.type==='boss'?2.8:e.type==='elite'?1.35:1);
    // Shared solid-body response: rams deal their type-specific effect but never pass through a body.
    const nd=Math.hypot(player.x-e.x,player.z-e.z),min=e.r+.9;
    if(player.hp>0&&nd<min){
      if(player.speed>=1.3&&time-e.ramAt>.6){e.ramAt=time;audio.event('ram');
        if(e.type==='scout')damageEnemy(e,10,player.x,player.z);
        if(e.type==='turret'){damageEnemy(e,1,player.x,player.z);player.speed=1;}
        if(e.type==='guard'){if(Math.cos(Math.atan2(player.x-e.x,player.z-e.z)-e.heading)>.25){armorImpact(e,player.x,player.z);hitPlayer(5,e.x,e.z);}else damageEnemy(e,1,player.x,player.z);player.speed=1;}
      }
      if(e.hp>0){const nx=(player.x-e.x)/(nd||1),nz=(player.z-e.z)/(nd||1);moveEntity(player,nx*(min-nd),nz*(min-nd),.88);if(!ordinary)player.speed=1;}
    }
  }
}
function updateBullets(dt){
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];let hit=false;b.life-=dt;
    const substeps=Math.ceil(Math.hypot(b.dx,b.dz)*dt/.3);
    for(let s=0;s<substeps&&!hit;s++){
      b.px=b.x;b.pz=b.z;b.x+=b.dx*dt/substeps;b.z+=b.dz*dt/substeps;
      if(collides(b.x,b.z,.08)||b.y<(b.x>=70&&b.x<=86&&b.z>=30.5&&b.z<=37.5&&b.y<2.1?0:elevation(b.x,b.z))+.1){hit=true;break;}
      if(b.owner==='player'){
        for(const scrap of world.scraps)if(scrap.hp>0&&Math.hypot(b.x-scrap.x,b.z-scrap.z)<scrap.r){scrap.hp=0;scrap.mesh.visible=false;burst(scrap.x,scrap.z,0xb3a16c,15);hit=true;break;}
        for(const relay of world.relays)if(relay.hp>0&&Math.hypot(b.x-relay.x,b.z-relay.z)<1.3&&Math.abs(b.y-(elevation(relay.x,relay.z)+1.2))<1.7){
          relay.hp--;burst(relay.x,relay.z,C.orange,12,elevation(relay.x,relay.z)+1.5);audio.event('hit',pan(relay.x,relay.z));hit=true;
          if(relay.hp===0){explosion(relay.x,relay.z);relay.core.visible=false;relay.root.rotation.z=.15;relay.cable.material.color.setHex(C.dark);pulse(52,49,C.orange,8);save();}
          break;
        }
        if(hit)continue;
        if(hitBoss(b)){hit=true;continue;}
        for(const e of enemies){
          if(e.hp<=0||Math.abs(b.y-(elevation(e.x,e.z)+1.2))>2)continue;
          if(segmentCircle(b.px,b.pz,b.x,b.z,e.x,e.z,e.hurtRadius)){
            if(e.type!=='boss')b.armorImpact=damageEnemy(e,b.damage,b.x-Math.sign(b.dx)*2,b.z-Math.sign(b.dz)*2,{x:b.x,y:b.y,z:b.z})==='armor';
            else burst(b.x,b.z,C.metal,5,1.5,.4);
            for(const other of enemies)if(other!==e&&other.hp>0&&Math.hypot(other.x-b.x,other.z-b.z)<2.6)damageEnemy(other,b.damage*.25,b.x,b.z);
            hit=true;break;
          }
        }
      }else if(player.hp>0&&Math.abs(b.y-(playerHeight()+1.2))<1.7&&segmentCircle(b.px,b.pz,b.x,b.z,player.x,player.z,PLAYER_HURT_RADIUS)){
        hitPlayer(b.damage,b.x,b.z);hit=true;
      }
    }
    b.mesh.position.set(b.x,b.y,b.z);
    if(hit||b.life<=0){if(hit&&!b.armorImpact){burst(b.x,b.z,b.owner==='player'?C.lightYellow:C.orange,4,b.y,.4);const scorch=new T.Mesh(new T.CircleGeometry(.5,14),new T.MeshBasicMaterial({color:C.dark,transparent:true,opacity:.5,depthWrite:false}));scorch.rotation.x=-Math.PI/2;scorch.position.set(b.x,elevation(b.x,b.z)+.13,b.z);scene.add(scorch);effects.push({mesh:scorch,kind:'scorch',life:2,max:2});}scene.remove(b.mesh);bullets.splice(i,1);}
  }
}
function updateEffects(dt){
  for(let i=effects.length-1;i>=0;i--){const p=effects[i];p.life-=dt;
    if(p.life<=0){scene.remove(p.mesh);if(p.mesh.material?.transparent||p.kind==='ring'||p.kind==='module')p.mesh.material.dispose();if(p.kind!=='particle')p.mesh.geometry.dispose();effects.splice(i,1);continue;}
    if(p.kind==='particle'){p.vy-=9*dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.z+=p.vz*dt;p.mesh.position.y+=p.vy*dt;p.mesh.rotation.x+=dt*2;p.mesh.scale.setScalar(p.size*Math.min(1,p.life*3));p.mesh.material.opacity=Math.min(1,p.life*2);}
    else if(p.kind==='ring'){p.mesh.scale.setScalar(1+(1-p.life/p.max)*p.size);p.mesh.position.y=.15;}
    else if(p.kind==='module'){p.mesh.position.lerp(new T.Vector3(player.x,1.4,player.z),dt*6);}
    else if(p.kind==='scorch')p.mesh.material.opacity=p.life*.2;
  }
}
function updateWorld(dt){
  for(const g of world.gates){g.open=g.id==='elite'?world.relays.every(r=>r.hp===0):bossDead;g.root.position.y=T.MathUtils.damp(g.root.position.y,g.open?-4:0,5,dt);}
  for(const b of world.belts){
    b.active=b.boss===undefined||boss.hp>0&&boss.active&&boss.assemblies[b.boss]>0&&boss.state!=='idle';
    const alongZ=!!b.dz,span=alongZ?b.d:b.w;
    if(b.active)b.offset=(b.offset+dt*BASE_SPEED*1.15)%span;
    b.parts.forEach((p,i)=>{const v=(i*.45+b.offset)%span;if(alongZ)p.position.z=b.z+v;else p.position.x=b.x+v;});
  }
  for(const h of world.hives){
    const near=Math.hypot(player.x-h.x,player.z-h.z)<4;
    h.petals.forEach((p,i)=>{p.rotation.x=T.MathUtils.damp(p.rotation.x,near?-1.05:0,5,dt);});
    const repairing=near&&time-repairPulse<1.6&&anchor===h.id;
    h.tools.forEach(tool=>{tool.root.rotation.z=T.MathUtils.damp(tool.root.rotation.z,repairing?tool.side*(.65+Math.sin(time*17)*.08):near?tool.side*.25:0,8,dt);tool.tip.visible=near;});
    h.beacon.rotation.y=time*.5;h.beacon.position.y=Math.sin(time*2)*.15;h.beacon.visible=h.active||near;
    h.root.visible=h.id!==2||bossDead;
  }
  for(const a of world.animated){
    if(a.kind==='fan')a.mesh.rotation.y+=dt*.65;
    else if(a.kind==='lava')a.mesh.position.y=.19+Math.sin(time*2+a.phase)*.025;
    else if(a.kind==='recycler'){
      const cycle=time%8;
      a.refuse.forEach((wreck,i)=>{const travel=(time*.75+i*6)%18;wreck.position.set(Math.sin(i*2)*.25,.06,9-travel);wreck.rotation.y=Math.sin(i*3)*.15;wreck.scale.y=travel>17?Math.max(.12,1-(travel-17)*1.1):1;wreck.visible=travel<17.8;});
      a.press.position.y=T.MathUtils.damp(a.press.position.y,cycle>6.8&&cycle<7.9?1:3.6,cycle>6.8&&cycle<7.9?12:2,dt);
      if(cycle>=6.8&&(time-dt)%8<6.8&&Math.hypot(player.x+16,player.z+3)<25)audio.event('crusher',pan(-16,-3));
      a.mouth.material.color.setHSL(.065,.85,.56+Math.sin(time*7)*.035);
    }else if(a.kind==='inspection'){
      const scanTime=time%10;
      a.scan.position.z=-3+Math.min(scanTime,4)*1.5;a.scan.visible=scanTime<4;
      a.reject.visible=scanTime>=4;
    }
  }
  world.exitDoor.position.y=T.MathUtils.damp(world.exitDoor.position.y,endingTime>=0||finished?6:2.8,1.7,dt);world.exitLight.visible=endingTime>=0||finished;
  for(const e of [elite,boss])if(e.hp<=0){e.warning.visible=false;e.weakpoints?.forEach(w=>w.group.visible=false);}
}
function updatePlayer(dt){
  const horizontal=Number(keys.has(bindings.right))-Number(keys.has(bindings.left));
  const vertical=Number(keys.has(bindings.down))-Number(keys.has(bindings.up));
  const move=screenMovement(horizontal,vertical);moving=horizontal!==0||vertical!==0;
  const wasOverheated=player.overheated;
  updateHeat(player,dt,time,keys.has(bindings.overdrive),moving);
  if(!wasOverheated&&player.overheated)audio.event('heat');
  if(wasOverheated&&!player.overheated)audio.event('ready');
  if(time-player.lastShot>=.5&&!readySound){audio.event('ready');readySound=true;}if(time-player.lastShot<.5)readySound=false;
  let dx=move.x*BASE_SPEED*player.speed*dt,dz=move.z*BASE_SPEED*player.speed*dt;
  for(const b of world.belts)if(b.active&&inside(player.x,player.z,b)){dx+=b.dx*BASE_SPEED*1.15*dt;dz+=b.dz*BASE_SPEED*1.15*dt;}
  moveEntity(player,dx,dz,.88);
  if(time>acquiredUntil-5&&time<acquiredUntil-4.65&&!moving)moveEntity(player,Math.sin(player.heading)*BASE_SPEED*1.4*dt,Math.cos(player.heading)*BASE_SPEED*1.4*dt,.88);
  if(moving){player.heading+=angleDelta(player.heading,Math.atan2(move.x,move.z))*Math.min(1,dt*12);usedMove=true;}
  player.aim=Math.atan2(aim.x-player.x,aim.z-player.z);
  const hazard=hazardDefinitions.find(h=>inside(player.x,player.z,h));
  if(hazard&&time-lastHazard>=.5){lastHazard=time;hitPlayer(5,player.x,player.z,true);}
  if(player.underpass!==wasUnderpass){
    model.root.traverse(m=>{if(m.isMesh){m.material.depthTest=!player.underpass;m.material.transparent=player.underpass;m.material.opacity=player.underpass?.4:1;m.material.needsUpdate=true;m.renderOrder=player.underpass?10:0;}});
    wasUnderpass=player.underpass;
  }
  model.root.position.set(player.x,playerHeight()+Math.sin(time*3)*.027,player.z);
  model.body.rotation.y=player.heading;model.turret.rotation.y=player.aim;
  model.body.rotation.x=moving?Math.sin(time*16)*.015+(player.speed-1)*.13:Math.sin(time*2)*.01;
  model.body.rotation.z=player.hp<15?Math.sin(time*10)*.035:0;
  model.antenna.rotation.z=Math.sin(time*(moving?13:3))*(moving?.18:.07);model.antenna.rotation.x=(player.speed-1)*.5;
  model.body.position.y=-recoil*.23;model.turret.position.y=recoil*.15;model.barrel.position.z=-recoil;recoil=Math.max(0,recoil-dt*2);
  const forwardMotion = move.x * Math.sin(player.heading) + move.z * Math.cos(player.heading);
  model.rollWheels(dt * 10 * player.speed * forwardMotion);
  model.tracks.forEach(t=>{if(player.overdrive)t.material.color.setHex(C.mint);});
  model.root.scale.set(1+(player.speed-1)*.04,1-(player.speed-1)*.06,1+(player.speed-1)*.06);
  if(player.heat>65&&Math.random()<dt*player.heat*.14)burst(player.x-Math.sin(player.heading),player.z-Math.cos(player.heading),player.overheated?0xd8e2cf:0x6f9383,1,2,.28);
  if(player.speed>1.1&&Math.random()<dt*18)burst(player.x-Math.sin(player.heading)*1.5,player.z-Math.cos(player.heading)*1.5,C.mint,1,.5,.2);
  if(player.hp<15&&Math.random()<dt*5)burst(player.x,player.z,0x30433d,1,1.5,.3);
  model.headlights.forEach(h=>h.visible=player.hp>0);
}
function updateCamera(dt){
  cameraFocus.lerp(new T.Vector3(player.x,0,player.z),1-Math.exp(-dt*5));
  camera.position.copy(cameraFocus).add(cameraOffset);camera.lookAt(cameraFocus);camera.updateMatrixWorld();
  sun.position.set(cameraFocus.x-18,40,cameraFocus.z+16);sun.target.position.copy(cameraFocus);
}
const raycaster=new T.Raycaster(),ground=new T.Plane(new T.Vector3(0,1,0),0);
function updateAim(){
  ground.constant=-playerHeight();
  raycaster.setFromCamera(new T.Vector2(pointer.x/innerWidth*2-1,1-pointer.y/innerHeight*2),camera);raycaster.ray.intersectPlane(ground,aim);
  $('reticle').style.left=`${pointer.x}px`;$('reticle').style.top=`${pointer.y}px`;
}
function drawMap(canvas,large=false){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  const scale=large?Math.min(w/140,h/184):5,ox=large?w/2-33*scale:w/2-player.x*scale,oz=large?h/2-0*scale:h/2-player.z*scale;
  const px=x=>ox+x*scale,pz=z=>oz+z*scale;
  ctx.strokeStyle='#8dae9b0d';ctx.lineWidth=1;
  for(let x=ox%24;x<w;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let z=oz%24;z<h;z+=24){ctx.beginPath();ctx.moveTo(0,z);ctx.lineTo(w,z);ctx.stroke();}
  for(const r of rooms){if(!discovered.has(r.id))continue;ctx.fillStyle='#'+floorColors[r.id].toString(16).padStart(6,'0');ctx.strokeStyle='#90bba07a';ctx.lineWidth=large?2:1;ctx.fillRect(px(r.x),pz(r.z),r.w*scale,r.d*scale);ctx.strokeRect(px(r.x),pz(r.z),r.w*scale,r.d*scale);}
  // Undiscovered neighboring spaces reveal only short, vague connection stubs.
  if(large)for(const r of rooms){if(discovered.has(r.id))continue;for(const known of rooms.filter(k=>discovered.has(k.id))){const ax=Math.max(r.x,known.x),az=Math.max(r.z,known.z),bx=Math.min(r.x+r.w,known.x+known.w),bz=Math.min(r.z+r.d,known.z+known.d);if(ax<=bx&&az<=bz){ctx.fillStyle='#76948635';ctx.fillRect(px((ax+bx)/2)-5,pz((az+bz)/2)-5,10,10);}}}
  const seen=(x,z)=>rooms.some(r=>discovered.has(r.id)&&inside(x,z,r));
  for(const o of world.obstacles)if(seen(o.x+o.w/2,o.z+o.d/2)){ctx.fillStyle='#203f39';ctx.fillRect(px(o.x),pz(o.z),o.w*scale,o.d*scale);}
  for(const b of world.belts)if(seen(b.x,b.z)){ctx.fillStyle=b.active?'#cead68':'#698675';ctx.fillRect(px(b.x),pz(b.z),b.w*scale,b.d*scale);ctx.strokeStyle='#263f32';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(px(b.x),pz(b.z)+(i+.5)*b.d*scale/3);ctx.lineTo(px(b.x+b.w),pz(b.z)+(i+.5)*b.d*scale/3);ctx.stroke();}}
  for(const r of hazardDefinitions)if(seen(r.x,r.z)){ctx.fillStyle='#ed8957';ctx.fillRect(px(r.x),pz(r.z),r.w*scale,r.d*scale);}
  for(const hive of world.hives)if(hive.active&&seen(hive.x,hive.z)){
    ctx.strokeStyle='#c1f6d7';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<7;i++){const a=i*Math.PI/3;ctx.lineTo(px(hive.x)+Math.sin(a)*6,pz(hive.z)+Math.cos(a)*6);}ctx.stroke();ctx.beginPath();ctx.moveTo(px(hive.x)-3,pz(hive.z));ctx.lineTo(px(hive.x)+3,pz(hive.z));ctx.moveTo(px(hive.x),pz(hive.z)-3);ctx.lineTo(px(hive.x),pz(hive.z)+3);ctx.stroke();
  }
  for(const r of world.relays)if(seen(r.x,r.z)){ctx.fillStyle=r.hp?'#f6bc6e':'#243f38';ctx.fillRect(px(r.x)-3,pz(r.z)-3,6,6);}
  for(const e of enemies)if(e.hp>0&&seen(e.x,e.z)&&(large?knownEncounters.has(e.type):enemyVisible(e))){ctx.fillStyle='#ed9d67';ctx.beginPath();ctx.arc(px(e.x),pz(e.z),['elite','boss'].includes(e.type)?7:3,0,Math.PI*2);ctx.fill();}
  ctx.save();ctx.translate(px(player.x),pz(player.z));ctx.strokeStyle='#fff1b0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.sin(player.aim)*17,Math.cos(player.aim)*17);ctx.stroke();ctx.rotate(-player.heading);ctx.fillStyle='#ffe39a';ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(-5,-5);ctx.lineTo(0,-2);ctx.lineTo(5,-5);ctx.closePath();ctx.fill();ctx.restore();
  // Small unlabelled compass tick, fixed north-up.
  ctx.strokeStyle='#a8c8af88';ctx.beginPath();ctx.moveTo(w/2,7);ctx.lineTo(w/2,14);ctx.stroke();
}
function updateHUD(){
  for(let i=0;i<10;i++){const value=player.hp-i*5;hpEl.children[i].className=value<=0?'empty':value<5?'half':'';}
  $('heat').style.strokeDashoffset=String(100-clamp(player.heat,0,100));
  const heatColorRatio=player.overheated?1:clamp(player.heat/100,0,1);
  $('reticle').style.setProperty('--heat-color',`hsl(${48-40*heatColorRatio} 100% ${82-15*heatColorRatio}%)`);
  $('reticle').classList.toggle('hot',player.overheated);
  $('overdrive').style.opacity=player.overdrive?'1':'.15';$('overdrive').lastElementChild.firstElementChild.style.width=`${clamp((player.speed-1)/(OVERDRIVE_MAX_SPEED-1),0,1)*100}%`;
  const active=[elite,boss].find(e=>e.active&&e.hp>0);
  $('boss-health').style.display=active?'flex':'none';if(active)$('boss-health').querySelector('span').style.width=`${active.hp/active.max*100}%`;
  $('glyphs').style.opacity=usedMove&&usedFire&&usedMap?'0':'.7';
  $('glyphs').children[0].style.visibility=usedMove?'hidden':'visible';$('glyphs').children[1].style.visibility=usedMove?'hidden':'visible';$('glyphs').children[2].style.visibility=usedFire?'hidden':'visible';$('glyphs').children[3].style.visibility=usedMap?'hidden':'visible';
  $('acquired').style.display=time<acquiredUntil?'flex':'none';
  const near=world.hives.find(h=>Math.hypot(h.x-player.x,h.z-player.z)<3.5&&(h.id!==2||bossDead));
  $('interaction').style.display=near&&player.hp>0&&!mapOpen&&!paused&&endingTime<0?'block':'none';
  if(near){const v=new T.Vector3(near.x,3,near.z).project(camera);$('interaction').style.left=`${(v.x*.5+.5)*innerWidth}px`;$('interaction').style.top=`${(-v.y*.5+.5)*innerHeight}px`;}
  $('minimap-wrap').style.display=mapOpen?'none':'block';$('reticle').style.display=paused||mapOpen||player.hp<=0||!pointerOverGame?'none':'block';
  $('damage').style.opacity=damageFlash*.6;
  drawMap($('minimap'));if(mapOpen)drawMap($('region-map'),true);
}
function advance(dt){
  if(paused||mapOpen){audio.update(time,player,false,area,true,false);updateHUD();return;}
  time+=dt;opening=Math.max(0,opening-dt);damageFlash=Math.max(0,damageFlash-dt*2.5);
  if(deathTime>=0){
    const elapsed=time-deathTime;model.headlights.forEach(h=>h.visible=false);model.turret.rotation.x=T.MathUtils.damp(model.turret.rotation.x,.45,3,dt);model.body.rotation.z=.09;
    if(Math.random()<dt*14)burst(player.x,player.z,0x273631,1,2,.3);
    $('iris').style.clipPath=`circle(${elapsed<1?0:Math.min(75,(elapsed-1)*65)}% at 50% 50%)`;
    if(elapsed>=3){respawn();model.turret.rotation.x=0;}
  }else{
    $('iris').style.clipPath=`circle(${opening>0?Math.max(0,opening-.2)*65:0}% at 50% 50%)`;
    updateAim();
    if(opening===0&&endingTime<0)updatePlayer(dt);else {model.headlights.forEach((h,i)=>h.visible=opening<.7&&(opening<.25||Math.sin(time*20+i)>0));model.root.position.set(player.x,playerHeight(),player.z);model.antenna.rotation.x=Math.sin(time*2)*.1;}
    const current=rooms.find(r=>inside(player.x,player.z,r));area=current?.id||lastArea;
    if(!discovered.has(area)){discovered.add(area);lastArea=area;save();}
    if(endingTime<0)updateEnemies(dt);
    updateBullets(dt);
    if(endingTime>=0){
      model.turret.rotation.y=T.MathUtils.damp(model.turret.rotation.y,Math.PI,3,dt);model.antenna.rotation.x=-.2;
      if(time-endingTime>3){finished=true;save();$('completion').hidden=false;paused=true;endingTime=-1;}
    }
    updateCamera(dt);
  }
  updateWorld(dt);updateEffects(dt);updateHUD();audio.update(time,player,enemies.some(e=>e.active&&e.hp>0),area,false,moving&&opening===0&&endingTime<0);
}
function resize(){
  renderer.setSize(innerWidth,innerHeight);const viewHeight=34,ratio=innerWidth/innerHeight;
  camera.left=-viewHeight*ratio/2;camera.right=viewHeight*ratio/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();
  $('region-map').width=innerWidth*devicePixelRatio;$('region-map').height=innerHeight*devicePixelRatio;
}
window.addEventListener('resize',resize);resize();updateCamera(1);updateWorld(.01);
let last=performance.now(),accumulator=0,frameCount=0;
function frame(now){
  const delta=Math.min((now-last)/1000,.1);last=now;accumulator+=delta;
  while(accumulator>=1/60){advance(1/60);accumulator-=1/60;}
  renderer.render(scene,camera);frameCount++;requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function keyLabel(code){return code==='Mouse0'?'鼠标左键':code==='Mouse1'?'鼠标中键':code==='Mouse2'?'鼠标右键':code==='Space'?'Space':code.startsWith('Key')?code.slice(3):code.startsWith('Digit')?code.slice(5):code==='ShiftLeft'?'Shift':code;}
const labels={up:'向上移动',left:'向左移动',down:'向下移动',right:'向右移动',fire:'发射主炮',overdrive:'超载引擎',map:'区域地图',repair:'激活维修巢',skip:'跳过死亡动画',pause:'暂停 / 设置'};
function renderBindings(){
  $('bindings').replaceChildren();for(const action of Object.keys(DEFAULT_BINDINGS)){
    const label=document.createElement('span');label.textContent=labels[action];const b=document.createElement('button');b.textContent=rebind===action?'按下新按键…':keyLabel(bindings[action]);b.addEventListener('click',()=>{rebind=action;renderBindings();});$('bindings').append(label,b);
  }
  const glyph=$('glyphs');glyph.children[0].textContent=keyLabel(bindings.up);[bindings.left,bindings.down,bindings.right].forEach((b,i)=>glyph.children[1].children[i].textContent=keyLabel(b));glyph.children[3].textContent=keyLabel(bindings.map);$('interaction').firstElementChild.textContent=keyLabel(bindings.repair);$('acquired').lastElementChild.textContent=keyLabel(bindings.overdrive);
}
function savePrefs(){writeStored(SETTINGS_KEY,{bindings,volume:audio.volume,music:audio.music,sfx:audio.sfx,quality:$('quality').value});}
function setPause(value){paused=value;keys.clear();$('settings').hidden=!value;if(!value){rebind=null;resetArmed=false;$('reset-confirm').hidden=true;renderBindings();}audio.start();}
function setMap(value){mapOpen=value;$('region').hidden=!value;keys.clear();if(value){usedMap=true;drawMap($('region-map'),true);}}
function handleInput(code,repeat=false){
  if(rebind){const old=bindings[rebind];for(const action of Object.keys(bindings))if(bindings[action]===code&&action!==rebind)bindings[action]=old;bindings[rebind]=code;rebind=null;renderBindings();savePrefs();return;}
  if(code===bindings.pause&&!repeat){if(mapOpen)setMap(false);else if($('completion').hidden)setPause(!paused);return;}
  if(paused)return;
  if(code===bindings.map&&!repeat){setMap(!mapOpen);return;}
  if(mapOpen)return;
  if(code===bindings.skip&&deathTime>=0){respawn();model.turret.rotation.x=0;return;}
  keys.add(code);if(repeat)return;
  if(code===bindings.fire)fire();if(code===bindings.repair)repair();
}
window.addEventListener('keydown',e=>{
  if(Object.values(bindings).includes(e.code)||rebind){e.preventDefault();audio.start();handleInput(e.code,e.repeat);}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('pointermove',e=>{pointer.x=e.clientX;pointer.y=e.clientY;pointerOverGame=e.target===$('game');});
$('game').addEventListener('pointerleave',()=>{pointerOverGame=false;});
window.addEventListener('pointerdown',e=>{
  if(rebind){e.preventDefault();e.stopPropagation();handleInput(`Mouse${e.button}`);return;}
  if(e.target!==$('game')&&e.target!==$('region-map'))return;
  audio.start();pointer.x=e.clientX;pointer.y=e.clientY;updateAim();player.aim=Math.atan2(aim.x-player.x,aim.z-player.z);handleInput(`Mouse${e.button}`);
});
window.addEventListener('pointerup',e=>keys.delete(`Mouse${e.button}`));
window.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('blur',()=>{keys.clear();if(!paused&&!mapOpen&&$('completion').hidden)setPause(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();if(!paused&&$('completion').hidden)setPause(true);}});
$('settings-button').addEventListener('click',()=>{setMap(false);setPause(true);});$('resume').addEventListener('click',()=>setPause(false));
$('region').querySelector('button').addEventListener('click',()=>setMap(false));
$('volume').value=prefs.volume??.55;audio.volume=Number($('volume').value);$('music').checked=prefs.music??true;audio.music=$('music').checked;$('sfx').checked=prefs.sfx??true;audio.sfx=$('sfx').checked;
$('quality').value=prefs.quality||'high';
function quality(){const high=$('quality').value==='high';renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.75:1));renderer.shadowMap.enabled=high;scene.traverse(m=>{if(m.isMesh&&m.material)m.material.needsUpdate=true;});resize();}
quality();
$('volume').addEventListener('input',()=>{audio.volume=Number($('volume').value);savePrefs();});$('music').addEventListener('change',()=>{audio.music=$('music').checked;savePrefs();});$('sfx').addEventListener('change',()=>{audio.sfx=$('sfx').checked;savePrefs();});$('quality').addEventListener('change',()=>{quality();savePrefs();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('fullscreen').textContent='当前窗口不支持';}});
$('reset-bindings').addEventListener('click',()=>{bindings={...DEFAULT_BINDINGS};rebind=null;renderBindings();savePrefs();});
function restart(){try{localStorage.removeItem(SAVE_KEY);}catch{}location.reload();}
$('new-game').addEventListener('click',()=>{if(resetArmed)restart();else{resetArmed=true;$('reset-confirm').hidden=false;}});
$('replay').addEventListener('click',restart);$('return-game').addEventListener('click',()=>{$('completion').hidden=true;paused=false;});
renderBindings();
// A development-only observation surface supports reproducible browser verification.
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('test')){
  window.__game={
    snapshot:()=>({player:{...player},time,area,anchor,eliteDead,bossDead,finished,paused,mapOpen,deathTime,discovered:[...discovered],relays:world.relays.map(r=>({id:r.id,hp:r.hp,x:r.x,z:r.z})),enemies:enemies.map(e=>({type:e.type,x:e.x,z:e.z,hp:e.hp,state:e.state,active:e.active,heading:e.heading,openSide:e.openSide,assemblies:[...e.assemblies],core:e.core})),drawCalls:renderer.info.render.calls,frames:frameCount,bindings:{...bindings}}),
    project:(x,z,y=0)=>{const p=new T.Vector3(x,y,z).project(camera);return {x:(p.x*.5+.5)*innerWidth,y:(.5-p.y*.5)*innerHeight};},
    scenario:(data)=>{if(data.player)Object.assign(player,data.player);if(data.enemies)for(const [type,values]of Object.entries(data.enemies))Object.assign(enemies.find(e=>e.type===type),values);if(data.relays)world.relays.forEach((r,i)=>r.hp=data.relays[i]);if(data.time!==undefined)time=data.time;opening=0;deathTime=-1;cameraFocus.set(player.x,0,player.z);updateCamera(1);},
    step:(seconds)=>{for(let i=0;i<seconds*60;i++)advance(1/60);renderer.render(scene,camera);},
    fire,repair,hitPlayer,
    setInput:(codes)=>{keys=new Set(codes);},
    aimAt:(x,z)=>{const p=new T.Vector3(x,playerHeight(),z).project(camera);pointer.x=(p.x*.5+.5)*innerWidth;pointer.y=(.5-p.y*.5)*innerHeight;updateAim();player.aim=Math.atan2(x-player.x,z-player.z);},
    lineClear,collides
  };
}
