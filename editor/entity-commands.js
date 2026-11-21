import { Command } from "/upstream/js/Command.js";
import { entityKey } from "./entity-data.js";

// A model and its detached effects form one undoable operation.
export class EntityPresenceCommand extends Command {
  constructor(editor, bundle, present, changed) {
    super(editor);
    this.type = "EntityPresenceCommand";
    this.name = present ? "添加对象" : "删除对象";
    this.bundle = bundle;
    this.present = present;
    this.changed = changed;
    this.indices = bundle.objects.map((object) =>
      editor.scene.children.indexOf(object),
    );
  }
  apply(present) {
    const { editor, bundle } = this;
    const metadata = editor.scene.userData.tankle;
    const entity = bundle.root.userData.entity;
    metadata.deleted = (metadata.deleted ?? []).filter(
      (value) => entityKey(value) !== entityKey(entity),
    );
    if (!present) metadata.deleted.push(structuredClone(entity));
    editor.signals.sceneGraphChanged.active = false;
    try {
      bundle.objects.forEach((object, index) => {
        if (present)
          editor.addObject(
            object,
            editor.scene,
            this.indices[index] < 0 ? undefined : this.indices[index],
          );
        else editor.removeObject(object);
      });
    } finally {
      editor.signals.sceneGraphChanged.active = true;
    }
    editor.signals.sceneGraphChanged.dispatch();
    this.changed(present ? bundle.root : null);
  }
  execute() {
    this.apply(this.present);
  }
  undo() {
    this.apply(!this.present);
  }
}
