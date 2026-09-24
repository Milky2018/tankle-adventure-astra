export function createEnding(onContinue,onMenu){
  const root=document.createElement('div');root.id='ending';root.hidden=true;
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','ending-title');
  root.innerHTML=`<section>
    <h1 id="ending-title">Mission Accomplished</h1>
    <div class="ending-actions"><button id="ending-continue">Continue</button><button id="ending-menu">Main menu</button></div>
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
