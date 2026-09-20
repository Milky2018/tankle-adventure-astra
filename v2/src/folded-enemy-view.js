import * as T from 'three';
import { C } from './world.js';
import { animateEnemy } from './folded-enemies.js';
import { bossBarrage } from './folded-bosses.js';
import { ENEMY_KINDS } from './folded-enemy-rules.js';
import { SORTER_REACH } from './folded-attacks.js';

export function createEnemyView({ world, project, getCamera, burst }) {
  function reset(e) {
    e.zone.visible = e.supportBeam.visible = false;
    if (e.batteryWarning) e.batteryWarning.visible = false;
    e.model.root.scale.copy(e.baseScale);
    e.model.root.rotation.z = 0;
    e.model.root.position.set(e.x, e.y, e.z);
    e.model.root.visible = e.hp > 0;
    e.warning.visible = false;
    for (const marker of e.barrageWarnings) marker.visible = false;
  }

  function showBossWarning(e) {
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
        const marker = e.barrageWarnings[i];
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
    e.batteryWarning.visible = points.length > 0;
    e.batteryWarning.geometry.setFromPoints(points);
    e.batteryWarning.geometry.setDrawRange(0, points.length);
  }

  function beam(e, origin, dir, length, width, trim = false) {
    const end = origin.clone().addScaledVector(dir, length);
    line(e, origin, end);
    if (trim) e.warning.geometry.setDrawRange(0, 2);
    e.flame.visible = true;
    e.flame.position.copy(origin).addScaledVector(dir, length / 2);
    e.flame.scale.set(width, length, width);
    e.flame.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().negate());
  }

  function sorterZone(e) {
    e.zone.visible = e.phase === 'warn';
    if (e.zone.visible) {
      e.zone.position.set(e.x, e.y + 0.12, e.z);
      e.zone.rotation.y = e.aim;
    }
  }

  function sorterArm(e, origin, dir, reach, angle) {
    e.warning.visible = true;
    e.warning.geometry.setFromPoints([origin, origin.clone().addScaledVector(dir, reach)]);
    e.warning.material.color.setHex(e.phase === 'warn' ? C.orange : C.red);
    e.model.arm.rotation.y = angle - e.aim;
    e.model.arm.scale.z = Math.max(0.1, reach / SORTER_REACH);
  }

  function clearWarnings(e) {
    e.warning.visible = e.zone.visible = e.supportBeam.visible = false;
    if (e.batteryWarning) e.batteryWarning.visible = false;
    if (e.charge) e.charge.root.visible = false;
    if (e.flame) e.flame.visible = false;
  }

  function deployment(e, time) {
    e.model.root.position.set(e.x, e.y, e.z);
    for (const marker of e.barrageWarnings) marker.visible = false;
    if (e.reserveFor) {
      e.model.root.visible = e.hp > 0;
      if (e.deployUntil)
        e.model.root.position.y = e.y - 1.8 * Math.max(0, (e.deployUntil - time) / 2);
    }
    if (e.deployment) {
      e.deployment.visible = e.hp > 0 && !e.awake;
      e.deployment.material.color.setHex(e.deploy ? C.lightYellow : C.metal);
      e.deployment.scale.setScalar(e.deploy ? 1 + Math.sin(time * 10) * 0.1 : 1);
    }
  }

  function collapse(e, time) {
    if (e.deadAt != null) {
      const collapse = Math.min(1, (time - e.deadAt) / 0.45);
      e.model.root.scale.y = e.baseScale.y * (1 - collapse * 0.7);
      e.model.root.rotation.z = collapse * 0.12;
      for (const { m, color } of e.materials)
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
      e.warning.visible = true;
      e.warning.geometry.setFromPoints(points);
      e.warning.geometry.setDrawRange(0, points.length);
    } else if (e.type === 'artillery') {
      e.zone.visible = true;
      e.zone.position.copy(e.lock);
      e.zone.position.y += 0.1;
      e.zone.scale.setScalar(1 + Math.sin(time * 14) * 0.06);
    } else if (e.type === 'repairer' && e.patient) {
      e.supportBeam.visible = true;
      e.supportBeam.geometry.setFromPoints([
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
      e.warning.visible = true;
      e.warning.geometry.setFromPoints(points);
      e.warning.geometry.setDrawRange(0, points.length);
    } else {
      e.warning.visible = true;
      e.warning.geometry.setFromPoints([origin, e.lock]);
      e.warning.geometry.setDrawRange(0, 2);
    }
    if (e.charge && e.attack !== 'cannon') {
      e.charge.root.visible = true;
      e.charge.root.position.set(e.x, e.y, e.z);
      e.charge.root.rotation.y = e.aim;
    }
  }

  function finish(e, time, dt, active) {
    e.model.root.position.set(e.x, e.y, e.z);
    e.model.turret.rotation.y = e.aim;
    e.model.body.rotation.y = e.aim;
    animateEnemy(e, time, dt, active);
    if (e.magneticShield) {
      e.model.frontArmor.visible = !e.shieldRemoved;
      e.model.frontArmor.position.z = 1.05 + e.shieldPull * 0.9;
      e.model.frontArmor.rotation.z = Math.sin(time * 40) * e.shieldPull * 0.1;
    }
  }

  function line(e, origin, end) {
    e.warning.visible = true;
    e.warning.geometry.setFromPoints([origin, end]);
  }

  function repair(e, origin, end) {
    e.supportBeam.visible = true;
    e.supportBeam.geometry.setFromPoints([origin, end]);
  }

  return {
    reset,
    showBossWarning,
    beam,
    sorterZone,
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
      e.model.root.visible = false;
    },
    hideWarning: (e) => {
      e.warning.visible = false;
    },
    roll: (e, amount) => e.model.rollWheels(amount),
    idle: (e, time, dt) => e.model.animate('idle', 0, time, dt, false),
    retractArm: (e, dt) => {
      e.model.arm.scale.z = T.MathUtils.damp(e.model.arm.scale.z, 0.28, 6, dt);
    },
    impact: (point, color, count) => burst(point, C[color], count),
  };
}
