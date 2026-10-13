///|
priv struct Collider {
  object : @three.Object3D
  target : @sim.HitTarget
  min : @sim.Vec3
  max : @sim.Vec3
}

///|
priv struct GeometryQueries {
  aiming : Bool
  visible : (@sim.Vec3, Bool, Bool) -> Bool
  housing_pick : () -> Bool
  world : @sim.World
  state : @sim.Progress
  surfaces : Array[Collider]
  housings : Array[Collider]
  walls : Array[(@sim.Solid, @three.Object3D)]
  lifts : Array[(@sim.Lift, @three.Object3D)]
  mirrors : Array[Collider]
  raycaster : @three.Raycaster
}

///|
fn vector(p : @sim.Vec3) -> @three.Vector3 {
  @three.Vector3::Vector3(p.x, p.y, p.z)
}

///|
fn point(p : @three.Vector3) -> @sim.Vec3 {
  { x: p.x(), y: p.y(), z: p.z(), }
}

///|
fn collider(object : @three.Object3D, target : @sim.HitTarget) -> Collider {
  let box = @three.Box3::Box3().set_from_object(object)
  { object, target, min: point(box.min()), max: point(box.max()), }
}

///|
pub fn View::queries(
  self : View,
  game : @sim.Game,
  aiming~ : Bool = false,
) -> @sim.Queries {
  let root = self.scene.as_object3d()
  let surfaces : Array[Collider] = []
  let housings : Array[Collider] = []
  let mirrors : Array[Collider] = []
  root.traverse(fn(object) {
    let name = @host.scene_binding(object)
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
  let walls : Array[(@sim.Solid, @three.Object3D)] = []
  for wall in game.world.solids {
    if self.nodes.get("world/walls/\{wall.circuit_key}/mesh") is Some(object) {
      walls.push((wall, object))
    }
  }
  let lifts : Array[(@sim.Lift, @three.Object3D)] = []
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
    aiming,
    visible: fn(p, terrain, structure) {
      self.cutaway.aim_visible(p, terrain, structure, self.third_person)
    },
    housing_pick: fn() { !aiming || self.third_person },
    world: game.world,
    state: game.progress,
    surfaces,
    housings,
    walls,
    lifts,
    mirrors,
    raycaster: @three.Raycaster::Raycaster(
      vector({ x: 0, y: 0, z: 0, }),
      vector({ x: 0, y: 0, z: 1, }),
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
  self.raycaster.set_far(range)
  let mut result : @sim.Hit? = None
  let mut limit = range
  fn mesh_hit(object : @three.Object3D, target : @sim.HitTarget) -> Unit {
    let hits = self.raycaster.intersect_object(object, false)
    for hit in hits {
      if hit.distance() > limit {
        break
      }
      if self.aiming &&
        !(self.visible)(point(hit.point()), target is @sim.Terrain, false) {
        continue
      }
      let normal = hit
        .face()
        .map(fn(face) {
          point(
            face.normal().clone().transform_direction(object.matrix_world()),
          )
        })
      if ground && (normal is None || (normal is Some(n) && n.y <= 0.5)) {
        continue
      }
      result = Some({
        distance: hit.distance(),
        point: point(hit.point()),
        normal,
        target,
      })
      limit = hit.distance()
      break
    }
  }
  for surface in self.surfaces {
    if ray.box(surface.min, surface.max) is Some((distance, _)) &&
      distance <= limit {
      mesh_hit(surface.object, surface.target)
    }
  }
  for (_, object) in self.lifts {
    mesh_hit(object, @sim.Terrain)
  }
  if !ground {
    for (wall, object) in self.walls {
      if wall.active(self.state) &&
        ray.box({ x: wall.rect.x, y: wall.y, z: wall.rect.z, }, {
          x: wall.rect.x + wall.rect.w,
          y: wall.y + wall.h,
          z: wall.rect.z + wall.rect.d,
        })
        is Some((distance, _)) &&
        distance <= limit {
        mesh_hit(object, @sim.Terrain)
      }
    }
    for housing in self.housings {
      if !(self.housing_pick)() {
        continue
      }
      let bounds = @three.Box3::Box3().set_from_object(housing.object)
      if ray.box(point(bounds.min()), point(bounds.max())) is Some((d, _)) &&
        d <= limit {
        mesh_hit(housing.object, housing.target)
      }
    }
    for mirror in self.mirrors {
      mesh_hit(mirror.object, mirror.target)
    }
    for solid in self.world.obstacles {
      if ray.box({ x: solid.rect.x, y: solid.y, z: solid.rect.z, }, {
          x: solid.rect.x + solid.rect.w,
          y: solid.y + solid.h,
          z: solid.rect.z + solid.rect.d,
        })
        is Some((distance, normal)) &&
        distance < limit &&
        (!self.aiming || (self.visible)(ray.point(distance), false, true)) {
        limit = distance
        result = Some({
          distance,
          normal: Some(normal),
          point: ray.point(distance),
          target: if solid.id == "sorter-cover" {
            @sim.CoverTarget
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
                distance < limit &&
                (
                  !self.aiming ||
                  (self.visible)(ray.point(distance), false, true)
                ) {
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
