///|
fn Workspace::new_id(self : Workspace, base : String) -> String {
  let prefix = base[:base.length().min(86)].to_owned()
  for ;; {
    let id = prefix + "-" + @math.generate_uuid()[:8].to_owned()
    if !self.scene().children
      .iter()
      .any(o => str(o.user_data.get("entity"), "id") == id) {
      break id
    }
  }
}

///|
fn Workspace::edit_entity(
  self : Workspace,
  bundle : @model.EntityBundle,
  add~ : Bool,
) -> Unit {
  let world = self.scene()
  let meta = world.user_data.get("tankle")
  let root = bundle.root
  let identity = root.user_data.get("entity")
  let members = bundle.objects.map(n => {
    let index = for i, child in world.children {
      if n.id == child.id {
        break i
      }
    } nobreak {
      -1
    }
    (n, index)
  })
  fn apply(add : Bool) {
    let deleted = [
      for e in @model.array(meta, "deleted") if @model.entity_key(e) !=
      @model.entity_key(identity) => e
    ]
    if !add {
      deleted.push(@model.clone(identity))
    }
    meta.set("deleted", Raw::from_array(deleted[:]))
    for (n, index) in members {
      if add {
        ignore(world.add(n))
        if index >= 0 && index < world.children.length() - 1 {
          ignore(world.children.pop())
          world.children.insert(index, n)
        }
      } else {
        ignore(n.remove_from_parent())
      }
    }
    self.entity_changed(if add { Some(root) } else { None })
  }
  self.editor.execute({ apply: () => apply(add), revert: () => apply(!add), })
}

///|
fn dialog_buttons(
  dialog : Element,
  label : String,
  action : () -> Unit raise,
) -> Unit {
  let row = el("div", style="dialog-actions")
  let cancel = el("button", label="取消")
  let submit = el("button", label~, style="primary")
  handler(cancel, "click", () => close_dialog(dialog))
  handler(submit, "click", () => {
    try {
      action()
      close_dialog(dialog)
    } catch {
      e => status(message(e), error=true)
    }
  })
  append(row, cancel)
  append(row, submit)
  append(dialog, row)
}

///|
fn open_dialog(title : String) -> Element {
  let d = by_id("entity-dialog")
  replace(d, [el("h2", label=title)])
  show_dialog(d)
  d
}

///|
fn Workspace::add_dialog(self : Workspace) -> Unit {
  let d = open_dialog("添加关卡对象")
  let cat = el("select")
  cat.set_attribute("aria-label", "新增对象类型")
  for
    p in [
      ("enemies", "敌人"),
      ("controls", "机关"),
      ("pickups", "拾取物"),
    ] {
    option(cat, p.0, p.1)
  }
  let category_menu = cat.reinterpret_as_html_select_element()
  if self.selection.owner() is Some(root) && @model.editable(category(root)) {
    category_menu.set_value(category(root))
  }
  let menu = el("select")
  let template = menu.reinterpret_as_html_select_element()
  menu.set_attribute("aria-label", "对象模板")
  fn populate() {
    replace(menu, [])
    for def in self.definitions {
      if def.collection == category_menu.value() {
        option(menu, def.id, def.label)
      }
    }
  }
  handler(cat, "change", populate)
  populate()
  let axes = el("div", style="axes")
  let inputs : Map[String, HtmlInputElement] = Map([])
  let center = if self.selection.owner() is Some(root) {
    root.position
  } else {
    self.editor.orbit.target
  }
  for
    p in [
      ("x", "X", center.x + 3),
      ("y", "地面 Y", self.floor.unwrap_or(0)),
      ("z", "Z", center.z),
    ] {
    let label = el("label", label=p.1)
    let n = el("input")
    n.set_attribute("type", "number")
    n.set_attribute("step", "0.1")
    let input = n.reinterpret_as_html_input_element()
    input.set_value(p.2.to_string())
    n.set_attribute("aria-label", "新增." + p.0)
    inputs[p.0] = input
    append(label, n)
    append(axes, label)
  }
  append(
    d,
    el(
      "p",
      label="从独立模板库添加，位置使用地面坐标。添加后可在属性面板调整数值和触发信号。",
      style="hint",
    ),
  )
  append(d, cat)
  append(d, menu)
  append(d, axes)
  dialog_buttons(d, "添加到关卡", () => {
    guard self.definitions.iter().find_first(v => v.id == template.value())
      is Some(def) else {
      raise Failure("找不到对象模板")
    }
    guard self.templates is Some(templates) else {
      raise Failure("找不到模板模型")
    }
    guard templates.children
      .iter()
      .find_first(v => {
        category(v) == def.collection &&
        str(v.user_data.get("entity"), "id") == def.source
      })
      is Some(src) else {
      raise Failure("找不到模板模型")
    }
    let x = input_number(inputs["x"])
    let y = input_number(inputs["y"])
    let z = input_number(inputs["z"])
    guard x.is_finite() && y.is_finite() && z.is_finite() else {
      raise Failure("请输入有效的位置坐标")
    }
    let offset = @model.creation_offset(src, x, y, z)
    let bundle = @model.clone_entity(
      templates,
      src,
      self.new_id(def.id),
      offset~,
      defaults=def.defaults,
    )
    self.edit_entity(bundle, add=true)
  })
}

///|
fn Workspace::duplicate(self : Workspace) -> Unit raise {
  guard self.selection.owner() is Some(src) && @model.editable(category(src)) else {
    return
  }
  let id = str(src.user_data.get("entity"), "id")
  let suffix = id.split("-").last().unwrap_or("")
  let base = if suffix.length() == 8 &&
    suffix.iter().all(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')) &&
    id.length() > 8 {
    id[:id.length() - 9].to_owned()
  } else {
    id
  }
  let bundle = @model.clone_entity(
    self.scene(),
    src,
    self.new_id(base + "-copy"),
    offset=@math.Vector3::new(3, 0, 0),
  )
  self.edit_entity(bundle, add=true)
  status(
    "已复制，保留原对象的前置条件和触发信号，可在右侧修改",
  )
}

///|
fn Workspace::delete_dialog(self : Workspace) -> Unit {
  guard self.selection.owner() is Some(root) && @model.editable(category(root)) else {
    return
  }
  let e = root.user_data.get("entity")
  let id = str(e, "id")
  let d = open_dialog("删除 " + id)
  let refs : Array[String] = [
    for
      r in @model.array(
        get(self.scene().user_data.get("tankle"), "references"),
        @model.entity_key(e),
      ) => r.cast()
  ]
  for n in self.scene().children {
    if n.id == root.id || !exists(n.user_data.get("entity")) {
      continue
    }
    let game = get(n.user_data, "game")
    if exists(game) &&
      game.to_json() is Object(record) &&
      record
      .values()
      .any(value => {
        match value {
          String(ref_id) => id == ref_id
          Array(items) => items.contains(Json::string(id))
          _ => false
        }
      }) {
      let label = category(n) + ": " + str(n.user_data.get("entity"), "id")
      if !refs.contains(label) {
        refs.push(label)
      }
    }
  }
  append(
    d,
    el(
      "p",
      label="删除模型、攻击特效和关卡记录。可以撤销；保存后才写入项目。",
      style="hint",
    ),
  )
  if !refs.is_empty() {
    append(
      d,
      el(
        "p",
        label="以下配置或脚本引用了这个标识。删除不会自动解除条件或重写剧情；请让其他机关接管所需信号，或调整相关条件。",
        style="warning",
      ),
    )
    let list = el("ul")
    for reference in refs {
      append(list, el("li", label=reference))
    }
    append(d, list)
  }
  dialog_buttons(d, "删除对象", () => {
    self.edit_entity(@model.entity_bundle(self.scene(), root), add=false)
  })
}

///|
async fn Workspace::init_tools(self : Workspace) -> Unit {
  let templates = get_scene("templates")
  self.definitions = request_json("template-definitions")
  self.templates = Some(@model.LiveProject::from_scene(templates).scene)
  let dialog = el("dialog")
  dialog.set_attribute("id", "entity-dialog")
  append(@dom.window().document().body().unwrap(), dialog)
  handler(by_id("add-entity"), "click", () => self.add_dialog())
  handler(by_id("copy-entity"), "click", () => {
    self.duplicate() catch {
      e => status(message(e), error=true)
    }
  })
  handler(by_id("delete-entity"), "click", () => self.delete_dialog())
}
