# Furnace Born

A wordless tank Metroidvania with an interconnected mechanical city, third-person and overhead cameras, and eight weapons/abilities. [Gamespec.md](../Gamespec.md) owns game design. This directory owns implementation; no `v1` source or assets are used.

## Run

Use Node.js 22.13+ (22.x) or 24+ and install the locked dependencies:

```sh
cd v2
npm ci
npm run dev -- --port 5174
```

Open `http://127.0.0.1:5174/` for the journey menu. A web server is required; opening `index.html` as a local file does not work. Click the game to enable audio.

| Route | Purpose |
| --- | --- |
| `/?chapter=folded` | Current complete journey |
| `/?chapter=folded&route=foundry` | Independent opening preview |
| `/?chapter=folded&route=garden` | Independent Magnet/Flotation preview |
| `/?chapter=folded&route=freight` | Independent Mortar/Phoenix preview |
| `/?chapter=legacy` | Historical journey, with a separate save |

Previews use separate saves. Restarting a preview does not replace campaign progress. The menu groups earlier prototypes under historical versions.

```sh
npm run build
npm run preview
```

`dist/` can be served by any static web server. Assets, music and dependencies are served locally without runtime CDN requests.

## Controls and settings

| Input | Action |
| --- | --- |
| WASD | Camera-relative movement in third person; screen-relative movement overhead |
| Mouse | Turn and aim in third person; pointer aiming overhead |
| Left mouse | Cannon/Mortar; hold for Laser |
| Right mouse | Magnetic Traction after acquisition |
| Q | Cycle acquired weapons |
| F | Toggle Flotation after acquisition |
| Shift | Overdrive/Phoenix after acquisition |
| E | Repair, use nearby machinery, or hold at the final docking socket |
| C | Switch camera view |
| Tab | Map and discovered floors |
| Esc | Pause/settings and mouse release |

Settings include rebinding, music/SFX, quality, camera pitch, distance, height, shoulder offset and mouse sensitivity. Camera settings persist per view. If pointer capture is unavailable, hold the middle mouse button to turn while continuing to fire or use Magnet. Append `&view=third` or `&view=overhead` to choose a view directly.

## Checks

```sh
npm run check
```

This runs JavaScript syntax checks, undefined/unused-reference checks, formatting checks for the extracted modules, Node tests and the production build. `npm run format` formats that same maintained set; it does not rewrite all historical source files.

The `0.1.0` Git tag is the baseline before structural cleanup. `test-fixtures/balance-0.1.0.json` was generated from that tag and protects player values, ability values, enemy health and Boss patterns. Intentional gameplay changes must update the corresponding expectations explicitly.

For browser regression checks, keep the development server running on port 5174 and provide Playwright CLI:

```sh
# Either install playwright-cli on PATH or set this to your CLI/wrapper path.
export PLAYWRIGHT_CLI=/absolute/path/to/playwright_cli.sh
npm run test:browser
npm run test:browser -- full-journey
# With a production preview running separately on port 5176:
npm run test:browser -- production
```

For the settings extraction, `npm run test:browser -- ui settings-state camera-settings` checks the actual UI, occupied-key/mouse swaps, reset/cancel behaviour, audio/quality reload and paused camera preview.

The default suite covers crossfire, reflected Laser, map connections, save safety, side puzzles, automatic lifts, camera settings and mouse scheduling. Checks run sequentially in dedicated browser profiles and close those profiles after success or failure. Logs go to ignored `output/playwright/regression/`. The runner detects callback errors even when the CLI returns exit code zero.

The development-only `?test&manual` interface suspends automatic simulation before the first animation frame. `window.__game` provides input, scenario setup, snapshots and explicit stepping. Advanced checks use `__game.debug`; neither interface is included in production builds. Rendering/performance probes also use this interface and the development-only profiler; they no longer rewrite served source files.

Node and scripted browser checks establish rules, routes and controlled interactions. They do not establish first-time discovery quality, subjective balance, or a human playthrough duration.

## Code and investigation notes

See [architecture](docs/architecture.md) for module ownership, state lifetimes and historical code boundaries. [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md) records dated investigations and validation limits. Implementation and test details do not belong in `Gamespec.md`.

Enemy decisions run through `createFoldedEnemies` with an explicit visual adapter. Its attack, healing and arena-reset tests do not construct Three.js models.

## Sound-effect comparison

See [sound-effect auditions](scripts/SOUND_EFFECTS.md) to regenerate the old/new previews from the actual Web Audio implementations. The local audition page is served at `/output/audio/sfx-comparison/index.html`; its audio files remain in ignored output and are not shipped with the game.

Optional discovery, equipment persistence, real upgraded weapon hits and both-view Mortar landing checks:

```bash
npm run test:browser -- exploration secret-trials secret-optics secret-access secret-cover upgrade-balance backdrop save-safety
```

`secret-trials` compares the old Mortar orbit with a mixed-weapon response to the optional stores fight, then checks both-view reflected cabinet release, the Mortar annex, denied premature pickups, save/reload and input-driven detours. `secret-optics` surveys direct collector approaches and off-centre reflection. `secret-access` exercises Flotation, Phoenix and Magnet access; `secret-cover` checks physical canopy protection and its open firing lane. `backdrop` captures seven views, checks bounded draw overhead and repeated camera-switch resources. `upgrade-balance` compares ordinary/full equipment using controlled Keeper arena entries and identical input policies, with a 20–40-second mobile-Laser target; it is not a full-collection journey or a blind-player difficulty test. The warning-specific audition is `/output/audio/warning-comparison/index.html`; see the sound-effect notes for its snapshot baseline.
