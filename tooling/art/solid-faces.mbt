///|
/// Build visibility blockers from the actual opaque triangles. Hidden source
/// meshes, animated assemblies, transparent glass and door leaves never block.
fn solid_faces(
  scene : Raw,
  view : (Raw) -> @core.TypedArray,
  fixtures : FixtureLayout,
) -> Unit {
  let root = scene.get("object")
  guard array_field(scene, "animations").is_empty() else { return }
  let sheets : Map[(Int32, Double), Set[(Int32, Int32)]] = Map([])
  let geometry = resource_index(array_field(scene, "geometries"))
  let materials = resource_index(array_field(scene, "materials"))
  let textures = resource_index(array_field(scene, "textures"))
  let images = resource_index(array_field(scene, "images"))
  fn add_quad(p : FixedArray[FixedArray[Double]]) {
    let axes = [0, 1, 2]
    guard axes.iter().find_first(a => p.every(v => v[a] == p[0][a])) is Some(a) else {
      return
    }
    let u = (a + 1) % 3
    let v = (a + 2) % 3
    let lo = p[0].copy()
    let hi = p[0].copy()
    for pt in p {
      for k in [u, v] {
        lo[k] = lo[k].min(pt[k])
        hi[k] = hi[k].max(pt[k])
      }
    }
    if (hi[u] - lo[u]) * (hi[v] - lo[v]) < 16 {
      return
    }
    let corners = FixedArray::make(6, 0)
    for i, pt in p {
      if (pt[u] != lo[u] && pt[u] != hi[u]) ||
        (pt[v] != lo[v] && pt[v] != hi[v]) {
        return
      }
      corners[i] = (if pt[u] == hi[u] { 1 } else { 0 }) +
        (if pt[v] == hi[v] { 2 } else { 0 })
    }
    fn winding(i : Int32) -> Double {
      (p[i + 1][u] - p[i][u]) * (p[i + 2][v] - p[i][v]) -
      (p[i + 1][v] - p[i][v]) * (p[i + 2][u] - p[i][u])
    }
    let w = winding(0)
    guard w * winding(3) > 0 else { return }
    let shared = [
      for i in 0..<3 if corners[i] == corners[3] ||
      corners[i] == corners[4] ||
      corners[i] == corners[5] => corners[i]
    ]
    guard shared is [x, y] && (x ^ y) == 3 else { return }
    let tiles = sheets.get_or_init(
      ((a + 1) * (if w > 0 { 1 } else { -1 }), p[0][a]),
      () => Set([]),
    )
    for y in (lo[v] / 2).ceil().to_int()..<(hi[v] / 2).floor().to_int() {
      for x in (lo[u] / 2).ceil().to_int()..<(hi[u] / 2).floor().to_int() {
        tiles.insert((x, y)) |> ignore
      }
    }
  }
  fn visit(n : Raw, parent : @math.Matrix4) {
    if !visible(n) || !array_field(n, "animations").is_empty() {
      return
    }
    let world = parent.clone().multiply(node_matrix(n))
    let id = binding(n)
    let fixed_wall = fixtures.walls.get(id) ==
      Some((world.elements[12], world.elements[13], world.elements[14]))
    if !id.is_empty() &&
      !fixed_wall &&
      !id.has_suffix("/fixture-collider") &&
      !(id.has_prefix("world/surfaces/") && id.has_suffix("/mesh")) {
      return
    }
    if materials.get(str(n, "material")) is Some(m) &&
      visible(m) &&
      [
        "MeshBasicMaterial", "MeshToonMaterial", "MeshStandardMaterial", "MeshLambertMaterial",
      ].contains(str(m, "type")) &&
      ["Mesh", "BatchedMesh"].contains(str(n, "type")) &&
      !m.get("colorWrite").strict_equal(Raw::of(false)) &&
      !m.get("depthTest").strict_equal(Raw::of(false)) &&
      !m.get("depthWrite").strict_equal(Raw::of(false)) &&
      numeric_field(m, "side").unwrap_or(0) == 0 &&
      numeric_field(m, "opacity").unwrap_or(1) == 1 &&
      numeric_field(m, "alphaTest").unwrap_or(0) == 0 &&
      ["transparent", "alphaHash", "wireframe"].every(k => {
        !m.get(k).strict_equal(Raw::of(true))
      }) &&
      ["alphaMap", "displacementMap"].every(k => str(m, k).is_empty()) &&
      array_field(m, "clippingPlanes").is_empty() &&
      str(m.get("userData"), "surfaceFinish") != "vapor" &&
      geometry.get(str(n, "geometry")) is Some(g) &&
      has_field(g, "data") &&
      has_field(@archive.prop(g.get("data"), "attributes"), "position") &&
      !has_field(g.get("data"), "morphAttributes") &&
      !has_field(g.get("data"), "drawRange") {
      let d = g.get("data")
      let coords = view(d.get("attributes").get("position").get("array"))
      let indices = if has_field(d, "index") {
        Some(view(d.get("index").get("array")))
      } else {
        None
      }
      fn add(matrix : @math.Matrix4, start : Int32, count : Int32) {
        if matrix.determinant() <= 0 {
          return
        }
        for i = start; i + 5 < start + count; i = i + 6 {
          add_quad(
            FixedArray::makei(6, j => {
              let k = (match indices {
                  Some(ix) => ix.get_int(i + j)
                  None => i + j
                }) *
                3
              project(matrix, coords[k], coords[k + 1], coords[k + 2])
            }),
          )
        }
      }
      if str(n, "type") == "BatchedMesh" {
        let matrices = matrices_for(n, textures, images)
        let entries = array_field(n, "instanceInfo")
        let geometries = array_field(n, "geometryInfo")
        if matrices.length() >= entries.length() * 16 {
          for i, e in entries {
            if enabled_instance(e) {
              let part = geometries[int_field(e, "geometryIndex")]
              let transform = @math.Matrix4::new().from_array(
                [
                  for j in 0..<16 => matrices[i * 16 + j]
                ],
              )
              add(
                world.clone().multiply(transform),
                int_field(part, "start"),
                int_field(part, "count"),
              )
            }
          }
        }
      } else {
        add(
          world,
          0,
          match indices {
            Some(ix) => ix.length()
            None => coords.length() / 3
          },
        )
      }
    }
    for child in children(n) {
      visit(child, world)
    }
  }
  for child in children(root) {
    visit(child, node_matrix(root))
  }
  // Join only completely covered coplanar tiles with the same winding.
  // A missing tile at a doorway or stairwell always breaks the rectangle.
  let faces : Array[(Int32, Double, Int32, Int32, Int32, Int32)] = []
  for (face, plane), tiles in sheets {
    let ordered = tiles.iter().to_array()
    ordered.sort_by((a, b) => {
      if a.1 == b.1 {
        a.0.compare(b.0)
      } else {
        a.1.compare(b.1)
      }
    })
    for (x, y) in ordered {
      if !tiles.contains((x, y)) {
        continue
      }
      let mut u = x + 1
      let mut v = y + 1
      while tiles.contains((u, y)) {
        u += 1
      }
      fn full(row : Int32) -> Bool {
        for i in x..<u {
          if !tiles.contains((i, row)) {
            return false
          }
        }
        true
      }
      while full(v) {
        v += 1
      }
      for j in y..<v {
        for i in x..<u {
          tiles.remove((i, j)) |> ignore
        }
      }
      if (u - x) * (v - y) >= 24 {
        faces.push((face, plane, x * 2, y * 2, u * 2, v * 2))
      }
    }
  }
  user_data(root).set("opaqueFaces", Raw::from_json(@json.to_json(faces)))
}
