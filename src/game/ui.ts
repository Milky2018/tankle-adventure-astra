import type { Input } from './input';
import type { WorldSnapshot } from './world';
import type { Action, ZoneId } from './types';

const MAP_RECTS: Record<ZoneId, readonly [number, number, number, number]> = {
  a: [-9, 3, 18, 18],
  b: [15.5, 2, 9, 12],
  c: [7.5, -29, 25, 20],
  'branch-west': [7.5, -30.5, 9, 15],
  'branch-east': [30, -30.5, 10, 15],
  elite: [13.5, -41, 13, 14],
  boss: [-9, -39.5, 18, 27],
  exit: [-5.5, -45.5, 11, 7],
};

const ACTION_LABELS: ReadonlyArray<readonly [Action, string]> = [
  ['forward', 'DRIVE FORWARD'],
  ['backward', 'DRIVE BACKWARD'],
  ['left', 'STEER LEFT'],
  ['right', 'STEER RIGHT'],
  ['overdrive', 'OVERDRIVE'],
  ['map', 'REGION MAP'],
  ['interact', 'INTERACT'],
];

export class UI {
  readonly hud = required<HTMLElement>('#hud');
  readonly regionMap = required<HTMLElement>('#region-map');

  #health = required<HTMLElement>('#health-bar');
  #heat = required<HTMLElement>('#heat-gauge');
  #speed = required<HTMLElement>('#speed-gauge');
  #boss = required<HTMLElement>('#boss-bar');
  #hint = required<HTMLElement>('#input-hint');
  #damage = required<HTMLElement>('#damage-flash');
  #minimap = required<HTMLCanvasElement>('#minimap');
  #regionCanvas = required<HTMLCanvasElement>('#region-map canvas');
  #lastHealth = 1;
  #hintTimer = 0;

  constructor() {
    for (let index = 0; index < 10; index += 1) this.#health.append(document.createElement('i'));
  }

  set visible(value: boolean) {
    this.hud.classList.toggle('hidden', !value);
    this.hud.setAttribute('aria-hidden', String(!value));
  }

  update(snapshot: WorldSnapshot, delta: number, interactKey: string): void {
    const activeSegments = Math.ceil(snapshot.health * 10);
    for (const [index, segment] of [...this.#health.children].entries()) {
      segment.classList.toggle('empty', index >= activeSegments);
      segment.classList.toggle('critical', snapshot.health <= 0.3 && index < activeSegments);
    }
    if (snapshot.health < this.#lastHealth) {
      this.#damage.classList.remove('hit');
      void this.#damage.offsetWidth;
      this.#damage.classList.add('hit');
    }
    this.#lastHealth = snapshot.health;

    this.#heat.style.setProperty('--value', `${snapshot.heat}`);
    this.#heat.classList.toggle('overheated', snapshot.overheated);
    this.#speed.style.setProperty('--value', `${snapshot.speed}`);
    this.#speed.classList.toggle('active', snapshot.speed > 0.01);

    if (snapshot.bossHealth === null) {
      this.#boss.classList.add('hidden');
    } else {
      this.#boss.classList.remove('hidden');
      this.#boss.style.setProperty('--value', `${snapshot.bossHealth}`);
    }

    if (snapshot.nearbyHive && !snapshot.completed) {
      this.#hintTimer = 0.2;
      this.#hint.textContent = interactKey;
      this.#hint.classList.remove('hidden');
    } else {
      this.#hintTimer -= delta;
      if (this.#hintTimer <= 0) this.#hint.classList.add('hidden');
    }
    this.hud.classList.toggle('dead', snapshot.dead);
    this.#drawMap(this.#minimap, snapshot, true);
    if (!this.regionMap.classList.contains('hidden')) this.#drawMap(this.#regionCanvas, snapshot, false);
  }

  setMapVisible(value: boolean, snapshot?: WorldSnapshot): void {
    this.regionMap.classList.toggle('hidden', !value);
    this.regionMap.setAttribute('aria-hidden', String(!value));
    if (value && snapshot) this.#drawMap(this.#regionCanvas, snapshot, false);
  }

  buildKeyBindings(input: Input): void {
    const container = required<HTMLElement>('#key-bindings');
    container.replaceChildren();
    for (const [action, label] of ACTION_LABELS) {
      const row = document.createElement('div');
      const text = document.createElement('span');
      const button = document.createElement('button');
      text.textContent = label;
      button.textContent = input.formatBinding(action);
      button.type = 'button';
      button.addEventListener('click', () => {
        button.textContent = 'PRESS A KEY';
        const bind = (event: KeyboardEvent): void => {
          event.preventDefault();
          input.bind(action, event.code);
          button.textContent = input.formatBinding(action);
        };
        addEventListener('keydown', bind, { once: true });
      });
      row.append(text, button);
      container.append(row);
    }
  }

  #drawMap(canvas: HTMLCanvasElement, snapshot: WorldSnapshot, local: boolean): void {
    const context = canvas.getContext('2d');
    if (!context) return;
    const ratio = devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = local ? 180 : Math.max(500, rect.width);
    const height = local ? 180 : Math.max(400, rect.height);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(10, 19, 21, .9)';
    context.fillRect(0, 0, width, height);
    context.save();
    if (local) {
      context.beginPath();
      context.arc(width / 2, height / 2, width / 2 - 4, 0, Math.PI * 2);
      context.clip();
    }

    const scale = local ? 5.2 : 8.5;
    const offsetX = local ? width / 2 - snapshot.playerPosition.x * scale : width / 2 - 12 * scale;
    const offsetY = local ? height / 2 + snapshot.playerPosition.z * scale : height / 2 - 4 * scale;
    context.strokeStyle = '#70c8bd';
    context.fillStyle = 'rgba(65, 110, 111, .28)';
    context.lineWidth = local ? 1.5 : 2;
    for (const zone of snapshot.discovered) {
      const bounds = MAP_RECTS[zone];
      const [x, z, zoneWidth, zoneHeight] = bounds;
      context.fillRect(offsetX + x * scale, offsetY - (z + zoneHeight) * scale, zoneWidth * scale, zoneHeight * scale);
      context.strokeRect(offsetX + x * scale, offsetY - (z + zoneHeight) * scale, zoneWidth * scale, zoneHeight * scale);
    }
    const drawConnector = (x: number, z: number, connectorWidth: number, connectorHeight: number): void => {
      context.fillRect(
        offsetX + x * scale,
        offsetY - (z + connectorHeight) * scale,
        connectorWidth * scale,
        connectorHeight * scale,
      );
      context.strokeRect(
        offsetX + x * scale,
        offsetY - (z + connectorHeight) * scale,
        connectorWidth * scale,
        connectorHeight * scale,
      );
    };
    if (snapshot.discovered.includes('a') && snapshot.discovered.includes('b')) drawConnector(0, 9.5, 15.5, 5);
    if (snapshot.discovered.includes('b') && snapshot.discovered.includes('c')) drawConnector(17.5, -11, 5, 13);

    for (const checkpoint of [
      { id: 'a', x: -4.7, z: 15 },
      { id: 'c', x: 20, z: -15 },
      { id: 'exit', x: 0, z: -42 },
    ] as const) {
      if (checkpoint.id !== 'a' && !snapshot.discovered.includes(checkpoint.id === 'c' ? 'c' : 'exit')) continue;
      context.fillStyle = snapshot.progress.checkpoint === checkpoint.id ? '#69f0cf' : '#4c7775';
      context.beginPath();
      context.arc(offsetX + checkpoint.x * scale, offsetY - checkpoint.z * scale, local ? 3.5 : 6, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = '#f3c84b';
    context.save();
    context.translate(offsetX + snapshot.playerPosition.x * scale, offsetY - snapshot.playerPosition.z * scale);
    context.rotate(-snapshot.hullHeading);
    context.beginPath();
    context.moveTo(0, -9);
    context.lineTo(6, 7);
    context.lineTo(-6, 7);
    context.closePath();
    context.fill();
    context.restore();
    context.strokeStyle = '#fff2c8';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(offsetX + snapshot.playerPosition.x * scale, offsetY - snapshot.playerPosition.z * scale);
    context.lineTo(
      offsetX + snapshot.playerPosition.x * scale - Math.sin(snapshot.turretAim) * 12,
      offsetY - snapshot.playerPosition.z * scale + Math.cos(snapshot.turretAim) * 12,
    );
    context.stroke();

    for (const enemy of snapshot.enemies) {
      const enemyIsDiscovered = snapshot.discovered.some((zone) => {
        const [x, z, zoneWidth, zoneHeight] = MAP_RECTS[zone];
        return enemy.position.x >= x && enemy.position.x <= x + zoneWidth &&
          enemy.position.z >= z && enemy.position.z <= z + zoneHeight;
      });
      if (!enemyIsDiscovered) continue;
      context.fillStyle = enemy.kind === 'boss' ? '#f04e47' : enemy.kind === 'elite' ? '#a86bd6' : '#ed7d45';
      const size = enemy.kind === 'boss' ? 7 : enemy.kind === 'elite' ? 5 : 3;
      context.fillRect(
        offsetX + enemy.position.x * scale - size,
        offsetY - enemy.position.z * scale - size,
        size * 2,
        size * 2,
      );
    }
    context.restore();
    context.strokeStyle = '#6ec6bb';
    context.lineWidth = 3;
    if (local) {
      context.beginPath();
      context.arc(width / 2, height / 2, width / 2 - 4, 0, Math.PI * 2);
      context.stroke();
    }
  }
}

function required<T extends Element>(selector: string): T {
  const value = document.querySelector<T>(selector);
  if (!value) throw new Error(`Missing required element: ${selector}`);
  return value;
}
