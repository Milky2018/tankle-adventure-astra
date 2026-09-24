# Code ownership

The current game boots through `src/entry.js` and `src/folded.js`. The latter creates the session, wires game actions and advances systems in their existing order. It owns session orchestration and player ability coordination. Settings UI and transient effects have dedicated owners; camera preview callbacks stay here because they must refresh world visibility and aim without advancing simulation.

## Current modules

| Module | Owns |
| --- | --- |
| `folded-ai.js` | Enemy decisions, movement, attack phases, squad alerts and combat reset |
| `folded-enemy-state.js` | Session-owned enemy identity, spawn state, health and boss-part records |
| `folded-enemy-rules.js` | Enemy archetype values and squad healing selection |
| `folded-death.js` | Player wreck animation, smoke and the death/reconstruction iris |
| `folded-enemy-view.js` | Enemy warning geometry, deployment, collapse, animation and camera readability |
| `folded-profiler.js` | Development-only CPU/GPU sampling and query cleanup |
| `folded-projectiles.js` | Damage application, armour, sanctuary interception, shell flight, hostile launch and direct/blast friendly fire |
| `folded-combat.js` | Armour and contact-damage rules |
| `folded-weapons.js` | Current city Cannon/Laser values and hostile projectile damage |
| `folded-ballistics.js` | Shared mortar flight position and read-only obstruction prediction |
| `folded-upgrades.js` | Saved discovery IDs, derived equipment bonuses and weapon damage scaling |
| `folded-exploration-layout.js` | Optional finds, collision-backed workshop infill and local patrols |
| `folded-materials.js` | Cached seamless surface colour and normal maps |
| `folded-architecture.js` | Region-specific wall openings, roof profiles, shared-ceiling clipping and collision-backed structural envelopes |
| `folded-regional-scenery.js` | Envelope-attached regional detail and a bounded pool of local task lights |
| `folded-laser.js` | Read-only trajectory shared by preview and live Laser |
| `folded-settings.js` | Preference defaults and persistence, control rebinding, quality/audio settings and camera-tuning UI |
| `folded-effects.js` | Spark/shield-fragment motion, blast rings and projectile visuals with scene-local material cleanup |
| `folded-input.js` | Keyboard/mouse listeners, pointer capture, raw-input fallback, held mouse chords |
| `folded-camera.js`, `folded-ground.js` | Camera pose, terrain pose and height-aware aim |
| `folded-map.js` | Discovered-layer drawing, floor selection and lift-link picking |
| `folded-save.js` | Campaign/preview storage selection, settings storage, denied/corrupt-storage fallback |
| `folded-content.js` | Compiled, immutable region definitions; mounted positions, recipient identity and reference validation |
| `folded-layout.js` | Terrain support, collision and movement; compatibility exports for content/state readers |
| `folded-machinery-state.js` | Session-owned lift, pickup and mirror records; mirror motion, carried pickup positions and lift reconstruction |
| `folded-state.js`, `folded-save-migrations.js` | Session construction, durable serialization, completion notifications and explicit legacy-save recovery |
| `folded-progression.js` | Receiver commands, completion events, the signal clock and read-only timing queries |
| `folded-circuits.js`, `folded-signal-state.js` | Cable routes from declared effects; recipient delivery state independent of meshes |
| `folded-render-policy.js`, `folded-occlusion.js` | Material roles, color/depth pairing, aim visibility and occluder lifetimes |
| `folded-visibility.js`, `folded-haze.js` | Cutaway shader math and player-centered fog/culling, installed by one scene-rendering context |
| `folded-world.js` | Procedural world construction, scene objects, world queries and visibility updates |
| `folded-side-puzzles.js` | Side machinery, its collision positions, presentation and persistence |
| `folded-bosses.js`, `folded-boss-arenas.js`, `folded-pacing.js` | Boss patterns, arena seals and encounter scheduling |
| `mechanics.js`, `abilities.js` | Shared heat, movement and ability rules |
| `folded-hud.js`, `folded-interface.js`, `folded-ending.js` | Ability/threat presentation, menu structure and completion screen |
| `audio.js` | Audio lifecycle, spatial listener, regional machinery cadence and music state |
| `sound-effects.js` | Layered SFX recipes, bounded voice and audio-node lifetime, positional attenuation and continuous engine |
| `soundtrack.js` | Musical track selection, transitions and playback |

`createFoldedCombat` accepts the session clock, world queries and shared projectile lists. Its effects adapter plays audio and creates visuals; its events adapter handles progression, death and machinery. Renderer-free tests and the live game call this same interface. Do not copy function bodies into a test or recover them by parsing source text.

Input receives live status getters so rebinding, camera changes and pause transitions take effect immediately. Pointer motion only changes camera intent; scene queries remain in simulation, with an immediate refresh when firing between frames. Map layer selection never changes player height or aim.

`createFoldedPreferences` uses the existing settings storage adapter. Its binding table and per-view camera objects retain identity across resets so input, HUD and preview consumers cannot hold stale replacements. Rebinding an occupied key swaps the previous binding; camera reset restores both views and their shared fog/render distances. `mountFoldedSettings` owns the listening state and DOM, while the session retains pause, restart and camera-selection policy.

`createFoldedEffects` owns sparks, pulled shield fragments and blast rings. Its separate spark/wave updates deliberately retain their positions in the live/death update order. Expiration releases per-effect materials, not the shared primitive geometry. Projectile flight remains in combat; projectile appearance remains in effects. `waves` is exposed for the existing development diagnostics, not serialized game state.

## State lifetimes

- Compiled content is deeply frozen. Every compiled collection owns a deep copy, including nested geometry and enemy data. Mounting, shaft cutting and freezing never mutate or freeze region exports. Pickup prerequisites and previews cannot generate collision bodies.
- `initialFoldedState` creates session-local `state.bodies` for moving side machinery and solids. It is non-enumerable, so it is excluded from JSON saves and snapshots. Collision, world construction and machinery must use these same bodies.
- `serializeFoldedState` whitelists durable flags, anchor, discoveries, signals, mirror/slide coordinates and side-puzzle records. Arena state, collision bodies, completion notifications and visual handles are excluded even if present on a live object. The released flat save format remains compatible.
- `state.machinery` owns lifts, pickups and mirrors independently of the scene. These transient records contain mechanical coordinates, reflection normals and feedback timers, with no meshes or materials. Lift and pickup positions reconstruct from durable progress; saved mirror turns restore the indexed orientation.
- Meshes, materials, input state and camera state belong to the running session. They are not serialized as campaign progress.
- The campaign key remains `furnace-born-v2-city`; previews use `furnace-born-v2-folded-<route>`; settings use `furnace-born-v2-settings`.

Equipment bonuses are reconstructed from discovery flags rather than saved multipliers. Collecting an armour pack fills the new capacity once; repair and reconstruction use the derived maximum. Player shells snapshot their upgraded damage at launch; continuous Laser uses the current equipment state.

Saved machinery progress is reconstructed by its owning puzzle module. Moving a carrier must not mutate imported layout definitions and change the next session's starting geometry.

`createFoldedEnemies` accepts the session clock, combat actions, arena/pacing controllers and an enemy-view adapter. Decisions use world collision queries; the adapter owns meshes and camera readability. Warning and animation calls remain at their original positions in the update, including the warning frame immediately before a shot. Renderer-free tests exercise the same factory with model-free enemy records.

`state.enemies` is created before the scene and shared by world queries and combat. Enemy and boss-part records carry explicit target kinds; damage and magnetic targeting never infer identity from the presence of a model. Boss parts refer to their owning enemy, without graphical handles. Durable victories and pending encounter completions determine initial health; reserves start dormant. Runtime health and phases are not serialized.

`world.views.enemy(body)` resolves a scene-owned record for either an enemy or a boss part. Models, materials, warning geometry, armour shutters and occlusion opacity live there. World synchronization reads combat records without advancing them; the enemy-view adapter receives animation calls at the existing simulation stages. Combat reports a kill through its effects adapter instead of manipulating a warning mesh. Visual diagnostics resolve the same scene records explicitly.

## Content and progression contracts

A receiver declares `effects` when it changes more than its own flag, `feeds` when the cable recipients differ from those effects, and `destinations` for visible non-collider machinery. These declarations live with the receiver. Exceptional physical cable constraints use `cable` routing data; the router contains no receiver-ID branches. Unknown prerequisite/effect references fail during content compilation. `circuitKey` is bound before moving a lift or slide and preserves the released save identity.

`controlChanges` evaluates weapon and prerequisite conditions without mutation. Live callers use `progression.activate`; copying and diffing a save to discover effects is prohibited. `progression.complete` handles victories, rewards and delayed encounter releases. Physics and side-puzzle completions use `completeProgress`/`recordPuzzleState`; the simulation drains their session-local completion queue. Receivers do not replay their input cable when a delivery machine later reports completion.

A source can be latched while its destinations are still waiting. Each destination becomes ready at its own cable arrival; the shared durable effects settle after the longest branch. Pending signals serialize elapsed progress and individual target timing. Read-only signal queries return immutable snapshots, with immutable effects and recipient timing; callers cannot alter delivery through a returned reference. Saves flush completion notifications before serialization. Restoring a completed save emits no new events. Historical access recovery is explicit migration data, never inferred from today's pickup configuration.

`world` receives read-only signal queries and already compiled cable routes. View updates never activate receivers, scan flags for changes or advance signal timers. The application owns simulation order and passes one rendering context to every city scene builder. Carrier and released-slide physics run alongside lifts in the session machinery step. `world.syncMovingSolids` only copies the resulting bounds into scene queries and meshes; scene synchronization cannot advance machines or write saved positions.

## Rendering contracts

`RENDER_ROLES` owns the material depth/opacity contract for floors, structure, fixtures, belts, floor details, scenery and backdrop. Geometry builders choose a role; they do not override its `transparent`, `depthWrite` or `colorWrite` settings afterwards. Reusing a material under a conflicting role or across scenes throws; use an explicit clone instead. Cloning a registered material restores its base opacity rather than capturing its current camera fade. Cached primitive materials are marked shared and cannot be registered directly: scene builders clone/cache them locally, so shader uniforms never leak into another session.

Floors and large structures have matching depth passes. Fading changes camera color/depth only and never toggles physical shadow casting. View switches change uniforms and batch representations, then restore occluder opacity through the same policy. Aim tests use the policy's matching visibility math. Fog and the render boundary share one player-centered rendering context; neither is a camera-opacity fade.

Lift, pickup and mirror models read `state.machinery`. Their collections exposed by `world.lifts`, `world.pickups` and `world.mirrors` are the same simulation-owned records, not model wrappers. Visual diagnostics use `world.views` explicitly. Scene-owned view records may cache coordinates for occlusion but are never used to advance the mechanical state. Mesh hit metadata points back to the runtime mirror, so combat and laser tracing share its simulation-owned normal.

The simulation calls `advanceMachineryState` before the world synchronization at the existing frame stage. It advances indexed mirror turns at the established angular speed and follows lift-mounted rewards. Death and ending updates use the same step; camera changes and drawing do not. Lift reconstruction resets riders' machinery through `resetMachineryLifts`, including attached reward positions. The development-only scenario helper explicitly settles machinery when applying a fixture; it does not rely on a render side effect.

The procedural mesh builders and side-puzzle visual adapters remain substantial modules. Controls and side-puzzle actors still mix some runtime and visual fields. These boundaries are explicit; this architecture does not claim that every actor has become renderer-independent, nor require an entity framework merely to shorten files.

## Historical code

`main.js` runs the historical journey and regional prototypes, not the default city. `hoist.js`, `midgame.js`, `small-puzzles.js` and `transit.js` also support those previews. Preserve their routes and save keys.

`world.js`, `gardens.js`, `hoist-layout.js` and several early rules modules are shared by the current city. Their names or age do not make them dead code. Moving them into a legacy directory without first separating their shared exports would obscure the real dependencies.

## Verification layers

1. `npm test`: independently importable rules, layout traversal, storage contracts and the tagged balance baseline.
2. `npm run test:browser`: isolated, serial smoke checks using real world construction. Some cases assign positions or enemy states to reproduce a particular interaction.
3. `npm run test:browser -- full-journey`: three scripted acquisition orders from new saves; simulated aiming and stepping are assistance, not a blind playtest.
4. Visual inspection: screenshots in both camera modes and real movement/input checks. Passing source or layout tests alone cannot verify occlusion or readability.

Ordinary browser checks use `__game.snapshot`, `setInput`, `step`, `scenario`, `manual` and the development-only `debug` view. Add `&manual` alongside `&test` when a fixture must not advance during page startup. The initial one-step world initialization remains unchanged.

Browser checks no longer intercept and rewrite source modules. Presentation/aim probes build their fixture helpers from `__game.debug`; progression probes use `debug.progression`, not scene-owned mutators. Performance probes share `debug.profile`: `start()` resets samples, `stop()` releases outstanding GPU queries, and `start({gpu: false})` counts CPU calls without GPU sampling. CPU wrappers and the profiler module load only with development `?test`; production builds omit them.

`?test&unbatched` disables world-local static batches and enemy rigid batches for the comparison probe. It leaves other rendering systems (such as regional presentation and instanced conveyors) intact. Normal world construction defaults to batching. The comparison checks both images and draw calls; it does not rewrite function text.

Run migrated diagnostics with `npm run test:browser -- render-contract occlusion-cone fog-boundary shadow`, or timing captures with `npm run test:browser -- render-perf overhaul-perf`. The runner closes each browser before starting the next. Frame rates from these local probes depend on viewport, graphics backend and machine load; they are not a universal performance guarantee.

Formatting currently covers the session coordinator and extracted modules. Expand that set as modules are edited, keeping mechanical formatting separate from gameplay changes. The existing shared-bundle size warning is not evidence of a runtime frame-time regression.

Route traversal tests may use `test-fixtures/settled-control.js` to start from a fully operated mechanism. That fixture is not a game API and does not test signal timing. `folded-progression.test.js` covers actual commands, branch arrival, save restoration, completion ownership and immutable content without a renderer. Browser circuit checks exercise rendered lamps, collision release and lift timing together. `folded-machinery-state.test.js` verifies mechanical lifetimes, reflection during a turn, restoration and lift-mounted rewards without constructing a scene. The render contract also snapshots those records while a mirror has an unfinished turn, checks enemy records for scene-handle leaks, and verifies that scene updates leave combat state unchanged. Enemy-state and combat tests cover independent lifetimes, restoration, lethal impacts and boss-part targeting without models. Obsolete camera-push-in, treadle/E-switch and old mixed presentation/feedback probes have been removed; current rendering contracts replace their private-cache assertions.

The former mixed feedback probe referenced deleted receivers (`freight` and `bridge-crane`) and assumed all doors wait for the longest branch. Its signal and save checks are superseded by `circuit-arrival`/`circuit-visibility`; combat feedback has `hit-response`, while exhaust geometry is covered by `folded-effects.test.js`. Diagnostic scripts use the same current progression queries as the game.
