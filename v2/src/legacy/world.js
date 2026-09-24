import * as T from 'three';
import { hoistDecks } from '../content/prototypes/hoist-layout.js';
import { inRect } from '../world/deck-geometry.js';
import { box, cylinder, ring, mat, material, C, contactShadow, batchStatic } from '../rendering/factory-models.js';
import { transitRooms, transitPalettes, transitHives } from '../content/prototypes/transit-layout.js';
import { gardenRooms, gardenPalettes, gardenHives } from '../content/prototypes/garden-layout.js';
import { midgameRooms, midgameHives } from '../content/prototypes/midgame-layout.js';
import { puzzleRooms } from '../content/prototypes/puzzle-layout.js';
import { inside, clamp } from '../player/mechanics.js';

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
      if(available(x+1+dx*2,z+1+dz*2)||waterAvailable(x+1+dx*2,z+1+dz*2)||hoistDecks.some(d=>d.y===0&&!d.rise&&inRect(x+1+dx*2,z+1+dz*2,d)))continue;
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
