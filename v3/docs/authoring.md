# Maintaining and editing v3

The game has three independent concerns: authored content, gameplay simulation and presentation. Change the content files or use the editor for placement and art. Change MoonBit functions for behavior. Do not edit `*.generated.mbt`, `_build/`, `dist/` or `public/generated/`.

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

Keep gameplay roots axis-aligned with their exported scale, and keep exported roots at the scene's top level. Rotate/scale child art instead. Collision boxes support positive, axis-aligned scaling. New decorative meshes and model imports are supported, but adding/removing gameplay entities requires catalog and role-binding work in addition to art. The importer currently handles edits to existing gameplay identities, not a visual spawn/prefab system.

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

The scene editor workflow was exercised against the live official r186 editor; the game pins Three.js 0.185.1. Re-run the round-trip and browser checks when upgrading either side. Browser checks under `tests/browser/` use real input and read-only diagnostics; they do not teleport the player or grant abilities.

Temporary editor projects, test screenshots and logs belong under ignored `output/`. Remove stale exports after importing, close test browsers, and keep only the preview server currently in use.
