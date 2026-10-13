# Tankle Adventure — Astra

A hand-written MoonBit implementation of the connected city in `../Gamespec.md`.

## Run

```sh
moon update
npm ci
npm run dev
```

Open http://127.0.0.1:5175/. `npm run build` produces `dist/`; `npm run preview` serves that build. Rebuild MoonBit and reload the page after changing `.mbt` files.

## Structure

- `simulation/`: typed player, enemies, weapons, collision, machinery, progression and save state. No JavaScript values or dynamic property dispatch.
- `renderer/`: Three.js scene views, camera, picking and effects, using `mizchi/three@0.1.3`.
- `cmd/play/`: browser session and interface policy in MoonBit.
- `host/` and `browser/host.js`: browser, asset loading and WebGL I/O.
- `content/levels/city/`: editable JSON definitions for floors, collision, enemies, controls, circuits, lifts, pickups and repair hives.
- `content/abilities.json`: weapon damage, heat, range and movement parameters. `content/sounds.json` contains sound synthesis parameters.
- `content/art/`: packed Three.js scene resources. Use the official editor workflow below to edit them.
- `scripts/build-content.mjs`: compiles content into typed MoonBit constants and copies scene assets to `public/generated/`. Generated `.mbt` files and asset copies are ignored build outputs.

The published MoonBit binding module is named `mizchi/three`, not `mizchi/threejs`.

## Checks

```sh
npm run check
moon info --target js
moon fmt
```

`npm run check` validates content, checks MoonBit without warnings, runs content and simulation tests, and builds the production game. After editing JSON, run `npm run build:content` before invoking `moon` directly. The normal `npm run dev`, `build` and `test` commands do this automatically. All builds are independent of v2.

Browser input checks are in `tests/browser/`. They use keyboard and mouse events. The `?test` query enables read-only diagnostics; no simulation stepping, teleportation or ability-grant API is exposed.

## Editing content

See [the authoring guide](docs/authoring.md) for the official Three.js editor workflow, the data model, runtime ownership and current limits. For a small editable example:

```sh
npm run scene:export -- output/editor/prototype.json --entity enemies:prototype
```

Open that project with **File → Open** in <https://threejs.org/editor/>, edit its objects, and use **File → Save**. Then import the saved project:

```sh
npm run scene:import -- /path/to/project.json --check
npm run scene:import -- /path/to/project.json
npm run build
```

The round-trip format is the editor's native **project JSON**. glTF/GLB is useful for exchanging model geometry and materials; it is not this game's level, collision, progression or skill format. Runtime behavior stays in normal MoonBit types and functions.

## Verified behavior

The simulation suite covers collision, heat, incoming damage, enemy armor, weapon selection, laser reflections, magnetic locks, moving lifts, delayed circuits, rail and gutter puzzles, save restoration, death and ending docking. Content tests cover editor round trips, stable identities, collision changes and invalid imports. A project saved by the live official editor was also imported and checked against both the gameplay catalog and packed scene.

Browser acceptance uses a fresh save and real keyboard/mouse input: both opening relays, the Prototype fight, Overdrive acquisition, the reverse conveyor, the local shortcut and a return to the repair hive (10 to 25 hull). Third-person movement and firing, rebinding, pause, map layer selection and camera settings were also exercised. This is an opening-loop acceptance run, not a claim that every later encounter has been played through.

Run `typed-opening-check.js`, `typed-first-boss-check.js` and `typed-return-check.js` in order through `playwright-cli run-code`; they deliberately replace the save in the test browser profile. Run `interface-check.js` after that route. Diagnostics and screenshots are written under ignored `output/playwright/`. Close the test browser after use.

Before the content-editor refactor, at 1280 × 720 on this machine, the development reload sample had a 489 ms first frame and 17.6 ms p95 frame interval (v2 comparison: 17.4 ms p95). A fresh Chrome profile running the production build took 3.28 s to its first frame; its input sample had 18.3 ms p95 and one 158 ms interval. These are historical local samples, not a full-world performance guarantee. Cold startup and occasional stalls remain optimization targets.
