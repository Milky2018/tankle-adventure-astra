import * as T from 'three';
import { box, cylinder, ring, mat, C, batchStatic } from './world.js';
import { gardenRooms, gardenCurrents } from './garden-layout.js';
import { inside } from './mechanics.js';

export function flotationAssembly(parent){
  const root=new T.Group();parent.add(root);const floats=[];
  for(const side of [-1,1]){
    const arm=new T.Group();root.add(arm);arm.position.x=side*1.25;
    box(arm,.3,.16,2.7,0,.4,0,C.dark);box(arm,.8,.6,3.4,0,.18,0,0xd8c184,.25);
    for(const z of [-1,1])box(arm,.84,.1,.22,0,.52,z,C.metal);
    const fin=box(arm,.14,.4,.6,0,.15,-1.8,C.dark);fin.rotation.x=.3;floats.push({arm,side});
  }
  root.visible=false;
  return {update(deployed,time,moving){root.visible=deployed;for(const {arm,side} of floats){arm.position.x=T.MathUtils.damp(arm.position.x,side*(deployed?1.65:1.25),8,1/60);arm.rotation.z=Math.sin(time*3+side)*.015;}root.position.y=moving?Math.sin(time*4)*.025:0;}};
}

export function makeGardens(scene,world,transit,saved={}){
  const fixed=new T.Group();scene.add(fixed);let restored=!!saved?.restored,tenderRepaired=!!saved?.tender;world.state.drained=restored;
  const obstacle=(x,z,w,d,h=2.5,color=0x627b70)=>{const b={x:x-w/2,z:z-d/2,w,d,h,active:true};world.obstacles.push(b);box(fixed,w,h,d,x,h/2,z,color,.12);return b;};
  // One continuous surface mesh avoids seams where canals overlap the reservoir.
  const positions=[],waterRooms=world.rooms.filter(r=>['water','drain'].includes(r.kind));
  for(let x=-186;x<58;x+=2)for(let z=-368;z<-96;z+=2)if(waterRooms.some(r=>inside(x+1,z+1,r))){
    positions.push(x,0,z,x,0,z+2,x+2,0,z,x+2,0,z,x,0,z+2,x+2,0,z+2);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
  const waterMaterial=new T.ShaderMaterial({uniforms:{time:{value:0}},transparent:true,depthWrite:false,
    vertexShader:'varying vec2 point; void main(){point=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform float time; varying vec2 point; void main(){float a=sin(point.x*.42+point.y*.25+time*.6);float b=sin(point.y*.8-point.x*.2-time*.38);float glint=pow(max(0.0,a*b),16.0);vec3 color=mix(vec3(.16,.31,.33),vec3(.34,.51,.49),.5+.25*a);color+=vec3(.36,.36,.27)*glint*.45;gl_FragColor=vec4(color,.92);}'
  });
  const water=new T.Mesh(geometry,waterMaterial);water.position.y=-.24;scene.add(water);
  // Submerged terraces and disconnected growth frames show several historic water levels.
  for(const [x,z,r] of [[-156,-293,5],[-137,-302,4],[-157,-271,4],[-176,-289,4],[-82,-292,5],[-68,-297,4],[-31,-285,4]]){
    cylinder(fixed,r,.7,x,-.65,z,0x3b5750,24);ring(fixed,r,.12,x,-.22,z,0x81937e);
    for(let i=0;i<5;i++){const a=i*2.399,px=x+Math.sin(a)*r*.6,pz=z+Math.cos(a)*r*.6;
      const stem=cylinder(fixed,.13,3+i*.22,px,.6,pz,0x809981,8);stem.rotation.z=Math.sin(a)*.24;
      world.obstacles.push({x:px-.18,z:pz-.18,w:.36,d:.36,h:3+i*.22,active:true});
      ring(fixed,.72,.07,px,2.2+i*.22,pz,0xa8ad8b);box(fixed,.7,.12,.35,px,2.5+i*.22,pz,0x8d9c76).rotation.z=.5;
    }
  }
  // Matching mooring posts and low ramps mark the calm first crossing.
  for(const [x,z] of [[-159,-219],[-159,-246],[-151,-196],[73,-100],[-151,-140]]){
    for(const side of [-1,1]){cylinder(fixed,.2,1.5,x+side*2.3,.55,z,C.dark,8);ring(fixed,.23,.06,x+side*2.3,1.1,z,C.yellow);}
    for(let i=0;i<4;i++)box(fixed,4,.1,.7,x,-.05-i*.055,z+(z===-246?-1:1)*i*.7,0x9da08a);
  }
  // The immobilized ferry is the player's chassis at another scale, with its floats missing.
  obstacle(-159,-212,3,5,1.1,0x6a7d72);box(fixed,3.5,.25,5.8,-159,1.3,-212,0x9b9c7c);
  for(const side of [-1,1])box(fixed,.25,.3,4,-159+side*1.8,1,-212,C.dark);
  for(const x of [-162,-136]){box(fixed,.35,5,.35,x,2.5,-216,C.dark);box(fixed,.9,.18,2,x,5,-216,C.metal);}
  box(fixed,27,.7,.6,-149,5,-216,C.metal);
  // Dry combat lanes have sheltered entries; water opens a second angle on their guns.
  for(const [x,z,w,d] of [[-123,-254,3,10],[-143,-239,3,5],[-179,-278,3,6],[-168,-313,4,3],[-117,-310,3,8],[-139,-285,4,3],[-134,-174,5,3]]){
    obstacle(x,z,w,d);box(fixed,w+.2,.2,d+.2,x,2.65,z,0x94a084);
  }
  // A broken canopy frames the reservoir. No overhead beam is a hidden movement blocker.
  for(const x of [-180,-161,-142,-123]){box(fixed,.5,6,.5,x,3,-318,C.dark);box(fixed,16,.35,.5,x+7,6,-318,0x889b8b);}
  for(const [x,z] of [[-117,-264],[-138,-248],[-177,-257],[-177,-300],[-126,-319],[-146,-276],[-158,-135],[42,-104]]){
    box(fixed,.15,3.5,.15,x,1.75,z,C.dark);box(fixed,.7,.16,.5,x,3.5,z,mat(0xffdea1,true));
  }
  // Outer supply pipes are visibly capped; the centre-facing return still carries heat.
  const pump=new T.Group();scene.add(pump);pump.position.set(-127,0,-284);
  cylinder(pump,2.4,2,0,1,0,0x587367,20);ring(pump,2.45,.18,0,2.1,0,C.metal);
  const rotor=new T.Group();pump.add(rotor);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;box(rotor,1.6,.25,.6,Math.sin(a)*1.3,2.3,Math.cos(a)*1.3,C.yellow).rotation.y=a;}
  world.obstacles.push({x:-129.5,z:-286.5,w:5,d:5,h:2.6,active:true});
  for(const x of [-135,-119]){const pipe=cylinder(fixed,.5,9,x,1.3,-283,C.metal);pipe.rotation.x=Math.PI/2;ring(fixed,.6,.14,x,1.3,-278,C.metal).rotation.x=0;}
  box(fixed,1.3,1.3,.3,-135,1.3,-278,C.dark);
  const returnGlow=box(pump,1.2,.35,.08,2.5,1.2,0,mat(0x8c8869,true));
  const lever={x:-113,z:-273};cylinder(fixed,.5,1.4,lever.x,.7,lever.z,C.dark,10);
  const handle=box(scene,.9,.25,.6,lever.x,1.55,lever.z,mat(C.orange,true));
  const drain=gardenRooms.find(r=>r.kind==='drain'),bridge=new T.Group();scene.add(bridge);
  box(bridge,drain.w,.5,drain.d,drain.x+drain.w/2,-.3,drain.z+drain.d/2,0x6a8275);
  for(let x=drain.x+1;x<drain.x+drain.w;x+=2)box(bridge,.15,.08,drain.d-.8,x,.03,drain.z+drain.d/2,C.metal);
  bridge.position.y=restored?0:-1.7;
  // The former sealed threshold now overlooks the testworks water entrance.
  for(const side of [-1,1]){cylinder(fixed,1,7,-163+side*10,3,-341,C.dark);box(fixed,.25,4,.12,-163+side*10,3,-339.8,C.yellow);}
  for(const x of [-168,-158])box(fixed,.14,.08,17,x,.12,-332,C.metal);
  // Repeated dismantled carriers make the long outlet readable as transport infrastructure.
  for(const [x,z] of [[-154,-183],[-153,-151],[-102,-121],[-30,-121],[20,-121]]){
    const wreck=box(fixed,3,.4,5,x,-.55,z,0x536b63);wreck.rotation.y=.3;
    for(const side of [-1,1])box(fixed,.35,.45,5,x+side*1.6,-.45,z,C.dark);
  }
  const tender={x:-159,z:-300},tenderRoot=new T.Group();scene.add(tenderRoot);tenderRoot.position.set(tender.x,0,tender.z);
  cylinder(tenderRoot,.85,.7,0,.5,0,0x778f72,12);box(tenderRoot,1.4,.3,1.8,0,.2,0,C.dark);
  const tenderHead=box(tenderRoot,.95,.65,.85,0,1.2,0,0xb6b889,.15);
  const tenderEye=box(tenderHead,.6,.1,.04,0,.05,.44,mat(C.dark,true));
  const tenderArms=[];
  for(const side of [-1,1]){const arm=new T.Group();arm.position.set(side*.65,.65,0);tenderRoot.add(arm);box(arm,.17,1.3,.17,0,.6,0,C.metal);ring(arm,.33,.05,0,1.3,0,C.yellow);tenderArms.push({arm,side});}
  const currentMarks=[];
  for(const c of gardenCurrents)for(let i=0;i<7;i++){
    const mark=box(scene,.09,.025,2,c.x+3+(i%3)*4,-.18,c.z+i*4, new T.MeshBasicMaterial({color:0xb3c3ae,transparent:true,opacity:.3,depthWrite:false}));currentMarks.push({mark,c,i});
  }
  const wake=ring(scene,.8,.035,0,-.17,0,new T.MeshBasicMaterial({color:0xbcccb5,transparent:true,opacity:.2,depthWrite:false}));wake.visible=false;
  batchStatic(fixed);
  function restore(){if(restored||!transit.opened.has('garden-feed'))return false;restored=true;world.state.drained=true;return true;}
  function update(dt,time,player,moving){
    tenderHead.rotation.y=tenderRepaired?Math.sin(time*.6)*.35:0;tenderHead.rotation.z=tenderRepaired?0:.35;
    tenderEye.material.color.setHex(tenderRepaired?C.lightYellow:C.dark);
    for(const {arm,side} of tenderArms)arm.rotation.z=T.MathUtils.damp(arm.rotation.z,side*(tenderRepaired?.5+Math.sin(time*.9)*.15:1.9),3,dt);
    waterMaterial.uniforms.time.value=time;bridge.position.y=T.MathUtils.damp(bridge.position.y,restored?0:-1.7,2,dt);
    rotor.rotation.y+=dt*(restored?1.3:.015);returnGlow.material.color.setHex(restored?C.orange:0x8c8869);
    handle.material.color.setHex(restored?0x738e79:transit.opened.has('garden-feed')?C.mint:C.orange);handle.rotation.z=restored?.6:0;
    for(const {mark,c,i} of currentMarks)mark.position.z=c.z+(i*4+time*c.dz)%c.d;
    wake.visible=player.afloat;wake.position.set(player.x,-.17,player.z);wake.scale.set(1.8+(moving?.3:0),1+(moving?.5:0),1);wake.rotation.z=-player.heading;
  }
  return {lever,tender,restore,repairTender:()=>{if(tenderRepaired)return false;tenderRepaired=true;return true;},update,serialize:()=>({restored,tender:tenderRepaired}),get restored(){return restored;},get tenderRepaired(){return tenderRepaired;}};
}
