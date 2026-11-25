///|
pub fn camera_faces(scene : Raw, view : (Raw) -> Raw) -> Unit {
  let geometry = resource_index(array_field(scene, "geometries"))
  let materials = resource_index(array_field(scene, "materials"))
  let faces : Set[@scene_format.Bounds] = Set([])
  fn visit(n : Raw, parent : @math.Matrix4, fixture_parent : Bool) {
    if !visible(n) || array_field(n, "animations").length() > 0 {
      return
    }
    let fixture = fixture_parent || binding(n).has_suffix("/fixture-collider")
    let matrix = parent.clone().multiply(node_matrix(n))
    let material_ok = match materials.get(string_field(n, "material")) {
      None => true
      Some(m) => visible(m) && !truthy(m, "wireframe")
    }
    if material_ok &&
      (fixture || string_field(n.get("userData"), "renderRole") == "enclosure") &&
      geometry.get(string_field(n, "geometry")) is Some(g) &&
      truthy(@archive.prop(g.get("data"), "attributes"), "position") {
      let d = g.get("data")
      let pos : FixedArray[Double] = view(
        d.get("attributes").get("position").get("array"),
      ).cast()
      let indexed = truthy(d, "index")
      let idx : FixedArray[Int32] = if indexed {
        view(d.get("index").get("array")).cast()
      } else {
        []
      }
      let count = if indexed { idx.length() } else { pos.length() / 3 }
      for i = 0; i + 5 < count; i = i + 6 {
        let p = FixedArray::makei(6, j => {
          let v = 3 * (if indexed { idx[i + j] } else { i + j })
          let coord = project(matrix, pos[v], pos[v + 1], pos[v + 2])
          FixedArray::makei(3, k => (coord[k] * 1000 + 0.5).floor() * 0.001)
        })
        let lo = [p[0][0], p[0][1], p[0][2]]
        let hi = lo.copy()
        for pt in p {
          for k in 0..<3 {
            lo[k] = lo[k].min(pt[k])
            hi[k] = hi[k].max(pt[k])
          }
        }
        guard [0, 1, 2].iter().filter(k => lo[k] == hi[k]).count() == 1 &&
          p
          .iter()
          .all(pt => [0, 1, 2].iter().all(k => pt[k] == lo[k] || pt[k] == hi[k])) else {
          continue
        }
        let spans = [ for k in 0..<3 => hi[k] - lo[k] ]
        spans.sort()
        guard spans[2] >= 1.8 && spans[1] >= 0.35 else { continue }
        let corner = FixedArray::makei(6, j => {
          let mut bits = 0
          for k in 0..<3 {
            if p[j][k] == hi[k] {
              bits = bits | (1 << k)
            }
          }
          bits
        })
        let common = [
          for j in 0..<3 if corner[j] == corner[3] ||
          corner[j] == corner[4] ||
          corner[j] == corner[5] => j
        ]
        guard common is [a, b] &&
          Set::from_array(Array::from_fixed_array(corner)[:]).length() == 4 else {
          continue
        }
        let mut length = 0.0
        for k in 0..<3 {
          let delta = p[a][k] - p[b][k]
          length += delta * delta
        }
        guard length >= spans[2] * spans[2] + spans[1] * spans[1] - 0.00001 else {
          continue
        }
        faces.add({ min: (lo[0], lo[1], lo[2]), max: (hi[0], hi[1], hi[2]), })
      }
    }
    for c in children(n) {
      visit(c, matrix, fixture)
    }
  }
  let root = scene.get("object")
  visit(root, @math.Matrix4::new(), false)
  user_data(root).set(
    "cameraFaces",
    Raw::from_json(@json.to_json(faces.to_array())),
  )
}
