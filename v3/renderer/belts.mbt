///|
priv struct BeltSegment {
  mesh : @three.InstancedMesh
  travel : Double
  rollers : Array[(@three.Object3D, @three.Quaternion)]
  heaters : Array[@three.Object3D]
}

///|
priv struct BeltVisual {
  body : @sim.Belt
  segments : Array[BeltSegment]
  mut phase : Double
}

///|
fn instanced(node : @three.Object3D) -> @three.InstancedMesh = "%identity"

///|
fn belts(
  nodes : Map[String, @three.Object3D],
  game : @sim.Game,
) -> Array[BeltVisual] {
  let sizes = belt_segments()
  game.belts.mapi(fn(i, body) {
    let segments : Array[BeltSegment] = []
    for j, (travel, heat_count) in sizes[i] {
      let prefix = "world/belts/\{i}/segments/\{j}"
      if nodes.get(prefix + "/mesh") is Some(node) {
        let rollers : Array[(@three.Object3D, @three.Quaternion)] = []
        for k in 0..<2 {
          if nodes.get(prefix + "/rollers/\{k}") is Some(node) {
            node.set_matrix_auto_update(true)
            rollers.push((node, node.quaternion().clone()))
          }
        }
        let heaters : Array[@three.Object3D] = []
        for k in 0..<heat_count {
          if nodes.get(prefix + "/heaters/\{k}") is Some(node) {
            heaters.push(node)
          }
        }
        segments.push({ mesh: instanced(node), travel, rollers, heaters, })
      }
    }
    { body, segments, phase: 0, }
  })
}

///|
pub fn View::update_belts(self : View, game : @sim.Game, dt : Double) -> Unit {
  let matrix = @three.Matrix4::Matrix4()
  let rotation = @three.Quaternion::Quaternion()
  let axis = @three.Vector3::Vector3(0, 1, 0)
  for belt in self.belts {
    let b = belt.body
    let d = b.deck
    if @sim.Vec2::{
        x: game.player.x - d.rect.x - d.rect.w / 2,
        z: game.player.z - d.rect.z - d.rect.d / 2,
      }.length() >
      80 + Double::max(d.rect.w, d.rect.d) / 2 {
      continue
    }
    let stopped = (b.stop is Some(id) && game.progress.has(id)) ||
      (
        b.owner is Some(id) &&
        game.enemies.iter().find_first(fn(e) { e.definition.id == id })
        is Some(e) &&
        (e.hp <= 0 || (b.part is Some(i) && e.parts[i].hp <= 0))
      )
    let released = b.release is Some(id) && game.progress.has(id)
    let horizontal = b.velocity.x != 0
    if !stopped {
      let speed = if released {
        -4.0
      } else if horizontal {
        b.velocity.x
      } else {
        b.velocity.z
      }
      belt.phase += dt *
        speed *
        (1.0 + d.rise / d.rect.d * (d.rise / d.rect.d)).sqrt()
    }
    for segment in belt.segments {
      let count = segment.mesh.count()
      for i in 0..<count {
        let travel = segment.travel
        let along = (
            (i.to_double() * travel / count.to_double() + belt.phase) % travel +
            travel
          ) %
          travel -
          travel / 2
        matrix.make_translation(
          if horizontal {
            along
          } else {
            0
          },
          0.15,
          if horizontal {
            0
          } else {
            along
          },
        )
        |> ignore
        segment.mesh.set_matrix_at(i, matrix)
      }
      segment.mesh.mark_needs_update()
      rotation.set_from_axis_angle(axis, -belt.phase / 0.22) |> ignore
      for (node, mount) in segment.rollers {
        node.quaternion().copy(mount).multiply(rotation) |> ignore
      }
      for lamp in segment.heaters {
        color(lamp, if released || stopped { 0x829185 } else { 0xffa05a })
      }
    }
  }
}
