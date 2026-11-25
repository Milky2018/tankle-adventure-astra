///|
pub struct Audio {
  priv ctx : @audio.AudioContext
  priv master : @audio.GainNode
  priv noise : @audio.AudioBuffer
  priv track : MusicTrack
}

///|
extern "js" fn sample_rate(ctx : @audio.AudioContext) -> Int32 = "ctx=>ctx.sampleRate"

///|
extern "js" fn mono_buffer(
  ctx : @audio.AudioContext,
  length : Int32,
  rate : Int32,
) -> @audio.AudioBuffer = "(ctx,len,hz)=>ctx.createBuffer(1,len,hz)"

///|
extern "js" fn samples(buffer : @audio.AudioBuffer) -> FixedArray[Float] = "b=>b.getChannelData(0)"

///|
#external
priv type MusicTrack

///|
extern "js" fn MusicTrack::new() -> MusicTrack = "()=>new Audio()"

///|
extern "js" fn MusicTrack::set_loop(self : MusicTrack, looped : Bool) -> Unit = "(m,v)=>{m.loop=v}"

///|
pub fn create_audio() -> Audio {
  let ctx = @audio.AudioContext::get_context()
  let master = ctx.create_gain()
  master.as_node().connect(ctx.destination())
  let rate = sample_rate(ctx)
  let noise = mono_buffer(ctx, rate * 2, rate)
  let data = samples(noise)
  for i in 0..<data.length() {
    data[i] = Float::from_double(@three_math.rand_float(-1, 1))
  }
  let track = MusicTrack::new()
  track.set_loop(true)
  { ctx, master, noise, track, }
}

///|
extern "js" fn oscillator(ctx : @audio.AudioContext) -> @audio.AudioNode = "c=>c.createOscillator()"

///|
extern "js" fn stereo(ctx : @audio.AudioContext) -> @audio.AudioNode = "c=>c.createStereoPanner()"

///|
extern "js" fn biquad(ctx : @audio.AudioContext) -> @audio.AudioNode = "c=>c.createBiquadFilter()"

///|
extern "js" fn set_node_type(node : @audio.AudioNode, kind : String) -> Unit = "(n,v)=>{n.type=v}"

///|
extern "js" fn pan_param(node : @audio.AudioNode) -> @audio.AudioParam = "n=>n.pan"

///|
extern "js" fn resonance(node : @audio.AudioNode) -> @audio.AudioParam = "n=>n.Q"

///|
extern "js" fn set_audio_value(
  param : @audio.AudioParam,
  value : Double,
) -> Unit = "(p,v)=>{p.value=v}"

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
extern "js" fn start_oscillator(node : @audio.AudioNode, time : Double) -> Unit = "(n,t)=>n.start(t)"

///|
extern "js" fn stop_source(node : @audio.AudioNode, time : Double) -> Unit = "(n,t)=>n.stop(t)"

///|
extern "js" fn on_end(node : @audio.AudioNode, callback : () -> Unit) -> Unit = "(n,cb)=>{n.onended=cb}"

///|
pub(all) enum VoiceSource {
  Noise
  Tone(wave~ : String, from_hz~ : Double, to_hz~ : Double)
}

///|
pub(all) struct Voice {
  source : VoiceSource
  duration : Double
  gain : Double
  delay : Double
  attack : Double
  hold : Double
  filter : (String, Double)?
}

///|
pub fn Audio::play_voice(
  self : Audio,
  voice : Voice,
  gain~ : Double = 1,
  pan~ : Double = 0,
) -> Unit {
  let ctx = self.ctx
  let at = ctx.current_time() + voice.delay
  let { duration, attack, hold, .. } = voice
  let gain = voice.gain * gain
  let source = match voice.source {
    Noise => {
      let node = ctx.create_buffer_source()
      node.set_buffer(Some(self.noise))
      node.set_loop(true)
      node.as_node()
    }
    Tone(wave~, from_hz~, to_hz~) => {
      let node = oscillator(ctx)
      set_node_type(node, wave)
      let pitch = frequency_of(node)
      set_at(pitch, from_hz, at)
      exp_at(pitch, to_hz.max(20), at + duration)
      node
    }
  }
  let envelope = ctx.create_gain()
  let panner = stereo(ctx)
  set_audio_value(pan_param(panner), pan)
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
  let effect = if voice.filter is Some((filter, cutoff)) {
    let n = biquad(ctx)
    set_node_type(n, filter)
    set_audio_value(frequency_of(n), cutoff)
    set_audio_value(resonance(n), 0.65)
    source.connect(n)
    n.connect(envelope.as_node())
    Some(n)
  } else {
    source.connect(envelope.as_node())
    None
  }
  envelope.as_node().connect(panner)
  panner.connect(self.master.as_node())
  on_end(source, fn() {
    match effect {
      Some(n) => {
        source.disconnect(n)
        n.disconnect(envelope.as_node())
      }
      None => source.disconnect(envelope.as_node())
    }
    envelope.as_node().disconnect(panner)
    panner.disconnect(self.master.as_node())
  })
  match voice.source {
    Noise => source.as_buffer_source().start(at, @three_math.rand_float(0, 1.5))
    Tone(..) => start_oscillator(source, at)
  }
  stop_source(source, at + duration + 0.012)
}

///|
extern "js" fn music_src(track : MusicTrack) -> String = "m=>m.getAttribute('src')??''"

///|
extern "js" fn pause_track(track : MusicTrack) -> Unit = "m=>m.pause()"

///|
extern "js" fn play_track(track : MusicTrack) -> Unit = "m=>m.play().catch(()=>{})"

///|
extern "js" fn MusicTrack::set_src(self : MusicTrack, path : String) -> Unit = "(m,path)=>{m.src=path}"

///|
extern "js" fn MusicTrack::seek(self : MusicTrack, time : Double) -> Unit = "(m,t)=>{m.currentTime=t}"

///|
extern "js" fn MusicTrack::is_paused(self : MusicTrack) -> Bool = "m=>m.paused"

///|
extern "js" fn MusicTrack::set_volume(
  self : MusicTrack,
  volume : Double,
) -> Unit = "(m,v)=>{m.volume=v}"

///|
pub fn Audio::update_music(
  self : Audio,
  url : String,
  volume~ : Double,
  paused~ : Bool,
  restart~ : Bool,
) -> Unit {
  let track = self.track
  if music_src(track) != url {
    track.set_src(url)
  }
  if restart {
    track.seek(0)
  }
  track.set_volume(volume)
  if paused {
    pause_track(track)
  } else if track.is_paused() {
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
