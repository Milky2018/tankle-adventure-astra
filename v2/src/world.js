import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { batchStatic } from './static-batching.js';
export { batchStatic } from './static-batching.js';
import { transitRooms, transitPalettes, transitHives } from './transit-layout.js';
import { gardenRooms, gardenPalettes, gardenHives } from './garden-layout.js';
import { midgameRooms, midgameHives } from './midgame-layout.js';
import { puzzleRooms } from './puzzle-layout.js';
import { inside, clamp, CHARGE } from './mechanics.js';

export const C = { yellow: 0xf1bd4b, lightYellow: 0xffda73, dark: 0x173738, track: 0x203b3d, green: 0x507e70, teal: 0x638e81, edge: 0x102e31, orange: 0xf07941, red: 0xff5837, mint: 0xb5ffe0, metal: 0x749f94, floor: 0x406f63 };
const gradient = new T.DataTexture(new Uint8Array([75, 137, 191, 244]), 4, 1, T.RedFormat);
gradient.needsUpdate = true;
export const mat = (color, glow = false) => glow ? new T.MeshBasicMaterial({ color }) : new T.MeshToonMaterial({ color, gradientMap: gradient });
const cache = new Map();
function material(color) { if (!cache.has(color)) cache.set(color, mat(color)); return cache.get(color); }
const roundCache = new Map();
const primitiveCache = new Map();
function primitive(key,create) {
  if(!primitiveCache.has(key))primitiveCache.set(key,create());
  return primitiveCache.get(key);
}
function geometry(w, h, d, radius) {
  const key = [w,h,d,radius].join(',');
  if (!roundCache.has(key)) roundCache.set(key, radius ? new RoundedBoxGeometry(w,h,d,2,radius) : new T.BoxGeometry(w,h,d));
  return roundCache.get(key);
}
export function box(parent, w, h, d, x, y, z, color, radius = 0.08) {
  // Sub-pixel bevels on thin floor plates and markings do not need rounded geometry.
  if(Math.min(w,h,d)<=.08&&radius<=.05)radius=0;
  const mesh = new T.Mesh(geometry(w,h,d,Math.min(radius, w/3,h/3,d/3)), typeof color === 'number' ? material(color) : color);
  mesh.position.set(x,y,z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function cylinder(parent, r, h, x, y, z, color, segments = 24) {
  const mesh = new T.Mesh(primitive(`cylinder/${r}/${h}/${segments}`,()=>new T.CylinderGeometry(r,r,h,segments)), typeof color === 'number' ? material(color) : color);
  mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
export function sphere(parent, r, x, y, z, color) {
  const m = new T.Mesh(new T.SphereGeometry(r,12,8), typeof color === 'number' ? material(color) : color);
  m.position.set(x,y,z); parent.add(m); return m;
}
export function ring(parent, radius, tube, x, y, z, color) {
  const m = new T.Mesh(new T.TorusGeometry(radius,tube,6,36), typeof color === 'number' ? material(color) : color);
  m.rotation.x = Math.PI/2; m.position.set(x,y,z); parent.add(m); return m;
}
const shadowPixels=new Uint8Array(64*64*4);
for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const alpha=Math.max(0,1-Math.hypot((x-31.5)/31.5,(y-31.5)/31.5));
  const index=(y*64+x)*4;shadowPixels[index+3]=Math.round(alpha*alpha*110);
}
const shadowTexture=new T.DataTexture(shadowPixels,64,64);shadowTexture.needsUpdate=true;shadowTexture.magFilter=T.LinearFilter;
const shadowMaterial=new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false});
function contactShadow(parent,size,x=0,z=0){
  const mesh=new T.Mesh(new T.PlaneGeometry(size,size),shadowMaterial);
  mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.125,z);parent.add(mesh);return mesh;
}

// Reclaimed factory tools: silhouette and moving parts explain each combat role.
function factoryEnemy(type) {
  const root=new T.Group(),body=new T.Group(),turret=new T.Group(),barrel=new T.Group(),antenna=new T.Group();
  root.add(body,turret);turret.add(barrel);body.add(antenna);
  const scout=type==='scout',elite=type==='elite',boss=type==='boss',guard=type==='guard';
  contactShadow(root,boss?4:3.8).position.y=.125/(boss?2.8:elite?1.35:1);
  body.position.y=turret.position.y=-.15;
  const enamel=scout?0xc57948:elite?0xdbb783:boss?0x7c8981:guard?0x798e89:0xc3c9b0;
  const tracks=[],jaws=[],shutters=[];
  const eyeMaterial=mat(C.red,true),headlights=[];
  let frontArmor=null;
  const lamp=(parent,w,h,x,y,z)=>{const m=box(parent,w,h,.045,x,y,z,eyeMaterial,.025);headlights.push(m);return m;};
  if(type==='turret'){
    cylinder(body,.92,.3,0,.2,0,C.dark,12);
    for(const x of [-.7,.7])for(const z of [-.6,.6])box(body,.4,.35,.65,x,.22,z,C.metal);
    cylinder(body,.36,1.1,0,.75,0,C.dark,12);cylinder(body,.55,.18,0,1.12,0,C.orange,12);
    box(turret,1.25,.75,1.15,0,1.4,0,enamel,.18);
    // The hood rises during charging, revealing the hot welding coil.
    const hood=new T.Group();hood.position.set(0,1.75,-.4);turret.add(hood);
    box(hood,1.55,.18,1.4,0,0,.35,enamel);shutters.push(hood);
    lamp(turret,.9,.15,0,1.5,.59);
    for(const x of [-.55,.55]){const cable=cylinder(turret,.12,.95,x,1.4,-.55,C.dark,8);cable.rotation.x=.5;}
  }else{
    const span=boss?1.15:1.0;
    for(const side of [-1,1]){
      box(body,.6,.7,2.45,side*span,.5,0,C.track,.2);
      for(let i=0;i<4;i++){const wheel=cylinder(body,.26,.12,side*(span+.32),.5,-.85+i*.56,C.metal,10);wheel.rotation.z=Math.PI/2;tracks.push(wheel);}
      box(body,.65,.18,2.4,side*span,.94,0,enamel);
    }
    box(body,boss?2.65:2.1,.65,2.1,0,.95,0,enamel,.2);
    if(scout){
      box(body,1.25,.5,1.2,0,1.43,-.35,C.dark,.18);
      box(body,1.45,.18,1.35,0,1.75,-.4,enamel);
      lamp(body,.95,.18,0,1.45,.27);
      for(const side of [-1,1]){
        const jaw=new T.Group();jaw.position.set(side*.85,.9,.6);body.add(jaw);
        box(jaw,.42,.55,.95,0,0,.28,enamel);box(jaw,.7,.35,.3,-side*.18,-.18,.72,C.metal);
        box(jaw,.13,.32,.2,-side*.42,-.12,.72,C.dark);jaws.push(jaw);
      }
      cylinder(body,.4,.12,0,1.82,-.45,C.metal,12);
    }else if(guard){
      // A tall refractory shield has a small sight slit and visibly layered edges.
      frontArmor=box(body,2.65,1.65,.5,0,1.18,1.05,mat(0x405756),.13);
      for(const side of [-1,1])box(frontArmor,.24,1.8,.6,side*1.16,0,0,C.metal);
      for(const y of [-.53,.53])box(frontArmor,2.05,.13,.05,0,y,.28,0xc6b383);
      lamp(body,.8,.13,0,1.95,1.34);
      box(turret,1.25,.6,1.35,0,2.1,-.2,enamel,.18);
      for(const side of [-1,1])cylinder(body,.17,1,side*.65,1.7,-.8,C.dark,10);
    }else if(elite){
      box(body,1.25,.65,1.8,0,1.38,-.2,C.dark,.15);
      box(body,2.4,.55,.55,0,.9,1.24,C.metal,.12);
      for(const x of [-.8,0,.8])box(body,.17,.6,.09,x,.9,1.54,C.orange);
      lamp(body,1.1,.17,0,1.8,.64);
      for(const side of [-1,1]){
        const hatch=new T.Group();hatch.position.set(side*.25,1.6,-.6);body.add(hatch);
        box(hatch,.8,.25,1.55,side*.38,0,0,enamel);shutters.push(hatch);
        for(let i=0;i<4;i++)box(body,.64,.08,.14,side*.7,1.65,-1+i*.27,C.orange);
      }
      box(turret,.75,.4,.65,0,1.9,.2,C.dark);
    }else if(boss){
      cylinder(body,1.33,1.7,0,1.9,-.1,enamel,12);
      for(const y of [1.2,2.4])ring(body,1.38,.13,0,y,-.1,C.dark);
      cylinder(body,.9,.4,0,2.9,-.3,C.dark,12);cylinder(body,.72,.12,0,3.12,-.3,mat(C.orange,true),12);
      for(const x of [-.63,.63]){
        cylinder(body,.25,1.6,x,2.95,-.7,C.dark,10);cylinder(body,.3,.15,x,3.75,-.7,C.metal,10);
        const hatch=new T.Group();hatch.position.set(x,2.55,.1);body.add(hatch);
        box(hatch,.65,.25,1.1,0,0,0,enamel);shutters.push(hatch);
      }
      // A recessed furnace door frames the actual core added by the encounter.
      box(body,1.65,1.3,.28,0,1.3,1.25,C.dark,.16);
      for(const x of [-.77,.77])box(body,.18,1.15,.25,x,1.3,1.48,C.metal);
      lamp(body,.85,.12,0,2.4,1.13);
      box(turret,1.35,.42,.9,0,2.25,.15,C.dark);
    }
  }
  if(!scout){
    const y=type==='turret'?1.45:guard?2.1:boss?2.25:1.9;
    const length=type==='turret'?1.45:.85;
    const gun=cylinder(barrel,boss?.23:.16,length,0,y,.9,C.dark,12);gun.rotation.x=Math.PI/2;
    const muzzle=cylinder(barrel,boss?.32:.25,.25,0,y,.9+length/2,enamel,12);muzzle.rotation.x=Math.PI/2;
    const bore=cylinder(barrel,.13,.03,0,y,1.04+length/2,0x102326,12);bore.rotation.x=Math.PI/2;
    for(let i=0;i<3;i++){const coil=cylinder(barrel,.21,.09,0,y,.6+i*.19,C.orange,12);coil.rotation.x=Math.PI/2;}
  }
  const radiator=box(body,elite?1.35:.8,elite?.7:.45,.06,0,1.2,-1.12,mat(C.dark,true));
  for(let i=0;i<5;i++)box(body,.065,elite?.68:.45,.06,-.5+i*.25,1.2,-1.17,C.dark,.01);
  root.scale.setScalar(boss?2.8:elite?1.35:1);
  return {root,body,turret,barrel,tracks,antenna,headlights,radiator,frontArmor,
    rollWheels(angle){for(const w of tracks)w.rotateY(-angle);},
    animate(state,timer,time,dt,active){
      const warning=state==='warn',vent=state==='vent'||state==='stunned',charge=state==='charge';
      const tension=warning?1-clamp(timer/(scout?1.05:elite||boss?1.7:guard?1.5:1.15),0,1):0;
      eyeMaterial.color.setHex(!active?0x8f6854:vent?C.orange:warning?0xffdb8b:C.red);
      body.rotation.x=T.MathUtils.damp(body.rotation.x,charge?-.07:warning?.10:0,10,dt);
      jaws.forEach((jaw,i)=>{jaw.rotation.y=T.MathUtils.damp(jaw.rotation.y,(i?-1:1)*(warning?.15+tension*.35:charge?-.15:.08),12,dt);});
      shutters.forEach((h,i)=>{const target=type==='turret'?(vent?-.95:tension*-.7):vent?(i?-1:1)*1.05:0;h.rotation[type==='turret'?'x':'z']=T.MathUtils.damp(h.rotation[type==='turret'?'x':'z'],target,7,dt);});
      turret.position.y=-.15+(warning?Math.sin(time*45)*tension*.018:0);
    }
  };
}

export function chargeWarning(type) {
  const { radius, speed, duration } = CHARGE[type], length = speed * duration;
  const path = new T.Shape();
  path.absarc(0, 0, radius, Math.PI, Math.PI * 2, false);
  path.lineTo(radius, length);
  path.absarc(0, length, radius, 0, Math.PI, false);
  path.closePath();
  const root = new T.Group();
  const shape = new T.Mesh(new T.ShapeGeometry(path, 24), new T.MeshBasicMaterial({color: C.orange, transparent: true, opacity: .25, depthWrite: false, side: T.DoubleSide}));
  shape.rotation.x = Math.PI / 2; shape.position.y = .10; root.add(shape);
  const outline = new T.LineLoop(new T.BufferGeometry().setFromPoints(path.getPoints(24).map(p => new T.Vector3(p.x, .12, p.y))), new T.LineBasicMaterial({color: 0xffd38e, depthWrite: false}));
  root.add(outline);
  return { root, shape };
}

export function tankModel(type = 'player') {
  if (type !== 'player') return factoryEnemy(type);
  const root=new T.Group(),body=new T.Group(),turret=new T.Group();root.add(body,turret);
  const tracks=[];contactShadow(root,4.4);
  for(const side of [-1,1]){
    box(body,.74,.95,2.9,side*1.13,.56,0,C.track,.25);
    for(let i=0;i<6;i++){
      const wheel=cylinder(body,.30,.12,side*1.52,.5,-1.03+i*.41,C.metal,12);wheel.rotation.z=Math.PI/2;tracks.push(wheel);
      box(body,.77,.12,.19,side*1.13,1.035,-1.2+i*.46,C.metal,.03);
    }
    box(body,.7,.2,2.5,side*1.14,1.12,0,C.yellow);
  }
  box(body,2.15,.73,2.45,0,.94,0,C.yellow,.23);box(body,1.8,.18,2.05,0,1.38,0,C.lightYellow);
  box(body,1.8,.22,.32,0,.55,1.5,C.dark);
  for(const side of [-1,1]){cylinder(body,.2,.8,side*.75,1.5,-1.05,C.dark);cylinder(body,.23,.13,side*.75,1.93,-1.05,C.metal);}
  cylinder(turret,.85,.25,0,1.54,0,C.dark);box(turret,1.8,.82,1.6,0,1.98,0,C.yellow,.25);
  box(turret,1.37,.14,1.17,0,2.45,-.05,C.lightYellow);cylinder(turret,.40,.13,-.23,2.57,-.15,C.dark);
  const barrel=new T.Group();turret.add(barrel);
  cylinder(barrel,.32,1.85,0,2,1.55,C.dark).rotation.x=Math.PI/2;
  cylinder(barrel,.46,.7,0,2,2.1,C.yellow).rotation.x=Math.PI/2;
  cylinder(barrel,.28,.02,0,2,2.46,0x0b2228).rotation.x=Math.PI/2;
  box(turret,.85,.17,.8,.1,2.6,-.12,C.dark);
  const headlights=[];
  for(const side of [-1,1]){box(body,.5,.42,.22,side*.67,1.15,1.23,C.dark);headlights.push(box(body,.32,.22,.03,side*.67,1.18,1.36,mat(0xffffcb,true)));}
  const antenna=new T.Group();antenna.position.set(.7,1.4,-.9);body.add(antenna);
  cylinder(antenna,.045,1.45,0,.72,0,C.dark,6);sphere(antenna,.115,0,1.5,0,C.lightYellow);
  const radiator=box(body,1.1,.5,.18,0,1.1,-1.35,mat(C.red,true));
  for(let i=0;i<5;i++)box(body,.09,.55,.04,-.45+i*.22,1.1,-1.46,C.dark,.015);
  const outlineMat=new T.MeshBasicMaterial({color:0x183731,side:T.BackSide}),shells=[];
  root.traverse(m=>{if(m.isMesh&&m.material.isMeshToonMaterial&&m.geometry.type==='RoundedBoxGeometry'){const outline=new T.Mesh(m.geometry,outlineMat);outline.scale.setScalar(1.035);shells.push([m,outline]);}});
  for(const [mesh,outline]of shells)mesh.add(outline);
  return {root,body,turret,barrel,tracks,antenna,headlights,radiator,
    rollWheels(angle){
      // The mounting rotation maps each cylinder's local Y axle to hull -X.
      for(const wheel of tracks)wheel.rotateY(-angle);
    }
  };
}

export const floorColors = {...Object.fromEntries(midgameRooms.map(r=>[r.id,r.color])),...Object.fromEntries(puzzleRooms.map(r=>[r.id,r.color])),...Object.fromEntries(gardenRooms.map(r=>[r.id,gardenPalettes[r.palette]])),...Object.fromEntries(transitRooms.map(r=>[r.id,transitPalettes[r.palette]])),a:0x7b8276,ab:0x777767,b:0x64776b,bc:0x64776b,c:0x5e7a70,west:0x82715b,east:0x577984,'elite-path':0x727565,elite:0x767360,gate:0x707265,boss:0x665f53,exit:0x869283,pocket1:0x82715b,pocket2:0x577984,pocket3:0x64776b};
export const rooms = [
  {id:'a',x:-12,z:-12,w:24,d:24},
  {id:'ab',x:12,z:-4,w:26,d:8},
  {id:'b',x:38,z:-8,w:14,d:18},
  {id:'bc',x:42,z:10,w:6,d:10},
  {id:'c',x:34,z:20,w:32,d:24},
  {id:'west',x:12,z:24,w:22,d:26},
  {id:'east',x:66,z:20,w:22,d:28},
  {id:'elite-path',x:48,z:44,w:8,d:8},
  {id:'elite',x:38,z:52,w:28,d:26},
  {id:'gate',x:-3,z:-28,w:6,d:16},
  {id:'boss',x:-18,z:-62,w:36,d:34},
  {id:'exit',x:-5,z:-78,w:10,d:16},
  {id:'pocket1',x:6,z:38,w:6,d:8},
  {id:'pocket2',x:78,z:48,w:8,d:6},
  {id:'pocket3',x:52,z:-6,w:6,d:8},
  ...transitRooms, ...gardenRooms, ...puzzleRooms, ...midgameRooms
];
export const beltDefinitions = [
  {id:'a-gate',x:-3,z:-19.5,w:6,d:3,dx:0,dz:1,gate:true},
  {id:'bc-gate',x:42,z:14.6,w:6,d:2.4,dx:0,dz:1,gate:true},
  {id:'practice',x:46,z:73,w:12,d:2,dx:1,dz:0,practice:true},
  {id:'boss-left',x:-15,z:-49,w:7,d:16,dx:-1,dz:0,boss:0},
  {id:'boss-right',x:8,z:-49,w:7,d:16,dx:1,dz:0,boss:1}
];
export const hazardDefinitions = [{x:-17,z:-52,w:3,d:20},{x:14,z:-52,w:3,d:20}];
export function elevation(x,z) {
  if (x>=70 && x<=86 && z>=24 && z<=44) return 2.4 * Math.min(clamp((z-24)/5,0,1),clamp((44-z)/5,0,1));
  return 0;
}
export function makeWorld(scene) {
  const fixed=new T.Group();scene.add(fixed);
  const obstacles=[], belts=[], hives=[], relays=[], animated=[], scraps=[], gates=[];
  const state={drained:false};
  const available=(x,z)=>rooms.some(r=>r.kind!=='water'&&(r.kind!=='drain'||state.drained)&&inside(x,z,r));
  const waterAvailable=(x,z)=>rooms.some(r=>['water','drain'].includes(r.kind)&&inside(x,z,r));
  function obstacle(x,z,w,d,h=2,color=C.green){
    const r={x:x-w/2,z:z-d/2,w,d,h};obstacles.push(r);contactShadow(fixed,Math.max(w,d)*1.8,x,z);
    box(fixed,w,h,d,x,h/2,z,color,.16);box(fixed,w+.15,.16,d+.15,x,h+.07,z,C.teal);
    box(fixed,w*.7,h*.56,.035,x,h*.52,z+d/2+.025,C.dark);
    for(let i=0;i<4;i++)box(fixed,w*.58,.06,.06,x,h*.34+i*h*.12,z+d/2+.05,C.metal,.015);
    for(const side of [-1,1])box(fixed,.17,h*.82,.12,x+side*(w/2-.22),h*.51,z+d/2+.08,C.metal,.02);
    return r;
  }
  // A continuous factory foundation anchors the walkways above service trenches.
  box(fixed,280,.7,414,0,-3.4,-105,0x203e3b,.1);
  for(let x=-132;x<132;x+=12)box(fixed,.18,.03,414,x,-3.02,-105,0x2d5047,.01);
  for(let z=-306;z<92;z+=12)box(fixed,280,.03,.18,0,-3.01,z,0x2d5047,.01);
  // Broad slabs, recessed seams and low rounded perimeter armour keep the world legible.
  const floorRooms=[];
  for(const room of rooms){
    if(room.kind==='water'||room.kind==='drain')continue;
    let parts=[room];
    if(midgameRooms.includes(room))for(const previous of floorRooms){
      parts=parts.flatMap(r=>{
        const left=Math.max(r.x,previous.x),right=Math.min(r.x+r.w,previous.x+previous.w),top=Math.max(r.z,previous.z),bottom=Math.min(r.z+r.d,previous.z+previous.d);
        if(left>=right||top>=bottom)return [r];
        return [{...r,w:left-r.x},{...r,x:right,w:r.x+r.w-right},{...r,x:left,w:right-left,d:top-r.z},{...r,x:left,w:right-left,z:bottom,d:r.z+r.d-bottom}].filter(p=>p.w>0&&p.d>0);
      });
    }
    floorRooms.push(...parts);
  }
  for(const r of floorRooms){
    if(r.kind==='water'||r.kind==='drain')continue;
    box(fixed,r.w,.8,r.d,r.x+r.w/2,-.46,r.z+r.d/2,0x294f49,.12);
    box(fixed,r.w-.12,.12,r.d-.12,r.x+r.w/2,-.02,r.z+r.d/2,floorColors[r.id],.025);
    for(let left=r.x;left<r.x+r.w;left+=4)for(let top=r.z;top<r.z+r.d;top+=4){
      const w=Math.min(4,r.x+r.w-left),d=Math.min(4,r.z+r.d-top),x=left+w/2,z=top+d/2;
      box(fixed,w-.06,.022,d-.06,x,.06,z,new T.Color(floorColors[r.id]).offsetHSL(0,0,Math.floor(x+z)%3===0?.018:-.012).getHex(),.03);
      if(w>3&&d>3&&Math.sin(x*7+z*3)>.15)for(const s of [-1,1])cylinder(fixed,.07,.028,x+s*1.55,.086,z-1.55,0x769182,6);
    }
  }
  for(const r of rooms){
    if(r.kind==='water'||r.kind==='drain')continue;
    for(let i=0;i<Math.floor(r.w*r.d/90);i++){
      const x=r.x+2+((i*7.7+3)%(r.w-4)),z=r.z+2+((i*11.3+1)%(r.d-4));
      const patch=box(fixed,1.6,.018,.55,x,.086,z,0x616859,.02);patch.rotation.y=i*.71;
      box(fixed,.65,.025,.05,x,.11,z,0x959981,.005);
    }
  }
  // Derive all perimeter collision from the same navigable union as rendering.
  for(let x=-206;x<272;x+=2)for(let z=-472;z<80;z+=2){
    if(!available(x+1,z+1))continue;
    for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){
      if(available(x+1+dx*2,z+1+dz*2)||waterAvailable(x+1+dx*2,z+1+dz*2))continue;
      const px=x+1+dx,pz=z+1+dz;
      box(fixed,dx?.4:2.2,.72,dz?.4:2.2,px,.4,pz,C.dark,.1);
      box(fixed,dx?.48:2.2,.15,dz?.48:2.2,px,.85,pz,C.teal,.05);
      if((x+z)%6===0){box(fixed,.55,1.12,.55,px,.6,pz,C.green);box(fixed,.6,.15,.6,px,1.22,pz,C.metal);}
    }
  }
  // Entrance inspection cradle.
  cylinder(fixed,4.3,.23,0,.15,6,C.dark,48);cylinder(fixed,3.85,.12,0,.32,6,0x577e6b,48);ring(fixed,3.65,.045,0,.4,6,C.yellow);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;box(fixed,.38,.07,.65,Math.sin(a)*4,.3,6+Math.cos(a)*4,C.yellow,.02);}
  obstacle(-8,-5,3.4,5,3.2);obstacle(8,-6,3.2,4.5,2.7);
  for(const x of [-8,8]){cylinder(fixed,1.05,1,x,3.4,-5,C.dark);ring(fixed,.85,.09,x,3.95,-5,C.orange);for(let k=0;k<4;k++)box(fixed,.15,1.8,.4,x-.8+k*.53,2,-2.7,C.dark);}
  // B: fragile scrap and a compact first combat silhouette.
  obstacle(31,-1,2,2,1.8);obstacle(42,-5,3,3,2.2);
  for(const [x,z] of [[19,0],[23,1.5],[37,3.8]]){const mesh=box(scene,1.2,1.3,1.1,x,.7,z,0x999466);mesh.rotation.y=x;box(mesh,.9,.12,1.14,0,0,0,C.dark);scraps.push({x,z,hp:1,mesh,r:.85});}
  // C: a stopped assembly arm; two independently powered connections.
  obstacle(50,30,5,5,1.5,C.dark);cylinder(fixed,1.8,2.5,50,2.5,30,C.green);cylinder(fixed,1.35,.35,50,3.95,30,C.yellow);
  const arm=new T.Group();arm.position.set(50,4.1,30);fixed.add(arm);
  function strut(a,b,width,color){const av=new T.Vector3(...a),bv=new T.Vector3(...b),m=box(arm,width,av.distanceTo(bv),width,...av.clone().add(bv).multiplyScalar(.5).toArray(),color,.16);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());}
  strut([0,0,0],[0,2.8,-3.2],1.3,C.teal);strut([0,2.8,-3.2],[0,1.4,-6],1.1,C.green);
  strut([.75,.2,-.3],[.75,2.4,-3.2],.25,C.dark);strut([.75,2.4,-3.2],[.75,1.6,-5.8],.19,C.metal);
  for(const [y,z,r] of [[0,0,.85],[2.8,-3.2,.72],[1.4,-6,.5]])cylinder(arm,r,1.5,0,y,z,C.yellow).rotation.z=Math.PI/2;
  box(arm,.75,1.8,.8,0,.45,-6,C.dark);box(arm,2.1,.45,1,0,-.55,-6,C.metal);for(const x of [-.9,.9])box(arm,.35,1,.55,x,-.95,-6,C.teal);

  for(const [x,z] of [[21,36],[31,36]]) {
    cylinder(fixed,1.5,.3,x,3,z,C.dark,32);ring(fixed,1.25,.12,x,3.2,z,C.metal);
    for(let i=0;i<7;i++)box(fixed,.14,1.3,.12,x-1.2+i*.4,1.6,z+4.55,C.dark,.02);
    for(const side of [-1,1]){const pipe=cylinder(fixed,.22,3.2,x+side*2.1,2.6,z,C.teal);pipe.rotation.x=Math.PI/2;}
  }
  // Branches are loops around machinery, with two entrances from the courtyard.
  obstacle(31,36,6,8,2.8);obstacle(21,36,6,9,2.4);obstacle(68,29,4,3,1.5);obstacle(68,39,4,3,1.5);
  for(const x of [18,23]){cylinder(fixed,1.3,3,x,1.5,47,C.teal);ring(fixed,1.32,.1,x,2.4,47,C.dark);}
  // The east loop rises to a firing gallery, with open underpass scenery beneath.
  const ramp=(z,sign)=>{const geo=new T.BoxGeometry(16,.25,Math.hypot(5,2.4));const m=new T.Mesh(geo,material(0x638f7c));m.position.set(78,1.2,z);m.rotation.x=sign*-Math.atan2(2.4,5);fixed.add(m);};
  ramp(26.5,1);ramp(41.5,-1);box(fixed,16,.32,10,78,2.24,34,C.green);
  for(const x of [70.3,85.7])for(const z of [29,34,39]){box(fixed,.25,1,.25,x,2.9,z,C.yellow);box(fixed,.15,.15,5,x,3.35,z,C.dark);}
  for(const z of [29,39])for(const x of [72,84])box(fixed,.6,2.4,.6,x,1.2,z,C.dark);
  for(const z of [30,31,32,33,34,35,36,37,38])box(fixed,13,.025,.09,78,2.41,z,0x8bb39a,.01);
  // Empty expansion pockets contain only quiet moving machinery.
  for(const [x,z] of [[8,42],[82,51],[55,-2]]) {const f=new T.Group();f.position.set(x,.15,z);scene.add(f);cylinder(f,1.15,.3,0,0,0,C.dark);for(let i=0;i<4;i++){const b=box(f,.55,.12,1.8,0,.3,.3,C.metal);b.rotation.y=i*Math.PI/2;}animated.push({mesh:f,kind:'fan'});}
  // Furnace conduits and heavy industrial silhouettes behind the traversable floor.
  for(const x of [-22,22])for(const z of [-35,-48,-59]){
    cylinder(fixed,2.2,6,x,2,z,C.dark);cylinder(fixed,2.05,3.7,x,3,z,C.green);ring(fixed,2.12,.18,x,4.8,z,C.metal);cylinder(fixed,1.5,.3,x,5.1,z,mat(C.orange,true));
    const pipe=cylinder(fixed,.6,8,x>0?18:-18,1,z,C.teal);pipe.rotation.z=Math.PI/2;
  }
  // Conveyor surfaces physically agree with their animated tread direction.
  for(const b of beltDefinitions){
    const group=new T.Group();scene.add(group);box(fixed,b.w,.15,b.d,b.x+b.w/2,.14,b.z+b.d/2,C.dark);
    const parts=[],alongZ=!!b.dz,span=alongZ?b.d:b.w;
    for(let i=0;i<Math.ceil(span/.45)+1;i++){const p=box(group,alongZ?b.w-.2:.19,.13,alongZ?.19:b.d-.2,b.x+b.w/2,.26,b.z+b.d/2,0x82927a,.02);parts.push(p);}
    for(const s of [-1,1]){const roller=cylinder(fixed,.22,alongZ?b.w:b.d,b.x+b.w/2+(alongZ?0:s*b.w/2),.22,b.z+b.d/2+(alongZ?s*b.d/2:0),C.yellow);roller.rotation[alongZ?'z':'x']=Math.PI/2;}
    belts.push({...b,parts,offset:0,active:true});
    if(b.gate){for(const x of [b.x-.18,b.x+b.w+.18]){box(fixed,.45,2.4,b.d+.6,x,1.15,b.z+b.d/2,C.dark);box(fixed,.5,.28,b.d+.65,x,2.4,b.z+b.d/2,C.yellow);for(let i=0;i<3;i++)box(fixed,.48,.17,.25,x,1.9,b.z+.2+i*.6,C.orange);}}
  }
  for(const r of hazardDefinitions){box(fixed,r.w,.06,r.d,r.x+r.w/2,.13,r.z+r.d/2,mat(0xf46d31,true));for(let i=0;i<12;i++){const m=box(scene,.8,.025,1.6,r.x+.5+(i%3)*.9,.18,r.z+1+i*1.5,mat(0xffbf59,true));animated.push({mesh:m,kind:'lava',phase:i});}}
  // Side ramps remain traversable: hazards never reposition the player.
  for(const r of hazardDefinitions)for(const z of [-51,-32])box(fixed,r.w,.08,1.6,r.x+r.w/2,.2,z,0x9a8f64);
  function hive(x,z,id){
    const root=new T.Group();root.position.set(x,0,z);scene.add(root);
    cylinder(root,2,.2,0,.2,0,C.dark,6);ring(root,1.7,.08,0,.32,0,mat(C.mint,true));
    const petals=[];for(let i=0;i<6;i++){const a=i*Math.PI/3,p=new T.Group();p.position.set(Math.sin(a)*1.35,.35,Math.cos(a)*1.35);p.rotation.y=a;root.add(p);box(p,.85,1.15,.55,0,.4,0,C.teal,.14);box(p,.7,.14,.6,0,1,0,C.yellow);petals.push(p);}
    const beacon=new T.Group();root.add(beacon);ring(beacon,.5,.11,0,2.4,0,mat(C.mint,true));box(beacon,.15,.8,.15,0,2.4,0,mat(C.mint,true));box(beacon,.8,.15,.15,0,2.4,0,mat(C.mint,true));
    const tools=[];
    for(const side of [-1,1]){
      const tool=new T.Group();tool.position.set(side*1.8,.5,0);root.add(tool);
      cylinder(tool,.24,.35,0,0,0,C.dark,10);
      box(tool,.25,1.3,.3,0,.65,0,C.metal);
      box(tool,.75,.22,.3,-side*.26,1.3,0,C.teal);
      const tip=box(tool,.2,.24,.23,-side*.62,1.27,0,mat(C.mint,true));
      tools.push({root:tool,tip,side});
    }
    hives.push({id,x,z,root,petals,beacon,tools,active:id===0});
  }
  hive(-6,6,0);hive(53,38,1);hive(0,-70,2);
  for(const def of [...transitHives,...gardenHives,...midgameHives])hive(...def);
  for(const [id,x,z] of [[0,16,29],[1,82,33]]){
    const root=new T.Group();root.position.set(x,elevation(x,z),z);scene.add(root);
    cylinder(root,1.3,.4,0,.25,0,C.dark,6);box(root,1.7,1.7,1.3,0,1.2,0,C.teal,.2);const core=box(root,1.1,1.05,.18,0,1.35,.74,mat(C.orange,true));ring(root,.75,.12,0,2.25,0,C.yellow);
    relays.push({id,x,z,hp:2,root,core});
    const points=[new T.Vector3(x,.1,z),new T.Vector3(x,.1,48),new T.Vector3(50+(id?1:-1),.1,48)];
    const cable=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),30,.07,5,false),mat(C.orange,true));scene.add(cable);relays[id].cable=cable;
  }
  function gate(x,z,w,id){const root=new T.Group();root.position.set(x,0,z);scene.add(root);for(const s of [-1,1]){box(fixed,.9,3.7,1.1,x+s*w/2,1.7,z,C.dark);box(fixed,1.05,.5,1.25,x+s*w/2,3.4,z,C.yellow);}const bars=[];for(let i=0;i<5;i++)bars.push(box(root,w,.11,.12,0,.4+i*.58,0,mat(id==='elite'?0xfa8051:0xffba70,true)));gates.push({id,x,z,w,root,bars,open:false});}
  gate(52,49,8,'elite');gate(0,-63,10,'exit');
  // Elite arena cover; neither charges nor shells may tunnel through these blocks.
  obstacle(49.5,53,2,2,1.8);obstacle(54.5,53,2,2,1.8);
  obstacle(43,62,3,3,2.8);obstacle(61,69,3,3,2.8);
  for(let i=0;i<8;i++)box(fixed,.35,.025,1.1,41+i*3,.1,55,C.yellow,.01);
  // Door silhouette and undefined exterior light.
  for(const x of [-6,6])box(fixed,2,7,3,x,3,-76,C.green,.25);
  box(fixed,14,1.2,3,0,6.7,-76,C.dark,.2);
  const exitLight=box(scene,9.8,5.8,.1,0,2.8,-77,mat(0xffffdb,true));exitLight.visible=false;
  const exitDoor=box(scene,9.7,5.7,.8,0,2.8,-76,0x759b82,.15);
  for(let i=0;i<6;i++)box(exitDoor,9.4,.08,.05,0,-2.4+i*.9,.43,C.dark,.01);
  // Service fittings use broad readable forms: pipes, vents and striped steel bumpers.
  for(const [x,z,rot] of [[-9,2,0],[9,7,0],[39,7,1.57],[58,22,1.57],[35,41,0],[13,35,0],[64,57,0]]) {
    const group=new T.Group();group.position.set(x,0,z);group.rotation.y=rot;fixed.add(group);
    box(group,1.2,.5,3.5,0,.3,0,C.dark,.12);
    for(let i=0;i<7;i++)box(group,.88,.1,.13,0,.6,-1.35+i*.45,C.metal,.02);
    const pipe=cylinder(group,.18,3.4,.85,.4,0,C.yellow,12);pipe.rotation.x=Math.PI/2;
    for(const s of [-1,1])cylinder(group,.24,.4,.85,.25,s*1.5,C.dark);
  }
  for(const [x,z] of [[-8,-5],[8,-6],[21,36],[31,36]]) {
    for(let i=0;i<5;i++) {const stripe=box(fixed,.38,.35,.09,x-1+i*.5,.6,z+2.3,C.yellow,.01);stripe.rotation.z=-.5;}
  }
  // An overhead service gantry frames the maintenance passage.
  for(const z of [-4.6,4.6]){box(fixed,.8,5,.8,34,2.2,z,C.dark);box(fixed,.95,.22,.95,34,4.7,z,C.yellow);}
  box(fixed,1.1,.65,10,34,5,0,C.teal,.15);
  for(let i=0;i<8;i++)box(fixed,1.15,.16,.2,34,5.37,-4+i*1.2,C.yellow,.02);
  // Distant plant structures fill the horizon without blocking gameplay.
  for(const [x,z] of [[10,17],[29,14],[60,9],[93,28],[28,58],[74,63]]){
    cylinder(fixed,2.3,4.3,x,1.5,z,C.dark);cylinder(fixed,2.1,3.2,x,2,z,C.green);ring(fixed,2.13,.12,x,3.4,z,C.metal);cylinder(fixed,.7,2.5,x,4.5,z,C.teal);
  }
  // Discarded hulls move away from the cradle into a still-working reclamation press.
  const recycleBase=new T.Group();recycleBase.position.z=6;fixed.add(recycleBase);
  const reclamation=new T.Group();reclamation.position.set(-16,0,6);scene.add(reclamation);
  box(recycleBase,4,.6,22,-16,-.1,0,C.dark);
  for(let z=-9;z<=10;z+=.7)box(recycleBase,3.7,.12,.2,-16,.26,z,0x776f58);
  for(const x of [-18,-14])box(recycleBase,.3,.6,22,x,.4,0,C.metal);
  for(const x of [-18,-14])box(recycleBase,.8,5,3,x,2.3,-9,C.dark);
  box(recycleBase,5.4,1.1,3,-16,4.8,-9,0x9e7857);
  const mouth=box(reclamation,3.3,2.3,.06,0,1.55,-10.3,mat(C.orange,true));
  box(reclamation,1.9,1.6,.08,0,1.35,-10.25,mat(0xffd491,true));
  box(reclamation,3.2,.08,4,0,.34,-8.6,mat(C.orange,true));
  box(reclamation,3.4,.16,.35,0,.4,-6.6,mat(0xffcf86,true));
  const press=box(reclamation,3.5,1,2.5,0,3.6,-8.8,C.dark,.12);
  for(let i=0;i<6;i++)box(press,.28,.5,.1,-1.35+i*.54,-.2,1.3,C.yellow);
  cylinder(recycleBase,1,4,-16,6.5,-10,C.dark,12);ring(recycleBase,1.05,.13,-16,7.3,-10,C.metal);
  const refuse=[];
  for(let i=0;i<3;i++){
    const wreck=new T.Group();reclamation.add(wreck);
    box(wreck,1.7,.55,2.1,0,.65,0,0x68766d);
    for(const side of [-1,1])box(wreck,.5,.6,2.2,side*.9,.45,0,C.track,.12);
    const hatch=box(wreck,.8,.3,1,0,1.05,0,0x9f977c);hatch.rotation.z=.3;
    refuse.push(wreck);
  }
  animated.push({kind:'recycler',mesh:reclamation,press,mouth,refuse});
  // An obsolete scanner rejects the wake-up platform; its orange X is a machine signal.
  const inspection=new T.Group();inspection.position.set(0,0,6);scene.add(inspection);
  for(const x of [-4.6,4.6])box(fixed,.5,3.8,.5,x,1.8,3,C.dark);
  box(fixed,9.7,.45,.7,0,3.7,3,C.metal);
  const scan=box(inspection,7.7,.018,.14,0,.5,-3,mat(C.orange,true));
  const reject=new T.Group();reject.position.set(0,3.8,-2.6);inspection.add(reject);
  box(reject,1.1,.72,.12,0,0,0,C.dark);
  for(const angle of [-.75,.75]){const slash=box(reject,.55,.07,.04,0,0,.09,mat(C.orange,true));slash.rotation.z=angle;}
  animated.push({kind:'inspection',mesh:inspection,scan,reject});
  // Repeated physical symbols identify docking and reclamation without route arrows.
  for(const [x,z,r] of [[0,6,4.8],[50,30,4.4],[52,65,8.2],[0,-51,10]]){
    ring(fixed,r,.025,x,.095,z,0x9d9c7e);
    for(const side of [-1,1])box(fixed,.11,.025,2,x+side*(r+.4),.10,z,C.yellow,.01);
  }
  // West: dry scrap sorting. East: blue-green coolant pipes and pale gallery decking.
  for(const x of [21,31]){
    for(let i=0;i<4;i++)box(fixed,4,.26,1,x,2.85+i*.17,34+i*.8,0x9e7857);
    for(const side of [-1,1])box(fixed,.22,3.4,.2,x+side*2.2,1.6,36,C.dark);
  }
  for(const z of [22,46]){
    const pipe=cylinder(fixed,.38,19,77,1.0,z,0x709caa,12);pipe.rotation.z=Math.PI/2;
    for(const x of [69,77,85]){const collar=cylinder(fixed,.48,.25,x,1,z,C.dark,12);collar.rotation.z=Math.PI/2;}
  }
  // Quiet pools of work light, with the emitting fixture visible in the scene.
  for(const [x,z] of [[-9,-9],[10,9],[39,23],[63,41],[14,25],[87,45],[39,74],[17,-58]]){
    box(fixed,.18,2.8,.18,x,1.3,z,C.dark);
    box(fixed,.9,.23,.65,x,2.75,z,C.metal);
    box(fixed,.68,.05,.5,x,2.61,z,mat(0xffe4ae,true));
    const pool=new T.Mesh(new T.CircleGeometry(2.1,24),new T.MeshBasicMaterial({color:0xffd994,transparent:true,opacity:.065,depthWrite:false}));
    pool.rotation.x=-Math.PI/2;pool.position.set(x,.105,z);fixed.add(pool);
  }

  batchStatic(fixed);
  return {rooms,obstacles,belts,hives,relays,animated,scraps,gates,exitDoor,exitLight,available,waterAvailable,state};
}
