import * as T from 'three';
import {tankModel,box,cylinder,ring,mat,C} from './world.js';
import {SIGNAL} from './folded-visibility.js';

// Distinct machines require distinct decisions, not just different health pools.
export const ENEMY_KINDS={
  scout:{role:'pressure',speed:4.5,reach:11,warn:1.1,recovery:2.2,attack:'charge'},
  turret:{role:'ranged',speed:0,reach:27,warn:1.2,recovery:2.2,attack:'shot'},
  guard:{role:'pressure',speed:2.8,reach:12,warn:1.5,recovery:2.2,attack:'shield-shot'},
  skirmisher:{role:'pressure',speed:5,reach:18,warn:.8,recovery:2,attack:'burst'},
  sniper:{role:'ranged',speed:1.8,reach:38,warn:2,recovery:3,attack:'rail'},
  artillery:{role:'ranged',speed:1.5,reach:30,warn:1.4,recovery:3.5,attack:'lob'},
  miner:{role:'pressure',speed:3.6,reach:13,warn:.8,recovery:3,attack:'mine'},
  welder:{role:'pressure',speed:3,reach:8,warn:1.4,recovery:2.6,attack:'sweep'},
  repairer:{role:'support',speed:3.4,reach:10,warn:1,recovery:3,attack:'repair'},
  reflector:{role:'ranged',speed:2.2,reach:16,warn:1.6,recovery:2.8,attack:'reflect'},
  elite:{role:'pressure',speed:3.2,reach:20,warn:1.5,recovery:2.2,attack:'charge'},
  boss:{role:'ranged',speed:0,reach:27,warn:1.4,recovery:3.2,attack:'shot'}
};

export function woundedAlly(enemy,enemies){
  return enemies.filter(e=>e!==enemy&&e.hp>0&&e.hp<e.max&&e.encounter===enemy.encounter&&Math.abs(e.y-enemy.y)<2&&Math.hypot(e.x-enemy.x,e.z-enemy.z)<18)
    .sort((a,b)=>a.hp/a.max-b.hp/b.max)[0];
}

export function foldedEnemyModel(type){
  if(['scout','turret','guard','elite','boss'].includes(type))return tankModel(type);
  const root=new T.Group(),body=new T.Group(),turret=new T.Group(),barrel=new T.Group();root.add(body,turret);turret.add(barrel);
  const tracks=[],moving=[],lamp=mat(C.orange,true);
  const wheel=(x,z,r=.38)=>{const w=cylinder(body,r,.2,x,.45,z,C.track,10);w.rotation.z=Math.PI/2;tracks.push(w);};
  if(type==='skirmisher'){
    box(body,1.4,.65,2,0,.8,0,0xb67345,.2);
    for(const x of [-1,1])for(const z of [-.85,.85])wheel(x,z);
    for(const x of [-.55,.55]){const gun=cylinder(turret,.16,1.7,x,1.35,.75,C.dark,8);gun.rotation.x=Math.PI/2;}
    box(turret,1.4,.5,.7,0,1.25,0,C.metal);
  }else if(type==='sniper'){
    cylinder(body,.8,.5,0,.55,0,C.dark,8);
    for(let i=0;i<3;i++){const leg=box(body,.25,.35,1.7,Math.sin(i*2.094)*.8,.3,Math.cos(i*2.094)*.8,C.metal);leg.rotation.y=i*2.094;}
    cylinder(turret,.45,1.5,0,1.45,0,C.metal,10);
    const gun=box(turret,.24,.3,3.7,0,2.15,.95,C.dark);moving.push(gun);
    box(turret,.5,.5,.2,0,2.15,2.9,lamp);
  }else if(type==='artillery'){
    box(body,2.5,.75,2.5,0,.7,0,0x876755,.2);
    for(const x of [-1.3,1.3])for(const z of [-.8,.8])wheel(x,z,.45);
    const cup=cylinder(turret,.7,1.7,0,1.7,0,C.dark,12);cup.rotation.x=.38;
    ring(turret,.72,.13,0,2.49,.32,C.yellow);moving.push(cup);
    for(const x of [-.8,.8])cylinder(body,.24,.65,x,1.3,-.6,C.orange,8);
  }else if(type==='miner'){
    box(body,1.4,.55,2.4,0,.7,0,0x756d48,.2);
    for(const x of [-.9,.9])for(const z of [-.85,.85])wheel(x,z);
    for(let i=0;i<3;i++)cylinder(body,.42,.22,0,1.15,-.6+i*.55,SIGNAL.magnet,8);
    box(body,1.6,.2,.9,0,.7,-1.6,C.metal);
  }else if(type==='welder'){
    cylinder(body,1.15,.5,0,.45,0,C.track,12);cylinder(body,.7,1.3,0,1.25,0,0xa96137,10);
    for(const x of [-.85,.85]){cylinder(body,.32,1.6,x,1.2,-.4,C.orange,8);ring(body,.34,.08,x,1.8,-.4,C.dark);}
    const nozzle=cylinder(turret,.34,2,0,1.4,1.15,C.dark,10);nozzle.rotation.x=Math.PI/2;moving.push(nozzle);
    cylinder(turret,.5,.2,0,1.4,2.1,lamp,10).rotation.x=Math.PI/2;
  }else if(type==='repairer'){
    cylinder(body,.9,.55,0,.55,0,C.metal,6);
    for(const x of [-1,1])wheel(x,0,.5);
    for(const x of [-.85,.85]){const arm=box(turret,.22,1.4,.3,x,1.4,0,C.metal);arm.rotation.z=x*.4;moving.push(arm);}
    cylinder(turret,.45,.7,0,1.1,0,mat(SIGNAL.open,true),6);
    ring(turret,.85,.08,0,1.9,0,SIGNAL.open);
  }else if(type==='reflector'){
    cylinder(body,1,.6,0,.55,0,C.track,8);box(body,1.5,.75,1.4,0,1.15,0,C.dark);
    const plate=box(turret,2.7,2.1,.18,0,1.6,1.05,mat(0xd9eeee,true));moving.push(plate);
    for(const x of [-1.45,1.45])box(turret,.17,2.4,.4,x,1.6,1,C.metal);
    box(turret,.7,.15,.3,0,2.1,1.2,lamp);
  }
  const eye=box(turret,.45,.18,.15,0,1.5,1.1,lamp);
  const radiator=box(body,.65,.5,.15,0,.9,-1.25,lamp);
  return {root,body,turret,barrel,tracks,radiator,rollWheels:a=>tracks.forEach(w=>w.rotateY(-a)),
    animate(phase,timer,time,dt,active){eye.material.color.setHex(phase==='warn'?C.lightYellow:phase==='vent'?C.orange:active?C.red:C.dark);body.position.y=Math.sin(time*3)*.025;for(const m of moving)m.position.y+=Math.sin(time*20)*dt*(phase==='warn'?.08:0);}
  };
}
