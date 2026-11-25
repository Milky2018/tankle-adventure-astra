///|
let labels : Map[String, String] = {
  "effects": "触发信号（每行一个）",
  "weapons": "可触发动作（每行一个）",
  "hp": "生命值",
  "type": "类型",
  "name": "名称",
  "heading": "朝向（弧度）",
  "encounter": "战斗区域",
  "magneticShield": "磁力护盾",
  "ability": "能力",
  "upgrade": "升级",
  "damage": "伤害",
  "heat": "热量",
  "cooldown": "冷却（秒）",
  "range": "射程",
  "speed": "速度",
  "duration": "持续（秒）",
  "arc": "抛物线高度",
  "damagePerSecond": "每秒伤害",
  "heatPerSecond": "每秒热量",
  "segments": "反射段数",
  "lockedRange": "锁定距离",
  "idleHeatPerSecond": "待机每秒热量",
  "pullHeatPerSecond": "牵引每秒热量",
  "overdrive": "超速倍率",
  "phoenix": "凤凰倍率",
  "boostHeatPerSecond": "加速每秒热量",
  "accelerationTime": "加速（秒）",
  "decelerationTime": "减速（秒）",
  "patrol": "巡逻",
  "activation": "激活区域",
  "ground": "地面高度",
  "stops": "停靠楼层",
  "circuitKey": "电路 ID",
  "w": "宽度",
  "d": "深度",
  "h": "高度",
  "radius": "半径",
  "key": "关联键",
  "kind": "种类",
  "target": "目标",
  "requires": "前置条件",
}

///|
priv enum FieldKey {
  Property(String)
  Index(Int32)
}

///|
fn FieldKey::label(self : FieldKey) -> String {
  match self {
    Property(k) => k
    Index(i) => i.to_string()
  }
}

///|
/// Copy only ancestors of the edit so undo retains the previous document.
fn replace_field(value : Json, path : ArrayView[FieldKey], next : Json) -> Json {
  match (path, value) {
    ([], _) => next
    ([Property(k), .. rest], Object(fields)) => {
      let out = fields.copy()
      if rest.is_empty() &&
        next == "" &&
        k
        is ("requires"
        | "lift"
        | "mount"
        | "encounter"
        | "battle"
        | "reserveFor") {
        out.remove(k)
      } else {
        out[k] = replace_field(fields.get_or_default(k, @json.null), rest, next)
      }
      Json::object(out)
    }
    ([Index(i), .. rest], Array(items)) => {
      let out = items.copy()
      out[i] = replace_field(items[i], rest, next)
      Json::array(out)
    }
    _ => value
  }
}

///|
fn form_input(container : Raw, key : String, path : String) -> Raw {
  let label = el("label", style="property")
  append(label, el("span", label=labels.get_or_default(key, key)))
  let input = el("input")
  attr(input, "aria-label", path)
  input.set("title", Raw::of(path))
  input.set("disabled", Raw::of(key == "id" || key == "circuitKey"))
  append(label, input)
  append(container, label)
  input
}

///|
fn number_input(
  input : Raw,
  initial : Double,
  change : (Double) -> Unit,
) -> Unit {
  let mut current = initial
  input.set("type", Raw::of("number"))
  input.set("step", Raw::of("any"))
  input.set("value", Raw::of(initial))
  handler(input, "change", () => {
    let next = number(input, "valueAsNumber")
    if next.is_finite() {
      current = next
      change(next)
    } else {
      input.set("value", Raw::of(current))
    }
  })
}

///|
fn fields(
  container : Raw,
  values : Json,
  change : (ArrayView[FieldKey], Json) -> Unit,
) -> Unit {
  fn visit_children(value : Json, visit : (FieldKey, Json) -> Unit) {
    match value {
      Object(record) =>
        for key, child in record {
          visit(Property(key), child)
        }
      Array(items) =>
        for i, child in items {
          visit(Index(i), child)
        }
      _ => ()
    }
  }
  fn render(
    parent : Raw,
    path : Array[FieldKey],
    key : FieldKey,
    value : Json,
  ) {
    let k = key.label()
    let path = path + [key]
    let title = labels.get_or_default(k, k)
    match value {
      Array(entries) if k is ("effects" | "weapons") => {
        let label = el("label", label=title)
        let input = el("textarea")
        let lines = [ for item in entries if item is String(s) => s ]
        input.set("rows", Raw::of(3))
        input.set("value", Raw::of(lines.join("\n")))
        attr(input, "aria-label", k)
        handler(input, "change", () => {
          let lines = str(input, "value")
            .replace_all(old=",", new="\n")
            .split("\n")
            .map(s => s.trim().to_owned())
            .filter(s => !s.is_empty())
            .map(Json::string)
            .to_array()
          change(path[:], Json::array(lines))
        })
        append(label, input)
        append(parent, label)
      }
      Object(_) | Array(_) => {
        let group = el("details")
        append(group, el("summary", label=title))
        visit_children(value, (key, child) => render(group, path, key, child))
        append(parent, group)
      }
      Number(n, ..) => {
        let input = form_input(parent, k, path.map(FieldKey::label).join("."))
        number_input(input, n, edited => change(path[:], Json::number(edited)))
      }
      True | False => {
        let input = form_input(parent, k, path.map(FieldKey::label).join("."))
        input.set("type", Raw::of("checkbox"))
        input.set("checked", Raw::of(value is True))
        handler(input, "change", () => {
          change(path[:], Json::boolean(truth(input, "checked")))
        })
      }
      Null | String(_) => {
        let input = form_input(parent, k, path.map(FieldKey::label).join("."))
        input.set("type", Raw::of("text"))
        input.set("value", Raw::of(if value is String(s) { s } else { "" }))
        handler(input, "change", () => {
          change(path[:], Json::string(str(input, "value")))
        })
      }
    }
  }
  visit_children(values, (key, child) => render(container, [], key, child))
}
