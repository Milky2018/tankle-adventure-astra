///|
fn parse_scene(scene : Raw) -> @core.Object3D {
  @loaders.ObjectLoader::new().parse(scene.to_json())
}

///|
fn load_export(project : Raw) -> @core.Object3D {
  parse_scene(project.get("scene"))
}

///|
fn open_fixture_project(project : Raw) -> @model.LiveProject {
  @model.LiveProject::attach(project, load_export(project))
}

///|
fn three_json(node : @core.Object3D) -> Raw {
  Raw::from_json(node.to_json())
}

///|
fn[T] in_directory(dir : String, f : () -> T raise) -> T raise {
  let previous = cwd()
  @node.chdir(dir)
  defer @node.chdir(previous)
  f()
}

///|
fn make_fixture(repo : String, dir : String) -> Unit raise {
  @fs.create_dir(dir + "/content/art")
  copy_fixture(repo + "/content/levels", dir + "/content/levels")
  in_directory(dir, () => {
    let scene = @core.Scene::new()
    let root = @core.Group::new()
    let e = record("enemies", "prototype")
    ignore(
      root.position.set(quantity(e, "x"), quantity(e, "y"), quantity(e, "z")),
    )
    root.name = "Prototype"
    root.user_data.set("binding", Raw::of("enemies/prototype/model/root"))
    root.user_data.set(
      "entity",
      raw({ "collection": "enemies", "id": "prototype", "key": "prototype" }),
    )
    for role in ["body", "turret"] {
      let part = @core.Mesh::new(
        geometry=@geometries.BoxGeometry::new(),
        material=Single(@core.MeshBasicMaterial::new()),
      )
      part.name = role
      part.user_data.set("binding", Raw::of("enemies/prototype/model/" + role))
      ignore(root.add(part))
    }
    ignore(scene.add(root))
    scene.update_matrix_world(force=true)
    @archive.write_scene(three_json(scene))
  })
}

///|
fn fixture(body : (String) -> Unit raise) -> Unit raise {
  let repo = cwd()
  let dir = temp_dir()
  defer @fs.remove_dir(dir)
  make_fixture(repo, dir)
  in_directory(dir, () => body(repo))
}

///|
fn selected() -> Raw raise {
  @model.export_project(selection="enemies:prototype")
}

///|
fn shift_x(node : Raw, amount : Double) -> Unit {
  let elements : FixedArray[Double] = node.get("matrix").cast()
  elements[12] += amount
}

///|
fn has_helpers(scene : Raw) -> Bool {
  rows(scene.get("object"), "children")
  .iter()
  .any(n => @model.truth(@model.data(n), "editorOnly"))
}

///|
async test "batched architecture survives the editor loader and save serialization" {
  let sandbox = temp_dir()
  defer @fs.remove_dir(sandbox)
  make_fixture(cwd(), sandbox)
  let batch = @core.BatchedMesh::new(
    20,
    96,
    max_index_count=288,
    material=Single(@core.MeshBasicMaterial::new()),
  )
  let instance = batch.add_instance(
    batch.add_geometry(@geometries.BoxGeometry::new()),
  )
  let placement = @math.Matrix4::new().make_translation(3, -4, 5)
  ignore(batch.set_matrix_at(instance, placement))
  let project = in_directory(sandbox, () => {
    let scene = @core.Scene::new()
    ignore(scene.add(batch))
    @archive.write_scene(three_json(scene))
    @model.export_project()
  })
  fn positions(project : Raw) -> Raw {
    @model.array(project.get("scene"), "geometries")[0]
    .get("data")
    .get("attributes")
    .get("position")
    .get("array")
  }
  let expected = positions(project).to_json()
  let wire = @model.pack_scene_transfer(project)
  assert_true(@archive.is_string(positions(wire)))
  let live = @model.LiveProject::open(wire)
  // Inspect the buffers used for drawing; serializing may reuse an original record.
  let loaded = live.scene.children[0]
  let source = batch.get_geometry().unwrap()
  let decoded = loaded.get_geometry().unwrap()
  fn check_buffer(
    want : @core.GeometryAttribute,
    actual : @core.GeometryAttribute?,
  ) -> Unit raise {
    guard want is Buffer(want) && actual is Some(Buffer(got)) else {
      fail("Missing batch buffer")
    }
    assert_eq(got.count, want.count)
    assert_eq(got.array.to_array(), want.array.to_array())
  }
  for name, attr in source.attributes {
    check_buffer(attr, decoded.get_attribute(name))
  }
  check_buffer(source.get_index().unwrap(), decoded.get_index())
  assert_true(
    loaded.get_matrix_at(instance, @math.Matrix4::new()).equals(placement),
  )
  let saved = @model.unpack_scene_transfer(live.serialize())
  expect_json(positions(saved), expected)
  in_directory(sandbox, () => {
    ignore(@model.import_project(saved))
    expect_json(positions(@model.export_project()), expected)
  })
}

///|
test "extruded meshes keep their shape through an editor save" {
  fixture(_ => {
    // A selected save must keep the packed geometry of unrelated scenery.
    let original = parse_scene(@archive.read_scene())
    let scenery = @core.BatchedMesh::new(
      1,
      24,
      max_index_count=36,
      material=Single(@core.MeshBasicMaterial::new()),
    )
    ignore(
      scenery.add_instance(scenery.add_geometry(@geometries.BoxGeometry::new())),
    )
    ignore(original.add(scenery))
    let source = three_json(original)
    let id = @model.str(three_json(scenery).get("object"), "geometry")
    let unselected = resources(source, "geometries")[id].get("data").to_json()
    @archive.write_scene(source)
    let project = selected()
    assert_false(resources(project.get("scene"), "geometries").contains(id))
    let live = open_fixture_project(project)
    let scene = live.scene
    let profile = @extras.Shape::new(points=[
      @math.Vector2::new(0, 0),
      @math.Vector2::new(1, 0),
      @math.Vector2::new(0, 1),
    ])
    let mesh = @core.Mesh::new(
      geometry=@geometries.ExtrudeGeometry::new(shapes=[profile], depth=2),
      material=Single(@core.MeshBasicMaterial::new()),
    )
    ignore(scene.children[0].add(mesh))
    let edited = @model.unpack_scene_transfer(live.serialize())
    let shape = rows(edited.get("scene"), "shapes")[0].to_json()
    ignore(@model.import_project(edited))
    let saved = three_json(load_export(selected()))
    expect_json(rows(saved, "shapes")[0], shape)
    expect_json(
      resources(@archive.read_scene(), "geometries")[id].get("data"),
      unselected,
    )
  })
}

///|
test "editor translation and gameplay data are independent of display names" {
  fixture(_ => {
    let before = record("enemies", "prototype")
    let project = selected()
    let root = @model.children(project_world(project))[0]
    root.set("name", Raw::of("Human readable name"))
    shift_x(root, 2)
    @model.get(@model.data(root), "game").set("hp", Raw::of(11))
    ignore(@model.import_project(project))
    let after = record("enemies", "prototype")
    assert_eq(quantity(after, "x"), quantity(before, "x") + 2)
    assert_eq(quantity(after, "hp"), 11)
    let imported = @model.children(@archive.read_scene().get("object"))[0]
    assert_eq(@model.str(imported, "name"), "Human readable name")
    assert_eq(@model.binding(imported), "enemies/prototype/model/root")
    assert_true(@model.get(@model.data(imported), "game").is_undefined())
    assert_eq(
      @model.str(@model.children(project_world(selected()))[0], "name"),
      "Human readable name",
    )
  })
}

///|
test "an incomplete child transform rejects the entire edit before writing" {
  fixture(_ => {
    let project = selected()
    let root = @model.children(project_world(project))[0]
    let before = record("enemies", "prototype")
    shift_x(root, 2)
    @model.children(root)[0].set("matrix", raw([1, 0, 0]))
    raises_like("4 by 4 transform", () => ignore(@model.import_project(project)))
    expect_json(record("enemies", "prototype"), before.to_json())
  })
}

///|
test "stale exports and scripts are rejected before saving" {
  fixture(_ => {
    let project = selected()
    project
    .get("scripts")
    .set("test", raw([{ "source": "archived editor script" }]))
    raises_like("scripts are not supported", () => {
      ignore(@model.import_project(project))
    })
    project.set("scripts", raw({}))
    let path = "content/levels/city/enemies.json"
    @fs.write_string_to_file(path, @fs.read_file_to_string(path) + "\n")
    raises_like("Content changed since export", () => {
      ignore(@model.import_project(project))
    })
  })
}

///|
test "missing animation roles and duplicate bindings fail before saving" {
  fixture(_ => {
    let project = selected()
    let root = @model.children(project_world(project))[0]
    let parts = rows(root, "children")
    parts[1]
    .get("userData")
    .set("binding", @model.get(@model.data(parts[0]), "binding"))
    raises_like("Duplicate binding", () => {
      ignore(@model.import_project(project))
    })
    set_children(root, [parts[0]])
    raises_like("Required runtime binding removed", () => {
      ignore(@model.import_project(project))
    })
  })
}

///|
test "resizing editor colliders changes physics dimensions and excludes helper meshes" {
  fixture(_ => {
    let id = "press-working-floor"
    let before = record("decks", id)
    let project = @model.export_project(selection="decks:" + id)
    let box = @model.children(project_world(project))[0]
    let elements : FixedArray[Double] = box.get("matrix").cast()
    elements[0] *= 2
    shift_x(box, 3)
    ignore(@model.import_project(project))
    let after = record("decks", id)
    assert_eq(quantity(after, "w"), quantity(before, "w") * 2)
    assert_eq(
      quantity(after, "x"),
      quantity(before, "x") + 3 - quantity(before, "w") / 2,
    )
    assert_false(has_helpers(@archive.read_scene()))
  })
}

///|
test "exported roots cannot be nested into a duplicate hierarchy" {
  fixture(_ => {
    let project = selected()
    let world = project_world(project)
    let roots = rows(world, "children")
    let g = raw({ "uuid": "new-group", "type": "Group" })
    set_children(g, [roots[0]])
    set_children(world, roots[1:].to_owned() + [g])
    raises_like("Keep exported roots", () => {
      ignore(@model.import_project(project))
    })
  })
}

///|
test "scene settings round trip and preview helpers stay outside runtime art" {
  fixture(_ => {
    let project = @model.export_project()
    let root = project_world(project)
    root.set("background", Raw::of(0x123456))
    root.set(
      "fog",
      raw({ "type": "Fog", "color": 16777215, "near": 200, "far": 220 }),
    )
    ignore(@model.import_project(project))
    let saved = @archive.read_scene()
    assert_eq(quantity(saved.get("object"), "background"), 0x123456)
    assert_true(saved.get("object").get("fog").is_undefined())
    let single = selected()
    assert_true(has_helpers(single.get("scene")))
    ignore(@model.import_project(single))
    assert_false(has_helpers(@archive.read_scene()))
  })
}

///|
test "full-level collider export distinguishes repeated deck IDs" {
  fixture(_ => {
    let before = @archive.items(records("decks"))
    let seen = Map([])
    let mut repeat = -1
    let mut first = -1
    for i, deck in before {
      let id = @model.str(deck, "id")
      if seen.get(id) is Some(index) {
        repeat = i
        first = index
        break
      }
      seen[id] = i
    }
    assert_true(repeat >= 0)
    let project = @model.export_project(colliders=true)
    let helpers = rows(project_world(project), "children").filter(n => {
      @model.str(@model.entity(n), "collection") == "decks" &&
      quantity(@model.entity(n), "index") == repeat.to_double()
    })
    assert_eq(helpers.length(), 1)
    shift_x(helpers[0], 2)
    ignore(@model.import_project(project))
    let after = @archive.items(records("decks"))
    assert_eq(quantity(after[repeat], "x"), quantity(before[repeat], "x") + 2)
    expect_json(after[first], before[first].to_json())
  })
}

///|
test "the shipped city and all colliders round trip without changing gameplay definitions" {
  fixture(repo => {
    copy_fixture(repo + "/content/art", "content/art")
    let names = [
      "decks", "barriers", "obstacles", "architecture", "lifts", "enemies", "controls",
      "hives", "pickups", "mirrors", "belts", "heat", "currents", "circuits",
    ]
    let before = names.map(k => records(k).to_json())
    ignore(@model.import_project(@model.export_project(colliders=true)))
    for i, k in names {
      expect_json(records(k), before[i])
    }
  })
}

///|
test "consecutive saves and undo retain absolute placement and reject stale tabs" {
  fixture(_ => {
    let before = records("enemies")
    let original = record("enemies", "prototype")
    let project = selected()
    let stale = @model.clone(project)
    let root = @model.children(project_world(project))[0]
    for offset in [2.0, 1] {
      shift_x(root, offset)
      project_world(project)
      .get("userData")
      .get("tankle")
      .set("revision", @model.import_project(project).get("revision"))
    }
    assert_eq(
      quantity(record("enemies", "prototype"), "x"),
      quantity(original, "x") + 3,
    )
    raises_like("Content changed since export", () => {
      ignore(@model.import_project(stale))
    })
    shift_x(root, -3)
    ignore(@model.import_project(project))
    expect_json(records("enemies"), before.to_json())
  })
}

///|
fn count_records(k : String, id : String) -> Int32 raise {
  @archive.items(records(k))
  .iter()
  .filter(n => @model.str(n, "id") == id)
  .count()
}

///|
fn save_live(live : @model.LiveProject) -> Unit raise {
  let result = @model.import_project(
    @model.unpack_scene_transfer(live.serialize()),
  )
  let meta = @model.get(live.scene.user_data, "tankle")
  meta.set("revision", result.get("revision"))
  meta.set("roots", result.get("rootIds"))
  meta.set("deleted", raw([]))
}

///|
test "new enemies clone all animation roles and resources and can be saved, removed and restored" {
  fixture(_ => {
    let original = load_export(@model.export_project())
    let source = original.children[0]
    let geometry = @geometries.BoxGeometry::new()
    let shared = @core.MeshBasicMaterial::new()
    let art = @core.Mesh::new(geometry~, material=Single(shared))
    art.name = "Shared detail"
    ignore(source.add(art))
    let fx = @core.Mesh::new(
      geometry~,
      material=Multiple([shared, @core.MeshBasicMaterial::new(), shared]),
    )
    fx.user_data.set("binding", Raw::of("enemies/prototype/warning"))
    ignore(original.add(fx))
    source.traverse(n => {
      for k in ["game", "placement"] {
        @archive.remove(n.user_data, k)
      }
    })
    @archive.write_scene(three_json(original))
    let project = @model.export_project()
    let live = open_fixture_project(project)
    let loaded = live.scene
    let root = loaded.children
      .iter()
      .find_first(n => {
        @model.str(n.user_data.get("entity"), "id") == "prototype"
      })
      .unwrap()
    let bundle = @model.clone_entity(
      loaded,
      root,
      "editor-enemy",
      offset=@math.Vector3::new(3, 0, 0),
    )
    let parts = bundle.objects
    assert_eq(parts.length(), 2)
    let cloned_detail = bundle.root.children
      .iter()
      .find_first(n => n.name == "Shared detail")
      .unwrap()
    let detail = three_json(cloned_detail).get("object")
    let original_detail = three_json(art).get("object")
    let warning_node = parts
      .iter()
      .find_first(n => {
        @model.str(n.user_data, "binding") == "enemies/editor-enemy/warning"
      })
      .unwrap()
    let warning = three_json(warning_node).get("object")
    for key in ["geometry", "material"] {
      assert_not_eq(@model.str(detail, key), @model.str(original_detail, key))
    }
    assert_eq(@model.str(detail, "geometry"), @model.str(warning, "geometry"))
    let materials = @archive.items(warning.get("material"))
    assert_eq(materials.length(), 3)
    assert_true(materials[0].strict_equal(detail.get("material")))
    assert_true(materials[0].strict_equal(materials[2]))
    assert_false(materials[0].strict_equal(materials[1]))
    ignore(loaded.add_all(parts))
    save_live(live)
    save_live(live)
    assert_eq(count_records("enemies", "editor-enemy"), 1)
    assert_eq(
      quantity(record("enemies", "editor-enemy"), "x"),
      quantity(record("enemies", "prototype"), "x") + 3,
    )
    ignore(loaded.remove_all(@model.entity_bundle(loaded, bundle.root).objects))
    @model.get(loaded.user_data, "tankle").set(
      "deleted",
      Raw::from_array([bundle.root.user_data.get("entity")]),
    )
    save_live(live)
    assert_eq(count_records("enemies", "editor-enemy"), 0)
    let remaining = load_export(@model.export_project())
    assert_false(
      remaining.children
      .iter()
      .any(n => {
        @model.str(n.user_data, "binding").has_prefix("enemies/editor-enemy/")
      }),
    )
    ignore(loaded.add_all(parts))
    save_live(live)
    assert_eq(count_records("enemies", "editor-enemy"), 1)
  })
}

///|
test "duplicate identities, missing roles and incomplete entity deletion fail before writing" {
  fixture(_ => {
    let project = @model.export_project()
    let scene = load_export(project)
    let root = scene.children[0]
    fn clone_as(id : String) -> @model.EntityBundle raise {
      @model.clone_entity(scene, root, id)
    }
    let dup = clone_as("prototype").objects
    ignore(scene.add_all(dup))
    project.set("scene", three_json(scene))
    raises_like("Duplicate", () => ignore(@model.import_project(project)))
    ignore(scene.remove_all(dup))
    let invalid = clone_as("new-enemy")
    let bundle = invalid.objects
    ignore(invalid.root.remove(invalid.root.children[1]))
    ignore(scene.add_all(bundle))
    project.set("scene", three_json(scene))
    raises_like("Missing scene role", () => {
      ignore(@model.import_project(project))
    })
    ignore(scene.remove_all(bundle))
    @model.get(scene.user_data, "tankle").set(
      "deleted",
      Raw::from_array([root.user_data.get("entity")]),
    )
    project.set("scene", three_json(scene))
    raises_like("Delete the complete entity", () => {
      ignore(@model.import_project(project))
    })
    assert_eq(count_records("enemies", "new-enemy"), 0)
  })
}

///|
extern "js" fn global_object() -> Raw = "()=>globalThis"

///|
extern "js" fn image_class() -> Raw =
  #| ()=>class extends EventTarget {
  #|   get src(){return this.url}
  #|   set src(url){this.url=url;queueMicrotask(()=>this.dispatchEvent(new Event("load")))}
  #| }

///|
extern "js" fn new_image(image_class : Raw) -> Raw = "C=>new C()"

///|
// Supply only the DOM image element that three.mbt requests when running on Node.
fn install_image_document() -> () -> Unit {
  let global = global_object()
  let previous = [
    ("document", global.get("document")),
    ("HTMLImageElement", global.get("HTMLImageElement")),
  ]
  let image = image_class()
  let doc = Raw::object()
  doc.set(
    "createElementNS",
    Raw::of(fn(_ns : String, _tag : String) { new_image(image) }),
  )
  global.set("document", doc)
  global.set("HTMLImageElement", image)
  () => {
    for (key, value) in previous {
      if value.is_undefined() {
        @archive.remove(global, key)
      } else {
        global.set(key, value)
      }
    }
  }
}

///|
fn image_urls(scene : Raw) -> Set[String] {
  let urls = Set([])
  fn record(url : Raw) {
    if @archive.is_string(url) {
      urls.add(url.cast())
    }
  }
  for image in @model.array(scene, "images") {
    let url = image.get("url")
    if @archive.is_array(url) {
      for face in @archive.items(url) {
        record(face)
      }
    } else {
      record(url)
    }
  }
  urls
}

///|
test "standalone templates can add machines, pickups and switches after the city source was removed" {
  fixture(repo => {
    let restore = install_image_document()
    defer restore()
    let defs = @archive.items(
      read_json(repo + "/content/editor/templates.json"),
    )
    let machine_types = Set([])
    let mut count = 0
    for d in defs {
      if @model.str(d, "collection") == "enemies" {
        count += 1
        machine_types.add(@model.str(d.get("defaults"), "type"))
      }
    }
    assert_eq(count, machine_types.length())
    let wanted = Set::from_iter(
      @archive.items(records("enemies")).iter().map(e => @model.str(e, "type")),
    )
    assert_true(wanted == machine_types)
    let palette_scene = @archive.read_json_gz(
      repo + "/content/editor/templates.scene.json.gz",
    )
    let embedded = image_urls(palette_scene)
    assert_false(embedded.is_empty())
    let palette = open_fixture_project(@archive.obj([("scene", palette_scene)])).scene
    let project = @model.export_project()
    let live = open_fixture_project(project)
    let loaded = live.scene
    for d in defs {
      let collection = @model.str(d, "collection")
      let roots = palette.children
        .iter()
        .filter(o => {
          @model.str(o.user_data.get("entity"), "collection") == collection
        })
      let src = roots
        .find_first(n => {
          @model.str(n.user_data.get("entity"), "id") == @model.str(d, "source")
        })
        .unwrap()
      if collection == "enemies" {
        assert_eq(
          @model.str(@model.get(src.user_data, "game"), "type"),
          @model.str(d.get("defaults"), "type"),
        )
      }
      let bundle = @model.clone_entity(
        palette,
        src,
        "new-" + @model.str(d, "id"),
        offset=@model.creation_offset(src, 3, -8, 86),
        defaults=d.get("defaults").to_json(),
      )
      ignore(loaded.add_all(bundle.objects))
    }
    ignore(
      @model.import_project(@model.unpack_scene_transfer(live.serialize())),
    )
    let control = record("controls", "new-control-shot")
    assert_eq(quantity(control, "ground"), -8)
    expect_json(control.get("effects"), ["new-control-shot"])
    assert_true(control.get("mount").is_undefined())
    let pickup = record("pickups", "new-pickup-upgrade-scope")
    assert_true(pickup.get("hidden").strict_equal(Raw::of(false)))
    assert_true(pickup.get("requires").is_undefined())
    assert_eq(quantity(pickup, "x"), 3)
    for d in defs {
      assert_eq(
        count_records(@model.str(d, "collection"), "new-" + @model.str(d, "id")),
        1,
      )
    }
    let current = @model.export_project()
    let saved = image_urls(current.get("scene"))
    for url in embedded {
      assert_true(
        url.has_prefix("data:image/jpeg;base64,") ||
        url.has_prefix("data:image/png;base64,"),
      )
      assert_true(saved.contains(url))
    }
    let scene = load_export(current)
    let root = scene.children
      .iter()
      .find_first(n => {
        @model.str(n.user_data.get("entity"), "id") == "new-control-shot"
      })
      .unwrap()
    root.user_data.set(
      "circuit",
      raw({
        "id": "new-control-shot",
        "duration": 2,
        "branches": [
          { "key": "existing-gate", "points": [[3, -8, 86], [6, -8, 86]] },
        ],
      }),
    )
    let copy = @model.clone_entity(scene, root, "copied-control")
    ignore(scene.add_all(copy.objects))
    current.set("scene", three_json(scene))
    ignore(@model.import_project(current))
    expect_json(record("controls", "copied-control").get("effects"), [
      "new-control-shot",
    ])
    assert_eq(
      @model.str(
        @model.array(record("circuits", "copied-control"), "branches")[0],
        "key",
      ),
      "existing-gate",
    )
    let removal = @model.export_project()
    let world = project_world(removal)
    let removed = []
    let kept = []
    for n in rows(world, "children") {
      if @model.str(@model.entity(n), "id")
        is ("copied-control" | "new-pickup-upgrade-scope") {
        removed.push(@model.entity(n))
      } else {
        kept.push(n)
      }
    }
    @model.get(@model.data(world), "tankle").set(
      "deleted",
      Raw::from_array(removed[:]),
    )
    set_children(world, kept)
    ignore(@model.import_project(removal))
    assert_eq(count_records("controls", "copied-control"), 0)
    assert_eq(count_records("pickups", "new-pickup-upgrade-scope"), 0)
    assert_eq(count_records("circuits", "copied-control"), 1)
  })
}

///|
test "reopening the editor rolls back an interrupted city save before loading the catalogue" {
  fixture(_ => {
    let path = "content/levels/city/enemies.json"
    let original = @fs.read_file_to_bytes(path)
    let missing = "content/levels/city/unfinished.json"
    let stage = "content/.city-save-2147483647-" + "0".repeat(64)
    @fs.create_dir(stage)
    @fs.write_bytes_to_file(stage + "/old-0", original)
    @fs.write_string_to_file(
      stage + "/journal.json",
      @json.to_json([(path, true), (missing, false)]).stringify(),
    )
    @fs.write_string_to_file(path, "[]")
    @fs.write_string_to_file(missing, "[]")
    ignore(selected())
    assert_eq(@fs.read_file_to_bytes(path), original)
    assert_false(@fs.path_exists(missing))
    assert_false(@fs.path_exists(stage))
  })
}
