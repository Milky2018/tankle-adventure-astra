import { playerMaxHp } from './mechanics.js';
const tank='<path d="M10 34h28v12H10zM18 27h14v7H18zM30 29h15M14 40h20"/>';
const target='<path d="M145 27h20v19h-20zM150 33h10M150 40h10"/>';
const svg=(body,viewBox='0 0 48 48')=>`<svg viewBox="${viewBox}" aria-hidden="true">${body}</svg>`;
const definitions=[
  {id:'cannon',label:'Cannon',group:'weapons',action:'fire',icon:'M5 29h31v11H5zM12 20h18v9H12zM30 22h14v5H30M10 35h21M10 40v3M31 40v3'},
  {id:'mortar',label:'Mortar',group:'weapons',action:'weapon',icon:'M5 41h24M12 37 5 18l9-3 8 20M8 19l9-3M15 29l11 12M21 13Q34 0 42 22M38 20l4 5 3-6M34 38h11M39 34v8',demo:`${tank}${target}<path class="demo-obstacle" d="M76 46V22h15v24"/><path class="demo-guide" d="M42 28Q94-22 155 28"/><circle class="demo-lob" r="3"/>`},
  {id:'laser',label:'Laser',group:'weapons',action:'weapon',icon:'M4 18h13v12H4zM17 21h7v6h-7M24 24h20M38 15v18M32 18l12 12M32 30l12-12',demo:`${tank}<path d="M114 22l16 16M144 7h21v9h-21z"/><path class="demo-beam" d="M44 30h78V12h22"/>`},
  {id:'magnet',label:'Magnet',group:'tools',action:'magnet',icon:'M9 7v19a15 15 0 0 0 30 0V7H29v19a5 5 0 0 1-10 0V7zM9 15h10M29 15h10',demo:`${tank}<path class="demo-guide" d="M45 33h100"/><path d="m76 27-8 6 8 6"/><path class="demo-pull" d="M130 24h21v22h-21z"/>`},
  {id:'flotation',label:'Flotation',group:'tools',action:'flotation',icon:'M8 12h6v22H8zM34 12h6v22h-6zM14 18h20v11H14M21 18v-7h8M3 40q5-5 10 0t10 0t10 0t10 0',demo:`<path d="M6 47q10-8 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0"/><g class="demo-float">${tank}<path d="M8 46h33M8 23h33"/></g>`},
  {id:'overdrive',label:'Overdrive',group:'engines',action:'overdrive',icon:'M4 17h15v14H4zM8 21h6M8 27h6M23 13l11 11-11 11M33 13l11 11-11 11M3 11h11M3 37h11',demo:`<path class="demo-guide" d="M5 49h165"/><g class="demo-drive">${tank}<path d="M0 34h6M-4 41H6"/></g><path d="m138 29 10 8-10 8m16-16 10 8-10 8"/>`},
  {id:'phoenix',label:'Phoenix Engine',group:'engines',action:'overdrive',upgrade:true,icon:'M24 4c6 10-4 13 3 19l7-9c12 17 5 29-10 29S2 29 14 14l7 9c5-5-2-10 3-19zM4 23l10 7M44 23l-10 7',demo:`<path class="demo-guide" d="M5 49h165"/><g class="demo-ram">${tank}<path d="M-8 30 6 34-8 40 6 44"/></g><g class="demo-break">${target}</g>`},
  {id:'circulation',label:'Water Circulation',group:'engines',action:'overdrive',upgrade:true,icon:'M24 5s-10 13-10 19a10 10 0 0 0 20 0C34 18 24 5 24 5zM6 20a19 19 0 0 0 30 22M5 30V19h10M43 27a19 19 0 0 0-6-15M35 12h8v10',demo:`<path class="demo-hot" d="M8 12q5-9 10 0t10 0t10 0"/><g class="demo-ram demo-hot">${tank}</g><g class="demo-break demo-hot">${target}</g>`}
];

export const equipmentIcons = {
  armor: 'M9 7h30v20L24 42 9 27zM15 14h18v10l-9 9-9-9zM4 12v18l14 14',
  cooling: 'M24 5a19 19 0 1 0 0 38 19 19 0 1 0 0-38M24 20a4 4 0 1 0 0 8 4 4 0 1 0 0-8M22 20C8 7 34 4 29 18M28 25c18-4 8 19-3 7M21 28c-5 17-20-3-5-7',
  scope: 'M24 8a16 16 0 1 0 0 32 16 16 0 1 0 0-32M24 3v12M24 33v12M3 24h12M33 24h12M20 24h8M24 20v8',
};

export const abilityIcon=id=>definitions.find(d=>d.id===id).icon;

export function createAbilityHud(tools,acquired,keyGlyph){
  tools.classList.add('ability-tray');tools.replaceChildren();tools.hidden=false;
  acquired.classList.add('ability-acquired');acquired.replaceChildren();
  new ResizeObserver(()=>acquired.style.setProperty('--tray-height',`${tools.getBoundingClientRect().height}px`)).observe(tools);
  const groups=new Map(),cards=new Map();
  let latest=null,until=0,bindings={},lastWeapon=null,upgradeLatest=null;
  const cooler=document.createElement('div');cooler.className='ability-card cooling-module';cooler.setAttribute('role','img');cooler.setAttribute('aria-label','Cooling efficiency +25%');
  const fan=equipmentIcons.cooling;
  cooler.id='cooling-tool';cooler.innerHTML=svg(`<path d="${fan}"/>`)+'<small class="ability-name">Cooling</small><strong class="equipment-value">+25%</strong>';
  const armor=document.createElement('div');armor.id='armor-tool';armor.className='ability-card armor-module';armor.setAttribute('role','img');
  armor.innerHTML=svg(`<path d="${equipmentIcons.armor}"/>`)+'<small class="ability-name">Armor</small><strong class="equipment-value"></strong><div class="armor-packs" aria-hidden="true">'+Array.from({length:5},()=>'<i></i>').join('')+'</div>';
  const armorPips=[...armor.querySelectorAll('i')];
  const scope=document.createElement('div');scope.id='scope-tool';scope.className='ability-card scope-module';scope.setAttribute('role','img');scope.setAttribute('aria-label','Weapon scope · Cannon and Mortar range +50%');scope.innerHTML=svg(`<path d="${equipmentIcons.scope}"/>`)+'<small class="ability-name">Scope</small><strong class="equipment-value">+50% RANGE</strong>';
  const upgradeNames={scope:'Weapon Scope',armor:'Armor Pack',cooling:'Cooling Filter',cannon:'Cannon Reinforcement',mortar:'Mortar Reinforcement',laser:'Laser Reinforcement'};
  const shortNames={cannon:'Cannon',mortar:'Mortar',laser:'Laser',magnet:'Magnet',flotation:'Flotation',overdrive:'Boost',phoenix:'Phoenix',circulation:'Circulation'};
  function acquireUpgrade(kind,time,p){
    upgradeLatest=kind;latest=null;until=time+6;
    const icon=equipmentIcons[kind]||abilityIcon(kind);
    const name=upgradeNames[kind],effect=kind==='armor'?`+1 hull segment · ${p.armorPacks}/5 packs`:kind==='cooling'?'+25% cooling speed':kind==='scope'?'+50% Cannon and Mortar range':'+50% weapon damage';
    acquired.dataset.ability='upgrade';acquired.setAttribute('role','status');acquired.setAttribute('aria-live','polite');acquired.setAttribute('aria-label',name+'. '+effect);
    acquired.innerHTML=`<div class="ability-reveal">${svg(`<path d="${icon}"/>`)}<strong>${kind==='armor'?'+1 HULL':kind==='cooling'?'+25%':'+50%'}</strong></div><div class="equipment-copy"><strong>${name}</strong><small>${effect}</small></div>`;
  }
  for(const def of definitions){
    if(!groups.has(def.group)){const group=document.createElement('section');group.className='ability-group';tools.append(group);groups.set(def.group,group);}
    const card=document.createElement('div');card.className='ability-card';card.id=`${def.id}-tool`;card.dataset.ability=def.id;card.setAttribute('role','img');card.setAttribute('aria-label',def.label);
    card.innerHTML=svg(`<path d="${def.icon}"/>`)+(def.upgrade?'<span class="ability-upgrade" aria-hidden="true">'+svg('<path d="M18 15h-4a9 9 0 0 0 0 18h7M30 15h4a9 9 0 0 1 0 18h-7M17 24h14"/>')+'</span>':'')+`<small class="ability-name">${shortNames[def.id]}</small><kbd></kbd><strong class="reinforcement-value" hidden>+50%</strong>`;
    groups.get(def.group).append(card);cards.set(def.id,card);
  }
  const equipment=document.createElement('section');equipment.className='ability-group';tools.append(equipment);groups.set('equipment',equipment);equipment.append(armor,cooler,scope);
  function updateBindings(next){
    bindings=next;
    for(const def of definitions)keyGlyph(cards.get(def.id).querySelector('kbd'),bindings[def.group==='weapons'?(def.id===lastWeapon?'fire':'weapon'):def.action]);
    if(latest){
      const def=definitions.find(d=>d.id===latest),keys=acquired.querySelectorAll('kbd');
      keyGlyph(keys[0],bindings[def.action]);if(keys[1])keyGlyph(keys[1],bindings.fire);
    }
  }
  function acquire(id,time){
    const def=definitions.find(d=>d.id===id);latest=id;upgradeLatest=null;until=time+8;
    acquired.dataset.ability=id;acquired.setAttribute('role','status');acquired.setAttribute('aria-live','polite');acquired.setAttribute('aria-label',def.label+' acquired');
    acquired.innerHTML=`<div class="ability-reveal">${svg(`<path d="${def.icon}"/>`)}<div class="ability-input"><kbd></kbd>${def.group==='weapons'?'<span aria-hidden="true">→</span><kbd></kbd>':''}</div></div><div class="equipment-copy"><strong>${def.label}</strong>${svg(def.demo,'0 0 180 56')}</div>`;
    updateBindings(bindings);
  }
  function update(p,time,magnetic){
    if(lastWeapon!==p.weapon){lastWeapon=p.weapon;updateBindings(bindings);}
    for(const def of definitions){
      const card=cards.get(def.id),owned=def.id==='cannon'||!!p[def.id],reinforced=!!p[`${def.id}Upgrade`];card.hidden=!owned&&!reinforced;card.querySelector('kbd').hidden=!owned;
      const selected=def.group==='weapons'&&p.weapon===def.id;
      const active=selected||def.id==='magnet'&&!!magnetic||def.id==='flotation'&&p.deployed||def.id==='overdrive'&&p.speed>1.01||def.id==='phoenix'&&p.speed>=3.19||def.id==='circulation'&&p.overheated;
      card.classList.toggle('reinforced',reinforced);card.querySelector('.reinforcement-value').hidden=!reinforced;card.setAttribute('aria-label',def.label+(reinforced?' · damage +50%':''));
      card.classList.toggle('selected',selected);card.classList.toggle('active',!!active);
      card.classList.toggle('new-ability',(def.id===latest||def.id===upgradeLatest)&&time<until);
      card.classList.toggle('hot',owned&&p.overheated&&(def.group==='weapons'||def.id==='circulation'));
    }
    scope.hidden=!p.scopeUpgrade;scope.classList.toggle('new-ability',upgradeLatest==='scope'&&time<until);
    cooler.hidden=!p.coolingUpgrade;cooler.classList.toggle('new-ability',upgradeLatest==='cooling'&&time<until);
    armor.hidden=!p.armorPacks;armor.querySelector('.equipment-value').textContent=`${p.armorPacks||0}/5`;armor.setAttribute('aria-label',`Armor packs ${p.armorPacks||0} of 5 · maximum hull ${playerMaxHp(p)/5}`);armor.classList.toggle('new-ability',upgradeLatest==='armor'&&time<until);
    armorPips.forEach((pip,i)=>pip.classList.toggle('collected',i<p.armorPacks));
    for(const group of groups.values())group.hidden=[...group.children].every(card=>card.hidden);
    acquired.style.display=(latest||upgradeLatest)&&time<until&&!p.endingTime?'flex':'none';
  }
  return {acquire,acquireUpgrade,update,updateBindings};
}

// Only committed attacks outside the view get a directional warning. This never
// points at an aim target or changes the player's cursor.
export function createThreatHud(container){
  const root=document.createElement('div');root.id='threats';root.setAttribute('aria-hidden','true');container.append(root);
  const markers=Array.from({length:4},()=>{const m=document.createElement('i');m.hidden=true;root.append(m);return m;});
  return (threats,hidden)=>{
    root.hidden=hidden;
    for(let i=0;i<markers.length;i++){
      const m=markers[i],t=threats[i];m.hidden=!t;if(!t)continue;
      const radius=Math.min(innerWidth,innerHeight)*.38,x=Math.sin(t.angle)*radius,y=-Math.cos(t.angle)*radius;
      m.style.left=`${innerWidth/2+x}px`;m.style.top=`${innerHeight/2+y}px`;m.style.transform=`translate(-50%,-50%) rotate(${t.angle}rad)`;
    }
  };
}
