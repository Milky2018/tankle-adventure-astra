import { AQUATIC, swims } from '../combat/aquatic.js';
import * as T from 'three';
import { C } from './factory-models.js';
import { animateEnemy } from './enemy-models.js';
import { bossBarrage } from '../combat/bosses.js';
import { ENEMY_KINDS } from '../combat/enemy-rules.js';
import { SORTER_REACH } from '../combat/attacks.js';

export function createEnemyView({ world, project, getCamera, burst }) {
  const visual = (enemy) => world.views.enemy(enemy);
  function reset(e) {
    const v = visual(e);
    v.zone.visible = v.supportBeam.visible = false;
    if (v.batteryWarning) v.batteryWarning.visible = false;
    if (v.siegeZone) v.siegeZone.visible = false;
    v.model.root.scale.copy(v.baseScale);
    v.model.root.rotation.z = 0;
    if (v.model.frontArmor) v.model.frontArmor.visible = true;
    v.model.root.position.set(e.x, e.y, e.z);
    v.model.root.visible = e.hp > 0;
    v.warning.visible = false;
    for (const marker of v.barrageWarnings) marker.visible = false;
  }

  function showBossWarning(e) {
    const v = visual(e);
    const origin = new T.Vector3(
        e.source?.x ?? e.x,
        e.source?.y ?? e.y + (e.type === 'boss' ? 4 : 2.8),
        e.source?.z ?? e.z,
      ),
      points = [];
    if (e.attack === 'barrage' || e.pattern.overlay) {
      const target = e.lock.clone();
      target.y = e.y + 0.05;
      const targets = bossBarrage(origin, target);
      for (let i = 0; i < targets.length; i++) {
        const marker = v.barrageWarnings[i];
        marker.visible = e.attack === 'barrage' || i === 1;
        marker.position.set(targets[i].x, e.y + 0.12, targets[i].z);
        marker.scale.setScalar(0.8 + 0.2 * (1 - e.timer / e.pattern.warn));
      }
    }
    if (e.attack !== 'barrage') {
      const lines =
        e.attack === 'seekers'
          ? [-1, 1].map((side) => ({
              start: new T.Vector3(
                e.x + Math.cos(e.aim) * side * 2,
                e.y + 1.2,
                e.z - Math.sin(e.aim) * side * 2,
              ),
              offsets: [side * 0.24],
            }))
          : (e.attack === 'batteries' ? e.volleySources : [null])
              .map((source, wave) =>
                source && source.hp <= 0
                  ? null
                  : {
                      start: source ? new T.Vector3(source.x, source.y, source.z) : origin,
                      offsets:
                        e.attack === 'sweep'
                          ? [-0.8, 0.8]
                          : e.pattern.offsets.map((offset) => offset + (wave ? 0.075 : 0)),
                    },
              )
              .filter(Boolean);
      for (const { start, offsets } of lines) {
        const target = e.lock.clone();
        if (e.attack === 'seekers') target.y = e.y + 1.2;
        const direction = target.sub(start).normalize();
        for (const offset of offsets) {
          const dir = direction.clone().applyAxisAngle(new T.Vector3(0, 1, 0), offset),
            reach = Math.max(30, start.distanceTo(e.lock) + 3),
            hit = world.cast(start, dir, reach, { targets: false });
          points.push(start, start.clone().addScaledVector(dir, hit?.distance ?? reach));
        }
      }
    }
    v.batteryWarning.visible = points.length > 0;
    v.batteryWarning.geometry.setFromPoints(points);
    v.batteryWarning.geometry.setDrawRange(0, points.length);
  }

  function beam(e, origin, dir, length, width, trim = false) {
    const v = visual(e);
    const end = origin.clone().addScaledVector(dir, length);
    line(e, origin, end);
    if (trim) v.warning.geometry.setDrawRange(0, 2);
    v.flame.visible = true;
    v.flame.position.copy(origin).addScaledVector(dir, length / 2);
    v.flame.scale.set(width, length, width);
    v.flame.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().negate());
  }

  function sorterZone(e) {
    const v = visual(e);
    v.zone.visible = e.phase === 'warn';
    if (v.zone.visible) {
      v.zone.position.set(e.x, e.y + 0.12, e.z);
      v.zone.rotation.y = e.aim;
    }
  }

  function sorterArm(e, origin, dir, reach, angle) {
    const v = visual(e);
    v.warning.visible = true;
    v.warning.geometry.setFromPoints([origin, origin.clone().addScaledVector(dir, reach)]);
    v.warning.material.color.setHex(e.phase === 'warn' ? C.orange : C.red);
    v.model.arm.rotation.y = angle - e.aim;
    v.model.arm.scale.z = Math.max(0.1, reach / SORTER_REACH);
  }

  function clearWarnings(e) {
    const v = visual(e);
    v.warning.visible = v.zone.visible = v.supportBeam.visible = false;
    if (v.batteryWarning) v.batteryWarning.visible = false;
    if (v.siegeZone) v.siegeZone.visible = false;
    if (v.charge) v.charge.root.visible = false;
    if (v.flame) v.flame.visible = false;
    if (v.model.flow) v.model.flow.visible = false;
  }

  function deployment(e, time) {
    const v = visual(e);
    v.model.root.position.set(e.x, e.y, e.z);
    for (const marker of v.barrageWarnings) marker.visible = false;
    if (e.reserveFor) {
      v.model.root.visible = e.hp > 0;
      if (e.deployUntil)
        v.model.root.position.y = e.y - 1.8 * Math.max(0, (e.deployUntil - time) / 2);
    }
    if (v.deployment) {
      v.deployment.visible = e.hp > 0 && !e.awake;
      v.deployment.material.color.setHex(e.deploy ? C.lightYellow : C.metal);
      v.deployment.scale.setScalar(e.deploy ? 1 + Math.sin(time * 10) * 0.1 : 1);
    }
  }

  function collapse(e, time) {
    const v = visual(e);
    if (e.deadAt != null) {
      const collapse = Math.min(1, (time - e.deadAt) / 0.45);
      v.model.root.scale.y = v.baseScale.y * (1 - collapse * 0.7);
      v.model.root.rotation.z = collapse * 0.12;
      for (const { m, color } of v.materials)
        m.color.copy(color).lerp(new T.Color(C.dark), collapse * 0.85);
    }
  }

  function readable(e, origin) {
    const camera = getCamera();
    const view = project(e.x, e.y + 1.5, e.z),
      cameraPath = origin.clone().sub(camera.position);
    return (
      view.visible &&
      !world.cast(camera.position, cameraPath.clone().normalize(), cameraPath.length() - 1.8, {
        targets: false,
        aiming: true,
      })
    );
  }

  function warn(e, origin, time) {
    const v = visual(e);
    if (e.id === 'prototype' && e.attack === 'cannon') {
      const points = [];
      for (const offset of [-0.18, 0, 0.18]) {
        const dir = e.lock
          .clone()
          .sub(origin)
          .normalize()
          .applyAxisAngle(new T.Vector3(0, 1, 0), offset);
        const length = Math.max(12, origin.distanceTo(e.lock));
        const hit = world.cast(origin, dir, length, { targets: false });
        points.push(
          origin.clone(),
          origin.clone().addScaledVector(dir, hit?.distance ?? length),
          origin.clone(),
        );
      }
      v.warning.visible = true;
      v.warning.geometry.setFromPoints(points);
      v.warning.geometry.setDrawRange(0, points.length);
    } else if (e.type === 'dredger') {
      suction(e, time);
    } else if (e.type === 'artillery') {
      v.zone.visible = true;
      v.zone.position.copy(e.lock);
      v.zone.position.y += 0.1;
      v.zone.scale.setScalar(1 + Math.sin(time * 14) * 0.06);
      if (v.siegeZone && e.secondLock) {
        v.siegeZone.visible = true;
        v.siegeZone.position.copy(e.secondLock);
        v.siegeZone.position.y += 0.1;
      }
    } else if (e.type === 'repairer' && e.patient) {
      v.supportBeam.visible = true;
      v.supportBeam.geometry.setFromPoints([
        origin,
        new T.Vector3(e.patient.x, e.patient.y + 1.5, e.patient.z),
      ]);
    } else if (e.type === 'welder') {
      const points = [origin.clone()];
      for (let i = 0; i <= 12; i++) {
        const angle = e.aim - 0.7 + (i * 1.4) / 12;
        const dir = new T.Vector3(Math.sin(angle), 0, Math.cos(angle));
        const hit = world.cast(origin, dir, ENEMY_KINDS.welder.reach, { targets: false });
        points.push(origin.clone().addScaledVector(dir, hit?.distance ?? ENEMY_KINDS.welder.reach));
      }
      points.push(origin.clone());
      v.warning.visible = true;
      v.warning.geometry.setFromPoints(points);
      v.warning.geometry.setDrawRange(0, points.length);
    } else {
      v.warning.visible = true;
      v.warning.geometry.setFromPoints([origin, e.lock]);
      v.warning.geometry.setDrawRange(0, 2);
    }
    if (v.charge && e.attack !== 'cannon') {
      v.charge.root.visible = true;
      v.charge.root.position.set(e.x, e.y, e.z);
      v.charge.root.rotation.y = e.aim;
    }
  }

  function suction(e, time) {
    const v = visual(e);
    const origin = new T.Vector3(e.x, e.y + 0.15, e.z),
      points = [origin.clone()];
    const reach = e.phase === 'bite' ? AQUATIC.biteReach : AQUATIC.suctionReach;
    for (let i = 0; i <= 12; i++) {
      const angle = e.aim - AQUATIC.suctionHalfAngle + (i * AQUATIC.suctionHalfAngle) / 6;
      const dir = new T.Vector3(Math.sin(angle), 0, Math.cos(angle));
      const hit = world.cast(origin.clone().setY(e.y + 0.6), dir, reach, { targets: false });
      const length = Math.min(reach, hit?.distance ?? reach);
      points.push(origin.clone().addScaledVector(dir, length));
      if (i < 12) {
        const chip = v.model.flow.children[i],
          t = (i / 12 + time * (e.phase === 'suction' ? 0.65 : 0.18)) % 1;
        const a = angle - e.aim,
          r = 2 + (length - 2) * (1 - t);
        chip.position.set(Math.sin(a) * r, 0.16, Math.cos(a) * r);
        chip.visible = length > 2;
        chip.rotation.y = a;
      }
    }
    points.push(origin.clone());
    v.warning.visible = v.model.flow.visible = true;
    v.warning.material.color.setHex(
      e.phase === 'bite' ? C.red : e.phase === 'suction' ? 0xc9e4d5 : C.orange,
    );
    v.warning.geometry.setFromPoints(points);
    v.warning.geometry.setDrawRange(0, points.length);
  }

  function finish(e, time, dt, active) {
    const v = visual(e);
    v.model.root.position.set(e.x, e.y, e.z);
    v.model.turret.rotation.y = e.aim;
    v.model.body.rotation.y = e.type === 'hunter' ? (e.travelHeading ?? e.aim) : e.aim;
    animateEnemy(e, v, time, dt, active);
    if (swims(e)) {
      v.model.wake.visible = !!e.afloat;
      if (e.afloat) v.model.root.position.y += Math.sin(time * 2.7 + e.x) * 0.055;
      for (const [i, jaw] of v.model.jaws.entries()) {
        const bite = Math.max(0, 1 - (time - (e.biteAt ?? -10)) / 0.35);
        jaw.position.x = (i ? 1 : -1) * (1.05 - 0.75 * bite);
        jaw.rotation.z = e.phase === 'bite' ? Math.sin(time * 24) * 0.08 : 0;
      }
      if (v.model.impeller) v.model.impeller.rotation.z += dt * (e.phase === 'suction' ? 16 : 2);
    }
    if (e.magneticShield) {
      v.model.frontArmor.visible = !e.shieldRemoved;
      v.model.frontArmor.position.z = (e.type === 'dredger' ? 1.85 : 1.05) + e.shieldPull * 0.9;
      v.model.frontArmor.rotation.z = Math.sin(time * 40) * e.shieldPull * 0.1;
    }
  }

  function line(e, origin, end) {
    const v = visual(e);
    v.warning.visible = true;
    v.warning.geometry.setFromPoints([origin, end]);
  }

  function repair(e, origin, end) {
    const v = visual(e);
    v.supportBeam.visible = true;
    v.supportBeam.geometry.setFromPoints([origin, end]);
  }

  return {
    reset,
    showBossWarning,
    beam,
    sorterZone,
    suction,
    sorterArm,
    clearWarnings,
    deployment,
    collapse,
    readable,
    warn,
    finish,
    line,
    repair,
    hide: (e) => {
      visual(e).model.root.visible = false;
    },
    hideWarning: (e) => {
      visual(e).warning.visible = false;
    },
    roll: (e, amount) => visual(e).model.rollWheels(amount),
    idle: (e, time, dt) => visual(e).model.animate('idle', 0, time, dt, false),
    retractArm: (e, dt) => {
      visual(e).model.arm.scale.z = T.MathUtils.damp(visual(e).model.arm.scale.z, 0.28, 6, dt);
    },
    impact: (point, color, count) => burst(point, C[color], count),
  };
}
