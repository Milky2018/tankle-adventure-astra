# Tankle Adventure — Astra

A hand-written MoonBit implementation of the connected city in [Gamespec.md](Gamespec.md).

## Play the offline build

Extract `Tankle-v3-dist.zip`. On the computer you will play on, install the MoonBit toolchain with `moonx` and run this once while online to cache the static file server:

```sh
moonx cli/serve@0.1.5 --help
```

From the extracted directory containing `dist/`, start the game server:

```sh
moonx cli/serve@0.1.5 --port 8000 dist
```

On macOS, double-clicking `Play.command` runs the same command. Keep the terminal open while playing. Open the [campaign](http://127.0.0.1:8000/) or [start at the circulation works](http://127.0.0.1:8000/?chapter=circulation&view=third). The circulation playtest starts fresh each time and keeps campaign saves separate. Press Ctrl+C in the terminal to stop the server.

## Run

Install the MoonBit toolchain and Node.js 22.18 or later. From the repository root:

```sh
moon run scripts/build.mbtx
moonx cli/serve@0.1.5 --port 5175 dist
```

Open http://127.0.0.1:5175/. The build prepares the authored city, audio and weapon definitions, compiles the browser game, and assembles `dist/`. Moon runs the JS-target content compiler on Node. Geometry processing uses three.mbt from Mooncakes. Rebuild and reload after edits. The city bake reuses its previous result when its inputs and compiler are unchanged.

For the distributable ZIP, run `moon run scripts/build.mbtx -- --offline`. The output is `output/builds/Tankle-v3-dist.zip` and includes the game, launcher and README.

## Structure

- `simulation/`: typed player, enemies, weapons, collision, machinery, progression and save state. No JavaScript values or dynamic property dispatch.
- `renderer/`: scene views, cameras, picking, shader effects and WebGL rendering with three.mbt.
- `cmd/play/`: browser session and interface policy in MoonBit.
- `scripts/build.mbtx`: builds content, compiles the game and assembles the static site or offline archive.
- `host/` and `browser/host.js`: browser I/O, packed buffer loading and three.mbt scene deserialization.
- `content/levels/city/`: editable JSON definitions for floors, collision, enemies, controls, circuits, lifts, pickups and repair hives.
- `scripts/tuning.mbtx`: validates weapon and drive parameters and generates their MoonBit records at build time. Run `moon run scripts/tuning.mbtx -- content/abilities.json` to check edits, or append `simulation/tuning.generated.mbt` to generate the records.
- `content/abilities.json`: weapon damage, heat, range and movement parameters. `content/sounds.json` contains sound synthesis parameters.
- `content/art/`: packed Three.js scene resources. Use the official editor workflow below to edit them.
- `editor/` and `scripts/editor-server.mjs`: local authoring UI and loopback-only content/save/build service.
- `cmd/content/`, `tooling/art/` and `scripts/content/`: compile level definitions and bake the city. Generated MoonBit files and packed assets in `public/generated/` are build outputs.

The browser session reads input and resolves the camera aim. `Game::advance_combat` advances weapons, enemies and projectiles in gameplay order. `View::present` consumes the resulting state for the frame. Enemy warnings carry the chosen attack, and interrupted actions retain their phase and remaining time. Target prediction operates on an observed position and velocity. When sight is lost, enemies can use a remembered position until it expires.

`arenas.json` binds each encounter to a placed boss, its music, optional rail cover and victory signals. Conveyor drive links in `belts.json` identify the machine and part that power the belt. The simulation and renderer use the same running velocity for movement and animation.

The game and city geometry compiler use three.mbt. The optional visual editor uses the pinned upstream Three.js editor and its browser modules.

## Checks

```sh
moon run cmd/content
moon check
moon test
moon run cmd/editor -- test
moon info . simulation host renderer cmd/play
moon fmt . simulation host renderer cmd/play
```

Run `moon run cmd/content` first on a fresh checkout or after editing content to prepare the generated files. The web build also runs this step.

Browser input checks are in `tests/browser/`. They use keyboard and mouse events. The `?test` query enables read-only diagnostics; no simulation stepping, teleportation or ability-grant API is exposed.

## Editing content

Start the local project editor:

```sh
moon run cmd/editor
```

Open <http://127.0.0.1:5176/>. It uses the official Three.js editor viewport and undo commands, with project-specific navigation and forms. The editor caches pinned upstream browser resources under `.editor/`. The first use of an editor extension may need network access. Game builds and offline archives are independent of these downloads.

- **关卡与角色**: search enemies, controls, pickups, checkpoints and player parts; select an object to focus its floor. Edit position and gameplay properties, or choose a model part to change its transform and color.
- **技能数值**: edit weapon and movement parameters in forms.
- **保存到项目**: write content directly to the project. **保存并试玩** also builds and opens the game in a reusable tab.

Use [the authoring guide](docs/authoring.md) for collision editing, runtime ownership, limits and the alternative official website import/export workflow. Native Three.js project JSON retains level metadata; glTF/GLB is only a model interchange format. Gameplay behavior stays in MoonBit.

## Verified behavior

The simulation suite covers collision, heat, incoming damage, enemy armor, weapon selection, laser reflections, magnetic locks, moving lifts, delayed circuits, rail and gutter puzzles, save restoration, death and ending docking. Content tests cover editor round trips, stable identities, collision changes and invalid imports. A project saved by the live official editor was also imported and checked against both the gameplay catalog and packed scene.

The local editor was exercised through search, floor focus, gizmo dragging, property changes, undo/redo, repeated saves, character part scale/color editing and save/build/play. The running game reflected edited enemy position/health and cannon heat. Test content was restored afterwards.

Browser acceptance uses a fresh save and real keyboard/mouse input: both opening relays, the Scrap Ram fight, Overdrive acquisition, the reverse conveyor, the local shortcut and a return to the repair hive (10 to 25 hull). Third-person movement and firing, rebinding, pause, map layer selection and camera settings were also exercised. This is an opening-loop acceptance run, not a claim that every later encounter has been played through.

For optional Playwright walkthroughs, run `typed-opening-check.js`, `typed-first-boss-check.js` and `typed-return-check.js` in order through `playwright-cli run-code`; they deliberately replace the save in the test browser profile. Run `interface-check.js` after that route. Diagnostics and screenshots are written under ignored `output/playwright/`. Close the test browser after use.

Before the content-editor refactor, at 1280 × 720 on this machine, the development reload sample had a 489 ms first frame and 17.6 ms p95 frame interval. A fresh Chrome profile running the production build took 3.28 s to its first frame; its input sample had 18.3 ms p95 and one 158 ms interval. These are historical local samples, not a full-world performance guarantee. Cold startup and occasional stalls remain optimization targets.
