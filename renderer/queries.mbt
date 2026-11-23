///|
priv struct Collider {
  object : @core.Object3D
  target : @sim.HitTarget
  min : @sim.Vec3
  max : @sim.Vec3
}

///|
priv struct GeometryQueries {
  world : @sim.World
  state : @sim.Progress
  fixtures : Array[Collider]
  surfaces : Array[Collider]
  surface_grid : Map[(Int32, Int32), Array[Collider]]
  housings : Array[Collider]
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
  let housings : Array[Collider] = []
  let mirrors : Array[Collider] = []
  root.traverse(fn(object) {
    let name = scene_binding(object)
    if name.has_suffix("/fixture-collider") ||
      metadata_string(object.user_data, "renderRole") == "enclosure" {
      fixtures.push(collider(object, @sim.Terrain))
    }
    if name.has_prefix("world/surfaces/") && name.has_suffix("/mesh") {
      surfaces.push(collider(object, @sim.Terrain))
    }
    if name.has_prefix("world/controls/") && name.contains("/housing/") {
      for index, control in game.commands.controls {
        if name.has_prefix("world/controls/\{control.id}/housing/") {
          housings.push(collider(object, @sim.BlockedControl(index)))
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
  let surface_grid : Map[(Int32, Int32), Array[Collider]] = Map([])
  for surface in surfaces {
    for
      x in (surface.min.x / 16).floor().to_int()..<=(surface.max.x / 16)
      .floor()
      .to_int() {
      for
        z in (surface.min.z / 16).floor().to_int()..<=(surface.max.z / 16)
        .floor()
        .to_int() {
        let cell = (x, z)
        match surface_grid.get(cell) {
          Some(members) => members.push(surface)
          None => surface_grid[cell] = [surface]
        }
      }
    }
  }
  let queries = GeometryQueries::{
    world: game.world,
    state: game.progress,
    fixtures,
    surfaces,
    surface_grid,
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
  let candidates = if ray.direction.x == 0 && ray.direction.z == 0 {
    let cell = (
      (ray.origin.x / 16).floor().to_int(),
      (ray.origin.z / 16).floor().to_int(),
    )
    self.surface_grid.get(cell).unwrap_or([])
  } else {
    self.surfaces
  }
  for surface in candidates {
    if surface.in_range(ray, limit) {
      mesh_hit(surface.object, surface.target, false)
    }
  }
  for (_, object) in self.lifts {
    mesh_hit(object, @sim.Terrain, false)
  }
  if !ground {
    for fixture in self.fixtures {
      if fixture.in_range(ray, limit) {
        mesh_hit(fixture.object, fixture.target, true)
      }
    }
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
      let bounds = @core.box3_set_from_object(@m3.Box3::new(), housing.object)
      if ray.box(point(bounds.min), point(bounds.max)) is Some((d, _)) &&
        d <= limit {
        mesh_hit(housing.object, housing.target, false)
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
    // Query nearby architectural cells along the ray, independently of decorative meshes.
    let seen : Set[(Int32, Int32)] = Set([])
    let steps = Int32::max(1, (limit / 8).ceil().to_int())
    for i in 0..<=steps {
      let pos = ray.point(Double::min(limit, i.to_double() * 8))
      let x = (pos.x / 16).floor().to_int()
      let z = (pos.z / 16).floor().to_int()
      for dx in -1..<=1 {
        for dz in -1..<=1 {
          let cell = (x + dx, z + dz)
          if seen.contains(cell) {
            continue
          }
          seen.add(cell) |> ignore
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
      }
    }
  }
  result
}
