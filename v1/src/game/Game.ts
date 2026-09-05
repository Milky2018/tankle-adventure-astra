import { AudioSystem } from './audio';
import { Input } from './input';
import { NEW_PROGRESS, clearProgress, loadProgress } from './save';
import { UI } from './ui';
import { World, type WorldSnapshot } from './world';

type Screen = 'title' | 'playing' | 'paused' | 'settings' | 'complete';

export class Game {
  #world: World | null = null;
  #input: Input;
  #audio = new AudioSystem();
  #ui = new UI();
  #screen: Screen = 'title';
  #settingsReturn: Screen = 'title';
  #lastTime = performance.now();
  #snapshot: WorldSnapshot | null = null;
  #endingTimer = 0;
  #mapOpen = false;
  #frame = 0;

  constructor(private readonly viewport: HTMLElement) {
    this.#input = new Input(viewport);
    this.#bindSystemUI();
    this.#ui.buildKeyBindings(this.#input);
    this.#refreshContinue();
    this.#showScreen('title');
  }

  start(): void {
    this.#frame = requestAnimationFrame(this.#loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.#frame);
    this.#world?.destroy();
    this.#input.destroy();
  }

  #startGame(continueGame: boolean): void {
    if (!continueGame) clearProgress();
    const progress = continueGame ? loadProgress() ?? structuredClone(NEW_PROGRESS) : structuredClone(NEW_PROGRESS);
    this.#world?.destroy();
    this.#world = new World(this.viewport, progress, this.#audio);
    this.#snapshot = this.#world.snapshot();
    this.#input.enabled = true;
    this.#audio.resume();
    this.#showScreen('playing');
  }

  #loop = (now: number): void => {
    const delta = Math.min((now - this.#lastTime) / 1000, 0.05);
    this.#lastTime = now;
    if (this.#world && (this.#screen === 'playing' || this.#endingTimer > 0) && !this.#mapOpen) {
      this.#snapshot = this.#world.tick(delta, this.#input);
      this.#ui.update(this.#snapshot, delta, this.#input.formatBinding('interact'));
      if (this.#snapshot.completed && this.#endingTimer <= 0) this.#endingTimer = 3;
      if (this.#endingTimer > 0) {
        this.#endingTimer -= delta;
        document.body.classList.add('ending');
        if (this.#endingTimer <= 0) {
          document.body.classList.remove('ending');
          this.#showScreen('complete');
          this.#input.enabled = false;
        }
      }
    }
    this.#frame = requestAnimationFrame(this.#loop);
  };

  #bindSystemUI(): void {
    required<HTMLButtonElement>('#start-button').addEventListener('click', () => this.#startGame(false));
    required<HTMLButtonElement>('#continue-button').addEventListener('click', () => this.#startGame(true));
    required<HTMLButtonElement>('#resume-button').addEventListener('click', () => {
      this.#showScreen('playing');
      this.#input.enabled = true;
    });
    required<HTMLButtonElement>('#restart-button').addEventListener('click', () => {
      this.#world?.respawn();
      this.#showScreen('playing');
      this.#input.enabled = true;
    });
    required<HTMLButtonElement>('#title-button').addEventListener('click', () => this.#returnToTitle());
    required<HTMLButtonElement>('#completion-title').addEventListener('click', () => this.#returnToTitle());
    required<HTMLButtonElement>('#completion-restart').addEventListener('click', () => this.#startGame(false));

    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-open-settings]')) {
      button.addEventListener('click', () => {
        this.#settingsReturn = this.#screen;
        this.#showScreen('settings');
        this.#input.enabled = false;
      });
    }
    required<HTMLButtonElement>('#settings-back').addEventListener('click', () => {
      this.#showScreen(this.#settingsReturn);
      this.#input.enabled = this.#settingsReturn === 'playing';
    });

    const volume = required<HTMLInputElement>('#volume-setting');
    volume.value = localStorage.getItem('rejected-prototype-volume') ?? '0.7';
    this.#audio.setVolume(Number(volume.value));
    volume.addEventListener('input', () => {
      this.#audio.setVolume(Number(volume.value));
      localStorage.setItem('rejected-prototype-volume', volume.value);
    });
    addEventListener('keydown', (event) => {
      if (event.code === this.#input.bindings.map && this.#screen === 'playing' && this.#endingTimer <= 0) {
        event.preventDefault();
        this.#setMapOpen(!this.#mapOpen);
        return;
      }
      if (event.code !== 'Escape') return;
      if (this.#mapOpen) {
        this.#setMapOpen(false);
      } else if (this.#screen === 'playing') {
        this.#showScreen('paused');
        this.#input.enabled = false;
      } else if (this.#screen === 'paused') {
        this.#showScreen('playing');
        this.#input.enabled = true;
      }
    });
  }

  #showScreen(screen: Screen): void {
    this.#screen = screen;
    const mapping: Record<Exclude<Screen, 'playing'>, string> = {
      title: '#title-screen',
      paused: '#pause-screen',
      settings: '#settings-screen',
      complete: '#completion-screen',
    };
    for (const [id, selector] of Object.entries(mapping)) {
      required<HTMLElement>(selector).classList.toggle('hidden', id !== screen);
    }
    this.#ui.visible = screen === 'playing';
    if (screen !== 'playing') this.#setMapOpen(false);
  }

  #returnToTitle(): void {
    this.#world?.destroy();
    this.#world = null;
    this.#snapshot = null;
    this.#input.enabled = false;
    this.#refreshContinue();
    this.#showScreen('title');
  }

  #refreshContinue(): void {
    required<HTMLButtonElement>('#continue-button').classList.toggle('hidden', !loadProgress());
  }

  #setMapOpen(value: boolean): void {
    this.#mapOpen = value;
    this.#ui.setMapVisible(value, this.#snapshot ?? undefined);
    this.#input.enabled = this.#screen === 'playing' && !value;
  }
}

function required<T extends Element>(selector: string): T {
  const value = document.querySelector<T>(selector);
  if (!value) throw new Error(`Missing required element: ${selector}`);
  return value;
}
