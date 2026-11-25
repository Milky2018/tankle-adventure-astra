///|
priv struct PortalRoom {
  lo : Array[Int32]
  hi : Array[Int32]
  edges : Array[@scene_format.Portal]
}

///|
fn slab(
  lo : Array[Int32],
  hi : Array[Int32],
  axis : Int32,
  plane : Int32,
  visit : (Array[Int32]) -> Bool,
) -> Bool {
  let u = (axis + 1) % 3
  let v = (axis + 2) % 3
  let p = lo.copy()
  p[axis] = plane
  for j in lo[v]..<hi[v] {
    p[v] = j
    for i in lo[u]..<hi[u] {
      p[u] = i
      if !visit(p) {
        return false
      }
    }
  }
  true
}

///|
pub fn room_portals(scene : Raw, view : (Raw) -> Raw) -> Unit {
  let root = scene.get("object")
  guard array_field(scene, "animations").length() == 0 &&
    visible(root) &&
    array_field(root, "animations").length() == 0 &&
    children(root)
    .iter()
    .find_first(n => string_field(n, "name") == "City · building envelope")
    is Some(envelope) else {
    return
  }
  let low = [150, -42, 36]
  let size = [54, 7, 30]
  let step = 6
  let axes = [0, 1, 2]
  let walls : Map[(Int32, Int32, Int32, Int32), Int32] = Map([])
  let geometry = resource_index(array_field(scene, "geometries"))
  let materials = resource_index(array_field(scene, "materials"))
  fn visit(n : Raw, parent : @math.Matrix4) {
    if !visible(n) || array_field(n, "animations").length() > 0 {
      return
    }
    let matrix = parent.clone().multiply(node_matrix(n))
    if string_field(n.get("userData"), "renderRole") == "enclosure" &&
      materials.get(string_field(n, "material")) is Some(m) &&
      string_field(m.get("userData"), "renderRole") == "enclosure" &&
      visible(m) &&
      ![
        "transparent", "alphaTest", "alphaMap", "alphaHash", "wireframe", "side",
      ].any(k => truthy(m, k)) &&
      array_field(m, "clippingPlanes").length() == 0 &&
      !m.get("depthTest").strict_equal(Raw::of(false)) &&
      !m.get("depthWrite").strict_equal(Raw::of(false)) &&
      (
        m.get("opacity").is_undefined() ||
        m.get("opacity").strict_equal(Raw::of(1))
      ) &&
      matrix.determinant() > 0 &&
      geometry.get(string_field(n, "geometry")) is Some(g) &&
      truthy(g.get("data"), "index") {
      let d = g.get("data")
      let position = @archive.prop(d.get("attributes"), "position")
      if !position.is_undefined() &&
        int_field(position, "itemSize") == 3 &&
        array_field(d, "groups").length() == 0 &&
        !truthy(d, "morphAttributes") {
        let vertices : FixedArray[Double] = view(position.get("array")).cast()
        let indices : FixedArray[Int32] = view(d.get("index").get("array")).cast()
        for i = 0; i + 5 < indices.length(); i = i + 6 {
          guard indices[i] == indices[i + 3] && indices[i + 2] == indices[i + 4] else {
            continue
          }
          let p = [0, 1, 2, 5].map(j => {
            let k = indices[i + j] * 3
            project(matrix, vertices[k], vertices[k + 1], vertices[k + 2])
          })
          guard axes.iter().find_first(k => p.every(pt => pt[k] == p[0][k]))
            is Some(axis) else {
            continue
          }
          let u = (axis + 1) % 3
          let v = (axis + 2) % 3
          fn rectangle(j : Int32, k : Int32) -> Bool {
            p[0][j] == p[1][j] &&
            p[1][k] == p[2][k] &&
            p[2][j] == p[3][j] &&
            p[3][k] == p[0][k]
          }
          guard rectangle(u, v) || rectangle(v, u) else { continue }
          let cross = (p[1][u] - p[0][u]) * (p[2][v] - p[0][v]) -
            (p[1][v] - p[0][v]) * (p[2][u] - p[0][u])
          let plane = (p[0][axis] - low[axis].to_double()) / step.to_double()
          guard cross != 0 &&
            plane == plane.trunc() &&
            plane >= 0 &&
            plane <= size[axis].to_double() else {
            continue
          }
          fn bounds(k : Int32) -> (Int32, Int32) {
            let mut a = p[0][k]
            let mut b = a
            for pt in p {
              a = a.min(pt[k])
              b = b.max(pt[k])
            }
            (
              ((a - low[k].to_double()) / 6).ceil().to_int().max(0),
              ((b - low[k].to_double()) / 6).floor().to_int().min(size[k]),
            )
          }
          let (u0, u1) = bounds(u)
          let (v0, v1) = bounds(v)
          let q = [0, 0, 0]
          q[axis] = plane.to_int()
          for x in u0..<u1 {
            q[u] = x
            for y in v0..<v1 {
              q[v] = y
              let key = (q[0], q[1], q[2], axis)
              walls[key] = walls.get_or_default(key, 0) |
                (if cross > 0 { 1 } else { 2 })
            }
          }
        }
      }
    }
    for c in children(n) {
      visit(c, matrix)
    }
  }
  visit(envelope, node_matrix(root))
  if walls.is_empty() {
    return
  }
  let ids = FixedArray::make(size[0] * size[1] * size[2], -1)
  fn cell(p : Array[Int32]) -> Int32 {
    p[0] + size[0] * (p[1] + size[1] * p[2])
  }
  fn world(p : Array[Int32]) -> (Double, Double, Double) {
    (
      (low[0] + p[0] * step).to_double(),
      (low[1] + p[1] * step).to_double(),
      (low[2] + p[2] * step).to_double(),
    )
  }
  let rooms : Array[PortalRoom] = []
  for y in 0..<size[1] {
    for z in 0..<size[2] {
      for x in 0..<size[0] {
        let lo = [x, y, z]
        let hi = [x + 1, y + 1, z + 1]
        if ids[cell(lo)] >= 0 {
          continue
        }
        for a in [0, 2, 1] {
          while hi[a] < size[a] &&
                slab(lo, hi, a, hi[a], p => {
                  ids[cell(p)] < 0 && !walls.contains((p[0], p[1], p[2], a))
                }) {
            hi[a] += 1
          }
        }
        let id = rooms.length()
        for i in lo[0]..<hi[0] {
          ignore(
            slab(lo, hi, 0, i, p => {
              ids[cell(p)] = id
              true
            }),
          )
        }
        rooms.push({ lo, hi, edges: [], })
      }
    }
  }
  for room in rooms {
    let lo = room.lo
    let hi = room.hi
    for a in axes {
      for sign in [-1, 1] {
        let plane = if sign > 0 { hi[a] } else { lo[a] }
        let u = (a + 1) % 3
        let v = (a + 2) % 3
        let width = hi[u] - lo[u]
        let height = hi[v] - lo[v]
        let labels = FixedArray::make(width * height, 0)
        ignore(
          slab(lo, hi, a, plane, p => {
            let next = p.copy()
            if sign < 0 {
              next[a] -= 1
            }
            let dest = if next[a] < 0 || next[a] >= size[a] {
              -1
            } else {
              ids[cell(next)]
            }
            let wall = walls.get_or_default((p[0], p[1], p[2], a), 0)
            let closed = wall & (if sign > 0 { 2 } else { 1 })
            labels[(p[v] - lo[v]) * width + p[u] - lo[u]] = 2 * (dest + 1) +
              (if closed != 0 { 1 } else { 0 })
            true
          }),
        )
        for j in 0..<height {
          for i in 0..<width {
            let label = labels[j * width + i]
            if label < 0 {
              continue
            }
            let mut w = 1
            let mut h = 1
            while i + w < width && labels[j * width + i + w] == label {
              w += 1
            }
            fn same_row(row : Int32) -> Bool {
              for k in i..<(i + w) {
                if labels[row * width + k] != label {
                  return false
                }
              }
              true
            }
            while j + h < height && same_row(j + h) {
              h += 1
            }
            for dy in 0..<h {
              for dx in 0..<w {
                labels[(j + dy) * width + i + dx] = -1
              }
            }
            let min = lo.copy()
            let max = lo.copy()
            min[a] = plane
            max[a] = plane
            min[u] += i
            max[u] += i + w
            min[v] += j
            max[v] += j + h
            room.edges.push({
              destination: label / 2 - 1,
              face: (a + 1) * sign,
              solid: label % 2 == 1,
              bounds: { min: world(min), max: world(max), },
            })
          }
        }
      }
    }
  }
  fn fixed_binding(id : String) -> Bool {
    ["surfaces", "occluders", "signs", "controlFeeds"].any(k => {
      id.has_prefix("world/" + k + "/")
    })
  }
  fn fixed_name(name : String) -> Bool {
    match name {
      "Workshop fittings" | "city-architecture" | "city-history" => true
      _ =>
        [
          "Works", "Factory windows", "Roof soffits", "Workshop services", "Hoist well",
          "Filter garden", "West reservoir", "Furnace hall", "Garden filter banks",
        ].any(s => name.has_prefix(s + " · "))
    }
  }
  fn mark(n : Raw) {
    if !visible(n) || array_field(n, "animations").length() > 0 {
      return
    }
    let id = binding(n)
    if !id.is_empty() &&
      !fixed_binding(id) &&
      !id.has_suffix("/fixture-collider") {
      return
    }
    if ["Mesh", "BatchedMesh", "InstancedMesh"].contains(
        string_field(n, "type"),
      ) &&
      materials.get(string_field(n, "material")) is Some(m) &&
      !m.get("depthTest").strict_equal(Raw::of(false)) &&
      (
        n.get("layers").is_undefined() ||
        n.get("layers").strict_equal(Raw::of(1))
      ) {
      user_data(n).set("portalStatic", Raw::of(true))
    }
    for c in children(n) {
      mark(c)
    }
  }
  for n in children(root) {
    if fixed_name(string_field(n, "name")) || fixed_binding(binding(n)) {
      mark(n)
    }
  }
  let baked : Array[@scene_format.Room] = rooms.map(r => {
    bounds: { min: world(r.lo), max: world(r.hi), },
    portals: r.edges,
  })
  user_data(root).set("portalRooms", Raw::from_json(@json.to_json(baked)))
}
