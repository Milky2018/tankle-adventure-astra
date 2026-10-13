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
- `public/art/`: offline scene resources from v2. Vertex buffers are binary; the browser does not construct the city through v2 code.
- `scripts/authored-world.mjs`: exports immutable level definitions. It does not translate runtime code and is not part of building or running the game.

The published MoonBit binding module is named `mizchi/three`, not `mizchi/threejs`.

## Checks

```sh
moon check --target js --deny-warn
moon test simulation --target js
moon info --target js
moon fmt
npm run build
```

Browser input checks are in `tests/browser/`. They use keyboard and mouse events. The `?test` query enables read-only diagnostics; no simulation stepping, teleportation or ability-grant API is exposed.

## Art refresh

Run `scripts/export-art.mjs` through Playwright against v2's manual development scene, then run `node scripts/pack-art.mjs` and `moon fmt`. Packing also refreshes the typed conveyor segment dimensions. The raw JSON is an ignored intermediate. Compressed scene metadata and binary buffers are the shipped assets. Audio, styles and geometry preserve the original game's authored presentation. Normal builds are independent of v2.

## Verified behavior

The clean JS check and production build pass; the simulation suite contains 24 passing tests. The tests cover collision, heat, incoming damage, enemy armor, weapon selection, laser reflections, magnetic locks, moving lifts, delayed circuits, rail and gutter puzzles, save restoration, death and ending docking.

Browser acceptance uses a fresh save and real keyboard/mouse input: both opening relays, the Prototype fight, Overdrive acquisition, the reverse conveyor, the local shortcut and a return to the repair hive (10 to 25 hull). Third-person movement and firing, rebinding, pause, map layer selection and camera settings were also exercised. This is an opening-loop acceptance run, not a claim that every later encounter has been played through.

Run `typed-opening-check.js`, `typed-first-boss-check.js` and `typed-return-check.js` in order through `playwright-cli run-code`; they deliberately replace the save in the test browser profile. Run `interface-check.js` after that route. Diagnostics and screenshots are written under ignored `output/playwright/`. Close the test browser after use.

At 1280 × 720 on this machine, the development reload sample had a 489 ms first frame and 17.6 ms p95 frame interval (v2 comparison: 17.4 ms p95). A fresh Chrome profile running the production build took 3.28 s to its first frame; its input sample had 18.3 ms p95 and one 158 ms interval. These are short local samples, not a full-world performance guarantee. Cold startup and occasional stalls remain optimization targets.
