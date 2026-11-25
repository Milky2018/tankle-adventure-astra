///|
#derive(@json.FromJson)
priv struct TemplateDefinition {
  id : String
  label : String
  source : String
  collection : String
  defaults : Json
}

///|
extern "js" fn random_uuid() -> String = "()=>crypto.randomUUID()"

///|
fn Workspace::new_id(self : Workspace, base : String) -> String {
  let prefix = base[:base.length().min(86)].to_owned()
  for ;; {
    let id = prefix + "-" + random_uuid()[:8].to_owned()
    if !children(self.scene()).iter().any(o => str(entity(o), "id") == id) {
      break id
    }
  }
}

///|
fn Workspace::presence(
  self : Workspace,
  root : Raw,
  objects : FixedArray[Raw],
  present : Bool,
) -> Unit {
  let world = self.scene()
  let meta = data(world).get("tankle")
  let identity = entity(root)
  let indices = objects.map(n => @model.index_of(world.get("children"), n))
  fn apply(add : Bool) {
    let deleted = [
      for e in @model.array(meta, "deleted") if @model.entity_key(e) !=
      @model.entity_key(identity) => e
    ]
    if !add {
      deleted.push(@model.clone(identity))
    }
    meta.set("deleted", Raw::from_array(deleted[:]))
    let changed = self.editor.get("signals").get("sceneGraphChanged")
    changed.set("active", Raw::of(false))
    {
      defer changed.set("active", Raw::of(true))
      for i, n in objects {
        if add {
          ignore(
            call(self.editor, "addObject", [
              n,
              world,
              if indices[i] < 0 {
                Raw::undefined()
              } else {
                Raw::of(indices[i])
              },
            ]),
          )
        } else {
          ignore(call(self.editor, "removeObject", [n]))
        }
      }
    }
    self.dispatch("sceneGraphChanged")
    self.entity_changed(if add { root } else { Raw::null() })
  }
  let cmd = new_instance(self.commands["Command"], [self.editor])
  cmd.set("type", Raw::of("EntityPresenceCommand"))
  cmd.set(
    "name",
    Raw::of(if present { "添加对象" } else { "删除对象" }),
  )
  cmd.set("execute", Raw::of(fn() { apply(present) }))
  cmd.set("undo", Raw::of(fn() { apply(!present) }))
  ignore(call(self.editor, "execute", [cmd]))
}

///|
fn dialog_buttons(
  dialog : Raw,
  label : String,
  action : () -> Unit raise,
) -> Unit {
  let row = el("div", style="dialog-actions")
  let cancel = el("button", label="取消")
  let submit = el("button", label~, style="primary")
  handler(cancel, "click", () => ignore(call(dialog, "close", [])))
  handler(submit, "click", () => {
    try {
      action()
      ignore(call(dialog, "close", []))
    } catch {
      e => status(message(e), error=true)
    }
  })
  append(row, cancel)
  append(row, submit)
  append(dialog, row)
}

///|
fn open_dialog(title : String) -> Raw {
  let d = by_id("entity-dialog")
  replace(d, [el("h2", label=title)])
  ignore(call(d, "showModal", []))
  d
}

///|
fn Workspace::add_dialog(self : Workspace) -> Unit {
  let d = open_dialog("添加关卡对象")
  let cat = el("select")
  attr(cat, "aria-label", "新增对象类型")
  for
    p in [
      ("enemies", "敌人"),
      ("controls", "机关"),
      ("pickups", "拾取物"),
    ] {
    option(cat, p.0, p.1)
  }
  if self.selection.owner() is Some(root) && @model.editable(category(root)) {
    cat.set("value", Raw::of(category(root)))
  }
  let menu = el("select")
  attr(menu, "aria-label", "对象模板")
  fn populate() {
    replace(menu, [])
    for def in self.definitions {
      if def.collection == str(cat, "value") {
        option(menu, def.id, def.label)
      }
    }
  }
  handler(cat, "change", populate)
  populate()
  let axes = el("div", style="axes")
  let inputs : Map[String, Raw] = Map([])
  let center = if self.selection.owner() is Some(root) {
    root.get("position")
  } else {
    self.editor.get("controls").get("center")
  }
  for
    p in [
      ("x", "X", number(center, "x") + 3),
      ("y", "地面 Y", self.floor.unwrap_or(0)),
      ("z", "Z", number(center, "z")),
    ] {
    let label = el("label", label=p.1)
    let n = el("input")
    n.set("type", Raw::of("number"))
    n.set("step", Raw::of("0.1"))
    n.set("value", Raw::of(p.2))
    attr(n, "aria-label", "新增." + p.0)
    inputs[p.0] = n
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
    guard self.definitions.iter().find_first(v => v.id == str(menu, "value"))
      is Some(def) else {
      raise Failure("找不到对象模板")
    }
    guard children(self.templates)
      .iter()
      .find_first(v => {
        category(v) == def.collection && str(entity(v), "id") == def.source
      })
      is Some(src) else {
      raise Failure("找不到模板模型")
    }
    let x = number(inputs["x"], "valueAsNumber")
    let y = number(inputs["y"], "valueAsNumber")
    let z = number(inputs["z"], "valueAsNumber")
    guard x.is_finite() && y.is_finite() && z.is_finite() else {
      raise Failure("请输入有效的位置坐标")
    }
    let position = @model.creation_position(src, x, y, z)
    let bundle = @model.clone_entity(
      self.templates,
      src,
      self.new_id(def.id),
      position,
      defaults=Raw::from_json(def.defaults),
    )
    self.presence(bundle.get("root"), @model.array(bundle, "objects"), true)
  })
}

///|
fn Workspace::duplicate(self : Workspace) -> Unit raise {
  guard self.selection.owner() is Some(src) && @model.editable(category(src)) else {
    return
  }
  let id = str(entity(src), "id")
  let suffix = id.split("-").last().unwrap_or("")
  let base = if suffix.length() == 8 &&
    suffix.iter().all(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')) &&
    id.length() > 8 {
    id[:id.length() - 9].to_owned()
  } else {
    id
  }
  let pos = call(call(src.get("position"), "clone", []), "add", [
    self.vec(3, 0, 0),
  ])
  let bundle = @model.clone_entity(
    self.scene(),
    src,
    self.new_id(base + "-copy"),
    pos,
  )
  self.presence(bundle.get("root"), @model.array(bundle, "objects"), true)
  status(
    "已复制，保留原对象的前置条件和触发信号，可在右侧修改",
  )
}

///|
fn Workspace::delete_dialog(self : Workspace) -> Unit {
  guard self.selection.owner() is Some(root) && @model.editable(category(root)) else {
    return
  }
  let e = entity(root)
  let id = str(e, "id")
  let d = open_dialog("删除 " + id)
  let refs : Array[String] = [
    for
      r in @model.array(
        get(data(self.scene()).get("tankle"), "references"),
        @model.entity_key(e),
      ) => r.cast()
  ]
  for n in children(self.scene()) {
    if n.strict_equal(root) || !exists(entity(n)) {
      continue
    }
    let game = get(data(n), "game")
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
      let label = category(n) + ": " + str(entity(n), "id")
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
    self.presence(root, @model.entity_bundle(self.scene(), root), false)
  })
}

///|
async fn Workspace::init_tools(self : Workspace) -> Unit {
  let templates = api("templates")
  self.definitions = @json.from_json(api("template-definitions").to_json())
  let loader = new_instance(self.three.get("ObjectLoader"), [])
  self.templates = promise(call(loader, "parseAsync", [templates])).wait()
  let dialog = el("dialog")
  dialog.set("id", Raw::of("entity-dialog"))
  append(document_body(), dialog)
  handler(by_id("add-entity"), "click", () => self.add_dialog())
  handler(by_id("copy-entity"), "click", () => {
    self.duplicate() catch {
      e => status(message(e), error=true)
    }
  })
  handler(by_id("delete-entity"), "click", () => self.delete_dialog())
}
