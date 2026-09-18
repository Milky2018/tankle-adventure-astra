const tank='<path d="M10 34h28v12H10zM18 27h14v7H18zM30 29h15M14 40h20"/>';
const target='<path d="M145 27h20v19h-20zM150 33h10M150 40h10"/>';
const svg=(body,viewBox='0 0 48 48')=>`<svg viewBox="${viewBox}" aria-hidden="true">${body}</svg>`;
const definitions=[
  {id:'cannon',label:'原始火炮',group:'weapons',action:'fire',icon:'M6 28h28v12H6zM15 19h13v9H15zM26 21h17v6H26M12 34h16'},
  {id:'mortar',label:'迫击炮',group:'weapons',action:'weapon',icon:'M6 40h16M10 35l-5-15 7-3 6 18M22 18q9-22 21 1M28 40V27h8v13M40 21l3 4 3-4',demo:`${tank}${target}<path class="demo-obstacle" d="M76 46V22h15v24"/><path class="demo-guide" d="M42 28Q94-22 155 28"/><circle class="demo-lob" r="3"/>`},
  {id:'laser',label:'激光',group:'weapons',action:'weapon',icon:'M5 28h14v9H5zM19 32h16V8M28 25l14 14M31 8h8',demo:`${tank}<path d="M114 22l16 16M144 7h21v9h-21z"/><path class="demo-beam" d="M44 30h78V12h22"/>`},
  {id:'magnet',label:'磁力牵引',group:'tools',action:'magnet',icon:'M9 7v19a15 15 0 0 0 30 0V7H29v19a5 5 0 0 1-10 0V7zM9 15h10M29 15h10',demo:`${tank}<path class="demo-guide" d="M45 33h100"/><path d="m76 27-8 6 8 6"/><path class="demo-pull" d="M130 24h21v22h-21z"/>`},
  {id:'flotation',label:'浮航',group:'tools',action:'flotation',icon:'M6 9h8v24H6zM34 9h8v24h-8zM14 17h20v12H14zM3 40q5-5 10 0t10 0t10 0t10 0',demo:`<path d="M6 47q10-8 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0"/><g class="demo-float">${tank}<path d="M8 46h33M8 23h33"/></g>`},
  {id:'overdrive',label:'加速器',group:'engines',action:'overdrive',icon:'M5 17h23v18H5zM10 23h13M10 29h13M33 13l10 13-10 13',demo:`<path class="demo-guide" d="M5 49h165"/><g class="demo-drive">${tank}<path d="M0 34h6M-4 41H6"/></g><path d="m138 29 10 8-10 8m16-16 10 8-10 8"/>`},
  {id:'phoenix',label:'凤凰引擎',group:'engines',action:'overdrive',upgrade:true,icon:'M24 4c6 10-4 13 3 19l7-9c12 17 5 29-10 29S2 29 14 14l7 9c5-5-2-10 3-19zM4 23l10 7M44 23l-10 7',demo:`<path class="demo-guide" d="M5 49h165"/><g class="demo-ram">${tank}<path d="M-8 30 6 34-8 40 6 44"/></g><g class="demo-break">${target}</g>`},
  {id:'circulation',label:'水循环',group:'engines',action:'overdrive',upgrade:true,icon:'M24 5s-10 13-10 19a10 10 0 0 0 20 0C34 18 24 5 24 5zM6 20a19 19 0 0 0 30 22M5 30V19h10M43 27a19 19 0 0 0-6-15M35 12h8v10',demo:`<path class="demo-hot" d="M8 12q5-9 10 0t10 0t10 0"/><g class="demo-ram demo-hot">${tank}</g><g class="demo-break demo-hot">${target}</g>`}
];

export const abilityIcon=id=>definitions.find(d=>d.id===id).icon;

export function createAbilityHud(tools,acquired,keyGlyph){
  tools.classList.add('ability-tray');tools.replaceChildren();tools.hidden=false;
  acquired.classList.add('ability-acquired');acquired.replaceChildren();
  const groups=new Map(),cards=new Map();
  let latest=null,until=0,bindings={},lastWeapon=null,upgradeLatest=null;
  const cooler=document.createElement('div');cooler.className='ability-card cooling-module';cooler.setAttribute('role','img');cooler.setAttribute('aria-label','Cooling efficiency +25%');
  const fan='M24 20c-16-18-26 7-5 7M28 24c18-16-7-26-7-5M24 28c16 18 26-7 5-7M20 24c-18 16 7 26 7 5M24 20a4 4 0 1 1 0 8 4 4 0 0 1 0-8';
  cooler.innerHTML=svg(`<path d="${fan}"/>`);
  function acquireUpgrade(kind,time){
    upgradeLatest=kind;latest=null;until=time+6;
    const icon=kind==='armor'?'M10 6h28v24L24 43 10 30zM24 15v16M16 23h16':kind==='cooling'?fan:abilityIcon(kind);
    acquired.dataset.ability='upgrade';acquired.setAttribute('aria-label',kind+' upgrade');
    acquired.innerHTML=`<div class="ability-reveal">${svg(`<path d="${icon}"/>`)}<strong>${kind==='armor'?'+1':kind==='cooling'?'+25%':'+50%'}</strong></div>`;
  }
  for(const def of definitions){
    if(!groups.has(def.group)){const group=document.createElement('section');group.className='ability-group';tools.append(group);groups.set(def.group,group);}
    const card=document.createElement('div');card.className='ability-card';card.id=`${def.id}-tool`;card.dataset.ability=def.id;card.setAttribute('role','img');card.setAttribute('aria-label',def.label);
    card.innerHTML=svg(`<path d="${def.icon}"/>`)+(def.upgrade?'<span class="ability-upgrade" aria-hidden="true">'+svg('<path d="M18 15h-4a9 9 0 0 0 0 18h7M30 15h4a9 9 0 0 1 0 18h-7M17 24h14"/>')+'</span>':'')+'<kbd></kbd>';
    groups.get(def.group).append(card);cards.set(def.id,card);
  }
  groups.get('engines').append(cooler);
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
    acquired.dataset.ability=id;acquired.setAttribute('role','img');acquired.setAttribute('aria-label',def.label);
    acquired.innerHTML=`<div class="ability-reveal">${svg(`<path d="${def.icon}"/>`)}<div class="ability-input"><kbd></kbd>${def.group==='weapons'?'<span aria-hidden="true">→</span><kbd></kbd>':''}</div></div>${svg(def.demo,'0 0 180 56')}`;
    updateBindings(bindings);
  }
  function update(p,time,magnetic){
    if(lastWeapon!==p.weapon){lastWeapon=p.weapon;updateBindings(bindings);}
    for(const def of definitions){
      const card=cards.get(def.id),owned=def.id==='cannon'||!!p[def.id];card.hidden=!owned;
      const selected=def.group==='weapons'&&p.weapon===def.id;
      const active=selected||def.id==='magnet'&&!!magnetic||def.id==='flotation'&&p.deployed||def.id==='overdrive'&&p.speed>1.01||def.id==='phoenix'&&p.speed>=3.19||def.id==='circulation'&&p.overheated;
      card.classList.toggle('reinforced',!!p[`${def.id}Upgrade`]);
      card.classList.toggle('selected',selected);card.classList.toggle('active',!!active);
      card.classList.toggle('new-ability',def.id===latest&&time<until);
      card.classList.toggle('hot',owned&&p.overheated&&(def.group==='weapons'||def.id==='circulation'));
    }
    cooler.hidden=!p.coolingUpgrade;
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
