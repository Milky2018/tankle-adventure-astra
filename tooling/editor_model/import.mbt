///|
fn translate(record : Raw, axis : String, delta : Double) -> Unit {
  record.set(axis, Raw::of(number(record, axis) + delta))
}

///|
fn resize_collision(
  r : Raw,
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
    let original = number(r, name)
    let size = original * scale[i]
    translate(r, ["x", "y", "z"][i], (original - size) / 2)
    r.set(name, Raw::of(size))
  }
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
  let catalog = read_catalog()
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
    let keep = [ for r in array(catalog, k) if str(r, "id") != id => r ]
    catalog.set(k, Raw::from_array(keep[:]))
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
    let base = record_for(catalog, e)
    let user = data(n)
    if !exists(base) {
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
    let baseline = elements(place.get("matrix"))
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
    let delta = [ for i in [12, 13, 14] => m[i] - baseline[i] ]
    let origin = elements(place.get("origin"))
    let r = @archive.copy(user.get("game"))
    for i, axis in ["x", "y", "z"] {
      r.set(axis, Raw::of(origin[i] + delta[i]))
    }
    if truth(user, "editorOnly") {
      resize_collision(r, m, baseline, k)
    }
    if exists(base) &&
      (
        !r.get("id").strict_equal(base.get("id")) ||
        !r.get("circuitKey").strict_equal(base.get("circuitKey"))
      ) {
      raise Failure(
        "Keep stable IDs unchanged on " +
        name +
        "; references are stored in saves and circuits.",
      )
    }
    if k == "lifts" {
      let stops = [ for v in elements(r.get("stops")) => v + delta[1] ]
      r.set("stops", Raw::from_array(stops[:]))
      @archive.remove(r, "y")
    }
    if k == "controls" && exists(get(r, "ground")) {
      translate(r, "ground", delta[1])
    }
    if k == "enemies" {
      for key in ["patrol", "activation"] {
        let point = get(r, key)
        if exists(point) {
          let p = @archive.copy(point)
          translate(p, "x", delta[0])
          translate(p, "z", delta[2])
          if key == "activation" {
            translate(p, "y", delta[1])
          }
          r.set(key, p)
        }
      }
      if exists(get(r, "swimPatrol")) {
        let points = [
          for pair in array(r, "swimPatrol") => {
            let xy = elements(pair)
            Raw::from_array([xy[0] + delta[0], xy[1] + delta[2]])
          }
        ]
        r.set("swimPatrol", Raw::from_array(points[:]))
      }
    }
    let records = catalog.get(k)
    if exists(base) {
      assign_at(records, index_of(records, base), r)
    } else {
      append(records, r)
      let circuit = get(user, "circuit")
      if k == "controls" &&
        exists(circuit) &&
        !array(catalog, "circuits")
        .iter()
        .any(c => str(c, "id") == str(e, "id")) {
        guard str(circuit, "id") == str(e, "id") else {
          raise Failure("A copied circuit must use its control's ID.")
        }
        append(catalog.get("circuits"), clone(circuit))
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
  @catalog.validate(@catalog.object(@json.parse(@archive.stringify(catalog))))
  if !dry_run {
    @archive.write_scene(@archive.select_resources(scene, original))
    for name in @archive.keys(catalog) {
      @archive.write_file(
        directory + "/" + name + ".json",
        Raw::of(pretty(catalog.get(name)) + "\n"),
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
