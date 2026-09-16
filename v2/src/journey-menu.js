import './style.css';
import './journey-menu.css';

const citySave='furnace-born-v2-city';
const previews=[
  {id:'foundry',name:'第一关 · 回收铸造厂',description:'从苏醒点开始，仅携带原始火炮。'},
  {id:'garden',name:'花园路线入口',description:'从花园入口维修点开始，携带加速器和磁力牵引。'},
  {id:'freight',name:'货运路线入口',description:'从货运入口维修点开始，携带加速器和迫击炮。'}
];

export function createJourneyMenu(back=null){
  const menu=document.createElement('div');menu.className='journey-menu';menu.hidden=true;menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');menu.setAttribute('aria-labelledby','journey-title');
  menu.innerHTML=`<section class="journey-panel">
    <header><div><p class="journey-kicker">FURNACE BORN</p><h1 id="journey-title">旅程与选关</h1><p>从铸造厂苏醒，进入相互连通的机械城。</p></div><button class="journey-back" ${back?'':'hidden'}>返回设置</button></header>
    <section class="journey-campaign" aria-label="完整旅程">
      <div class="journey-emblem" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="43"/><path d="M50 16c18 20-6 24 10 36l10-16c18 24 1 49-20 49S9 61 29 37l10 16c14-13-3-19 11-37z"/></svg></div>
      <div><h2>完整旅程</h2><p>第一关：回收铸造厂。之后沿世界中的道路继续探索。</p><div class="journey-actions"><button id="journey-continue" class="journey-primary">继续旅程</button><button id="journey-start">从第一关开始</button></div><p id="journey-confirm" role="status" hidden>重新开始将覆盖完整旅程的进度。再次点击确认，或选择下方的第一关独立试玩保留进度。</p></div>
    </section>
    <section aria-label="独立试玩"><h2>独立试玩</h2><p>每次从所选入口开始，不影响完整旅程存档。</p><div class="journey-previews">${previews.map(p=>`<button data-preview="${p.id}"><strong>${p.name}</strong><span>${p.description}</span><span class="journey-play">开始试玩 →</span></button>`).join('')}</div></section>
    <details class="journey-history"><summary>历史版本试玩</summary><p>以下是早期地图版本，与当前机械城及其旅程存档分开。</p><div>${[['legacy','旧版第一关'],['2','旧版第二关'],['3','旧版第三关'],['4','旧版中段'],['hoist','旧版升降井']].map(([id,name])=>`<a href="/?chapter=${id}">${name}</a>`).join('')}</div></details>
  </section>`;
  document.body.append(menu);
  const start=menu.querySelector('#journey-start'),resume=menu.querySelector('#journey-continue'),confirmation=menu.querySelector('#journey-confirm');
  let armed=false,returnFocus=null;
  const hasSave=()=>{try{return !!localStorage.getItem(citySave);}catch{return false;}};
  function show(){
    returnFocus=document.activeElement;armed=false;confirmation.hidden=true;start.textContent='从第一关开始';resume.hidden=!hasSave();
    start.classList.toggle('journey-primary',resume.hidden);menu.hidden=false;(resume.hidden?start:resume).focus();
  }
  function close(){menu.hidden=true;back();returnFocus?.focus();}
  menu.querySelector('.journey-back').onclick=close;
  resume.onclick=()=>{location.href='/?chapter=folded';};
  start.onclick=()=>{
    if(hasSave()&&!armed){armed=true;confirmation.hidden=false;start.textContent='确认重新开始第一关';return;}
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
