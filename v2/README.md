# Furnace Born

A playable, wordless, isometric tank Metroidvania built from the interconnected world design in [Gamespec.md](../Gamespec.md), the single source for all game-design decisions and proposals. All implementation lives in `v2`. No `v1` source or assets were used.

The game uses Three.js, procedural rounded industrial models, stepped lighting, real ground-plane collisions, and a synthesized mechanical soundtrack. There are no remote models, textures, fonts, audio files, or runtime CDN requests.

## Run

Requires a recent Node.js release supported by Vite 7 (Node 22.12+ recommended).

```sh
cd v2
npm install
npm run dev
```

Open the local URL printed by Vite. Continue north after the Foundry to enter R2, or use **试玩第二关 · 独立存档** in settings (equivalent to `/?chapter=2`) to begin at the new arrival Hive with Overdrive. The preview has a separate local save and does not replace the full-journey save. Click the game or press a control to enable browser audio. The game starts with a short awakening sequence. Use the upper-left gear to pause and configure controls, sound, quality, or fullscreen. Losing window focus pauses the game.

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
| Left click | One shot with the selected weapon; holding does not autofire |
| Q, after Mortar acquisition | Switch Cannon / Mortar |
| Right mouse, after magnetic acquisition | Hold to pull the aimed rail or light enemy |
| Shift, after acquisition | Hold Overdrive while moving |
| E, near a Hive, module, or lever | Repair and save, acquire a tool, or operate the mechanism |
| Tab | Toggle the progressively revealed region map |
| Space | Skip the death sequence |
| Escape | Pause / settings |

Every action, including fire and pause, can be rebound to keyboard or mouse buttons. Assigning an already-used input swaps the two actions, preserving access to both. Settings and checkpoint progress are saved in local storage under `furnace-born-v2-*` keys.

## Playable loop

The entrance conveyor defeats ordinary movement. A maintenance detour leads through a forward conveyor into the assembly courtyard. Its two branches loop around machinery; the east branch has an elevated firing gallery, ramps, and a ground-level underpass. Each branch contains a destructible relay. Both relays power the Elite barrier.

The Overdrive Prototype telegraphs a straight charge, collides with cover, and vents through its exposed rear radiator. It has 9 HP and no per-window damage cap; defeating it transfers its module. The acquired engine enables ramming, the return across the B–C conveyor, and the original entrance gate.

The Furnace Overseer combines slow heavy shells, fans, conveyors, and molten channels. Its outward-facing cooling assemblies open alternately for a timed window with no hit quota. Destroying each assembly stops its conveyor. The exposed central core ends the encounter; the third Repair Hive opens the exterior door and continues into the Empty Transit Hub without pausing the game.

The Foundry contains six ordinary enemies, one Elite, one Boss, and three Repair Hives. The connected Empty Transit Hub adds 28 floor sections, 24 enemies in 11 local encounters, five Hives, Magnetic Traction, and an optional early Mortar acquisition. The Furnace Guard distinguishes reduced frontal damage with a brief armour flash, outward white sparks, and a metallic ricochet; side/rear hits keep the normal orange damage burst and impact sound. Ordinary enemies respawn on resting or death; destroyed relays and defeated special encounters persist. There are no field healing items, collectible currencies, or objective arrows. Q switches the two owned weapons; right mouse holds Magnetic Traction.

## Art and sound

Enemies are repurposed factory tools: a reclaiming clamp, a welding turret, a refractory shield carrier, a pressing prototype, and a mobile crucible. Jaws, welding hoods, radiator lids, and the Boss core doors communicate their attack and recovery states. Charge warnings cover the entire swept body, including endpoint caps.

Warm inspection decks, brown scrap sorting machinery, and cool gallery pipes distinguish the routes. Discarded hulls pass through an operating reclamation press beside the entrance; scanning and articulated Hive repair tools express rejection and repair without dialogue. Muted enamel, warm/cool lighting, and contact shadows support the existing rounded industrial style. Sparse exploration music leaves space for distinct mechanical attack sounds and the speed-sensitive player engine.

## Implementation

- `src/mechanics.js`: independently testable heat, movement, damage, and projectile collision rules.
- `src/world.js`: procedural models, geometry, floor topology, conveyors, machinery, ramps, and hives. Immutable geometry is batched by material.
- `src/transit-layout.js`: second-region room and encounter placement.
- `src/transit.js`: rail mechanisms, persistent gates, tool cradles, loading receivers, and regional scenery.
- `src/combat-props.js`: breakable cargo, delayed pressure-vessel explosions, and encounter cover reset.
- `src/abilities.js`: bounded Mortar targeting and arc trajectory.
- `src/main.js`: fixed-step simulation, collision, encounter state machines, save/load, maps, controls, and presentation.
- `src/audio.js`: gesture-activated Web Audio engine, mechanical percussion, melodic layers, and positional effects.
- `src/style.css`: graphical HUD and system menus.

A single mouse-following reticle carries a clockwise Heat ring; there is no separate ground-target marker or Heat bar beside HP. The camera never rotates or zooms in gameplay. Movement uses the same fixed camera basis in every area. Heat is shared by the cannon, Mortar, Magnetic Traction, and Overdrive, including the deceleration tail. Overdrive reaches 1.6x speed in 0.5 seconds and adds 15 Heat per second; release deceleration remains 0.35 seconds. The engine sounds while driving, becomes louder and higher-pitched through acceleration, and fades out on stopping; pause, death, and the sound-effects setting mute it. The A and B–C conveyor surfaces are 3 and 2.4 world units long, respectively. The player uses a smaller 0.8-unit combat hurtbox; enemies and Boss weak points have 15 percent larger damage-detection radii, independently of solid-body collision. Direct-hit protection does not suppress furnace damage. Furnace channels retain physical movement and never teleport or reset the tank.

## Verification

```sh
npm test
npm run build
```

Twenty-one Node tests cover shot cadence, the fifth-shot overheat threshold, cooling delay and lockout, Overdrive acceleration/deceleration, stationary input, normalized screen movement, conveyor equilibrium, damage protection, swept projectile collisions, wheel-axis stability and rolling direction through hull turns, charge telegraph coverage of the full swept body, and construction/animation of the factory enemy forms, Mortar targeting and cooldown, regional area, both initial acquisition routes, gated boundaries, counterweight persistence, and the independent optical route.

The Playwright CLI scenario scripts run against `http://127.0.0.1:5174/?test`, in this order:

```sh
npm run dev -- --port 5174
playwright-cli -s=furnace-v2 open 'http://127.0.0.1:5174/?test'
playwright-cli -s=furnace-v2 run-code "$(cat scripts/browser-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/polish-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/combat-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/transit-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/transit-walk-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/transit-ui-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/encounter-check.js)"
```

The 33 Foundry browser scenario checks exercise both conveyor gates, ordinary combat, both relays, barrier collision, repair and enemy reset, physical furnace damage, the underpass, death/respawn, Elite vulnerability and acquisition, Boss assembly/core damage without window quotas, charge-warning boundary fairness, guard armour, the exit gate, and completion. Scenarios place the tank and configure encounter windows for deterministic checks, then exercise the actual simulation and projectiles. They clear the test browser's game save; use a dedicated browser session. The inspection surface is gated by both development mode and `?test`, and is absent from production builds.

The transit scenario script adds acquisition-order, lob enclosure, magnetic combat, range/overheat, gate, enemy mortar, and reload checks. The traversal script drives 14 consecutive route legs using movement inputs and real collision, disabling enemies to isolate navigation; it does not teleport between route objectives.

The encounter script checks cargo destruction by Cannon and Overdrive, baited charge stagger, delayed explosive chains, player blast damage, committed turret volleys and cooling vulnerability, direct and lobbed friendly fire, sighting sharing, reusable magnetic cover, effective Cannon range, and rest recovery.

The UI script verifies real Q/right-mouse input, a single clamped Mortar reticle, tall-obstacle interception, and old-save continuation.

The density pass reduces the second region's floor footprint by 28 percent, retains both acquisition orders, and places destructible cover and reusable armour carts into specific firing lanes. Its full gameplay rules and encounter table are recorded in `Gamespec.md`.

Real browser keyboard movement, map toggling, key rebinding, and settings persistence were also checked. Screenshots from the local verification session are in the ignored `output/playwright/` directory.

This is a two-region playable balance pass. A clean, uninterrupted human playthrough near the design's ten-minute target has not been measured. Automated checks establish mechanics and progression, not first-time discovery quality or subjective audio balance.
