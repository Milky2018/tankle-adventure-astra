import './style.css';
import './journey-menu.css';

const citySave='furnace-born-v2-city';
const previews=[
  {id:'foundry',name:'Chapter 1 · Foundry',description:'Start at the awakening site with the Cannon.'},
  {id:'garden',name:'Garden entrance',description:'Start at the Garden repair hive with Overdrive and Magnet.'},
  {id:'freight',name:'Freight entrance',description:'Start at the Freight repair hive with Overdrive and Mortar.'}
];

export function createJourneyMenu(back=null){
  const menu=document.createElement('div');menu.className='journey-menu';menu.hidden=true;menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');menu.setAttribute('aria-labelledby','journey-title');
  menu.innerHTML=`<section class="journey-panel">
    <header><div><p class="journey-kicker">A silent city. A machine awakens.</p><h1 id="journey-title"><span class="journey-main-title">TANKLE ADVENTURE</span><span class="journey-subtitle">ASTRA</span></h1><p class="journey-intro">Beneath the embers, find the heart still beating.</p></div><button class="journey-back" ${back?'':'hidden'}>Back to settings</button></header>
    <section class="journey-campaign" aria-label="Campaign">
      <div><h2>Campaign</h2><p>Awaken in the Foundry and explore an interconnected mechanical city.</p><div class="journey-actions"><button id="journey-continue" class="journey-primary">Continue</button><button id="journey-start">New campaign</button></div><p id="journey-confirm" role="status" hidden>Starting over replaces your campaign save. Click again to confirm, or use a separate Foundry preview below to keep your progress.</p></div>
    </section>
    <section class="journey-preview-section" aria-label="Route previews"><div class="journey-section-heading"><h2>Route previews</h2><p>Separate from your campaign save</p></div><div class="journey-previews">${previews.map((p,i)=>`<button data-preview="${p.id}"><span class="journey-route-number" aria-hidden="true">0${i+1}</span><span class="journey-route-copy"><strong>${p.name}</strong><span>${p.description}</span></span><span class="journey-play" aria-hidden="true">↗</span></button>`).join('')}</div></section>
    <details class="journey-history"><summary>Archived maps</summary><p>Earlier maps with separate saves, outside the current campaign.</p><div>${[['legacy','Archived Foundry'],['2','Archived Freight'],['3','Archived Garden'],['4','Archived midgame'],['hoist','Archived Hoist']].map(([id,name])=>`<a href="/?chapter=${id}">${name}</a>`).join('')}</div></details>
  </section>`;
  document.body.append(menu);
  const start=menu.querySelector('#journey-start'),resume=menu.querySelector('#journey-continue'),confirmation=menu.querySelector('#journey-confirm');
  let armed=false,returnFocus=null;
  const hasSave=()=>{try{return !!localStorage.getItem(citySave);}catch{return false;}};
  function show(){
    returnFocus=document.activeElement;armed=false;confirmation.hidden=true;start.textContent='New campaign';resume.hidden=!hasSave();
    let completed=false;try{completed=JSON.parse(localStorage.getItem(citySave))?.endingSeen===true;}catch{}
    resume.textContent=completed?'Explore · Mission Accomplished':'Continue';
    start.classList.toggle('journey-primary',resume.hidden);menu.hidden=false;(resume.hidden?start:resume).focus();
  }
  function close(){menu.hidden=true;back();returnFocus?.focus();}
  menu.querySelector('.journey-back').onclick=close;
  resume.onclick=()=>{location.href='/?chapter=folded';};
  start.onclick=()=>{
    if(hasSave()&&!armed){armed=true;confirmation.hidden=false;start.textContent='Confirm new campaign';return;}
    try{localStorage.removeItem(citySave);}catch{}
    location.href='/?chapter=folded';
  };
  for(const button of menu.querySelectorAll('[data-preview]'))button.onclick=()=>{
    const route=button.dataset.preview;
    try{localStorage.removeItem(`furnace-born-v2-folded-${route}`);}catch{}
    location.href=`/?chapter=folded&route=${route}`;
  };
  // Keep keyboard input inside the menu even when a paused runtime is underneath.
  window.addEventListener('keydown',event=>{
    if(menu.hidden)return;event.stopImmediatePropagation();
    if(event.code==='Escape'&&back){event.preventDefault();close();}
    if(event.code==='Tab'){
      const items=[...menu.querySelectorAll('button,a,summary')].filter(e=>e.getClientRects().length),first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  },true);
  return {show};
}
