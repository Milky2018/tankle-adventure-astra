const chapter=new URLSearchParams(location.search).get('chapter');
if(!chapter&&!new URLSearchParams(location.search).has('test')){
  document.getElementById('hud').hidden=true;
  const {createJourneyMenu}=await import('./ui/journey-menu.js');createJourneyMenu().show();
}
else if(!chapter||chapter==='folded')await import('./app/session.js');
else await import('./legacy/main.js');
