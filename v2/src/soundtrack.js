// Lossless, sample-aligned score playback. SFX retain their separate synthesis.
export const REGION_TRACKS={foundry:'clockwork-crypt',transit:'platform-zero',garden:'water-remembers',testworks:'flight-test',optics:'unanswered-light',circulation:'second-heart',furnace:'those-before-us'};
export const BATTLE_TRACKS={prototype:'iron-vigil',foundry:'iron-vigil',sorter:'iron-vigil',guardian:'mirror-hunt',keeper:'last-keeper'};
export function scoreTrack({area='',boss,endingTime=0}){
  if(endingTime>0)return 'morning-without-us';
  return BATTLE_TRACKS[boss]||REGION_TRACKS[area.replace(/^r\d-/, '')]||REGION_TRACKS.foundry;
}
export function loopOffset(track,offset){
  if(track.loopStart==null)return Math.min(offset,track.duration);
  return offset<track.loopEnd?offset:track.loopStart+(offset-track.loopStart)%(track.loopEnd-track.loopStart);
}

export class Soundtrack {
  constructor(ctx,destination,{fetcher=fetch}={}){
    this.ctx=ctx;this.fetcher=(...args)=>fetcher(...args);this.output=ctx.createGain();this.output.gain.value=1.35;this.output.connect(destination);
    this.cache=new Map();this.pending=new Map();this.current=null;this.retiring=new Set();this.serial=0;this.paused=false;this.enabled=true;this.retryAt=0;

  }
  async load(id){
    if(this.cache.has(id)){const data=this.cache.get(id);this.cache.delete(id);this.cache.set(id,data);return data;}
    if(this.pending.has(id))return this.pending.get(id);
    const job=(async()=>{
      const manifest=await (this.manifest??=this.fetcher('/music/manifest.json').then(r=>{if(!r.ok)throw Error('Music manifest unavailable');return r.json();}).catch(error=>{this.manifest=null;throw error;}));
      const track=manifest.tracks.find(t=>t.id===id);if(!track)throw Error(`Unknown music: ${id}`);
      const buffers={};
      // Sequential decoding avoids simultaneous large transient allocations.
      for(const [stem,file] of Object.entries(track.assets)){
        const response=await this.fetcher(`/music/${file}`);if(!response.ok)throw Error(`Music unavailable: ${file}`);
        buffers[stem]=await this.ctx.decodeAudioData(await response.arrayBuffer());
      }
      const data={track,buffers};this.cache.set(id,data);
      while(this.cache.size>2)this.cache.delete(this.cache.keys().next().value);
      return data;
    })();
    this.pending.set(id,job);
    try{return await job;}finally{this.pending.delete(id);}
  }
  target(param,value,seconds=.5){
    if(param._scoreTarget===value)return;param._scoreTarget=value;param.setTargetAtTime(value,this.ctx.currentTime,seconds);
  }
  position(voice){return loopOffset(voice.track,voice.offset+Math.max(0,this.ctx.currentTime-voice.started));}
  start(data,offset=0,fade=1.5){
    const {track,buffers}=data,now=this.ctx.currentTime,voice={...data,offset,started:now+.025,sources:[],gains:{},gain:this.ctx.createGain()};
    voice.gain.gain.value=0;voice.gain.connect(this.output);
    for(const [stem,buffer]of Object.entries(buffers)){
      const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;
      source.loop=track.loopStart!=null;if(source.loop){source.loopStart=track.loopStart;source.loopEnd=track.loopEnd;}
      gain.gain.value=stem==='pulse'?track.explorationPulse:stem==='melody'&&this.state?.overdrive===false&&track.region==='foundry'?.35:1;
      source.connect(gain);gain.connect(voice.gain);voice.sources.push(source);voice.gains[stem]=gain;
      source.start(voice.started,loopOffset(track,offset));
    }
    voice.gain.gain.setTargetAtTime(1,now,fade/3);return voice;
  }
  stop(voice,fade=0){
    if(!voice)return;const now=this.ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setValueAtTime(voice.gain.gain.value,now);voice.gain.gain.linearRampToValueAtTime(0,now+Math.max(.015,fade));
    this.retiring.add(voice);
    for(const source of voice.sources)source.stop(now+Math.max(.025,fade)+.02);
    voice.sources.at(-1).onended=()=>{for(const source of voice.sources)source.disconnect();for(const gain of Object.values(voice.gains))gain.disconnect();voice.gain.disconnect();this.retiring.delete(voice);};
  }
  async select(id){
    if(this.loading===id)return;const token=++this.serial;this.loading=id;
    try{
      const data=await this.load(id);
      if(token!==this.serial||this.paused||!this.enabled)return;
      const offset=data.track.kind==='ending'?Math.min(this.state?.endingTime||0,data.track.duration-.05):0;
      const next=this.start(data,offset,data.track.kind==='ending'?.5:1.8);this.stop(this.current,data.track.kind==='ending'?.5:1.8);this.current=next;this.error=null;
    }catch(error){if(token===this.serial){this.error=error;this.retryAt=this.ctx.currentTime+10;console.warn('Soundtrack:',error.message);}}
    finally{if(token===this.serial)this.loading=null;}
  }
  update(state){
    this.state=state;const now=this.ctx.currentTime;
    const blocked=state.paused||state.dead||!state.enabled;
    this.enabled=state.enabled;
    if(blocked){
      if(!this.paused){this.serial++;this.loading=null;if(this.current){this.saved={data:this.current,offset:this.position(this.current)};this.stop(this.current);this.current=null;}for(const voice of this.retiring)for(const source of voice.sources)source.stop(now+.025);}
      this.paused=true;return;
    }
    this.paused=false;
    let desired=scoreTrack(state);
    if(state.boss){this.battleUntil=now+5;this.battleTrack=desired;}
    else if(!state.endingTime&&!state.quiet&&now<this.battleUntil)desired=this.battleTrack;
    if(this.saved){
      if(this.saved.data.track.id===desired)this.current=this.start(this.saved.data,this.saved.offset,.2);
      this.saved=null;
    }
    if(desired!==this.candidate){this.candidate=desired;this.candidateSince=now;if(this.loading&&this.loading!==desired){this.serial++;this.loading=null;}}
    const urgent=state.endingTime>0||!!state.boss;
    if(this.current?.track.id!==desired&&(urgent||!this.current||now-this.candidateSince>2)&&now>=this.retryAt)this.select(desired);
    if(state.combat)this.combatUntil=now+6;
    const fighting=now<this.combatUntil;
    if(this.current?.track.kind==='ending'&&state.endingTime>this.position(this.current)+1){
      const old=this.current;this.current=this.start(old,state.endingTime,.08);this.stop(old,.08);
    }
    const voice=this.current;
    if(voice){
      if(voice.gains.pulse)this.target(voice.gains.pulse.gain,fighting?1:voice.track.explorationPulse,fighting?.3:1.6);
      if(voice.gains.melody)this.target(voice.gains.melody.gain,voice.track.region==='foundry'&&!state.overdrive?.35:1,1.2);
    }
    // Warnings remain clearer than the score; silence follows the final fight.
    this.target(this.output.gain,state.quiet&&!state.endingTime?0:state.duck?.88:1.35,.25);
  }
  dispose(){this.serial++;this.loading=null;this.stop(this.current);this.current=null;for(const voice of this.retiring)for(const source of voice.sources)source.stop(this.ctx.currentTime+.025);this.cache.clear();this.output.disconnect();}
}
