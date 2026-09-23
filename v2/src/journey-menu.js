import './style.css';
import './journey-menu.css';

const citySave='furnace-born-v2-city';
export function createJourneyMenu(back=null){
  const menu=document.createElement('div');menu.className='journey-menu';menu.hidden=true;menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');menu.setAttribute('aria-labelledby','journey-title');
  menu.innerHTML=`<section class="journey-panel">
    <header><h1 id="journey-title"><span class="journey-main-title">TANKLE ADVENTURE</span><span class="journey-subtitle">ASTRA</span></h1></header>
    <div class="journey-actions"><button id="journey-continue" class="journey-primary">Continue</button><button id="journey-start">New game</button><button class="journey-back" ${back?'':'hidden'}>Back</button></div>
  </section>`;
  document.body.append(menu);
  const start=menu.querySelector('#journey-start'),resume=menu.querySelector('#journey-continue');
  let armed=false,returnFocus=null;
  const hasSave=()=>{try{return !!localStorage.getItem(citySave);}catch{return false;}};
  function show(){
    returnFocus=document.activeElement;armed=false;start.textContent='New game';resume.hidden=!hasSave();
    let completed=false;try{completed=JSON.parse(localStorage.getItem(citySave))?.endingSeen===true;}catch{}
    resume.textContent=completed?'Explore':'Continue';
    start.classList.toggle('journey-primary',resume.hidden);menu.hidden=false;(resume.hidden?start:resume).focus();
  }
  function close(){menu.hidden=true;back();returnFocus?.focus();}
  menu.querySelector('.journey-back').onclick=close;
  resume.onclick=()=>{location.href='/?chapter=folded';};
  start.onclick=()=>{
    if(hasSave()&&!armed){armed=true;start.textContent='Erase save & restart';return;}
    try{localStorage.removeItem(citySave);}catch{}
    location.href='/?chapter=folded';
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
