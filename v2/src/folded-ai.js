import * as T from 'three';
import { ENEMY_KINDS, woundedAlly } from './folded-enemy-rules.js';
import { BOSS_ARENAS } from './folded-boss-arenas.js';
import { bossPattern, bossBarrage } from './folded-bosses.js';
import { barrageTargets, RAIL, SORTER_REACH } from './folded-attacks.js';
import { refugeAt, REFUGE_CLEARANCE } from './folded-refuges.js';
import { canTelegraph } from './folded-pacing.js';
import { expansionBattles } from './folded-expansion-layout.js';
import { cityContact } from './folded-combat.js';
import { moveWithConveyor } from './folded-machinery.js';
import { moveFolded } from './folded-layout.js';
import { redContact } from './mechanics.js';

// Decisions and collision queries do not depend on enemy meshes. The view
// adapter receives updates at their original points in the simulation step.
export function createFoldedEnemies({
  player: p,
  state,
  world,
  shots,
  mines,
  now,
  encounterPacing,
  bossArenas,
  combat: { hurt, hitEnemy, shootEnemy },
  audio,
  enemyPan,
  save,
  view,
}) {
  function resetEnemies() {
    encounterPacing.reset();
    for (const e of world.enemies) {
      e.attackCycle = 0;
      e.attack = null;
      e.pattern = null;
      e.source = null;
      e.deploy = 0;
      e.chain = false;
    }
    for (const e of world.enemies) {
      Object.assign(e, e.spawn);
      e.hp = e.persistent && state[e.id] ? 0 : e.max;
      e.phase = 'idle';
      e.timer = 1.5;
      e.alertUntil = 0;
      e.lastSeen = null;
      e.deadAt = null;
      e.stunnedUntil = 0;
      e.shieldPull = 0;
      e.shieldRemoved = false;
      view.reset(e);
      for (const part of e.parts) part.hp = part.max;
    }
    bossArenas.reset();
    for (const e of world.enemies) if (e.reserveFor) view.hide(e);
  }
  function alertSquad(enemy) {
    encounterPacing.wake(enemy);
    for (const e of world.enemies)
      if (e.hp > 0 && (e === enemy || (enemy.encounter && e.encounter === enemy.encounter))) {
        e.alertUntil = now() + 8;
        e.lastSeen = { x: p.x, y: p.y, z: p.z };
      }
  }
  function moveEnemy(e, angle, speed, dt) {
    for (const turn of [0, 0.75, -0.75, 1.4, -1.4]) {
      const body = { x: e.x, y: e.y, z: e.z, speed: 1, deployed: false };
      moveFolded(
        body,
        Math.sin(angle + turn) * speed * dt,
        Math.cos(angle + turn) * speed * dt,
        state,
        world.lifts,
      );
      if (refugeAt(body, world.hives, state, REFUGE_CLEARANCE)) continue;
      if (Math.hypot(body.x - e.x, body.z - e.z) < Math.abs(speed * dt) * 0.3) continue;
      if (
        world.enemies.some(
          (o) =>
            o !== e &&
            o.hp > 0 &&
            Math.abs(o.y - body.y) < 2 &&
            Math.hypot(o.x - body.x, o.z - body.z) < e.radius + o.radius + 0.15,
        )
      )
        continue;
      e.x = body.x;
      e.y = body.y;
      e.z = body.z;
      view.roll(e, speed * dt * 2.4);
      break;
    }
  }
  function approachEnemy(e, goal, dt) {
    if (Math.abs(goal.y - e.y) > 3 || Math.hypot(e.x - e.spawn.x, e.z - e.spawn.z) > 32) return;
    moveEnemy(e, Math.atan2(goal.x - e.x, goal.z - e.z), ENEMY_KINDS[e.type].speed, dt);
  }
  function beginBossAttack(e, clearSight = true) {
    const sighting = state.combatArena === e.id || clearSight ? p : e.lastSeen || p;
    e.attackCycle = (e.attackCycle || 0) + 1;
    e.pattern = bossPattern(e, clearSight);
    e.attack = e.pattern.kind;
    e.lock = new T.Vector3(
      sighting.x,
      sighting.y + (e.attack === 'barrage' ? 0.05 : 1.2),
      sighting.z,
    );
    e.aim = Math.atan2(sighting.x - e.x, sighting.z - e.z);
    e.phase = 'warn';
    e.timer = e.pattern.warn;
    const parts = e.parts.filter((part) => part.hp > 0);
    e.source = parts[(e.attackCycle - 1) % Math.max(1, parts.length)] || null;
    e.volleySources = Array.from({ length: e.pattern.waves || 1 }, (_, wave) =>
      e.attack === 'batteries'
        ? parts[(e.attackCycle - 1 + wave) % Math.max(1, parts.length)] || null
        : null,
    );
    e.sweepSign = (e.sweepSign || 1) * -1;
    audio.event('boss-lock', enemyPan(e));
  }
  function launchBossPattern(e) {
    const pattern = e.pattern;
    if (e.attack === 'barrage') {
      for (const target of bossBarrage(e, e.lock))
        shootEnemy(e, 0, null, new T.Vector3(target.x, target.y, target.z), target.delay, true, {
          duration: 1.35,
          silent: target.delay > 0,
        });
    } else if (e.attack === 'seekers') {
      for (const side of [-1, 1]) {
        const source = new T.Vector3(
          e.x + Math.cos(e.aim) * side * 2,
          e.y + 1.2,
          e.z - Math.sin(e.aim) * side * 2,
        );
        shootEnemy(e, side * 0.24, source, new T.Vector3(e.lock.x, e.y + 1.2, e.lock.z), 0, false, {
          homing: true,
          speed: 22,
          silent: side > 0,
        });
      }
    } else {
      let sounded = false;
      for (let wave = 0; wave < pattern.waves; wave++) {
        const source = e.volleySources[wave];
        if (source && source.hp <= 0) continue;
        for (const offset of pattern.offsets) {
          shootEnemy(
            e,
            offset + (wave ? 0.075 : 0),
            source,
            e.lock,
            wave * pattern.spacing,
            false,
            {
              speed: pattern.speed,
              sourcePart: source,
              silent: sounded,
            },
          );
          sounded = true;
        }
      }
    }
    if (pattern.overlay && e.attack !== 'barrage') {
      const target = e.lock.clone();
      target.y = e.y + 0.05;
      shootEnemy(e, 0, null, target, 0.65, true, { duration: 1.35 });
    }
  }
  function updateBossBattery(e, clearSight = true) {
    if (e.phase === 'idle' && e.timer <= 0) beginBossAttack(e, clearSight);
    if (e.phase === 'warn') {
      view.showBossWarning(e);
      if (e.timer <= 0) {
        if (e.attack === 'sweep') {
          e.phase = 'sweep';
          e.timer = 1.8;
          audio.event('vent', enemyPan(e));
        } else {
          launchBossPattern(e);
          e.phase = 'vent';
          e.timer = e.pattern.recovery;
          audio.event('vent', enemyPan(e));
        }
      }
    } else if (e.phase === 'sweep') {
      const origin = new T.Vector3(e.x, e.y + 1.8, e.z),
        angle = e.aim + e.sweepSign * (-0.8 + 1.6 * (1 - e.timer / 1.8)),
        dir = new T.Vector3(Math.sin(angle), 0, Math.cos(angle));
      const hit = world.cast(origin, dir, 38, { targets: false }),
        length = hit?.distance ?? 38;
      view.beam(e, origin, dir, length, 0.65);
      const dx = p.x - e.x,
        dz = p.z - e.z,
        along = dx * dir.x + dz * dir.z,
        side = Math.abs(dx * dir.z - dz * dir.x);
      if (Math.abs(p.y - e.y) < 2 && along > 0 && along < length && side < 1.2) hurt(8);
      if (e.timer <= 0) {
        e.phase = 'vent';
        e.timer = e.pattern.recovery;
      }
    } else if (e.phase !== 'idle' && e.timer <= 0) {
      e.phase = 'idle';
      e.timer = 0.18;
    }
  }
  function updateSorter(e, dt, clearSight) {
    if (e.phase === 'idle' && e.timer <= 0) beginBossAttack(e, clearSight);
    if (e.attack === 'barrage') {
      if (e.phase === 'warn') {
        view.showBossWarning(e);
        if (e.timer <= 0) {
          launchBossPattern(e);
          e.phase = 'vent';
          e.timer = e.pattern.recovery;
        }
      } else if (e.timer <= 0) {
        e.phase = 'idle';
        e.timer = 0.18;
      }
      return;
    }
    view.sorterZone(e);
    if (e.phase === 'warn' || e.phase === 'sweep') {
      const angle = e.aim + (e.phase === 'warn' ? -0.9 : -0.9 + 1.8 * (1 - e.timer / 1.8)),
        dir = new T.Vector3(Math.sin(angle), 0, Math.cos(angle)),
        origin = new T.Vector3(e.x, e.y + 1.8, e.z);
      const obstruction = world.cast(origin, dir, SORTER_REACH, { targets: false }),
        reach = obstruction?.distance ?? SORTER_REACH;
      view.sorterArm(e, origin, dir, reach, angle);
      if (e.phase === 'sweep') {
        if (obstruction?.object?.userData.sortingCover) {
          view.impact(obstruction.point, 'lightYellow', 10);
          audio.event('armor', enemyPan(e));
          e.phase = 'vent';
          e.timer = 1.5;
          e.sweepRight = !e.sweepRight;
          view.hideWarning(e);
          return;
        }
        const dx = p.x - e.x,
          dz = p.z - e.z,
          along = dx * dir.x + dz * dir.z,
          side = Math.abs(dx * dir.z - dz * dir.x);
        if (Math.abs(p.y - e.y) < 2 && along > 2 && along < reach && side < 1.1) hurt(9);
        const cover = state.bodies.obstacles.find((s) => s.id === 'sorter-cover'),
          next = cover.x + dt * (e.sweepRight ? -5 : 5);
        if (
          now() > world.sidePuzzles.coverHeldUntil &&
          next >= 116 &&
          next <= 138 &&
          !(
            Math.abs(p.y - cover.y) < 3 &&
            p.x > next - 1 &&
            p.x < next + cover.w + 1 &&
            p.z > cover.z - 1 &&
            p.z < cover.z + cover.d + 1
          )
        )
          cover.x = next;
      }
      if (e.timer <= 0) {
        if (e.phase === 'warn') {
          e.phase = 'sweep';
          e.timer = 1.8;
        } else {
          e.phase = 'vent';
          e.timer = 1.5;
          e.sweepRight = !e.sweepRight;
          audio.event('vent', enemyPan(e));
        }
      }
    } else if (e.phase === 'vent') {
      view.retractArm(e, dt);
      if (e.timer <= 0) {
        e.phase = 'idle';
        e.timer = 0.4;
      }
    }
  }
  function updateEnemies(dt) {
    const resting = !!refugeAt(p, world.hives, state);
    for (const event of bossArenas.update(p, now())) {
      audio.event(event.kind === 'reserve' ? 'warn' : 'lever');
      if (event.kind === 'release') {
        const owned = (id) =>
          id === event.id || world.enemies.some((e) => e.id === id && e.reserveFor === event.id);
        for (const shot of shots) if (owned(shot.owner)) shot.captured = true;
        for (const mine of mines) if (owned(mine.owner)) mine.disarmed = true;
      }
    }
    encounterPacing.update(dt, p, resting, now());
    for (const battle of expansionBattles)
      if (
        !state[battle.id] &&
        world.enemies.filter((e) => e.battle === battle.battle).every((e) => e.hp <= 0)
      ) {
        state[battle.id] = true;
        world.signalRelease(battle.id, now());
        audio.event('lever');
        save();
      }
    for (const e of world.enemies) {
      view.clearWarnings(e);
      const beforeDrift = { x: e.x, y: e.y, z: e.z };
      moveWithConveyor(e, 0, 0, dt, state, world.lifts, world.enemies);
      if (refugeAt(e, world.hives, state, REFUGE_CLEARANCE)) Object.assign(e, beforeDrift);
      view.deployment(e, now());
      if (!e.hp) {
        view.collapse(e, now());
        continue;
      }
      const spec = ENEMY_KINDS[e.type];
      if (!e.awake || (BOSS_ARENAS.some((a) => a.id === e.id) && state.combatArena !== e.id)) {
        e.readable = false;
        view.idle(e, now(), dt);
        continue;
      }
      if (e.guardian && e.phase === 'idle') e.aim = Math.atan2(p.x - e.x, p.z - e.z);
      e.flash = Math.max(0, e.flash - dt);
      e.armor = Math.max(0, e.armor - dt);
      const origin = new T.Vector3(
          e.x,
          e.y + (e.type === 'boss' ? 4 : e.guardian ? 2.8 : 1.5),
          e.z,
        ),
        to = new T.Vector3(p.x, p.y + 1.2, p.z).sub(origin),
        distance = to.length();
      const retaliating = state.combatArena === e.id && Math.abs(e.y - p.y) < 4,
        engageRange = retaliating ? 94 : Math.max(30, spec.reach);
      if (distance > Math.max(45, engageRange + 8)) {
        e.phase = 'idle';
        e.timer = 0.55;
        e.readable = false;
        continue;
      }
      e.readable = view.readable(e, origin);
      const clearSight = !world.cast(origin, to.clone().normalize(), Math.max(0, distance - 1), {
        targets: false,
      });
      const supported =
        (e.type === 'artillery' && e.alertUntil > now()) ||
        (e.type === 'repairer' && woundedAlly(e, world.enemies));
      const committed = [
        'warn',
        'charge',
        'burst',
        'rail',
        'flame',
        'sweep',
        'repair',
        'vent',
      ].includes(e.phase);
      const active =
        distance < engageRange &&
        p.hp > 0 &&
        !resting &&
        (clearSight || ((supported || committed || retaliating) && Math.abs(e.y - p.y) < 4));
      if (active && clearSight) alertSquad(e);
      if (e.stunnedUntil > now()) {
        e.phase = 'stunned';
        e.timer = 0.5;
      } else if (!active) {
        if (resting) {
          e.alertUntil = 0;
          e.lastSeen = null;
          if (spec.speed && Math.hypot(e.x - e.spawn.x, e.z - e.spawn.z) > 1)
            moveEnemy(e, Math.atan2(e.spawn.x - e.x, e.spawn.z - e.z), spec.speed, dt);
        }
        if (
          !resting &&
          p.hp > 0 &&
          spec.speed &&
          !e.guardian &&
          now() < e.alertUntil &&
          e.lastSeen &&
          Math.hypot(e.x - e.lastSeen.x, e.z - e.lastSeen.z) > 3
        )
          approachEnemy(e, e.lastSeen, dt);
        e.phase = 'idle';
        e.timer = 0.55;
      } else {
        e.timer -= dt;
        if (e.id === 'keeper' || e.id === 'foundry' || e.guardian) updateBossBattery(e, clearSight);
        else if (e.id === 'sorter') updateSorter(e, dt, clearSight);
        else if (e.phase === 'idle') {
          e.aim = Math.atan2(p.x - e.x, p.z - e.z);
          const ally = e.type === 'repairer' ? woundedAlly(e, world.enemies) : null;
          if (e.type === 'repairer') {
            if (ally && Math.hypot(ally.x - e.x, ally.z - e.z) > 8) approachEnemy(e, ally, dt);
            if (!ally || Math.hypot(ally.x - e.x, ally.z - e.z) > 10) {
              e.timer = Math.max(e.timer, 0.2);
            } else e.patient = ally;
          } else if (
            ((e.type === 'sniper' && distance < 11) ||
              (e.type === 'artillery' && distance < 9) ||
              (e.type === 'miner' && distance < 8)) &&
            Math.hypot(e.x - e.spawn.x, e.z - e.spawn.z) < 28
          )
            moveEnemy(e, e.aim + Math.PI, spec.speed, dt);
          else if (e.type === 'skirmisher' && distance < 20)
            moveEnemy(e, e.aim + ((e.id.length % 2 ? 1 : -1) * Math.PI) / 2, spec.speed, dt);
          else if (spec.speed && !e.guardian && distance > (e.type === 'guard' ? 5 : spec.reach)) {
            approachEnemy(e, p, dt);
            if (distance > spec.reach) e.timer = Math.max(e.timer, 0.2);
          }
          if (e.timer <= 0 && canTelegraph(e, world.enemies)) {
            const sighting = state.combatArena === e.id || clearSight ? p : e.lastSeen || p;
            e.phase = 'warn';
            e.timer = e.id === 'prototype' ? (e.hp / e.max < 0.55 ? 0.85 : 1.05) : spec.warn;
            e.lock = new T.Vector3(
              sighting.x,
              ['artillery', 'miner'].includes(e.type) ? sighting.y + 0.05 : sighting.y + 1.2,
              sighting.z,
            );
            if (e.type === 'miner') {
              const range = Math.hypot(e.lock.x - e.x, e.lock.z - e.z),
                fraction = Math.min(1, 8 / range);
              e.lock.x = e.x + (e.lock.x - e.x) * fraction;
              e.lock.z = e.z + (e.lock.z - e.z) * fraction;
            }
            audio.event('warn', enemyPan(e));
          }
        } else if (e.phase === 'warn') {
          if (e.type === 'sniper' && e.timer > RAIL.lockTime && clearSight) {
            e.lock.set(p.x, p.y + 1.2, p.z);
            e.aim = Math.atan2(p.x - e.x, p.z - e.z);
          }
          view.warn(e, origin, now());
          if (e.timer <= 0) {
            if (spec.attack === 'charge') {
              e.phase = 'charge';
              e.timer = e.type === 'elite' ? 1.2 : 0.75;
            } else if (spec.attack === 'sweep') {
              e.phase = 'flame';
              e.timer = 1.8;
            } else if (spec.attack === 'repair') {
              e.phase = 'repair';
              e.timer = 1.6;
            } else if (spec.attack === 'rail') {
              const dir = e.lock.clone().sub(origin).normalize(),
                hit = world.cast(origin, dir, RAIL.range, { targets: false });
              e.railEnd = origin.clone().addScaledVector(dir, hit ? hit.distance : RAIL.range);
              shootEnemy(e);
              e.phase = 'rail';
              e.timer = 0.18;
            } else if (spec.attack === 'lob') {
              for (const t of barrageTargets(origin, e.lock))
                shootEnemy(e, 0, null, new T.Vector3(t.x, t.y, t.z), t.delay);
              e.phase = 'vent';
              e.timer = spec.recovery;
            } else if (spec.attack === 'burst') {
              shootEnemy(e, -0.08);
              e.phase = 'burst';
              e.timer = 0.18;
              e.burstLeft = 2;
            } else {
              shootEnemy(e, spec.attack === 'reflect' ? -0.1 : 0);
              if (spec.attack === 'reflect') shootEnemy(e, 0.1);
              e.phase = 'vent';
              e.timer = e.guardian ? 2.2 : spec.recovery;
            }
          }
        } else if (e.phase === 'charge') {
          const oldX = e.x,
            oldZ = e.z,
            speed = e.id === 'prototype' ? 21 : e.type === 'elite' ? 19 : 13;
          const body = { x: e.x, y: e.y, z: e.z, speed: 1 };
          moveFolded(
            body,
            Math.sin(e.aim) * speed * dt,
            Math.cos(e.aim) * speed * dt,
            state,
            world.lifts,
          );
          if (!refugeAt(body, world.hives, state, REFUGE_CLEARANCE)) {
            e.x = body.x;
            e.z = body.z;
            e.y = body.y;
          }
          const struckWall = Math.hypot(e.x - oldX, e.z - oldZ) < 0.001;
          if (e.timer <= 0 || struckWall) {
            if (e.id === 'prototype' && struckWall) {
              view.impact(new T.Vector3(e.x, e.y + 1, e.z), 'orange', 10);
              audio.event('armor', enemyPan(e));
            }
            if (e.id === 'prototype' && !struckWall && e.hp / e.max < 0.55 && !e.chain) {
              e.chain = true;
              e.phase = 'warn';
              e.timer = 0.85;
              e.aim = Math.atan2(p.x - e.x, p.z - e.z);
              e.lock = new T.Vector3(p.x, p.y + 1.2, p.z);
              audio.event('warn', enemyPan(e));
            } else {
              e.chain = false;
              e.phase = 'vent';
              e.timer = spec.recovery;
            }
          }
        } else if (e.phase === 'burst') {
          if (e.timer <= 0) {
            shootEnemy(e, e.burstLeft === 2 ? 0 : 0.08);
            e.burstLeft--;
            e.timer = 0.18;
            if (!e.burstLeft) {
              e.phase = 'vent';
              e.timer = spec.recovery;
            }
          }
        } else if (e.phase === 'rail') {
          view.line(e, origin, e.railEnd);
          if (e.timer <= 0) {
            e.phase = 'vent';
            e.timer = spec.recovery;
          }
        } else if (e.phase === 'flame') {
          const angle = e.aim - 0.7 + ((1.8 - e.timer) / 1.8) * 1.4,
            dir = new T.Vector3(Math.sin(angle), 0, Math.cos(angle));
          const hit = world.cast(origin, dir, 8, { targets: false }),
            length = hit ? hit.distance : 8,
            end = origin.clone().addScaledVector(dir, length);
          view.beam(e, origin, dir, length, 1, true);
          const across = to.x * dir.x + to.z * dir.z,
            side = Math.abs(to.x * dir.z - to.z * dir.x);
          if (Math.abs(p.y - e.y) < 2 && across > 0 && across < length && side < 1) hurt(6);
          if (now() - (e.flameAt || 0) > 0.12) {
            view.impact(end, 'orange', 3);
            e.flameAt = now();
          }
          if (e.timer <= 0) {
            e.phase = 'vent';
            e.timer = spec.recovery;
          }
        } else if (e.phase === 'repair') {
          const ally = e.patient;
          if (ally?.hp > 0) {
            const end = new T.Vector3(ally.x, ally.y + 1.5, ally.z),
              path = end.clone().sub(origin);
            if (
              path.length() < 11 &&
              !world.cast(origin, path.clone().normalize(), path.length() - 0.8, { targets: false })
            ) {
              ally.hp = Math.min(ally.max, ally.hp + dt * 0.8);
              view.repair(e, origin, end);
            }
          }
          if (e.timer <= 0) {
            e.phase = 'vent';
            e.timer = spec.recovery;
          }
        } else if (e.timer <= 0) {
          e.phase = 'idle';
          e.timer = 0.25 + (e.id.length % 3) * 0.1;
        }
      }
      if (
        active &&
        e.type === 'skirmisher' &&
        ['warn', 'burst', 'vent'].includes(e.phase) &&
        Math.hypot(e.x - e.spawn.x, e.z - e.spawn.z) < 28
      )
        moveEnemy(
          e,
          Math.atan2(p.x - e.x, p.z - e.z) + ((e.id.length % 2 ? 1 : -1) * Math.PI) / 2,
          spec.speed,
          dt,
        );
      if (
        active &&
        e.phase === 'vent' &&
        spec.speed &&
        !e.guardian &&
        !['scout', 'elite', 'skirmisher'].includes(e.type)
      ) {
        const angle = Math.atan2(p.x - e.x, p.z - e.z);
        if (e.type === 'repairer') {
          const ally = woundedAlly(e, world.enemies);
          if (ally) approachEnemy(e, ally, dt);
        } else if (['guard', 'welder'].includes(e.type) && distance > 5) approachEnemy(e, p, dt);
        else if (Math.hypot(e.x - e.spawn.x, e.z - e.spawn.z) < 28)
          moveEnemy(
            e,
            angle + (distance < 10 ? Math.PI : ((e.id.length % 2 ? 1 : -1) * Math.PI) / 2),
            spec.speed,
            dt,
          );
      }
      if (Math.abs(p.y - e.y) < 2 && Math.hypot(p.x - e.x, p.z - e.z) < e.radius + 0.8) {
        if (now() - e.ramAt > 0.5) {
          e.ramAt = now();
          const damage = cityContact(p, e);
          if (damage) {
            hitEnemy(e, damage, new T.Vector3(p.x, p.y, p.z), redContact(p) ? 'red' : 'ram');
            audio.event('ram');
            if (!redContact(p) && p.speed < 3.19) p.speed = 1;
          } else {
            hurt(
              e.id === 'prototype' && e.phase === 'charge'
                ? 18
                : p.speed >= 1.3 && e.type === 'guard'
                  ? 6
                  : 5,
            );
            if (e.id === 'prototype' && e.phase === 'charge') {
              moveFolded(p, Math.sin(e.aim) * 4, Math.cos(e.aim) * 4, state, world.lifts);
              e.phase = 'vent';
              e.timer = 1.6;
            }
          }
        }
        // A surviving body stays solid between damage ticks; engine speed is not phasing.
        if (e.hp > 0) {
          const distance = Math.hypot(p.x - e.x, p.z - e.z),
            angle = distance > 0.001 ? Math.atan2(p.x - e.x, p.z - e.z) : p.heading + Math.PI,
            overlap = e.radius + 0.81 - distance;
          moveFolded(p, Math.sin(angle) * overlap, Math.cos(angle) * overlap, state, world.lifts);
          p.speed = 1;
        }
      }
      view.finish(e, now(), dt, active);
    }
  }

  return { resetEnemies, alertSquad, moveEnemy, beginBossAttack, updateSorter, updateEnemies };
}
