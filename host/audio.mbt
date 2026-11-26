///|
pub struct Audio {
  priv ctx : @audio.AudioContext
  priv mix : @audio.AudioNode
  priv master : @audio.GainNode
  priv mut volume : Double
  priv noise : @audio.AudioBuffer
  priv mut track_url : String
  priv mut requested_track : String?
  priv track : MusicTrack
}

///|
extern "js" fn sample_rate(ctx : @audio.AudioContext) -> Double = "ctx=>ctx.sampleRate"

///|
extern "js" fn mono_buffer(
  ctx : @audio.AudioContext,
  length : Int32,
  rate : Double,
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
fn MusicTrack::to_js(self : MusicTrack) -> @core.JsValue = "%identity"

///|
extern "js" fn wave_shaper(
  ctx : @audio.AudioContext,
  curve : FixedArray[Float],
) -> @audio.AudioNode = "(ctx,curve)=>{const node=ctx.createWaveShaper();node.curve=new Float32Array(curve);return node}"

///|
pub fn create_audio(volume : Double) -> Audio {
  let ctx = @audio.AudioContext::get_context()
  // Allow four times full scale at the summing input. Ordinary samples pass
  // through at unity; only peaks above the knee approach the 0.90 ceiling.
  let input = ctx.create_gain()
  set_audio_value(input.gain(), 0.25)
  let curve = FixedArray::makei(1025, fn(i) {
    let x = (i - 512).to_double() / 128
    let excess = x.abs() - 0.65
    let y = if excess <= 0 {
      x
    } else {
      let peak = 0.65 + excess / (1 + excess / 0.25)
      if x < 0 {
        -peak
      } else {
        peak
      }
    }
    Float::from_double(y)
  })
  let limiter = wave_shaper(ctx, curve)
  let master = ctx.create_gain()
  set_audio_value(master.gain(), volume)
  let mix = input.as_node()
  mix.connect(limiter)
  limiter.connect(master.as_node())
  master.as_node().connect(ctx.destination())
  let rate = sample_rate(ctx)
  let noise = mono_buffer(ctx, (rate * 2).to_int(), rate)
  let data = samples(noise)
  for i in 0..<data.length() {
    data[i] = Float::from_double(@three_math.rand_float(-1, 1))
  }
  let track = MusicTrack::new()
  track.set_loop(true)
  ctx.create_media_element_source(track.to_js()).connect(mix)
  {
    ctx,
    mix,
    master,
    volume,
    noise,
    track,
    track_url: "",
    requested_track: None,
  }
}

///|
#external
priv type Oscillator

///|
#external
priv type Filter

///|
#external
priv type Pan

///|
extern "js" fn oscillator(ctx : @audio.AudioContext) -> Oscillator = "c=>c.createOscillator()"

///|
extern "js" fn stereo(ctx : @audio.AudioContext) -> Pan = "c=>c.createStereoPanner()"

///|
extern "js" fn biquad(ctx : @audio.AudioContext) -> Filter = "c=>c.createBiquadFilter()"

///|
fn Oscillator::node(self : Oscillator) -> @audio.AudioNode = "%identity"

///|
fn Filter::node(self : Filter) -> @audio.AudioNode = "%identity"

///|
fn Pan::node(self : Pan) -> @audio.AudioNode = "%identity"

///|
extern "js" fn Oscillator::set_wave(self : Oscillator, wave : String) -> Unit = "(n,v)=>{n.type=v}"

///|
extern "js" fn Filter::set_kind(self : Filter, kind : String) -> Unit = "(n,v)=>{n.type=v}"

///|
extern "js" fn Filter::cutoff(self : Filter) -> @audio.AudioParam = "n=>n.frequency"

///|
extern "js" fn Pan::position(self : Pan) -> @audio.AudioParam = "n=>n.pan"

///|
extern "js" fn Filter::resonance(self : Filter) -> @audio.AudioParam = "n=>n.Q"

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
extern "js" fn Oscillator::pitch(self : Oscillator) -> @audio.AudioParam = "n=>n.frequency"

///|
extern "js" fn Oscillator::start(self : Oscillator, at : Double) -> Unit = "(n,t)=>n.start(t)"

///|
extern "js" fn Oscillator::stop(self : Oscillator, at : Double) -> Unit = "(n,t)=>n.stop(t)"

///|
extern "js" fn Oscillator::on_end(
  self : Oscillator,
  callback : () -> Unit,
) -> Unit = "(n,cb)=>{n.onended=cb}"

///|
priv enum SoundSource {
  Sample(@audio.AudioBufferSourceNode)
  Synth(Oscillator)
}

///|
fn SoundSource::node(self : SoundSource) -> @audio.AudioNode {
  match self {
    Sample(node) => node.as_node()
    Synth(node) => node.node()
  }
}

///|
fn SoundSource::schedule(
  self : SoundSource,
  start : Double,
  stop : Double,
  on_end : () -> Unit,
) -> Unit {
  match self {
    Sample(node) => {
      node.set_onended(on_end)
      node.start(start, @three_math.rand_float(0, 1.5))
      node.stop(when_=stop)
    }
    Synth(node) => {
      node.on_end(on_end)
      node.start(start)
      node.stop(stop)
    }
  }
}

///|
#derive(@debug.Debug, @json.FromJson(style="flat", rename_cases="lowercase"))
pub(all) enum Waveform {
  Sine
  Sawtooth
  Square
  Triangle
}

///|
fn Waveform::web_name(self : Waveform) -> String {
  match self {
    Sine => "sine"
    Sawtooth => "sawtooth"
    Square => "square"
    Triangle => "triangle"
  }
}

///|
#derive(@debug.Debug, @json.FromJson(style="flat", rename_cases="lowercase"))
pub(all) enum FilterKind {
  Lowpass
  Highpass
  Bandpass
  Lowshelf
  Highshelf
  Peaking
  Notch
  Allpass
}

///|
fn FilterKind::web_name(self : FilterKind) -> String {
  match self {
    Lowpass => "lowpass"
    Highpass => "highpass"
    Bandpass => "bandpass"
    Lowshelf => "lowshelf"
    Highshelf => "highshelf"
    Peaking => "peaking"
    Notch => "notch"
    Allpass => "allpass"
  }
}

///|
pub(all) enum VoiceSource {
  Noise
  Tone(wave~ : Waveform, from_hz~ : Double, to_hz~ : Double)
}

///|
pub(all) struct Voice {
  source : VoiceSource
  duration : Double
  gain : Double
  delay : Double
  attack : Double
  hold : Double
  filter : (FilterKind, Double)?
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
  let source : SoundSource = match voice.source {
    Noise => {
      let node = ctx.create_buffer_source()
      node.set_buffer(Some(self.noise))
      node.set_loop(true)
      Sample(node)
    }
    Tone(wave~, from_hz~, to_hz~) => {
      let node = oscillator(ctx)
      node.set_wave(wave.web_name())
      let pitch = node.pitch()
      set_at(pitch, from_hz, at)
      exp_at(pitch, to_hz.max(20), at + duration)
      Synth(node)
    }
  }
  let output = source.node()
  let envelope = ctx.create_gain()
  let panner = stereo(ctx)
  set_audio_value(panner.position(), pan)
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
    n.set_kind(filter.web_name())
    set_audio_value(n.cutoff(), cutoff)
    set_audio_value(n.resonance(), 0.65)
    let node = n.node()
    output.connect(node)
    node.connect(envelope.as_node())
    Some(node)
  } else {
    output.connect(envelope.as_node())
    None
  }
  let mix = panner.node()
  envelope.as_node().connect(mix)
  mix.connect(self.mix)
  source.schedule(at, at + duration + 0.012, fn() {
    match effect {
      Some(n) => {
        output.disconnect(n)
        n.disconnect(envelope.as_node())
      }
      None => output.disconnect(envelope.as_node())
    }
    envelope.as_node().disconnect(mix)
    mix.disconnect(self.mix)
  })
}

///|
extern "js" fn pause_track(track : MusicTrack) -> Unit = "m=>m.pause()"

///|
extern "js" fn play_track(track : MusicTrack) -> @js_async.Promise[Unit] = "m=>m.play()"

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
  if self.track_url != url {
    self.requested_track = None
    self.track_url = url
    track.set_src(url)
  }
  if restart {
    track.seek(0)
  }
  track.set_volume(volume)
  if paused {
    self.requested_track = None
    if !track.is_paused() {
      pause_track(track)
    }
  } else if !track.is_paused() {
    self.requested_track = None
  } else if self.requested_track != Some(url) {
    self.requested_track = Some(url)
    optional_action(play_track(track))
  }
}

///|
pub fn audio_volume(audio : Audio, volume : Double) -> Unit {
  if audio.volume != volume {
    audio.volume = volume
    audio.master
    .gain()
    .set_target_at_time(volume, audio.ctx.current_time(), 0.1)
  }
}

///|
extern "js" fn resume_context(
  ctx : @audio.AudioContext,
) -> @js_async.Promise[Unit] = "ctx=>ctx.resume()"

///|
pub fn audio_resume(audio : Audio) -> Unit {
  audio.requested_track = None
  optional_action(resume_context(audio.ctx))
}
