import {explorationRooms} from './folded-exploration-layout.js';
import {expansionRooms} from './folded-expansion-layout.js';
// Room envelopes follow existing supporting floors. Open connections are carved
// from actual neighboring floors and lift shafts, not inventory checks.
export const REGION_NAMES={
 foundry:'Recycling Foundry',transit:'Freight Exchange',garden:'Sunken Gardens',
 testworks:'Proving Grounds',optics:'Silent Observatory',circulation:'Circulation Works',furnace:'Central Furnace'
};
export const REGION_STYLE={
  foundry:{wall:0x887569,frame:0x334341,roof:0x625b51,accent:0xbc9263,floor:0x756d62,surface:'brick',paving:'ash'},
  transit:{wall:0x7c8d98,frame:0x344754,roof:0x617581,accent:0xbcb6a2,floor:0x82949c,surface:'steel',paving:'steel'},
  garden:{wall:0x8d9a7f,frame:0x4d6455,roof:0x8b9e91,accent:0xbac5a1,floor:0x9aa38b,surface:'stone',paving:'stone'},
  testworks:{wall:0xc6c4af,frame:0x414b50,roof:0x929b97,accent:0xbda581,floor:0x96998f,surface:'enamel',paving:'enamel'},
  optics:{wall:0xd2cfc0,frame:0x454253,roof:0x838392,accent:0xc7ad81,floor:0x85818f,surface:'optical',paving:'optical'},
  circulation:{wall:0x897363,frame:0x394e4d,roof:0x606b67,accent:0xbc8d69,floor:0x637b76,surface:'ceramic',paving:'ceramic'},
  furnace:{wall:0x70655f,frame:0x3a3639,roof:0x524849,accent:0x9e8070,floor:0x716663,surface:'brick',paving:'ash'}
};
// Courtyards, exposed banks and long inspection walks retain the open skyline.
export const OPEN_ROOMS=new Set(['turntable','garden-bank','pump-terrace','rear-dock','ferry-cradle','bridge-underside','canal-landing','guardian-court','predecessor-gallery','reservoir-east-bank','reservoir-filter-bank','reservoir-pump-island','proving-impact','proving-observation','lens-west-gallery','lens-north-gallery','lens-east-gallery']);
// [support, region, wall height, roof]. Enclosed halls keep Mortar headroom.
export const ROOM_PLAN=[
  ['garden-foundry-walk','garden',5,false],['garden-care','garden',16,true],['sorting-bay','testworks',24,true],
  ['foundry-awakening','foundry',16,true],['foundry-west','foundry',16,true],
  ['press-working-floor','foundry',16,true],['reclaim-sorting-bay','foundry',16,true],['prototype-return','foundry',6,true],['prototype-court','foundry',24,true],['recycling-furnace','foundry',24,true],
  ['turntable','transit',16,true],['roof-junction','transit',16,true],['hub-entry','transit',16,true],['loading-descent-top','transit',16,true],['loading','transit',16,true],['mortar-apron','transit',16,true],['training-gallery','transit',16,true],['freight','transit',16,true],
  ['ferry-cradle','garden',5,false],['bridge-underside','garden',3.5,false],['canal-landing','garden',4,false],
  ['garden-bank','garden',5,false],['pump-terrace','garden',5,false],['rear-dock','garden',5,false],
  ['common-benches','testworks',5,false],['carrier-landing','transit',24,true],['phoenix-cradle','testworks',16,true],
  ['calibration','optics',16,true],['mirror-service-gallery','optics',16,true],['guardian-court','optics',10,false],
  ['circulation-yard','circulation',16,true],['circulation-rig','circulation',16,true],['pressure-release-court','circulation',16,true],
  ['predecessor-gallery','furnace',7,false],['predecessor-mount','furnace',16,true],['predecessor-cooling','furnace',16,true],['predecessor-dock','furnace',16,true],['last-refuge','furnace',16,true],['keeper-court','furnace',24,true],['central-furnace','furnace',24,true]
];
// Authored receiving bays frame the first route. Openings correspond to the
// service ramp, local shutter and later engine return.
const roomWalls={
  'common-benches':[[128.05,-10,.8,8],[104,-1.95,24,.8]],
  'carrier-landing':[[63.15,-78,.8,26],[116.05,-78,.8,26],[64,-78.85,7.9,.8],[84.1,-78.85,31.9,.8],[64,-51.95,39.9,.8]],
  'phoenix-cradle':[[64,-94.85,28,.8],[63.15,-94,.8,16],[64,-77.95,7.9,.8],[84.1,-77.95,7.9,.8]],
  'calibration':[[224.1,-36.85,11.8,.8],[196,-36.85,15.9,.8],[196,-11.95,7.9,.8]],
  'mirror-service-gallery':[[208.1,23.15,15.8,.8],[208.1,40.05,27.9,.8]],
  'guardian-court':[[179.15,44,.8,46],[228.05,44,.8,46],[180,43.15,15.9,.8],[208.1,43.15,19.9,.8],[192.1,90.05,35.9,.8]],
  'circulation-yard':[[148,52.05,87.9,.8],[147.15,36,.8,16],[196.1,35.15,39.8,.8]],
  'circulation-rig':[[208,136.05,52,.8],[207.15,100,.8,36],[220.1,99.15,15.8,.8]],
  'pressure-release-court':[[208,3.15,52,.8],[260.05,4,.8,24],[220.1,28.05,27.8,.8]],
  'predecessor-gallery':[[40.1,12.05,21.8,.8],[92.1,-.85,15.8,.8],[28,-.85,43.9,.8]],
  'predecessor-dock':[[72,-12.85,20,.8],[71.15,-12,.8,11.9],[92.05,-12,.8,11.9]],
  'last-refuge':[[28,-24.85,28,.8],[56.05,-24,.8,24]],
  'keeper-court':[[-28.85,12,.8,48],[28.05,12,.8,48],[-28,11.15,11.9,.8],[16.1,11.15,11.9,.8]],
  'central-furnace':[[-16,-16.85,32,.8],[-16.85,-16,.8,28],[16.05,-16,.8,28]],
  'ferry-cradle':[[-52.85,-14,.8,16],[-52,-14.85,12,.8]],
  'bridge-underside':[[-29.8,2.05,61.8,.8],[-30,-10.85,29.9,.8]],
  'canal-landing':[[28,-22.85,12,.8],[27.15,-22,.8,9.9]],
  'garden-bank':[[31.15,12,.8,16],[32,28.05,8,.8],[50,28.05,3.9,.8]],
  'pump-terrace':[[52,-36.85,52,.8]],
  'rear-dock':[[76,28.05,5.9,.8]],
  'turntable':[[-16,36.05,46,.8],[-16.85,10,.8,11.9],[-16,9.15,9.9,.8]],
  'hub-entry':[[42.05,-2,.8,38],[30,36.05,12,.8],[30,-2.85,12,.8]],
  'loading':[[-6,-40.85,42,.8],[6.1,-27.95,19.3,.8]],
  'training-gallery':[[-56.85,22,.8,18],[-56,21.15,12,.8],[-56,40.05,12,.8]],
  'freight':[[37.1,-40.85,18.8,.8],[37.1,-27.95,30.8,.8]],
  'foundry-awakening':[[-14,98.05,28,.8],[14.05,74,.8,24],[-14,73.15,7.9,.8],[6.1,73.15,7.9,.8],[-14.85,74,.8,5.9],[-14.85,92.1,.8,5.9]],
  'foundry-west':[[-46.85,80,.8,12],[-33.9,79.15,19.8,.8],[-46,92.05,32,.8]],
  'press-working-floor':[[-46,37.15,24,.8],[-21.95,38,.8,18],[-46.85,38,.8,5.9]],
  'reclaim-sorting-bay':[[-70.85,94,.8,22],[-70,93.15,7.9,.8],[-70,116.05,7.9,.8]],
  'prototype-return':[[-34.85,56,.8,60],[-21.95,56,.8,60]],
  'prototype-court':[[-50,115.15,15.9,.8],[-21.9,115.15,7.9,.8],[-50,140.05,36,.8],[-13.95,116,.8,24]]
};
const overlaps=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.z<b.z+b.d+pad&&a.z+a.d>b.z-pad;
const height=(d,z)=>d.y+(d.rise||0)*Math.max(0,Math.min(1,(z-d.z)/d.d));

export function buildArchitecture(decks,lifts){
  const solids=[],rooms=[],seen=new Set();
  function add(room,kind,x,y,z,w,h,d){
    if(w<=0||h<=0||d<=0)return;
    const s={id:`architecture-${solids.length}`,room:room.id,region:room.region,kind,x,y,z,w,h,d,permanent:true};
    // All existing routes, including water and swept lift volumes, keep their clearance.
    if(decks.some(f=>overlaps(s,f,.02)&&Math.min(height(f,z),height(f,z+d))<y+h+.1&&Math.max(height(f,z),height(f,z+d))+3.4>y))return;
    if(lifts.some(l=>overlaps(s,l,.15)&&l.stops[0]<y+h&&l.stops.at(-1)+4>y))return;
    if(kind==='roof'){
      const other=solids.find(o=>o.kind==='roof'&&Math.abs(o.y-y)<.01&&overlaps(s,o,-.001));
      if(other){
        // Neighboring room envelopes can overlap without sharing their tile grid.
        // Keep one ceiling surface instead of coplanar, flickering fragments.
        const left=Math.max(x,other.x),right=Math.min(x+w,other.x+other.w);
        const north=Math.max(z,other.z),south=Math.min(z+d,other.z+other.d);
        for(const [px,pz,pw,pd]of [[x,z,left-x,d],[right,z,x+w-right,d],[left,z,right-left,north-z],[left,south,right-left,z+d-south]]){
          if(pw>.01&&pd>.01)add(room,kind,px,y,pz,pw,h,pd);
        }
        return;
      }
    }
    const key=[x,y,z,w,h,d].map(n=>n.toFixed(2)).join('/');if(seen.has(key))return;seen.add(key);solids.push(s);return s;
  }
  for(const [id,region,h,roof]of [...ROOM_PLAN,...[...expansionRooms,...explorationRooms].map(r=>[r.id,r.region,16,!OPEN_ROOMS.has(r.id)])]){
    const f=decks.find(d=>d.id===id),room={...f,region,h,roof};rooms.push(room);
    // Roof construction precedes the authored-wall branches: all hall types
    // receive ceilings, while floor and lift intersections carve real openings.
    if(roof)for(let x=f.x;x<f.x+f.w;x+=8)for(let z=f.z;z<f.z+f.d;z+=8){
      let w=Math.min(8,f.x+f.w-x),d=Math.min(8,f.z+f.d-z),lift=0;
      if(region==='garden'){
        // Surviving greenhouse strips leave most of the roof open to daylight.
        if((Math.floor((x-f.x)/8)+Math.floor((z-f.z)/8))%3)continue;
        w=Math.min(2,w);
      }else if(region==='foundry'){
        lift=Math.floor((z-f.z)/8)%2?2:0;d=Math.max(.2,d-1.2);
      }else if(region==='transit'){
        lift=4*Math.max(0,1-Math.abs((x+w/2-f.x)/f.w*2-1));
        if(Math.abs(x+w/2-f.x-f.w/2)<4)w=Math.max(.2,w-2);
      }else if(region==='testworks'||region==='optics'){
        // A continuous roof light follows the room's principal axis.
        if(f.w>f.d&&Math.abs(z+d/2-f.z-f.d/2)<4)d=Math.max(.2,d-2);
        if(f.w<=f.d&&Math.abs(x+w/2-f.x-f.w/2)<4)w=Math.max(.2,w-2);
      }
      add(room,'roof',x,f.y+h+lift,z,w,.55,d);
    }
    function wall(x,z,w,d,height,offset){
      const along=w>d,span=along?w:d;
      // Openings are real projectile sightlines above a solid Tank-height sill.
      // Posts and headers stay within the old wall footprint and route clearance.
      const section=(kind,bottom,top,width=span)=>add(room,kind,x,f.y+bottom,z,along?width:w,top-bottom,along?d:width);
      if(height<4)return section('wall',0,height);
      const profile={foundry:[4.2,10,1.1],transit:[3,8,.65],garden:[1.2,height-.4,.22],testworks:[3.2,7,.45],optics:[2.6,height-3,1.1],circulation:[3,8,.7],furnace:[height,height,1.3]}[region];
      const [sill,lintel,pier]=profile;
      // Furnace buttresses and Foundry service bays retain substantial closed mass.
      if(region==='furnace'||['foundry','transit','circulation'].includes(region)&&Math.floor(offset/8)%2===0||region==='optics'&&offset%24<16){
        return section('wall',0,height);
      }else{
        const base=section('wall',0,Math.min(sill,height));
        if(!base)return;
        section('lintel',Math.min(lintel,height),height);
        if(offset%8===0)section('pier',Math.min(sill,height),Math.min(lintel,height),Math.min(pier,span));
        return base;
      }
    }
    if(f.district){
      // Region silhouettes differ before ornament: garden retaining banks,
      // industrial half-walls, tall optical piers and solid furnace masonry.
      const wallHeight=roof?h:{transit:5,garden:.8,testworks:7,optics:1.25,circulation:3,furnace:10}[region];
      for(const side of ['west','east','north','south']){
        const along=side==='north'||side==='south',length=along?f.w:f.d;
        for(let t=0;t<length;t+=4){
          const x=along?f.x+t:side==='west'?f.x-.85:f.x+f.w+.05,z=along?(side==='north'?f.z-.85:f.z+f.d+.05):f.z+t;
          const w=along?Math.min(4,length-t):.8,d=along?.8:Math.min(4,length-t);
          // The work-lane window exposes the outer approach to the separator
          // battery while its sill keeps both walking routes physically distinct.
          if(f.id==='coolant-west-service'&&side==='east'&&t>=16&&t<32){
            add(room,'wall',x,f.y,z,w,1.05,d);
            add(room,'wall',x,f.y+4,z,w,wallHeight-4,d);
            continue;
          }
          const overlook={'lens-west-gallery':['east'],'lens-north-gallery':['south'],'lens-east-gallery':['west'],'proving-observation':['north','south'],'proving-impact':['south']}[f.id]?.includes(side);
          const h=!roof&&overlook?1.05:!roof&&region==='transit'&&Math.floor(t/4)%4===1?2.5:wallHeight;
          if(wall(x,z,w,d,h,t)){
            add(room,'foundation',x,f.y-4,z,w,3.9,d);
            if(t%16===0&&region!=='circulation')add(room,'pier',x,f.y+h,z,along?.65:w,region==='garden'?4:1.8,along?d:.65);
          }
        }
      }
      // Grounded corner supports are omitted where an older lower route passes.
      for(const x of [f.x-2,f.x+f.w+1])for(const z of [f.z-2,f.z+f.d+1])add(room,'foundation',x,-73,z,1,f.y+72,1);
      continue;
    }
    if(roomWalls[id]){
      for(const [x,z,w,d]of roomWalls[id])for(let t=0;t<Math.max(w,d);t+=4){
        const across=w>d,span=Math.min(4,Math.max(w,d)-t),wx=x+(across?t:0),wz=z+(across?0:t),ww=across?span:w,wd=across?d:span;
        if(wall(wx,wz,ww,wd,h,t))add(room,'foundation',wx,f.y-4,wz,ww,3.9,wd);
      }
      continue;
    }
    for(const side of ['west','east','north','south']){
      const along=side==='north'||side==='south',length=along?f.w:f.d;
      for(let t=0;t<length;t+=4){
        const span=Math.min(4,length-t),x=along?f.x+t:side==='west'?f.x-.85:f.x+f.w+.05,z=along?(side==='north'?f.z-.85:f.z+f.d+.05):f.z+t;
        const w=along?span:.8,d=along?.8:span;
        if(wall(x,z,w,d,h,t))add(room,'foundation',x,f.y-4,z,w,3.9,d);
      }
    }

  }
  // Monumental pieces occupy actual empty wells or the outside of existing
  // walls; the same route/lift clearance filter applies to their foundations.
  const lens=rooms.find(r=>r.id==='lens-west-gallery');
  for(const x of [297,325])add(lens,'buttress',x,8,-77,1.4,36,1.4);
  add(lens,'lintel',297,44,-77,29.4,2,1.4);
  for(const id of ['keeper-court','central-furnace','hearth-mounts']){
    const r=rooms.find(r=>r.id===id);
    for(let z=r.z+2;z<r.z+r.d;z+=16)for(const x of [r.x-3,r.x+r.w+.85]){
      add(r,'buttress',x,r.y-4,z,2.1,r.h+4,3);
    }
  }
  return {rooms,solids};
}

export function architectureIndex(solids){
  const cells=new Map(),size=16;
  for(const s of solids)for(let x=Math.floor(s.x/size);x<=Math.floor((s.x+s.w)/size);x++)for(let z=Math.floor(s.z/size);z<=Math.floor((s.z+s.d)/size);z++){
    const key=`${x}/${z}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(s);
  }
  function near(x,z,r=0){
    const found=new Set();for(let i=Math.floor((x-r)/size);i<=Math.floor((x+r)/size);i++)for(let j=Math.floor((z-r)/size);j<=Math.floor((z+r)/size);j++)for(const s of cells.get(`${i}/${j}`)||[])found.add(s);return found;
  }
  function ray(origin,direction,distance){
    const found=new Set();let x=Math.floor(origin.x/size),z=Math.floor(origin.z/size),t=0;
    const sx=Math.sign(direction.x),sz=Math.sign(direction.z),dx=sx?size/Math.abs(direction.x):Infinity,dz=sz?size/Math.abs(direction.z):Infinity;
    let tx=sx?((x+(sx>0?1:0))*size-origin.x)/direction.x:Infinity,tz=sz?((z+(sz>0?1:0))*size-origin.z)/direction.z:Infinity;
    while(t<=distance){for(const s of cells.get(`${x}/${z}`)||[])found.add(s);if(tx<tz){t=tx;tx+=dx;x+=sx;}else{t=tz;tz+=dz;z+=sz;}if(!Number.isFinite(t))break;}
    return found;
  }
  return {near,ray};
}

export function regionAt(p,rooms){
  let best=null,distance=Infinity;
  for(const r of rooms){
    const dx=Math.max(r.x-p.x,0,p.x-r.x-r.w),dz=Math.max(r.z-p.z,0,p.z-r.z-r.d),d=Math.hypot(dx,dz,2*(p.y-r.y));
    if(d<distance){best=r.region;distance=d;}
  }
  return best||'transit';
}
