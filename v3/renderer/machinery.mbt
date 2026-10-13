///|
priv struct WallVisual {
  body : @sim.Solid
  mesh : @three.Object3D
  mut open : Double
}

///|
priv struct ControlVisual {
  body : @sim.Control
  root : @three.Object3D
  lamp : @three.Object3D?
  moving : @three.Object3D?
  cover : @three.Object3D?
  back : @three.Object3D?
  cover_base : @sim.Vec3
  cover_height : Double
  offset : @sim.Vec3
  wall : WallVisual?
  mut engaged : Double
}

///|
priv struct Machinery {
  obstacles : Array[(@sim.Solid, @three.Object3D, @sim.Vec3)]
  side_roots : Array[@three.Object3D?]
  side_handles : Array[(@three.Object3D?, @three.Object3D?)]
  walls : Array[WallVisual]
  controls : Array[ControlVisual]
  lifts : Array[(@sim.Lift, @three.Object3D)]
  mirrors : Array[(@sim.Mirror, @three.Object3D)]
  pickups : Array[
    (@sim.Pickup, @three.Object3D, @three.Object3D?, @three.Object3D?),
  ]
}

///|
extern "js" fn color(object : @three.Object3D, value : Int32) -> Unit =
  #| (object,value) => { if (object.material?.color) object.material.color.setHex(value); }

///|
fn Machinery::new(
  nodes : Map[String, @three.Object3D],
  game : @sim.Game,
) -> Machinery {
  fn get(path : String) -> @three.Object3D? {
    let result = nodes.get(path)
    if result is Some(node) {
      node.set_matrix_auto_update(true)
    }
    result
  }
  let walls : Array[WallVisual] = []
  for body in game.world.solids {
    if get("world/walls/\{body.circuit_key}/mesh") is Some(mesh) {
      walls.push({ body, mesh, open: 0, })
    }
  }
  let controls : Array[ControlVisual] = []
  for body in game.commands.controls {
    if get("world/controls/\{body.id}/root") is Some(node) {
      let wall = walls
        .iter()
        .find_first(fn(w) { Some(w.body.id) == body.mount })
      let offset = wall
        .map(fn(w) { body.position.sub(point(w.mesh.position())) })
        .unwrap_or({ x: 0, y: 0, z: 0, })
      let cover = get("world/controls/\{body.id}/cover")
      controls.push({
        body,
        root: node,
        lamp: get("world/controls/\{body.id}/lamp"),
        moving: get("world/controls/\{body.id}/moving"),
        cover,
        back: get("world/controls/\{body.id}/housing/0"),
        cover_base: cover
        .map(fn(o) { point(o.position()) })
        .unwrap_or({ x: 0, y: 0, z: 0, }),
        cover_height: cover
        .map(fn(o) {
          @three.Box3::Box3()
          .set_from_object(o)
          .get_size(@three.Vector3::Vector3(0, 0, 0))
          .y()
        })
        .unwrap_or(0),
        wall,
        offset,
        engaged: 0,
      })
    }
  }
  let lifts : Array[(@sim.Lift, @three.Object3D)] = []
  for body in game.world.lifts {
    if get("world/views/lifts/\{body.id}/root") is Some(node) {
      lifts.push((body, node))
    }
  }
  let mirrors : Array[(@sim.Mirror, @three.Object3D)] = []
  for body in game.mirrors {
    if get("world/views/mirrors/\{body.id}/root") is Some(node) {
      mirrors.push((body, node))
    }
  }
  let pickups : Array[
    (@sim.Pickup, @three.Object3D, @three.Object3D?, @three.Object3D?),
  ] = []
  for body in game.pickups {
    if get("world/views/pickups/\{body.id}/root") is Some(node) {
      pickups.push(
        (
          body,
          node,
          get("world/views/pickups/\{body.id}/item"),
          get("world/views/pickups/\{body.id}/cage"),
        ),
      )
    }
  }
  let obstacles : Array[(@sim.Solid, @three.Object3D, @sim.Vec3)] = []
  for body in game.world.obstacles {
    if get("obstacles/\{body.id}/root") is Some(node) {
      obstacles.push(
        (
          body,
          node,
          point(node.position()).sub({
            x: body.rect.x,
            y: body.y,
            z: body.rect.z,
          }),
        ),
      )
    }
  }
  let side_roots = Array::makei(31, fn(i) {
    get("world/sidePuzzles/roots/\{i}")
  })
  let side_handles = Array::makei(7, fn(i) {
    (
      get("world/sidePuzzles/targets/\{i}/handle"),
      get("world/sidePuzzles/targets/\{i}/lamp"),
    )
  })
  {
    walls,
    controls,
    lifts,
    mirrors,
    pickups,
    obstacles,
    side_roots,
    side_handles,
  }
}

///|
fn damp(value : Double, target : Double, speed : Double, dt : Double) -> Double {
  value + (target - value) * (1 - @math.exp(-speed * dt))
}

///|
fn Machinery::update(self : Machinery, game : @sim.Game, dt : Double) -> Unit {
  for (body, node, offset) in self.obstacles {
    node.set_position(
      vector(
        @sim.Vec3::{ x: body.rect.x, y: body.y, z: body.rect.z, }.add(offset),
      ),
    )
    if body.id == "rail-cart" {
      node.set_rotation_xyz(0, game.puzzles.rail.heading, 0)
    }
    node.update_matrix_world(true)
  }
  for i in 0..<2 {
    if self.side_roots[21 + i] is Some(tray) {
      tray.set_rotation_xyz(0, game.puzzles.gutter.rotations[i], 0)
      tray.update_matrix_world(true)
    }
    if self.side_roots[14 + i] is Some(blade) {
      blade.set_rotation_xyz(
        0,
        if game.puzzles.rail.switches[i] {
          if i == 0 {
            -@math.PI / 2
          } else {
            @math.PI
          }
        } else {
          0
        },
        0,
      )
      blade.update_matrix_world(true)
    }
  }
  if self.side_roots[29] is Some(plant) {
    plant.scale().set_y(0.12 + 0.88 * game.puzzles.gutter.fill) |> ignore
    plant.update_matrix_world(true)
  }
  for i, (handle, lamp) in self.side_handles {
    let lit = match i {
      0 => game.puzzles.rail.switches[0]
      1 => game.puzzles.rail.switches[1]
      2 | 3 => game.puzzles.rail.solved
      6 => game.puzzles.gutter.unplugged
      _ => game.puzzles.gutter.grown
    }
    if lamp is Some(lamp) {
      color(lamp, if lit { 0x9ad4ba } else { 0xebae57 })
    }
    if i == 6 && handle is Some(handle) {
      handle.set_visible(!game.puzzles.gutter.unplugged)
    }
  }
  for wall in self.walls {
    let b = wall.body
    wall.open = damp(
      wall.open,
      if b.active(game.progress) {
        0
      } else {
        1
      },
      9,
      dt,
    )
    wall.mesh.set_position_xyz(
      b.rect.x + b.rect.w / 2,
      b.y + b.h / 2 - wall.open * (b.h + 0.5),
      b.rect.z + b.rect.d / 2,
    )
    wall.mesh.set_visible(wall.open < 0.999)
    wall.mesh.update_matrix_world(true)
  }
  for c in self.controls {
    let b = c.body
    if c.wall is Some(wall) {
      let p = point(wall.mesh.position()).add(c.offset)
      b.position = p
      c.root.set_position(vector(p))
    }
    b.flash = Double::max(0, b.flash - dt)
    let active = game.commands.active(game.progress, b.id)
    let ready = active ||
      b.requires is None ||
      (
        b.requires is Some(id) &&
        game.progress.circuit_ready(id, b.circuit_key, b.id)
      )
    c.engaged = damp(c.engaged, if active { 1 } else { 0 }, 8, dt)
    if c.lamp is Some(lamp) {
      color(
        lamp,
        if !ready {
          0x243e39
        } else if b.flash > 0 {
          0xffedbe
        } else if active {
          0x9ad4ba
        } else if b.actions.contains(@sim.MagnetAction) {
          0x80bada
        } else {
          0xebae57
        },
      )
    }
    if b.actions.contains(@sim.LaserAction) && c.back is Some(back) {
      back
      .position()
      .set_y(damp(back.position().y(), if active { 2.6 } else { 0 }, 12, dt))
      |> ignore
    }
    if c.cover is Some(cover) {
      if b.mount is Some(_) {
        let scale = damp(
          cover.scale().y(),
          if ready {
            0.015
          } else {
            1
          },
          12,
          dt,
        )
        cover.scale().set_y(scale) |> ignore
        cover.position().set_y(-(1 - scale) * c.cover_height / 2) |> ignore
        cover
        .position()
        .set_z(
          damp(
            cover.position().z(),
            if ready {
              -0.4
            } else {
              c.cover_base.z
            },
            12,
            dt,
          ),
        )
        |> ignore
      } else if b.top {
        cover
        .position()
        .set_x(
          damp(
            cover.position().x(),
            c.cover_base.x + (if ready { 2.4 } else { 0 }),
            12,
            dt,
          ),
        )
        |> ignore
      } else {
        cover
        .position()
        .set_y(
          damp(
            cover.position().y(),
            c.cover_base.y + (if ready { c.cover_height + 0.35 } else { 0 }),
            12,
            dt,
          ),
        )
        |> ignore
      }
    }
    if c.moving is Some(moving) {
      if b.rotor {
        moving.set_rotation_xyz(0, 0, -@math.PI / 4 + c.engaged * @math.PI / 4)
      } else if b.actions.contains(@sim.MagnetAction) {
        moving.position().set_y(c.engaged * 0.55) |> ignore
      } else if b.actions.contains(@sim.LaserAction) ||
        b.actions.contains(@sim.Use) {
        moving.set_rotation_xyz(0, 0, c.engaged * @math.PI * 0.55)
      } else if b.top {
        moving.position().set_y(-c.engaged * 0.4) |> ignore
      } else {
        moving.position().set_z(-c.engaged * 0.3) |> ignore
      }
    }
    c.root.update_matrix_world(true)
  }
  for (body, node) in self.lifts {
    node.position().set_y(body.y) |> ignore
    node.update_matrix_world(true)
  }
  for (body, node) in self.mirrors {
    node
    .quaternion()
    .set_from_unit_vectors(vector({ x: 0, y: 0, z: 1, }), vector(body.normal()))
    |> ignore
    node.update_matrix_world(true)
  }
  for (body, node, item, cage) in self.pickups {
    node.position().set_y(body.position.y) |> ignore
    let unlocked = body.requires is None ||
      (body.requires is Some(id) && game.progress.has(id))
    node.set_visible(body.preview || unlocked)
    if item is Some(item) {
      item.set_visible(!game.progress.has(body.id))
      item.position().set_y(@math.sin(game.time * 2) * 0.15) |> ignore
      item.set_rotation_xyz(0, game.time * 0.35, 0)
    }
    if cage is Some(cage) {
      cage.set_visible(!unlocked)
    }
    node.update_matrix_world(true)
  }
}

///|
pub fn View::update_machinery(
  self : View,
  game : @sim.Game,
  dt : Double,
) -> Unit {
  self.machinery.update(game, dt)
}
