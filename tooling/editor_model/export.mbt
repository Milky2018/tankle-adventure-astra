///|
fn revision() -> String {
  let chunks = [
    for f in @archive.list_files(directory) => {
      @archive.read_file(directory + "/" + f)
    }
  ]
  for f in ["city.scene.json.gz", "city.buffers.bin.gz"] {
    chunks.push(@archive.read_file("content/art/" + f))
  }
  @archive.digest(@archive.concat(FixedArray::from_array(chunks[:])))
}

///|
fn collidable(k : String) -> Bool {
  k is ("decks" | "architecture" | "obstacles")
}

///|
fn collision_object(k : String, r : Json) -> Raw raise {
  guard r
    is {
      "id": String(id),
      "x": Number(x, ..),
      "y": Number(y, ..),
      "z": Number(z, ..),
      "w": Number(w, ..),
      "d": Number(d, ..),
      ..
    } else {
    raise Failure("Invalid collider in " + k)
  }
  let h = if k == "decks" {
    0.25
  } else {
    guard r is { "h": Number(h, ..), .. } else {
      raise Failure("Missing collider height in " + k)
    }
    h
  }
  let matrix = matrix_value(
    @math.Matrix4::new()
    .make_scale(w, h, d)
    .set_position(
      x + w / 2,
      y + (if k == "decks" { -h } else { h }) / 2,
      z + d / 2,
    ),
  )
  let e = @archive.obj([
    ("collection", Raw::of(k)),
    ("id", Raw::of(id)),
    ("key", Raw::of(id)),
  ])
  let placement = @archive.obj([
    ("origin", Raw::from_array([x, y, z])),
    ("matrix", matrix),
  ])
  let ud = @archive.obj([
    ("editorOnly", Raw::of(true)),
    ("entity", e),
    ("placement", placement),
  ])
  @archive.obj([
    ("uuid", Raw::of(new_uuid())),
    ("type", Raw::of("Mesh")),
    ("name", Raw::of(k + ": " + id)),
    ("geometry", Raw::of("tankle-editor-collision-box")),
    ("material", Raw::of("tankle-editor-collision-material")),
    ("matrix", matrix),
    ("userData", ud),
  ])
}

///|
fn collision_resources(scene : Raw) -> Unit {
  append(
    scene.get("geometries"),
    Raw::from_json({
      "uuid": "tankle-editor-collision-box",
      "type": "BoxGeometry",
      "width": 1,
      "height": 1,
      "depth": 1,
    }),
  )
  append(
    scene.get("materials"),
    Raw::from_json({
      "uuid": "tankle-editor-collision-material",
      "type": "MeshBasicMaterial",
      "color": 5888511,
      "wireframe": true,
    }),
  )
}

///|
pub extern "js" fn buffer_text(buf : Raw) -> String = "b=>b.toString('utf8')"

///|
fn numeric_label(name : String) -> Bool {
  let parts = name.split("/").to_array()
  guard parts.length() >= 2 && (parts[0] == "enemies" || parts[0] == "world") else {
    return false
  }
  for i in 1..<parts.length().min(3) {
    if !parts[i].is_empty() && parts[i].iter().all(c => c >= '0' && c <= '9') {
      return true
    }
  }
  false
}

///|
pub fn export_project(
  selection? : String,
  colliders~ : Bool = false,
) -> Raw raise {
  let scene = @archive.read_scene()
  let catalog = EditableCatalog::read()
  let original = scene.get("object")
  let world = transforms(original)
  let mut prefix = ""
  let mut collider = Raw::undefined()
  if selection is Some(key) {
    if key == "player" {
      prefix = "player"
    } else {
      let mut ent = Raw::undefined()
      @archive.walk(original, n => {
        if exists(entity(n)) && entity_key(entity(n)) == key {
          ent = entity(n)
        }
      })
      if !exists(ent) &&
        key.split_once(":") is Some((lib, id)) &&
        collidable(lib.to_owned()) {
        let k = lib.to_owned()
        let matches = [
          for r in catalog.rows(k) if r is { "id": String(v), .. } &&
          v == id.to_owned() => r
        ]
        guard matches.length() < 2 else {
          raise Failure(
            "Ambiguous collider " +
            key +
            ". Give these records unique IDs in the catalog before exporting.",
          )
        }
        if matches.length() == 1 {
          collider = collision_object(k, matches[0])
          collision_resources(scene)
          world[uuid(collider)] = transform(collider)
          ent = entity(collider)
        }
      }
      guard exists(ent) else {
        raise Failure(
          "Unknown entity " +
          key +
          ". Use moon run cmd/editor -- export --list to see available objects.",
        )
      }
      prefix = entity_prefix(ent)
    }
  }
  let roots = []
  fn select(n : Raw) {
    if !n.strict_equal(original) &&
      (prefix.is_empty() || belongs_to(binding(n), prefix)) {
      let copy = clone(n)
      copy.set("matrix", matrix_value(world[uuid(n)]))
      roots.push(copy)
    } else {
      for child in children(n) {
        select(child)
      }
    }
  }
  if exists(collider) {
    roots.push(collider)
  } else {
    select(original)
  }
  if colliders && !exists(collider) {
    collision_resources(scene)
    for k in ["decks", "architecture", "obstacles"] {
      for i, r in catalog.rows(k) {
        let helper = collision_object(k, r)
        entity(helper).set("index", Raw::of(i))
        roots.push(helper)
        world[uuid(helper)] = transform(helper)
      }
    }
  }
  let root = @archive.copy(original)
  root.set("children", Raw::from_array(roots[:]))
  root.set("matrix", matrix_value(@math.Matrix4::new()))
  let user = @archive.copy(data(original))
  root.set("userData", user)
  let ids = [ for r in roots if !truth(data(r), "editorOnly") => uuid(r) ]
  let metadata = @archive.obj([
    ("version", Raw::of(1)),
    ("fullScene", Raw::of(selection is None)),
    ("revision", Raw::of(revision())),
    ("references", Raw::from_json(@json.to_json(catalog.references()))),
    ("roots", Raw::from_array(ids[:])),
  ])
  user.set("tankle", metadata)
  fn prepare(n : Raw) -> Unit raise {
    n.set("matrixAutoUpdate", Raw::of(true))
    if str(n, "type") == "BatchedMesh" {
      for key in ["availableInstanceIds", "availableGeometryIds"] {
        n.set("_" + key, n.get(key))
      }
    }
    if numeric_label(str(n, "name")) && exists(get(data(n), "binding")) {
      n.set("name", data(n).get("binding"))
    }
    let e = entity(n)
    if exists(e) {
      let k = str(e, "collection")
      guard catalog.find(e) is Some(slot) &&
        catalog.rows(k)[slot] is Object(record) else {
        raise Failure("Missing " + entity_key(e))
      }
      let game = record.filter((key, _) => {
        key != "x" && key != "y" && key != "z"
      })
      data(n).set("game", Raw::from_json(Json::object(game)))
      if k == "controls" {
        for circuit in catalog.rows("circuits") {
          if circuit is { "id": String(id), .. } && id == str(e, "id") {
            data(n).set("circuit", Raw::from_json(circuit))
            break
          }
        }
      }
      let y = match record.get("y") {
        Some(Number(_, ..) as y) => y
        _ =>
          match record.get("stops") {
            Some(Array([first, ..])) => first
            _ => raise Failure("Missing floor on " + entity_key(e))
          }
      }
      let place = @archive.obj([
        ("origin", Raw::from_json([record["x"], y, record["z"]])),
        ("matrix", matrix_value(world[uuid(n)])),
      ])
      data(n).set("placement", place)
      if str(n, "name").is_empty() || str(n, "name") == binding(n) {
        n.set("name", Raw::of(str(e, "collection") + ": " + str(e, "id")))
      }
    }
    for child in children(n) {
      prepare(child)
    }
  }
  prepare(root)
  guard !roots.is_empty() else { raise Failure("No scene roots to export") }
  let mut anchor = roots[0]
  for n in roots {
    if exists(entity(n)) {
      anchor = n
      break
    }
  }
  if selection is None {
    for n in roots {
      if str(entity(n), "collection") == "hives" {
        anchor = n
        break
      }
    }
  }
  let pos = transform(anchor).elements
  let camera = @core.PerspectiveCamera::new(
    fov=50,
    aspect=1.5,
    near=0.1,
    far=2000,
  )
  camera.name = "Camera"
  let (dx, dy, dz) = if selection is Some(_) {
    (15.0, 12.0, 18.0)
  } else {
    (55.0, 65.0, 75.0)
  }
  ignore(camera.position.set(pos[12] + dx, pos[13] + dy, pos[14] + dz))
  camera.look_at_xyz(pos[12], pos[13], pos[14])
  camera.update_matrix_world()
  if selection is Some(_) {
    let sky = @core.HemisphereLight::new(
      ground_color=@math.Color::from_hex(0x596473),
      intensity=3,
    )
    let sun = @core.DirectionalLight::new(intensity=3)
    ignore(sun.position.set(10, 20, 15))
    for light in [sky, sun] {
      light.name = "Editor preview light"
      let light_json = Raw::from_json(light.to_json()).get("object")
      light_json.set("userData", Raw::from_json({ "editorOnly": true }))
      append(root.get("children"), light_json)
    }
  }
  @archive.obj([
    ("metadata", Raw::object()),
    (
      "project",
      Raw::from_json({
        "shadows": true,
        "shadowType": 1,
        "toneMapping": 4,
        "toneMappingExposure": 1.1,
      }),
    ),
    ("camera", Raw::from_json(camera.to_json())),
    ("scene", @archive.select_resources(scene, root)),
    ("scripts", Raw::object()),
    ("history", Raw::from_json({ "undos": [], "redos": [] })),
    ("environmentType", Raw::of("None")),
  ])
}
