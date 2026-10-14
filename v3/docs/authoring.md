# Maintaining and editing v3

The game has three independent concerns: authored content, gameplay simulation and presentation. Change the content files or use the editor for placement and art. Change MoonBit functions for behavior. Do not edit `*.generated.mbt`, `_build/`, `dist/` or `public/generated/`.

## Local project editor

Run `npm run editor` in v3, then open <http://127.0.0.1:5176/>. Keep this server running while editing. The initial setup caches verified upstream r185 editor source and its MIT license in `.editor/three-r185/`; the viewport uses the project's installed Three.js 0.185.1. No external editor website is needed after setup.

1. Use **快速定位** to choose a checkpoint region, or search by object ID, name, type or encounter. Search spans floors; without search, the list follows **编辑楼层**. Categories include enemies, controls, barriers, pickups, checkpoints, lifts, mirrors, player art and collision volumes.
2. Click an object to select it, switch to its floor and focus the camera. Left-drag rotates, right-drag pans, and the wheel zooms. **定位 F** returns to the selection; **区域俯视** gives a top view.
3. Edit the position or gameplay fields on the right. Select a model part under **编辑目标** to edit its transform or color. Changes use the official editor's undo/redo commands. Color edits clone shared materials so other objects retain their colors.
4. For collision work, select a collision category and enable **显示当前楼层碰撞框**. Move or resize the selected box. Art and collision remain separate; update both for passage changes.
5. **技能数值** edits `content/abilities.json` through numeric forms. These forms save separately from scene data and do not share the scene undo stack.
6. **保存到项目** validates and writes authored content directly. **保存并试玩** then rebuilds the game and opens/reuses a preview tab. Close the preview tab after testing to release the running game. A save retains scene undo history; reloading discards that history. Unsaved edits trigger the browser's leave-page prompt.

Floor clipping, the editor background and collision visibility are view preferences, not saved game content. A revision check rejects stale scene/skill saves from another tab or an external file edit. On conflict, keep the current tab open while reconciling changes; do not blindly reload unsaved work. Scene and skill saves are independent: if one fails, the status reports the error and the remaining unsaved edits stay in memory.

The local interface supports adding, copying and deleting enemies, controls and pickups, as well as editing existing gameplay objects and character parts. Use the official website workflow below for model import, detailed material/geometry editing and decorative additions. Other gameplay object types, circuit route definitions and bespoke puzzle behavior still require their source files. The player model's root position is an art preview; spawn position comes from checkpoint data. Runtime-controlled pivots may overwrite authored transforms, so adjust their mesh children.

The local implementation is deliberately small: `editor/app.js` connects selection, view filtering and official commands; `editor/fields.js` builds property forms; `scripts/editor-server.mjs` serves pinned modules, validates content saves and runs the normal game build. Upstream editor source is cached unchanged rather than maintained as a fork. The editor renders on changes and does not expose path tracing. Large scene JSON operations run one at a time in `scripts/editor-scene-worker.mjs`; the process exits after each load/save so the service does not retain the unpacked scene heap.

## Adding, copying and deleting gameplay objects

- **添加** opens a template picker for enemies, controls and pickups. Choose an archetype and enter X, ground Y and Z. The editor creates a stable ID, model roles and detached attack effects together. Templates are independent of placed city instances, so deleting an instance does not remove its template.
- **复制** copies the selected entity three units along X. Geometry and animated materials are independent. Copying preserves prerequisites, encounter associations and output signals; inspect these fields before saving. A copied control can therefore operate the same gate as its source. Copying a boss or puzzle object does not duplicate MoonBit behavior keyed to the original ID.
- **删除** removes the selected entity and its detached effects. The confirmation lists references from content and MoonBit scripts. It does not automatically unlock gates or rewrite story conditions. Circuit definitions remain available so another control can emit the same signal. Adjust affected prerequisites or signals before saving an intentional progression change.
- These operations each form one undo step, including after saving. **撤销** and **重做** restore the complete entity. Reloading starts a new undo history.

For a new control, the **触发信号** (`effects`) field lists emitted signals, one per line. It starts with the new control ID. To operate an existing gate, use that gate's prerequisite signal. The **前置条件** (`requires`) field is optional; clear it to remove the prerequisite. These fields are regular forms, with no JSON editing required. Fresh pickup templates have no story prerequisite; upgrade effects and save restoration use their acquisition type rather than a fixed original ID.

`editor/entity-model.js` owns complete entity copying, `entity-commands.js` provides undoable presence changes, and `entity-tools.js` owns the dialogs. `content/editor/templates.json` contains template labels and gameplay defaults; `templates.scene.json.gz` stores the independent model palette. Normal builds never regenerate this palette from the level. Maintainers can explicitly refresh it with `npm run editor:templates` after changing source art; every configured source must still exist when refreshing. This maintenance command is not needed to place or copy objects.

## Where to make a change

| Change | Source |
| --- | --- |
| Scene meshes, materials, lights, model children | Three.js editor project exported from `content/art/` |
| Floors, walls, collision boxes | `content/levels/city/{decks,barriers,architecture,obstacles}.json` |
| Enemy spawns, health, archetypes, patrol regions | `content/levels/city/enemies.json` |
| Switch actions, prerequisites and circuit timing | `content/levels/city/{controls,circuits}.json` |
| Lifts, conveyors, currents and hot floors | `content/levels/city/{lifts,belts,currents,heat}.json` |
| Skill pickups, upgrades and checkpoints | `content/levels/city/{pickups,hives}.json` |
| Cannon, mortar, laser, magnet and drive parameters | `content/abilities.json` |
| Weapon and skill behavior | `simulation/{player,projectiles,abilities}.mbt` |
| Enemy decisions and boss patterns | `simulation/{enemy-ai,boss-ai,boss-patterns}.mbt` |
| Bespoke puzzles and progression behavior | `simulation/{puzzles,slides,encounters,progression}.mbt` |
| Animation, camera, effects and scene queries | `renderer/` |
| HUD, input mapping, menus, saves and sound playback | `cmd/play/` |
| Sound synthesis parameters and music assets | `content/sounds.json`, `public/music/` |

Coordinates use Three.js units, with Y up. Rectangles use minimum X/Z plus width/depth; they are not centered transforms. A deck's Y is its supporting surface. An enemy's Y is its ground height. Control definitions use their interaction height. The exporter preserves these offsets when an editor root moves.

Skill times are seconds, movement/projectile speeds are units per second, ranges are world units, and heat uses the player's 0–100 scale. `drive.overdrive` and `drive.phoenix` are speed multipliers. Laser damage and continuous heat values are per second. Mortar `arc` is the height term of its trajectory. These parameters cover the primary abilities; encounter-specific and environmental constants remain near their MoonBit behavior.

## Editing a character or existing gameplay object

Install dependencies using the README's run instructions, then export from the v3 directory:

```sh
npm run scene:export -- --list
npm run scene:export -- output/editor/prototype.json --entity enemies:prototype
npm run scene:export -- output/editor/player.json --entity player
npm run scene:export -- output/editor/checkpoint.json --entity hives:awakening
```

Open <https://threejs.org/editor/> and choose **File → Open**. Use the exported project JSON, not the compressed source files. Select the object in the outliner. The editor's position fields and move gizmo change placement. Child meshes, geometry and materials can be edited normally. Small exports include preview lights that the importer discards.

For a gameplay root, **Properties → User data → `game`** contains editable definition fields, such as `hp`, `type`, `requires` or `weapons`. Keep the surrounding `entity`, `binding` and `placement` metadata intact. Display names may be changed freely. The editor exposes user data as JSON, not a custom game inspector.

Choose **File → Save** to download the complete project. The object's separate “Export JSON” button does not export the complete round-trip project.

```sh
npm run scene:import -- /path/to/project.json --check
npm run scene:import -- /path/to/project.json
npm run check
```

Import updates both scene resources and gameplay definitions, then repacks the resources. Start or rebuild the game to see the result. The `--check` form validates without writing. A revision stamp rejects stale exports after the source content changes; export a fresh project before the next editing session.

## Editing a level and its collision

```sh
# All art and existing gameplay objects
npm run scene:export -- output/editor/city.json

# The same scene with explicit, editor-only wireframe collision boxes
npm run scene:export -- output/editor/city-collision.json --colliders

# A small export containing a single floor collider
npm run scene:export -- output/editor/floor.json --entity decks:press-working-floor
```

The full city has roughly 13,500 scene nodes. Prefer an entity export for character work, and close large editor projects when finished. `--colliders` overlays decks, architecture and obstacles; these helper meshes never ship in the game. Select a helper to translate or resize its axis-aligned collision box. Duplicate deck IDs are distinguished by frozen catalog slots in a full collision export.

Art and collision are separate. Moving a decorative mesh does not move a wall or floor collider. Edit both when changing a passage. Sloped deck `rise`, conveyor segment layout, circuit routes and bespoke puzzle coordinates also require their corresponding definition or MoonBit changes. Circuit geometry is not automatically rerouted when a switch moves.

Existing enemies, hives, controls, pickups, mirrors, barriers and lifts carry gameplay metadata on their roots. Moving these roots updates their definition positions; enemy patrol/activation areas and lift stops translate with them. Player model placement is an art preview: the actual spawn comes from the first hive and saved checkpoint. Runtime animation controls role pivots, so author mesh offsets beneath those pivots.

Keep gameplay roots axis-aligned with their exported scale, and keep exported roots at the scene's top level. Rotate/scale child art instead. Collision boxes support positive, axis-aligned scaling. New decorative meshes and model imports are supported. Use the local editor controls below to add or remove enemies, controls and pickups: copying only their visible meshes on the official website does not create a complete gameplay entity.

## Stable identities and model roles

The renderer indexes `Object3D.userData.binding`, independently of the display name and catalog order. Examples include:

```text
player/root
player/body
player/turret
player/barrel
enemies/prototype/model/root
enemies/prototype/model/body
enemies/prototype/model/turret
world/controls/relay-west/root
world/hives/awakening/root
```

Keep these role objects when replacing art. Put a replacement GLB/model under the corresponding role and adjust its child transform; preserve additional bound parts used for animation. Removing bound roles or introducing duplicate bindings is rejected on import. Saved progress and circuits also refer to stable catalog IDs and `circuitKey` values: renaming them is a save/progression migration, not a cosmetic edit.

glTF/GLB is a model interchange format. Native editor project JSON retains Three.js objects and user data for this round trip. JavaScript editor scripts are rejected: gameplay logic belongs in the typed MoonBit simulation, not serialized JavaScript attached to objects. Imported skeletal animation is not automatically connected to the game's existing procedural animation.

## Runtime and build boundaries

`scripts/build-content.mjs` validates and compiles JSON definitions into concrete MoonBit records, and copies packed assets to the public build directory. It does not translate game code or execute v2. `simulation/Game` owns authoritative state and rules. `renderer/View` binds that state to scene roles. `cmd/play` handles browser interaction and the frame loop. `host` and `browser/host.js` contain the narrow JavaScript boundary for DOM, asset loading and WebGL operations.

The large scene is stored as compressed Three.js metadata and binary vertex buffers to keep loading and repository size manageable. The editor commands unpack and repack this representation; nobody should hand-edit it. Plain JSON gameplay catalogs remain diffable. Behavior remains readable MoonBit functions, with simulation tests independent of the browser.

Use `npm run build:content` after editing JSON if working directly with `moon check`, `moon test` or `moon ide`. `npm run dev`, `npm run build`, `npm test` and `npm run check` already generate content first. After source changes, run `moon info --target js && moon fmt`; review interface changes intentionally.

The standalone import/export workflow was exercised against the live official r186 editor; the local entry pins upstream r185 and Three.js 0.185.1. Re-run the round-trip and browser checks when upgrading either side. Browser checks under `tests/browser/` use real input and read-only diagnostics; they do not teleport the player or grant abilities.

Temporary editor projects, test screenshots and logs belong under ignored `output/`. Remove stale exports after importing, close test browsers, and keep only the preview server currently in use.
