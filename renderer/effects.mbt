///|
priv enum ParticleKind {
  Spark
  Dust
  ShockRing
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
  jets : EffectBatch
  jet_time : @core.Uniform
  strokes : EffectBatch
  light : EffectBatch
  dust : EffectBatch
  particles : Array[FireParticle]
  mine_hulls : EffectBatch
  mine_caps : EffectBatch
}

///|
fn Effects::new(scene : @core.Object3D) -> Effects {
  let plane = @geometries.PlaneGeometry::new()
  fn casting(profile : Array[(Double, Double)]) -> @core.BufferGeometry {
    @geometries.LatheGeometry::new(
      points=profile.map(fn(p) { @m3.Vector2::new(p.0, p.1) }),
      segments=12,
    )
  }
  let iron = @core.MeshStandardMaterial::new()
  iron.roughness = Some(0.68)
  iron.metalness = Some(0.28)
  iron.flat_shading = Some(true)
  let jet_time = @core.Uniform::new(Number(0))
  {
    jet_time,
    jets: EffectBatch::new(
      scene,
      @geometries.PlaneGeometry::new(width_segments=40),
      heat_jet_material(jet_time),
    ),
    strokes: EffectBatch::new(
      scene,
      @geometries.BoxGeometry::new(),
      basic_material(0xffffff),
    ),
    light: EffectBatch::new(scene, plane, puff_material(dust=false)),
    dust: EffectBatch::new(scene, plane, puff_material(dust=true)),
    particles: [],
    mine_hulls: EffectBatch::new(
      scene,
      casting([
        (0.0, 0.03),
        (0.84, 0.03),
        (1.05, 0.16),
        (1.05, 0.28),
        (0.86, 0.32),
        (0.91, 0.45),
        (0.83, 0.56),
        (0.42, 0.56),
        (0.32, 0.64),
        (0.31, 0.74),
        (0.0, 0.74),
      ]),
      iron,
    ),
    mine_caps: EffectBatch::new(
      scene,
      casting([
        (0.83, 0.47),
        (0.92, 0.47),
        (0.92, 0.51),
        (0.76, 0.59),
        (0.60, 0.59),
        (0.60, 0.55),
      ]),
      basic_material(0xffffff),
    ),
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
  let muzzle = self.visible_muzzle(game.player)
  effects.enemy_signals(game)
  for i, b in game.laser_path {
    let from = if i == 0 && b.from.distance(b.to) > b.from.distance(muzzle) {
      muzzle
    } else {
      b.from
    }
    let focused = b.live && game.player.upgrades.laser
    if focused {
      let ray = vector(b.to.sub(from))
      let side = point(
        ray.cross(self.camera().position.clone().sub(vector(from))).normalize(),
      ).scale(0.077)
      for sign in [-1.0, 1.0] {
        let offset = side.scale(sign)
        strokes.stroke(from.add(offset), b.to.add(offset), 0.062, 0xffa255)
      }
    }
    strokes.stroke(
      from,
      b.to,
      if focused {
        0.12
      } else if b.live {
        0.071
      } else {
        0.023
      },
      if focused {
        0xffffed
      } else if b.live {
        0xffefbc
      } else {
        0xb2aa88
      },
    )
    if b.live {
      if i == 0 {
        let size = if focused { 2.0 } else { 1.25 }
        effects.light.puff(from, size, size, 0.95, 0xffc374)
      }
      if b.contact {
        let surface = b.to.lerp(from, 0.001)
        let size = 1.65 + 0.14 * @math.sin(game.time * 35)
        effects.light.puff(surface, size, size, 1.0, 0xffb75b)
      }
    }
  }
  if game.magnet_end is Some(end) {
    let locked = game.magnet_lock is Some(_)
    let warm = game.player.overheated
    let hue = if warm { 0xe48442 } else if locked { 0x70ddff } else { 0x5688a4 }
    for i, pole in self.player_visual.equipment.poles {
      let start = point(pole.local_to_world(@m3.Vector3::new(0, 0, 0.44)))
      let span = end.sub(start)
      let side = if i == 0 { -1.0 } else { 1.0 }
      let lateral = @sim.Vec2::{ x: span.z, z: -span.x, }
      let width = side *
        Double::min(0.7, span.length() * 0.06) /
        Double::max(0.01, lateral.length())
      let mut last = start
      for j in 1..<=12 {
        let t = j.to_double() / 12
        let arc = @math.sin(t * @math.PI)
        let next = start
          .lerp(end, t)
          .add({
            x: lateral.x * width * arc,
            y: arc * (0.12 + 0.11 * @math.sin(game.time * 12 + t * 9 + side)),
            z: lateral.z * width * arc,
          })
        strokes.stroke(last, next, if locked { 0.065 } else { 0.028 }, hue)
        last = next
      }
      effects.light.puff(start, 0.5, 0.5, 0.7, hue)
    }
    if locked {
      let head = point(
        self.player_visual.equipment.winch.local_to_world(
          @m3.Vector3::new(1.03, 2, 1.56),
        ),
      )
      for i in 0..<3 {
        let t = (game.time * 1.8 + i.to_double() / 3) % 1
        effects.light.puff(end.lerp(head, t), 0.65, 0.65, 0.85, 0xd3faff)
      }
      effects.light.puff(end, 1.3, 1.3, 0.9, hue)
    }
  }
  if game.player.weapon == @sim.Mortar &&
    game.player.hp > 0 &&
    game.ending_at is None {
    let (points, hit, blocked) = game.predict_mortar(
      queries,
      self.weapon_origin(),
      aim,
    )
    self.mortar_scope.contact = hit.map(fn(h) { h.point })
    self.mortar_scope.blocked = blocked
    let hue = if blocked { 0xffad62 } else { 0xffe4a9 }
    for i in 1..<points.length() {
      let start = points[i - 1]
      let end = points[i]
      strokes.stroke(
        start,
        start.lerp(end, if end.y < start.y { 0.53 } else { 0.96 }),
        0.045,
        hue,
      )
    }
    if hit is Some(hit) {
      let center = hit.point.add({ x: 0, y: 0.07, z: 0, })
      for i in 0..<24 {
        let a = i.to_double() * @math.PI / 12
        let b = a + @math.PI / 18
        strokes.stroke(
          center.add({ x: @math.cos(a) * 3, y: 0, z: @math.sin(a) * 3, }),
          center.add({ x: @math.cos(b) * 3, y: 0, z: @math.sin(b) * 3, }),
          0.045,
          hue,
        )
      }
    }
  }
  for mine in game.mines {
    if mine.disarmed {
      continue
    }
    let p = mine.position
    effects.mine_hulls.pose.position.set(p.x, p.y, p.z) |> ignore
    effects.mine_hulls.put(0x457b95)
    let left = p.add({ x: -0.30, y: 0.91, z: 0, })
    let right = p.add({ x: 0.30, y: 0.91, z: 0, })
    strokes.stroke(left, p.add({ x: -0.32, y: 0.60, z: 0, }), 0.13, 0x76bbc8)
    strokes.stroke(left, right, 0.13, 0x76bbc8)
    strokes.stroke(right, p.add({ x: 0.32, y: 0.60, z: 0, }), 0.13, 0x76bbc8)
    effects.mine_caps.pose.position.set(p.x, p.y, p.z) |> ignore
    effects.mine_caps.put(
      if mine.trigger > 0 {
        0xffefe0
      } else if mine.age > 1 {
        0xff7948
      } else {
        0xfbc368
      },
    )
  }
  effects.mine_hulls.finish()
  effects.mine_caps.finish()
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
  if game.effects.any(fn(event) { event is @sim.Fired(_, _) }) {
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
    if (game.player.weapon == @sim.Cannon && game.player.upgrades.cannon) ||
      (game.player.weapon == @sim.Mortar && game.player.upgrades.mortar) {
      emit(
        Flare,
        muzzle.add(forward.scale(0.70)),
        forward.scale(5),
        0.073,
        2.05,
        0xffffe5,
      )
      emit(Spark, muzzle, forward.scale(33), 0.083, 0.19, 0xfff2b2)
    }
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
      @sim.EnemyFired(p, _) => emit(Flare, p, up.scale(0), 0.085, 2.1, 0xffac4b)
      @sim.Chips(p, n) | @sim.Ricochet(p, n) => shower(p, n, false)
      @sim.ReinforcedStrike(p, normal, @sim.Mortar) =>
        emit(
          ShockRing,
          p.add(normal.scale(0.075)),
          normal,
          0.27,
          2.35,
          0xffcd80,
        )
      @sim.ReinforcedStrike(p, normal, _) =>
        for i in 0..<4 {
          let angle = i.to_double() * 2.4
          let spray = normal
            .scale(9 + i.to_double())
            .add({ x: 2.7 * @math.cos(angle), y: 2, z: 2.7 * @math.sin(angle), })
          emit(Spark, p, spray, 0.15 + 0.02 * i.to_double(), 0.077, 0xffefbf)
        }
      @sim.Armored(p) => shower(p, up, false)
      @sim.Impact(p, blast) => shower(p, up, blast)
      @sim.Killed(i, _) => {
        let center = game.enemies[i].position().add(up)
        shower(center, up, true)
        for j in 0..<5 {
          let angle = j.to_double() * 2.4
          emit(
            Dust,
            center,
            {
              x: @math.cos(angle) * 0.75,
              y: 1.8 + j.to_double() * 0.25,
              z: @math.sin(angle) * 0.75,
            },
            1.1 + j.to_double() * 0.18,
            1.4,
            0x514b45,
          )
        }
      }
      _ => ()
    }
  }
  for shot in game.shots {
    if shot.owner is Some(_) || shot.delay > 0 {
      continue
    }
    let bright = shot.reinforced()
    if shot.mortar {
      let tail = @sim.mortar_position(
        shot.origin,
        shot.target,
        Double::max(0, shot.age - 0.035),
        shot.duration,
        shot.arc,
      )
      strokes.stroke(
        tail,
        shot.position,
        if bright {
          0.14
        } else {
          0.085
        },
        if bright {
          0xffecc0
        } else {
          0xffcf8a
        },
      )
    } else {
      let tail = shot.position.sub(
        shot.direction.scale(Double::min(shot.distance, 2.6)),
      )
      strokes.stroke(
        tail,
        shot.position,
        if bright {
          0.11
        } else {
          0.065
        },
        if bright {
          0xffedab
        } else {
          0xffce7c
        },
      )
    }
  }
  effects.particles.retain(fn(p) { game.time - p.start < p.duration })
  for p in effects.particles {
    let t = game.time - p.start
    let life = 1.0 - t / p.duration
    let pos = p.origin.add(p.velocity.scale(t))
    match p.kind {
      ShockRing => {
        let normal = vector(p.velocity)
        let axis = if p.velocity.y.abs() < 0.85 {
          vector(up)
        } else {
          @m3.Vector3::new(1, 0, 0)
        }
        let u = point(axis.cross(normal).normalize())
        let v = point(normal.cross(vector(u)))
        let radius = p.size * (1 - life * life)
        fn rim(i : Int32) -> @sim.Vec3 {
          let angle = i.to_double() * @math.PI / 10
          p.origin
          .add(u.scale(@math.cos(angle) * radius))
          .add(v.scale(@math.sin(angle) * radius))
        }
        for i in 0..<20 {
          strokes.stroke(rim(i), rim(i + 1), 0.095 * life, p.hue)
        }
      }
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
