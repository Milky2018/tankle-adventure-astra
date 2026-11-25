///|
priv enum TransformField {
  Position
  Rotation
  Scale
}

///|
fn Workspace::transform_fields(
  self : Workspace,
  panel : Element,
  object : SceneNode,
  field : TransformField,
  title? : String,
) -> Unit {
  let (key, heading, value) = match field {
    Position => ("position", "位置", object.position())
    Rotation => ("rotation", "旋转（弧度）", object.rotation())
    Scale => ("scale", "缩放", object.scale())
  }
  append(panel, el("h3", label=title.unwrap_or(heading)))
  let row = el("div", style="axes")
  for
    (axis, current, set_component) in [
      ("x", value.x(), Coordinates::set_x),
      ("y", value.y(), Coordinates::set_y),
      ("z", value.z(), Coordinates::set_z),
    ] {
    let label = el("label", label=axis.to_upper())
    let input = el("input")
    input.set_attribute("aria-label", key + "." + axis)
    number_input(
      input,
      round4(current),
      next => {
        let updated = value.clone()
        set_component(updated, next)
        let cmd = match field {
          Position => self.commands.position(self.editor, object, updated)
          Rotation => self.commands.rotation(self.editor, object, updated)
          Scale => self.commands.scale(self.editor, object, updated)
        }
        self.editor.execute(cmd)
      },
      step="0.1",
    )
    append(label, input)
    append(row, label)
  }
  append(panel, row)
}

///|
fn part_label(n : SceneNode, index : Int32) -> String {
  let names : Map[String, String] = {
    "body": "车身",
    "turret": "炮塔",
    "barrel": "炮管",
    "tracks": "履带",
    "headlights": "车灯",
    "antenna": "天线",
    "radiator": "散热器",
    "halo": "光环",
    "scan": "扫描环",
    "lamps": "灯",
    "arms": "机械臂",
    "pivot": "转轴",
  }
  let role = n.binding()
  if !role.is_empty() &&
    !role.has_prefix("world/occluders/") &&
    !role.contains("/art/") {
    let parts = role.split("/").map(s => s.to_owned()).to_array()
    let offset = match parts {
      ["enemies", _, "model", ..] | ["world", "hives", _, ..] => 3
      ["player", ..] => 1
      _ => 0
    }
    return parts[offset:]
      .iter()
      .map(s => names.get_or_default(s, s))
      .join(" / ")
  }
  let name = n.name()
  if !name.is_empty() && !name.contains("/") {
    return name
  }
  (if n.is_mesh() { "装饰网格 " } else { "组件 " }) + index.to_string()
}

///|
fn Workspace::properties(self : Workspace) -> Unit {
  self.refresh()
  let panel = by_id("properties")
  let (root, obj) = match self.selection {
    Nothing => {
      replace(panel, [
        el("h2", label="对象属性"),
        el(
          "p",
          label="点击左侧对象即可定位和编辑。",
          style="hint",
        ),
      ])
      return
    }
    Whole(owner) => (owner, owner)
    Part(root~, object~) => (root, object)
  }
  replace(panel, [el("h2", label=title(root))])
  append(
    panel,
    el(
      "p",
      label=self.categories.get_or_default(category(root), category(root)) +
        " · Y " +
        floor_of(root).to_string(),
      style="hint",
    ),
  )
  let parts = el("label", label="编辑目标")
  let menu = el("select")
  menu.set_attribute("aria-label", "编辑目标")
  let mut index = 0
  root.visit(n => {
    let label = if n.same(root) {
      "整个对象（游戏位置与属性）"
    } else {
      index += 1
      "零件 · " + part_label(n, index)
    }
    option(menu, n.uuid(), label)
  })
  let select = menu.reinterpret_as_html_select_element()
  select.set_value(obj.uuid())
  handler(menu, "change", () => {
    let selected = root.by_uuid(select.value())
    guard selected.present() else { return }
    self.selection = if selected.same(root) {
      Whole(root)
    } else {
      Part(root~, object=selected)
    }
    self.editor.select(selected)
  })
  append(parts, menu)
  append(panel, parts)
  self.transform_fields(panel, obj, Position)
  if category(root) == "player" {
    append(
      panel,
      el(
        "p",
        label="玩家根节点仅用于模型预览，出生位置由存档点决定。动画转轴会由游戏驱动，请编辑其下的网格。",
        style="hint",
      ),
    )
  }
  if self.selection is Part(..) {
    self.transform_fields(panel, obj, Rotation)
    self.transform_fields(panel, obj, Scale)
    let modes = el("div")
    for
      p in [("移动", "translate"), ("旋转", "rotate"), ("缩放", "scale")] {
      let b = el("button", label=p.0)
      handler(b, "click", () => self.editor.transform_mode(p.1))
      append(modes, b)
    }
    append(panel, modes)
    let mat = obj.material()
    if mat.colored() {
      let label = el("label", label="零件颜色")
      let input = el("input")
      input.set_attribute("type", "color")
      let control = input.reinterpret_as_html_input_element()
      let hex = mat.color().hex()
      control.set_value("#" + hex)
      handler(input, "change", () => {
        let cloned = mat.clone()
        cloned.color().set(control.value())
        self.editor.execute(self.commands.material(self.editor, obj, cloned))
      })
      append(label, input)
      append(panel, label)
    }
    append(
      panel,
      el(
        "p",
        label="零件变换只改变外观；碰撞尺寸单独编辑。",
        style="hint",
      ),
    )
  } else {
    self.editor.transform_mode("translate")
    let collision = truth(root.data(), "editorOnly")
    if collision {
      self.transform_fields(panel, root, Scale, title="碰撞尺寸倍率")
      append(
        panel,
        el(
          "p",
          label="这是独立的碰撞体；改变它不会改变建筑外观。",
          style="hint",
        ),
      )
    }
    let game = get(root.data(), "game")
    if exists(game) && game.to_json() is Object(record) {
      let values = record.copy()
      if category(root) is ("controls" | "pickups") &&
        !values.contains("requires") {
        values["requires"] = ""
      }
      if category(root) == "controls" && !values.contains("effects") {
        values["effects"] = [Json::string(str(root.entity(), "id"))]
      }
      for k in ["id", "circuitKey"] {
        values.remove(k)
      }
      if collision {
        for k in ["w", "d", "h"] {
          values.remove(k)
        }
      }
      append(panel, el("h3", label="游戏属性"))
      fields(panel, Json::object(values), (path, next) => {
        let d = @archive.copy(root.data())
        d.set(
          "game",
          Raw::from_json(replace_field(d.get("game").to_json(), path, next)),
        )
        self.editor.execute(self.commands.user_data(self.editor, root, d))
      })
    }
  }
  let id = get(root.entity(), "id")
  set_text(
    by_id("selection-note"),
    if exists(id) {
      id.cast()
    } else {
      "玩家"
    },
  )
}
