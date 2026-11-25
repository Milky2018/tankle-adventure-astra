///|
type Raw = @core.JsValue

///|
extern "js" fn string_field(obj : Raw, key : String) -> String = "(o,k) => o?.[k] ?? ''"

///|
extern "js" fn array_field(obj : Raw, key : String) -> FixedArray[Raw] = "(o,k) => o?.[k] ?? []"

///|
extern "js" fn truthy(obj : Raw, key : String) -> Bool = "(o,k) => !!o?.[k]"

///|
fn resource_index(items : FixedArray[Raw]) -> Map[String, Raw] {
  let result = Map([])
  for item in items {
    result[string_field(item, "uuid")] = item
  }
  result
}

///|
fn cell_key(p : FixedArray[Double], size : Double) -> String {
  let coord = (v : Double) => (v / size + 0.5).floor().to_int()
  "\{coord(p[0])}/\{coord(p[1])}/\{coord(p[2])}"
}

///|
fn scenery(name : String) -> Bool {
  let categories = [
    "Works", "Engine house", "Workshop services", "Hoist well", "Carriage", "Control bezel",
    "Roof trusses", "Roof soffits", "Equipment", "District equipment", "Inspection gallery",
    "Hydraulic rods", "Filter garden", "Angle guards",
  ]
  categories.any(category => name.has_prefix(category + " · "))
}

///|
fn numbered(segment : StringView) -> Bool {
  !segment.is_empty() && segment.iter().all(c => c >= '0' && c <= '9')
}

///|
extern "js" fn material_properties(m : Raw) -> Raw =
  #| ({uuid, name, color, vertexColors, ...properties}) => properties

///|
extern "js" fn signature(value : Raw) -> String = "(v) => JSON.stringify(v)"

///|
extern "js" fn tint_material(scene : Raw, props : Raw, uuid : String) -> Unit =
  #| (scene, props, uuid) => scene.materials.push({...props, uuid, color: 0xffffff, vertexColors: true})

///|
extern "js" fn state_key(
  anchor : Raw,
  id : String,
  cell : String,
  node : Raw,
) -> String =
  #| (a,id,cell,n) => JSON.stringify([a.uuid,id,cell,n.castShadow,n.receiveShadow,n.renderOrder,n.layers])

///|
extern "js" fn add_batch(scene : Raw, payload : Raw) -> Raw =
  #| (s,j) => {
  #|   s.geometries.push(...j.geometries); s.images.push(...j.images); s.textures.push(...j.textures);
  #|   for (const key of ["matricesTexture","indirectTexture"]) j.object[key] = {uuid:j.object[key].uuid};
  #|   return j.object;
  #| }

///|
extern "js" fn add_mesh(
  scene : Raw,
  geometry : Raw,
  uuid : String,
  matrix : FixedArray[Double],
) -> Raw =
  #| (s,g,uuid,matrix) => { s.geometries.push(g); return {uuid,type:"Mesh",geometry:g.uuid,matrix} }

///|
extern "js" fn mount_draw(
  anchor : Raw,
  draw : Raw,
  id : String,
  original : Raw,
) -> Unit =
  #| (a,d,id,{castShadow,receiveShadow,renderOrder,layers}) => {
  #|   Object.assign(d,{name:"Workshop fittings",material:id,matrixAutoUpdate:false,castShadow,receiveShadow,renderOrder,layers});
  #|   a.children.push(d);
  #| }

///|
extern "js" fn make_group(node : Raw) -> Unit =
  #| n => { n.type="Group"; delete n.material; delete n.geometry }

///|
extern "js" fn keep_children(node : Raw, include_child : (Raw) -> Bool) -> Unit =
  #| (n, keep) => { if (n.children) n.children = n.children.filter(keep) }

///|
extern "js" fn identity_set() -> Raw = "() => new Set()"

///|
extern "js" fn remember(set : Raw, obj : Raw) -> Unit = "(s,o) => s.add(o)"

///|
extern "js" fn remembered(set : Raw, obj : Raw) -> Bool = "(s,o) => s.has(o)"

///|
priv struct Part {
  node : Raw
  geometry : Raw
  material : Raw
  transform : FixedArray[Double]
  center : FixedArray[Double]
  picking : Bool
}

///|
pub fn batch_fittings(
  scene : @core.JsValue,
  barriers : FixedArray[@core.JsValue],
  controls : FixedArray[@core.JsValue],
  center_of : (@core.JsValue) -> FixedArray[Double],
  geometry_of : (@core.JsValue) -> @core.BufferGeometry,
  group_depth : ((FixedArray[@core.BufferGeometry]) -> @core.JsValue) -> Unit,
) -> Unit {
  if array_field(scene, "animations").length() != 0 {
    return
  }
  let root = scene.get("object")
  let walls = Map([])
  for wall in barriers {
    if truthy(wall, "permanent") &&
      !truthy(wall, "motion") &&
      !truthy(wall, "rail") &&
      !truthy(wall, "arena") {
      walls["world/walls/" + string_field(wall, "circuitKey") + "/mesh"] = wall
    }
  }
  let fixed_controls = Set([])
  for c in controls {
    if !truthy(c, "mount") {
      fixed_controls.add("world/controls/" + string_field(c, "id") + "/root")
    }
  }
  let geometries = resource_index(array_field(scene, "geometries"))
  let materials = resource_index(array_field(scene, "materials"))
  let groups : Map[String, (Raw, String, Array[Part])] = Map([])
  let tinted : Map[String, String] = Map([])
  let mut serial = 0
  fn fresh(prefix : String) -> String {
    let id = "\{prefix}\{serial}"
    serial += 1
    id
  }
  fn visit(
    node : Raw,
    anchor : Raw,
    parent : FixedArray[Double],
    picking : Bool,
  ) {
    let id = binding(node)
    let path = id.split("/").to_array()
    let fixed_track = match path {
      ["enemies", enemy, "model", "tracks", i] =>
        !enemy.is_empty() && numbered(i)
      _ => false
    }
    let placement = match path {
      ["world", "occluders" | "signs", i, "root"] => numbered(i)
      ["world", "controlFeeds", key, "root"] => !key.is_empty()
      ["world", "belts", belt, "segments", i, "root"] =>
        !belt.is_empty() && numbered(i)
      _ => false
    }
    let fitting = placement ||
      (match path {
        ["world", "occluders", a, "meshes", b, "mesh"] =>
          numbered(a) && numbered(b)
        _ => false
      })
    let name = string_field(node, "name")
    let decoration = id.is_empty() && scenery(name)
    let collider = scenery(name) &&
      id.has_prefix("structure/") &&
      id.has_suffix("/fixture-collider")
    let transform = compose_transform(parent, node.get("matrix").cast())
    let world = anchor.strict_equal(root)
    // A displaced wall in an editor snapshot keeps its own transform.
    let fixed_wall = if world && walls.get(id) is Some(w) {
      fn n(key : String) -> Double {
        w.get(key).cast()
      }
      transform[12] == n("x") + n("w") / 2 &&
      transform[13] == n("y") + n("h") / 2 &&
      transform[14] == n("z") + n("d") / 2
    } else {
      false
    }
    let mesh = string_field(node, "type") == "Mesh"
    let leaf = children(node).length() == 0
    if (fitting || (leaf && (fixed_track || decoration))) &&
      mesh &&
      visible(node) &&
      materials.get(string_field(node, "material")) is Some(m) &&
      visible(m) &&
      !m.get("color").is_undefined() &&
      string_field(m.get("userData"), "surfaceFinish") != "glass" &&
      geometries.get(string_field(node, "geometry")) is Some(g) &&
      truthy(g, "data") {
      let attrs = g.get("data").get("attributes")
      if !attrs.is_undefined() &&
        (
          attrs.key_count() == 3 ||
          (attrs.key_count() == 4 && truthy(attrs, "color"))
        ) &&
        truthy(attrs, "normal") &&
        truthy(attrs, "position") &&
        truthy(attrs, "uv") &&
        (
          !truthy(m, "vertexColors") ||
          (
            truthy(attrs, "color") &&
            attrs.get("color").get("itemSize").cast() == 3
          )
        ) &&
        determinant(transform) > 0 {
        let props = material_properties(m)
        let sig = signature(props)
        if tinted.get(sig) is None {
          let mat_id = fresh("fitting-material-")
          tint_material(scene, props, mat_id)
          tinted[sig] = mat_id
        }
        let mat_id = tinted[sig]
        let c = center_of(g)
        let center = project(transform, c[0], c[1], c[2])
        let key = state_key(
          anchor,
          mat_id,
          cell_key(center, if world { 240 } else { 40 }),
          node,
        )
        if groups.get(key) is None {
          groups[key] = (anchor, mat_id, [])
        }
        groups[key].2.push({
          node,
          geometry: g,
          material: m,
          transform,
          center,
          picking,
        })
      }
    }
    let wrapper = id.is_empty() &&
      (name.is_empty() || name.has_prefix("local-circuit:"))
    // Moving and separately bound parts start a new transform and picking frame.
    let flatten = visible(node) &&
      !has_order(node) &&
      array_field(node, "animations").length() == 0 &&
      (
        fixed_wall ||
        (fitting && mesh) ||
        (
          string_field(node, "type") == "Group" &&
          (
            placement ||
            fixed_controls.contains(id) ||
            decoration ||
            wrapper ||
            collider
          )
        )
      )
    for child in children(node) {
      if flatten {
        visit(child, anchor, transform, collider || picking)
      } else {
        visit(child, node, identity(), collider)
      }
    }
  }
  visit(root, root, identity(), false)
  fn multidraw(cells : FixedArray[@core.BufferGeometry]) -> Raw {
    add_batch(scene, batch_json(cells, fresh("fitting-multidraw-")))
  }
  group_depth(multidraw)
  let replaced = identity_set()
  for group in groups.values() {
    let (anchor, mat_id, parts) = group
    guard parts.length() >= 2 else { continue }
    let cells : Map[String, Array[Part]] = Map([])
    for part in parts {
      let cell = if anchor.strict_equal(root) {
        cell_key(part.center, 24)
      } else {
        "local"
      }
      if cells.get(cell) is None {
        cells[cell] = []
      }
      cells[cell].push(part)
    }
    let merged = [
      for cell in cells.values() => {
        merge_parts(
          FixedArray::makei(cell.length(), i => geometry_of(cell[i].geometry)),
          FixedArray::makei(cell.length(), i => cell[i].transform),
          FixedArray::makei(cell.length(), i => {
            cell[i].material.get("color").cast()
          }),
          FixedArray::makei(cell.length(), i => {
            truthy(cell[i].material, "vertexColors")
          }),
        )
      }
    ]
    let draw = if merged.length() == 1 {
      let g = geometry_json(merged[0], fresh("fitting-geometry-"))
      add_mesh(scene, g, fresh("fitting-chunk-"), identity())
    } else {
      multidraw(FixedArray::from_array(merged[:]))
    }
    mount_draw(anchor, draw, mat_id, parts[0].node)
    for part in parts {
      if part.picking {
        part.node.set("visible", @core.JsValue::of(false))
      } else if children(part.node).length() > 0 {
        make_group(part.node)
      } else {
        remember(replaced, part.node)
      }
    }
  }
  fn remove_originals(node : Raw) {
    keep_children(node, child => !remembered(replaced, child))
    for child in children(node) {
      remove_originals(child)
    }
  }
  remove_originals(root)
}
