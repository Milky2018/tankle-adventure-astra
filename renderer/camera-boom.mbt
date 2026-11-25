///|
priv struct CameraSpace {
  gates : Map[(Int32, Int32), Array[@sim.Solid]]
  mobile : Array[@sim.Solid]
  decks : Map[(Int32, Int32), Array[@sim.Deck]]
  faces : Map[(Int32, Int32), Array[(@sim.Vec3, @sim.Vec3)]]
}

///|
fn camera_cell(x : Double) -> Int32 {
  (x / 16).floor().to_int()
}

///|
fn CameraSpace::new(scene : @core.Object3D, world : @sim.World) -> CameraSpace {
  let mobile = world.obstacles.copy()
  let gates = []
  for solid in world.solids {
    if solid.motion is Some(_) || solid.rail is Some(_) {
      mobile.push(solid)
    } else {
      gates.push(solid)
    }
  }
  let space : CameraSpace = {
    decks: Map([]),
    faces: Map([]),
    gates: @sim.architecture_grid(gates),
    mobile,
  }

  for deck in world.decks {
    if deck.water {
      continue
    }
    let r = deck.rect
    for x in camera_cell(r.x)..<=camera_cell(r.x + r.w) {
      for z in camera_cell(r.z)..<=camera_cell(r.z + r.d) {
        space.decks.get_or_init((x, z), fn() { [] }).push(deck)
      }
    }
  }
  let faces : Array[@scene_format.Bounds]? = scene_field(
    scene.user_data,
    "cameraFaces",
  )
  if faces is Some(faces) {
    for face in faces {
      let (x, y, z) = face.min
      let (u, v, w) = face.max
      let min : @sim.Vec3 = { x, y, z, }
      let max : @sim.Vec3 = { x: u, y: v, z: w, }
      for x in camera_cell(min.x)..<=camera_cell(max.x) {
        for z in camera_cell(min.z)..<=camera_cell(max.z) {
          space.faces.get_or_init((x, z), fn() { [] }).push((min, max))
        }
      }
    }
  }
  space
}

///|
/// Sweep the camera from the turret to its requested eye. Walls use the same
/// bounds as movement. Expanding them keeps the camera's near plane inside.
fn CameraSpace::boom_limit(
  self : CameraSpace,
  origin : @sim.Vec3,
  offset : @sim.Vec3,
  world : @sim.World,
  state : @sim.Progress,
  pad~ : Double = 0.45,
) -> Double {
  let end = origin.add(offset)
  let ray : @sim.Ray = { origin, direction: offset.normalized(), }
  let mut limit = offset.length()
  let left = Double::min(origin.x, end.x) - pad
  let right = Double::max(origin.x, end.x) + pad
  let back = Double::min(origin.z, end.z) - pad
  let front = Double::max(origin.z, end.z) + pad
  fn box(lo : @sim.Vec3, hi : @sim.Vec3) {
    if lo.x > right ||
      hi.x < left ||
      lo.z > front ||
      hi.z < back ||
      lo.y > Double::max(origin.y, end.y) + pad ||
      hi.y < Double::min(origin.y, end.y) - pad {
      return
    }
    let padding : @sim.Vec3 = { x: pad, y: pad, z: pad, }
    let low = lo.sub(padding)
    let high = hi.add(padding)
    if origin.x >= low.x &&
      origin.x <= high.x &&
      origin.z >= low.z &&
      origin.z <= high.z &&
      origin.y >= low.y &&
      origin.y <= high.y {
      limit = 0
    } else if ray.box(low, high) is Some((entry, _)) {
      limit = Double::min(limit, entry)
    }
  }
  fn visit(s : @sim.Solid, height : Double) {
    guard height > 0 else { return }
    let r = s.rect
    box({ x: r.x, y: s.y, z: r.z, }, {
      x: r.x + r.w,
      y: s.y + height,
      z: r.z + r.d,
    })
  }
  // Intersect the underside of each overhead deck in its inclined plane.
  fn ceiling(deck : @sim.Deck) {
    let r = deck.rect
    let slope = deck.rise / r.d
    let gap = deck.y + slope * (origin.z - r.z) - pad - origin.y
    let speed = ray.direction.y - slope * ray.direction.z
    if gap >= 0 && speed > 0.00001 {
      let t = gap / speed
      if t < limit &&
        r.contains(
          origin.x + t * ray.direction.x,
          origin.z + t * ray.direction.z,
          margin=pad,
        ) {
        limit = t
      }
    }
  }
  for x in camera_cell(left)..<=camera_cell(right) {
    for z in camera_cell(back)..<=camera_cell(front) {
      let cell = (x, z)
      if world.architecture_grid.get(cell) is Some(items) {
        for s in items {
          visit(s, s.h)
        }
      }
      if self.gates.get(cell) is Some(gates) {
        for gate in gates {
          visit(gate, gate.exposed_height(state))
        }
      }
      if self.faces.get(cell) is Some(faces) {
        for face in faces {
          box(face.0, face.1)
        }
      }
      if self.decks.get(cell) is Some(decks) {
        for deck in decks {
          ceiling(deck)
        }
      }
    }
  }
  for solid in self.mobile {
    visit(solid, solid.exposed_height(state))
  }
  for lift in world.lifts {
    let r = lift.rect
    box({ x: r.x, y: lift.y - 0.35, z: r.z, }, {
      x: r.x + r.w,
      y: lift.y,
      z: r.z + r.d,
    })
  }
  limit
}

///|
/// A visible turret crown or hull corner keeps the foreground fully opaque.
fn CameraSpace::hull_hidden(
  self : CameraSpace,
  body : @core.Object3D,
  muzzle : @sim.Vec3,
  eye : @sim.Vec3,
  world : @sim.World,
  state : @sim.Progress,
) -> Bool {
  for
    (x, y, z) in [
      (0.0, 2.65, 0.0),
      (-1.4, 1.3, -1.6),
      (1.4, 1.3, -1.6),
      (-1.4, 1.3, 1.6),
      (1.4, 1.3, 1.6),
      (-1.4, 0.55, 0.0),
      (1.4, 0.55, 0.0),
      (0.0, 1.65, 0.0),
    ] {
    let sample = point(
      @m3.Vector3::new(x, y, z).apply_matrix4(body.matrix_world),
    )
    let offset = eye.sub(sample)
    if self.boom_limit(sample, offset, world, state, pad=0) >=
      offset.length() - 0.02 {
      return false
    }
  }
  let offset = eye.sub(muzzle)
  self.boom_limit(muzzle, offset, world, state, pad=0) < offset.length() - 0.02
}
