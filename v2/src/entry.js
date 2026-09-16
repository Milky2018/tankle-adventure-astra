const chapter=new URLSearchParams(location.search).get('chapter');
if(!chapter&&!new URLSearchParams(location.search).has('test')){
  document.getElementById('hud').hidden=true;
  const {createJourneyMenu}=await import('./journey-menu.js');createJourneyMenu().show();
}
else if(!chapter||chapter==='folded')await import('./folded.js');
else await import('./main.js');
