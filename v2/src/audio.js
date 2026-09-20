import { clamp, OVERDRIVE_MAX_SPEED } from './mechanics.js';
import { SoundEffects, MechanicalEngine, spatialSound } from './sound-effects.js';
import { Soundtrack } from './soundtrack.js';

export class FactoryAudio {
  constructor() {
    this.ctx = null;
    this.volume = 0.55;
    this.music = true;
    this.sfx = true;
  }
  start() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: 44100 });
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume * 0.4;
      this.master.connect(this.ctx.destination);
      this.score = new Soundtrack(this.ctx, this.master);
      this.effects = new SoundEffects(this.ctx, this.master);
      this.drive = new MechanicalEngine(this.ctx, this.effects.output, this.effects.noiseBuffer);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  tone(freq, duration = 0.15, type = 'sine', gain = 0.2, slide = 0, pan = 0) {
    this.effects?.tone(freq, duration, type, gain, slide, pan);
  }
  noise(duration = 0.2, gain = 0.2, pan = 0) {
    this.effects?.noise(duration, gain, pan);
  }
  event(name, location = 0) {
    if (!this.ctx) return;
    if (['warn', 'heat', 'unlock', 'boss-lock', 'hurt'].includes(name))
      this.duckUntil = this.ctx.currentTime + 1.2;
    if (!this.sfx) return;
    const spatial =
      typeof location === 'number'
        ? { pan: location }
        : location.position && this.listener
          ? spatialSound(location.position, this.listener)
          : {};
    // Active threat cues stay legible at range; launch/impact sounds keep full falloff.
    if (['warn', 'boss-lock', 'clamp-warn', 'press-warn'].includes(name) && spatial.gain > 0)
      spatial.gain = Math.max(0.6, spatial.gain);
    this.effects?.play(name, spatial);
  }
  environment(time, p, region, state, yaw) {
    this.listener = { x: p.x, y: p.y || 0, z: p.z, yaw };
    if (!this.ctx || !this.sfx) return;
    this.environmentBeats ??= {};
    const source = (key, x, y, z, period, sound) => {
      const distance = Math.hypot(p.x - x, (p.y - y) * 1.5, p.z - z);
      if (distance > 48) return;
      const beat = Math.floor(time / period);
      if (this.environmentBeats[key] === beat) return;
      this.environmentBeats[key] = beat;
      const gain = Math.max(0, 1 - distance / 48) * 0.045,
        pan = Math.max(
          -1,
          Math.min(1, (-(x - p.x) * Math.cos(yaw) + (z - p.z) * Math.sin(yaw)) / 24),
        );
      sound(gain, pan, beat);
    };
    if (!state.foundry)
      source('press', -46, -8, 40, Math.PI / 0.75, (g, pan) => {
        this.tone(48, 0.6, 'triangle', g, -20, pan);
        this.noise(0.13, g * 0.5, pan);
      });
    source('carrier', 0, 5, 10, 3, (g, pan, n) => {
      this.tone(n % 6 === 2 ? 310 : 82, 0.65, 'triangle', g * 0.6, -12, pan);
      this.noise(0.1, g * 0.3, pan);
    });
    source('garden-pump', 75, -8, -28, state.pump ? 1.4 : 3.7, (g, pan, n) => {
      this.tone(state.pump ? 73 : 61 + (n % 2) * 9, 0.9, 'sine', g, 0, pan);
      if (!state.pump) this.noise(0.06, g * 0.25, pan);
    });
    source('drip', 44, -16, 5, 2.7, (g, pan, n) =>
      this.tone(740 + (n % 3) * 120, 0.24, 'sine', g * 0.3, -290, pan),
    );
    source('test-rig', 80, 16, -87, 3.2, (g, pan) => {
      this.tone(97, 0.7, 'triangle', g * 0.5, 15, pan);
      this.tone(196, 0.8, 'sine', g * 0.2, 0, pan);
    });
    source('signal', 204, 40, 146, 9, (g, pan) => {
      if (state.signal) {
        this.tone(660, 0.6, 'sine', g * 0.7, 0, pan);
        this.tone(990, 0.8, 'sine', g * 0.2, 0, pan);
      }
    });
    source('circulation', 226, -24, 130, state.rig ? 1.2 : 2.9, (g, pan, n) => {
      this.tone(state.rig ? 58 : 52 + (n % 2) * 13, 0.9, 'sine', g, 0, pan);
      if (!state.rig) this.noise(0.2, g * 0.25, pan);
    });
    source('furnace', 0, -56, -8, state.endingSeen ? 1.8 : 3.6, (g, pan) => {
      this.tone(38, 1.8, 'sine', g, 0, pan);
      this.noise(0.9, g * 0.12, pan);
    });
    if (region === 'furnace' && !state.keeper)
      source('feed', 0, -56, 30, 2.2, (g, pan) => this.tone(63, 0.3, 'triangle', g, -16, pan));
  }
  update(time, p, combat, area, paused, moving = false, musicState = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const boost = clamp((p.speed - 1) / (OVERDRIVE_MAX_SPEED - 1), 0, 1),
      phoenixBoost = clamp((p.speed - OVERDRIVE_MAX_SPEED) / OVERDRIVE_MAX_SPEED, 0, 1);
    const coupling = p.endingTime > 0 && p.endingTime < 9;
    const running = this.sfx && !paused && p.hp > 0 && (coupling || moving || boost > 0);
    this.master.gain.setTargetAtTime(this.volume * 0.4, t, 0.15);
    this.effects.setEnabled(this.sfx && !paused);
    this.drive.update(
      coupling
        ? 65 - Math.min(1, p.endingTime / 6) * 27
        : (p.afloat ? 48 : 65) + boost * 100 + phoenixBoost * 85 + p.heat * 0.2,
      250 + boost * 350 + phoenixBoost * 250,
      running
        ? coupling
          ? 0.06 * (1 - Math.max(0, p.endingTime - 6) / 3)
          : 0.075 + boost * 0.105 + phoenixBoost * 0.065
        : 0,
    );
    this.score.update({
      area,
      combat,
      paused,
      dead: p.hp <= 0,
      enabled: this.music,
      phoenix: !!p.phoenix,
      endingTime: p.endingTime || 0,
      duck: t < this.duckUntil,
      ...musicState,
    });
  }
}
