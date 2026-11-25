///|
pub struct Audio {
  priv ctx : @audio.AudioContext
  priv master : @audio.GainNode
  priv noise : @audio.AudioBuffer
  priv track : @core.JsValue
}

///|
extern "js" fn create_noise_buffer(
  ctx : @audio.AudioContext,
) -> @audio.AudioBuffer =
  #| ctx=>ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate)

///|
extern "js" fn samples(buffer : @audio.AudioBuffer) -> FixedArray[Float] =
  #| b=>b.getChannelData(0)

///|
extern "js" fn random() -> Double = "()=>Math.random()"

///|
extern "js" fn new_track() -> @core.JsValue = "()=>new Audio()"

///|
pub fn create_audio() -> Audio {
  let ctx = @audio.AudioContext::get_context()
  let master = ctx.create_gain()
  master.as_node().connect(ctx.destination())
  let noise = create_noise_buffer(ctx)
  let data = samples(noise)
  for i in 0..<data.length() {
    data[i] = Float::from_double(random() * 2 - 1)
  }
  let track = new_track()
  track.set("loop", @core.JsValue::of(true))
  { ctx, master, noise, track, }
}

///|
extern "js" fn oscillator(
  ctx : @audio.AudioContext,
  wave : String,
) -> @audio.AudioNode =
  #| (ctx,type)=>{ const n=ctx.createOscillator();n.type=type;return n }

///|
extern "js" fn stereo(
  ctx : @audio.AudioContext,
  pan : Double,
) -> @audio.AudioNode =
  #| (ctx,value)=>{const n=ctx.createStereoPanner();n.pan.value=value;return n}

///|
extern "js" fn biquad(
  ctx : @audio.AudioContext,
  kind : String,
  cutoff : Double,
  q : Double,
) -> @audio.AudioNode =
  #| (ctx,type,hz,q)=>{const n=ctx.createBiquadFilter();n.type=type;n.frequency.value=hz;n.Q.value=q;return n}

///|
extern "js" fn set_at(
  param : @audio.AudioParam,
  value : Double,
  when_ : Double,
) -> Unit =
  #| (p,v,t)=>p.setValueAtTime(v,t)

///|
extern "js" fn exp_at(
  param : @audio.AudioParam,
  value : Double,
  when_ : Double,
) -> Unit =
  #| (p,v,t)=>p.exponentialRampToValueAtTime(v,t)

///|
extern "js" fn frequency_of(source : @audio.AudioNode) -> @audio.AudioParam = "n=>n.frequency"

///|
extern "js" fn start_source(
  node : @audio.AudioNode,
  time : Double,
  offset : Double,
) -> Unit =
  #| (n,t,o)=>n.start(t,o)

///|
extern "js" fn stop_source(node : @audio.AudioNode, time : Double) -> Unit = "(n,t)=>n.stop(t)"

///|
extern "js" fn on_end(node : @audio.AudioNode, callback : () -> Unit) -> Unit = "(n,cb)=>{n.onended=cb}"

///|
extern "js" fn disconnect(node : @audio.AudioNode) -> Unit = "n=>n.disconnect()"

///|
pub fn audio_voice(
  audio : Audio,
  noise : Bool,
  frequency : Double,
  end : Double,
  duration : Double,
  gain : Double,
  delay : Double,
  attack : Double,
  hold : Double,
  wave : String,
  cutoff : Double,
  filter : String,
  pan : Double,
) -> Unit {
  let ctx = audio.ctx
  let at = ctx.current_time() + delay
  let source = if noise {
    let node = ctx.create_buffer_source()
    node.set_buffer(Some(audio.noise))
    node.set_loop(true)
    node.as_node()
  } else {
    let node = oscillator(ctx, wave)
    let pitch = frequency_of(node)
    set_at(pitch, frequency, at)
    exp_at(pitch, end.max(20), at + duration)
    node
  }
  let envelope = ctx.create_gain()
  let panner = stereo(ctx, pan)
  let level = envelope.gain()
  set_at(level, 0, at)
  level.linear_ramp_to_value_at_time(gain, at + attack)
  set_at(level, gain, at + attack + hold)
  exp_at(
    level,
    0.0001.max(gain * 0.18),
    at + (attack + hold + 0.001).max(duration * 0.55),
  )
  exp_at(level, 0.0001, at + duration)
  level.linear_ramp_to_value_at_time(0, at + duration + 0.01)
  let effect = if cutoff != 0 {
    let n = biquad(ctx, filter, cutoff, 0.65)
    source.connect(n)
    n.connect(envelope.as_node())
    Some(n)
  } else {
    source.connect(envelope.as_node())
    None
  }
  envelope.as_node().connect(panner)
  panner.connect(audio.master.as_node())
  on_end(source, fn() {
    disconnect(source)
    if effect is Some(n) {
      disconnect(n)
    }
    disconnect(envelope.as_node())
    disconnect(panner)
  })
  start_source(source, at, if noise { random() * 1.5 } else { 0 })
  stop_source(source, at + duration + 0.012)
}

///|
extern "js" fn music_src(track : @core.JsValue) -> String = "m=>m.getAttribute('src')??''"

///|
extern "js" fn pause_track(track : @core.JsValue) -> Unit = "m=>m.pause()"

///|
extern "js" fn play_track(track : @core.JsValue) -> Unit = "m=>m.play().catch(()=>{})"

///|
pub fn music(
  audio : Audio,
  url : String,
  volume : Double,
  paused : Bool,
  restart : Bool,
) -> Unit {
  let track = audio.track
  if music_src(track) != url {
    track.set("src", @core.JsValue::of(url))
  }
  if restart {
    track.set("currentTime", @core.JsValue::of(0))
  }
  track.set("volume", @core.JsValue::of(volume))
  if paused {
    pause_track(track)
  } else if track.get("paused").cast() {
    play_track(track)
  }
}

///|
pub fn audio_volume(audio : Audio, volume : Double) -> Unit {
  audio.master.gain().set_target_at_time(volume, audio.ctx.current_time(), 0.1)
}

///|
extern "js" fn resume_context(ctx : @audio.AudioContext) -> Unit = "ctx=>{ctx.resume()}"

///|
pub fn audio_resume(audio : Audio) -> Unit {
  resume_context(audio.ctx)
}
