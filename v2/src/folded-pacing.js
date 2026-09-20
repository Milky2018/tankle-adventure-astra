export function mechanismReady(control,player,time,state={}){
  if(control.requires&&!state[control.requires])return false;
  if(control.pressure){
    const q=control.pressure;
    return Math.abs(player.y-q.y)<.5&&Math.hypot(player.x-q.x,player.z-q.z)<2.2;
  }
  if(control.cycle)return time%control.cycle.period<control.cycle.open;
  return true;
}

export function canTelegraph(enemy,enemies){
  const heavy=['sniper','artillery','scout','elite','welder','hunter','dredger'];
  if(!heavy.includes(enemy.type))return true;
  return !enemies.some(e=>e!==enemy&&e.hp>0&&(enemy.battle?e.battle===enemy.battle:e.encounter&&e.encounter===enemy.encounter)&&heavy.includes(e.type)&&['warn','charge','flame'].includes(e.phase));
}

// Reserves are visible, damageable machines. Firing at them can wake them early;
// otherwise each finite reinforcement waits for the preceding squad and a pause.
export function createEncounterPacing(enemies){
  const battles=Map.groupBy(enemies.filter(e=>e.battle),e=>e.battle);
  const timers=new Map();
  function reset(){timers.clear();for(const e of enemies)e.awake=!e.wave&&!e.activation;}
  function wake(enemy){
    if(!enemy.battle)return;
    for(const e of battles.get(enemy.battle)||[])if(e.wave===enemy.wave)e.awake=true;
  }
  function update(dt,player,resting,time=0){
    for(const [id,group] of battles){
      const activation=group[0].activation;
      if(activation && Math.abs(player.y-activation.y)<2 && Math.hypot(player.x-activation.x,player.z-activation.z)<activation.radius)
        for(const e of group.filter(e=>!e.wave))e.awake=true;
      const reserve=group.filter(e=>e.wave&&e.hp>0&&!e.awake);
      if(!reserve.length)continue;
      const first=group.find(e=>!e.wave),near=Math.abs(player.y-first.y)<3&&Math.hypot(player.x-first.spawn.x,player.z-first.spawn.z)<55;
      if(resting||!near){timers.delete(id);for(const e of reserve)e.deploy=0;continue;}
      if(group.some(e=>!e.wave&&e.hp>0))continue;
      const elapsed=(timers.get(id)||0)+dt;timers.set(id,elapsed);
      for(const e of reserve){e.deploy=Math.min(1,elapsed/4);if(elapsed>=4){e.awake=true;e.timer=.8;e.lastSeen={x:player.x,y:player.y,z:player.z};e.alertUntil=time+12;}}
    }
  }
  reset();return {update,wake,reset};
}
