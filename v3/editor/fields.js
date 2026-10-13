// Forms stay separate from Three.js selection and commands.
export const labels = {
  hp: "生命值",
  type: "类型",
  name: "名称",
  heading: "朝向（弧度）",
  encounter: "战斗区域",
  magneticShield: "磁力护盾",
  variant: "变体",
  ability: "能力",
  upgrade: "升级",
  damage: "伤害",
  heat: "热量",
  cooldown: "冷却（秒）",
  range: "射程",
  speed: "速度",
  duration: "持续（秒）",
  arc: "抛物线高度",
  damagePerSecond: "每秒伤害",
  heatPerSecond: "每秒热量",
  segments: "反射段数",
  lockedRange: "锁定距离",
  idleHeatPerSecond: "待机每秒热量",
  pullHeatPerSecond: "牵引每秒热量",
  overdrive: "超速倍率",
  phoenix: "凤凰倍率",
  boostHeatPerSecond: "加速每秒热量",
  accelerationTime: "加速（秒）",
  decelerationTime: "减速（秒）",
  patrol: "巡逻",
  activation: "激活区域",
  ground: "地面高度",
  stops: "停靠楼层",
  circuitKey: "电路 ID",
  w: "宽度",
  d: "深度",
  h: "高度",
  radius: "半径",
  key: "关联键",
  kind: "种类",
  target: "目标",
  requires: "前置条件",
};
export function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function fields(container, values, change, path = []) {
  for (const [key, value] of Object.entries(values)) {
    const keys = [...path, key];
    if (value !== null && typeof value === "object") {
      const group = element("details");
      group.append(element("summary", labels[key] ?? key));
      fields(group, value, change, keys);
      container.append(group);
      continue;
    }
    const label = element("label", undefined, "property");
    label.append(element("span", labels[key] ?? key));
    const input = document.createElement("input");
    input.setAttribute("aria-label", keys.join("."));
    input.type =
      typeof value === "boolean"
        ? "checkbox"
        : typeof value === "number"
          ? "number"
          : "text";
    input.step = "any";
    if (input.type === "checkbox") input.checked = value;
    else input.value = value ?? "";
    input.disabled = key === "id" || key === "circuitKey";
    input.title = keys.join(".");
    input.onchange = () => {
      const next =
        input.type === "number"
          ? input.valueAsNumber
          : input.type === "checkbox"
            ? input.checked
            : input.value;
      if (input.type === "number" && !Number.isFinite(next)) {
        input.value = value;
        return;
      }
      change(keys, next);
    };
    label.append(input);
    container.append(label);
  }
}
export function replaceField(value, path, next) {
  const copy = structuredClone(value);
  let target = copy;
  for (const key of path.slice(0, -1)) target = target[key];
  target[path.at(-1)] = next;
  return copy;
}
