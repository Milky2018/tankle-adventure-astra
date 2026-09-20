import { mortarPosition, mortarGroundTarget, MORTAR_MAX_AGE } from './folded-ballistics.js';
import * as T from 'three';
import { BOSS_ARENAS } from './folded-boss-arenas.js';
import { steerSeeker } from './folded-bosses.js';
import { cityDamage, armorAbsorbs, beginPlayerHit } from './folded-combat.js';
import { refugeAt, refugeRayDistance } from './folded-refuges.js';
import { BARRAGE, RAIL } from './folded-attacks.js';
import { MORTAR } from './abilities.js';
import { damagePlayer } from './mechanics.js';
import { foldedSupport } from './folded-layout.js';
import { C, ring, mat } from './world.js';
import { SIGNAL } from './folded-visibility.js';
import { CANNON, HOSTILE_DAMAGE, hostileShotDamage, hostileBlastDamage } from './folded-weapons.js';

// Combat uses the same world queries in the game and in renderer-free tests.
// The clock is supplied by the simulation; presentation and progression remain
// with their owners. Shots/mines are shared with weapons, arenas, and reset.
export function createFoldedCombat({
  player: p,
  world,
  state,
  scene,
  shots,
  mines,
  now,
  effects,
  events,
}) {
  const { burst, ripple, refugeImpact, rejectImpact, audio, projectile } = effects;
  const { alertSquad, save, setState, detonateMine, layMine } = events;
  function hurt(amount, source) {
    const time = now();
    if (!refugeAt(p, world.hives, state) && damagePlayer(p, amount, time)) {
      beginPlayerHit(p, time, source);
      events.hurt(time);
      audio.event('hurt');
      if (p.hp <= 0) {
        events.death(time);
        audio.event('death');
      }
    }
  }
  function castWeapon(origin, dir, distance, options) {
    const hit = world.cast(origin, dir, distance, options),
      boundary = refugeRayDistance(origin, dir, hit?.distance ?? distance, world.hives, state);
    return Number.isFinite(boundary)
      ? { point: origin.clone().addScaledVector(dir, boundary), distance: boundary, refuge: true }
      : hit;
  }
  function hitEnemy(e, damage, origin, kind = 'cannon', part = null) {
    const time = now();
    if (e.hp <= 0) return;
    if (BOSS_ARENAS.some((a) => a.id === e.id) && state.combatArena !== e.id) {
      e.armor = 0.2;
      if (time - (e.arenaRejectAt ?? -Infinity) > 0.15) {
        e.arenaRejectAt = time;
        rejectImpact(kind, e);
        burst(new T.Vector3(e.x, e.y + 1.5, e.z), C.lightYellow, 5);
      }
      return;
    }
    if (refugeAt(origin, world.hives, state) || refugeAt(e, world.hives, state)) return;
    alertSquad(e);
    const armored = armorAbsorbs(e, damage, origin, kind, part),
      dealt = cityDamage(e, damage, origin, kind, part);
    if (armored) {
      e.armor = 0.2;
      rejectImpact(kind, e);
      if (kind !== 'laser' || time - (e.sparkAt || 0) > 0.12) {
        burst(new T.Vector3(e.x, e.y + 1.5, e.z), C.lightYellow, 6);
        e.sparkAt = time;
      }
    } else if (kind !== 'laser') audio.event('hit', { position: e });
    e.hp = Math.max(0, e.hp - dealt);
    e.flash = 0.14;
    if (dealt > 0 && kind === 'mortar' && !e.persistent) e.stunnedUntil = time + 0.6;
    if (!e.hp) {
      e.deadAt = time;
      e.warning.visible = false;
      audio.event('explode', { position: e });
      burst(new T.Vector3(e.x, e.y + 1, e.z), C.orange, 14);
      if (e.persistent) {
        state[e.id] = true;
        world.signalRelease(e.id, time);
        if (e.id === 'prototype') state['overdrive-return'] = true;
        save();
      }
    }
  }
  function impact(hit, shot) {
    events.impact?.(hit, shot);
    if (hit.refuge) {
      refugeImpact(hit.point, shot.origin);
      return;
    }
    if (hit.blockedTarget && !shot.mortar) {
      burst(hit.point, 0xf5f1d7, 7);
      audio.event('armor', { position: hit.point });
      return;
    }
    // Start visibility rays outside the impacted face. Offsetting into a wall
    // skips its back face and lets explosions pass through single-sided meshes.
    const blastOrigin = hit.point.clone();
    if (shot.mortar && hit.face && hit.object)
      blastOrigin.addScaledVector(
        hit.face.normal.clone().transformDirection(hit.object.matrixWorld),
        0.05,
      );
    burst(hit.point, shot.hostile ? C.orange : C.yellow);
    if (shot.hostile) {
      if (shot.mineOwner) {
        const floor = foldedSupport(hit.point.x, hit.point.z, hit.point.y, false, world.lifts);
        if (floor) layMine({ id: shot.mineOwner, x: hit.point.x, y: floor.height, z: hit.point.z });
        return;
      }
      if (shot.mortar) {
        ripple(hit.point, BARRAGE.radius, C.orange, 0.6, 0.8);
        audio.event('explode', { position: hit.point });
        const delta = new T.Vector3(p.x, p.y + 1, p.z).sub(blastOrigin),
          distance = delta.length();
        if (
          distance < BARRAGE.radius &&
          !world.cast(blastOrigin, delta.normalize(), Math.max(0, distance - 0.8), {
            targets: false,
          })
        )
          hurt(shot.blastDamage ?? HOSTILE_DAMAGE.barrage, blastOrigin);
        for (const e of world.enemies)
          if (e.hp > 0 && e.id !== shot.owner) {
            for (const target of [e, ...e.parts.filter((part) => part.hp > 0)]) {
              const center = new T.Vector3(target.x, target.y + (target.model ? 1.5 : 0), target.z),
                path = center.sub(blastOrigin),
                length = path.length();
              if (
                length < BARRAGE.radius + (target === e ? e.radius : 0) &&
                !world.cast(blastOrigin, path.normalize(), Math.max(0, length - 0.2), {
                  targets: false,
                })
              )
                hitEnemy(
                  e,
                  HOSTILE_DAMAGE.friendlyBlast,
                  shot.origin,
                  'mortar',
                  target === e ? null : target,
                );
            }
          }
      } else if (hit.target) {
        const target = hit.target;
        hitEnemy(
          target.enemy || target,
          HOSTILE_DAMAGE.friendlyShot,
          shot.origin,
          'cannon',
          target.enemy ? target : null,
        );
      }
      return;
    }
    if (shot.mortar) {
      audio.event('explode', { position: hit.point });
      ripple(hit.point, MORTAR.radius, C.lightYellow, 0.5, 0.8);
      if (shot.upgraded) ripple(hit.point, MORTAR.radius * 0.8, 0xffffff, 0.35, 0.9);
      for (const e of world.enemies)
        if (
          e.hp > 0 &&
          new T.Vector3(e.x, e.y + 1.5, e.z).distanceTo(hit.point) < MORTAR.radius + e.radius
        ) {
          const center = new T.Vector3(e.x, e.y + 1.5, e.z),
            path = center.clone().sub(blastOrigin),
            length = path.length();
          if (
            !world.cast(blastOrigin, path.normalize(), Math.max(0, length - 0.2), {
              targets: false,
            })
          )
            hitEnemy(e, shot.damage ?? MORTAR.damage, shot.origin, 'mortar');
        }
      for (const e of world.enemies)
        if (e.hp > 0)
          for (const part of e.parts)
            if (part.hp > 0) {
              const to = new T.Vector3(part.x, part.y, part.z).sub(blastOrigin),
                distance = to.length();
              if (
                distance < MORTAR.radius &&
                !world.cast(blastOrigin, to.normalize(), Math.max(0, distance - 0.2), {
                  targets: false,
                })
              )
                hitEnemy(e, shot.damage ?? MORTAR.damage, shot.origin, 'mortar', part);
            }
      for (const c of world.controls)
        if (
          new T.Vector3(c.x, c.y, c.z).distanceTo(hit.point) < 2 &&
          (c.surface !== 'top' || blastOrigin.y >= c.y - 0.01)
        ) {
          const to = new T.Vector3(c.x, c.y, c.z).sub(blastOrigin),
            length = to.length();
          if (
            length < 0.0001 ||
            !world.cast(blastOrigin, to.normalize(), Math.max(0, length - 0.2), { targets: false })
          ) {
            c.flash = 0.2;
            setState(c.id, 'mortar');
          }
        }
    } else if (hit.target) {
      if (hit.target.kind === 'mine') detonateMine(hit.target);
      else if (hit.target.enemy || hit.target.model)
        hitEnemy(
          hit.target.enemy || hit.target,
          shot.damage ?? CANNON.damage,
          shot.origin,
          'cannon',
          hit.target.enemy ? hit.target : null,
        );
      else {
        hit.target.flash = 0.2;
        setState(hit.target.id, 'cannon');
      }
    }
  }
  function shootEnemy(
    e,
    offset = 0,
    source = null,
    target = e.lock,
    delay = 0,
    lob = false,
    options = {},
  ) {
    const origin = source
        ? new T.Vector3(source.x, source.y, source.z)
        : new T.Vector3(e.x, e.y + (e.type === 'boss' ? 4 : e.guardian ? 2.8 : 1.5), e.z),
      dir = target.clone().sub(origin).normalize();
    if (offset) dir.applyAxisAngle(new T.Vector3(0, 1, 0), offset);
    const mortar = lob || e.type === 'artillery' || e.type === 'miner',
      mesh = projectile(origin, dir, mortar, true, e.guardian || e.type === 'boss');
    if (mortar) {
      mesh.material.color.setHex(SIGNAL.magnet);
      target = mortarGroundTarget(target, (start, direction, range) =>
        world.cast(start, direction, range, { terrainOnly: true }),
      );
    }
    if (options.homing) {
      mesh.material.color.setHex(0xffb64a);
      mesh.scale.setScalar(1.8);
    }
    if (options.speed >= 30 && mesh.children[0]) mesh.children[0].scale.set(0.7, 0.7, 0.45);
    mesh.visible = delay <= 0;
    let marker = null;
    if (lob || e.type === 'artillery') {
      marker = ring(
        scene,
        BARRAGE.radius,
        0.12,
        target.x,
        target.y + 0.15,
        target.z,
        mat(C.red, true),
      );
    }
    shots.push({
      owner: e.id,
      marker,
      delay,
      duration: BARRAGE.duration,
      arc: e.type === 'boss' ? 10 : BARRAGE.height,
      range: e.id === 'keeper' ? 94 : e.type === 'sniper' ? RAIL.range : 55,
      mineOwner: e.type === 'miner' ? e.id : null,
      damage: hostileShotDamage(e, lob ? 'barrage' : options.homing ? 'seekers' : e.attack),
      blastDamage: mortar ? hostileBlastDamage(e) : null,
      speed:
        e.id === 'keeper'
          ? Math.max(15, origin.distanceTo(target) / 2.5)
          : e.type === 'sniper'
            ? RAIL.speed
            : 15,
      origin: origin.clone(),
      position: origin.clone(),
      dir,
      mesh,
      mortar,
      target: target.clone(),
      hostile: true,
      age: 0,
      distance: 0,
      ...options,
    });
    events.shot?.(e, lob);
    if (!options.silent)
      audio.event(
        mortar
          ? 'mortar'
          : options.homing
            ? 'seeker-shot'
            : e.type === 'sniper'
              ? 'rail-shot'
              : e.type === 'boss' || e.id === 'prototype'
                ? 'foundry-shot'
                : e.guardian
                  ? 'guard-shot'
                  : 'welder-shot',
        { position: e },
      );
  }
  function updateShots(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      let next;
      if (s.delay > 0 && s.sourcePart?.hp <= 0) s.captured = true;
      if (s.captured) {
        scene.remove(s.mesh);
        s.mesh.material.dispose();
        if (s.marker) {
          scene.remove(s.marker);
          s.marker.geometry.dispose();
          s.marker.material.dispose();
        }
        shots.splice(i, 1);
        continue;
      }
      if (s.delay > 0) {
        s.delay -= dt;
        continue;
      }
      s.age += dt;
      s.mesh.visible = true;
      if (s.homing) steerSeeker(s, p, dt);
      if (s.mortar) {
        next = mortarPosition(
          s.origin,
          s.target,
          s.age,
          s.duration || MORTAR.duration,
          s.arc || MORTAR.height,
        );
      } else
        next = s.position
          .clone()
          .addScaledVector(s.dir, dt * (s.hostile ? s.speed || 15 : CANNON.speed));
      const path = next.clone().sub(s.position),
        distance = path.length();
      let hit = castWeapon(s.position, path.clone().normalize(), distance, {
        targets: !s.hostile,
        extras: mines,
      });
      if (s.hostile && !s.mineOwner) {
        const ray = new T.Ray(s.position, path.clone().normalize());
        // Friendly bodies stop a shot before the player; machinery stays out of this query.
        for (const e of world.enemies)
          if (e.hp > 0 && e.id !== s.owner)
            for (const target of [e, ...e.parts.filter((part) => part.hp > 0)]) {
              const center = new T.Vector3(target.x, target.y + (target.model ? 1.5 : 0), target.z),
                point = ray.intersectSphere(new T.Sphere(center, target.radius), new T.Vector3());
              if (point) {
                const length = point.distanceTo(s.position);
                if (length <= distance && (!hit || length < hit.distance))
                  hit = { point, distance: length, target };
              }
            }
        const point = ray.intersectSphere(
          new T.Sphere(new T.Vector3(p.x, p.y + 1.2, p.z), 0.8),
          new T.Vector3(),
        );
        if (
          point &&
          point.distanceTo(s.position) <= distance &&
          (!hit || point.distanceTo(s.position) < hit.distance)
        ) {
          hurt(s.damage, s.position);
          hit = { point, distance: point.distanceTo(s.position) };
        }
      }
      s.distance += distance;
      if (
        hit ||
        (!s.mortar && s.distance > (s.hostile ? s.range || 55 : (s.range ?? CANNON.range))) ||
        s.age >= MORTAR_MAX_AGE
      ) {
        if (hit) impact(hit, s);
        scene.remove(s.mesh);
        s.mesh.material.dispose();
        if (s.marker) {
          scene.remove(s.marker);
          s.marker.geometry.dispose();
          s.marker.material.dispose();
        }
        shots.splice(i, 1);
      } else {
        s.position.copy(next);
        s.mesh.position.copy(next);
        s.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), path.normalize());
      }
    }
  }
  return { hurt, castWeapon, hitEnemy, impact, shootEnemy, updateShots };
}
