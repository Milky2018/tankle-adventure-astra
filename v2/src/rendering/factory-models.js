import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export { batchStatic } from './static-batching.js';
import { clamp, CHARGE } from '../player/mechanics.js';

export const C = { yellow: 0xf1bd4b, lightYellow: 0xffda73, dark: 0x173738, track: 0x203b3d, green: 0x507e70, teal: 0x638e81, edge: 0x102e31, orange: 0xf07941, red: 0xff5837, mint: 0xb5ffe0, metal: 0x749f94, floor: 0x406f63 };
const gradient = new T.DataTexture(new Uint8Array([75, 137, 191, 244]), 4, 1, T.RedFormat);
gradient.needsUpdate = true;
export const mat = (color, glow = false) => glow ? new T.MeshBasicMaterial({ color }) : new T.MeshToonMaterial({ color, gradientMap: gradient });
const cache = new Map();
export function material(color) {
  if (!cache.has(color)) {
    const base = mat(color);
    Object.defineProperty(base, 'isSharedPrimitive', { value: true });
    cache.set(color, base);
  }
  return cache.get(color);
}
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
export function contactShadow(parent,size,x=0,z=0){
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
  return {root,body,turret,barrel,tracks,antenna,headlights,radiator,frontArmor,phaseMaterials:[eyeMaterial],
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

export function chargeWarning(type, speedScale = 1) {
  const { radius, speed, duration } = CHARGE[type], length = speed * duration * speedScale;
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
