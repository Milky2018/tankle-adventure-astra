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

Open the local URL printed by Vite. The home page shows the journey menu, with explicit actions to start at the Recycling Foundry, continue saved progress, or launch an independent preview. Starting over confirms before replacing existing campaign progress; previews preserve it. Click the game or press a control to enable browser audio. Use the upper-left gear to pause, reopen journey selection, or configure controls, sound, quality, and fullscreen. Losing window focus pauses the game. The previous journey and its save remain available at `/?chapter=legacy`; earlier regional previews are grouped under historical versions in the same menu.
```sh
npm run build
npm run preview
```

The production output is `dist/`; it can be served by any static web server. A web server is required; opening `index.html` directly with `file://` does not work.

## Folded city

The complete journey at `/?chapter=folded` uses `furnace-born-v2-city`, a separate save from the earlier journey. Seven regions now share one supporting-height world: the Foundry, transit hub, submerged gardens, observatory, Testworks, circulation works and the predecessor/furnace chambers. Acquire all eight abilities in the world. Flotation or Mortar independently leads to Phoenix, then Laser and Circulation can be acquired in either order. Twelve permanent returns reconnect familiar places through supported paths and callable lifts. Defeating the keeper opens voluntary docking; Continue restores the final refuge for exploration.

Independent previews are available at `/?chapter=folded&route=foundry`, `/?chapter=folded&route=garden`, and `/?chapter=folded&route=freight`. First-region play begins at awakening with Cannon only. The Garden preview begins at its magnetic entrance Hive; the freight preview begins beside its first Mortar enclosure. They carry Overdrive plus Magnet or Mortar respectively. Each uses its own `furnace-born-v2-folded-<route>` save; choosing a preview in the menu resets only that preview to its entrance. Directly reloading its URL continues its saved checkpoint.

The full map has graphical controls for discovered floors; selecting a layer does not move the tank or its aim. Ordinary shots, movement and the owned abilities operate machinery. Modules install on contact; E also acquires them from nearby and handles repairs, calls and optional restoration; holding E at the final socket commits to docking after its visible alignment sequence.

The `scripts/folded-*-check.js` callbacks use the Playwright CLI with the development-only `?test` interface. They cover early acquisition, both late branch orders, continuous travel, physical returns, real keyboard/mouse interactions, combat, rendering and recovery. They clear only their named saves in the dedicated test browser. See [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md) for the distinction between route fixtures, unchanged enemy encounters and rendering measurements.

## Controls

| Input | Action |
| --- | --- |
| W / A / S / D | Screen-relative movement |
| Mouse | Independent turret aim |
| Left click | One Cannon/Mortar shot; hold to fire Laser |
| Q, after weapon acquisition | Cycle through owned Cannon / Mortar / Laser |
| Right mouse, after magnetic acquisition | Hold to pull the aimed rail or light enemy |
| F, after acquisition | Deploy / retract Flotation on supported ground; cross water while deployed |
| Shift, after acquisition | Hold Overdrive / Phoenix while moving |
| E, near a Hive, module, or lever | Repair and save, acquire a tool, or operate the mechanism |
| Tab | Toggle the progressively revealed region map |
| Space | Skip the death sequence |
| Escape | Pause / settings |

Every action, including fire and pause, can be rebound to keyboard or mouse buttons. Assigning an already-used input swaps the two actions, preserving access to both. Settings and checkpoint progress are saved in local storage under `furnace-born-v2-*` keys.

## Playable loop

The entrance conveyor defeats ordinary movement. A maintenance detour leads through a forward conveyor into the assembly courtyard. Its two branches loop around machinery; the east branch has an elevated firing gallery, ramps, and a ground-level underpass. Each branch contains a destructible relay. Both relays power the Elite barrier.

The Overdrive Prototype telegraphs a straight charge, collides with cover, and vents through its exposed rear radiator. It has 9 HP and no per-window damage cap; defeating it transfers its module. The acquired engine enables ramming, the return across the B–C conveyor, and the original entrance gate.

The Furnace Overseer combines slow heavy shells, fans, conveyors, and molten channels. Its outward-facing cooling assemblies open alternately for a timed window with no hit quota. Destroying each assembly stops its conveyor. The exposed central core ends the encounter; the third Repair Hive opens the exterior door and continues into the Empty Transit Hub without pausing the game.

The Foundry contains six ordinary enemies, one Elite, one Boss, and three Repair Hives. The connected Empty Transit Hub adds 31 floor sections, 24 enemies in 11 local encounters, five Hives, Magnetic Traction, and an optional early Mortar acquisition. The Furnace Guard distinguishes reduced frontal damage with a brief armour flash, outward white sparks, and a metallic ricochet; side/rear hits keep the normal orange damage burst and impact sound. Ordinary enemies respawn on resting or death; destroyed relays and defeated special encounters persist. There are no field healing items, collectible currencies, or objective arrows. Q cycles through owned weapons; right mouse holds Magnetic Traction.

The Sunken Gardens continue west from the Garden Shore. Pull the service panel, recover Flotation at the ferry, cross to the growing frames, and restore the reservoir pump to raise a return bridge. The southern water canal reaches the existing Mortar loading rig; the northern water channel reaches the Testworks rear dock. Four Hives, 14 enemies across eight encounters, a reversible current, and an optional repairable tender support this third region. F deploys the pontoons; retraction requires dry support. Water travel retains shooting and shared Heat, uses 75 percent movement speed, and disables Overdrive while deployed. Settings include a separate `?chapter=3` preview save starting with Magnetic Traction.

Three optional environmental puzzles use ordinary driving and the Standard Cannon: drive over rail treadles and shoot the carrier brake to open a freight crossing; hold a pump plate with the hull, shoot the exposed bridge pin, and drive away to drain the cistern; push two gutter cranks with the chassis and shoot a rust plug to revive a mechanical plant. E only recalls a moving carrier. Incorrect actions are recoverable, and completed states survive repair and reload. The garden puzzles sit beyond the existing Flotation gate and do not replace it.

The middle regions now connect the Testworks, Silent Observatory, and Circulation Works. Water and freight approaches converge on one Phoenix rig; Phoenix then opens independent Laser and Water Circulation branches. Permanent gangways, bridges, the gallery crosswalk, and a pressure bypass reconnect earlier geography. A tracking guardian uses reflected rear attacks or red-hot contact, followed by an optional outward signal. The middle-game preview in settings (`?chapter=4`) has its own save and begins with Mortar at the observatory exterior. Detailed rules and numerical balance live in `Gamespec.md`.

## Art and sound

Enemies are repurposed factory tools: a reclaiming clamp, a welding turret, a refractory shield carrier, a pressing prototype, and a mobile crucible. Jaws, welding hoods, radiator lids, and the Boss core doors communicate their attack and recovery states. Charge warnings cover the entire swept body, including endpoint caps.

Warm inspection decks, brown scrap sorting machinery, and cool gallery pipes distinguish the routes. Discarded hulls pass through an operating reclamation press beside the entrance; scanning and articulated Hive repair tools express rejection and repair without dialogue. Muted enamel, warm/cool lighting, and contact shadows support the existing rounded industrial style. Sparse exploration music leaves space for distinct mechanical attack sounds and the speed-sensitive player engine.

## Implementation

- `src/mechanics.js`: independently testable heat, movement, damage, and projectile collision rules.
- `src/world.js`: procedural models, geometry, floor topology, conveyors, machinery, ramps, and hives. Immutable geometry is batched by material.
- `src/transit-layout.js`: second-region room and encounter placement.
- `src/transit.js`: rail mechanisms, persistent gates, tool cradles, loading receivers, and regional scenery.
- `src/combat-props.js`: breakable cargo, delayed pressure-vessel explosions, and encounter cover reset.
- `src/garden-layout.js`: third-region shores, water network, encounters, and ability connections.
- `src/gardens.js`: continuous animated water, pontoon assembly, ballast bridge, pump and tender restoration, current and regional scenery.
- `src/puzzle-layout.js`: compact puzzle rooms, physical controls, and carrier routes.
- `src/puzzle-rules.js`: independently testable carrier, cistern, and gutter state rules.
- `src/small-puzzles.js`: animated mechanisms, collision, interaction, feedback, and persistence.
- `src/abilities.js`: bounded Mortar targeting, arc trajectory, and whole-hull flotation support rules.
- `src/main.js`: fixed-step simulation, collision, encounter state machines, save/load, maps, controls, and presentation.
- `src/audio.js`: gesture-activated Web Audio engine, mechanical percussion, melodic layers, and positional effects.
- `src/style.css`: graphical HUD and system menus.

A single mouse-following reticle carries a clockwise Heat ring; there is no separate ground-target marker or Heat bar beside HP. The camera never rotates or zooms in gameplay. Movement uses the same fixed camera basis in every area. Heat is shared by the cannon, Mortar, Magnetic Traction, and Overdrive, including the deceleration tail. Overdrive reaches 1.6x speed in 0.5 seconds and adds 15 Heat per second; release deceleration remains 0.35 seconds. The engine sounds while driving, becomes louder and higher-pitched through acceleration, and fades out on stopping; pause, death, and the sound-effects setting mute it. The A and B–C conveyor surfaces are 3 and 2.4 world units long, respectively. The player uses a smaller 0.8-unit combat hurtbox; enemies and Boss weak points have 15 percent larger damage-detection radii, independently of solid-body collision. Direct-hit protection does not suppress furnace damage. Furnace channels retain physical movement and never teleport or reset the tank.

## Verification

Dated investigations and their evidence belong in [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md); `Gamespec.md` contains game design only.

```sh
npm test
npm run build
```

Node tests cover shot cadence, the fifth-shot overheat threshold, cooling delay and lockout, Overdrive acceleration/deceleration, stationary input, normalized screen movement, conveyor equilibrium, damage protection, swept projectile collisions, wheel-axis stability and rolling direction through hull turns, charge telegraph coverage of the full swept body, and construction/animation of the factory enemy forms, Mortar targeting and cooldown, regional area, both initial acquisition routes, gated boundaries, counterweight persistence, and the independent optical route.

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
playwright-cli -s=furnace-v2 run-code "$(cat scripts/garden-walk-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/garden-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/puzzle-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/midgame-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/midgame-walk-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/midgame-ui-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/midgame-regression-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/midgame-combat-walk-check.js)"
playwright-cli -s=furnace-v2 run-code "$(cat scripts/guardian-battle-check.js)"
playwright-cli -s=furnace-v2 close
```

The 33 Foundry browser scenario checks exercise both conveyor gates, ordinary combat, both relays, barrier collision, repair and enemy reset, physical furnace damage, the underpass, death/respawn, Elite vulnerability and acquisition, Boss assembly/core damage without window quotas, charge-warning boundary fairness, guard armour, the exit gate, and completion. Scenarios place the tank and configure encounter windows for deterministic checks, then exercise the actual simulation and projectiles. They clear the test browser's game save; use a dedicated browser session. The inspection surface is gated by both development mode and `?test`, and is absent from production builds.

The transit scenario script adds acquisition-order, lob enclosure, magnetic combat, range/overheat, gate, enemy mortar, and reload checks. The traversal script drives 14 consecutive route legs using movement inputs and real collision, disabling enemies to isolate navigation; it does not teleport between route objectives.

The encounter script checks cargo destruction by Cannon and Overdrive, baited charge stagger, delayed explosive chains, player blast damage, committed turret volleys and cooling vulnerability, direct and lobbed friendly fire, sighting sharing, reusable magnetic cover, effective Cannon range, and rest recovery.

The UI script verifies real Q/right-mouse input, a single clamped Mortar reticle, tall-obstacle interception, and old-save continuation.

Including the new shunting pocket, the second region's floor footprint remains 24 percent smaller than before the density pass. It retains both acquisition orders, and places destructible cover and reusable armour carts into specific firing lanes. Its full gameplay rules and encounter table are recorded in `Gamespec.md`.

Real browser keyboard movement, map toggling, key rebinding, and settings persistence were also checked. Screenshots from the local verification session are in the ignored `output/playwright/` directory.

The garden traversal check drives 23 consecutive legs with real collision and movement inputs, without teleporting between objectives. It verifies the magnetic entrance, dry module acquisition, first water crossing, outer shore and reservoir approaches, pump return, normal Mortar outlet, and persisted progression. Enemies are disabled in this check to isolate navigation. Separate scenarios verify water combat, currents, heat, Overdrive exclusion, retraction, real F input, settings, and death recovery. Node checks prove the gate relationships against the full terrain and obstacle union.

The puzzle suite adds 20 browser checks and 23 local movement legs. It covers Cannon release of the carrier, pressure-operated track selection, immediate docking reward, weight-held water, shooting the exposed retaining pin, automatic drainage, hull-driven gutter cranks, the shootable pipe plug, wall interception, close-range real mouse fire, repair, and reload. It uses one starting fixture per region and disables enemies to isolate navigation. Fourteen Node tests cover the mechanism state rules, contact debounce, physical collision, access, and old-save migration.

The legacy journey remains a six-region prototype; the folded city includes the seventh region and voluntary ending. A clean, uninterrupted human playthrough near the design's ten-minute target has not been measured. Automated checks establish mechanics and progression, not first-time discovery quality or subjective audio balance.

The middle-game scripts verify ability acquisition, held beam reflection, armour, maximum-speed collision, the sustained return lane, persistent shortcuts, and reload. Navigation checks run both branch orders with different incoming equipment, using real movement throughout each route. These tests use the same dedicated browser; close it and the temporary Vite service after verification to release GPU and server resources.

The middle-game regression script retains natural enemy spawns and checks blocked acceleration, the first launch encounter, all nine new rest pockets, ranged guardian response, and stationary damage trading. The combat traversal script keeps enemies and damage enabled for both acquisition orders, uses ordinary repairs along each route, and verifies save/reload. It uses map-aware navigation and aiming, so it does not measure blind discovery. The guardian battle script separately checks moving reflected fire and repeated red impacts without modifying enemy health or AI.
