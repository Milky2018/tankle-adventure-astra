import { ObjectLoader, Vector3 } from "three";
import { editableCollections, entityKey } from "./entity-data.js";
import { cloneEntity, creationPosition, entityBundle } from "./entity-model.js";
import { EntityPresenceCommand } from "./entity-commands.js";
import { element } from "./fields.js";

export async function entityTools(
  editor,
  { selection, floor, changed, status },
) {
  const responses = await Promise.all([
    fetch("/api/templates"),
    fetch("/api/template-definitions"),
  ]);
  for (const response of responses)
    if (!response.ok) throw new Error("无法读取对象模板库");
  const palette = await new ObjectLoader().parseAsync(
    await responses[0].json(),
  );
  const definitions = await responses[1].json();
  const dialog = document.createElement("dialog");
  dialog.id = "entity-dialog";
  document.body.append(dialog);
  const validSelection = () =>
    editableCollections.has(selection()?.userData.entity?.collection);
  function idFor(base) {
    const existing = new Set(
      editor.scene.children.map((object) => object.userData.entity?.id),
    );
    let id;
    do {
      id = `${base.slice(0, 86)}-${crypto.randomUUID().slice(0, 8)}`;
    } while (existing.has(id));
    return id;
  }
  function show(title) {
    dialog.replaceChildren(element("h2", title));
    dialog.showModal();
  }
  function buttons(action, label = "确定") {
    const row = element("div", undefined, "dialog-actions");
    const cancel = element("button", "取消");
    cancel.onclick = () => dialog.close();
    const submit = element("button", label, "primary");
    submit.onclick = () => {
      try {
        action();
        dialog.close();
      } catch (error) {
        status(error.message, true);
      }
    };
    row.append(cancel, submit);
    dialog.append(row);
  }
  function add() {
    show("添加关卡对象");
    const category = document.createElement("select");
    category.setAttribute("aria-label", "新增对象类型");
    for (const [value, label] of [
      ["enemies", "敌人"],
      ["controls", "机关"],
      ["pickups", "拾取物"],
    ]) {
      const option = element("option", label);
      option.value = value;
      category.append(option);
    }
    const current = selection();
    if (validSelection()) category.value = current.userData.entity.collection;
    const template = document.createElement("select");
    template.setAttribute("aria-label", "对象模板");
    const update = () => {
      template.replaceChildren();
      for (const definition of definitions.filter(
        (d) => d.collection === category.value,
      )) {
        const option = element("option", definition.label);
        option.value = definition.id;
        template.append(option);
      }
    };
    category.onchange = update;
    update();
    const fields = element("div", undefined, "axes");
    const inputs = {};
    const center = current?.position ?? editor.controls.center;
    for (const [key, label, value] of [
      ["x", "X", center.x + 3],
      ["y", "地面 Y", floor() ?? 0],
      ["z", "Z", center.z],
    ]) {
      const wrapper = element("label", label),
        input = document.createElement("input");
      input.type = "number";
      input.step = "0.1";
      input.value = value;
      input.setAttribute("aria-label", `新增.${key}`);
      inputs[key] = input;
      wrapper.append(input);
      fields.append(wrapper);
    }
    dialog.append(
      element(
        "p",
        "从独立模板库添加，位置使用地面坐标。添加后可在属性面板调整数值和触发信号。",
        "hint",
      ),
      category,
      template,
      fields,
    );
    buttons(() => {
      const definition = definitions.find((d) => d.id === template.value);
      const source = palette.children.find(
        (object) =>
          object.userData.entity?.collection === definition.collection &&
          object.userData.entity.id === definition.source,
      );
      const values = Object.values(inputs).map((input) => input.valueAsNumber);
      if (!values.every(Number.isFinite))
        throw new Error("请输入有效的位置坐标");
      const position = creationPosition(source, ...values);
      const bundle = cloneEntity(
        palette,
        source,
        idFor(definition.id),
        position,
        definition.defaults,
      );
      editor.execute(new EntityPresenceCommand(editor, bundle, true, changed));
    }, "添加到关卡");
  }
  function duplicate() {
    if (!validSelection()) return;
    const source = selection();
    const bundle = cloneEntity(
      editor.scene,
      source,
      idFor(source.userData.entity.id.replace(/-[a-f0-9]{8}$/, "") + "-copy"),
      source.position.clone().add(new Vector3(3, 0, 0)),
    );
    editor.execute(new EntityPresenceCommand(editor, bundle, true, changed));
    status("已复制，保留原对象的前置条件和触发信号，可在右侧修改");
  }
  function remove() {
    if (!validSelection()) return;
    const root = selection(),
      identity = root.userData.entity;
    show(`删除 ${identity.id}`);
    const refs = new Set(
      editor.scene.userData.tankle.references?.[entityKey(identity)] ?? [],
    );
    for (const object of editor.scene.children) {
      if (object === root || !object.userData.entity) continue;
      const game = object.userData.game ?? {};
      if (
        Object.values(game).some(
          (value) =>
            value === identity.id ||
            (Array.isArray(value) && value.includes(identity.id)),
        )
      )
        refs.add(
          `${object.userData.entity.collection}: ${object.userData.entity.id}`,
        );
    }
    dialog.append(
      element(
        "p",
        "删除模型、攻击特效和关卡记录。可以撤销；保存后才写入项目。",
        "hint",
      ),
    );
    if (refs.size) {
      dialog.append(
        element(
          "p",
          "以下配置或脚本引用了这个标识。删除不会自动解除条件或重写剧情；请让其他机关接管所需信号，或调整相关条件。",
          "warning",
        ),
      );
      const list = element("ul");
      for (const ref of refs) list.append(element("li", ref));
      dialog.append(list);
    }
    buttons(
      () =>
        editor.execute(
          new EntityPresenceCommand(
            editor,
            { root, objects: entityBundle(editor.scene, root) },
            false,
            changed,
          ),
        ),
      "删除对象",
    );
  }
  document.getElementById("add-entity").onclick = add;
  document.getElementById("copy-entity").onclick = duplicate;
  document.getElementById("delete-entity").onclick = remove;
  return {
    refresh(busy) {
      document.getElementById("add-entity").disabled = busy;
      document.getElementById("copy-entity").disabled =
        busy || !validSelection();
      document.getElementById("delete-entity").disabled =
        busy || !validSelection();
    },
  };
}
