# Code ownership

The current game boots through `src/entry.js` and `src/folded.js`. The latter creates the session, wires game actions and advances systems in their existing order. It owns session orchestration and player ability coordination. Settings UI and transient effects have dedicated owners; camera preview callbacks stay here because they must refresh world visibility and aim without advancing simulation.

## Current modules

| Module | Owns |
| --- | --- |
| `folded-ai.js` | Enemy decisions, movement, attack phases, squad alerts and combat reset |
| `folded-enemy-rules.js` | Enemy archetype values and squad healing selection |
| `folded-death.js` | Player wreck animation, smoke and the death/reconstruction iris |
| `folded-enemy-view.js` | Enemy warning geometry, deployment, collapse, animation and camera readability |
| `folded-profiler.js` | Development-only CPU/GPU sampling and query cleanup |
| `folded-projectiles.js` | Damage application, armour, sanctuary interception, shell flight, hostile launch and direct/blast friendly fire |
| `folded-combat.js` | Armour and contact-damage rules |
| `folded-weapons.js` | Current city Cannon/Laser values and hostile projectile damage |
| `folded-laser.js` | Read-only trajectory shared by preview and live Laser |
| `folded-settings.js` | Preference defaults and persistence, control rebinding, quality/audio settings and camera-tuning UI |
| `folded-effects.js` | Spark/shield-fragment motion, blast rings and projectile visuals with scene-local material cleanup |
| `folded-input.js` | Keyboard/mouse listeners, pointer capture, raw-input fallback, held mouse chords |
| `folded-camera.js`, `folded-ground.js` | Camera pose, terrain pose and height-aware aim |
| `folded-map.js` | Discovered-layer drawing, floor selection and lift-link picking |
| `folded-save.js` | Campaign/preview storage selection, settings storage, denied/corrupt-storage fallback |
| `folded-layout.js` | Authored world composition, collision rules, initial state and save migration |
| `folded-world.js` | Procedural world construction, scene objects, world queries and visibility updates |
| `folded-side-puzzles.js` | Side machinery, its collision positions, presentation and persistence |
| `folded-bosses.js`, `folded-boss-arenas.js`, `folded-pacing.js` | Boss patterns, arena seals and encounter scheduling |
| `mechanics.js`, `abilities.js` | Shared heat, movement and ability rules |
| `folded-hud.js`, `folded-interface.js`, `folded-ending.js` | Ability/threat presentation, menu structure and completion screen |
| `audio.js`, `soundtrack.js` | Mechanical effects, regional cues and musical playback |

`createFoldedCombat` accepts the session clock, world queries and shared projectile lists. Its effects adapter plays audio and creates visuals; its events adapter handles progression, death and machinery. Renderer-free tests and the live game call this same interface. Do not copy function bodies into a test or recover them by parsing source text.

Input receives live status getters so rebinding, camera changes and pause transitions take effect immediately. Pointer motion only changes camera intent; scene queries remain in simulation, with an immediate refresh when firing between frames. Map layer selection never changes player height or aim.

`createFoldedPreferences` uses the existing settings storage adapter. Its binding table and per-view camera objects retain identity across resets so input, HUD and preview consumers cannot hold stale replacements. Rebinding an occupied key swaps the previous binding; camera reset affects only the selected view. `mountFoldedSettings` owns the listening state and DOM, while the session retains pause, restart and camera-selection policy.

`createFoldedEffects` owns sparks, pulled shield fragments and blast rings. Its separate spark/wave updates deliberately retain their positions in the live/death update order. Expiration releases per-effect materials, not the shared primitive geometry. Projectile flight remains in combat; projectile appearance remains in effects. `waves` is exposed for the existing development diagnostics, not serialized game state.

## State lifetimes

- Authored layout exports describe starting geometry and enemy placement.
- `initialFoldedState` creates session-local `state.bodies` for moving side machinery and solids. It is non-enumerable, so it is excluded from JSON saves and snapshots. Collision, world construction and machinery must use these same bodies.
- Boss arena state is also transient. Persistent progression is saved as existing flags, anchor, discoveries and serialized side-puzzle state.
- Meshes, materials, input state and camera state belong to the running session. They are not serialized as campaign progress.
- The campaign key remains `furnace-born-v2-city`; previews use `furnace-born-v2-folded-<route>`; settings use `furnace-born-v2-settings`.

Saved machinery progress is reconstructed by its owning puzzle module. Moving a carrier must not mutate imported layout definitions and change the next session's starting geometry.

`createFoldedEnemies` accepts the session clock, combat actions, arena/pacing controllers and an enemy-view adapter. Decisions use world collision queries; the adapter owns meshes and camera readability. Warning and animation calls remain at their original positions in the update, including the warning frame immediately before a shot. Renderer-free tests exercise the same factory with model-free enemy records.

Live enemy records still contain visual handles used by world construction, damage and rendering. The AI no longer accesses them, but this is not a complete entity-storage migration. Keeping these records compatible avoids changing damage, map, save and diagnostic consumers in the same refactor.

## Cleanup scope

The planned coordinator extractions (combat, input, map, saves, enemy AI/view, diagnostic profiling and settings) are complete. Transient effects were also separated. The coordinator intentionally retains session sequencing, player ability actions, camera/aim synchronization and progression callbacks.

Live enemy model handles and the shared historical model builders remain explicit coupling. Removing them requires a separate world/entity representation change; they are not unfinished steps of this behaviour-preserving extraction. Do not replace them with an event bus or a new entity framework solely to make the entry file shorter.

## Historical code

`main.js` runs the historical journey and regional prototypes, not the default city. `hoist.js`, `midgame.js`, `small-puzzles.js` and `transit.js` also support those previews. Preserve their routes and save keys.

`world.js`, `gardens.js`, `hoist-layout.js` and several early rules modules are shared by the current city. Their names or age do not make them dead code. Moving them into a legacy directory without first separating their shared exports would obscure the real dependencies.

## Verification layers

1. `npm test`: independently importable rules, layout traversal, storage contracts and the tagged balance baseline.
2. `npm run test:browser`: isolated, serial smoke checks using real world construction. Some cases assign positions or enemy states to reproduce a particular interaction.
3. `npm run test:browser -- full-journey`: three scripted acquisition orders from new saves; simulated aiming and stepping are assistance, not a blind playtest.
4. Visual inspection: screenshots in both camera modes and real movement/input checks. Passing source or layout tests alone cannot verify occlusion or readability.

Ordinary browser checks use `__game.snapshot`, `setInput`, `step`, `scenario`, `manual` and the development-only `debug` view. Add `&manual` alongside `&test` when a fixture must not advance during page startup. The initial one-step world initialization remains unchanged.

Browser checks no longer intercept and rewrite source modules. The older presentation/aim probes build their fixture helpers from `__game.debug`. Performance probes share `debug.profile`: `start()` resets samples, `stop()` releases outstanding GPU queries, and `start({gpu: false})` counts CPU calls without GPU sampling. CPU wrappers and the profiler module load only with development `?test`; production builds omit them.

`?test&unbatched` disables world-local static batches and enemy rigid batches for the comparison probe. It leaves other rendering systems (such as regional presentation and instanced conveyors) intact. Normal world construction defaults to batching. The comparison checks both images and draw calls; it does not rewrite function text.

Run migrated diagnostics with `npm run test:browser -- polish height-aim scenarios render-batching`, or timing captures with `npm run test:browser -- render-perf overhaul-perf`. The runner closes each browser before starting the next. Frame rates from these local probes depend on viewport, graphics backend and machine load; they are not a universal performance guarantee.

Formatting currently covers the session coordinator and extracted modules. Expand that set as modules are edited, keeping mechanical formatting separate from gameplay changes. The existing shared-bundle size warning is not evidence of a runtime frame-time regression.
