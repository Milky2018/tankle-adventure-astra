import * as THREE from "three";
import { Editor } from "/upstream/js/Editor.js";
import { Viewport } from "/upstream/js/Viewport.js";
import { SetPositionCommand } from "/upstream/js/commands/SetPositionCommand.js";
import { SetRotationCommand } from "/upstream/js/commands/SetRotationCommand.js";
import { SetScaleCommand } from "/upstream/js/commands/SetScaleCommand.js";
import { SetMaterialCommand } from "/upstream/js/commands/SetMaterialCommand.js";
import { SetValueCommand } from "/upstream/js/commands/SetValueCommand.js";
import { element, fields, replaceField } from "./fields.js";

const $ = (id) => document.getElementById(id);
const editor = new Editor();
editor.config.setKey("settings/history", false);
const viewport = new Viewport(editor);
$("level-workspace").append(viewport.dom);
// Path tracing is unnecessary for placement and would keep the GPU busy.
viewport.dom.querySelector('option[value="realistic"]')?.remove();
const renderer = new THREE.WebGLRenderer({ antialias: true });
editor.signals.rendererCreated.dispatch(renderer);
editor.setViewportShading("solid");

window.addEventListener("resize", () => editor.signals.windowResize.dispatch());
const categoryNames = Object.fromEntries(
  [...$("category").options].map((option) => [option.value, option.text]),
);
let entities = [],
  collisionObjects = [],
  activeRoot = null;
let abilities,
  abilitiesRevision,
  sceneDirty = false,
  skillsDirty = false,
  busy = true,
  ready = false;
let mode = "level",
  partMode = false;
let floor = -8;
let saveVersion = 0;
let gameBackground;
const editorBackground = new THREE.Color(0x222d38);
const floorOf = (object) => {
  const placement = object.userData.placement;
  const height = placement
    ? placement.origin[1] + object.position.y - placement.matrix[13]
    : object.position.y;
  return Math.round(height / 8) * 8;
};
function followFloor(object) {
  const height = String(floorOf(object));
  if (![...$("floor").options].some((option) => option.value === height)) {
    const option = element("option", `Y ${height}`);
    option.value = height;
    $("floor").append(option);
  }
  $("floor").value = height;
}
const categoryOf = (object) => object.userData.entity?.collection ?? "player";
const titleOf = (object) =>
  object.userData.game?.name ?? object.userData.entity?.id ?? "玩家坦克";
function status(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}
function refreshButtons() {
  $("level-workspace").inert = busy;
  $("skills-workspace").inert = busy;
  $("save").disabled = busy || !ready;
  $("preview").disabled = busy || !ready;
  $("undo").disabled = busy || !editor.history.undos.length;
  $("redo").disabled = busy || !editor.history.redos.length;
}
async function api(path, data) {
  const response = await fetch(
    `/api/${path}`,
    data === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}
function dirty() {
  if (!ready) return;
  sceneDirty = true;
  status("有未保存修改");
  refreshButtons();
}
function applyFloor() {
  floor = $("floor").value === "all" ? null : Number($("floor").value);
  renderer.clippingPlanes =
    floor === null
      ? []
      : [
          new THREE.Plane(new THREE.Vector3(0, -1, 0), floor + 6),
          new THREE.Plane(new THREE.Vector3(0, 1, 0), -(floor - 1)),
        ];
  for (const object of collisionObjects)
    object.visible =
      (object === activeRoot || $("collisions").checked) &&
      (floor === null || floorOf(object) === floor);
  editor.signals.cameraChanged.dispatch();
  renderList();
}
// Picking must follow the visible floor, including hits inside batched meshes.
const getIntersects = editor.selector.getIntersects.bind(editor.selector);
editor.selector.getIntersects = (raycaster) =>
  getIntersects(raycaster).filter(
    (hit) =>
      (floor === null ||
        (hit.point.y >= floor - 1 && hit.point.y <= floor + 6)) &&
      (partMode || findRoot(hit.object)),
  );
function findRoot(object) {
  for (let node = object; node && node !== editor.scene; node = node.parent)
    if (entities.includes(node)) return node;
  return null;
}
function renderList() {
  const query = $("search").value.trim().toLowerCase();
  const category = $("category").value;
  const matches = entities.filter((object) => {
    const kind = categoryOf(object);
    const group =
      category === "gameplay" ? !object.userData.editorOnly : kind === category;
    const search = [
      titleOf(object),
      object.name,
      kind,
      object.userData.game?.type,
      object.userData.game?.encounter,
    ]
      .join(" ")
      .toLowerCase();
    return (
      group &&
      (query
        ? search.includes(query)
        : floor === null || floorOf(object) === floor)
    );
  });
  $("count").textContent =
    `${matches.length} 个对象${query ? " · 搜索所有楼层" : " · 当前楼层"}`;
  const fragment = document.createDocumentFragment();
  for (const object of matches) {
    const row = element("button", titleOf(object));
    row.setAttribute("aria-current", String(object === activeRoot));
    row.append(
      element(
        "small",
        `${categoryNames[categoryOf(object)]} · Y ${floorOf(object)}`,
        "",
      ),
    );
    row.onclick = () => selectEntity(object);
    fragment.append(row);
  }
  if (!matches.length)
    fragment.append(
      element(
        "p",
        "当前楼层没有匹配对象。输入名称可跨楼层搜索，或切换楼层。",
        "hint",
      ),
    );
  $("objects").replaceChildren(fragment);
}
function selectEntity(object) {
  partMode = false;
  activeRoot = object;
  followFloor(object);
  editor.select(object);
  applyFloor();
  focusSelection();
}
function focusSelection(overview = false) {
  const object = activeRoot ?? entities[0];
  if (!object) return;
  const center = object.getWorldPosition(new THREE.Vector3());
  editor.controls.center.copy(center);
  editor.camera.position
    .copy(center)
    .add(
      overview ? new THREE.Vector3(0, 65, 0.01) : new THREE.Vector3(16, 21, 24),
    );
  editor.camera.lookAt(center);
  editor.signals.cameraChanged.dispatch();
}
function transformFields(container, object, attribute, title, Command) {
  container.append(element("h3", title));
  const row = element("div", undefined, "axes");
  for (const axis of ["x", "y", "z"]) {
    const label = element("label", axis.toUpperCase());
    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.1";
    input.value = Number(object[attribute][axis].toFixed(4));
    input.setAttribute("aria-label", `${attribute}.${axis}`);
    input.onchange = () => {
      if (!Number.isFinite(input.valueAsNumber)) return;
      const value = object[attribute].clone();
      value[axis] = input.valueAsNumber;
      editor.execute(new Command(editor, object, value));
    };
    label.append(input);
    row.append(label);
  }
  container.append(row);
}
function partLabel(node, index) {
  const names = {
    body: "车身",
    turret: "炮塔",
    barrel: "炮管",
    tracks: "履带",
    headlights: "车灯",
    antenna: "天线",
    radiator: "散热器",
    halo: "光环",
    scan: "扫描环",
    lamps: "灯",
    arms: "机械臂",
    pivot: "转轴",
  };
  const binding = node.userData.binding;
  if (binding && !binding.startsWith("world/occluders/")) {
    const path = binding.replace(
      /^(enemies\/[^/]+\/model|world\/hives\/[^/]+|player)\//,
      "",
    );
    return path
      .split("/")
      .map((part) => names[part] ?? part)
      .join(" / ");
  }
  if (node.name && !node.name.includes("/")) return node.name;
  return `${node.isMesh ? "装饰网格" : "组件"} ${index}`;
}
function renderProperties() {
  const root = activeRoot,
    object = editor.selected;
  const panel = $("properties");
  panel.replaceChildren(element("h2", root ? titleOf(root) : "对象属性"));
  if (!root || !object) {
    panel.append(element("p", "点击左侧对象即可定位和编辑。", "hint"));
    return;
  }
  panel.append(
    element(
      "p",
      `${categoryNames[categoryOf(root)]} · Y ${floorOf(root)}`,
      "hint",
    ),
  );
  const parts = element("label", "编辑目标");
  const select = document.createElement("select");
  select.setAttribute("aria-label", "编辑目标");
  let partIndex = 0;
  root.traverse((node) => {
    const option = element(
      "option",
      node === root
        ? "整个对象（游戏位置与属性）"
        : `零件 · ${partLabel(node, ++partIndex)}`,
    );
    option.value = node.uuid;
    select.append(option);
  });
  select.value = object.uuid;
  select.onchange = () => {
    partMode = select.value !== root.uuid;
    editor.select(root.getObjectByProperty("uuid", select.value));
  };
  parts.append(select);
  panel.append(parts);
  transformFields(panel, object, "position", "位置", SetPositionCommand);
  if (categoryOf(root) === "player")
    panel.append(
      element(
        "p",
        "玩家根节点仅用于模型预览，出生位置由存档点决定。动画转轴会由游戏驱动，请编辑其下的网格。",
        "hint",
      ),
    );
  if (object !== root) {
    transformFields(
      panel,
      object,
      "rotation",
      "旋转（弧度）",
      SetRotationCommand,
    );
    transformFields(panel, object, "scale", "缩放", SetScaleCommand);
    const modes = element("div");
    for (const [name, value] of [
      ["移动", "translate"],
      ["旋转", "rotate"],
      ["缩放", "scale"],
    ]) {
      const button = element("button", name);
      button.onclick = () =>
        editor.signals.transformModeChanged.dispatch(value);
      modes.append(button);
    }
    panel.append(modes);
    if (object.material?.color) {
      const label = element("label", "零件颜色");
      const color = document.createElement("input");
      color.type = "color";
      color.value = `#${object.material.color.getHexString()}`;
      color.onchange = () => {
        // Clone shared materials so editing one part cannot recolor the city.
        const material = object.material.clone();
        material.color.set(color.value);
        editor.execute(new SetMaterialCommand(editor, object, material));
      };
      label.append(color);
      panel.append(label);
    }
    panel.append(
      element("p", "零件变换只改变外观；碰撞尺寸单独编辑。", "hint"),
    );
  } else {
    editor.signals.transformModeChanged.dispatch("translate");
    if (root.userData.editorOnly) {
      transformFields(panel, root, "scale", "碰撞尺寸倍率", SetScaleCommand);
      panel.append(
        element("p", "这是独立的碰撞体；改变它不会改变建筑外观。", "hint"),
      );
    }
    if (root.userData.game) {
      panel.append(element("h3", "游戏属性"));
      const values = Object.fromEntries(
        Object.entries(root.userData.game).filter(
          ([key]) =>
            !["id", "circuitKey"].includes(key) &&
            !(root.userData.editorOnly && ["w", "h", "d"].includes(key)),
        ),
      );
      fields(panel, values, (path, next) =>
        editor.execute(
          new SetValueCommand(editor, root, "userData", {
            ...root.userData,
            game: replaceField(root.userData.game, path, next),
          }),
        ),
      );
    }
  }
  $("selection-note").textContent = root.userData.entity?.id ?? "玩家";
}
editor.signals.objectSelected.add((object) => {
  if (!ready || !object) return;
  const root = findRoot(object);
  if (!root) return;
  activeRoot = root;
  if (!partMode && object !== root) {
    editor.select(root);
    return;
  }
  renderProperties();
  renderList();
});
editor.signals.objectChanged.add((object) => {
  if (ready) {
    if (object === activeRoot && floor !== null && floorOf(object) !== floor) {
      followFloor(object);
      applyFloor();
    }
    renderProperties();
    renderList();
    dirty();
  }
});
editor.signals.materialChanged.add(() => {
  if (ready) {
    renderProperties();
    dirty();
  }
});
editor.signals.historyChanged.add(refreshButtons);
$("search").oninput = renderList;
$("category").onchange = () => {
  if (["decks", "architecture", "obstacles"].includes($("category").value))
    $("collisions").checked = true;
  applyFloor();
};
$("floor").onchange = applyFloor;
$("collisions").onchange = applyFloor;
$("focus").onclick = () => focusSelection();
$("overview").onclick = () => focusSelection(true);
$("undo").onclick = () => editor.undo();
$("redo").onclick = () => editor.redo();
$("landmark").onchange = () => {
  const object = entities.find((object) => object.uuid === $("landmark").value);
  if (object) selectEntity(object);
};
function setMode(next) {
  mode = next;
  $("level-workspace").hidden = mode !== "level";
  $("skills-workspace").hidden = mode !== "skills";
  $("level-tab").setAttribute("aria-pressed", String(mode === "level"));
  $("skills-tab").setAttribute("aria-pressed", String(mode === "skills"));
  if (mode === "level") editor.signals.windowResize.dispatch();
}
$("level-tab").onclick = () => setMode("level");
$("skills-tab").onclick = () => setMode("skills");
function renderSkills() {
  const names = {
    cannon: "主炮",
    mortar: "迫击炮",
    laser: "激光",
    magnet: "磁力",
    drive: "驾驶",
  };
  for (const [key, values] of Object.entries(abilities)) {
    const section = element("section");
    section.append(element("h2", names[key]));
    fields(section, values, (path, next) => {
      abilities[key] = replaceField(abilities[key], path, next);
      skillsDirty = true;
      status("技能数值有未保存修改");
    });
    $("skills").append(section);
  }
}
async function save(preview = false) {
  if (busy) return;
  busy = true;
  refreshButtons();
  // Open synchronously so the browser does not block the preview after a build.
  const gameWindow = preview
    ? window.open("about:blank", "tankle-preview")
    : null;
  if (gameWindow) gameWindow.document.body.textContent = "正在保存并构建游戏…";
  status("正在保存到 v3…");
  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (sceneDirty) {
      // Visibility is an editor view preference, never game content.
      for (const object of collisionObjects) object.visible = true;
      let project;
      try {
        editor.scene.updateMatrixWorld(true);
        editor.scene.background = gameBackground;
        project = editor.toJSON();
        project.history = { undos: [], redos: [] };
      } finally {
        editor.scene.background = editorBackground;
        applyFloor();
      }
      const result = await api("scene", project);
      editor.scene.userData.tankle.revision = result.revision;
      sceneDirty = false;
    }
    if (skillsDirty) {
      const result = await api("abilities", {
        values: abilities,
        revision: abilitiesRevision,
      });
      abilitiesRevision = result.revision;
      skillsDirty = false;
    }
    saveVersion++;
    status("已保存到项目");
    if (preview) {
      status("已保存，正在构建试玩…");
      const result = await api("build", {});
      if (gameWindow)
        gameWindow.location.href = `${result.url}&editor=${saveVersion}`;
      status("已保存，游戏已在试玩标签页打开");
    }
  } catch (error) {
    status(`保存或构建失败：${error.message}`, true);
    if (gameWindow)
      gameWindow.document.body.textContent = `未能打开试玩：${error.message}`;
  } finally {
    busy = false;
    refreshButtons();
  }
}
$("save").onclick = () => save();
$("preview").onclick = () => save(true);
window.addEventListener("beforeunload", (event) => {
  if (sceneDirty || skillsDirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});
window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    save();
    return;
  }
  if (event.target.matches("input,textarea,select") || busy || mode !== "level")
    return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    event.shiftKey ? editor.redo() : editor.undo();
  }
  if (event.key.toLowerCase() === "f") focusSelection();
});
try {
  const [project, skills] = await Promise.all([api("scene"), api("abilities")]);
  $("loading").querySelector("p").textContent = "构建编辑视图…";
  await editor.fromJSON(project);
  gameBackground = editor.scene.background;
  editor.scene.background = editorBackground;
  editor.signals.showHelpersChanged.dispatch({
    gridHelper: false,
    cameraHelpers: false,
    lightHelpers: false,
    skeletonHelpers: false,
  });
  entities = editor.scene.children.filter(
    (object) =>
      object.userData.entity || object.userData.binding === "player/root",
  );
  collisionObjects = entities.filter((object) => object.userData.editorOnly);
  const floors = [...new Set(entities.map(floorOf))].sort((a, b) => b - a);
  for (const height of floors) {
    const option = element("option", `Y ${height}`);
    option.value = height;
    $("floor").append(option);
  }
  const hives = entities.filter((object) => categoryOf(object) === "hives");
  for (const hive of hives) {
    const option = element("option", titleOf(hive));
    option.value = hive.uuid;
    $("landmark").append(option);
  }
  abilities = skills.values;
  abilitiesRevision = skills.revision;
  renderSkills();
  ready = true;
  busy = false;
  selectEntity(
    hives.find((object) => object.userData.entity.id === "awakening") ??
      entities[0],
  );
  $("loading").hidden = true;
  status("本地项目已打开");
  refreshButtons();
  editor.signals.windowResize.dispatch();
} catch (error) {
  $("loading").querySelector("strong").textContent = "项目未能打开";
  $("loading").querySelector("p").textContent = error.message;
  status(error.message, true);
  console.error(error);
}
