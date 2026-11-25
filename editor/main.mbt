///|
#derive(@json.FromJson, ToJson)
priv struct AbilitySettings {
  values : Map[String, Map[String, Double]]
  mut revision : String
}

///|
fn Workspace::set_mode(self : Workspace, next : Tab) -> Unit {
  self.mode = next
  for tab in [Level, Skills] {
    let id = tab.id()
    ignore(
      by_id(id + "-workspace").toggle_attribute_with_force(
        "hidden",
        next != tab,
      ),
    )
    by_id(id + "-tab").set_attribute("aria-pressed", (next == tab).to_string())
  }
  if next is Level {
    self.editor.resized()
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
  for group, parameters in self.abilities.values {
    let section = el("section")
    append(section, el("h2", label=names.get_or_default(group, group)))
    for key, value in parameters {
      number_input(form_input(section, key, key), value, next => {
        parameters[key] = next
        self.skills_dirty = true
        status("技能数值有未保存修改")
      })
    }
    append(by_id("skills"), section)
  }
}

///|
fn Workspace::save(self : Workspace, preview~ : Bool = false) -> Unit {
  guard self.ready && !self.busy else { return }
  self.busy = true
  self.refresh()
  let tab = if preview { preview_window() } else { None }
  if tab is Some(window) && window.document().body() is Some(body) {
    set_text(body, "正在保存并构建游戏…")
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
            n.set_visible(true)
          }
          let project = {
            defer {
              self.scene().set_background(self.background)
              self.apply_floor()
            }
            self.scene().set_background(self.game_bg)
            self.scene().update_world()
            self.editor.serialize().wait()
          }
          project.set(
            "history",
            @archive.obj([
              ("undos", Raw::from_json([])),
              ("redos", Raw::from_json([])),
            ]),
          )
          let res = api("scene", body=@model.pack_scene_transfer(project))
          let meta = self.scene().data().get("tankle")
          meta.set("revision", res.get("revision"))
          meta.set("roots", res.get("rootIds"))
          meta.set("deleted", Raw::from_json([]))
          self.scene_dirty = false
        }
        if self.skills_dirty {
          let res = api(
            "abilities",
            body=Raw::from_json(@json.to_json(self.abilities)),
          )
          self.abilities.revision = str(res, "revision")
          self.skills_dirty = false
        }
        self.version += 1
        status("已保存到项目")
        if preview {
          status("已保存，正在构建试玩…")
          let res = api("build", body=Raw::object())
          if tab is Some(window) {
            window
            .location()
            .assign(str(res, "url") + "&editor=" + self.version.to_string())
          }
          status("已保存，游戏已在试玩标签页打开")
        }
      } catch {
        err => {
          let m = message(err)
          status("保存或构建失败：" + m, error=true)
          if tab is Some(window) && window.document().body() is Some(body) {
            set_text(body, "未能打开试玩：" + m)
          }
        }
      }
    }),
  )
}

///|
fn Workspace::events(self : Workspace) -> Unit {
  @dom.window()
  .reinterpret_as_event_target()
  .add_event_listener("resize", _ => self.editor.resized())
  self.editor.filter_picks(hit => {
    let in_floor = match self.floor {
      None => true
      Some(h) => hit.y() >= h - 1 && hit.y() <= h + 6
    }
    in_floor &&
    (self.selection is Part(..) || self.find_root(hit.object()) is Some(_))
  })
  self.editor.on_select(n => {
    guard self.ready else { return }
    guard self.find_root(n) is Some(root) else {
      self.selection = Nothing
      self.properties()
      self.render_list()
      return
    }
    let part = self.selection is Part(..) && !n.same(root)
    self.selection = if part { Part(root~, object=n) } else { Whole(root) }
    if !part && !n.same(root) {
      self.editor.select(root)
      return
    }
    self.properties()
    self.render_list()
  })
  self.editor.on_object_change(n => {
    if self.ready {
      if self.selection.is_owner(n) && self.floor is Some(h) && h != floor_of(n) {
        follow_floor(n)
        self.apply_floor()
      }
      self.properties()
      self.render_list()
      self.dirty()
    }
  })
  self.editor.on_material_change(() => {
    if self.ready {
      self.properties()
      self.dirty()
    }
  })
  self.editor.on_history_change(() => self.refresh())
  handler(by_id("search"), "input", () => self.render_list())
  handler(by_id("category"), "change", () => {
    if by_id("category").reinterpret_as_html_select_element().value()
      is ("decks" | "architecture" | "obstacles") {
      by_id("collisions").reinterpret_as_html_input_element().set_checked(true)
    }
    self.apply_floor()
  })
  for id in ["floor", "collisions"] {
    handler(by_id(id), "change", () => self.apply_floor())
  }
  for tab in [Level, Skills] {
    let id = tab.id()
    handler(by_id(id + "-tab"), "click", () => self.set_mode(tab))
  }
  handler(by_id("undo"), "click", () => self.editor.undo())
  handler(by_id("redo"), "click", () => self.editor.redo())
  handler(by_id("focus"), "click", () => self.focus())
  handler(by_id("overview"), "click", () => self.focus(overview=true))
  handler(by_id("landmark"), "change", () => {
    if self.entities
      .iter()
      .find_first(n => {
        n.uuid() ==
        by_id("landmark").reinterpret_as_html_select_element().value()
      })
      is Some(n) {
      self.select_entity(n)
    }
  })
  handler(by_id("save"), "click", () => self.save())
  handler(by_id("preview"), "click", () => self.save(preview=true))
  @dom.window().set_onbeforeunload(e => {
    if self.scene_dirty || self.skills_dirty {
      prevent_unload(e)
    }
  })
  on_keydown(e => {
    let mod = e.meta_key() || e.ctrl_key()
    let key = e.key().to_lower()
    if mod && key == "s" {
      e.prevent_default()
      self.save()
      return
    }
    if keyboard_target_matches(e, "input,textarea,select") ||
      self.busy ||
      self.mode != Level {
      return
    }
    if mod && key == "z" {
      e.prevent_default()
      if e.shift_key() {
        self.editor.redo()
      } else {
        self.editor.undo()
      }
    }
    if key == "f" {
      self.focus()
    }
  })
}

///|
async fn start_editor() -> Unit {
  let three = import_three().wait()
  let editor = open_editor().wait()
  editor.set_history_storage(false)
  let viewport = create_viewport(editor).wait()
  append(by_id("level-workspace"), viewport)
  if viewport.query_selector("option[value='realistic']") is Some(option) {
    option.reinterpret_as_node().remove()
  }
  let renderer = three.renderer()
  let commands = import_commands().wait()
  let command_class = import_command_class().wait()
  let categories = Map([])
  for opt in by_id("category").query_selector_all("option") {
    if opt.get_attribute("value") is Some(value) {
      categories[value] = opt.text_content()
    }
  }
  let abilities : AbilitySettings = @json.from_json(api("abilities").to_json())
  let w : Workspace = {
    editor,
    renderer,
    three,
    commands,
    command_class,
    categories,
    background: three.background_color(0x222d38),
    entities: [],
    collisions: [],
    selection: Nothing,
    floor: Some(-8),
    busy: true,
    ready: false,
    mode: Level,
    scene_dirty: false,
    skills_dirty: false,
    version: 0,
    game_bg: editor.scene().background(),
    abilities,
    templates: None,
    definitions: [],
  }
  editor.renderer_created(renderer)
  editor.set_shading("solid")
  w.events()
  w.refresh()
  let project = api("scene")
  set_text(
    by_id("loading").query_selector("p").unwrap(),
    "构建编辑视图…",
  )
  editor.load_project(@model.unpack_scene_transfer(project)).wait()
  w.game_bg = w.scene().background()
  w.scene().set_background(w.background)
  editor.show_helpers(false, false, false, false)
  w.index_entities()
  let floors : Array[Double] = []
  for n in w.entities {
    let h = floor_of(n)
    if !floors.contains(h) {
      floors.push(h)
    }
    if category(n) == "hives" {
      option(by_id("landmark"), n.uuid(), title(n))
    }
  }
  floors.sort_by((a, b) => b.compare(a))
  for h in floors {
    option(by_id("floor"), h.to_string(), "Y " + h.to_string())
  }
  w.skills()
  w.init_tools()
  w.ready = true
  w.busy = false
  if !w.entities.is_empty() {
    w.select_entity(
      w.entities
      .iter()
      .find_first(n => {
        category(n) == "hives" && str(n.entity(), "id") == "awakening"
      })
      .unwrap_or(w.entities[0]),
    )
  }
  by_id("loading").set_attribute("hidden", "")
  status("本地项目已打开")
  w.refresh()
  w.editor.resized()
}

///|
fn main {
  ignore(
    @js_async.Promise::from_async(async fn() {
      start_editor() catch {
        e => {
          let m = message(e)
          set_text(
            by_id("loading").query_selector("strong").unwrap(),
            "项目未能打开",
          )
          set_text(by_id("loading").query_selector("p").unwrap(), m)
          status(m, error=true)
        }
      }
    }),
  )
}
