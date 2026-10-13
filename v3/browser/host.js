import { ObjectLoader, WebGLRenderer } from 'three';

// Browser and Three I/O only. Simulation, input policy, and frame scheduling live in MoonBit.
export async function loadScene(url, ready, failed) {
  try {
    performance.mark("art-start");
    async function unpack(path) {
      const response=await fetch(path);
      if(!response.ok)throw new Error(`Art asset: ${response.status}`);
      return response.headers.get('Content-Encoding')==='gzip'?response:new Response(response.body.pipeThrough(new DecompressionStream('gzip')));
    }
    const [json,binary]=await Promise.all([
      unpack(url).then(r=>r.json()),
      unpack('/art/folded-buffers.bin.gz').then(r=>r.arrayBuffer())
    ]);
    performance.mark("art-decoded");
    function attribute(data) {
      if(!data?.array || Array.isArray(data.array))return;
      const {byteOffset,length,type}=data.array;
      data.array=new globalThis[type](binary,byteOffset,length);
    }
    for(const geometry of json.geometries){
      if(!geometry.data)continue;
      attribute(geometry.data.index);
      for(const value of Object.values(geometry.data.attributes??{}))attribute(value);
    }
    function instances(object){attribute(object.instanceMatrix);attribute(object.instanceColor);for(const child of object.children??[])instances(child);}
    instances(json.object);
    performance.mark("art-parse-start");
    new ObjectLoader().parse(json, scene => { performance.mark("art-parsed"); ready(scene); performance.mark("view-created"); });
  } catch (error) { failed(String(error)); }
}
export function createRenderer() {
  return new WebGLRenderer({canvas: document.getElementById('game'), antialias: true, powerPreference: 'high-performance'});
}
export function onKey(callback) {
  addEventListener('keydown', event => {
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    callback(event.code, true, event.repeat);
  });
  addEventListener('keyup', event => callback(event.code, false, false));
}
export function onPointer(callback) {
  const canvas = document.getElementById('game');
  canvas.addEventListener('mousemove', event => callback(event.movementX, event.movementY, event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2));
}
export function onButton(callback) {
  const canvas = document.getElementById('game');
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('mousedown', event => callback(event.button, true));
  addEventListener('mouseup', event => callback(event.button, false));
}
export function inspectScene(scene, camera) {
  if (new URLSearchParams(location.search).has('test')) window.__typedView = {scene, camera};
}

export function createAudio() {
  const ctx = new AudioContext();
  const master = ctx.createGain(); master.connect(ctx.destination);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const values = noise.getChannelData(0);
  for (let i=0;i<values.length;i++) values[i]=Math.random()*2-1;
  const music = new Audio(); music.loop=true;
  return {ctx,master,noise,music};
}
export function audioVoice(audio, noisy, frequency, end, duration, gain, delay, attack, hold, type, cutoff, filterType, pan) {
  const {ctx,master}=audio, at=ctx.currentTime+delay;
  const source=noisy?ctx.createBufferSource():ctx.createOscillator();
  if(noisy){source.buffer=audio.noise;source.loop=true;}
  else {source.type=type;source.frequency.setValueAtTime(frequency,at);source.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+duration);}
  const envelope=ctx.createGain(),panner=ctx.createStereoPanner();panner.pan.value=pan;
  envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(gain,at+attack);envelope.gain.setValueAtTime(gain,at+attack+hold);
  envelope.gain.exponentialRampToValueAtTime(Math.max(.0001,gain*.18),at+Math.max(attack+hold+.001,duration*.55));
  envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);envelope.gain.linearRampToValueAtTime(0,at+duration+.01);
  let filter;
  if(cutoff){filter=ctx.createBiquadFilter();filter.type=filterType;filter.frequency.value=cutoff;filter.Q.value=.65;source.connect(filter);filter.connect(envelope);}else source.connect(envelope);
  envelope.connect(panner);panner.connect(master);source.start(at,noisy?Math.random()*1.5:0);source.stop(at+duration+.012);
  source.onended=()=>{source.disconnect();filter?.disconnect();envelope.disconnect();panner.disconnect();};
}
export function setMusic(audio,url,volume,paused) {
  if(audio.music.getAttribute('src')!==url)audio.music.src=url;
  audio.music.volume=volume;
  if(paused)audio.music.pause();else if(audio.music.paused)audio.music.play().catch(()=>{});
}
