async page => {
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 const result=await page.evaluate(()=>{
  const g=__game,a=g.debug;g.manual(true);g.setInput([]);a.setCameraView('overhead');
  g.scenario({player:{x:225,y:24,z:-20,hp:25,armorPacks:0,cannonUpgrade:false,mortarUpgrade:false,laserUpgrade:false,scopeUpgrade:false,coolingUpgrade:false,shotCooldown:0,hurtUntil:0,speed:1,invincible:0,heat:0,overheated:false,overdrive:true,phoenix:true,laser:true,circulation:false,weapon:'laser'},state:{guardian:false,gallery:false,laser:true,'lens-return':true},enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,e.id==='guardian'?e.max:0]))});
  g.step(3,false);a.p.weapon='cannon';const screen=a.world.controls.find(c=>c.id==='optical-screen');g.aimAt(screen.x+screen.facing.x*.5,screen.z+screen.facing.z*.5,screen.y+screen.facing.y*.5);g.setInput(['Mouse0']);g.step(.2,false);g.setInput([]);g.step(4,false);a.p.weapon='laser';g.aimAt(216,-4,26);g.setInput(['Mouse0']);g.step(1,false);g.setInput([]);g.step(8,false);
  if(!a.state.gallery||a.state.guardian)throw Error('Laser approach did not open independently of Guardian '+JSON.stringify({screen:a.state['optical-screen'],gallery:a.state.gallery,guardian:a.state.guardian,aim:g.snapshot().aim,segments:g.snapshot().laserSegments,body:a.state.bodies.solids.find(b=>b.id==='optical-screen')}));
  for(const [x,z]of [[242,-20],[242,6],[230,6],[230,38],[202,38],[202,48]])walk(x,z);
  const e=a.world.enemies.find(e=>e.id==='guardian'),start=a.time;let destination=194,reflectedFrames=0,cycle=-1;
  for(let n=0;n<60*120&&e.hp>0;n++){
   if(a.p.hp<=0)throw Error('Guardian death '+JSON.stringify({hp:e.hp,time:a.time-start,reflectedFrames}));
   if(e.attackCycle!==cycle){cycle=e.attackCycle;destination=a.p.x<202?210:194;}
   const moving=e.phase==='warn'||e.attack==='seekers'&&e.phase==='vent'&&e.timer>.5;
   const keys=moving&&Math.abs(a.p.x-destination)>.4?(destination>a.p.x?['KeyS','KeyD']:['KeyW','KeyA']):[];
   const origin=a.weaponOrigin();let target=null;
   for(const [x,z,nx,nz]of [[210,70,1.1417430631,1.5397934235],[190,68,-1.4631790535,1.1737206917]]){
    const normal=new a.T.Vector3(nx,0,nz).normalize(),center=new a.T.Vector3(x,18,z),real=new a.T.Vector3(e.x,18,e.z);
    const virtual=real.clone().addScaledVector(normal,-2*real.clone().sub(center).dot(normal)),ray=virtual.clone().sub(origin);
    const t=center.clone().sub(origin).dot(normal)/ray.dot(normal),point=origin.clone().addScaledVector(ray,t);
    if(t<=0||t>=1||point.distanceTo(center)>4.4)continue;
    const rear=Math.cos(Math.atan2(point.x-e.x,point.z-e.z)-e.aim)<-.45;
    if(rear){target=point;break;}
   }
   if(target)g.aimAt(target.x,target.z,target.y);
   if(target&&!a.p.overheated)keys.push('Mouse0');g.setInput(keys);g.step(1/60,false);
   if(g.snapshot().laserSegments.length>6)reflectedFrames++;
  }
  if(e.hp>0)throw Error('Guardian timeout '+JSON.stringify({hp:e.hp,player:a.p.hp,reflectedFrames}));
  g.setInput([]);g.step(3,false);const fight={seconds:a.time-start,hp:a.p.hp,reflectedFrames};
  function walk(x,z){for(let n=0;n<2400;n++){const dx=x-a.p.x,dz=z-a.p.z;if(Math.hypot(dx,dz)<.25){g.setInput([]);return;}g.setInput(Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD']);g.step(1/60,false);}throw Error('Blocked '+JSON.stringify({at:[a.p.x,a.p.y,a.p.z],target:[x,z]}));}
  for(const [x,z]of [[218,48],[218,70],[254,70],[254,12],[242,12],[242,48],[242,120]])walk(x,z);
  if(a.p.y!==-24||!a.state.guardian)throw Error('Guardian did not release internal descent');a.draw();return {fight,exit:[a.p.x,a.p.y,a.p.z],fixture:'Laser earned; other enemies disabled; real reflected shots, damage, movement and arena rules.'};
 });await page.screenshot({path:'output/playwright/regression/required-guardian-descent.png'});return result;
}
