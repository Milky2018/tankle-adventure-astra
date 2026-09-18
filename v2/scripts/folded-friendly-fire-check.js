async page=>{

  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
  return await page.evaluate(()=>{
   const a=__game.debug,{world:w,T}=a;__game.manual(true);a.clearShots();for(const e of w.enemies)e.hp=0;
   const [shooter,ally,behind]=w.enemies.filter(e=>!e.persistent).slice(0,3);
   function body(e,x,y,z){Object.assign(e,{x,y,z,hp:10,max:10,type:'turret',guardian:false,persistent:false,phase:'idle',parts:[],radius:1});}
   function fly(){for(let i=0;i<150;i++)a.updateShots(1/60);}
   // Isolate the flight at a height clear of city geometry, using real world.cast.
   body(shooter,0,128,0);body(ally,0,128,6);body(behind,0,128,11);Object.assign(a.p,{x:0,y:128,z:20,hp:50,invincible:0});
   a.shootEnemy(shooter,0,null,new T.Vector3(0,129.2,20));fly();
   const direct={shooter:shooter.hp,ally:ally.hp,behind:behind.hp,player:a.p.hp};
   if(direct.shooter!==10||direct.ally!==9||direct.behind!==10||direct.player!==50)throw Error('Crossfire interception '+JSON.stringify(direct));
   a.clearShots();body(shooter,-14,-56,36);body(ally,-14,-56,47);body(behind,-14,-56,50);Object.assign(a.p,{x:-14,y:-56,z:55,hp:50});
   const origin=new T.Vector3(-14,-54.5,36),toward=new T.Vector3(-14,-54.5,47).sub(origin);
   if(!w.cast(origin,toward.clone().normalize(),toward.length(),{targets:false}))throw Error('Keeper cover fixture lacks cover');
   a.shootEnemy(shooter,0,null,new T.Vector3(a.p.x,a.p.y+1.2,a.p.z));fly();
   if(ally.hp!==10||behind.hp!==10||a.p.hp!==50)throw Error('Crossfire passed through physical cover');
   body(shooter,-14,-56,40);body(ally,-14,-56,38);body(behind,-14,-56,46);
   a.impact({point:new T.Vector3(-14,-55.9,41.5)},{hostile:true,mortar:true,owner:shooter.id,origin:new T.Vector3(-14,-54.5,36)});
   const mortar={shooter:shooter.hp,open:ally.hp,covered:behind.hp};
   if(mortar.shooter!==10||mortar.open!==7||mortar.covered!==10)throw Error('Mortar crossfire/cover '+JSON.stringify(mortar));
   const h=w.hives.find(h=>!h.requires);body(shooter,h.x,h.y,h.z-8);body(ally,h.x,h.y,h.z);behind.hp=0;Object.assign(a.p,{x:h.x,y:h.y,z:h.z+1,hp:50});
   a.shootEnemy(shooter,0,null,new T.Vector3(a.p.x,a.p.y+1.2,a.p.z));fly();
   if(ally.hp!==10||a.p.hp!==50)throw Error('Crossfire breached sanctuary');
   return {direct,mortar,cover:true,sanctuary:true};
  });
}
