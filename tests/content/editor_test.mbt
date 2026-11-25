///|
extern "js" fn load_three_core(repo : String) -> Raw =
  #| root => process.getBuiltinModule("module").createRequire(root + "/index.js")(root + "/.editor/three-r185/build/three.core.js")

///|
extern "js" fn run_program(
  command : String,
  args : FixedArray[String],
  repo : String,
) -> Unit =
  #| (command,args,cwd) => process.getBuiltinModule("child_process").execFileSync(command,args,{cwd,stdio:"inherit"})

///|
fn three_core(repo : String) -> Raw {
  if !@archive.exists(repo + "/.editor/three-r185/build/three.core.js") {
    run_program(
      "moon",
      ["run", "--quiet", "cmd/editor", "--", "prepare-core"],
      repo,
    )
  }
  load_three_core(repo)
}

///|
extern "js" fn construct(klass : Raw, args : FixedArray[Raw]) -> Raw =
  #| (type,args) => Reflect.construct(type,args)

///|
fn new_three(three : Raw, kind : String, args~ : FixedArray[Raw] = []) -> Raw {
  construct(three.get(kind), args)
}

///|
fn three_json(object : Raw) -> Raw {
  @model.call(object, "toJSON", [])
}

///|
fn load_export(three : Raw, project : Raw) -> Raw {
  @model.call(new_three(three, "ObjectLoader"), "parse", [project.get("scene")])
}

///|
fn make_fixture(repo : String, dir : String, three : Raw) -> Unit {
  @archive.mkdir(dir + "/content/art")
  copy_dir(repo + "/content/levels", dir + "/content/levels")
  chdir(dir)
  let scene = new_three(three, "Scene")
  let root = new_three(three, "Group")
  let e = record("enemies", "prototype")
  ignore(
    @model.call(root.get("position"), "set", [
      e.get("x"),
      e.get("y"),
      e.get("z"),
    ]),
  )
  root.set("name", Raw::of("Prototype"))
  root.set(
    "userData",
    raw({
      "binding": "enemies/prototype/model/root",
      "entity": {
        "collection": "enemies",
        "id": "prototype",
        "key": "prototype",
      },
    }),
  )
  for role in ["body", "turret"] {
    let part = new_three(three, "Mesh", args=[
      new_three(three, "BoxGeometry"),
      new_three(three, "MeshBasicMaterial"),
    ])
    part.set("name", Raw::of(role))
    part
    .get("userData")
    .set("binding", Raw::of("enemies/prototype/model/" + role))
    ignore(@model.call(root, "add", [part]))
  }
  ignore(@model.call(scene, "add", [root]))
  ignore(@model.call(scene, "updateMatrixWorld", [Raw::of(true)]))
  @archive.write_scene(three_json(scene))
}

///|
fn fixture(body : (String, Raw) -> Unit raise) -> Unit raise {
  let repo = cwd()
  let three = three_core(repo)
  let dir = temp_dir()
  defer {
    chdir(repo)
    remove_dir(dir)
  }
  make_fixture(repo, dir, three)
  body(repo, three)
}

///|
fn selected() -> Raw raise {
  @model.export_project(selection="enemies:prototype")
}

///|
fn shift_x(node : Raw, amount : Double) -> Unit {
  node.get("matrix").set("12", Raw::of(quantity(node, "matrix.12") + amount))
}

///|
fn has_helpers(scene : Raw) -> Bool {
  rows(scene, "object.children").iter().any(n => flag(n, "userData.editorOnly"))
}

///|
test "batched architecture survives the editor loader and save serialization" {
  fixture((_, three) => {
    let scene = new_three(three, "Scene")
    let batch = new_three(three, "BatchedMesh", args=[
      Raw::of(1),
      Raw::of(24),
      Raw::of(36),
      new_three(three, "MeshBasicMaterial"),
    ])
    ignore(
      @model.call(batch, "addInstance", [
        @model.call(batch, "addGeometry", [new_three(three, "BoxGeometry")]),
      ]),
    )
    ignore(@model.call(scene, "add", [batch]))
    @archive.write_scene(three_json(scene))
    let project = @model.export_project()
    project.set("scene", three_json(load_export(three, project)))
    ignore(@model.import_project(project))
  })
}

///|
test "editor translation and gameplay data are independent of display names" {
  fixture((_, _) => {
    let before = record("enemies", "prototype")
    let project = selected()
    let root = lookup(project, "scene.object.children.0")
    root.set("name", Raw::of("Human readable name"))
    shift_x(root, 2)
    lookup(root, "userData.game").set("hp", Raw::of(11))
    ignore(@model.import_project(project))
    let after = record("enemies", "prototype")
    assert_eq(quantity(after, "x"), quantity(before, "x") + 2)
    assert_eq(quantity(after, "hp"), 11)
    let imported = lookup(@archive.read_scene(), "object.children.0")
    assert_eq(name_at(imported, "name"), "Human readable name")
    assert_eq(
      name_at(imported, "userData.binding"),
      "enemies/prototype/model/root",
    )
    assert_true(lookup(imported, "userData.game").is_undefined())
    assert_eq(
      name_at(selected(), "scene.object.children.0.name"),
      "Human readable name",
    )
  })
}

///|
test "stale exports and scripts are rejected before saving" {
  fixture((_, _) => {
    let project = selected()
    project.get("scripts").set("test", raw([{ "source": "throw new Error()" }]))
    raises_like("scripts are not supported", () => {
      ignore(@model.import_project(project))
    })
    project.set("scripts", raw({}))
    let path = "content/levels/city/enemies.json"
    @archive.write_file(
      path,
      Raw::of(@model.buffer_text(@archive.read_file(path)) + "\n"),
    )
    raises_like("Content changed since export", () => {
      ignore(@model.import_project(project))
    })
  })
}

///|
test "missing animation roles and duplicate bindings fail before saving" {
  fixture((_, _) => {
    let project = selected()
    let root = lookup(project, "scene.object.children.0")
    let parts = rows(root, "children")
    parts[1]
    .get("userData")
    .set("binding", lookup(parts[0], "userData.binding"))
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
  fixture((_, _) => {
    let id = "press-working-floor"
    let before = record("decks", id)
    let project = @model.export_project(selection="decks:" + id)
    let box = lookup(project, "scene.object.children.0")
    box.get("matrix").set("0", Raw::of(quantity(box, "matrix.0") * 2))
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
  fixture((_, _) => {
    let project = selected()
    let world = lookup(project, "scene.object")
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
  fixture((_, _) => {
    let project = @model.export_project()
    let root = lookup(project, "scene.object")
    root.set("background", Raw::of(0x123456))
    root.set(
      "fog",
      raw({ "type": "Fog", "color": 16777215, "near": 200, "far": 220 }),
    )
    ignore(@model.import_project(project))
    let saved = @archive.read_scene()
    assert_eq(quantity(saved, "object.background"), 0x123456)
    assert_true(lookup(saved, "object.fog").is_undefined())
    let single = selected()
    assert_true(has_helpers(single.get("scene")))
    ignore(@model.import_project(single))
    assert_false(has_helpers(@archive.read_scene()))
  })
}

///|
test "full-level collider export distinguishes repeated deck IDs" {
  fixture((_, _) => {
    let before = @archive.items(records("decks"))
    let seen = Map([])
    let mut repeat = -1
    let mut first = -1
    for i, deck in before {
      let id = name_at(deck, "id")
      if seen.get(id) is Some(index) {
        repeat = i
        first = index
        break
      }
      seen[id] = i
    }
    assert_true(repeat >= 0)
    let project = @model.export_project(colliders=true)
    let helpers = rows(project, "scene.object.children").filter(n => {
      name_at(n, "userData.entity.collection") == "decks" &&
      quantity(n, "userData.entity.index") == repeat.to_double()
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
  fixture((repo, _) => {
    copy_dir(repo + "/content/art", "content/art")
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
  fixture((_, _) => {
    let before = records("enemies")
    let original = record("enemies", "prototype")
    let project = selected()
    let stale = @model.clone(project)
    let root = lookup(project, "scene.object.children.0")
    for offset in [2.0, 1] {
      shift_x(root, offset)
      lookup(project, "scene.object.userData.tankle").set(
        "revision",
        @model.import_project(project).get("revision"),
      )
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
fn count_records(k : String, id : String) -> Int32 {
  @archive.items(records(k)).iter().filter(n => name_at(n, "id") == id).count()
}

///|
fn save_live(project : Raw, scene : Raw) -> Unit raise {
  project.set("scene", three_json(scene))
  let result = @model.import_project(project)
  let meta = lookup(scene, "userData.tankle")
  meta.set("revision", result.get("revision"))
  meta.set("roots", result.get("rootIds"))
  meta.set("deleted", raw([]))
}

///|
test "new enemies clone all animation roles and resources and can be saved, removed and restored" {
  fixture((_, three) => {
    let original = load_export(three, @model.export_project())
    let source = lookup(original, "children.0")
    let fx = new_three(three, "Mesh", args=[
      new_three(three, "BoxGeometry"),
      new_three(three, "MeshBasicMaterial"),
    ])
    fx.get("userData").set("binding", Raw::of("enemies/prototype/warning"))
    ignore(@model.call(original, "add", [fx]))
    @archive.walk(source, n => {
      for k in ["game", "placement"] {
        @archive.remove(n.get("userData"), k)
      }
    })
    @archive.write_scene(three_json(original))
    let project = @model.export_project()
    let loaded = load_export(three, project)
    let root = by_key(
      rows(loaded, "children"),
      "userData.entity.id",
      "prototype",
    )
    let pos = @model.call(root.get("position"), "clone", [])
    pos.set("x", Raw::of(quantity(pos, "x") + 3))
    let bundle = @model.clone_entity(loaded, root, "editor-enemy", pos)
    let parts = @model.array(bundle, "objects")
    assert_eq(parts.length(), 2)
    for key in ["geometry", "material"] {
      assert_false(
        lookup(bundle, "root.children.0." + key).strict_equal(
          lookup(root, "children.0." + key),
        ),
      )
    }
    ignore(@model.call(loaded, "add", parts))
    save_live(project, loaded)
    save_live(project, loaded)
    assert_eq(count_records("enemies", "editor-enemy"), 1)
    assert_eq(
      quantity(record("enemies", "editor-enemy"), "x"),
      quantity(record("enemies", "prototype"), "x") + 3,
    )
    ignore(
      @model.call(
        loaded,
        "remove",
        @model.entity_bundle(loaded, bundle.get("root")),
      ),
    )
    lookup(loaded, "userData.tankle").set(
      "deleted",
      Raw::from_array([lookup(bundle, "root.userData.entity")]),
    )
    save_live(project, loaded)
    assert_eq(count_records("enemies", "editor-enemy"), 0)
    let remaining = load_export(three, @model.export_project())
    assert_false(
      rows(remaining, "children")
      .iter()
      .any(n => {
        name_at(n, "userData.binding").has_prefix("enemies/editor-enemy/")
      }),
    )
    ignore(@model.call(loaded, "add", parts))
    save_live(project, loaded)
    assert_eq(count_records("enemies", "editor-enemy"), 1)
  })
}

///|
test "duplicate identities, missing roles and incomplete entity deletion fail before writing" {
  fixture((_, three) => {
    let project = @model.export_project()
    let scene = load_export(three, project)
    let root = lookup(scene, "children.0")
    fn clone_as(id : String) -> Raw raise {
      @model.clone_entity(scene, root, id, root.get("position"))
    }
    let dup = @model.array(clone_as("prototype"), "objects")
    ignore(@model.call(scene, "add", dup))
    project.set("scene", three_json(scene))
    raises_like("Duplicate", () => ignore(@model.import_project(project)))
    ignore(@model.call(scene, "remove", dup))
    let invalid = clone_as("new-enemy")
    let bundle = @model.array(invalid, "objects")
    ignore(
      @model.call(invalid.get("root"), "remove", [
        lookup(invalid, "root.children.1"),
      ]),
    )
    ignore(@model.call(scene, "add", bundle))
    project.set("scene", three_json(scene))
    raises_like("Missing scene role", () => {
      ignore(@model.import_project(project))
    })
    ignore(@model.call(scene, "remove", bundle))
    lookup(scene, "userData.tankle").set(
      "deleted",
      Raw::from_array([lookup(root, "userData.entity")]),
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
extern "js" fn image_standin() -> Raw = "()=>class {constructor(src){this.src=src}}"

///|
// Let ObjectLoader and ImageUtils preserve image URLs when running without a DOM.
extern "js" fn load_headless_image(make : (String) -> Raw) -> Raw =
  #| make => (url, loaded) => { const image=make(url);queueMicrotask(()=>loaded?.(image));return image }

///|
test "standalone templates can add machines, pickups and switches after the city source was removed" {
  fixture((repo, three) => {
    let globals = global_object()
    let previous = globals.get("HTMLImageElement")
    let standin = image_standin()
    let loader = lookup(three, "ImageLoader.prototype")
    let previous_load = loader.get("load")
    defer {
      loader.set("load", previous_load)
      if previous.is_undefined() {
        @archive.remove(globals, "HTMLImageElement")
      } else {
        globals.set("HTMLImageElement", previous)
      }
    }
    globals.set("HTMLImageElement", standin)
    let embedded = Set([])
    loader.set(
      "load",
      load_headless_image(url => {
        embedded.add(url)
        construct(standin, [Raw::of(url)])
      }),
    )
    let defs = @archive.items(
      read_json(repo + "/content/editor/templates.json"),
    )
    let machine_types = Set([])
    let mut count = 0
    for d in defs {
      if name_at(d, "collection") == "enemies" {
        count += 1
        machine_types.add(name_at(d, "defaults.type"))
      }
    }
    assert_eq(count, machine_types.length())
    let wanted = Set::from_iter(
      @archive.items(records("enemies")).iter().map(e => name_at(e, "type")),
    )
    assert_true(wanted == machine_types)
    let palette = @model.call(new_three(three, "ObjectLoader"), "parse", [
      @archive.read_json_gz(repo + "/content/editor/templates.scene.json.gz"),
    ])
    let project = @model.export_project()
    let loaded = load_export(three, project)
    for d in defs {
      let collection = name_at(d, "collection")
      let roots = rows(palette, "children").filter(o => {
        name_at(o, "userData.entity.collection") == collection
      })
      let src = by_key(roots, "userData.entity.id", name_at(d, "source"))
      if collection == "enemies" {
        assert_eq(
          name_at(src, "userData.game.type"),
          name_at(d, "defaults.type"),
        )
      }
      let bundle = @model.clone_entity(
        palette,
        src,
        "new-" + name_at(d, "id"),
        @model.creation_position(src, 3, -8, 86),
        defaults=d.get("defaults"),
      )
      ignore(@model.call(loaded, "add", @model.array(bundle, "objects")))
    }
    project.set("scene", three_json(loaded))
    ignore(@model.import_project(project))
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
        count_records(name_at(d, "collection"), "new-" + name_at(d, "id")),
        1,
      )
    }
    let current = @model.export_project()
    let saved = Set::from_iter(
      rows(current, "scene.images").iter().map(i => name_at(i, "url")),
    )
    for url in embedded {
      assert_true(
        url.has_prefix("data:image/jpeg;base64,") ||
        url.has_prefix("data:image/png;base64,"),
      )
      assert_true(saved.contains(url))
    }
    let scene = load_export(three, current)
    let root = by_key(
      rows(scene, "children"),
      "userData.entity.id",
      "new-control-shot",
    )
    root
    .get("userData")
    .set(
      "circuit",
      raw({
        "id": "new-control-shot",
        "duration": 2,
        "branches": [
          { "key": "existing-gate", "points": [[3, -8, 86], [6, -8, 86]] },
        ],
      }),
    )
    let copy = @model.clone_entity(
      scene,
      root,
      "copied-control",
      root.get("position"),
    )
    ignore(@model.call(scene, "add", @model.array(copy, "objects")))
    current.set("scene", three_json(scene))
    ignore(@model.import_project(current))
    expect_json(record("controls", "copied-control").get("effects"), [
      "new-control-shot",
    ])
    assert_eq(
      name_at(record("circuits", "copied-control"), "branches.0.key"),
      "existing-gate",
    )
    let removal = @model.export_project()
    let world = lookup(removal, "scene.object")
    let removed = []
    let kept = []
    for n in rows(world, "children") {
      if name_at(n, "userData.entity.id")
        is ("copied-control" | "new-pickup-upgrade-scope") {
        removed.push(lookup(n, "userData.entity"))
      } else {
        kept.push(n)
      }
    }
    lookup(world, "userData.tankle").set("deleted", Raw::from_array(removed[:]))
    set_children(world, kept)
    ignore(@model.import_project(removal))
    assert_eq(count_records("controls", "copied-control"), 0)
    assert_eq(count_records("pickups", "new-pickup-upgrade-scope"), 0)
    assert_eq(count_records("circuits", "copied-control"), 1)
  })
}
