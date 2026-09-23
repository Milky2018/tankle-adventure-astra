import './folded-interface.css';

// Reuse the runtime's controls and IDs; this layer only arranges presentation.
export function mountFoldedInterface(){
  document.body.classList.add('folded-ui');
  const $=id=>document.getElementById(id),panel=document.querySelector('#settings .panel'),grid=panel.querySelector('.settings-grid');
  $('game').tabIndex=-1;
  $('settings').setAttribute('role','dialog');$('settings').setAttribute('aria-modal','true');
  panel.querySelector('h1').id='pause-title';panel.querySelector('h1').textContent='Paused';
  $('settings').setAttribute('aria-labelledby','pause-title');
  const controls=$('bindings').parentElement,journey=$('journey-button');
  const display=document.createElement('div'),sound=document.createElement('div');
  display.className=sound.className='options';
  display.append($('quality').closest('label'),$('fullscreen').closest('label'));
  sound.append($('volume').closest('label'),$('music').closest('label'),$('sfx').closest('label'));
  controls.append($('reset-bindings'));
  const nav=document.createElement('nav');nav.className='settings-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Settings tabs');
  grid.before(nav);grid.replaceChildren(display,sound,controls);
  const sections=[['display','Display & camera',display],['sound','Audio',sound],['controls','Controls',controls]];
  function select(id){for(const [key,,section]of sections){const button=$(`tab-${key}`);section.hidden=key!==id;button.setAttribute('aria-selected',String(key===id));button.tabIndex=key===id?0:-1;}grid.scrollTop=0;}
  for(const [id,label,section]of sections){
    const button=document.createElement('button');button.id=`tab-${id}`;button.textContent=label;button.setAttribute('role','tab');button.setAttribute('aria-controls',`settings-${id}`);
    section.id=`settings-${id}`;section.setAttribute('role','tabpanel');section.setAttribute('aria-labelledby',button.id);
    button.onclick=()=>select(id);nav.append(button);
    button.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const index=sections.findIndex(s=>s[0]===id),next=e.key==='Home'?0:e.key==='End'?2:(index+(e.key==='ArrowRight'?1:2))%3;select(sections[next][0]);nav.children[next].focus();};
  }
  select('display');
  const utility=document.createElement('div');utility.className='settings-utility';
  journey.textContent='Journey menu';utility.append(journey,$('new-game'));panel.querySelector('.panel-footer').prepend(utility);
  const volume=$('volume'),output=document.createElement('output');output.id='volume-value';output.htmlFor='volume';volume.after(output);
  volume.addEventListener('input',()=>{output.value=`${Math.round(Number(volume.value)*100)}%`;});
  const mapHeader=document.createElement('header');mapHeader.className='map-heading';mapHeader.innerHTML='<h1>Map</h1>';$('region').prepend(mapHeader);
  const mapFooter=document.createElement('footer');mapFooter.className='map-footer';mapFooter.innerHTML='<span class="map-legend"><i class="map-player"></i>Your position</span><span class="map-legend"><i class="map-refuge"></i>Repair hive</span><span class="map-legend"><i class="map-gate"></i>Closed passage</span><span class="map-key"><kbd></kbd> Back</span>';$('region').append(mapFooter);
  const mapKey=document.createElement('kbd');mapKey.className='minimap-key';$('minimap-wrap').append(mapKey);
  $('settings').addEventListener('keydown',e=>{
    if($('settings').hidden||e.key!=='Tab'||$('bindings').querySelector('.binding-listening'))return;
    const items=[...$('settings').querySelectorAll('button,input,select')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length),first=items[0],last=items.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    e.stopPropagation();
  });
  return {
    open(){output.value=`${Math.round(Number(volume.value)*100)}%`;$('resume').focus();},
    bindings(bindings,keyGlyph){keyGlyph(mapKey,bindings.map);keyGlyph(mapFooter.querySelector('kbd'),bindings.map);}
  };
}
