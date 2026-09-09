import * as T from 'three';
import { box, cylinder, ring, mat, C } from './world.js';

// Each placement serves a specific firing lane, flank, or chain reaction.
export const combatPropDefs=[
  ['crate',-54,-133,3,6],['tank',-66,-132,1.6,1.6],
  ['crate',-86,-141,6,2.5],['tank',-80,-146,1.6,1.6],['tank',-83,-150,1.6,1.6],
  ['crate',-87,-174,5,2.5],['tank',-64,-183,1.6,1.6],
  ['crate',-2,-201,5,2.5],['tank',9,-197,1.6,1.6],
  ['crate',53,-134,3,6],['tank',64,-132,1.6,1.6],
  ['crate',91,-133,2.5,5],['tank',99,-144,1.6,1.6],
  ['crate',64,-82,3,7],['tank',72,-84,1.6,1.6],['tank',75,-80,1.6,1.6],
  ['crate',92,-177,6,2],['tank',90,-173,1.6,1.6],
  ['crate',88,-232,3,8],['tank',97,-235,1.6,1.6],
  ['crate',25,-233,3,8],['tank',30,-228,1.6,1.6]
];
export const VOLATILE={fuse:.8,radius:5.5,enemyDamage:3,playerDamage:8};
export function makeCombatProps(scene,world){
  const props=combatPropDefs.map(([kind,x,z,w,d],id)=>{
    const root=new T.Group();root.position.set(x,0,z);scene.add(root);
    const bounds={x:x-w/2,z:z-d/2,w,d,h:kind==='tank'?2.2:2.5,active:true};world.obstacles.push(bounds);
    const p={id,kind,x,z,w,d,root,bounds,hp:kind==='tank'?1:2,max:kind==='tank'?1:2,fuse:-1,flash:0};
    if(kind==='tank'){
      cylinder(root,.8,1.9,0,1,0,0xb65c3c,12);for(const y of [.3,1.7])ring(root,.82,.12,0,y,0,C.dark);
      p.core=box(root,.6,1.1,.06,0,1,.82,mat(C.orange,true));box(root,1.1,.18,.1,0,1.72,.75,C.yellow);cylinder(root,.2,.4,0,2.05,0,C.dark,8);
      p.warning=ring(scene,VOLATILE.radius+.8,.045,x,.16,z,new T.MeshBasicMaterial({color:C.orange,transparent:true,opacity:.5,depthWrite:false}));p.warning.visible=false;
    }else{
      box(root,w,2.3,d,0,1.2,0,0x99846a);
      for(const side of [-1,1]){box(root,.22,2.5,d+.12,side*(w/2-.4),1.25,0,C.dark);box(root,w+.12,.18,d+.1,0,side*.7+1.2,0,0xb6a180);}
      // Diagonal braces distinguish breakable crates from riveted steel freight cars.
      const brace=box(root,.18,2.7,.12,0,1.2,d/2+.12,0xc9b086);brace.rotation.z=.65;
    }
    return p;
  });
  function hit(p,damage){
    if(!p.bounds.active||p.fuse>=0)return null;
    p.hp=Math.max(0,p.hp-damage);p.flash=.16;
    if(p.hp>0)return 'hit';
    if(p.kind==='tank'){p.fuse=VOLATILE.fuse;p.warning.visible=true;return 'fuse';}
    p.bounds.active=false;p.root.visible=false;return 'break';
  }
  function update(dt,time){
    const detonated=[];
    for(const p of props){
      p.flash=Math.max(0,p.flash-dt);p.root.scale.y=1+p.flash*.25;
      if(p.fuse<0||!p.bounds.active)continue;
      p.fuse-=dt;p.core.material.color.setHex(Math.sin(time*34)>0?0xffeac2:C.orange);p.warning.material.opacity=.35+Math.sin(time*24)*.15;
      if(p.fuse<=0){p.bounds.active=false;p.root.visible=false;p.warning.visible=false;detonated.push(p);}
    }
    return detonated;
  }
  function reset(){for(const p of props){p.hp=p.max;p.fuse=-1;p.flash=0;p.bounds.active=true;p.root.visible=true;p.root.scale.setScalar(1);if(p.warning)p.warning.visible=false;if(p.core)p.core.material.color.setHex(C.orange);}}
  return {props,hit,update,reset};
}
