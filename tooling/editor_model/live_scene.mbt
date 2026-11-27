// A native Object3D is the editable scene. Retain the source records separately:
// the editor does not interpret every Three.js extension or rebuild authored buffers.

///|
pub struct LiveProject {
  scene : @core.Object3D
  priv project : Raw
  priv library : SourceLibrary
}

///|
priv struct SourceLibrary {
  resources : Map[String, (String, Raw)]
  loaded_nodes : Set[String]
}

///|
priv struct SourceNode {
  record : Raw
  library : SourceLibrary
  matrix : @math.Matrix4
  name : String
  visible : Bool
  background : Json?
  materials : Array[String]
}

///|
priv struct SourceResource {
  record : Raw
  library : SourceLibrary
  color : Int32?
}

///|
let source_nodes : @webgl.WeakMap[@core.Object3D, SourceNode] = @webgl.WeakMap::new()

///|
let source_materials : @webgl.WeakMap[@core.Material, SourceResource] = @webgl.WeakMap::new()

///|
let source_geometry : @webgl.WeakMap[@core.BufferGeometry, SourceResource] = @webgl.WeakMap::new()

///|
fn material_ids(n : @core.Object3D) -> Array[String] {
  match n.get_material() {
    Some(Single(m)) => [m.uuid]
    Some(Multiple(ms)) => ms.map(m => m.uuid)
    None => []
  }
}

///|
fn background(node : @core.Object3D) -> Json? {
  guard node.kind is Scene(scene) else { return None }
  match scene.background {
    Some(Color(c)) => Some(Json::number(c.get_hex().to_double()))
    Some(Texture(t)) => Some(Json::string(t.uuid))
    None => None
  }
}

///|
pub fn LiveProject::attach(
  project : Raw,
  scene : @core.Object3D,
) -> LiveProject {
  let asset = project.get("scene")
  let library : SourceLibrary = { resources: Map([]), loaded_nodes: Set([]), }
  for table in @archive.resource_libraries {
    for item in array(asset, table) {
      library.resources[uuid(item)] = (table, item)
    }
  }
  let records = Map([])
  @archive.walk(asset.get("object"), n => records[uuid(n)] = n)
  scene.traverse(n => {
    guard records.get(n.uuid) is Some(record) else { return }
    library.loaded_nodes.insert(n.uuid)
    if n.matrix_auto_update {
      n.update_matrix()
    }
    source_nodes.set(n, {
      record,
      library,
      matrix: n.matrix.clone(),
      name: n.name,
      visible: n.visible,
      background: background(n),
      materials: material_ids(n),
    })
    if n.get_geometry() is Some(g) &&
      library.resources.get(str(record, "geometry")) is Some((_, original)) {
      source_geometry.set(g, { record: original, library, color: None, })
    }
    fn remember(m : @core.Material, id : Raw) {
      if @archive.is_string(id) &&
        library.resources.get(id.cast()) is Some((_, original)) {
        source_materials.set(m, {
          record: original,
          library,
          color: m.color.map(c => c.get_hex()),
        })
      }
    }
    let ids = record.get("material")
    match n.get_material() {
      Some(Single(m)) => remember(m, ids)
      Some(Multiple(ms)) if @archive.is_array(ids) => {
        let rows = @archive.items(ids)
        for i, m in ms {
          if i < rows.length() {
            remember(m, rows[i])
          }
        }
      }
      _ => ()
    }
  })
  { project, scene, library, }
}

///|
pub async fn LiveProject::open(project : Raw) -> LiveProject {
  LiveProject::attach(project, load_scene(project.get("scene")))
}

///|
pub async fn LiveProject::from_scene(raw : Raw) -> LiveProject {
  LiveProject::open(@archive.obj([("scene", raw)]))
}

///|
pub fn copy_material(original : @core.Material) -> @core.Material {
  let copy = original.clone()
  if source_materials.get(original) is Some(source) {
    source_materials.set(copy, source)
  }
  copy
}

///|
fn copy_geometry(original : @core.BufferGeometry) -> @core.BufferGeometry {
  let copy = original.clone()
  if source_geometry.get(original) is Some(source) {
    source_geometry.set(copy, source)
  }
  copy
}

///|
priv struct OutputLibrary {
  primary : SourceLibrary
  tables : Map[String, Array[Raw]]
  entries : Map[(String, String), Int32]
}

///|
fn OutputLibrary::put(self : OutputLibrary, table : String, item : Raw) -> Unit {
  let id = (table, uuid(item))
  let rows = self.tables.get_or_init(table, () => [])
  match self.entries.get(id) {
    Some(i) => rows[i] = item
    None => {
      self.entries[id] = rows.length()
      rows.push(item)
    }
  }
}

///|
// Bring in only the dependencies used by an entity from another template library.
fn OutputLibrary::dependencies(
  self : OutputLibrary,
  library : SourceLibrary,
  value : Raw,
) -> Unit {
  if @archive.is_string(value) {
    if library.resources.get(value.cast()) is Some((table, item)) &&
      !self.entries.contains((table, uuid(item))) {
      self.put(table, item)
      self.dependencies(library, item)
    }
  } else if @archive.is_array(value) {
    for v in @archive.items(value) {
      self.dependencies(library, v)
    }
  } else if exists(value) && !@archive.is_number(value) {
    for k in @archive.keys(value) {
      if k == "children" {
        continue
      }
      // BufferAttribute.array and typed image pixels contain only numeric samples.
      if (k == "array" || k == "data") &&
        @scene_format.element_width(str(value, "type")) is Some(_) {
        continue
      }
      self.dependencies(library, value.get(k))
    }
  }
}

///|
fn OutputLibrary::geometry(
  self : OutputLibrary,
  geometry : @core.BufferGeometry,
) -> String {
  if self.entries.contains(("geometries", geometry.uuid)) {
    return geometry.uuid
  }
  if source_geometry.get(geometry) is Some(source) {
    let record = @archive.copy(source.record)
    record.set("uuid", Raw::of(geometry.uuid))
    self.put("geometries", record)
    self.dependencies(source.library, record)
  } else {
    self.put("geometries", Raw::from_json(geometry.to_json()))
  }
  geometry.uuid
}

///|
fn OutputLibrary::material(
  self : OutputLibrary,
  material : @core.Material,
) -> String {
  if source_materials.get(material) is Some(source) {
    let color = material.color.map(c => c.get_hex())
    if !self.entries.contains(("materials", material.uuid)) ||
      color != source.color {
      let record = @archive.copy(source.record)
      record.set("uuid", Raw::of(material.uuid))
      if color != source.color && color is Some(hex) {
        record.set("color", Raw::of(hex))
      }
      self.put("materials", record)
      self.dependencies(source.library, record)
    }
  } else if !self.entries.contains(("materials", material.uuid)) {
    let record = Raw::from_json(material.to_json())
    for key in ["textures", "images"] {
      for entry in array(record, key) {
        self.put(key, entry)
      }
      @archive.remove(record, key)
    }
    self.put("materials", record)
  }
  material.uuid
}

///|
// BatchedMesh clones its internal DataTextures. Reuse the authored pixels and
// sampler metadata under the native copy's texture and image identities.
fn OutputLibrary::batch_texture(
  self : OutputLibrary,
  origin : SourceNode,
  record : Raw,
  field : String,
  native : @core.Texture?,
) -> Unit {
  guard native is Some(texture) else { return }
  let inline = origin.record.get(field)
  guard exists(inline) &&
    origin.library.resources.get(uuid(inline)) is Some(("textures", original)) else {
    return
  }
  let copy = @archive.copy(original)
  copy.set("uuid", Raw::of(texture.uuid))
  if origin.library.resources.get(str(original, "image"))
    is Some(("images", image)) {
    if !self.entries.contains(("images", texture.source.uuid)) {
      let pixels = @archive.copy(image)
      pixels.set("uuid", Raw::of(texture.source.uuid))
      self.put("images", pixels)
    }
    copy.set("image", Raw::of(texture.source.uuid))
  }
  self.put("textures", copy)
  let reference = @archive.copy(inline)
  reference.set("uuid", Raw::of(texture.uuid))
  if exists(inline.get("image")) {
    reference.set("image", copy.get("image"))
  }
  record.set(field, reference)
}

///|
fn OutputLibrary::write_node(
  self : OutputLibrary,
  node : @core.Object3D,
) -> Raw {
  if node.matrix_auto_update {
    node.update_matrix()
  }
  let source = source_nodes.get(node)
  let record = match source {
    Some(origin) => {
      let record = @archive.copy(origin.record)
      record.set("uuid", Raw::of(node.uuid))
      if node.name != origin.name {
        record.set("name", Raw::of(node.name))
      }
      if node.visible != origin.visible {
        record.set("visible", Raw::of(node.visible))
      }
      if !node.matrix.equals(origin.matrix) {
        record.set("matrix", Raw::from_array(node.matrix.to_array()[:]))
      }
      let bg = background(node)
      if bg != origin.background {
        match bg {
          Some(value) => record.set("background", Raw::from_json(value))
          None => @archive.remove(record, "background")
        }
      }
      record
    }
    None => {
      // Write one native node; its children may have authored source records of their own.
      let baked = {
        let children = node.children
        defer {
          node.children = children
        }
        node.children = []
        Raw::from_json(node.to_json())
      }
      for table in @archive.resource_libraries {
        for item in array(baked, table) {
          if !self.entries.contains((table, uuid(item))) {
            self.put(table, item)
          }
        }
      }
      baked.get("object")
    }
  }
  if node.user_data.key_count() > 0 || exists(record.get("userData")) {
    record.set("userData", node.user_data)
  }
  if exists(record.get("geometry")) && node.get_geometry() is Some(g) {
    record.set("geometry", Raw::of(self.geometry(g)))
  }
  // A loader may fabricate a default material for an omitted/unknown authored slot.
  let authored_material = record.get("material")
  let changed_materials = source is Some(origin) &&
    origin.materials != material_ids(node)
  match node.get_material() {
    Some(Single(m)) if changed_materials ||
      source_materials.has(m) ||
      source is None => record.set("material", Raw::of(self.material(m)))
    Some(Multiple(ms)) if changed_materials ||
      source is None ||
      @archive.is_array(authored_material) => {
      let ids = @archive.items(authored_material)
      record.set(
        "material",
        Raw::from_array(
          [
            for i, m in ms => {
              if changed_materials ||
                source_materials.has(m) ||
                i >= ids.length() {
                Raw::of(self.material(m))
              } else {
                ids[i]
              }
            }
          ][:],
        ),
      )
    }
    _ => ()
  }
  let out = node.children.map(n => self.write_node(n))
  if source is Some(origin) {
    if node.uuid != uuid(origin.record) &&
      node.kind is Mesh({ kind: BatchedMesh(batch), .. }) {
      self.batch_texture(
        origin,
        record,
        "matricesTexture",
        batch._matrices_texture,
      )
      self.batch_texture(
        origin,
        record,
        "indirectTexture",
        batch._indirect_texture,
      )
      self.batch_texture(origin, record, "colorsTexture", batch._colors_texture)
    }
    // Object types skipped by the loader have no live counterpart to edit.
    for i, child in array(origin.record, "children") {
      if !origin.library.loaded_nodes.contains(uuid(child)) {
        out.insert(i.min(out.length()), child)
      }
    }
    if !physical_equal(origin.library, self.primary) {
      self.dependencies(origin.library, record)
    }
  }
  if out.is_empty() && !exists(record.get("children")) {
    return record
  }
  record.set("children", Raw::from_array(out[:]))
  record
}

///|
pub fn LiveProject::serialize(self : LiveProject) -> Raw {
  let asset = @archive.copy(self.project.get("scene"))
  let library : OutputLibrary = {
    primary: self.library,
    tables: Map([]),
    entries: Map([]),
  }
  for table in @archive.resource_libraries {
    for item in array(asset, table) {
      library.put(table, item)
    }
  }
  asset.set("object", library.write_node(self.scene))
  for table, entries in library.tables {
    asset.set(table, Raw::from_array(entries[:]))
  }
  let project = @archive.copy(self.project)
  project.set("scene", asset)
  project
}
