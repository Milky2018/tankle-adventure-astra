// Extract immutable authored geometry into typed MoonBit literals. This is an
// explicit content refresh tool, never part of the browser or normal build.
import { writeFileSync } from 'node:fs';
import * as content from '../../v2/src/content/compile.js';
import { sideObstacles } from '../../v2/src/content/side-layout.js';
import { circuitTargetKey } from '../../v2/src/machinery/signal-state.js';
const str = JSON.stringify;
const optional = value => value == null ? 'None' : `Some(${str(value)})`;
const rect = r => `{ x: ${r.x}, z: ${r.z}, w: ${r.w}, d: ${r.d} }`;
const solid = s => `{ id: ${str(s.id ?? '')}, rect: ${rect(s)}, y: ${s.y}, h: ${s.h}, permanent: ${!!s.permanent}, motion: ${s.motion ? `Some({ axis: ${s.motion.axis.toUpperCase()}, min: ${s.motion.min}, max: ${s.motion.max}, speed: ${s.motion.speed} })` : 'None'}, direction: 1, red: ${!!s.red}, phoenix: ${!!s.phoenix}, rail: ${s.rail ? `Some({axis: ${s.rail.axis.toUpperCase()}, min: ${s.rail.min}, max: ${s.rail.max}, release: ${optional(s.rail.release)}, latch: ${optional(s.rail.latch)}})` : 'None'}, arena: ${optional(s.arena)}, local_control: ${optional(s.localControl)}, circuit_key: ${str(circuitTargetKey(s))} }`;
const arrayFn = (name, type, values, print) => {
  if(values.length>256){
    const parts=[];
    for(let i=0;i<values.length;i+=256)parts.push(arrayFn(`${name}_${i/256}`,type,values.slice(i,i+256),print).replace('pub fn','fn'));
    return parts.join('\n')+`\n///|\npub fn ${name}() -> Array[${type}] {\nlet items : Array[${type}] = []\n${parts.map((_,i)=>`for item in ${name}_${i}() {items.push(item)}`).join('\n')}\nitems\n}\n`;
  }
  return `///|\npub fn ${name}() -> Array[${type}] {\n[\n${values.map(print).map(s=>`  ${s},`).join('\n')}\n]\n}\n`;
};
writeFileSync('simulation/authored-world.mbt', '// Authored world snapshot. Regenerate with node scripts/authored-world.mjs.\n\n'+[
  arrayFn('authored_decks','Deck',content.foldedDecks,d=>`{ id: ${str(d.id)}, rect: ${rect(d)}, y: ${d.y}, rise: ${d.rise??0}, water: ${!!d.water} }`),
  arrayFn('authored_solids','Solid',content.foldedSolids,solid),
  arrayFn('authored_obstacles','Solid',sideObstacles,solid),
  arrayFn('authored_architecture','Solid',content.foldedArchitecture.solids,solid),
  arrayFn('authored_lifts','Lift',content.foldedLiftDefs,l=>`{ id: ${str(l.id)}, rect: ${rect(l)}, stops: [${l.stops}], lock: ${str(l.lock??l.id)}, locks: [${(l.locks??[]).map(str)}], circuit_key: ${str(circuitTargetKey(l))}, settle: ${!!l.settle}, y: ${l.settle?l.stops.at(-1):l.stops[0]}, destination: ${l.stops[0]}, wait: 0 }`),
  `///|\npub fn authored_world() -> World {\nlet architecture = authored_architecture()\n{ decks: authored_decks(), solids: authored_solids(), obstacles: authored_obstacles(), architecture, architecture_grid: architecture_grid(architecture), lifts: authored_lifts() }\n}\n`,
].join('\n'));
const name = s => s[0].toUpperCase() + s.slice(1);
const vec3 = p => `{ x: ${p.x}, y: ${p.y}, z: ${p.z} }`;
const numberOption = n => n == null ? 'None' : `Some(${n})`;
const enemy = e => `{
  id: ${str(e.id)}, kind: ${name(e.type)}, variant: ${e.variant?name(e.variant):'Ordinary'}, spawn: ${vec3(e)}, hp: ${e.hp},
  guardian: ${!!e.guardian}, persistent: ${!!e.persistent}, emplacement: ${!!e.emplacement}, magnetic_shield: ${!!e.magneticShield}, coordinated: ${!!e.coordinated},
  encounter: ${optional(e.encounter)}, battle: ${optional(e.battle)}, wave: ${e.wave??0}, startup: ${numberOption(e.startup)},
  spotter_height: ${numberOption(e.spotterHeight)}, detection_range: ${numberOption(e.detectionRange)}, patrol: ${e.patrol?`Some(${rect(e.patrol)})`:'None'},
  activation: ${e.activation?`Some({ position: ${vec3(e.activation)}, radius: ${e.activation.radius} })`:'None'},
  swim_patrol: [${(e.swimPatrol??[]).map(p=>`{x:${p[0]},z:${p[1]}}`)}], part_hp: [${e.parts??[]}], core: ${numberOption(e.core)}, mirror: ${!!e.mirror}, reserve_for: ${optional(e.reserveFor)}, reserve_at: ${e.reserveAt??0}
}`;
writeFileSync('simulation/authored-enemies.mbt', '// Authored enemy definitions. Runtime state is constructed by Enemy::new.\n\n'+arrayFn('authored_enemies','EnemyDef',content.foldedEnemies,enemy));

const action = k => ({cannon:'CannonAction',mortar:'MortarAction',laser:'LaserAction',magnet:'MagnetAction',use:'Use',dock:'Dock'})[k];
const optionalVec = v => v?`Some({x:${v[0]},y:${v[1]},z:${v[2]}})`:'None';
const acquisition = p => p.ability ? ({overdrive:'Overdrive',magnet:'Magnet',mortar:'MortarModule',flotation:'Flotation',phoenix:'Phoenix',laser:'LaserModule',circulation:'Circulation'})[p.ability] : ({armor:'Armor',cooling:'Cooling',cannon:'CannonCoil',mortar:'MortarCharge',laser:'LaserFocus',scope:'Scope'})[p.upgrade];
writeFileSync('simulation/authored-controls.mbt',[
  arrayFn('authored_controls','Control',content.foldedControls,c=>`{id:${str(c.id)},position:${vec3(c)},ground:${c.ground??c.y-1.3},actions:[${(c.weapons??(c.kind==='shot'?['cannon','mortar','laser']:[c.kind])).map(action)}],requires:${optional(c.requires)},effects:[${(c.effects??[c.id]).map(str)}],circuit_key:${str(circuitTargetKey(c))},mount:${optional(c.mount)},facing:${optionalVec(c.facing)},optical_normal:${optionalVec(c.normal)},top:${c.surface==='top'},rotor:${!!c.rotor},counterweight:${!!c.counterweight},flash:0,pull:0}`),
  arrayFn('authored_hives','Hive',content.foldedHives,h=>`{id:${str(h.id)},name:${str(h.name)},position:${vec3(h)},heading:${h.heading??Math.PI},requires:${optional(h.requires)}}`),
  arrayFn('authored_pickups','Pickup',content.foldedPickups,p=>`{id:${str(p.id)},position:${vec3(p)},acquisition:${acquisition(p)},requires:${optional(p.requires)},lift:${optional(p.lift)},hidden:${!!p.hidden},preview:${!!p.preview}}`),
  arrayFn('authored_mirrors','Mirror',content.foldedMirrors,m=>`{id:${str(m.id)},position:${vec3(m)},base_normal:{x:${m.n[0]},y:${m.n[1]},z:${m.n[2]}},size:${m.size},turnable:${!!m.turnable},flash:0,angle:0}`),
].join('\n'));
const { circuitLinks, circuitEventSources } = await import('../../v2/src/machinery/circuits.js');
const links = circuitLinks([...content.foldedControls,...content.foldedBattles,...circuitEventSources],content.foldedSolids,content.foldedLiftDefs,content.foldedDecks,content.foldedArchitecture.solids);
const circuits = new Map();
for(const link of links){
  const length=link.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(...p.map((n,j)=>n-link.points[i][j])),0);
  const duration=length>.01?(link.local?.18:Math.max(1.4,length/18)):0;
  if(!circuits.has(link.id))circuits.set(link.id,{id:link.id,duration:0,branches:[]});
  const c=circuits.get(link.id);c.duration=Math.max(c.duration,duration);
  if(link.targetKey)c.branches.push({key:link.targetKey,target:link.target,duration});
}
writeFileSync('simulation/authored-circuits.mbt',arrayFn('authored_circuits','Circuit',[...circuits.values()],c=>`{id:${str(c.id)},duration:${c.duration},branches:[${c.branches.map(b=>`{key:${str(b.key)},target:${str(b.target)},duration:${b.duration}}`)}]}`));
const {cityBelts}=await import('../../v2/src/content/city-layout.js');
const {expansionBelts,expansionHeat,expansionCurrents}=await import('../../v2/src/content/expansion-layout.js');
const belt=b=>`{deck:{id:${str(b.id)},rect:${rect(b)},y:${b.y},rise:${b.rise??0},water:false},velocity:{x:${b.vx??0},z:${b.vz??0}},heat:${b.heat??0},release:${optional(b.release)},stop:${optional(b.stop)},owner:${b.id.includes('feed-')?`Some(${str(b.id.startsWith('foundry')?'foundry':'keeper')})`:'None'},part:${b.id.includes('feed-')?`Some(${b.id.endsWith('left')?0:1})`:'None'}}`;
writeFileSync('simulation/authored-motion.mbt',[
 arrayFn('authored_belts','Belt',[...cityBelts,...expansionBelts],belt),
 arrayFn('authored_heat','Belt',[...expansionHeat,...cityBelts.filter(b=>b.heat)],belt),
 arrayFn('authored_currents','Current',expansionCurrents,c=>`{rect:${rect(c)},y:${c.y},velocity:{x:${c.current.x},z:${c.current.z}},sluice:${optional(c.sluice)},diverted:{x:${c.diverted?.x??0},z:${c.diverted?.z??0}}}`)
].join('\n'));
