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
  sensitivity = 1;

  #keys = new Set<string>();
  #pressed = new Set<string>();
  #mouseX = 0;
  #mouseY = 0;
  #firing = false;
  #enabled = false;

  constructor(private readonly target: HTMLElement) {
    this.bindings = this.#loadBindings();
    addEventListener('keydown', this.#onKeyDown, { passive: false });
    addEventListener('keyup', this.#onKeyUp);
    addEventListener('blur', this.#clear);
    addEventListener('mousemove', this.#onMouseMove);
    target.addEventListener('mousedown', this.#onMouseDown);
    addEventListener('mouseup', this.#onMouseUp);
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

  get firing(): boolean {
    return this.#enabled && this.#firing;
  }

  consumeMouseDelta(): Readonly<{ x: number; y: number }> {
    const delta = { x: this.#mouseX * this.sensitivity, y: this.#mouseY * this.sensitivity };
    this.#mouseX = 0;
    this.#mouseY = 0;
    return delta;
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
    removeEventListener('mouseup', this.#onMouseUp);
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
    if (!this.#enabled) return;
    this.#mouseX += event.movementX;
    this.#mouseY += event.movementY;
  };

  #onMouseDown = (event: MouseEvent): void => {
    if (event.button === 0) this.#firing = true;
  };

  #onMouseUp = (event: MouseEvent): void => {
    if (event.button === 0) this.#firing = false;
  };

  #clear = (): void => {
    this.#keys.clear();
    this.#pressed.clear();
    this.#firing = false;
    this.#mouseX = 0;
    this.#mouseY = 0;
  };
}
