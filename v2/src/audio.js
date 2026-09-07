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
    if(name==='shot'){this.tone(145,.2,'triangle',.65,-110,pan);this.noise(.12,.45,pan);}
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
    this.engine.frequency.setTargetAtTime(65+boost*100+p.heat*.2,t,.12);
    this.engineFilter.frequency.setTargetAtTime(250+boost*350,t,.12);
    this.engineGain.gain.setTargetAtTime(running?.075+boost*.105:0,t,.1);
    if(paused||p.hp<=0||!this.music){this.nextBeat=time;return;}
    if(time<this.nextBeat)return;this.nextBeat=time+(combat?.24:.34);
    const notes=p.overdrive?[0,7,12,14,16,12,7,4,0,7,11,14,12,7,4,2]:[0,7,12,7,0,4,7,4];
    if(this.beat%2===0)this.tone(110*2**(notes[(this.beat/2)%notes.length]/12),.23,'sine',.065);
    if(this.beat%4===0)this.tone(58,.14,'triangle',combat?.28:.15,-30);
    if(combat||area==='c'||this.beat%4===2){this.tone(this.beat%2?1260:820,.045,'triangle',.035);if(this.beat%4===2)this.noise(.045,.065);}
    this.beat++;
  }
}
