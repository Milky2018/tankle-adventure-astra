///|
fn on_event(n : Raw, key : String, f : Raw) -> Unit {
  ignore(call(n, "addEventListener", [Raw::of(key), f]))
}

///|
fn Workspace::set_mode(self : Workspace, next : String) -> Unit {
  self.mode = next
  for id in ["level", "skills"] {
    by_id(id + "-workspace").set("hidden", Raw::of(next != id))
    attr(by_id(id + "-tab"), "aria-pressed", (next == id).to_string())
  }
  if next == "level" {
    self.dispatch("windowResize")
  }
}

///|
fn Workspace::skills(self : Workspace) -> Unit {
  let names : Map[String, String] = {
    "cannon": "主炮",
    "mortar": "迫击炮",
    "laser": "激光",
    "magnet": "磁力",
    "drive": "驾驶",
  }
  for key in @archive.keys(self.abilities) {
    let section = el("section")
    append(section, el("h2", label=names.get_or_default(key, key)))
    fields(section, self.abilities.get(key), (path, v) => {
      self.abilities.set(key, replace_field(self.abilities.get(key), path, v))
      self.skills_dirty = true
      status("技能数值有未保存修改")
    })
    append(by_id("skills"), section)
  }
}

///|
fn Workspace::save(self : Workspace, preview~ : Bool = false) -> Unit {
  guard self.ready && !self.busy else { return }
  self.busy = true
  self.refresh()
  let tab = if preview {
    call(window_obj(), "open", [
      Raw::of("about:blank"),
      Raw::of("tankle-preview"),
    ])
  } else {
    Raw::null()
  }
  if exists(tab) {
    set_text(tab.get("document").get("body"), "正在保存并构建游戏…")
  }
  status("正在保存到项目…")
  ignore(
    @js_async.Promise::from_async(async fn() {
      defer {
        self.busy = false
        self.refresh()
      }
      try {
        frame().wait()
        if self.scene_dirty {
          for n in self.collisions {
            n.set("visible", Raw::of(true))
          }
          let project = {
            defer {
              self.scene().set("background", self.background)
              self.apply_floor()
            }
            self.scene().set("background", self.game_bg)
            invoke_async(fn() {
              ignore(call(self.scene(), "updateMatrixWorld", [Raw::of(true)]))
              call(self.editor, "toJSON", [])
            }).wait()
          }
          project.set(
            "history",
            @archive.obj([
              ("undos", Raw::from_json([])),
              ("redos", Raw::from_json([])),
            ]),
          )
          let res = api("scene", body=@model.pack_scene_transfer(project))
          let meta = data(self.scene()).get("tankle")
          meta.set("revision", res.get("revision"))
          meta.set("roots", res.get("rootIds"))
          meta.set("deleted", Raw::from_json([]))
          self.scene_dirty = false
        }
        if self.skills_dirty {
          let res = api(
            "abilities",
            body=@archive.obj([
              ("values", self.abilities),
              ("revision", self.revision),
            ]),
          )
          self.revision = res.get("revision")
          self.skills_dirty = false
        }
        self.version += 1
        status("已保存到项目")
        if preview {
          status("已保存，正在构建试玩…")
          let res = api("build", body=Raw::object())
          if exists(tab) {
            tab
            .get("location")
            .set(
              "href",
              Raw::of(str(res, "url") + "&editor=" + self.version.to_string()),
            )
          }
          status("已保存，游戏已在试玩标签页打开")
        }
      } catch {
        err => {
          let m = message(err)
          status("保存或构建失败：" + m, error=true)
          if exists(tab) {
            set_text(
              tab.get("document").get("body"),
              "未能打开试玩：" + m,
            )
          }
        }
      }
    }),
  )
}

///|
fn Workspace::events(self : Workspace) -> Unit {
  on_event(
    window_obj(),
    "resize",
    Raw::of(fn() { self.dispatch("windowResize") }),
  )
  let selector = self.editor.get("selector")
  let original = bind_method(selector, "getIntersects")
  selector.set(
    "getIntersects",
    Raw::of(fn(ray : Raw) -> Raw {
      let hits = @archive.items(apply1(original, ray))
      let visible = [
        for hit in hits if (match self.floor {
          None => true
          Some(h) => {
            let y = number(hit.get("point"), "y")
            y >= h - 1 && y <= h + 6
          }
        }) &&
        (self.part || exists(self.find_root(hit.get("object")))) => hit
      ]
      Raw::from_array(visible[:])
    }),
  )
  self.signal(
    "objectSelected",
    Raw::of(fn(n : Raw) {
      guard self.ready && exists(n) else { return }
      let root = self.find_root(n)
      guard exists(root) else { return }
      self.root = root
      if !self.part && !n.strict_equal(root) {
        ignore(call(self.editor, "select", [root]))
        return
      }
      self.properties()
      self.render_list()
    }),
  )
  self.signal(
    "objectChanged",
    Raw::of(fn(n : Raw) {
      if self.ready {
        if n.strict_equal(self.root) &&
          self.floor is Some(h) &&
          h != floor_of(n) {
          follow_floor(n)
          self.apply_floor()
        }
        self.properties()
        self.render_list()
        self.dirty()
      }
    }),
  )
  self.signal(
    "materialChanged",
    Raw::of(fn() {
      if self.ready {
        self.properties()
        self.dirty()
      }
    }),
  )
  self.signal("historyChanged", Raw::of(fn() { self.refresh() }))
  handler(by_id("search"), "input", () => self.render_list())
  handler(by_id("category"), "change", () => {
    if str(by_id("category"), "value")
      is ("decks" | "architecture" | "obstacles") {
      by_id("collisions").set("checked", Raw::of(true))
    }
    self.apply_floor()
  })
  for id in ["floor", "collisions"] {
    handler(by_id(id), "change", () => self.apply_floor())
  }
  for id in ["level", "skills"] {
    handler(by_id(id + "-tab"), "click", () => self.set_mode(id))
  }
  for id in ["undo", "redo"] {
    handler(by_id(id), "click", () => ignore(call(self.editor, id, [])))
  }
  handler(by_id("focus"), "click", () => self.focus())
  handler(by_id("overview"), "click", () => self.focus(overview=true))
  handler(by_id("landmark"), "change", () => {
    if self.entities
      .iter()
      .find_first(n => uuid(n) == str(by_id("landmark"), "value"))
      is Some(n) {
      self.select_entity(n)
    }
  })
  handler(by_id("save"), "click", () => self.save())
  handler(by_id("preview"), "click", () => self.save(preview=true))
  on_event(
    window_obj(),
    "beforeunload",
    Raw::of(fn(e : Raw) {
      if self.scene_dirty || self.skills_dirty {
        ignore(call(e, "preventDefault", []))
        e.set("returnValue", Raw::of(""))
      }
    }),
  )
  on_event(
    window_obj(),
    "keydown",
    Raw::of(fn(e : Raw) {
      let mod = truth(e, "metaKey") || truth(e, "ctrlKey")
      let key = str(e, "key").to_lower()
      if mod && key == "s" {
        ignore(call(e, "preventDefault", []))
        self.save()
        return
      }
      let target = e.get("target")
      if (
          exists(get(target, "matches")) &&
          call(target, "matches", [Raw::of("input,textarea,select")]).strict_equal(
            Raw::of(true),
          )
        ) ||
        self.busy ||
        self.mode != "level" {
        return
      }
      if mod && key == "z" {
        ignore(call(e, "preventDefault", []))
        ignore(
          call(
            self.editor,
            if truth(e, "shiftKey") {
              "redo"
            } else {
              "undo"
            },
            [],
          ),
        )
      }
      if key == "f" {
        self.focus()
      }
    }),
  )
}

///|
async fn start_editor() -> Unit {
  let three = load_module("three").wait()
  let editor = new_instance(
    load_module("/upstream/js/Editor.js").wait().get("Editor"),
    [],
  )
  ignore(
    call(editor.get("config"), "setKey", [
      Raw::of("settings/history"),
      Raw::of(false),
    ]),
  )
  let viewport = new_instance(
    load_module("/upstream/js/Viewport.js").wait().get("Viewport"),
    [editor],
  ).get("dom")
  append(by_id("level-workspace"), viewport)
  let realistic = call(viewport, "querySelector", [
    Raw::of("option[value='realistic']"),
  ])
  if exists(realistic) {
    ignore(call(realistic, "remove", []))
  }
  let renderer = new_instance(three.get("WebGLRenderer"), [
    @archive.obj([("antialias", Raw::of(true))]),
  ])
  let commands = Map([])
  for
    key in [
      "SetPositionCommand", "SetRotationCommand", "SetScaleCommand", "SetMaterialCommand",
      "SetValueCommand", "Command",
    ] {
    let base = if key == "Command" {
      "/upstream/js/"
    } else {
      "/upstream/js/commands/"
    }
    commands[key] = load_module(base + key + ".js").wait().get(key)
  }
  let categories = Map([])
  for opt in @model.array(by_id("category"), "options") {
    categories[str(opt, "value")] = str(opt, "text")
  }
  let w : Workspace = {
    editor,
    renderer,
    three,
    commands,
    categories,
    background: new_instance(three.get("Color"), [Raw::of(0x222d38)]),
    entities: [],
    collisions: [],
    root: Raw::null(),
    floor: Some(-8),
    part: false,
    busy: true,
    ready: false,
    mode: "level",
    scene_dirty: false,
    skills_dirty: false,
    version: 0,
    game_bg: Raw::null(),
    abilities: Raw::null(),
    revision: Raw::null(),
    templates: Raw::null(),
    definitions: Raw::null(),
  }
  w.dispatch("rendererCreated", args=[renderer])
  ignore(call(editor, "setViewportShading", [Raw::of("solid")]))
  w.events()
  w.refresh()
  let project = api("scene")
  let skills = api("abilities")
  set_text(
    call(by_id("loading"), "querySelector", [Raw::of("p")]),
    "构建编辑视图…",
  )
  ignore(
    promise(call(editor, "fromJSON", [@model.unpack_scene_transfer(project)])).wait(),
  )
  w.game_bg = w.scene().get("background")
  w.scene().set("background", w.background)
  let helpers = Raw::object()
  for k in ["gridHelper", "cameraHelpers", "lightHelpers", "skeletonHelpers"] {
    helpers.set(k, Raw::of(false))
  }
  w.dispatch("showHelpersChanged", args=[helpers])
  w.index_entities()
  let floors : Array[Double] = []
  for n in w.entities {
    let h = floor_of(n)
    if !floors.contains(h) {
      floors.push(h)
    }
    if category(n) == "hives" {
      option(by_id("landmark"), uuid(n), title(n))
    }
  }
  floors.sort_by((a, b) => b.compare(a))
  for h in floors {
    option(by_id("floor"), h.to_string(), "Y " + h.to_string())
  }
  w.abilities = skills.get("values")
  w.revision = skills.get("revision")
  w.skills()
  w.init_tools()
  w.ready = true
  w.busy = false
  if !w.entities.is_empty() {
    w.select_entity(
      w.entities
      .iter()
      .find_first(n => {
        category(n) == "hives" && str(entity(n), "id") == "awakening"
      })
      .unwrap_or(w.entities[0]),
    )
  }
  by_id("loading").set("hidden", Raw::of(true))
  status("本地项目已打开")
  w.refresh()
  w.dispatch("windowResize")
}

///|
fn main {
  ignore(
    @js_async.Promise::from_async(async fn() {
      start_editor() catch {
        e => {
          let m = message(e)
          set_text(
            call(by_id("loading"), "querySelector", [Raw::of("strong")]),
            "项目未能打开",
          )
          set_text(call(by_id("loading"), "querySelector", [Raw::of("p")]), m)
          status(m, error=true)
        }
      }
    }),
  )
}
