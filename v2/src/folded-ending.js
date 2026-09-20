export function createEnding(onContinue,onMenu){
  const root=document.createElement('div');root.id='ending';root.hidden=true;
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','ending-title');
  root.innerHTML=`<section>
    <svg class="ending-flame" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44"/><path d="M50 16c18 20-6 24 10 36l10-16c18 24 1 49-20 49S9 61 29 37l10 16c14-13-3-19 11-37z"/></svg>
    <p class="ending-mark">TANKLE ADVENTURE ASTRA</p><h1 id="ending-title">Mission Accomplished</h1>
    <div class="ending-actions"><button id="ending-continue">Continue exploring</button><button id="ending-menu">Journey menu</button></div>
    <p class="ending-note">Continue exploring from your last repair hive.</p>
  </section>`;
  document.body.append(root);
  const resume=root.querySelector('#ending-continue'),menu=root.querySelector('#ending-menu');
  resume.onclick=onContinue;menu.onclick=onMenu;
  window.addEventListener('keydown',event=>{
    if(root.hidden)return;event.stopImmediatePropagation();
    if(event.code==='Escape')event.preventDefault();
    if(event.code==='Tab'){event.preventDefault();(document.activeElement===resume?menu:resume).focus();}
  },true);
  return {get visible(){return !root.hidden;},show(){root.hidden=false;resume.focus();},hide(){root.hidden=true;}};
}
