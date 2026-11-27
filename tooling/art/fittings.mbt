///|
type Raw = @core.JsValue

///|
using @archive {str}

///|
fn array_field(obj : Raw, key : String) -> FixedArray[Raw] {
  @archive.items(@archive.prop(obj, key))
}

///|
fn has_field(obj : Raw, key : String) -> Bool {
  let v = @archive.prop(obj, key)
  !v.is_null() && !v.is_undefined()
}

///|
fn resource_index(items : FixedArray[Raw]) -> Map[String, Raw] {
  let result = Map([])
  for item in items {
    result[str(item, "uuid")] = item
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
  !segment.is_empty() && segment.iter().all(c => c.is_ascii_digit())
}

///|
fn material_properties(m : Raw) -> Raw {
  let props = @archive.copy(m)
  for k in ["uuid", "name", "color", "vertexColors"] {
    @archive.remove(props, k)
  }
  props
}

///|
fn signature(value : Raw) -> String {
  @archive.stringify(value)
}

///|
fn tint_material(scene : Raw, props : Raw, uuid : String) -> Unit {
  let material = @archive.copy(props)
  material.set("uuid", Raw::of(uuid))
  material.set("color", Raw::of(0xffffff))
  material.set("vertexColors", Raw::of(true))
  @archive.append(scene.get("materials"), material)
}

///|
#derive(Eq, Hash)
priv struct DrawGroup {
  anchor : Int32
  material : String
  cell : String
  cast_shadow : Bool?
  receive_shadow : Bool?
  order : Double?
  layers : Double?
}

///|
fn boolean_field(object : Raw, key : String) -> Bool? {
  let v = object.get(key)
  if v.strict_equal(Raw::of(true)) {
    Some(true)
  } else if v.strict_equal(Raw::of(false)) {
    Some(false)
  } else {
    None
  }
}

///|
fn numeric_field(object : Raw, key : String) -> Double? {
  let v = object.get(key)
  if @archive.is_number(v) {
    Some(v.cast())
  } else {
    None
  }
}

///|
fn add_batch(scene : Raw, payload : Raw) -> Raw {
  for k in ["geometries", "images", "textures"] {
    for item in @archive.items(payload.get(k)) {
      @archive.append(scene.get(k), item)
    }
  }
  let obj = payload.get("object")
  for k in ["matricesTexture", "indirectTexture"] {
    obj.set(k, @archive.obj([("uuid", obj.get(k).get("uuid"))]))
  }
  obj
}

///|
fn add_mesh(
  scene : Raw,
  geometry : Raw,
  uuid : String,
  matrix : FixedArray[Double],
) -> Raw {
  @archive.append(scene.get("geometries"), geometry)
  @archive.obj([
    ("uuid", Raw::of(uuid)),
    ("type", Raw::of("Mesh")),
    ("geometry", geometry.get("uuid")),
    ("matrix", Raw::of(matrix)),
  ])
}

///|
fn mount_draw(anchor : Raw, draw : Raw, id : String, original : Raw) -> Unit {
  draw.set("name", Raw::of("Workshop fittings"))
  draw.set("material", Raw::of(id))
  draw.set("matrixAutoUpdate", Raw::of(false))
  for k in ["castShadow", "receiveShadow", "renderOrder", "layers"] {
    draw.set(k, original.get(k))
  }
  @archive.append(anchor.get("children"), draw)
}

///|
fn make_group(node : Raw) -> Unit {
  node.set("type", Raw::of("Group"))
  @archive.remove(node, "material")
  @archive.remove(node, "geometry")
}

///|
fn keep_children(node : Raw, include_child : (Raw) -> Bool) -> Unit {
  let children = node.get("children")
  if !children.is_undefined() {
    node.set(
      "children",
      Raw::from_array(
        [ for n in @archive.items(children) if include_child(n) => n ][:],
      ),
    )
  }
}

///|
priv struct Part {
  node : Raw
  geometry : Raw
  color : Int32
  vertex_colors : Bool
  transform : @math.Matrix4
  center : FixedArray[Double]
  picking : Bool
}

///|
fn FittingBake::fresh(self : FittingBake, prefix : String) -> String {
  let id = prefix + self.serial.to_string()
  self.serial += 1
  id
}

///|
fn FittingBake::multidraw(
  self : FittingBake,
  cells : FixedArray[@core.BufferGeometry],
) -> Raw {
  add_batch(self.scene, batch_json(cells, self.fresh("fitting-multidraw-")))
}

///|
fn FittingBake::batch_fittings(
  self : FittingBake,
  fixtures : FixtureLayout,
) -> Unit {
  let root = self.scene.get("object")
  let groups : Map[DrawGroup, (Raw, Array[Part])] = Map([])
  let tinted : Map[String, String] = Map([])
  let anchors : @webgl.WeakMap[Raw, Int32] = @webgl.WeakMap::new()
  let mut next_anchor = 0
  fn anchor_id(node : Raw) -> Int32 {
    if anchors.get(node) is Some(id) {
      return id
    }
    let id = next_anchor
    next_anchor += 1
    anchors.set(node, id)
    id
  }

  fn visit(
    node : Raw,
    anchor : Raw,
    parent : @math.Matrix4,
    picking : Bool,
    rigid : Bool,
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
    let name = str(node, "name")
    let plain = str(node, "type") == "Group" || str(node, "type") == "Mesh"
    let passive = rigid &&
      id.is_empty() &&
      plain &&
      visible(node) &&
      !has_field(node.get("userData"), "renderRole") &&
      array_field(node, "animations").is_empty()
    let decoration = id.is_empty() && (scenery(name) || passive)
    let collider = scenery(name) &&
      id.has_prefix("structure/") &&
      id.has_suffix("/fixture-collider")
    let transform = parent.clone().multiply(node_matrix(node))
    let world = anchor.strict_equal(root)
    // A displaced wall in an editor snapshot keeps its own transform.
    let fixed_wall = world &&
      fixtures.walls.get(id) ==
      Some(
        (transform.elements[12], transform.elements[13], transform.elements[14]),
      )
    let mesh = str(node, "type") == "Mesh"
    let leaf = children(node).length() == 0
    let wall_surface = fixed_wall && leaf
    if (wall_surface || fitting || (leaf && (fixed_track || decoration))) &&
      mesh &&
      visible(node) &&
      self.materials.get(str(node, "material")) is Some(m) &&
      visible(m) &&
      (
        !(passive || wall_surface) ||
        (
          !m.get("transparent").strict_equal(Raw::of(true)) &&
          !has_field(m, "displacementMap") &&
          [
            "MeshStandardMaterial", "MeshToonMaterial", "MeshLambertMaterial", "MeshBasicMaterial",
          ].contains(str(m, "type"))
        )
      ) &&
      !m.get("color").is_undefined() &&
      str(m.get("userData"), "surfaceFinish") != "glass" &&
      self.geometries.get(str(node, "geometry")) is Some(g) &&
      has_field(g, "data") {
      let attrs = g.get("data").get("attributes")
      if !attrs.is_undefined() &&
        (
          attrs.key_count() == 3 ||
          (attrs.key_count() == 4 && has_field(attrs, "color"))
        ) &&
        has_field(attrs, "normal") &&
        has_field(attrs, "position") &&
        has_field(attrs, "uv") &&
        (
          !m.get("vertexColors").strict_equal(Raw::of(true)) ||
          (
            has_field(attrs, "color") &&
            attrs.get("color").get("itemSize").cast() == 3
          )
        ) &&
        transform.determinant() > 0 {
        let props = material_properties(m)
        let sig = signature(props)
        let mat_id = tinted.get_or_init(sig, () => {
          let id = self.fresh("fitting-material-")
          tint_material(self.scene, props, id)
          id
        })
        let c = self.center(g)
        let center = project(transform, c[0], c[1], c[2])
        let key : DrawGroup = {
          anchor: anchor_id(anchor),
          material: mat_id,
          cell: cell_key(center, if world { 240 } else { 40 }),
          cast_shadow: boolean_field(node, "castShadow"),
          receive_shadow: boolean_field(node, "receiveShadow"),
          order: numeric_field(node, "renderOrder"),
          layers: numeric_field(node, "layers"),
        }
        groups.get_or_init(key, () => (anchor, [])).1.push({
          node,
          geometry: g,
          color: int_field(m, "color"),
          vertex_colors: m.get("vertexColors").strict_equal(Raw::of(true)),
          transform,
          center,
          picking: picking || wall_surface,
        })
      }
    }
    let wrapper = id.is_empty() &&
      (name.is_empty() || name.has_prefix("local-circuit:"))
    // Moving and separately bound parts start a new transform and picking frame.
    let flatten = visible(node) &&
      numeric_field(node, "renderOrder").unwrap_or(0) == 0 &&
      array_field(node, "animations").length() == 0 &&
      (
        fixed_wall ||
        (fitting && mesh) ||
        (
          str(node, "type") == "Group" &&
          (
            placement ||
            fixtures.controls.contains(id) ||
            decoration ||
            wrapper ||
            collider
          )
        )
      )
    // Bound transforms and independently animated assemblies retain their own
    // frames. Only motionless unbound trim can pass through to a world batch.
    let child_rigid = node.strict_equal(root) ||
      passive ||
      fixed_wall ||
      fixtures.controls.contains(id) ||
      placement ||
      collider ||
      (
        id.has_prefix("world/controls/") &&
        (id.has_suffix("/moving") || id.contains("/housing/"))
      ) ||
      (id.has_prefix("world/views/") && !id.contains("/mirrors/"))
    for child in children(node) {
      if flatten {
        visit(child, anchor, transform, collider || picking, child_rigid)
      } else {
        visit(child, node, @math.Matrix4::new(), collider, child_rigid)
      }
    }
  }
  visit(root, root, @math.Matrix4::new(), false, false)
  self.regroup_static()
  let replaced : @webgl.WeakMap[Raw, Bool] = @webgl.WeakMap::new()
  for key, group in groups {
    let (anchor, parts) = group
    guard parts.length() >= 2 else { continue }
    let cells : Map[String, Array[Part]] = Map([])
    for part in parts {
      let cell = if anchor.strict_equal(root) {
        cell_key(part.center, 24)
      } else {
        "local"
      }
      cells.get_or_init(cell, () => []).push(part)
    }
    let merged = [ for cell in cells.values() => self.merge_parts(cell) ]
    let draw = if merged.length() == 1 {
      let g = geometry_json(merged[0], self.fresh("fitting-geometry-"))
      add_mesh(
        self.scene,
        g,
        self.fresh("fitting-chunk-"),
        FixedArray::from_array(@math.Matrix4::new().elements[:]),
      )
    } else {
      self.multidraw(FixedArray::from_array(merged[:]))
    }
    mount_draw(anchor, draw, key.material, parts[0].node)
    for part in parts {
      if part.picking {
        part.node.set("visible", @core.JsValue::of(false))
      } else if children(part.node).length() > 0 {
        make_group(part.node)
      } else {
        replaced.set(part.node, true)
      }
    }
  }
  fn remove_originals(node : Raw) {
    keep_children(node, child => !replaced.has(child))
    for child in children(node) {
      remove_originals(child)
    }
  }
  remove_originals(root)
}
