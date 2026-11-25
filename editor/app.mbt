///|
priv struct Workspace {
  editor : Editor
  project : @model.LiveProject
  categories : Map[String, String]
  mut entities : Array[SceneNode]
  mut entity_ids : Set[String]
  mut collisions : Array[SceneNode]
  mut selection : Selection
  mut floor : Double?
  mut busy : Bool
  mut ready : Bool
  mut mode : Tab
  mut scene_dirty : Bool
  mut skills_dirty : Bool
  mut version : Int32
  abilities : AbilitySettings
  mut templates : SceneNode?
  mut definitions : Array[@model.TemplateDefinition]
}

///|
fn category(n : SceneNode) -> String {
  let c = str(entity(n), "collection")
  if c.is_empty() {
    "player"
  } else {
    c
  }
}

///|
fn title(n : SceneNode) -> String {
  let name = get(get(n.user_data, "game"), "name")
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
fn floor_of(n : SceneNode) -> Double {
  let pos = n.position.y
  let p = get(n.user_data, "placement")
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
fn Workspace::scene(self : Workspace) -> SceneNode {
  self.project.scene
}

///|
fn Workspace::refresh(self : Workspace) -> Unit {
  let blocked = self.busy || !self.ready
  for k in ["level-workspace", "skills-workspace"] {
    ignore(by_id(k).toggle_attribute_with_force("inert", self.busy))
  }
  for k in ["save", "preview", "add-entity"] {
    by_id(k).reinterpret_as_html_button_element().set_disabled(blocked)
  }
  let can_edit = self.selection.owner() is Some(n) &&
    @model.editable(category(n))
  for k in ["copy-entity", "delete-entity"] {
    by_id(k)
    .reinterpret_as_html_button_element()
    .set_disabled(blocked || !can_edit)
  }
  by_id("undo")
  .reinterpret_as_html_button_element()
  .set_disabled(self.busy || self.editor.undos.is_empty())
  by_id("redo")
  .reinterpret_as_html_button_element()
  .set_disabled(self.busy || self.editor.redos.is_empty())
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
fn follow_floor(n : SceneNode) -> Unit {
  let height = floor_of(n).to_string()
  let menu = by_id("floor")
  if !menu
    .query_selector_all("option")
    .any(o => o.get_attribute("value") == Some(height)) {
    option(menu, height, "Y " + height)
  }
  menu.reinterpret_as_html_select_element().set_value(height)
}

///|
fn Workspace::apply_floor(self : Workspace) -> Unit {
  let v = by_id("floor").reinterpret_as_html_select_element().value()
  self.floor = if v == "all" {
    None
  } else {
    Some(@string.parse_double(v)) catch {
      _ => None
    }
  }
  self.editor.clip_floor(self.floor)
  for n in self.collisions {
    let level = match self.floor {
      None => true
      Some(h) => h == floor_of(n)
    }
    n.visible = level &&
      (
        self.selection.is_owner(n) ||
        by_id("collisions").reinterpret_as_html_input_element().checked()
      )
  }
  self.editor.redraw()
  self.render_list()
}

///|
fn Workspace::find_root(self : Workspace, n : SceneNode) -> SceneNode? {
  let mut current = Some(n)
  while current is Some(obj) && obj.id != self.scene().id {
    if self.entity_ids.contains(obj.uuid) {
      return Some(obj)
    }
    current = obj.parent
  }
  None
}

///|
fn Workspace::render_list(self : Workspace) -> Unit {
  let query = by_id("search")
    .reinterpret_as_html_input_element()
    .value()
    .trim()
    .to_owned()
    .to_lower()
  let group = by_id("category").reinterpret_as_html_select_element().value()
  let rows = self.entities.filter(n => {
    let kind = category(n)
    let game = get(n.user_data, "game")
    let inside = if group == "gameplay" {
      !truth(n.user_data, "editorOnly")
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
      [title(n), n.name, kind, str(game, "type"), str(game, "encounter")]
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
  let buttons = []
  for n in rows {
    let button = el("button", label=title(n))
    button.set_attribute("aria-current", self.selection.is_owner(n).to_string())
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
    buttons.push(button)
  }
  if rows.is_empty() {
    buttons.push(
      el(
        "p",
        label="当前楼层没有匹配对象。输入名称可跨楼层搜索，或切换楼层。",
        style="hint",
      ),
    )
  }
  replace(by_id("objects"), FixedArray::from_array(buttons[:]))
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
  let center = n.get_world_position(@math.Vector3::new(0, 0, 0))
  self.editor.focus(center, overview~)
}

///|
fn Workspace::select_entity(self : Workspace, n : SceneNode) -> Unit {
  self.selection = Whole(n)
  follow_floor(n)
  self.editor.select(n)
  self.apply_floor()
  self.focus()
}

///|
fn Workspace::index_entities(self : Workspace) -> Unit {
  self.entities = [
    for n in self.scene().children if exists(entity(n)) ||
    binding(n) == "player/root" => n
  ]
  self.entity_ids = Set::from_iter(self.entities.iter().map(n => n.uuid))
  self.collisions = self.entities.filter(n => truth(n.user_data, "editorOnly"))
}

///|
fn Workspace::entity_changed(self : Workspace, changed : SceneNode?) -> Unit {
  self.index_entities()
  if changed is Some(n) {
    by_id("search").reinterpret_as_html_input_element().set_value("")
    by_id("category")
    .reinterpret_as_html_select_element()
    .set_value(category(n))
    self.select_entity(n)
  } else {
    self.selection = Nothing
    self.editor.deselect()
    set_text(by_id("selection-note"), "")
    self.properties()
    self.render_list()
  }
  self.dirty()
}
