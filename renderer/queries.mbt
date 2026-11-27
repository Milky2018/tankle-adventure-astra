///|
priv struct Collider {
  object : @core.Object3D
  target : @sim.HitTarget
  min : @sim.Vec3
  max : @sim.Vec3
}

///|
priv struct MovingCollider {
  mut bounds : Collider
  matrix : @m3.Matrix4
}

///|
fn collider_grid(
  items : Array[Collider],
) -> Map[(Int32, Int32), Array[Collider]] {
  let cells = Map([])
  for item in items {
    for x in camera_cell(item.min.x)..<=camera_cell(item.max.x) {
      for z in camera_cell(item.min.z)..<=camera_cell(item.max.z) {
        cells.get_or_init((x, z), fn() { [] }).push(item)
      }
    }
  }
  cells
}

///|
priv struct GeometryQueries {
  world : @sim.World
  state : @sim.Progress
  surface_grid : Map[(Int32, Int32), Array[Collider]]
  fixture_grid : Map[(Int32, Int32), Array[Collider]]
  housings : Array[MovingCollider]
  walls : Array[(@sim.Solid, @core.Object3D)]
  lifts : Array[(@sim.Lift, @core.Object3D)]
  mirrors : Array[Collider]
  raycaster : @core.Raycaster
}

///|
fn vector(p : @sim.Vec3) -> @m3.Vector3 {
  @m3.Vector3::new(p.x, p.y, p.z)
}

///|
fn point(p : @m3.Vector3) -> @sim.Vec3 {
  { x: p.x, y: p.y, z: p.z, }
}

///|
fn collider(object : @core.Object3D, target : @sim.HitTarget) -> Collider {
  let box = @core.box3_set_from_object(@m3.Box3::new(), object)
  { object, target, min: point(box.min), max: point(box.max), }
}

///|
fn Collider::in_range(self : Collider, ray : @sim.Ray, limit : Double) -> Bool {
  let p = ray.origin
  if p.x >= self.min.x &&
    p.x <= self.max.x &&
    p.y >= self.min.y &&
    p.y <= self.max.y &&
    p.z >= self.min.z &&
    p.z <= self.max.z {
    // A short ray can hit a child mesh before leaving the enclosing box.
    return true
  }
  ray.box(self.min, self.max) is Some((distance, _)) && distance <= limit
}

///|
pub fn View::queries(self : View, game : @sim.Game) -> @sim.Queries {
  let root = self.scene
  let fixtures : Array[Collider] = []
  let surfaces : Array[Collider] = []
  let housings : Array[MovingCollider] = []
  let mirrors : Array[Collider] = []
  root.traverse(fn(object) {
    let name = scene_binding(object)
    if scene_field(object.user_data, "renderRole") == Some("enclosure") {
      enclosure_colliders(object, fixtures)
    } else if name.has_suffix("/fixture-collider") {
      fixtures.push(collider(object, @sim.Terrain))
    }
    if name.has_prefix("world/surfaces/") && name.has_suffix("/mesh") {
      surfaces.push(collider(object, @sim.Terrain))
    }
    if name.has_prefix("world/controls/") && name.contains("/housing/") {
      for index, control in game.commands.controls {
        if name.has_prefix("world/controls/\{control.id}/housing/") {
          housings.push({
            bounds: collider(object, @sim.BlockedControl(index)),
            matrix: object.matrix_world.clone(),
          })
          break
        }
      }
    }
  })
  let walls : Array[(@sim.Solid, @core.Object3D)] = []
  for wall in game.world.solids {
    if self.nodes.get("world/walls/\{wall.circuit_key}/mesh") is Some(object) {
      walls.push((wall, object))
    }
  }
  let lifts : Array[(@sim.Lift, @core.Object3D)] = []
  for lift in game.world.lifts {
    if self.nodes.get("world/views/lifts/\{lift.id}/mesh") is Some(object) {
      lifts.push((lift, object))
    }
  }
  for i, mirror in game.mirrors {
    if self.nodes.get("world/views/mirrors/\{mirror.id}/mesh") is Some(object) {
      mirrors.push(collider(object, @sim.MirrorTarget(i)))
    }
  }
  let queries = GeometryQueries::{
    world: game.world,
    state: game.progress,
    surface_grid: collider_grid(surfaces),
    fixture_grid: collider_grid(fixtures),
    housings,
    walls,
    lifts,
    mirrors,
    raycaster: @core.Raycaster::new(
      origin=vector({ x: 0, y: 0, z: 0, }),
      direction=vector({ x: 0, y: 0, z: 1, }),
    ),
  }
  { geometry: fn(ray, range, ground) { queries.cast(ray, range, ground) }, }
}

///|
fn GeometryQueries::cast(
  self : GeometryQueries,
  ray : @sim.Ray,
  range : Double,
  ground : Bool,
) -> @sim.Hit? {
  self.raycaster.set(vector(ray.origin), vector(ray.direction))
  self.raycaster.far = range
  let mut result : @sim.Hit? = None
  let mut limit = range
  fn mesh_hit(
    object : @core.Object3D,
    target : @sim.HitTarget,
    recursive : Bool,
  ) -> Unit {
    self.raycaster.far = limit
    let hits = self.raycaster.intersect_object(object, recursive~)
    for hit in hits {
      if hit.distance > limit {
        break
      }
      let normal = hit.face.map(fn(face) {
        point(
          face.normal.clone().transform_direction(hit.object.matrix_world()),
        )
      })
      if ground && (normal is None || (normal is Some(n) && n.y <= 0.5)) {
        continue
      }
      result = Some({
        distance: hit.distance,
        point: point(hit.point),
        normal,
        target,
      })
      limit = hit.distance
      break
    }
  }
  let start_cell = (camera_cell(ray.origin.x), camera_cell(ray.origin.z))
  let end = ray.point(limit)
  let single_cell = start_cell == (camera_cell(end.x), camera_cell(end.z))
  fn test_grid(grid : Map[(Int32, Int32), Array[Collider]], recursive : Bool) {
    fn visit_item(item : Collider) {
      if item.in_range(ray, limit) {
        mesh_hit(item.object, item.target, recursive)
      }
    }
    if single_cell {
      if grid.get(start_cell) is Some(items) {
        items.each(visit_item)
      }
    } else {
      let seen : Set[Int32] = Set([])
      ray_cells(ray, limit, cell => {
        if grid.get(cell) is Some(items) {
          for item in items {
            if !seen.contains(item.object.id) {
              seen.insert(item.object.id) |> ignore
              visit_item(item)
            }
          }
        }
      })
    }
  }
  test_grid(self.surface_grid, false)
  for (_, object) in self.lifts {
    mesh_hit(object, @sim.Terrain, false)
  }
  if !ground {
    test_grid(self.fixture_grid, true)
    for (wall, object) in self.walls {
      let height = wall.exposed_height(self.state)
      if height > 0 &&
        ray.box({ x: wall.rect.x, y: wall.y, z: wall.rect.z, }, {
          x: wall.rect.x + wall.rect.w,
          y: wall.y + height,
          z: wall.rect.z + wall.rect.d,
        })
        is Some((distance, _)) &&
        distance <= limit {
        mesh_hit(object, @sim.Terrain, false)
      }
    }
    for housing in self.housings {
      let mesh = housing.bounds.object
      if !mesh.matrix_world.equals(housing.matrix) {
        housing.bounds = collider(mesh, housing.bounds.target)
        housing.matrix.copy(mesh.matrix_world) |> ignore
      }
      if housing.bounds.in_range(ray, limit) {
        mesh_hit(mesh, housing.bounds.target, false)
      }
    }
    for mirror in self.mirrors {
      mesh_hit(mirror.object, mirror.target, false)
    }
    for i, solid in self.world.obstacles {
      if ray.box({ x: solid.rect.x, y: solid.y, z: solid.rect.z, }, {
          x: solid.rect.x + solid.rect.w,
          y: solid.y + solid.h,
          z: solid.rect.z + solid.rect.d,
        })
        is Some((distance, normal)) &&
        distance < limit {
        limit = distance
        result = Some({
          distance,
          normal: Some(normal),
          point: ray.point(distance),
          target: if solid.rail is Some(_) {
            @sim.CoverTarget(i)
          } else {
            @sim.Terrain
          },
        })
      }
    }
    fn architecture_cell(cell : (Int32, Int32)) {
      if self.world.architecture_grid.get(cell) is Some(solids) {
        for solid in solids {
          if ray.box({ x: solid.rect.x, y: solid.y, z: solid.rect.z, }, {
              x: solid.rect.x + solid.rect.w,
              y: solid.y + solid.h,
              z: solid.rect.z + solid.rect.d,
            })
            is Some((distance, normal)) &&
            distance < limit {
            limit = distance
            result = Some({
              distance,
              normal: Some(normal),
              point: ray.point(distance),
              target: @sim.Terrain,
            })
          }
        }
      }
    }
    if single_cell {
      architecture_cell(start_cell)
    } else {
      ray_cells(ray, limit, architecture_cell)
    }
  }
  result
}
