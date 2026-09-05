import type { Action, BindingMap } from './types';

const DEFAULT_BINDINGS: BindingMap = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  overdrive: 'ShiftLeft',
  map: 'Tab',
  interact: 'KeyE',
};

const STORAGE_KEY = 'rejected-prototype-bindings';

export class Input {
  readonly bindings: BindingMap;

  #keys = new Set<string>();
  #pressed = new Set<string>();
  #pointerX = innerWidth / 2;
  #pointerY = innerHeight / 2;
  #shotRequested = false;
  #enabled = false;

  constructor(private readonly target: HTMLElement) {
    this.bindings = this.#loadBindings();
    addEventListener('keydown', this.#onKeyDown, { passive: false });
    addEventListener('keyup', this.#onKeyUp);
    addEventListener('blur', this.#clear);
    addEventListener('mousemove', this.#onMouseMove);
    target.addEventListener('mousedown', this.#onMouseDown);
    target.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  set enabled(value: boolean) {
    this.#enabled = value;
    if (!value) this.#clear();
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  down(action: Action): boolean {
    return this.#enabled && this.#keys.has(this.bindings[action]);
  }

  pressed(action: Action): boolean {
    const code = this.bindings[action];
    if (!this.#enabled || !this.#pressed.has(code)) return false;
    this.#pressed.delete(code);
    return true;
  }

  pressedCode(code: string): boolean {
    if (!this.#enabled || !this.#pressed.has(code)) return false;
    this.#pressed.delete(code);
    return true;
  }

  get pointer(): Readonly<{ x: number; y: number }> {
    return { x: this.#pointerX, y: this.#pointerY };
  }

  consumeShot(): boolean {
    if (!this.#enabled || !this.#shotRequested) return false;
    this.#shotRequested = false;
    return true;
  }

  bind(action: Action, code: string): void {
    for (const [otherAction, otherCode] of Object.entries(this.bindings)) {
      if (otherCode === code) this.bindings[otherAction as Action] = this.bindings[action];
    }
    this.bindings[action] = code;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings));
  }

  formatBinding(action: Action): string {
    return this.bindings[action]
      .replace('Key', '')
      .replace('Digit', '')
      .replace('ShiftLeft', 'SHIFT')
      .replace('ShiftRight', 'SHIFT')
      .replace('Arrow', '');
  }

  destroy(): void {
    removeEventListener('keydown', this.#onKeyDown);
    removeEventListener('keyup', this.#onKeyUp);
    removeEventListener('blur', this.#clear);
    removeEventListener('mousemove', this.#onMouseMove);
    this.target.removeEventListener('mousedown', this.#onMouseDown);
  }

  #loadBindings(): BindingMap {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_BINDINGS, ...JSON.parse(stored) as Partial<BindingMap> } : { ...DEFAULT_BINDINGS };
    } catch {
      return { ...DEFAULT_BINDINGS };
    }
  }

  #onKeyDown = (event: KeyboardEvent): void => {
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) this.#pressed.add(event.code);
    this.#keys.add(event.code);
  };

  #onKeyUp = (event: KeyboardEvent): void => {
    this.#keys.delete(event.code);
  };

  #onMouseMove = (event: MouseEvent): void => {
    this.#pointerX = event.clientX;
    this.#pointerY = event.clientY;
  };

  #onMouseDown = (event: MouseEvent): void => {
    if (this.#enabled && event.button === 0) this.#shotRequested = true;
  };

  #clear = (): void => {
    this.#keys.clear();
    this.#pressed.clear();
    this.#shotRequested = false;
  };
}
