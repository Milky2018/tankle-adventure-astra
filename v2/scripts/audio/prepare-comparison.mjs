import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const warnings = process.argv.includes('--warnings');
const output = fileURLToPath(
  new URL(
    warnings ? '../../output/audio/warning-comparison/' : '../../output/audio/sfx-comparison/',
    import.meta.url,
  ),
);
mkdirSync(output, { recursive: true });
// Keep the comparison outside the game bundle and preserve the actual old synth.
const source = execFileSync('git', ['show', 'dd92d79:v2/src/audio.js'], {
  cwd: root,
  encoding: 'utf8',
});
if (!warnings)
  writeFileSync(
    output + 'before.js',
    source
      .replace("from './mechanics.js'", "from '/src/player/mechanics.js'")
      .replace("from './soundtrack.js'", "from '/src/audio/soundtrack.js'"),
  );
else {
  // Snapshot once, before editing warning recipes. Re-renders preserve that baseline.
  if (!existsSync(output + 'before.js'))
    writeFileSync(
      output + 'before.js',
      readFileSync(new URL('../../src/audio/sound-effects.js', import.meta.url)),
    );
  const factory = readFileSync(new URL('../../src/audio/playback.js', import.meta.url), 'utf8')
    .replaceAll("from '../player/", "from '/src/player/")
    .replaceAll("from './", "from '/src/audio/")
    .replace("from '/src/audio/sound-effects.js'", "from './before.js'");
  writeFileSync(output + 'factory-before.js', factory);
}
writeFileSync(
  output + 'render.html',
  `<!doctype html><meta charset="utf-8"><title>Sound effect render</title><button id="download">Download</button><script type="module">
import { FactoryAudio as Before } from './before.js';
import { FactoryAudio as After } from '../../../src/audio/playback.js';
import { SOUND_EFFECTS, SoundEffects, spatialSound } from '../../../src/audio/sound-effects.js';
const rate = 44100;
function rng(seed=83415) { return () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296); }
function wav(buffer) {
  const data = new ArrayBuffer(44 + buffer.length * 4), view = new DataView(data);
  const word=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};
  word(0,'RIFF');view.setUint32(4,data.byteLength-8,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,buffer.length*4,true);
  for(let ch=0;ch<2;ch++){const samples=buffer.getChannelData(ch);for(let i=0;i<samples.length;i++)view.setInt16(44+(i*2+ch)*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);}
  return new Blob([data],{type:'audio/wav'});
}
function summary(buffer) {
  let peak=0,power=0,bad=0,left=0,right=0;
  for(let ch=0;ch<2;ch++)for(const x of buffer.getChannelData(ch)){if(!Number.isFinite(x))bad++;peak=Math.max(peak,Math.abs(x));power+=x*x;if(ch===0)left+=x*x;else right+=x*x;}
  return {peak,rms:Math.sqrt(power/(buffer.length*2)),bad,left,right};
}
window.files = new Map();
window.renderComparison = async () => {
  const report=[];
  for(const name of [...Object.keys(SOUND_EFFECTS),'engine','battle','spatial']) {
    for(const version of ['before','after']) {
      const duration = name==='couple'?7 : ['engine','battle','spatial'].includes(name)?9:3;
      const ctx=new OfflineAudioContext(2,rate*duration,rate);
      let clock=0;
      const proxy=new Proxy(ctx,{get(target,key){if(key==='currentTime')return clock;if(key==='resume')return ()=>Promise.resolve();const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
      const master=ctx.createGain();master.gain.value=.22;master.connect(ctx.destination);
      const random=Math.random,timer=window.setTimeout;Math.random=rng();
      const queue=[];window.setTimeout=(callback,delay)=>{queue.push({callback,at:clock+delay/1000});return 0;};
      let audio;
      try {
        audio=new (version==='before'?Before:After)();
        if(name==='engine') {
          const Native=window.AudioContext;
          try{window.AudioContext=function(){return proxy;};audio.start();}finally{window.AudioContext=Native;}
          audio.score={update(){}};
          const p={hp:50,heat:0,speed:1};
          for(const [at,speed,moving] of [[0,1,true],[2,1.6,true],[4,3.2,true],[6,1,true],[7,1,false]]) {
            clock=at;p.speed=speed;audio.update(at,p,false,'',false,moving);
          }
        } else {
          audio.ctx=proxy;audio.master=master;
          if(version==='after')audio.effects=new SoundEffects(proxy,master,rng());
          const emit=(event,at,position)=>{clock=at;audio.listener={x:0,y:0,z:0,yaw:0};audio.event(version==='before'?(event==='hurt'?'hit':event==='magnet-pull'?'magnet':event==='rail-shot'?'welder-shot':event==='seeker-shot'?'guard-shot':event):event,version==='after'&&position?{position}:0);};
          if(name==='battle') {
            for(let i=0;i<8;i++)emit('shot',.2+i*.5);
            emit('rail-shot',.6,{x:20,y:0,z:8});emit('guard-shot',1.2,{x:-12,y:0,z:10});emit('hurt',1.5);emit('mortar',2.8,{x:0,y:0,z:25});emit('explode',3.9,{x:-8,y:0,z:12});emit('armor',4.7);emit('heat',5.3);emit('ready',6.9);
          } else if(name==='spatial') {
            emit('guard-shot',.2,{x:12,y:0,z:0});emit('guard-shot',2.2,{x:-12,y:0,z:0});emit('guard-shot',4.2,{x:-45,y:0,z:0});emit('guard-shot',6.2,{x:0,y:0,z:65});
          } else if(name==='laser') {
            for(let i=0;i<8;i++)emit(name,.15+i*.14);
          } else if((name==='magnet'||name==='magnet-pull')) {
            for(let i=0;i<3;i++)emit(name,.15+i*.6);
          } else emit(name,.15);
          while(queue.length){const task=queue.shift();clock=task.at;task.callback();}
        }
      } finally {Math.random=random;window.setTimeout=timer;}
      const buffer=await ctx.startRendering();
      const file=version+'-'+name+'.wav';window.files.set(file,wav(buffer));
      report.push({file,...summary(buffer),voices:audio.effects?.voices.size});
    }
  }
  // Actual browser DSP assertions, without file normalization masking overload.
  for(const item of report) if(item.bad||item.peak>=.98||item.rms<.00001)throw Error('Invalid render '+JSON.stringify(item));
  return report;
};
window.downloadAll=async report=>{
  const chunks=[], encoder=new TextEncoder();
  const files=[...window.files, ['report.json',new Blob([JSON.stringify(report,null,2)])]];
  for(const [name,blob] of files) {
    const bytes=new Uint8Array(await blob.arrayBuffer()), header=new Uint8Array(512);
    const text=(offset,value)=>header.set(encoder.encode(value),offset);
    const octal=(offset,length,value)=>text(offset,value.toString(8).padStart(length-1,'0')+'\\0');
    text(0,name);octal(100,8,420);octal(108,8,0);octal(116,8,0);octal(124,12,bytes.length);octal(136,12,0);
    header.fill(32,148,156);header[156]=48;text(257,'ustar');text(263,'00');
    const checksum=header.reduce((a,b)=>a+b,0);text(148,checksum.toString(8).padStart(6,'0')+'\\0 ');
    chunks.push(header,bytes,new Uint8Array((512-bytes.length%512)%512));
  }
  chunks.push(new Uint8Array(1024));
  const a=document.createElement('a');a.download='raw-sfx.tar';a.href=URL.createObjectURL(new Blob(chunks,{type:'application/x-tar'}));a.click();
};
window.ready=true;
</script>`,
);
if (warnings) {
  const rendered = readFileSync(output + 'render.html', 'utf8')
    .replace(
      "import { FactoryAudio as Before } from './before.js';",
      "import { FactoryAudio as Before } from './factory-before.js';\nimport { SoundEffects as BeforeEffects } from './before.js';",
    )
    .replace(
      "[...Object.keys(SOUND_EFFECTS),'engine','battle','spatial']",
      "['blocked','warn','boss-lock','clamp-warn','press-warn','heat','battle']",
    )
    .replace(
      "if(version==='after')audio.effects=new SoundEffects(proxy,master,rng());",
      "audio.effects=new (version==='before'?BeforeEffects:SoundEffects)(proxy,master,rng());",
    )
    .replace(
      "audio.event(version==='before'?(event==='hurt'?'hit':event==='magnet-pull'?'magnet':event==='rail-shot'?'welder-shot':event==='seeker-shot'?'guard-shot':event):event,version==='after'&&position?{position}:0);",
      'audio.event(event,position?{position}:0);',
    )
    .replace(
      "emit('heat',5.3);emit('ready',6.9);",
      "emit('warn',.4);emit('boss-lock',2.1);emit('press-warn',4.4);emit('heat',5.8);emit('ready',7.5);",
    );
  writeFileSync(output + 'render.html', rendered);
}
console.log(output);
