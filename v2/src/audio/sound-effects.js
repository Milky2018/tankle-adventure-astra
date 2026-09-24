// All timings are in seconds. The same synthesis renders the game and A/B previews.
const tone = (frequency, end, duration, gain, extra = {}) => ({
  frequency,
  end,
  duration,
  gain,
  ...extra,
});
const noise = (cutoff, duration, gain, extra = {}) => ({
  noise: true,
  cutoff,
  duration,
  gain,
  ...extra,
});
const metal = (frequency, gain, delay = 0) => [
  tone(frequency, frequency * 0.96, 0.22, gain, { delay }),
  tone(frequency * 1.483, frequency * 1.47, 0.13, gain * 0.36, { delay }),
  noise(3200, 0.025, gain * 0.55, { delay, filter: 'highpass' }),
];

export const SOUND_EFFECTS = {
  'sonar-lock': [0, 0.3, 0.6].map((delay) => tone(880, 880, 0.13, 0.1, { delay, attack: 0.015 })),
  'pump-warn': [0, 0.28].map((delay) =>
    tone(330, 440, 0.22, 0.12, { delay, type: 'triangle', attack: 0.03 }),
  ),
  'pump-run': [
    tone(85, 140, 0.45, 0.15, { type: 'triangle', attack: 0.08, hold: 0.1 }),
    noise(450, 0.45, 0.09, { attack: 0.08, hold: 0.1, filter: 'bandpass' }),
  ],
  'torpedo-shot': [
    noise(800, 0.28, 0.2, { attack: 0.015 }),
    tone(180, 90, 0.32, 0.12, { type: 'triangle' }),
  ],
  shot: [
    noise(4300, 0.055, 0.47, { attack: 0.001 }),
    tone(155, 57, 0.3, 0.48, { hold: 0.045, type: 'triangle', cutoff: 760 }),
    noise(520, 0.27, 0.28, { hold: 0.025 }),
    ...metal(780, 0.09, 0.095),
    noise(2200, 0.045, 0.065, { delay: 0.23, filter: 'bandpass' }),
  ],
  mortar: [
    noise(1900, 0.09, 0.44),
    tone(104, 38, 0.48, 0.53, { hold: 0.07 }),
    noise(380, 0.5, 0.32),
    tone(420, 180, 0.36, 0.07, { delay: 0.075, attack: 0.04 }),
    ...metal(460, 0.075, 0.22),
  ],
  laser: [
    tone(210, 214, 0.19, 0.12, { type: 'sawtooth', cutoff: 1050, attack: 0.018, hold: 0.08 }),
    tone(845, 855, 0.19, 0.045, { attack: 0.015, hold: 0.09 }),
    noise(2600, 0.18, 0.055, { filter: 'bandpass', attack: 0.02, hold: 0.07 }),
  ],
  magnet: [
    tone(82, 110, 0.78, 0.17, { type: 'triangle', attack: 0.045, hold: 0.35 }),
    tone(164, 219, 0.76, 0.06, { attack: 0.06, hold: 0.3 }),
    tone(490, 330, 0.6, 0.04, { attack: 0.025 }),
    noise(650, 0.7, 0.085, { filter: 'bandpass', attack: 0.06, hold: 0.25 }),
  ],
  'magnet-pull': [
    tone(74, 82, 0.78, 0.22, { type: 'triangle', attack: 0.035, hold: 0.32 }),
    tone(150, 166, 0.72, 0.08, { type: 'sawtooth', cutoff: 660, attack: 0.05, hold: 0.27 }),
    noise(920, 0.68, 0.11, { filter: 'bandpass', attack: 0.025, hold: 0.24 }),
    ...metal(420, 0.035, 0.08),
  ],
  'welder-shot': [
    noise(4800, 0.045, 0.2),
    tone(620, 230, 0.14, 0.2, { type: 'square', cutoff: 2000 }),
    ...metal(1430, 0.045, 0.035),
  ],
  'guard-shot': [
    noise(2500, 0.09, 0.3),
    tone(123, 46, 0.38, 0.34, { type: 'triangle', hold: 0.04 }),
    ...metal(590, 0.07, 0.15),
  ],
  'foundry-shot': [
    noise(3400, 0.12, 0.42),
    tone(82, 31, 0.7, 0.52, { hold: 0.075 }),
    tone(165, 84, 0.35, 0.15, { type: 'triangle' }),
    noise(430, 0.64, 0.35),
    ...metal(350, 0.07, 0.26),
  ],
  'rail-shot': [
    noise(7800, 0.032, 0.38, { filter: 'highpass', attack: 0.001 }),
    tone(1750, 290, 0.16, 0.18, { type: 'triangle' }),
    noise(2200, 0.22, 0.13, { filter: 'bandpass' }),
    ...metal(2400, 0.05, 0.07),
  ],
  'seeker-shot': [
    noise(1500, 0.36, 0.24, { attack: 0.015, hold: 0.04 }),
    tone(160, 380, 0.42, 0.19, { type: 'sawtooth', cutoff: 850, attack: 0.025 }),
    noise(3600, 0.13, 0.12),
  ],
  hit: [
    noise(3400, 0.05, 0.21),
    tone(240, 100, 0.14, 0.16, { type: 'triangle' }),
    ...metal(710, 0.09),
  ],
  hurt: [
    noise(700, 0.25, 0.28, { hold: 0.025 }),
    tone(76, 43, 0.38, 0.34, { hold: 0.04 }),
    ...metal(285, 0.15, 0.03),
  ],
  armor: [
    noise(5400, 0.035, 0.19, { filter: 'highpass' }),
    ...metal(1380, 0.2),
    tone(2800, 1250, 0.22, 0.07, { delay: 0.02 }),
  ],
  explode: [
    noise(2600, 0.13, 0.46),
    tone(92, 27, 0.95, 0.55, { hold: 0.065 }),
    noise(420, 1.05, 0.4, { hold: 0.04 }),
    noise(1800, 0.5, 0.13, { delay: 0.08, filter: 'bandpass' }),
    ...metal(510, 0.055, 0.2),
    ...metal(890, 0.035, 0.34),
  ],
  ram: [
    noise(1600, 0.14, 0.36),
    tone(108, 39, 0.42, 0.43, { type: 'triangle', hold: 0.04 }),
    ...metal(420, 0.13, 0.015),
    noise(2700, 0.24, 0.14, { delay: 0.05, filter: 'bandpass' }),
  ],
  crate: [
    noise(2400, 0.15, 0.28),
    tone(145, 59, 0.24, 0.24, { type: 'triangle' }),
    ...metal(620, 0.08, 0.06),
    ...metal(940, 0.045, 0.14),
  ],
  lever: [
    ...metal(540, 0.15),
    tone(88, 63, 0.16, 0.17, { type: 'triangle' }),
    noise(1200, 0.1, 0.1, { delay: 0.075 }),
    ...metal(880, 0.075, 0.14),
  ],
  blocked: [0, 0.16].map((delay) =>
    tone(330, 330, 0.11, 0.14, { delay, type: 'triangle', attack: 0.008, hold: 0.05 }),
  ),
  flotation: [
    noise(1100, 0.55, 0.17, { attack: 0.08, hold: 0.13 }),
    tone(110, 240, 0.58, 0.12, { type: 'triangle', attack: 0.05 }),
    ...metal(690, 0.09, 0.36),
    tone(470, 470, 0.26, 0.075, { delay: 0.49 }),
  ],
  fuse: [
    noise(2300, 0.7, 0.13, { filter: 'bandpass', attack: 0.08, hold: 0.3 }),
    tone(165, 540, 0.8, 0.12, { type: 'sawtooth', cutoff: 1300, attack: 0.08, hold: 0.15 }),
    ...metal(1100, 0.07, 0.56),
  ],
  vent: [
    noise(1500, 0.8, 0.17, { filter: 'bandpass', attack: 0.05, hold: 0.2 }),
    noise(4500, 0.45, 0.06, { filter: 'highpass', attack: 0.03 }),
    ...metal(360, 0.045, 0.04),
  ],
  crusher: [
    noise(700, 0.24, 0.22),
    tone(53, 29, 0.62, 0.28, { hold: 0.05 }),
    ...metal(220, 0.065, 0.1),
  ],
  // Alerts speak in pitch and rhythm: no blast noise, sub drops or metal strikes.
  'clamp-warn': [0, 0.22, 0.44].map((delay) =>
    tone(1040, 1040, 0.13, 0.18, { delay, type: 'triangle', attack: 0.008, hold: 0.06 }),
  ),
  'boss-lock': [
    ...[0, 0.17, 0.3].map((delay) =>
      tone(880, 880, 0.075, 0.19, {
        delay,
        type: 'square',
        cutoff: 2200,
        attack: 0.006,
        hold: 0.035,
      }),
    ),
    tone(1320, 1320, 0.24, 0.16, { delay: 0.42, type: 'triangle', attack: 0.008, hold: 0.12 }),
  ],
  'press-warn': [0, 0.42].flatMap((delay) => [
    tone(740, 740, 0.18, 0.17, { delay, type: 'square', cutoff: 1600, attack: 0.015, hold: 0.085 }),
    tone(554, 554, 0.18, 0.17, {
      delay: delay + 0.21,
      type: 'square',
      cutoff: 1600,
      attack: 0.015,
      hold: 0.085,
    }),
  ]),
  warn: [
    tone(760, 1140, 0.085, 0.18, { type: 'triangle', attack: 0.006, hold: 0.025 }),
    tone(1140, 1140, 0.22, 0.15, { delay: 0.085, attack: 0.006, hold: 0.1 }),
    tone(1520, 1520, 0.18, 0.045, { delay: 0.085, attack: 0.008, hold: 0.08 }),
  ],
  heat: [0, 0.27, 0.54].flatMap((delay) => [
    tone(960, 960, 0.11, 0.16, { delay, type: 'triangle', attack: 0.008, hold: 0.05 }),
    tone(720, 720, 0.11, 0.14, {
      delay: delay + 0.125,
      type: 'triangle',
      attack: 0.008,
      hold: 0.05,
    }),
  ]),
  ready: [
    tone(660, 660, 0.2, 0.09),
    tone(990, 990, 0.3, 0.095, { delay: 0.1 }),
    ...metal(1320, 0.035, 0.13),
  ],
  repair: [
    noise(800, 0.8, 0.1, { attack: 0.08, hold: 0.2 }),
    ...[220, 330, 440].map((frequency, i) =>
      tone(frequency, frequency, 0.55, 0.11, { delay: i * 0.2, attack: 0.015 }),
    ),
    ...metal(760, 0.05, 0.64),
  ],
  unlock: [
    ...[330, 495, 660, 990].map((frequency, i) =>
      tone(frequency, frequency, 0.75, 0.1, { delay: i * 0.12, attack: 0.008 }),
    ),
    ...metal(1485, 0.06, 0.4),
    noise(3100, 0.4, 0.04, { delay: 0.28, filter: 'bandpass', attack: 0.09 }),
  ],
  couple: [
    ...metal(270, 0.14),
    tone(64, 38, 3.5, 0.13, { type: 'triangle', attack: 0.06, hold: 0.5 }),
    noise(620, 1.5, 0.12, { attack: 0.06, hold: 0.2 }),
    tone(190, 95, 2.8, 0.05, { delay: 0.18, attack: 0.09 }),
  ],
  death: [
    noise(2100, 0.2, 0.31),
    tone(120, 25, 1.7, 0.3, { type: 'sawtooth', cutoff: 480, hold: 0.06 }),
    noise(460, 1.3, 0.22),
    ...metal(520, 0.085, 0.19),
    ...metal(330, 0.06, 0.5),
    tone(430, 80, 0.8, 0.06, { delay: 0.27 }),
  ],
};

export function spatialSound(position, listener) {
  const dx = position.x - listener.x,
    dz = position.z - listener.z;
  const distance = Math.hypot(dx, ((position.y || 0) - listener.y) * 1.5, dz);
  return {
    gain: distance >= 110 ? 0 : 1 / (1 + (distance / 22) ** 2),
    pan: Math.max(
      -0.95,
      Math.min(
        0.95,
        (-dx * Math.cos(listener.yaw) + dz * Math.sin(listener.yaw)) /
          Math.max(12, Math.hypot(dx, dz)),
      ),
    ),
    cutoff: Math.max(1200, 16000 / (1 + distance / 16)),
  };
}

export class SoundEffects {
  constructor(ctx, destination, random = Math.random) {
    this.ctx = ctx;
    this.random = random;
    this.voices = new Set();
    this.output = ctx.createGain();
    // A dedicated bus lets mute/pause silence delayed layers as well as new events.
    this.output.gain.value = 1;
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -9;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.16;
    this.output.connect(this.compressor);
    this.compressor.connect(destination);
    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
    this.enabled = true;
  }

  setEnabled(value) {
    if (value === this.enabled) return;
    this.enabled = value;
    this.output.gain.setTargetAtTime(value ? 1 : 0, this.ctx.currentTime, 0.012);
    if (!value) for (const voice of [...this.voices]) voice.stop();
  }

  play(name, { when = this.ctx.currentTime, pan = 0, gain = 1, cutoff = 16000 } = {}) {
    if (!this.enabled || gain <= 0) return;
    const layers = SOUND_EFFECTS[name];
    if (!layers) return;
    // Layered salvos remain bounded. Oldest tails yield to the next attack cue.
    while (this.voices.size >= 32) this.voices.values().next().value.stop();
    const bus = this.ctx.createGain(),
      filter = this.ctx.createBiquadFilter(),
      panner = this.ctx.createStereoPanner();
    bus.gain.value = gain;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    bus.connect(filter);
    filter.connect(panner);
    panner.connect(this.output);
    const nodes = [],
      sources = [];
    const voice = {
      stop: () => {
        for (const source of sources) source.stop();
        cleanup();
      },
    };
    let remaining = layers.length;
    const cleanup = () => {
      if (!this.voices.delete(voice)) return;
      for (const node of nodes) node.disconnect();
      bus.disconnect();
      filter.disconnect();
      panner.disconnect();
    };
    this.voices.add(voice);
    // Only physical impacts/launches vary; ability loops and warning pitches stay stable.
    const vary = [
      'shot',
      'mortar',
      'welder-shot',
      'guard-shot',
      'foundry-shot',
      'rail-shot',
      'hit',
      'hurt',
      'armor',
      'explode',
      'ram',
      'crate',
    ].includes(name);
    const pitch = vary ? 0.975 + this.random() * 0.05 : 1;
    for (const layer of layers) {
      const made = this.layer(layer, bus, when + (layer.delay || 0), pitch);
      nodes.push(...made.nodes);
      sources.push(made.source);
      made.source.onended = () => {
        if (--remaining === 0) cleanup();
      };
    }
    return voice;
  }

  layer(layer, destination, when, pitch = 1) {
    const ctx = this.ctx,
      duration = layer.duration,
      gain = ctx.createGain();
    const source = layer.noise ? ctx.createBufferSource() : ctx.createOscillator();
    const nodes = [source, gain];
    if (layer.noise) {
      source.buffer = this.noiseBuffer;
      source.loop = true;
    } else {
      source.type = layer.type || 'sine';
      source.frequency.setValueAtTime(layer.frequency * pitch, when);
      source.frequency.exponentialRampToValueAtTime(
        Math.max(20, layer.end * pitch),
        when + duration,
      );
    }
    const attack = Math.min(layer.attack ?? 0.003, duration * 0.3);
    const hold = Math.min(layer.hold || 0, duration * 0.5);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(layer.gain, when + attack);
    gain.gain.setValueAtTime(layer.gain, when + attack + hold);
    gain.gain.exponentialRampToValueAtTime(
      layer.gain * 0.18,
      when + Math.max(attack + hold + 0.001, duration * 0.55),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    gain.gain.linearRampToValueAtTime(0, when + duration + 0.01);
    if (layer.cutoff) {
      const filter = ctx.createBiquadFilter();
      filter.type = layer.filter || 'lowpass';
      filter.frequency.value = layer.cutoff;
      filter.Q.value = 0.65;
      source.connect(filter);
      filter.connect(gain);
      nodes.push(filter);
    } else source.connect(gain);
    gain.connect(destination);
    if (layer.noise) source.start(when, this.random() * 1.5);
    else source.start(when);
    source.stop(when + duration + 0.012);
    return { source, nodes };
  }

  // Quiet, spatial machinery keeps its authored cadence and pitch, with soft edges.
  tone(frequency, duration, type, gain, slide, pan) {
    this.ambient(
      tone(frequency, Math.max(20, frequency + slide), duration, gain, {
        type,
        attack: 0.008,
        hold: duration * 0.08,
        cutoff: type === 'sawtooth' ? 1000 : 4000,
      }),
      pan,
    );
  }
  noise(duration, gain, pan) {
    this.ambient(noise(1500, duration, gain, { attack: 0.012, hold: duration * 0.12 }), pan);
  }
  ambient(layer, pan) {
    if (!this.enabled) return;
    while (this.voices.size >= 32) this.voices.values().next().value.stop();
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(this.output);
    const made = this.layer(layer, panner, this.ctx.currentTime);
    const voice = {
      stop: () => {
        made.source.stop();
        cleanup();
      },
    };
    const cleanup = () => {
      if (!this.voices.delete(voice)) return;
      for (const node of made.nodes) node.disconnect();
      panner.disconnect();
    };
    this.voices.add(voice);
    made.source.onended = cleanup;
  }
}

export class MechanicalEngine {
  constructor(ctx, destination, noiseBuffer) {
    this.ctx = ctx;
    this.body = ctx.createOscillator();
    this.body.type = 'triangle';
    this.body.frequency.value = 65;
    this.gear = ctx.createOscillator();
    this.gear.type = 'sawtooth';
    this.gear.frequency.value = 130;
    this.gearGain = ctx.createGain();
    this.gearGain.gain.value = 0.24;
    this.track = ctx.createBufferSource();
    this.track.buffer = noiseBuffer;
    this.track.loop = true;
    this.trackFilter = ctx.createBiquadFilter();
    this.trackFilter.type = 'bandpass';
    this.trackFilter.frequency.value = 820;
    this.trackFilter.Q.value = 0.8;
    this.trackGain = ctx.createGain();
    this.trackGain.gain.value = 0.12;
    this.pulse = ctx.createOscillator();
    this.pulse.frequency.value = 12;
    const pulseGain = ctx.createGain();
    pulseGain.gain.value = 0.065;
    this.pulse.connect(pulseGain);
    pulseGain.connect(this.trackGain.gain);
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.body.connect(this.filter);
    this.gear.connect(this.gearGain);
    this.gearGain.connect(this.filter);
    this.filter.connect(this.gain);
    this.track.connect(this.trackFilter);
    this.trackFilter.connect(this.trackGain);
    this.trackGain.connect(this.gain);
    this.gain.connect(destination);
    this.body.start();
    this.gear.start();
    this.track.start();
    this.pulse.start();
  }
  update(frequency, cutoff, gain) {
    const time = this.ctx.currentTime;
    this.body.frequency.setTargetAtTime(frequency, time, 0.12);
    this.gear.frequency.setTargetAtTime(frequency * 2.01, time, 0.12);
    this.pulse.frequency.setTargetAtTime(8 + frequency / 13, time, 0.12);
    this.filter.frequency.setTargetAtTime(cutoff, time, 0.12);
    this.gain.gain.setTargetAtTime(gain * 1.15, time, 0.1);
  }
}
