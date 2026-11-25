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
fn fields(
  container : Raw,
  values : Raw,
  change : (Array[String], Raw) -> Unit,
  path~ : Array[String] = [],
) -> Unit {
  for k in @archive.keys(values) {
    let value = values.get(k)
    let keys = path + [k]
    let ty = @archive.kind(value)
    let title = labels.get_or_default(k, k)
    if ty == "array" && (k == "effects" || k == "weapons") {
      let label = el("label", label=title)
      let input = el("textarea")
      input.set("rows", Raw::of(3))
      let entries : FixedArray[String] = value.cast()
      input.set("value", Raw::of(entries.iter().join("\n")))
      attr(input, "aria-label", k)
      handler(input, "change", () => {
        let lines = str(input, "value")
          .replace_all(old=",", new="\n")
          .split("\n")
          .map(s => s.trim().to_owned())
          .filter(s => !s.is_empty())
          .to_array()
        change(keys, Raw::from_array(lines[:]))
      })
      append(label, input)
      append(container, label)
      continue
    }
    if exists(value) && (ty == "object" || ty == "array") {
      let group = el("details")
      append(group, el("summary", label=title))
      fields(group, value, change, path=keys)
      append(container, group)
      continue
    }
    let label = el("label", style="property")
    append(label, el("span", label=title))
    let input = el("input")
    let name = keys.join(".")
    attr(input, "aria-label", name)
    input.set(
      "type",
      Raw::of(
        match ty {
          "boolean" => "checkbox"
          "number" => "number"
          _ => "text"
        },
      ),
    )
    input.set("step", Raw::of("any"))
    if ty == "boolean" {
      input.set("checked", value)
    } else {
      input.set("value", if exists(value) { value } else { Raw::of("") })
    }
    input.set("disabled", Raw::of(k == "id" || k == "circuitKey"))
    input.set("title", Raw::of(name))
    handler(input, "change", () => {
      let next = get(
        input,
        match ty {
          "number" => "valueAsNumber"
          "boolean" => "checked"
          _ => "value"
        },
      )
      if ty == "number" && !js_number(next).is_finite() {
        input.set("value", value)
      } else {
        change(keys, next)
      }
    })
    append(label, input)
    append(container, label)
  }
}

///|
fn replace_field(value : Raw, path : Array[String], next : Raw) -> Raw {
  let out = @model.clone(value)
  let mut target = out
  for k in path[:path.length() - 1] {
    target = target.get(k)
  }
  let key = path[path.length() - 1]
  if next.strict_equal(Raw::of("")) &&
    ["requires", "lift", "mount", "encounter", "battle", "reserveFor"].contains(
      key,
    ) {
    @archive.remove(target, key)
  } else {
    target.set(key, next)
  }
  out
}
