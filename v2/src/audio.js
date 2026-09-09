import { clamp, OVERDRIVE_MAX_SPEED } from './mechanics.js';

export class FactoryAudio {
  constructor(){this.ctx=null;this.volume=.55;this.music=true;this.sfx=true;this.nextBeat=0;this.beat=0;}
  start(){
    if(!this.ctx){
      this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=this.volume*.4;this.master.connect(this.ctx.destination);
      this.engine=this.ctx.createOscillator();this.engine.type='sawtooth';this.engine.frequency.value=43;
      this.engineFilter=this.ctx.createBiquadFilter();this.engineFilter.type='lowpass';this.engineFilter.frequency.value=250;
      this.engineGain=this.ctx.createGain();this.engineGain.gain.value=0;this.engine.connect(this.engineFilter);this.engineFilter.connect(this.engineGain);this.engineGain.connect(this.master);this.engine.start();
    }
    if(this.ctx.state==='suspended')this.ctx.resume();
  }
  tone(freq,duration=.15,type='sine',gain=.2,slide=0,pan=0){
    if(!this.ctx)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain(),p=this.ctx.createStereoPanner();
    o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),t+duration);
    g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);p.pan.value=Math.max(-1,Math.min(1,pan));o.connect(g);g.connect(p);p.connect(this.master);o.start(t);o.stop(t+duration+.03);
  }
  noise(duration=.2,gain=.2,pan=0){
    if(!this.ctx)return;const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*duration,this.ctx.sampleRate),d=buffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
    const s=this.ctx.createBufferSource(),g=this.ctx.createGain(),p=this.ctx.createStereoPanner(),f=this.ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=1500;s.buffer=buffer;g.gain.value=gain;p.pan.value=Math.max(-1,Math.min(1,pan));s.connect(f);f.connect(g);g.connect(p);p.connect(this.master);s.start();
  }
  event(name,pan=0){
    if(!this.sfx||!this.ctx)return;
    if(name==='lever'){this.tone(155,.15,'triangle',.18,-75,pan);this.noise(.08,.15,pan);}
    if(name==='blocked'){this.tone(85,.13,'square',.1,-30,pan);}
    if(name==='flotation'){this.noise(.4,.15,pan);this.tone(160,.35,'triangle',.16,160,pan);}
    if(name==='fuse'){this.noise(.65,.2,pan);this.tone(240,.8,'sawtooth',.13,440,pan);}
    if(name==='crate'){this.noise(.25,.4,pan);this.tone(90,.15,'triangle',.2,-55,pan);}
    if(name==='vent'){this.noise(.65,.14,pan);this.tone(290,.4,'sine',.1,-160,pan);}
    if(name==='mortar'){this.tone(95,.45,'sine',.7,-65,pan);this.noise(.23,.4,pan);this.tone(550,.75,'sine',.08,-380,pan);}
    if(name==='magnet'){this.tone(130,.8,'triangle',.22,110,pan);this.tone(260,.6,'sine',.1,220,pan);}
    if(name==='shot'){this.tone(145,.2,'triangle',.65,-110,pan);this.noise(.12,.45,pan);}
    if(name==='welder-shot'){this.tone(720,.16,'triangle',.22,-590,pan);this.noise(.07,.18,pan);}
    if(name==='guard-shot'){this.tone(110,.3,'triangle',.5,-75,pan);this.noise(.2,.35,pan);}
    if(name==='foundry-shot'){this.tone(58,.65,'sine',.75,-30,pan);this.tone(116,.22,'triangle',.25,-60,pan);this.noise(.35,.4,pan);}
    if(name==='crusher'){this.tone(48,.6,'sine',.13,-20,pan);this.noise(.28,.09,pan);}
    if(name==='clamp-warn'){this.tone(370,.7,'triangle',.16,390,pan);this.tone(1480,.09,'sine',.09,-400,pan);}
    if(name==='press-warn'){this.tone(65,1.5,'sawtooth',.15,165,pan);this.tone(130,1.2,'sine',.2,330,pan);}
    if(name==='hit'){this.tone(280,.12,'square',.16,-200,pan);this.noise(.16,.3,pan);}
    if(name==='armor'){this.tone(980,.24,'sine',.32,-180,pan);this.tone(1760,.14,'sine',.17,-260,pan);this.tone(2630,.07,'triangle',.07,-350,pan);this.noise(.035,.12,pan);}
    if(name==='explode'){this.tone(85,.6,'sine',.8,-60,pan);this.noise(.6,.65,pan);}
    if(name==='warn'){this.tone(280,.45,'sawtooth',.12,420,pan);this.tone(425,.3,'sine',.1,250,pan);}
    if(name==='heat'){this.noise(.8,.3);this.tone(430,.6,'triangle',.24,-330);}
    if(name==='ready'){this.tone(580,.12,'sine',.16);this.tone(860,.2,'sine',.08);}
    if(name==='repair'||name==='unlock'){[0,4,7,12,16].forEach((n,i)=>setTimeout(()=>this.tone(220*2**(n/12),.6,'sine',.22),i*115));}
    if(name==='death'){this.tone(160,1.3,'sawtooth',.3,-135);this.noise(.8,.4);}
    if(name==='ram'){this.tone(75,.22,'square',.3,-40,pan);this.noise(.18,.4,pan);}
  }
  update(time,p,combat,area,paused,moving=false){
    if(!this.ctx)return;const t=this.ctx.currentTime;
    const boost=clamp((p.speed-1)/(OVERDRIVE_MAX_SPEED-1),0,1);
    const running=this.sfx&&!paused&&p.hp>0&&(moving||boost>0);
    this.master.gain.setTargetAtTime(this.volume*.4,t,.15);
    this.engine.frequency.setTargetAtTime((p.afloat?48:65)+boost*100+p.heat*.2,t,.12);
    this.engineFilter.frequency.setTargetAtTime(250+boost*350,t,.12);
    this.engineGain.gain.setTargetAtTime(running?.075+boost*.105:0,t,.1);
    if(paused||p.hp<=0||!this.music){this.nextBeat=time;return;}
    if(time<this.nextBeat)return;this.nextBeat=time+(combat?.32:area.startsWith('r3-')?2.3:area.startsWith('r2-')?1.8:1.15);
    // Sparse, unresolved notes leave room for machinery; combat adds a restrained pulse.
    const notes=p.overdrive?[0,7,14,10,7,3,12,7]:[0,7,10,7,2,0,7,3];
    if(this.beat%2===0)this.tone(110*2**(notes[(this.beat/2)%notes.length]/12),combat?.65:2.6,'sine',.055);
    if(this.beat%8===0){this.tone(area==='boss'?41.2:55,3.5,'sine',.09);this.tone(165,2.7,'sine',.025);}
    if(combat){
      if(this.beat%2===0)this.tone(58,.18,'triangle',.19,-30);
      if(this.beat%4===2)this.noise(.055,.045);
    }
    this.beat++;
  }
}
