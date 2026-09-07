import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { inside, clamp } from './mechanics.js';

export const C = { yellow: 0xf1bd4b, lightYellow: 0xffda73, dark: 0x173738, track: 0x203b3d, green: 0x438f80, teal: 0x68b39b, edge: 0x102e31, orange: 0xf07941, red: 0xff5837, mint: 0xb5ffe0, metal: 0x749f94, floor: 0x406f63 };
const gradient = new T.DataTexture(new Uint8Array([75, 137, 191, 244]), 4, 1, T.RedFormat);
gradient.needsUpdate = true;
export const mat = (color, glow = false) => glow ? new T.MeshBasicMaterial({ color }) : new T.MeshToonMaterial({ color, gradientMap: gradient });
const cache = new Map();
function material(color) { if (!cache.has(color)) cache.set(color, mat(color)); return cache.get(color); }
const roundCache = new Map();
function geometry(w, h, d, radius) {
  const key = [w,h,d,radius].join(',');
  if (!roundCache.has(key)) roundCache.set(key, radius ? new RoundedBoxGeometry(w,h,d,2,radius) : new T.BoxGeometry(w,h,d));
  return roundCache.get(key);
}
export function box(parent, w, h, d, x, y, z, color, radius = 0.08) {
  const mesh = new T.Mesh(geometry(w,h,d,Math.min(radius, w/3,h/3,d/3)), typeof color === 'number' ? material(color) : color);
  mesh.position.set(x,y,z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function cylinder(parent, r, h, x, y, z, color, segments = 24) {
  const mesh = new T.Mesh(new T.CylinderGeometry(r,r,h,segments), typeof color === 'number' ? material(color) : color);
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
export function tankModel(type = 'player') {
  const root=new T.Group(), body=new T.Group(), turret=new T.Group(); root.add(body); root.add(turret);
  const yellow=type==='player', elite=type==='elite', boss=type==='boss', guard=type==='guard', scout=type==='scout';
  const color=yellow?C.yellow:elite?0x7cb7a4:boss?0x417e70:guard?0x344c4a:scout?0xdd9247:0x56a7a0;
  const tracks=[];
  if (type==='turret') {
    cylinder(body,1.05,.4,0,.2,0,C.dark); cylinder(body,.5,1.5,0,.9,0,C.teal);
    for(let i=0;i<4;i++){const m=box(body,.5,.4,1.5,0,.3,.5,C.dark);m.rotation.y=i*Math.PI/2;}
    box(turret,1.05,.9,1.2,0,1.6,0,color,.2);
  } else {
    for(const side of [-1,1]) {
      box(body,.74,.95,2.9,side*1.13,.56,0,C.track,.25);
      for(let i=0;i<6;i++) {
        const w=cylinder(body,.30,.12,side*1.52,.5,-1.03+i*.41,C.metal,12);w.rotation.z=Math.PI/2;
        tracks.push(w);
        box(body,.77,.12,.19,side*1.13,1.035,-1.2+i*.46,elite?C.orange:C.metal,.03);
      }
      box(body,.7,.2,2.5,side*1.14,1.12,0,color,.08);
    }
    box(body,2.15,.73,2.45,0,.94,0,color,.23);
    box(body,1.8,.18,2.05,0,1.38,0,yellow?C.lightYellow:color,.08);
    box(body,1.8,.22,.32,0,.55,1.5,C.dark);
    for(const s of [-1,1]){cylinder(body,.2,.8,s*.75,1.5,-1.05,C.dark);cylinder(body,.23,.13,s*.75,1.93,-1.05,C.metal);}
    if(!scout){cylinder(turret,.85,.25,0,1.54,0,C.dark);box(turret,1.8,.82,1.6,0,1.98,0,color,.25);box(turret,1.37,.14,1.17,0,2.45,-.05,yellow?C.lightYellow:color,.08);cylinder(turret,.40,.13,-.23,2.57,-.15,C.dark);}
    else {const wedge=box(body,2,.6,1.7,0,1.3,.4,color,.14);wedge.rotation.x=-.2;box(body,2.5,.25,.4,0,.6,1.6,C.metal);}
  }
  const barrel=new T.Group();turret.add(barrel);
  if(!scout) {
    const y=type==='turret'?1.7:2.0;
    const b=cylinder(barrel,type==='turret'?.19:.32,type==='turret'?3:1.85,0,y,1.55,C.dark);b.rotation.x=Math.PI/2;
    const b2=cylinder(barrel,type==='turret'?.27:.46,.7,0,y,type==='turret'?2.75:2.1,color);b2.rotation.x=Math.PI/2;
    const hole=cylinder(barrel,type==='turret'?.17:.28,.02,0,y,type==='turret'?3.11:2.46,0x0b2228);hole.rotation.x=Math.PI/2;
    box(turret,.85,.17,.8,.1,type==='turret'?2.1:2.6,-.12,C.dark);
  }
  const headlights=[];
  for(const s of [-1,1]){box(body,.5,.42,.22,s*.67,1.15,1.23,C.dark);headlights.push(box(body,.32,.22,.03,s*.67,1.18,1.36,mat(yellow?0xffffcb:C.red,true)));}
  const antenna=new T.Group();antenna.position.set(.7,1.4,-.9);body.add(antenna);cylinder(antenna,.045,1.45,0,.72,0,C.dark,6);sphere(antenna,.115,0,1.5,0,yellow?C.lightYellow:C.red);
  const radiator=box(body,1.1,.5,.18,0,1.1,-1.35,mat(elite?C.orange:C.red,true));
  for(let i=0;i<5;i++)box(body,.09,.55,.04,-.45+i*.22,1.1,-1.46,C.dark,.015);
  const frontArmor=guard?box(body,2.65,1.3,.65,0,1.25,1.22,mat(C.dark),.12):null;
  if(elite){box(body,.7,.55,1.7,-.8,1.6,-.5,C.orange);box(body,.7,.55,1.7,.8,1.6,-.5,C.orange);root.scale.setScalar(1.35);}
  if(boss){root.scale.setScalar(2.8);box(body,2.5,.75,1.8,0,1.7,-.6,C.dark,.2);for(const s of [-1,1]){box(body,.85,1.9,1.15,s*1.65,1.6,-.2,C.teal,.2);box(body,.6,1.0,.15,s*1.65,1.6,.41,C.dark);}}
  const outlineMat=new T.MeshBasicMaterial({color:0x183731,side:T.BackSide});
  const shells=[];root.traverse(m=>{if(m.isMesh&&m.material.isMeshToonMaterial&&m.geometry.type==='RoundedBoxGeometry'){const outline=new T.Mesh(m.geometry,outlineMat);outline.scale.setScalar(1.035);shells.push([m,outline]);}});
  for(const [m,o]of shells)m.add(o);
  return {
    root,body,turret,barrel,tracks,antenna,headlights,radiator,frontArmor,
    rollWheels(angle) {
      // The mounting rotation maps each cylinder's local Y axle to hull -X.
      for (const wheel of tracks) wheel.rotateY(-angle);
    }
  };
}

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
  {id:'pocket3',x:52,z:-6,w:6,d:8}
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
  const available=(x,z)=>rooms.some(r=>inside(x,z,r));
  function obstacle(x,z,w,d,h=2,color=C.green){const r={x:x-w/2,z:z-d/2,w,d};obstacles.push(r);box(fixed,w,h,d,x,h/2,z,color,.16);box(fixed,w+.15,.16,d+.15,x,h+.07,z,C.teal);return r;}
  // A continuous factory foundation anchors the walkways above service trenches.
  box(fixed,150,.7,205,35,-3.4,0,0x203e3b,.1);
  for(let x=-28;x<106;x+=12)box(fixed,.18,.03,190,x,-3.02,0,0x2d5047,.01);
  for(let z=-88;z<92;z+=12)box(fixed,140,.03,.18,35,-3.01,z,0x2d5047,.01);
  // Broad slabs, recessed seams and low rounded perimeter armour keep the world legible.
  for(const r of rooms){
    box(fixed,r.w,.8,r.d,r.x+r.w/2,-.46,r.z+r.d/2,0x294f49,.12);
    box(fixed,r.w-.12,.12,r.d-.12,r.x+r.w/2,-.02,r.z+r.d/2,r.id==='boss'?0x536953:r.id==='west'?0x667966:C.floor,.025);
    for(let x=r.x+2;x<r.x+r.w;x+=4)for(let z=r.z+2;z<r.z+r.d;z+=4){
      box(fixed,3.86,.022,3.86,x,.06,z,((Math.floor(x+z)%3)===0)?0x477869:((Math.floor(x-z)%4)===0)?0x3c6b60:C.floor,.03);
      if(Math.sin(x*7+z*3)>.15)for(const s of [-1,1])cylinder(fixed,.07,.028,x+s*1.55,.086,z-1.55,0x769182,6);
    }
  }
  // Derive all perimeter collision from the same navigable union as rendering.
  for(let x=-20;x<92;x+=2)for(let z=-80;z<80;z+=2){
    if(!available(x+1,z+1))continue;
    for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){
      if(available(x+1+dx*2,z+1+dz*2))continue;
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
    hives.push({id,x,z,root,petals,beacon,active:id===0});
  }
  hive(-6,6,0);hive(53,38,1);hive(0,-70,2);
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
  for(const [x,z] of [[-17,4],[-17,-11],[10,17],[29,14],[60,9],[93,28],[28,58],[74,63]]){
    cylinder(fixed,2.3,4.3,x,1.5,z,C.dark);cylinder(fixed,2.1,3.2,x,2,z,C.green);ring(fixed,2.13,.12,x,3.4,z,C.metal);cylinder(fixed,.7,2.5,x,4.5,z,C.teal);
  }
  // Batch immutable geometry by material; animation remains independent.
  fixed.updateMatrixWorld(true);
  const batches=new Map();fixed.traverse(m=>{if(m.isMesh){const g=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(m.matrixWorld);const list=batches.get(m.material)||[];list.push(g);batches.set(m.material,list);}});
  fixed.clear();
  for(const [m,gs] of batches){const merged=mergeGeometries(gs);const mesh=new T.Mesh(merged,m);mesh.castShadow=true;mesh.receiveShadow=true;fixed.add(mesh);gs.forEach(g=>g.dispose());}
  return {rooms,obstacles,belts,hives,relays,animated,scraps,gates,exitDoor,exitLight,available};
}
