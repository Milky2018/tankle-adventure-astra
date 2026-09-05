# Furnace Born

A playable, wordless, isometric tank Metroidvania built independently from the root `GAME_DESIGN.md`. All implementation lives in `v2`. No `v1` source or assets were used.

The game uses Three.js, procedural rounded industrial models, stepped lighting, real ground-plane collisions, and a synthesized mechanical soundtrack. There are no remote models, textures, fonts, audio files, or runtime CDN requests.

## Run

Requires a recent Node.js release supported by Vite 7 (Node 22.12+ recommended).

```sh
cd v2
npm install
npm run dev
```

Open the local URL printed by Vite. Click the game or press a control to enable browser audio. The game starts with a short awakening sequence. Use the upper-left gear to pause and configure controls, sound, quality, or fullscreen. Losing window focus pauses the game.

```sh
npm run build
npm run preview
```

The production output is `dist/`; it can be served by any static web server. A web server is required; opening `index.html` directly with `file://` does not work.

## Controls

| Input | Action |
| --- | --- |
| W / A / S / D | Screen-relative movement |
| Mouse | Independent turret aim |
| Left click | One cannon shot; holding does not autofire |
| Shift, after acquisition | Hold Overdrive while moving |
| E, near a Repair Hive | Repair, rest, and save |
| Tab | Toggle the progressively revealed region map |
| Space | Skip the death sequence |
| Escape | Pause / settings |

Every action, including fire and pause, can be rebound to keyboard or mouse buttons. Assigning an already-used input swaps the two actions, preserving access to both. Settings and checkpoint progress are saved in local storage under `furnace-born-v2-*` keys.

## Playable loop

The entrance conveyor defeats ordinary movement. A maintenance detour leads through a forward conveyor into the assembly courtyard. Its two branches loop around machinery; the east branch has an elevated firing gallery, ramps, and a ground-level underpass. Each branch contains a destructible relay. Both relays power the Elite barrier.

The Overdrive Prototype telegraphs a straight charge, collides with cover, and vents through its exposed rear radiator. Three successful damage windows defeat it and transfer its module. The acquired engine enables ramming, the return across the B–C conveyor, and the original entrance gate.

The Furnace Overseer combines slow heavy shells, fans, conveyors, and molten channels. Its outward-facing cooling assemblies open alternately and retract after two hits. Destroying each assembly stops its conveyor. The exposed central core ends the encounter; the third Repair Hive opens the exterior light and completes the level.

The game contains six ordinary enemies, one Elite, one Boss, and exactly three Repair Hives. Ordinary enemies respawn on resting or death; destroyed relays and defeated special encounters persist. There are no field healing items, collectibles, weapon slots, or objective arrows.

## Implementation

- `src/mechanics.js`: independently testable heat, movement, damage, and projectile collision rules.
- `src/world.js`: procedural models, geometry, floor topology, conveyors, machinery, ramps, and hives. Immutable geometry is batched by material.
- `src/main.js`: fixed-step simulation, collision, encounter state machines, save/load, maps, controls, and presentation.
- `src/audio.js`: gesture-activated Web Audio engine, mechanical percussion, melodic layers, and positional effects.
- `src/style.css`: graphical HUD and system menus.

The camera never rotates or zooms in gameplay. Movement uses the same fixed camera basis in every area. Heat is shared by the cannon and Overdrive, including the deceleration tail. Direct-hit protection does not suppress furnace damage. Furnace channels retain physical movement and never teleport or reset the tank.

## Verification

```sh
npm test
npm run build
```

Ten Node tests cover shot cadence, the fifth-shot overheat threshold, cooling delay and lockout, Overdrive acceleration/deceleration, stationary input, normalized screen movement, conveyor equilibrium, damage protection, swept projectile collisions, and wheel-axis stability and rolling direction through hull turns.

The Playwright CLI scenario scripts run against `http://127.0.0.1:5174/?test`, in this order:

```sh
npm run dev -- --port 5174
playwright-cli -s=furnace-v2 open 'http://127.0.0.1:5174/?test'
playwright-cli -s=furnace-v2 run-code "$(cat scripts/browser-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/combat-check.js)"
```

The 25 browser scenario checks exercise both conveyor gates, ordinary combat, both relays, barrier collision, repair and enemy reset, physical furnace damage, the underpass, death/respawn, Elite vulnerability and acquisition, Boss assembly/core damage, the exit gate, and completion. Scenarios place the tank and configure encounter windows for deterministic checks, then exercise the actual simulation and projectiles. They clear the test browser's game save; use a dedicated browser session. The inspection surface is gated by both development mode and `?test`, and is absent from production builds.

Real browser keyboard movement, map toggling, key rebinding, and settings persistence were also checked. Screenshots from the local verification session are in the ignored `output/playwright/` directory.

This is a first playable balance pass. A clean, uninterrupted human playthrough near the design's ten-minute target has not been measured. Automated checks establish mechanics and progression, not first-time discovery quality or subjective audio balance.
