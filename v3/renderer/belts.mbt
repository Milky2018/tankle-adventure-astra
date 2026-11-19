///|
priv struct Roller {
  node : @core.Object3D
  mount : @m3.Quaternion
  instance : (@core.Object3D, Int32)?
}

///|
priv struct BeltSegment {
  mesh : @core.Object3D
  travel : Double
  rollers : Array[Roller]
  heaters : Array[@core.Object3D]
}

///|
priv struct BeltVisual {
  body : @sim.Belt
  segments : Array[BeltSegment]
  mut phase : Double
}

///|
fn belts(
  nodes : Map[String, @core.Object3D],
  game : @sim.Game,
) -> Array[BeltVisual] {
  let sizes = belt_segments()
  game.belts.map(fn(body) {
    let segments : Array[BeltSegment] = []
    for j, (travel, heat_count) in sizes.get(body.deck.id).unwrap() {
      let prefix = "world/belts/\{body.deck.id}/segments/\{j}"
      if nodes.get(prefix + "/mesh") is Some(node) {
        let rollers : Array[Roller] = []
        for k in 0..<2 {
          if nodes.get(prefix + "/rollers/\{k}") is Some(node) {
            node.matrix_auto_update = true
            let instance = nodes
              .get(metadata_string(node.user_data, "rollerBatch"))
              .map(fn(batch) { (batch, node.user_data.get("instance").cast()) })
            rollers.push({ node, mount: node.quaternion.clone(), instance, })
          }
        }
        let heaters : Array[@core.Object3D] = []
        for k in 0..<heat_count {
          if nodes.get(prefix + "/heaters/\{k}") is Some(node) {
            heaters.push(node)
          }
        }
        segments.push({ mesh: node, travel, rollers, heaters, })
      }
    }
    { body, segments, phase: 0, }
  })
}

///|
fn View::update_belts(self : View, game : @sim.Game, dt : Double) -> Unit {
  let matrix = @m3.Matrix4::new()
  let rotation = @m3.Quaternion::new(0, 0, 0, 1)
  let axis = @m3.Vector3::new(0, 1, 0)
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
    let motion = b.motion(game.enemies, game.progress)
    let velocity = motion.velocity()
    let horizontal = b.velocity.x != 0
    let speed = if horizontal { velocity.x } else { velocity.z }
    belt.phase += dt *
      speed *
      (1.0 + d.rise / d.rect.d * (d.rise / d.rect.d)).sqrt()
    for segment in belt.segments {
      guard segment.mesh.kind is Mesh({ count, kind: InstancedMesh(data), .. }) else {
        continue
      }
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
        segment.mesh.set_matrix_at(i, matrix) |> ignore
      }
      data.instance_matrix.set_needs_update(true)
      rotation.set_from_axis_angle(axis, -belt.phase / 0.22) |> ignore
      for roller in segment.rollers {
        roller.node.quaternion.copy(roller.mount).multiply(rotation) |> ignore
        if roller.instance is Some((batch, index)) &&
          roller.node.parent is Some(segment_root) {
          roller.node.update_matrix()
          matrix.multiply_matrices(segment_root.matrix, roller.node.matrix)
          |> ignore
          batch.set_matrix_at(index, matrix) |> ignore
          if batch.kind is Mesh({ kind: InstancedMesh(instances), .. }) {
            instances.instance_matrix.set_needs_update(true)
          }
        }
      }
      for lamp in segment.heaters {
        color(lamp, if motion is @sim.Powered(_) { 0xffa05a } else { 0x829185 })
      }
    }
  }
}
