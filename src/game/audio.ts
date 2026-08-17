export class AudioSystem {
  volume = 0.7;

  #context: AudioContext | null = null;
  #master: GainNode | null = null;
  #beatTimer = 0;
  #beatIndex = 0;

  resume(): void {
    const context = this.#getContext();
    if (context.state === 'suspended') void context.resume();
  }

  setVolume(value: number): void {
    this.volume = value;
    if (this.#master) this.#master.gain.setTargetAtTime(value, this.#master.context.currentTime, 0.03);
  }

  update(delta: number, intensity: number): void {
    if (!this.#context || this.volume <= 0) return;
    this.#beatTimer -= delta;
    if (this.#beatTimer > 0) return;
    this.#beatTimer = 0.48 - intensity * 0.13;
    const notes = [55, 65.4, 73.4, 65.4];
    this.tone(notes[this.#beatIndex % notes.length] ?? 55, 0.055, 0.012, 'triangle');
    if (this.#beatIndex % 2 === 0) this.tone(110, 0.025, 0.008, 'square');
    this.#beatIndex += 1;
  }

  shoot(): void {
    this.noise(0.09, 0.065);
    this.tone(72, 0.12, 0.045, 'sawtooth', 42);
  }

  impact(): void {
    this.noise(0.055, 0.035);
    this.tone(145, 0.05, 0.018, 'square', 75);
  }

  hurt(): void {
    this.tone(48, 0.22, 0.06, 'sawtooth', 31);
  }

  overheat(): void {
    this.tone(210, 0.28, 0.025, 'square', 70);
  }

  activate(): void {
    this.tone(220, 0.12, 0.025, 'sine', 440);
    setTimeout(() => this.tone(330, 0.16, 0.02, 'sine', 660), 90);
  }

  explosion(): void {
    this.noise(0.3, 0.09);
    this.tone(52, 0.32, 0.07, 'sawtooth', 22);
  }

  tone(
    startFrequency: number,
    duration: number,
    gain: number,
    type: OscillatorType,
    endFrequency = startFrequency,
  ): void {
    const context = this.#getContext();
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), context.currentTime + duration);
    envelope.gain.setValueAtTime(gain, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(envelope).connect(this.#master!);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  noise(duration: number, gain: number): void {
    const context = this.#getContext();
    const count = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, count, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < count; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const envelope = context.createGain();
    source.buffer = buffer;
    envelope.gain.setValueAtTime(gain, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.connect(envelope).connect(this.#master!);
    source.start();
  }

  #getContext(): AudioContext {
    if (this.#context && this.#master) return this.#context;
    this.#context = new AudioContext();
    this.#master = this.#context.createGain();
    this.#master.gain.value = this.volume;
    this.#master.connect(this.#context.destination);
    return this.#context;
  }
}
