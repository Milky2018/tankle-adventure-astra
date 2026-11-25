///|
fn Workspace::transform_fields(
  self : Workspace,
  panel : Raw,
  object : Raw,
  key : String,
  title : String,
  command : String,
) -> Unit {
  append(panel, el("h3", label=title))
  let row = el("div", style="axes")
  for axis in ["x", "y", "z"] {
    let label = el("label", label=axis.to_upper())
    let input = el("input")
    input.set("type", Raw::of("number"))
    input.set("step", Raw::of("0.1"))
    input.set("value", Raw::of(round4(number(object.get(key), axis))))
    attr(input, "aria-label", key + "." + axis)
    handler(input, "change", () => {
      let next = number(input, "valueAsNumber")
      if next.is_finite() {
        let value = call(object.get(key), "clone", [])
        value.set(axis, Raw::of(next))
        self.execute(command, [object, value])
      }
    })
    append(label, input)
    append(row, label)
  }
  append(panel, row)
}

///|
fn part_label(n : Raw, index : Int32) -> String {
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
  let role = binding(n)
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
  let name = str(n, "name")
  if !name.is_empty() && !name.contains("/") {
    return name
  }
  (if truth(n, "isMesh") { "装饰网格 " } else { "组件 " }) +
  index.to_string()
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
  attr(menu, "aria-label", "编辑目标")
  let mut index = 0
  @archive.walk(root, n => {
    let label = if n.strict_equal(root) {
      "整个对象（游戏位置与属性）"
    } else {
      index += 1
      "零件 · " + part_label(n, index)
    }
    option(menu, uuid(n), label)
  })
  menu.set("value", Raw::of(uuid(obj)))
  handler(menu, "change", () => {
    let id = menu.get("value")
    let selected = call(root, "getObjectByProperty", [Raw::of("uuid"), id])
    self.selection = if selected.strict_equal(root) {
      Whole(root)
    } else {
      Part(root~, object=selected)
    }
    ignore(call(self.editor, "select", [selected]))
  })
  append(parts, menu)
  append(panel, parts)
  self.transform_fields(panel, obj, "position", "位置", "SetPositionCommand")
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
    self.transform_fields(
      panel, obj, "rotation", "旋转（弧度）", "SetRotationCommand",
    )
    self.transform_fields(panel, obj, "scale", "缩放", "SetScaleCommand")
    let modes = el("div")
    for
      p in [("移动", "translate"), ("旋转", "rotate"), ("缩放", "scale")] {
      let b = el("button", label=p.0)
      handler(b, "click", () => {
        self.dispatch("transformModeChanged", args=[Raw::of(p.1)])
      })
      append(modes, b)
    }
    append(panel, modes)
    let mat = get(obj, "material")
    let color = get(mat, "color")
    if exists(color) {
      let label = el("label", label="零件颜色")
      let input = el("input")
      input.set("type", Raw::of("color"))
      let hex : String = call(color, "getHexString", []).cast()
      input.set("value", Raw::of("#" + hex))
      handler(input, "change", () => {
        let cloned = call(mat, "clone", [])
        ignore(call(cloned.get("color"), "set", [input.get("value")]))
        self.execute("SetMaterialCommand", [obj, cloned])
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
    self.dispatch("transformModeChanged", args=[Raw::of("translate")])
    let collision = truth(data(root), "editorOnly")
    if collision {
      self.transform_fields(
        panel, root, "scale", "碰撞尺寸倍率", "SetScaleCommand",
      )
      append(
        panel,
        el(
          "p",
          label="这是独立的碰撞体；改变它不会改变建筑外观。",
          style="hint",
        ),
      )
    }
    let game = get(data(root), "game")
    if exists(game) && game.to_json() is Object(record) {
      let values = record.copy()
      if category(root) is ("controls" | "pickups") &&
        !values.contains("requires") {
        values["requires"] = ""
      }
      if category(root) == "controls" && !values.contains("effects") {
        values["effects"] = [Json::string(str(entity(root), "id"))]
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
        let d = @archive.copy(data(root))
        d.set(
          "game",
          Raw::from_json(replace_field(d.get("game").to_json(), path, next)),
        )
        self.execute("SetValueCommand", [root, Raw::of("userData"), d])
      })
    }
  }
  let id = get(entity(root), "id")
  set_text(
    by_id("selection-note"),
    if exists(id) {
      id.cast()
    } else {
      "玩家"
    },
  )
}
