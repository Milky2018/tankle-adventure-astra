///|
priv enum ParticleKind {
  Spark
  Dust
  Flare
}

///|
priv struct FireParticle {
  kind : ParticleKind
  origin : @sim.Vec3
  velocity : @sim.Vec3
  start : Double
  duration : Double
  size : Double
  hue : Int32
}

///|
priv struct Effects {
  strokes : EffectBatch
  light : EffectBatch
  dust : EffectBatch
  mut mortar_guide_after : Double
  particles : Array[FireParticle]
  mines : Map[Int32, @core.Object3D]
  sphere : @core.BufferGeometry
  red : @core.Material
}

///|
fn Effects::new(scene : @core.Object3D) -> Effects {
  let plane = @geometries.PlaneGeometry::new()
  {
    strokes: EffectBatch::new(
      scene,
      @geometries.BoxGeometry::new(),
      basic_material(0xffffff),
    ),
    light: EffectBatch::new(scene, plane, puff_material(dust=false)),
    dust: EffectBatch::new(scene, plane, puff_material(dust=true)),
    particles: [],
    mortar_guide_after: -1,
    mines: {},
    sphere: @geometries.SphereGeometry::new(
      radius=1,
      width_segments=10,
      height_segments=8,
    ),
    red: basic_material(0xff6846),
  }
}

///|
fn View::update_effects(
  self : View,
  game : @sim.Game,
  aim : @sim.Vec3,
  queries : @sim.Queries,
) -> Unit {
  let effects = self.effects
  let strokes = effects.strokes
  let muzzle = point(self.barrel.local_to_world(@m3.Vector3::new(0, 0, 2.65)))
  for b in game.beams {
    strokes.stroke(
      b.origin,
      b.origin.add(b.direction.scale(b.length)),
      b.width,
      0xff6c42,
    )
  }
  for i, b in game.laser_path {
    let from = if i == 0 && b.from.distance(b.to) > b.from.distance(muzzle) {
      muzzle
    } else {
      b.from
    }
    strokes.stroke(
      from,
      b.to,
      if b.live {
        0.071
      } else {
        0.023
      },
      if b.live {
        0xffefbc
      } else {
        0xb2aa88
      },
    )
    if b.live {
      if i == 0 {
        effects.light.puff(from, 1.25, 1.25, 0.95, 0xffc374)
      }
      if b.contact {
        let surface = b.to.lerp(from, 0.001)
        let size = 1.65 + 0.14 * @math.sin(game.time * 35)
        effects.light.puff(surface, size, size, 1.0, 0xffb75b)
      }
    }
  }
  if game.magnet_end is Some(end) {
    strokes.stroke(
      game.player.position().add({ x: 0, y: 2, z: 0, }),
      end,
      0.09,
      if game.player.overheated {
        0xff6846
      } else {
        0x86d5ef
      },
    )
  }
  if game.player.weapon == @sim.Mortar &&
    game.shots.any(fn(s) { s.mortar && s.owner is None }) {
    effects.mortar_guide_after = game.time + 0.16
  }
  if game.player.weapon == @sim.Mortar &&
    game.player.hp > 0 &&
    game.ending_at is None &&
    game.time > effects.mortar_guide_after {
    let (points, hit, blocked) = game.predict_mortar(
      queries,
      self.weapon_origin(),
      aim,
    )
    let hue = if blocked { 0xffad62 } else { 0xffe4a9 }
    let recovery = @sim.clamp(
      (game.time - effects.mortar_guide_after) / 0.20,
      0,
      1,
    )
    for i in 1..<points.length() {
      let start = points[i - 1]
      let end = points[i]
      strokes.stroke(
        start,
        start.lerp(end, if end.y < start.y { 0.53 } else { 0.96 }),
        0.045 * recovery,
        hue,
      )
    }
    if hit is Some(hit) {
      let center = game
        .ground_target(queries, hit.point.add({ x: 0, y: 0.15, z: 0, }))
        .add({ x: 0, y: 0.07, z: 0, })
      for i in 0..<24 {
        let a = i.to_double() * @math.PI / 12
        let b = a + @math.PI / 18
        strokes.stroke(
          center.add({ x: @math.cos(a) * 3, y: 0, z: @math.sin(a) * 3, }),
          center.add({ x: @math.cos(b) * 3, y: 0, z: @math.sin(b) * 3, }),
          0.045 * recovery,
          hue,
        )
      }
    }
  }
  let active : Set[Int32] = Set([])
  for m in game.mines {
    active.add(m.id) |> ignore
    let mesh = match effects.mines.get(m.id) {
      Some(mesh) => mesh
      None => {
        let mesh = @core.Mesh::new(
          geometry=effects.sphere,
          material=Single(effects.red),
        )
        self.scene.add(mesh) |> ignore
        effects.mines[m.id] = mesh
        mesh
      }
    }
    mesh.position.set(m.position.x, m.position.y + 0.3, m.position.z) |> ignore
    mesh.scale.set(0.6, 0.25, 0.6) |> ignore
    mesh.update_matrix_world(force=true)
  }
  let gone : Array[Int32] = []
  for id, mesh in effects.mines {
    if !active.contains(id) {
      mesh.remove_from_parent() |> ignore
      gone.push(id)
    }
  }
  for id in gone {
    effects.mines.remove(id)
  }
  let up = @sim.Vec3::{ x: 0, y: 1, z: 0, }
  fn emit(
    kind : ParticleKind,
    origin : @sim.Vec3,
    velocity : @sim.Vec3,
    duration : Double,
    size : Double,
    hue : Int32,
  ) -> Unit {
    effects.particles.push({
      kind,
      origin,
      velocity,
      start: game.time,
      duration,
      size,
      hue,
    })
  }
  fn shower(p : @sim.Vec3, normal : @sim.Vec3, blast : Bool) -> Unit {
    let count = if blast { 14 } else { 8 }
    for i in 0..<count {
      let angle = i.to_double() * 2.4 + game.time
      let speed = 3.0 + (i % 5).to_double() * 1.6
      let outward = @sim.Vec3::{
        x: @math.cos(angle),
        y: 0.22 + (i % 3).to_double() * 0.23,
        z: @math.sin(angle),
      }
      let drift = outward.scale(speed)
      emit(
        Spark,
        p,
        drift.add(normal.scale(if blast { 1 } else { 4 })),
        0.22 + 0.027 * i.to_double(),
        0.051,
        if i % 3 == 0 {
          0xffefad
        } else {
          0xffac4e
        },
      )
      if blast && i % 2 == 0 {
        emit(
          Dust,
          p.add(up.scale(0.18)),
          drift.scale(0.62),
          0.63 + 0.021 * i.to_double(),
          2.1,
          if i % 4 == 0 {
            0xb7a082
          } else {
            0x948574
          },
        )
      }
    }
    emit(
      Flare,
      p.add(normal.scale(0.06)),
      up.scale(0),
      if blast {
        0.19
      } else {
        0.12
      },
      if blast {
        5.4
      } else {
        2.2
      },
      0xffad53,
    )
  }
  if game.time == game.player.last_shot {
    let forward = point(
      self.barrel.get_world_direction(@m3.Vector3::new(0, 0, 1)),
    )
    emit(
      Flare,
      muzzle.add(forward.scale(0.42)),
      forward.scale(3),
      0.095,
      if game.player.weapon == @sim.Mortar {
        4.5
      } else {
        4.0
      },
      0xffba5c,
    )
    let side = @sim.Vec3::{ x: forward.z, y: 0, z: -forward.x, }.normalized()
    for i in 0..<5 {
      let angle = i.to_double() * 2.4 + game.time * 3
      let jet = side
        .scale(@math.cos(angle) * 12)
        .add(up.scale(@math.sin(angle) * 10))
        .add(forward.scale(15))
      emit(
        Spark,
        muzzle.add(forward.scale(0.55)),
        jet,
        0.09 + i.to_double() * 0.006,
        0.048,
        0xffd384,
      )
    }
    emit(Dust, muzzle, forward.scale(2.5).add(up), 0.29, 0.72, 0xb0a58e)
  }
  for event in game.effects {
    match event {
      @sim.Chips(p, n) | @sim.Ricochet(p, n) => shower(p, n, false)
      @sim.Armored(p) => shower(p, up, false)
      @sim.Impact(p, blast) => shower(p, up, blast)
      @sim.Killed(i) => shower(game.enemies[i].position().add(up), up, true)
      _ => ()
    }
  }
  for shot in game.shots {
    if shot.owner is Some(_) || shot.delay > 0 {
      continue
    }
    if shot.mortar {
      let tail = @sim.mortar_position(
        shot.origin,
        shot.target,
        Double::max(0, shot.age - 0.035),
        shot.duration,
        shot.arc,
      )
      strokes.stroke(tail, shot.position, 0.085, 0xffcf8a)
    } else {
      let tail = shot.position.sub(
        shot.direction.scale(Double::min(shot.distance, 2.6)),
      )
      strokes.stroke(tail, shot.position, 0.065, 0xffce7c)
    }
  }
  effects.particles.retain(fn(p) { game.time - p.start < p.duration })
  for p in effects.particles {
    let t = game.time - p.start
    let life = 1.0 - t / p.duration
    let pos = p.origin.add(p.velocity.scale(t))
    match p.kind {
      Flare =>
        effects.light.puff(
          pos,
          p.size * (0.5 + life),
          p.size * life,
          life,
          p.hue,
        )
      Dust => {
        let width = p.size * (0.45 + 1.7 * (1 - life))
        effects.dust.puff(pos, width, width * 0.63, life, p.hue)
      }
      Spark => {
        let tip = pos.sub(up.scale(7 * t * t))
        let tail = tip.sub(p.velocity.sub(up.scale(14 * t)).scale(0.055 * life))
        strokes.stroke(tail, tip, p.size * (0.4 + life), p.hue)
      }
    }
  }
  strokes.finish()
  effects.light.finish()
  effects.dust.finish()
}
