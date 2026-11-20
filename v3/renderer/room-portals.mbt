///|
priv struct ScreenRect {
  left : Double
  bottom : Double
  right : Double
  top : Double
}

///|
let viewport : ScreenRect = { left: -1, bottom: -1, right: 1, top: 1, }

///|
fn ScreenRect::clip(self : ScreenRect, b : ScreenRect) -> ScreenRect? {
  let left = Double::max(self.left, b.left)
  let right = Double::min(self.right, b.right)
  let bottom = Double::max(self.bottom, b.bottom)
  let top = Double::min(self.top, b.top)
  if left <= right && bottom <= top {
    Some({ left, right, bottom, top, })
  } else {
    None
  }
}

///|
fn ScreenRect::covers(self : ScreenRect, b : ScreenRect) -> Bool {
  self.left <= b.left &&
  self.bottom <= b.bottom &&
  self.right >= b.right &&
  self.top >= b.top
}

///|
fn ScreenRect::union(self : ScreenRect, b : ScreenRect) -> ScreenRect {
  {
    left: Double::min(self.left, b.left),
    bottom: Double::min(self.bottom, b.bottom),
    right: Double::max(self.right, b.right),
    top: Double::max(self.top, b.top),
  }
}

///|
priv struct Portal {
  dest : Int32
  face : Int32
  solid : Bool
  bounds : @m3.Box3
}

///|
priv struct PortalRoom {
  bounds : @m3.Box3
  edges : Array[Portal]
  mut window : ScreenRect?
}

///|
const ShadowOnlyLayer = 29

///|
priv struct SceneryBin {
  bounds : @m3.Box3
  members : Array[(@core.Object3D, @m3.Matrix4)]
  rooms : Array[Int32]
  mut fog_limited : Bool
  mut outer_faces : Int32
}

///|
priv struct RoomVisibility {
  rooms : Array[PortalRoom]
  bins : Array[SceneryBin]
  hidden : Array[@core.Object3D]
  shadow_layers : Array[@core.Layers]
  projection : @m3.Matrix4
}

///|
fn RoomVisibility::new(scene : @core.Object3D) -> RoomVisibility {
  let result : RoomVisibility = {
    rooms: [],
    bins: [],
    hidden: [],
    shadow_layers: [],
    projection: @m3.Matrix4::new(),
  }
  if @host.query("portals") == "off" {
    return result
  }
  let data = scene.user_data.get("portalRooms")
  if data.is_undefined() {
    return result
  }
  let rows : FixedArray[FixedArray[@core.JsValue]] = data.cast()
  for row in rows {
    let bounds = @m3.Box3::new(
      min=@m3.Vector3::new(row[0].cast(), row[1].cast(), row[2].cast()),
      max=@m3.Vector3::new(row[3].cast(), row[4].cast(), row[5].cast()),
    )
    let portals : FixedArray[FixedArray[Double]] = row[6].cast()
    let edges = []
    for p in portals {
      edges.push({
        dest: p[0].to_int(),
        face: p[1].to_int(),
        solid: p[2] != 0,
        bounds: @m3.Box3::new(
          min=@m3.Vector3::new(p[3], p[4], p[5]),
          max=@m3.Vector3::new(p[6], p[7], p[8]),
        ),
      })
    }
    result.rooms.push({ bounds, edges, window: None, })
  }
  let bins : Map[(Int32, Int32, Int32), SceneryBin] = Map([])
  // Keep occluded casters available to the shadow pass on a dedicated layer.
  let reserved_in_use = Ref(false)
  scene.traverse(fn(node) {
    if node.layers.is_enabled(ShadowOnlyLayer) {
      reserved_in_use.val = true
    }
    if node.is_light() && node.as_light().shadow is Some(shadow) {
      let layers = shadow.camera.layers
      if layers.is_enabled(ShadowOnlyLayer) {
        reserved_in_use.val = true
      }
      if layers.is_enabled(0) {
        result.shadow_layers.push(layers)
      }
    }
    guard node.layers.mask == 1 &&
      node.kind is Mesh(mesh) &&
      mesh.material is Single(material) &&
      material.depth_test &&
      material.displacement_map is None &&
      !material.is_shader_material() &&
      !material.is_node_material() &&
      mesh.morph_target_influences is None else {
      return
    }
    let bounds = match mesh.kind {
      PlainMesh => {
        let g = mesh.geometry
        if g.bounding_box is None {
          g.compute_bounding_box()
        }
        guard g.bounding_box is Some(box) else { return }
        box.clone().apply_matrix4(node.matrix_world)
      }
      InstancedMesh(_) | BatchedMesh(_) => {
        if node.user_data.get("portalStatic").is_undefined() {
          return
        }
        @core.box3_set_from_object(@m3.Box3::new(), node)
      }
      SkinnedMesh(_) => return
    }
    if bounds.is_empty() {
      return
    }
    let size = bounds.get_size(@m3.Vector3::new(0, 0, 0))
    if Double::max(size.x, Double::max(size.y, size.z)) > 96 {
      return
    }
    let center = bounds.get_center(@m3.Vector3::new(0, 0, 0))
    let key = (
      (center.x / 16).floor().to_int(),
      (center.y / 12).floor().to_int(),
      (center.z / 16).floor().to_int(),
    )
    let bin = bins.get_or_init(key, fn() {
      {
        bounds: @m3.Box3::new(),
        members: [],
        rooms: [],
        fog_limited: true,
        outer_faces: 0,
      }
    })
    if material.fog != Some(true) {
      bin.fog_limited = false
    }
    bin.bounds.union(bounds) |> ignore
    // A moving door or vehicle may leave this bin after loading. Its world
    // matrix must still match this placement before it can be hidden.
    bin.members.push((node, node.matrix_world.clone()))
  })
  if reserved_in_use.val {
    return result
  }
  let domain = @m3.Box3::new()
  for room in result.rooms {
    domain.union(room.bounds) |> ignore
  }
  for _, bin in bins {
    bin.bounds.expand_by_scalar(0.01) |> ignore
    for i, room in result.rooms {
      if room.bounds.intersects_box(bin.bounds) {
        bin.rooms.push(i)
      }
    }
    for k in 0..<3 {
      if bin.bounds.min.get_component(k) <= domain.min.get_component(k) {
        bin.outer_faces = bin.outer_faces | (1 << (2 * k))
      }
      if bin.bounds.max.get_component(k) >= domain.max.get_component(k) {
        bin.outer_faces = bin.outer_faces | (2 << (2 * k))
      }
    }
    result.bins.push(bin)
  }
  result
}

///|
fn project_bounds(b : @m3.Box3, m : Array[Double]) -> ScreenRect? {
  let mut left = 1.0 / 0.0
  let mut bottom = 1.0 / 0.0
  let mut right = -1.0 / 0.0
  let mut top = -1.0 / 0.0
  let mut front = false
  let mut behind = false
  fn include_point(x : Double, y : Double, w : Double) {
    let u = x / w
    let v = y / w
    left = Double::min(left, u)
    right = Double::max(right, u)
    bottom = Double::min(bottom, v)
    top = Double::max(top, v)
  }
  for i in 0..<8 {
    let x = if (i & 1) == 0 { b.min.x } else { b.max.x }
    let y = if (i & 2) == 0 { b.min.y } else { b.max.y }
    let z = if (i & 4) == 0 { b.min.z } else { b.max.z }
    let w = m[3] * x + m[7] * y + m[11] * z + m[15]
    if w <= 0.000001 {
      behind = true
      continue
    }
    front = true
    include_point(
      m[0] * x + m[4] * y + m[8] * z + m[12],
      m[1] * x + m[5] * y + m[9] * z + m[13],
      w,
    )
  }
  if !front {
    return None
  }
  if behind {
    // Clip crossing edges in homogeneous space before taking screen bounds.
    for i in 0..<8 {
      let x = if (i & 1) == 0 { b.min.x } else { b.max.x }
      let y = if (i & 2) == 0 { b.min.y } else { b.max.y }
      let z = if (i & 4) == 0 { b.min.z } else { b.max.z }
      let w = m[3] * x + m[7] * y + m[11] * z + m[15]
      if w > 0.000001 {
        continue
      }
      let px = m[0] * x + m[4] * y + m[8] * z + m[12]
      let py = m[1] * x + m[5] * y + m[9] * z + m[13]
      for k in 0..<3 {
        let delta = match k {
          0 => b.max.x - b.min.x
          1 => b.max.y - b.min.y
          _ => b.max.z - b.min.z
        }
        let delta = if (i & (1 << k)) == 0 { delta } else { -delta }
        let dw = delta * m[4 * k + 3]
        if w + dw > 0.000001 {
          let d = delta * (0.000001 - w) / dw
          include_point(px + d * m[4 * k], py + d * m[4 * k + 1], 0.000001)
        }
      }
    }
  }
  viewport.clip({
    left: left - 0.003,
    right: right + 0.003,
    bottom: bottom - 0.003,
    top: top + 0.003,
  })
}

///|
fn RoomVisibility::apply_portals(
  self : RoomVisibility,
  camera : @core.Object3D,
  cut : Cutaway,
) -> Unit {
  let eye = camera.position
  guard self.rooms.iter().find_first(fn(r) { r.bounds.contains_point(eye) })
    is Some(start) else {
    return
  }
  let projection = self.projection.multiply_matrices(
      camera.projection_matrix(),
      camera.matrix_world_inverse(),
    ).elements
  // Include every face touched by the sight corridor used in the fragment shader.
  let opening = @m3.Box3::new()
  opening
  .expand_by_point(cut.player.clone().add(@m3.Vector3::new(0, 1.3, 0)))
  .expand_by_point(eye)
  .expand_by_scalar(2.45)
  |> ignore
  let clipped = @m3.Box3::new()
  let range = match cut.distance.value {
    Number(v) => v
    _ => 0
  }
  for r in self.rooms {
    r.window = None
  }
  start.window = Some(viewport)
  let queue = [start]
  let exits : Array[Array[ScreenRect]] = Array::makei(6, fn(_) { [] })
  while queue.pop() is Some(room) {
    let window = room.window.unwrap()
    for p in room.edges {
      let b = p.bounds
      let d = match p.face.abs() {
        1 => b.min.x - eye.x
        2 => b.min.y - eye.y
        _ => b.min.z - eye.z
      }
      if (if p.face > 0 { d } else { -d }) < -0.02 {
        continue
      }
      let mut bounds = b
      if p.solid {
        // The render-distance shader can discard distant wall fragments.
        let dx = Double::max(
          (b.min.x - cut.player.x).abs(),
          (b.max.x - cut.player.x).abs(),
        )
        let dy = Double::max(
          (b.min.y - cut.player.y).abs(),
          (b.max.y - cut.player.y).abs(),
        )
        let dz = Double::max(
          (b.min.z - cut.player.z).abs(),
          (b.max.z - cut.player.z).abs(),
        )
        if dx * dx + dy * dy + dz * dz < (range - 1) * (range - 1) {
          if !opening.intersects_box(b) {
            continue
          }
          bounds = clipped.copy(b).intersect(opening)
        }
      }
      let portal_rect = if bounds.distance_to_point(eye) < 0.02 {
        Some(viewport)
      } else {
        project_bounds(bounds, projection)
      }
      if portal_rect is Some(rect) && rect.clip(window) is Some(next) {
        if p.dest < 0 {
          let side = (p.face.abs() - 1) * 2 + (if p.face > 0 { 1 } else { 0 })
          let windows = exits[side]
          if !windows.iter().any(fn(w) { w.covers(next) }) {
            windows.push(next)
          }
        } else {
          let dest = self.rooms[p.dest]
          if dest.window is Some(old) && old.covers(next) {
            continue
          }
          dest.window = Some(
            match dest.window {
              Some(old) => old.union(next)
              None => next
            },
          )
          queue.push(dest)
        }
      }
    }
  }
  for bin in self.bins {
    guard project_bounds(bin.bounds, projection) is Some(rect) else { continue }
    // A ray leaving this convex domain can only reach a bin beyond that face.
    let mut through_exit = false
    for k in 0..<6 {
      if (bin.outer_faces & (1 << k)) != 0 &&
        exits[k].iter().any(fn(w) { rect.clip(w) is Some(_) }) {
        through_exit = true
        break
      }
    }
    if through_exit {
      continue
    }
    if bin.rooms
      .iter()
      .any(fn(i) { self.rooms[i].window is Some(w) && rect.clip(w) is Some(_) }) {
      continue
    }
    self.hide_bin(bin)
  }
}

///|
fn RoomVisibility::hide_bin(self : RoomVisibility, bin : SceneryBin) -> Unit {
  for entry in bin.members {
    let (node, original) = entry
    if node.visible &&
      node.layers.mask == 1 &&
      node.matrix_world.equals(original) {
      node.layers.set(ShadowOnlyLayer)
      self.hidden.push(node)
    }
  }
}

///|
fn RoomVisibility::apply(
  self : RoomVisibility,
  camera : @core.Object3D,
  cut : Cutaway,
  third : Bool,
  fog : Bool,
) -> Unit {
  if self.bins.is_empty() || camera.layers.mask != 1 {
    return
  }
  // The city's fog shader already discards every fragment beyond this radius.
  if fog && cut.distance.value is Number(range) {
    for bin in self.bins {
      if bin.fog_limited &&
        bin.bounds.distance_to_point(cut.player) > range + 0.02 {
        self.hide_bin(bin)
      }
    }
  }
  if third {
    self.apply_portals(camera, cut)
  }
  if !self.hidden.is_empty() {
    for layers in self.shadow_layers {
      layers.enable(ShadowOnlyLayer)
    }
  }
}

///|
fn RoomVisibility::restore(self : RoomVisibility) -> Unit {
  if self.hidden.is_empty() {
    return
  }
  for node in self.hidden {
    node.layers.set(0)
  }
  self.hidden.clear()
  for layers in self.shadow_layers {
    layers.disable(ShadowOnlyLayer)
  }
}
