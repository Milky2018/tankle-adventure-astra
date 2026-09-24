async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/');
  await page.locator('#journey-title').waitFor();
  const titles=[];
  for(const width of [1440,800,390,320]){
    await page.setViewportSize({width,height:844});
    const title=await page.evaluate(()=>{
      const main=document.querySelector('.journey-main-title'),sub=document.querySelector('.journey-subtitle');
      const r=document.createRange();r.selectNodeContents(main);const rects=[...r.getClientRects()];
      return {main:main.textContent,sub:sub.textContent,lines:rects.length,right:rects[0].right,below:sub.getBoundingClientRect().top>rects[0].bottom};
    });
    if(title.main!=='TANKLE ADVENTURE'||title.sub!=='ASTRA'||title.lines!==1||title.right>width||!title.below)throw Error(JSON.stringify({width,title}));
    titles.push({width,...title});await page.screenshot({path:`output/playwright/regression/title-${width}.png`});
  }
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');await page.waitForFunction(()=>window.__game?.debug);
  await page.evaluate(async()=>{
    const {abilityIcon,equipmentIcons}=await import('/src/ui/hud.js');
    const sheet=document.createElement('div');sheet.id='icon-review';sheet.style='position:fixed;inset:0;z-index:100;background:#102b2e;color:#ede6c9;display:grid;grid-template-columns:repeat(4,1fr);gap:30px;padding:50px;font:16px sans-serif';
    const icons={...Object.fromEntries(['cannon','mortar','laser','magnet','flotation','overdrive','phoenix','circulation'].map(id=>[id,abilityIcon(id)])),...equipmentIcons};
    for(const [id,path]of Object.entries(icons)){const cell=document.createElement('div');cell.innerHTML=`<svg width="96" height="96" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg><p>${id}</p>`;sheet.append(cell);}
    document.body.append(sheet);
  });
  await page.setViewportSize({width:1000,height:800});await page.screenshot({path:'output/playwright/regression/icon-review.png'});
  if(errors.length)throw Error(errors.join('\n'));return {titles,errors};
}
