# Tankle Adventure — Astra

A hand-written MoonBit implementation of the connected city in `../Gamespec.md`.

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

Run these commands from `v3/`. Moon fetches `moonbit-community/three@0.1.1` from Mooncakes during the build.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5175/. `npm run build` produces `dist/`; `npm run preview` serves that build. Rebuild MoonBit and reload the page after changing `.mbt` files.

To build the offline archive from this checkout, run `npm run build:offline` after `npm ci`. It uses the `zip` command and writes `output/builds/Tankle-v3-dist.zip` with the production game, launcher, and this README.

## Structure

- `simulation/`: typed player, enemies, weapons, collision, machinery, progression and save state. No JavaScript values or dynamic property dispatch.
- `renderer/`: scene views, cameras, picking, shader effects and WebGL rendering with three.mbt.
- `cmd/play/`: browser session and interface policy in MoonBit.
- `host/` and `browser/host.js`: browser I/O, packed buffer loading and three.mbt scene deserialization.
- `content/levels/city/`: editable JSON definitions for floors, collision, enemies, controls, circuits, lifts, pickups and repair hives.
- `content/abilities.json`: weapon damage, heat, range and movement parameters. `content/sounds.json` contains sound synthesis parameters.
- `content/art/`: packed Three.js scene resources. Use the official editor workflow below to edit them.
- `editor/` and `scripts/editor-server.mjs`: local authoring UI and loopback-only content/save/build service.
- `scripts/build-content.mjs`: compiles content into typed MoonBit constants and copies scene assets to `public/generated/`. Generated `.mbt` files and asset copies are ignored build outputs.

The browser session reads input and resolves the camera aim. `Game::advance_combat` advances weapons, enemies and projectiles in gameplay order. `View::present` consumes the resulting state for the frame. Enemy warnings carry the chosen attack, and interrupted actions retain their phase and remaining time. Target prediction operates on an observed position and velocity. When sight is lost, enemies can use a remembered position until it expires.

`arenas.json` binds each encounter to a placed boss, its music, optional rail cover and victory signals. Conveyor drive links in `belts.json` identify the machine and part that power the belt. The simulation and renderer use the same running velocity for movement and animation.

The game bundle uses the MoonBit renderer. The official scene editor and Node content tools use the npm `three` development dependency.

## Checks

```sh
npm run check
moon info . simulation host renderer cmd/play --target js
moon fmt . simulation host renderer cmd/play
```

`npm run check` validates content, checks MoonBit without warnings, runs content and simulation tests, and builds the production game. After editing JSON, run `npm run build:content` before invoking `moon` directly. The normal `npm run dev`, `build` and `test` commands do this automatically. All builds are independent of v2.

Browser input checks are in `tests/browser/`. They use keyboard and mouse events. The `?test` query enables read-only diagnostics; no simulation stepping, teleportation or ability-grant API is exposed.

## Editing content

Start the local project editor:

```sh
npm run editor
```

Open <http://127.0.0.1:5176/>. It uses the official Three.js editor viewport and undo commands, with project-specific navigation and forms. The first launch downloads and verifies about 2 MB of pinned upstream editor source into ignored `.editor/`; subsequent launches use that local cache.

- **关卡与角色**: search enemies, controls, pickups, checkpoints and player parts; select an object to focus its floor. Edit position and gameplay properties, or choose a model part to change its transform and color.
- **技能数值**: edit weapon and movement parameters in forms.
- **保存到项目**: write content directly to v3. **保存并试玩** also builds and opens the game in a reusable tab.

Use [the authoring guide](docs/authoring.md) for collision editing, runtime ownership, limits and the alternative official website import/export workflow. Native Three.js project JSON retains level metadata; glTF/GLB is only a model interchange format. Gameplay behavior stays in MoonBit.

## Verified behavior

The simulation suite covers collision, heat, incoming damage, enemy armor, weapon selection, laser reflections, magnetic locks, moving lifts, delayed circuits, rail and gutter puzzles, save restoration, death and ending docking. Content tests cover editor round trips, stable identities, collision changes and invalid imports. A project saved by the live official editor was also imported and checked against both the gameplay catalog and packed scene.

The local editor was exercised through search, floor focus, gizmo dragging, property changes, undo/redo, repeated saves, character part scale/color editing and save/build/play. The running game reflected edited enemy position/health and cannon heat. Test content was restored afterwards.

Browser acceptance uses a fresh save and real keyboard/mouse input: both opening relays, the Prototype fight, Overdrive acquisition, the reverse conveyor, the local shortcut and a return to the repair hive (10 to 25 hull). Third-person movement and firing, rebinding, pause, map layer selection and camera settings were also exercised. This is an opening-loop acceptance run, not a claim that every later encounter has been played through.

Run `typed-opening-check.js`, `typed-first-boss-check.js` and `typed-return-check.js` in order through `playwright-cli run-code`; they deliberately replace the save in the test browser profile. Run `interface-check.js` after that route. Diagnostics and screenshots are written under ignored `output/playwright/`. Close the test browser after use.

Before the content-editor refactor, at 1280 × 720 on this machine, the development reload sample had a 489 ms first frame and 17.6 ms p95 frame interval (v2 comparison: 17.4 ms p95). A fresh Chrome profile running the production build took 3.28 s to its first frame; its input sample had 18.3 ms p95 and one 158 ms interval. These are historical local samples, not a full-world performance guarantee. Cold startup and occasional stalls remain optimization targets.
