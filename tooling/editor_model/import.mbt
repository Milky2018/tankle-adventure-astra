///|
fn numeric(record : Map[String, Json], key : String) -> Double raise {
  guard record.get(key) is Some(Number(n, ..)) else {
    raise Failure("Expected a number for " + key)
  }
  n
}

///|
fn translate(
  record : Map[String, Json],
  axis : String,
  delta : Double,
) -> Unit raise {
  record[axis] = Json::number(numeric(record, axis) + delta)
}

///|
fn resize_collision(
  r : Map[String, Json],
  m : Array[Double],
  baseline : Array[Double],
  collection : String,
) -> Unit raise {
  for i in [1, 2, 4, 6, 8, 9] {
    guard m[i].abs() <= 0.00001 else {
      raise Failure(
        "Collision boxes must remain axis-aligned. Rotate the visual mesh separately.",
      )
    }
  }
  let scale = [ for i in [0, 5, 10] => m[i] / baseline[i] ]
  guard scale.every(n => n.is_finite() && n > 0) else {
    raise Failure("Collision box scale must be positive.")
  }
  for i, name in ["w", "h", "d"] {
    if i == 1 && collection == "decks" {
      translate(r, "y", 0.125 * (scale[i] - 1))
      continue
    }
    let original = numeric(r, name)
    let size = original * scale[i]
    translate(r, ["x", "y", "z"][i], (original - size) / 2)
    r[name] = Json::number(size)
  }
}

///|
#derive(@json.FromJson)
priv struct Placement {
  origin : (Double, Double, Double)
  matrix : Array[Double]
}

///|
pub fn import_project(project : Raw, dry_run~ : Bool = false) -> Raw raise {
  let edited = clone(
    if exists(get(project, "scene")) {
      project.get("scene")
    } else {
      project
    },
  )
  let root = get(edited, "object")
  let meta = get(data(root), "tankle")
  guard get(meta, "version").strict_equal(Raw::of(1)) else {
    raise Failure(
      "Open a project produced by the editor export command before importing edits.",
    )
  }
  guard str(meta, "revision") == revision() else {
    raise Failure(
      "Content changed since export. Export a fresh project to avoid overwriting newer edits.",
    )
  }
  let scripts = get(project, "scripts")
  guard !@archive.keys(scripts)
    .iter()
    .any(key => array(scripts, key).length() > 0) else {
    raise Failure(
      "Editor JavaScript scripts are not supported. Implement behavior in MoonBit.",
    )
  }
  let scene = @archive.read_scene()
  let catalog = EditableCatalog::read()
  let original = scene.get("object")
  let originals = Map([])
  let parents = Map([])
  fn index_tree(n : Raw, parent : Raw) {
    originals[uuid(n)] = n
    parents[uuid(n)] = parent
    for child in children(n) {
      index_tree(child, n)
    }
  }
  index_tree(original, Raw::undefined())
  let old_world = transforms(original)
  let world = transforms(root)
  let objects = Map([])
  let bindings = Set([])
  fn index_edited(n : Raw) -> Unit raise {
    let id = uuid(n)
    guard !objects.contains(id) else {
      raise Failure("Duplicate object UUID: " + id)
    }
    objects[id] = n
    for child in children(n) {
      index_edited(child)
    }
  }
  index_edited(root)
  let roots : Set[String] = Set::from_iter(
    array(meta, "roots").iter().map(v => v.cast()),
  )
  let top = Set::from_iter(children(root).iter().map(uuid))
  let removed = Set([])
  let full = truth(meta, "fullScene")
  for e in array(meta, "deleted") {
    let k = str(e, "collection")
    let id = str(e, "id")
    guard full && editable(k) else {
      raise Failure(
        "Entity deletion requires a full project and an enemy, control or pickup.",
      )
    }
    valid_identity(e, e)
    let prefix = entity_prefix(e)
    for uid, n in originals {
      if roots.contains(uid) && belongs_to(binding(n), prefix) {
        guard !objects.contains(uid) else {
          raise Failure("Delete the complete entity: " + entity_key(e))
        }
        removed.add(uid)
      }
    }
    catalog.files[k] = Json::array(
      catalog
      .rows(k)
      .filter(r => !(r is { "id": String(value), .. } && value == id)),
    )
  }
  let added = []
  let seen = Set([])
  for uid, n in objects {
    let b = binding(n)
    if !b.is_empty() {
      guard !bindings.contains(b) else {
        raise Failure(
          "Duplicate binding " +
          b +
          ". Scene objects with runtime roles must have unique identities.",
        )
      }
      bindings.add(b)
    }
    let name = str(n, "name")
    if exists(get(n, "matrix")) &&
      !elements(n.get("matrix")).every(x => x.is_finite()) {
      raise Failure("Non-finite transform on " + name)
    }
    let e = entity(n)
    if !exists(e) {
      continue
    }
    let k = str(e, "collection")
    let identity = if exists(get(e, "index")) {
      entity_key(e) + ":" + @archive.stringify(e.get("index"))
    } else {
      k + ":" + str(e, "key")
    }
    guard !seen.contains(identity) else {
      raise Failure("Duplicate gameplay identity: " + identity)
    }
    seen.add(identity)
    let old_entity = match originals.get(uid) {
      Some(old) => entity(old)
      None => Raw::undefined()
    }
    if exists(old_entity) && entity_key(old_entity) != entity_key(e) {
      raise Failure("Keep stable IDs unchanged on " + name)
    }
    let records = catalog.rows(k)
    let slot = catalog.find(e)
    let user = data(n)
    if slot is None {
      guard full && !originals.contains(uid) else {
        raise Failure("Unknown gameplay identity " + identity)
      }
      valid_identity(e, get(user, "game"))
      guard top.contains(uid) else {
        raise Failure("New gameplay roots must be at the scene's top level.")
      }
      added.push(e)
    } else if !exists(old_entity) && !truth(user, "editorOnly") {
      raise Failure("Duplicate gameplay identity: " + identity)
    }
    let place = get(user, "placement")
    guard exists(place) && exists(get(user, "game")) else {
      raise Failure("Missing authoring properties on " + name)
    }
    let m = world[uid].elements
    let placement : Placement = @json.from_json(place.to_json())
    let baseline = placement.matrix
    guard baseline.length() == 16 else {
      raise Failure("Expected a 4 by 4 placement matrix on " + name)
    }
    if !truth(user, "editorOnly") {
      for i in [0, 1, 2, 4, 5, 6, 8, 9, 10] {
        guard (m[i] - baseline[i]).abs() <= 0.00001 else {
          raise Failure(
            "Rotate or scale the model's children, not the gameplay root: " +
            name,
          )
        }
      }
    }
    let (x, y, z) = placement.origin
    guard user.get("game").to_json() is Object(r) else {
      raise Failure("Invalid placement or properties on " + name)
    }
    let dx = m[12] - baseline[12]
    let dy = m[13] - baseline[13]
    let dz = m[14] - baseline[14]
    r["x"] = Json::number(x + dx)
    r["y"] = Json::number(y + dy)
    r["z"] = Json::number(z + dz)
    if truth(user, "editorOnly") {
      resize_collision(r, m, baseline, k)
    }
    if slot is Some(i) &&
      records[i] is Object(base) &&
      (
        r.get("id") != base.get("id") ||
        r.get("circuitKey") != base.get("circuitKey")
      ) {
      raise Failure(
        "Keep stable IDs unchanged on " +
        name +
        "; references are stored in saves and circuits.",
      )
    }
    match k {
      "lifts" => {
        let stops : Array[Double] = @json.from_json(
          r.get_or_default("stops", @json.null),
        )
        r["stops"] = @json.to_json(stops.map(y => y + dy))
        r.remove("y")
      }
      "controls" =>
        if r.get("ground") is Some(Number(_, ..)) {
          translate(r, "ground", dy)
        }
      "enemies" => {
        for key in ["patrol", "activation"] {
          if r.get(key) is Some(Object(point)) {
            translate(point, "x", dx)
            translate(point, "z", dz)
            if key == "activation" {
              translate(point, "y", dy)
            }
          }
        }
        if r.get("swimPatrol") is Some(Array(points)) {
          r["swimPatrol"] = Json::array(
            points.map(p => {
              guard p is [Number(x, ..), Number(z, ..)] else {
                raise Failure("Expected an X/Z swim patrol point on " + name)
              }
              [x + dx, z + dz]
            }),
          )
        }
      }
      _ => ()
    }
    if slot is Some(i) {
      records[i] = Json::object(r)
    } else {
      records.push(Json::object(r))
      let circuit = get(user, "circuit")
      let id = str(e, "id")
      if k == "controls" &&
        exists(circuit) &&
        !catalog
        .rows("circuits")
        .any(row => row is { "id": String(existing), .. } && existing == id) {
        guard str(circuit, "id") == id else {
          raise Failure("A copied circuit must use its control's ID.")
        }
        catalog.rows("circuits").push(circuit.to_json())
      }
    }
    for prop in ["game", "placement", "circuit"] {
      @archive.remove(user, prop)
    }
  }
  for e in added {
    for b in required(e) {
      guard bindings.contains(b) else {
        raise Failure("Missing scene role: " + b)
      }
    }
  }
  for v in array(meta, "roots") {
    let uid : String = v.cast()
    if removed.contains(uid) {
      let p = parents[uid]
      p.set(
        "children",
        Raw::from_array([ for c in children(p) if uuid(c) != uid => c ][:]),
      )
      continue
    }
    guard originals.get(uid) is Some(old) && objects.get(uid) is Some(next) else {
      raise Failure(
        "An exported root was removed (" +
        uid +
        "). Remove gameplay objects through the catalog with their references.",
      )
    }
    guard top.contains(uid) else {
      raise Failure(
        "Keep exported roots at the scene's top level. Group or replace their children instead.",
      )
    }
    let mut missing = ""
    @archive.walk(old, n => {
      let b = binding(n)
      if !b.is_empty() && !bindings.contains(b) {
        missing = b
      }
    })
    guard missing.is_empty() else {
      raise Failure("Required runtime binding removed: " + missing)
    }
    let parent = parents[uid]
    next.set(
      "matrix",
      matrix_value(
        old_world[uuid(parent)].clone().invert().multiply(world[uid]),
      ),
    )
    @archive.walk(next, n => {
      let flag = match originals.get(uuid(n)) {
        Some(o) => get(o, "matrixAutoUpdate")
        None => Raw::undefined()
      }
      n.set("matrixAutoUpdate", if exists(flag) { flag } else { Raw::of(true) })
    })
    assign_at(
      parent.get("children"),
      index_of(parent.get("children"), old),
      next,
    )
  }
  for n in children(root) {
    if !roots.contains(uuid(n)) &&
      !originals.contains(uuid(n)) &&
      !truth(data(n), "editorOnly") {
      append(original.get("children"), n)
    }
  }
  for
    k in [
      "geometries", "materials", "textures", "images", "animations", "skeletons",
    ] {
    let resources = Map([])
    for lib in [scene, edited] {
      for r in array(lib, k) {
        resources[uuid(r)] = r
      }
    }
    scene.set(k, Raw::from_array(resources.values().to_array()[:]))
  }
  if full {
    for
      key in [
        "background", "environment", "backgroundBlurriness", "backgroundIntensity",
        "environmentIntensity", "backgroundRotation", "environmentRotation",
      ] {
      if get(root, key).is_undefined() {
        @archive.remove(original, key)
      } else {
        original.set(key, root.get(key))
      }
    }
  }
  @catalog.validate(catalog.files)
  if !dry_run {
    @archive.write_scene(@archive.select_resources(scene, original))
    for name, entries in catalog.files {
      @archive.write_file(
        directory + "/" + name + ".json",
        Raw::of(entries.stringify(indent=2, escape_slash=false) + "\n"),
      )
    }
  }
  let root_ids = [
    for n in children(root) if !truth(data(n), "editorOnly") => uuid(n)
  ]
  @archive.obj([
    ("roots", Raw::of(roots.length())),
    ("checked", Raw::of(true)),
    ("written", Raw::of(!dry_run)),
    ("revision", Raw::of(revision())),
    ("rootIds", Raw::from_array(root_ids[:])),
  ])
}
