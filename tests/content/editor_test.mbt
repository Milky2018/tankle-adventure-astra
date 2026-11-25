///|
extern "js" fn load_three_core(repo : String) -> ThreeEditor =
  #| root => process.getBuiltinModule("module").createRequire(root + "/index.js")(root + "/.editor/three-r185/build/three.core.js")

///|
extern "js" fn run_program(
  command : String,
  args : FixedArray[String],
  repo : String,
) -> Unit =
  #| (command,args,cwd) => process.getBuiltinModule("child_process").execFileSync(command,args,{cwd,stdio:"inherit"})

///|
fn three_core(repo : String) -> ThreeEditor {
  if !@fs.path_exists(repo + "/.editor/three-r185/build/three.core.js") {
    run_program(
      "moon",
      ["run", "--quiet", "cmd/editor", "--", "prepare-core"],
      repo,
    )
  }
  load_three_core(repo)
}

///|
// Integration tests use the exact upstream ObjectLoader and serializer used by the editor.
#external
priv type ThreeEditor

///|
extern "js" fn ThreeEditor::scene(self : ThreeEditor) -> Raw = "t=>new t.Scene()"

///|
extern "js" fn ThreeEditor::group(self : ThreeEditor) -> Raw = "t=>new t.Group()"

///|
extern "js" fn ThreeEditor::box(self : ThreeEditor) -> Raw = "t=>new t.BoxGeometry()"

///|
extern "js" fn ThreeEditor::material(self : ThreeEditor) -> Raw = "t=>new t.MeshBasicMaterial()"

///|
extern "js" fn ThreeEditor::mesh(
  self : ThreeEditor,
  geometry : Raw,
  material : Raw,
) -> Raw = "(t,g,m)=>new t.Mesh(g,m)"

///|
extern "js" fn ThreeEditor::batch(
  self : ThreeEditor,
  slots : Int32,
  vertices : Int32,
  indices : Int32,
  material : Raw,
) -> Raw =
  #| (t,s,v,i,m)=>new t.BatchedMesh(s,v,i,m)

///|
extern "js" fn add_geometry(batch : Raw, geometry : Raw) -> Int32 = "(b,g)=>b.addGeometry(g)"

///|
extern "js" fn add_instance(batch : Raw, index : Int32) -> Unit = "(b,i)=>{b.addInstance(i)}"

///|
extern "js" fn add_objects(parent : Raw, children : FixedArray[Raw]) -> Unit = "(p,cs)=>{p.add(...cs)}"

///|
extern "js" fn remove_objects(parent : Raw, children : FixedArray[Raw]) -> Unit = "(p,cs)=>{p.remove(...cs)}"

///|
extern "js" fn position(
  object : Raw,
  x : Double,
  y : Double,
  z : Double,
) -> Unit = "(o,x,y,z)=>{o.position.set(x,y,z)}"

///|
extern "js" fn update_world(scene : Raw) -> Unit = "s=>s.updateMatrixWorld(true)"

///|
extern "js" fn three_json(object : Raw) -> Raw = "o=>o.toJSON()"

///|
extern "js" fn ThreeEditor::parse(self : ThreeEditor, scene : Raw) -> Raw =
  #| (t,s)=>new t.ObjectLoader().parse(s)

///|
fn load_export(three : ThreeEditor, project : Raw) -> Raw {
  three.parse(project.get("scene"))
}

///|
fn make_fixture(repo : String, dir : String, three : ThreeEditor) -> Unit raise {
  @fs.create_dir(dir + "/content/art")
  copy_fixture(repo + "/content/levels", dir + "/content/levels")
  chdir(dir)
  let scene = three.scene()
  let root = three.group()
  let e = record("enemies", "prototype")
  position(root, quantity(e, "x"), quantity(e, "y"), quantity(e, "z"))
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
    let part = three.mesh(three.box(), three.material())
    part.set("name", Raw::of(role))
    part
    .get("userData")
    .set("binding", Raw::of("enemies/prototype/model/" + role))
    add_objects(root, [part])
  }
  add_objects(scene, [root])
  update_world(scene)
  @archive.write_scene(three_json(scene))
}

///|
fn fixture(body : (String, ThreeEditor) -> Unit raise) -> Unit raise {
  let repo = cwd()
  let three = three_core(repo)
  let dir = temp_dir()
  defer {
    chdir(repo)
    @fs.remove_dir(dir)
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
test "batched architecture survives the editor loader and save serialization" {
  fixture((_, three) => {
    let scene = three.scene()
    let batch = three.batch(1, 96, 36, three.material())
    add_instance(batch, add_geometry(batch, three.box()))
    add_objects(scene, [batch])
    @archive.write_scene(three_json(scene))
    fn positions(project : Raw) -> Raw {
      @model.array(project.get("scene"), "geometries")[0]
      .get("data")
      .get("attributes")
      .get("position")
      .get("array")
    }
    let project = @model.export_project()
    let expected = positions(project).to_json()
    let wire = @model.pack_scene_transfer(project)
    assert_true(@archive.is_string(positions(wire)))
    let received = @model.unpack_scene_transfer(wire)
    project.set("scene", three_json(load_export(three, received)))
    ignore(@model.import_project(project))
    expect_json(positions(@model.export_project()), expected)
  })
}

///|
test "editor translation and gameplay data are independent of display names" {
  fixture((_, _) => {
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
test "stale exports and scripts are rejected before saving" {
  fixture((_, _) => {
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
  fixture((_, _) => {
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
  fixture((_, _) => {
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
  fixture((_, _) => {
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
  fixture((_, _) => {
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
  fixture((_, _) => {
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
  fixture((repo, _) => {
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
  fixture((_, _) => {
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
fn save_live(project : Raw, scene : Raw) -> Unit raise {
  project.set("scene", three_json(scene))
  let result = @model.import_project(project)
  let meta = @model.get(@model.data(scene), "tankle")
  meta.set("revision", result.get("revision"))
  meta.set("roots", result.get("rootIds"))
  meta.set("deleted", raw([]))
}

///|
test "new enemies clone all animation roles and resources and can be saved, removed and restored" {
  fixture((_, three) => {
    let original = load_export(three, @model.export_project())
    let source = @model.children(original)[0]
    let fx = three.mesh(three.box(), three.material())
    fx.get("userData").set("binding", Raw::of("enemies/prototype/warning"))
    add_objects(original, [fx])
    @archive.walk(source, n => {
      for k in ["game", "placement"] {
        @archive.remove(n.get("userData"), k)
      }
    })
    @archive.write_scene(three_json(original))
    let project = @model.export_project()
    let loaded = load_export(three, project)
    let root = rows(loaded, "children")
      .iter()
      .find_first(n => @model.str(@model.entity(n), "id") == "prototype")
      .unwrap()
    let bundle = @model.clone_entity(
      loaded,
      root,
      "editor-enemy",
      offset=@math.Vector3::new(3, 0, 0),
    )
    let parts = bundle.objects
    assert_eq(parts.length(), 2)
    for key in ["geometry", "material"] {
      assert_false(
        @model.children(bundle.root)[0]
        .get(key)
        .strict_equal(@model.children(root)[0].get(key)),
      )
    }
    add_objects(loaded, parts)
    save_live(project, loaded)
    save_live(project, loaded)
    assert_eq(count_records("enemies", "editor-enemy"), 1)
    assert_eq(
      quantity(record("enemies", "editor-enemy"), "x"),
      quantity(record("enemies", "prototype"), "x") + 3,
    )
    remove_objects(loaded, @model.entity_bundle(loaded, bundle.root).objects)
    @model.get(@model.data(loaded), "tankle").set(
      "deleted",
      Raw::from_array([@model.entity(bundle.root)]),
    )
    save_live(project, loaded)
    assert_eq(count_records("enemies", "editor-enemy"), 0)
    let remaining = load_export(three, @model.export_project())
    assert_false(
      rows(remaining, "children")
      .iter()
      .any(n => @model.binding(n).has_prefix("enemies/editor-enemy/")),
    )
    add_objects(loaded, parts)
    save_live(project, loaded)
    assert_eq(count_records("enemies", "editor-enemy"), 1)
  })
}

///|
test "duplicate identities, missing roles and incomplete entity deletion fail before writing" {
  fixture((_, three) => {
    let project = @model.export_project()
    let scene = load_export(three, project)
    let root = @model.children(scene)[0]
    fn clone_as(id : String) -> @model.EntityBundle raise {
      @model.clone_entity(scene, root, id)
    }
    let dup = clone_as("prototype").objects
    add_objects(scene, dup)
    project.set("scene", three_json(scene))
    raises_like("Duplicate", () => ignore(@model.import_project(project)))
    remove_objects(scene, dup)
    let invalid = clone_as("new-enemy")
    let bundle = invalid.objects
    remove_objects(invalid.root, [@model.children(invalid.root)[1]])
    add_objects(scene, bundle)
    project.set("scene", three_json(scene))
    raises_like("Missing scene role", () => {
      ignore(@model.import_project(project))
    })
    remove_objects(scene, bundle)
    @model.get(@model.data(scene), "tankle").set(
      "deleted",
      Raw::from_array([@model.entity(root)]),
    )
    project.set("scene", three_json(scene))
    raises_like("Delete the complete entity", () => {
      ignore(@model.import_project(project))
    })
    assert_eq(count_records("enemies", "new-enemy"), 0)
  })
}

///|
// Node lacks HTMLImageElement. Preserve URLs through upstream ImageLoader and ImageUtils.
extern "js" fn intercept_images(
  three : ThreeEditor,
  seen : (String) -> Unit,
) -> () -> Unit =
  #| (three,seen)=>{
  #|   const previousImage=globalThis.HTMLImageElement, previousLoad=three.ImageLoader.prototype.load;
  #|   class Image { constructor(url){this.src=url} }
  #|   globalThis.HTMLImageElement=Image;
  #|   three.ImageLoader.prototype.load=(url,loaded)=>{
  #|     seen(url);const image=new Image(url);queueMicrotask(()=>loaded?.(image));return image;
  #|   };
  #|   return ()=>{
  #|     three.ImageLoader.prototype.load=previousLoad;
  #|     if(previousImage===undefined)delete globalThis.HTMLImageElement;else globalThis.HTMLImageElement=previousImage;
  #|   };
  #| }

///|
test "standalone templates can add machines, pickups and switches after the city source was removed" {
  fixture((repo, three) => {
    let embedded = Set([])
    let restore = intercept_images(three, url => embedded.add(url))
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
    let palette = three.parse(
      @archive.read_json_gz(repo + "/content/editor/templates.scene.json.gz"),
    )
    let project = @model.export_project()
    let loaded = load_export(three, project)
    for d in defs {
      let collection = @model.str(d, "collection")
      let roots = rows(palette, "children").filter(o => {
        @model.str(@model.entity(o), "collection") == collection
      })
      let src = roots
        .iter()
        .find_first(n => {
          @model.str(@model.entity(n), "id") == @model.str(d, "source")
        })
        .unwrap()
      if collection == "enemies" {
        assert_eq(
          @model.str(@model.get(@model.data(src), "game"), "type"),
          @model.str(d.get("defaults"), "type"),
        )
      }
      let bundle = @model.clone_entity(
        palette,
        src,
        "new-" + @model.str(d, "id"),
        offset=@model.creation_offset(src, 3, -8, 86),
        defaults=d.get("defaults"),
      )
      add_objects(loaded, bundle.objects)
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
        count_records(@model.str(d, "collection"), "new-" + @model.str(d, "id")),
        1,
      )
    }
    let current = @model.export_project()
    let saved = Set::from_iter(
      rows(current.get("scene"), "images").iter().map(i => @model.str(i, "url")),
    )
    for url in embedded {
      assert_true(
        url.has_prefix("data:image/jpeg;base64,") ||
        url.has_prefix("data:image/png;base64,"),
      )
      assert_true(saved.contains(url))
    }
    let scene = load_export(three, current)
    let root = rows(scene, "children")
      .iter()
      .find_first(n => @model.str(@model.entity(n), "id") == "new-control-shot")
      .unwrap()
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
    let copy = @model.clone_entity(scene, root, "copied-control")
    add_objects(scene, copy.objects)
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
