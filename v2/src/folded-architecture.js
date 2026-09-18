import {expansionRooms} from './folded-expansion-layout.js';
// Room envelopes follow existing supporting floors. Open connections are carved
// from actual neighboring floors and lift shafts, not inventory checks.
export const REGION_STYLE={
  foundry:{wall:0x58625b,frame:0x293e3e,roof:0x566564,accent:0xb6996a},
  transit:{wall:0x78837b,frame:0x3d5151,roof:0x697b79,accent:0xb9ad86},
  garden:{wall:0x7d9588,frame:0x42625a,roof:0x8b9e91,accent:0xb0b89a},
  testworks:{wall:0xa3a699,frame:0x465351,roof:0x7c8b86,accent:0xc0a580},
  optics:{wall:0xb5b9ac,frame:0x546665,roof:0x87938e,accent:0xd8c7a0},
  circulation:{wall:0x707f78,frame:0x354c49,roof:0x566a65,accent:0xb08e72},
  furnace:{wall:0x69685d,frame:0x393e39,roof:0x595c53,accent:0xaa9170}
};
// [support, region, wall height, roof]. Loading apertures and test run-ups stay open overhead.
export const ROOM_PLAN=[
  ['garden-care','garden',6,false],['sorting-bay','testworks',7,false],
  ['foundry-awakening','foundry',6,false],['foundry-west','foundry',5.5,false],
  ['press-working-floor','foundry',6,false],['reclaim-sorting-bay','foundry',6,false],['prototype-court','foundry',7,false],['recycling-furnace','foundry',10,false],
  ['turntable','transit',10,false],['hub-entry','transit',7,false],['loading','transit',7,false],['mortar-apron','transit',12,false],['training-gallery','transit',6,false],['freight','transit',7,false],
  ['ferry-cradle','garden',5,false],['bridge-underside','garden',3.5,false],['canal-landing','garden',4,false],
  ['garden-bank','garden',5,false],['pump-terrace','garden',5,false],['rear-dock','garden',5,false],
  ['common-benches','testworks',6,false],['carrier-landing','testworks',6,false],['phoenix-cradle','testworks',7,false],
  ['calibration','optics',7,false],['mirror-service-gallery','optics',6,false],['guardian-court','optics',10,false],
  ['circulation-yard','circulation',6,false],['circulation-rig','circulation',7,false],['pressure-release-court','circulation',6,false],
  ['predecessor-gallery','furnace',7,false],['predecessor-mount','furnace',8,false],['predecessor-cooling','furnace',8,false],['predecessor-dock','furnace',8,false],['last-refuge','furnace',7,false],['keeper-court','furnace',12,false],['central-furnace','furnace',16,false]
];
// Authored receiving bays frame the first route. Openings correspond to the
// service ramp, local shutter and later engine return; no ceiling covers a fight.
const roomWalls={
  'common-benches':[[76.1,-28.85,7.8,.8],[96.1,-28.85,3.9,.8],[68,-11.95,13.9,.8],[94.1,-11.95,5.9,.8]],
  'carrier-landing':[[84.1,-66.85,15.9,.8],[100.05,-66,.8,14],[72,-51.95,11.9,.8],[96.1,-51.95,3.9,.8]],
  'phoenix-cradle':[[64,-94.85,28,.8],[63.15,-94,.8,16],[64,-77.95,7.9,.8],[84.1,-77.95,7.9,.8]],
  'calibration':[[224.1,-36.85,11.8,.8],[196,-36.85,15.9,.8],[196,-11.95,7.9,.8]],
  'mirror-service-gallery':[[208.1,23.15,15.8,.8],[208.1,40.05,27.9,.8]],
  'guardian-court':[[179.15,44,.8,46],[228.05,44,.8,46],[180,43.15,15.9,.8],[208.1,43.15,19.9,.8],[192.1,90.05,35.9,.8]],
  'circulation-yard':[[148,52.05,87.9,.8],[147.15,36,.8,16],[196.1,35.15,39.8,.8]],
  'circulation-rig':[[208,136.05,52,.8],[207.15,100,.8,36],[220.1,99.15,15.8,.8]],
  'pressure-release-court':[[208,3.15,52,.8],[260.05,4,.8,24],[220.1,28.05,27.8,.8]],
  'predecessor-gallery':[[40.1,12.05,31.8,.8],[92.1,12.05,43.8,.8],[156.1,12.05,43.8,.8],[220.1,12.05,27.8,.8],[28,-.85,43.9,.8],[92.1,-.85,43.8,.8],[156.1,-.85,43.8,.8],[220.1,-.85,39.8,.8]],
  'predecessor-mount':[[200,-12.85,20,.8],[199.15,-12,.8,11.9],[220.05,-12,.8,11.9]],
  'predecessor-cooling':[[136,-12.85,20,.8],[135.15,-12,.8,11.9],[156.05,-12,.8,11.9]],
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
  'foundry-west':[[-46.85,80,.8,12],[-33.9,79.15,19.8,.8],[-46,92.05,19.9,.8]],
  'press-working-floor':[[-46,37.15,24,.8],[-21.95,38,.8,18],[-46.85,38,.8,5.9],[-33.9,56.05,11.9,.8]],
  'reclaim-sorting-bay':[[-70.85,94,.8,22],[-70,93.15,7.9,.8],[-70,116.05,7.9,.8]],
  'prototype-court':[[-50,115.15,23.9,.8],[-50,140.05,36,.8],[-13.95,116,.8,24]]
};
const overlaps=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.z<b.z+b.d+pad&&a.z+a.d>b.z-pad;
const height=(d,z)=>d.y+(d.rise||0)*Math.max(0,Math.min(1,(z-d.z)/d.d));

export function buildArchitecture(decks,lifts){
  const solids=[],rooms=[],seen=new Set();
  function add(room,kind,x,y,z,w,h,d){
    const s={id:`architecture-${solids.length}`,room:room.id,region:room.region,kind,x,y,z,w,h,d,permanent:true};
    // All existing routes, including water and swept lift volumes, keep their clearance.
    if(decks.some(f=>overlaps(s,f,.02)&&Math.min(height(f,z),height(f,z+d))<y+h+.1&&Math.max(height(f,z),height(f,z+d))+3.4>y))return;
    if(lifts.some(l=>overlaps(s,l,.15)&&l.stops[0]<y+h&&l.stops.at(-1)+4>y))return;
    const key=[x,y,z,w,h,d].map(n=>n.toFixed(2)).join('/');if(seen.has(key))return;seen.add(key);solids.push(s);return s;
  }
  for(const [id,region,h,roof]of [...ROOM_PLAN,...expansionRooms.map(r=>[r.id,r.region,r.region==='optics'?12:r.region==='furnace'?10:7,false])]){
    const f=decks.find(d=>d.id===id),room={...f,region,h,roof};rooms.push(room);
    if(f.district){
      // Region silhouettes differ before ornament: garden retaining banks,
      // industrial half-walls, tall optical piers and solid furnace masonry.
      const wallHeight={transit:5,garden:.8,testworks:7,optics:12,circulation:3,furnace:10}[region];
      for(const side of ['west','east','north','south']){
        const along=side==='north'||side==='south',length=along?f.w:f.d;
        for(let t=0;t<length;t+=4){
          const x=along?f.x+t:side==='west'?f.x-.85:f.x+f.w+.05,z=along?(side==='north'?f.z-.85:f.z+f.d+.05):f.z+t;
          const w=along?Math.min(4,length-t):.8,d=along?.8:Math.min(4,length-t);
          const overlook={'lens-west-gallery':['east'],'lens-north-gallery':['south'],'lens-east-gallery':['west'],'proving-observation':['north','south'],'proving-impact':['south']}[f.id]?.includes(side);
          const h=overlook?1.05:region==='transit'&&Math.floor(t/4)%4===1?2.5:wallHeight;
          const base=add(room,'wall',x,f.y,z,w,h,d);
          if(base){
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
      for(const [x,z,w,d]of roomWalls[id])if(add(room,'wall',x,f.y,z,w,h,d))add(room,'foundation',x,f.y-4,z,w,3.9,d);
      continue;
    }
    for(const side of ['west','east','north','south']){
      const along=side==='north'||side==='south',length=along?f.w:f.d;
      for(let t=0;t<length;t+=12){
        const span=Math.min(12,length-t),x=along?f.x+t:side==='west'?f.x-.85:f.x+f.w+.05,z=along?(side==='north'?f.z-.85:f.z+f.d+.05):f.z+t;
        const w=along?span:.8,d=along?.8:span;
        // Broad inspection windows alternate with solid service bays.
        const window=region==='garden'||Math.floor(t/12)%2===0;
        const base=add(room,'wall',x,f.y,z,w,window?2.6:h,d);
        if(window&&base){
          const garden=region==='garden',beam=garden?.3:2.4,pier=garden?.2:.65;
          const pierAdded=add(room,'pier',x,f.y+2.6,z,along?pier:garden?.2:w,h-2.6-beam,along?garden?.2:d:pier);
          if(pierAdded)add(room,'lintel',x,f.y+h-beam,z,w,beam,d);
        }
        if(base)add(room,'foundation',x,f.y-4,z,w,3.9,d);
      }
    }
    if(roof)for(let x=f.x;x<f.x+f.w;x+=8)for(let z=f.z;z<f.z+f.d;z+=8){
      // Long clerestory slots bring daylight in and leave sightlines across the city.
      if(Math.floor((x-f.x)/8)%3===1)continue;
      add(room,'roof',x,f.y+h,z,Math.min(8,f.x+f.w-x),.55,Math.min(8,f.z+f.d-z));
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
