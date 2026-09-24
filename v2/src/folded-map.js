import { circuitReady } from './folded-circuits.js';
import { REGION_NAMES, regionAt } from './folded-architecture.js';
import {
  foldedDecks,
  foldedArchitecture,
  inRect,
  deckHeight,
  activeSolid,
} from './folded-layout.js';
import { abilityIcon } from './folded-hud.js';
import { clamp } from './mechanics.js';

// Layer selection belongs to the map, not to player position or aiming.
export function createFoldedMap({ player: p, world, state, discovered, heading }) {
  const $ = (id) => document.getElementById(id);
  const miniTitle = document.createElement('div');
  miniTitle.className = 'map-area-name';
  $('minimap-wrap').append(miniTitle);
  const titles = [miniTitle, document.querySelector('#region .map-heading h1')];
  let chosenLayer = Math.round(p.y / 8) * 8;
  const layers = document.createElement('div');
  layers.id = 'folded-layers';
  $('region').append(layers);
  for (const [label, delta] of [
    ['▲', 1],
    ['▼', -1],
  ]) {
    const b = document.createElement('button');
    b.textContent = label;
    b.setAttribute(
      'aria-label',
      delta > 0 ? 'View discovered floor above' : 'View discovered floor below',
    );
    b.addEventListener('click', () => changeLayer(delta));
    layers.append(b);
  }
  const bars = document.createElement('div');
  bars.id = 'folded-layer-bars';
  layers.insertBefore(bars, layers.lastChild);
  function knownLayers() {
    return [
      ...new Set(
        foldedDecks.filter((d) => discovered.has(d.id)).flatMap((d) => [d.y, d.y + (d.rise || 0)]),
      ),
    ].sort((a, b) => a - b);
  }
  function playerMapLayer() {
    return knownLayers().reduce((a, b) => (Math.abs(b - p.y) < Math.abs(a - p.y) ? b : a));
  }
  function changeLayer(delta) {
    const known = knownLayers(),
      i = known.indexOf(chosenLayer);
    chosenLayer = known[clamp(i + delta, 0, known.length - 1)];
    drawMap(true);
  }
  let mapLinks = [];
  function drawMap(large = false) {
    const name = REGION_NAMES[regionAt(p, foldedArchitecture.rooms)];
    for (const title of titles) if (title.textContent !== name) title.textContent = name;
    if (large) mapLinks = [];
    const canvas = large ? $('region-map') : $('minimap'),
      ctx = canvas.getContext('2d');
    if (large) {
      canvas.width = innerWidth;
      canvas.height = innerHeight;
    }
    const w = canvas.width,
      h = canvas.height,
      known = foldedDecks.filter((d) => discovered.has(d.id)),
      playerLayer = playerMapLayer(),
      layer = large ? chosenLayer : playerLayer;
    const onLayer = (d) =>
      layer >= Math.min(d.y, d.y + (d.rise || 0)) && layer <= Math.max(d.y, d.y + (d.rise || 0));
    const framed = large ? known.filter(onLayer) : known;
    const x0 = Math.min(...framed.map((d) => d.x)) - 8,
      x1 = Math.max(...framed.map((d) => d.x + d.w)) + 8,
      z0 = Math.min(...framed.map((d) => d.z)) - 8,
      z1 = Math.max(...framed.map((d) => d.z + d.d)) + 8;
    const scale = large ? Math.min(w - 160, h - 100) / ((x1 - x0 + z1 - z0) / Math.SQRT2) : 3,
      ox = large ? w / 2 - ((x0 + x1) / 2) * scale : w / 2 - p.x * scale,
      oz = large ? h / 2 - ((z0 + z1) / 2) * scale : h / 2 - p.z * scale;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#102b2e';
    ctx.fillRect(0, 0, w, h);
    // The minimap follows the driving camera; the full map keeps a stable orientation.
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(!large ? heading() : Math.PI / 4);
    ctx.translate(-w / 2, -h / 2);
    for (const d of known) {
      const current =
        layer >= Math.min(d.y, d.y + (d.rise || 0)) && layer <= Math.max(d.y, d.y + (d.rise || 0));
      ctx.globalAlpha = current ? 1 : Math.abs(d.y - layer) <= 8 ? 0.08 : 0;
      ctx.fillStyle = d.water ? '#4e8587' : '#829185';
      ctx.strokeStyle = '#c1c7a0';
      ctx.lineWidth = 1;
      ctx.fillRect(ox + d.x * scale, oz + d.z * scale, d.w * scale, d.d * scale);
      ctx.strokeRect(ox + d.x * scale, oz + d.z * scale, d.w * scale, d.d * scale);
    }
    ctx.globalAlpha = 1;
    function mapIcon(id, x, z, color, size = 14) {
      ctx.save();
      ctx.translate(ox + x * scale, oz + z * scale);
      ctx.rotate(-(!large ? heading() : Math.PI / 4));
      ctx.fillStyle = '#102b2e';
      ctx.fillRect(-size / 2 - 2, -size / 2 - 2, size + 4, size + 4);
      ctx.scale(size / 48, size / 48);
      ctx.translate(-24, -24);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.stroke(new Path2D(abilityIcon(id)));
      ctx.restore();
    }
    const seen = (x, y, z) =>
      known.some(
        (d) => inRect(x, z, d, 2) && Math.abs(deckHeight(d, clamp(z, d.z, d.z + d.d)) - y) < 3,
      );
    // Draw actual same-floor barriers, so floor outlines do not promise a passage.
    ctx.fillStyle = '#263f40';
    ctx.strokeStyle = '#c1c7a0';
    ctx.lineWidth = 1;
    for (const wall of [
      ...foldedArchitecture.solids,
      ...world.walls.filter((w) => w.permanent || w.rail),
      ...state.bodies.obstacles,
    ]) {
      if (
        wall.y > layer + 1.5 ||
        wall.y + wall.h < layer + 0.4 ||
        !seen(wall.x + wall.w / 2, layer, wall.z + wall.d / 2)
      )
        continue;
      ctx.fillRect(ox + wall.x * scale, oz + wall.z * scale, wall.w * scale, wall.d * scale);
      ctx.strokeRect(ox + wall.x * scale, oz + wall.z * scale, wall.w * scale, wall.d * scale);
    }
    // Reveal only the visited portion of a circuit, never unexplored destinations.
    for (const feed of world.controlFeeds) {
      ctx.strokeStyle = circuitReady(state, feed.id, feed) ? '#85db58' : '#f3d250';
      ctx.lineWidth = large ? 1.5 : 1;
      ctx.globalAlpha = 0.7;
      for (let i = 1; i < feed.points.length; i++) {
        const a = feed.points[i - 1],
          b = feed.points[i];
        if (Math.abs(a[1] - layer) > 4 || Math.abs(b[1] - layer) > 4 || !seen(...a) || !seen(...b))
          continue;
        ctx.beginPath();
        ctx.moveTo(ox + a[0] * scale, oz + a[2] * scale);
        ctx.lineTo(ox + b[0] * scale, oz + b[2] * scale);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    for (const wall of world.walls)
      if (
        !wall.permanent &&
        !wall.rail &&
        !wall.hidden &&
        seen(wall.x + wall.w / 2, wall.y, wall.z + wall.d / 2) &&
        Math.abs(wall.y - layer) < 5
      ) {
        ctx.strokeStyle = !activeSolid(wall, state) ? '#85db58' : '#f3d250';
        ctx.lineWidth = !activeSolid(wall, state) ? 1 : 3;
        ctx.beginPath();
        if (wall.w > wall.d) {
          ctx.moveTo(ox + wall.x * scale, oz + (wall.z + wall.d / 2) * scale);
          ctx.lineTo(ox + (wall.x + wall.w) * scale, oz + (wall.z + wall.d / 2) * scale);
        } else {
          ctx.moveTo(ox + (wall.x + wall.w / 2) * scale, oz + wall.z * scale);
          ctx.lineTo(ox + (wall.x + wall.w / 2) * scale, oz + (wall.z + wall.d) * scale);
        }
        ctx.stroke();
      }
    for (const l of world.lifts)
      if (l.stops.includes(layer) && l.stops.some((y) => seen(l.x + l.w / 2, y, l.z + l.d / 2))) {
        ctx.strokeStyle =
          circuitReady(state, l.lock || l.id, l) &&
          (!l.locks || l.locks.every((id) => circuitReady(state, id, l)))
            ? '#a6e3cd'
            : '#e8bd62';
        ctx.lineWidth = 2;
        ctx.strokeRect(ox + l.x * scale, oz + l.z * scale, l.w * scale, l.d * scale);
        const x = ox + (l.x + l.w / 2) * scale,
          z = oz + (l.z + l.d / 2) * scale;
        ctx.beginPath();
        ctx.moveTo(x, z - 6);
        ctx.lineTo(x, z + 6);
        ctx.moveTo(x - 3, z - 3);
        ctx.lineTo(x, z - 6);
        ctx.lineTo(x + 3, z - 3);
        ctx.moveTo(x - 3, z + 3);
        ctx.lineTo(x, z + 6);
        ctx.lineTo(x + 3, z + 3);
        ctx.stroke();
        const destination = l.stops.find((y) => y !== layer);
        if (large && knownLayers().includes(destination)) {
          const point = ctx.getTransform().transformPoint(new DOMPoint(x, z));
          mapLinks.push({ x: point.x, y: point.y, destination });
        }
      }
    for (const c of world.controls)
      if (c.kind !== 'dock' && Math.abs(c.y - 1.3 - layer) < 4 && seen(c.x, c.y - 1.3, c.z)) {
        const x = ox + c.x * scale,
          z = oz + c.z * scale;
        ctx.strokeStyle = state[c.id] ? '#85db58' : c.kind === 'magnet' ? '#328fff' : '#f3d250';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, z, 4, 0, Math.PI * 2);
        ctx.stroke();
        if (!state[c.id]) {
          ctx.beginPath();
          ctx.moveTo(x - 3, z);
          ctx.lineTo(x + 3, z);
          ctx.moveTo(x, z - 3);
          ctx.lineTo(x, z + 3);
          ctx.stroke();
        }
      }
    for (const q of world.pickups)
      if (
        !q.hidden &&
        !state[q.id] &&
        (!q.requires || state[q.requires]) &&
        Math.abs(q.y - layer) < 1 &&
        seen(q.x, q.y, q.z)
      )
        mapIcon(q.ability || q.id, q.x, q.z, '#ffe09a', 18);

    for (const h of world.hives)
      if (known.some((d) => inRect(h.x, h.z, d) && Math.abs(deckHeight(d, h.z) - h.y) < 0.5)) {
        ctx.globalAlpha = h.y === layer ? 1 : 0.2;
        ctx.strokeStyle = '#b5ffe0';
        ctx.beginPath();
        ctx.arc(ox + h.x * scale, oz + h.z * scale, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    if (!large || layer === playerLayer) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffe19b';
      ctx.save();
      ctx.translate(ox + p.x * scale, oz + p.z * scale);
      ctx.rotate(-p.heading);
      ctx.beginPath();
      ctx.moveTo(0, 7);
      ctx.lineTo(-4, -4);
      ctx.lineTo(4, -4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    if (large) {
      bars.replaceChildren();
      for (const y of knownLayers().reverse()) {
        const b = document.createElement('button');
        b.className = `layer-bar${y === layer ? ' selected' : ''}${y === playerLayer ? ' player-layer' : ''}`;
        b.setAttribute('aria-label', `View floor at elevation ${y}`);
        b.onclick = () => {
          chosenLayer = y;
          drawMap(true);
        };
        bars.append(b);
      }
      layers.firstChild.disabled = layer === knownLayers().at(-1);
      layers.lastChild.disabled = layer === knownLayers()[0];
    }
  }
  function mapConnection(event) {
    const bounds = $('region-map').getBoundingClientRect();
    return mapLinks.find(
      (l) =>
        Math.hypot(l.x - (event.clientX - bounds.left), l.y - (event.clientY - bounds.top)) < 18,
    );
  }
  $('region-map').addEventListener('mousemove', (event) => {
    $('region-map').style.cursor = mapConnection(event) ? 'pointer' : 'default';
  });
  $('region-map').addEventListener('click', (event) => {
    const connection = mapConnection(event);
    if (connection) {
      chosenLayer = connection.destination;
      drawMap(true);
    }
  });
  return {
    draw: drawMap,
    open() {
      chosenLayer = playerMapLayer();
      drawMap(true);
    },
    selectLayer(y) {
      chosenLayer = y;
      drawMap(true);
    },
    get layer() {
      return chosenLayer;
    },
    get links() {
      return mapLinks;
    },
  };
}
