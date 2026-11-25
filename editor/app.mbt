///|
priv struct Workspace {
  editor : Raw
  renderer : Raw
  three : Raw
  commands : Map[String, Raw]
  background : Raw
  categories : Map[String, String]
  mut entities : Array[Raw]
  mut collisions : Array[Raw]
  mut selection : Selection
  mut floor : Double?
  mut busy : Bool
  mut ready : Bool
  mut mode : Tab
  mut scene_dirty : Bool
  mut skills_dirty : Bool
  mut version : Int32
  mut game_bg : Raw
  abilities : AbilitySettings
  mut templates : Raw
  mut definitions : Array[TemplateDefinition]
}

///|
fn category(n : Raw) -> String {
  let c = str(entity(n), "collection")
  if c.is_empty() {
    "player"
  } else {
    c
  }
}

///|
fn title(n : Raw) -> String {
  let name = get(get(data(n), "game"), "name")
  if exists(name) {
    return name.cast()
  }
  let id = get(entity(n), "id")
  if exists(id) {
    id.cast()
  } else {
    "玩家坦克"
  }
}

///|
fn floor_of(n : Raw) -> Double {
  let pos = number(n.get("position"), "y")
  let p = get(data(n), "placement")
  let h = if exists(p) {
    let o : FixedArray[Double] = p.get("origin").cast()
    let m : FixedArray[Double] = p.get("matrix").cast()
    o[1] + pos - m[13]
  } else {
    pos
  }
  (h / 8 + 0.5).floor() * 8
}

///|
fn Workspace::scene(self : Workspace) -> Raw {
  self.editor.get("scene")
}

///|
fn Workspace::dispatch(
  self : Workspace,
  name : String,
  args~ : FixedArray[Raw] = [],
) -> Unit {
  ignore(call(self.editor.get("signals").get(name), "dispatch", args))
}

///|
fn Workspace::signal(self : Workspace, name : String, f : Raw) -> Unit {
  ignore(call(self.editor.get("signals").get(name), "add", [f]))
}

///|
fn Workspace::execute(
  self : Workspace,
  name : String,
  args : Array[Raw],
) -> Unit {
  ignore(
    call(self.editor, "execute", [
      new_instance(
        self.commands[name],
        FixedArray::from_array(([self.editor] + args)[:]),
      ),
    ]),
  )
}

///|
fn Workspace::refresh(self : Workspace) -> Unit {
  let blocked = self.busy || !self.ready
  for k in ["level-workspace", "skills-workspace"] {
    by_id(k).set("inert", Raw::of(self.busy))
  }
  for k in ["save", "preview", "add-entity"] {
    by_id(k).set("disabled", Raw::of(blocked))
  }
  for k in ["copy-entity", "delete-entity"] {
    by_id(k).set(
      "disabled",
      Raw::of(
        blocked ||
        !(self.selection.owner() is Some(n) && @model.editable(category(n))),
      ),
    )
  }
  let history = self.editor.get("history")
  for pair in [("undo", "undos"), ("redo", "redos")] {
    by_id(pair.0).set(
      "disabled",
      Raw::of(self.busy || @model.array(history, pair.1).length() == 0),
    )
  }
}

///|
fn Workspace::dirty(self : Workspace) -> Unit {
  if self.ready {
    self.scene_dirty = true
    status("有未保存修改")
    self.refresh()
  }
}

///|
fn follow_floor(n : Raw) -> Unit {
  let height = floor_of(n).to_string()
  let menu = by_id("floor")
  if !@model.array(menu, "options").iter().any(o => str(o, "value") == height) {
    option(menu, height, "Y " + height)
  }
  menu.set("value", Raw::of(height))
}

///|
fn Workspace::vec(self : Workspace, x : Double, y : Double, z : Double) -> Raw {
  new_instance(self.three.get("Vector3"), [Raw::of(x), Raw::of(y), Raw::of(z)])
}

///|
fn Workspace::apply_floor(self : Workspace) -> Unit {
  let v = by_id("floor").get("value")
  self.floor = if v.strict_equal(Raw::of("all")) {
    None
  } else {
    Some(js_number(v))
  }
  let planes : Array[Raw] = []
  if self.floor is Some(h) {
    for pair in [(-1.0, h + 6), (1.0, 1 - h)] {
      planes.push(
        new_instance(self.three.get("Plane"), [
          self.vec(0, pair.0, 0),
          Raw::of(pair.1),
        ]),
      )
    }
  }
  self.renderer.set("clippingPlanes", Raw::from_array(planes[:]))
  for n in self.collisions {
    let level = match self.floor {
      None => true
      Some(h) => h == floor_of(n)
    }
    n.set(
      "visible",
      Raw::of(
        level &&
        (self.selection.is_owner(n) || truth(by_id("collisions"), "checked")),
      ),
    )
  }
  self.dispatch("cameraChanged")
  self.render_list()
}

///|
fn Workspace::find_root(self : Workspace, n : Raw) -> Raw {
  let mut obj = n
  while exists(obj) && !obj.strict_equal(self.scene()) {
    if self.entities.any(e => e.strict_equal(obj)) {
      return obj
    }
    obj = get(obj, "parent")
  }
  Raw::null()
}

///|
fn Workspace::render_list(self : Workspace) -> Unit {
  let query = str(by_id("search"), "value").trim().to_owned().to_lower()
  let group = str(by_id("category"), "value")
  let rows = self.entities.filter(n => {
    let kind = category(n)
    let game = get(data(n), "game")
    let inside = if group == "gameplay" {
      !truth(data(n), "editorOnly")
    } else {
      kind == group
    }
    inside &&
    (if query.is_empty() {
      match self.floor {
        Some(h) => h == floor_of(n)
        None => true
      }
    } else {
      [
        title(n),
        str(n, "name"),
        kind,
        str(game, "type"),
        str(game, "encounter"),
      ]
      .join(" ")
      .to_lower()
      .contains(query)
    })
  })
  let suffix = if query.is_empty() {
    "当前楼层"
  } else {
    "搜索所有楼层"
  }
  set_text(by_id("count"), "\{rows.length()} 个对象 · \{suffix}")
  let container = fragment()
  for n in rows {
    let button = el("button", label=title(n))
    attr(button, "aria-current", self.selection.is_owner(n).to_string())
    append(
      button,
      el(
        "small",
        label=self.categories.get_or_default(category(n), category(n)) +
          " · Y " +
          floor_of(n).to_string(),
      ),
    )
    handler(button, "click", () => self.select_entity(n))
    append(container, button)
  }
  if rows.is_empty() {
    append(
      container,
      el(
        "p",
        label="当前楼层没有匹配对象。输入名称可跨楼层搜索，或切换楼层。",
        style="hint",
      ),
    )
  }
  replace(by_id("objects"), [container])
}

///|
fn Workspace::focus(self : Workspace, overview~ : Bool = false) -> Unit {
  let n = if self.selection.owner() is Some(owner) {
    owner
  } else if !self.entities.is_empty() {
    self.entities[0]
  } else {
    return
  }
  let center = call(n, "getWorldPosition", [self.vec(0, 0, 0)])
  ignore(call(self.editor.get("controls").get("center"), "copy", [center]))
  let camera = self.editor.get("camera")
  ignore(
    call(call(camera.get("position"), "copy", [center]), "add", [
      if overview {
        self.vec(0, 65, 0.01)
      } else {
        self.vec(16, 21, 24)
      },
    ]),
  )
  ignore(call(camera, "lookAt", [center]))
  self.dispatch("cameraChanged")
}

///|
fn Workspace::select_entity(self : Workspace, n : Raw) -> Unit {
  self.selection = Whole(n)
  follow_floor(n)
  ignore(call(self.editor, "select", [n]))
  self.apply_floor()
  self.focus()
}

///|
fn Workspace::index_entities(self : Workspace) -> Unit {
  self.entities = [
    for n in children(self.scene()) if exists(entity(n)) ||
    binding(n) == "player/root" => n
  ]
  self.collisions = self.entities.filter(n => truth(data(n), "editorOnly"))
}

///|
fn Workspace::entity_changed(self : Workspace, n : Raw) -> Unit {
  self.index_entities()
  if exists(n) {
    by_id("search").set("value", Raw::of(""))
    by_id("category").set("value", Raw::of(category(n)))
    self.select_entity(n)
  } else {
    self.selection = Nothing
    ignore(call(self.editor, "deselect", []))
    set_text(by_id("selection-note"), "")
    self.properties()
    self.render_list()
  }
  self.dirty()
}
