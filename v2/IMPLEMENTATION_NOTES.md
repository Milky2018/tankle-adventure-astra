# Implementation and Verification Notes

Technical history moved out of `Gamespec.md`; these dated observations describe the revisions they inspected, not the current build. Game-design rules remain in `Gamespec.md`.

## Journey selection and first-region entry — 2026-09-15

The root URL now loads a shared journey menu before importing a game runtime. Both current and historical runtimes expose it from settings. Campaign start/continue, three independent current previews, and collapsed historical entries have stable labels. The new `route=foundry` preview uses its own save and the awakening/Cannon-only initial state; it does not inherit the pre-equipped middle-entry flags. Selecting a preview clears only that preview, while campaign restart confirms before clearing only the campaign save. Direct runtime URLs remain available; `/?test` retains the development observation entry.

`scripts/journey-menu-check.js` verifies first-region position and equipment, all three current previews, preservation of an advanced campaign save, checkpoint continuation, restart confirmation and save isolation, all five historical entries and return navigation, Escape handling, and a narrow viewport. Production checks verify that the menu does not load the renderer bundle, first-region gameplay starts without the test API, and the independent first-region entry works from settings. Browser checks had no runtime errors; all 114 Node tests, the build, and whitespace checks passed.

## Folded-city ability HUD — 2026-09-15

`folded-hud.js` replaces the default city's three generic tool indicators and shared lightning pickup glyph. Eight distinct ability cards reflect owned modules and weapon selection. Pickup events show the matching icon, current binding glyphs, and a short SVG demonstration; Phoenix and Circulation remain visible as linked engine upgrades. The tray is reconstructed from the existing saved player abilities without changing save format or automatically switching weapons. Legacy HUD markup and behaviour remain available through the legacy entry.

`scripts/folded-hud-check.js` collects all seven modules using real interaction input at isolated pickup fixtures, then checks distinct cards/demonstrations, weapon cycling, remapped controls, pontoon deployment, maximum-speed overheated acceleration, a 375-pixel-wide viewport, and reload. All checks passed without browser errors. Screenshots of Mortar acquisition, the full tray, and the narrow layout were inspected. The 114 Node tests, production build, and whitespace checks passed.

## Folded-city cursor and elevation correction — 2026-09-15

The default folded runtime now positions its single reticle from mouse coordinates instead of projecting the constrained firing point. Cannon and Laser retain the 40-degree elevation limit; Mortar retains its finite landing range. Movement and lift displacement precede camera and aim updates, so firing and the displayed barrel use the current player pose and camera. This supersedes the constrained-reticle presentation described in earlier folded-city notes below; the legacy runtime is unchanged.

`scripts/folded-height-aim-check.js` reproduced up to 89 pixels of cursor displacement at a raised landing before the fix. It now passes 41 pointer samples across the landing edge and 12 moving frames, with a maximum cursor error of 0.015 pixels and no stale-camera aim difference. It checks the actual barrel against a Cannon shot, the Laser's 40-degree beam direction, the single reticle, and Mortar's retained range. Enemy free-aim and city mechanism browser checks also pass, including reflected receivers and the guardian's rear hit. All 114 Node tests, the production build, and whitespace checks passed.

## Corrections and validation — 2026-09-15

The following corrections supersede the defects in the historical audit below:

- The optical service bridge now has a linked shutter south of the industrial crossing. The physical ability graph prevents pre-Phoenix access to the circulation feed and rig. Existing saves with the optical bridge already open also open this shutter. The negative reachability check repeatedly operates reachable Cannon receivers and inside controls, with destructible combat props removed, for both incoming routes.
- A collision with intact terrain or a surviving enemy resets player speed. Gate and crate impacts use the approach speed during driven collision steps, before stopping at remaining solids. Enemy separation cannot operate a momentum gate. The first launch defenders stand beyond the acceleration stretch; the west calibration run-up is marked from a physically sufficient starting position.
- Hits alert regional enemies before armour rejection. Alerted enemies can orient defensively beyond their ordinary activation distance, while starting aimed attacks still requires visibility and sight. Indirect launchers retain last-seen targeting, but cannot start their warning offscreen; leaving the view cancels a pending regional attack. The guardian has 36 HP, retains rear-only ranged damage, and remains vulnerable to all red contact tiers without a damage quota.
- The first optical receiver sits in a narrow physical well. Reachable straight firing positions cannot operate it; the calibration reflection remains valid. Its raised lamp and framed mirror keep the mechanism visible above its screens.
- Five repair bays have permanent physical screens and quiet-facing entrances. All nine new Hives retain 50 HP during the original 12-second idle-after-repair check.
- The optical-to-circulation shortcut reduces the measured supported walking path from 401 to 315 units (about 21 percent, formerly 4 percent). This compares fixed endpoints and excludes combat and cooling. The loading lift remains subject to its 50-percent reduction check. Dish and coolant landmarks distinguish the express branches. Middle-region floor intersections are partitioned for rendering to remove overlapping surface flicker; collision still uses the same floor union.

Validation: all 58 Node tests and the production build passed. The strengthened topology suite passed again with breakable props removed in the negative progression checks. Browser suites passed 132 scenario assertions across Foundry movement/combat/presentation, transit progression, regional combat, middle-game mechanisms/UI, and the new regressions. The navigation-only middle-game checks also passed. Normal-combat traversal completed both acquisition orders over 52 continuous route legs with no deaths, using regular Hive repairs and verifying reload. Each route recorded 25 damage before repairs. Separate natural-enemy guardian scenarios verified moving reflected fire and two full-speed red approaches; neither changes enemy health or AI. These are scripted known-map checks, not a blind human playthrough or a final subjective balance judgment.

Screenshots of the crossing, repair cradle, optical well, and both branch landmarks were inspected. Local evidence remains under the ignored `output/playwright/` directory.

## R4–R6 gameplay audit — 2026-09-15

Inspected revision: `32857e9`. Status: confirmed findings and proposed corrections; no gameplay fixes are included in this audit. The findings below qualify the implementation and verification claims above.

### Method and limits

Both optics-first and circulation-first routes were traversed in a browser with normal enemies, damage, death rules, and Heat. Navigation and aiming were scripted with knowledge of the map; these runs establish executable routes, not blind discovery or human difficulty. Independent starting saves separated route orders. Focused scenarios repositioned the player to isolate impacts, receivers, checkpoints, and the guardian; enemy behaviour remained enabled. Both normal route orders completed without a recorded death. Screenshots were inspected for junction and crossing readability. Evidence is retained locally under `v2/output/playwright/audit-2026-09-15/` (ignored artifacts).

### Confirmed progression and combat defects

1. **Water Circulation is reachable before Phoenix.** From the normal middle-game preview with Mortar and ordinary Overdrive, a continuous route through the dry freight approach, express crosswalk, industrial return, and service bridge reaches the restoration feed. Cannon opens that feed and the player can acquire Water Circulation while every Phoenix shutter remains closed. The observed run finished at 50 HP with Phoenix and Laser both unowned. Same-level floor intersections connect the routes beyond their intended gates. Correct the physical connections or barrier placement while preserving the intended later shortcuts. Future reachability checks must repeatedly open every reachable mechanism usable with the current abilities; checking a closed feed alone does not establish a Phoenix dependency.

2. **The tracking guardian can die without activating.** On the optics-first route, the player stood near `(230, -198)` and fired Laser directly at its exposed rear. The guardian went from 18 HP to zero while remaining idle and inactive; the player took no damage during this attack. Its engagement distance is 30 units, shorter than this firing position and much shorter than Laser range. A long-range hit must provoke an appropriate defensive orientation or encounter response. Preserve readable attack warnings; do not solve this by making all distant enemies arbitrarily invulnerable.

3. **A blocked tank can charge a maximum-speed shutter impact.** Starting at `(50, -406)` with Phoenix, speed 1, and a cold engine, holding movement and boost against the closed launch shutter opened it after approximately 1.83 seconds. The tank moved only about 0.62 units before being blocked, while its speed multiplier continued rising to 3.2. Movement input currently supplies the qualifying speed even without displacement. Gate-breaking momentum should come from actual travel immediately before impact.

4. **The first reflection receiver accepts a direct shot from an accessible position.** A player at `(202, -126)` can fire directly into the gallery receiver at `(202, -122)`, opening both gallery mechanisms without a reflection. Laser ownership is still required, but the intended reflection lesson is skipped. Recess the receiver or extend its physical screen so the first bounce is necessary and the beam path remains visible.

### Encounter and checkpoint tuning

- **The first Phoenix launch obstructs its own lesson.** The approaching shield guard can meet the accelerating tank before maximum speed, stopping the run and resetting speed. One normal route failed to open the launch shutter; another succeeded after shooting the guard first and returning to the run-up. Give the first demonstration enough unobstructed acceleration distance before the first impact target, or delay the guard's approach. Later encounters can deliberately challenge the run-up.
- **Five of nine new Repair Hives are unsafe immediately after repair.** With ordinary enemies reset by repair and the player then idle, first damage occurred after 2.8 seconds at the rear dock, 2.9 at freight, 2.6 at the Phoenix cradle, 6.4 at the restoration yard, and 3.1 at the circulation rig. All five lost health within the 12-second observation window. Rework nearby cover, sightlines, and enemy placement to provide a dependable rest pocket without disabling the surrounding combat.
- **The guardian offers too little resistance even when active.** A circulation-first run killed the 18-HP guardian with one maximum-speed red impact, which correctly deals 24 damage. A separate active reflected-Laser scenario won while standing still, ending at 5 HP. Red contact must remain a valid alternative that damages every enemy, with the agreed doubled damage and no per-window quota. Tune durability, approach commitment, and encounter positioning together so both routes involve meaningful action.

### Shortcut value and spatial readability

These are shortest supported ground-path distances between fixed endpoints, comparing each shortcut closed versus open with the same other mechanisms available. They exclude enemy movement, combat, acceleration, and cooling; they are not measured travel times.

| Connection and endpoints | Before | After | Distance saved |
| --- | ---: | ---: | ---: |
| Loading lift: emitter `(190, -124)` to old loading apron `(108, -84)` | 418 | 122 | 71% |
| Garden bridge: gallery `(234, -164)` to garden `(-119, -318)` | 717 | 507 | 29% |
| Optical service bridge: gallery `(234, -164)` to restoration yard `(146, -389)` | 325 | 313 | 4% |

The loading lift provides a substantial return benefit. The optical service bridge barely improves the existing route, partly because unintended crossings already connect the regions. Fix topology before remeasuring shortcut value. Several long connectors and the express junction also lack strong destination-specific silhouettes; screenshots show same-level overlapping road surfaces at the bypass crossing. Shorten unnecessary connector travel and give branch destinations visible mechanical landmarks, preserving quiet spaces with a clear compositional purpose.

### Recommended implementation order

First restore the physical ability graph and correct blocked acceleration and dormant enemy response. Then repair the first Phoenix and reflection lessons and the unsafe rest pockets. Finally rebalance the guardian, remeasure shortcuts, and improve branch composition. Repeat both normal-combat route orders afterward, then conduct a first-time navigation playtest before expanding R7. These corrections remain proposals until implemented and revalidated.

## Verification and remaining tuning

Node checks cover both independent Phoenix entrances, Phoenix-before-Laser gating, the independent Cannon restoration route to Water Circulation, the inaccessible cold return landing, supported encounter/checkpoint clearance, permanent mechanism serialization, full-speed shutter impact, finite reflection, range/occlusion, final-ray rear hits, Heat, and sustained conveyor movement. The loading lift is required to remove at least half the former supported walking distance between the emitter and old loading apron. This is a measured geometric comparison, not a claim that every connector meets the travel-time target.

Browser scenarios exercise real projectiles, held Laser input, reflected receiver activation, both momentum entrances, maximum-speed guard destruction, armour rejection, rear reflection damage, red contact, the long opposing lane, optional signal, rest, and reload. Continuous navigation scripts drive both a freight/optics-first order without Magnetic Traction or Flotation and a flotation/circulation-first order without Mortar. They disable enemies to isolate route geometry; combat is checked separately. The existing R1–R3 checks remain part of regression verification. First-time discovery, sustained combat pacing, and the complete world's ending still require further playtesting and implementation.

The settings menu includes an independent middle-game preview at `?chapter=4`, starting in the outer observatory with Cannon, ordinary Overdrive, and Mortar. It grants none of the three later modules and does not replace the full-journey save. Existing saves default missing module and mechanism fields to unacquired/closed.

## Playtest Observations — 2026-09-08

Historical baseline: these findings motivated the authorized polish pass recorded below. The check used real browser keyboard movement from the start through the entrance conveyor and first enemy, screenshot inspection, source inspection, and separately configured deterministic combat scenarios. It was not a complete blind or uninterrupted human playthrough; first-time navigation and full retry pacing remain unmeasured.

1. **Confirmed: Scout charge warning understates its damage width.** The warning strip is 1.2 units wide (0.6 half-width), while charge damage sweeps the Scout's 1.5-unit radius against the player's 0.8-unit hurt radius. A targeted scenario placed the player centre 1.6 units from the charge line, putting its entire hurt radius outside the warning strip, and still reduced HP from 50 to 45. Make the warning describe the swept attacking body so visibly clearing it with the player's hurtbox actually avoids the charge. Reassess Elite charge telegraphs against the same rule.
2. **Confirmed behaviour; pacing concern: Boss windows still cap damage at two hits.** In one configured core vent window, three successive shots produced core HP 5, 4, 4 while player Heat rose to 20, 40, 60. The third shot costs Heat but cannot damage the still-venting Boss. The shields/core visuals do change after the cap, so this is not a claim of entirely missing state feedback. Consider removing the hit quota and balancing the physical opening, enemy attacks, and player positioning instead, consistent with the earlier Elite change. The subsequent polish request authorized removing this quota.
3. **Visual/narrative concern: spatial roles and recycling purpose need stronger environmental distinction.** The entrance and maintenance route share broad green slabs, railings, and similar machinery. The opening communicates awakening more directly than rejection/recycling. Candidate improvements are locally distinct machinery silhouettes, visible scrap moving toward a furnace, and clear repair-versus-recycling actions. Preserve wordless discovery and avoid objective arrows. Whether the current similarities actually make new players lose the return route needs a first-time player test.

Proposed priority: correct charge-warning fairness first, then revisit Boss attack-window pacing, then improve environmental distinctions and opening story readability. Retry-route duration and higher-gallery aiming need separate hands-on checks before being reported as established problems.

The playable build now includes the Recycling Foundry, Empty Transit Hub, and Sunken Gardens, including Magnetic Traction, Flotation, and both approaches to the original Mortar rig. The implementation records below define their exact scope. Laser, Phoenix, Water Circulation, the interiors of R4–R7, and the final story acts remain future work. All future game-design decisions belong in this document; implementation and execution instructions belong in the version README.

Normal play and both regional previews retain their separate save slots. Older unsolved saves initialize the new pressure/contact inputs unheld. Existing completed plants also restore an open pipe, preserving their completed appearance. Tests cover incorrect routing, obstruction and recall, docking migration, weight release, premature shots, occupancy rejection, gutter detents, continuous contact, interrupted rotation and flow, and saved completion. Full-world and browser checks retain the original regional ability gates and verify actual Cannon impacts, local driving, close-range mouse fire, wall interception, repair, and reload.

These changes address the confirmed warning and quota issues and implement the proposed environmental distinction. Browser scenario checks establish mechanics and progression. Screenshot review establishes visible composition in the inspected scenes; it does not establish first-time navigation success, a ten-minute blind playthrough, or final subjective audio balance.
## Rendering Optimization — 2026-09-15

Static geometry now uses three complementary paths. Repeated opaque geometry with at least four copies in a 32-unit spatial cell uses `InstancedMesh`. Other opaque geometry is merged by material and vertex layout within each cell, preserving useful culling bounds. Transparent objects share `BatchedMesh` buffers with per-instance sorting and culling. Source shadow flags are preserved, and main-camera and shadow-camera rendering retain independent culling. A broader `BatchedMesh` implementation was measured first; its extra rendering cost at high pixel density made cell-local opaque merging the better choice for this scene.

Long static boxes are generated as flat segments no longer than 32 units on either horizontal axis. This covers foundations, corridors, and long rails, including rotated structures; their collision rectangles remain independent. Thin markings and floor plates with a shortest dimension at most 0.08 units and a requested bevel at most 0.05 units use ordinary boxes. Main tank silhouettes keep their rounded geometry. Repeated cylinders share geometry; temporary pulse rings and module spheres retain individual ownership and disposal.

Only presentation uses the distant-animation clock. Nearby or active enemies animate every simulation step; distant poses, conveyor slats, repair petals, and background machinery update approximately ten times per second, carrying elapsed time forward. Combat, projectiles, collisions, conveyor transport, and puzzle timers still run at 60 Hz. Enemy render visibility uses conservative spheres against both camera frusta. Static matrices remain fixed, and enemy local matrices are refreshed when their poses change.

The minimap redraws at up to 15 Hz while health, aiming, and heat feedback retain their original update rate. Pausing or opening the map stops repeated scene rendering and simulation. Resize, quality changes, and resume invalidate the image. Browser animation callbacks remain available to process input without a busy simulation loop.

Validation uses `npm test`, `npm run build`, and the existing browser scenarios. `scripts/rendering-check.js` additionally checks triangle and geometry-buffer budgets in five regions, pause/map inactivity, resize and quality invalidation, resume timing, and runtime/shader errors. The observation code is injected only by the browser harness. Local measurements and before/after screenshots are retained in `output/playwright/optimization-2026-09-15/`.

The comparison used headless Chrome 152 with ANGLE Metal on an Apple M3 Max, high quality, and the same five region positions. At the observatory, scene geometry arrays fell from 577.4 MiB to 37.2 MiB, and triangles across the main and shadow passes fell from 11,084,890 to 564,738. At 1280×720, mean GPU timer duration fell from 3.97 ms to 1.23 ms. At 1920×1080 with a 1.75 rendering ratio (3360×1890 backing buffer), it fell from 6.74 ms to 2.85 ms. Short samples maintained approximately 60 rendered frames per second. These geometry sizes exclude additional GPU copies, instance matrices, and textures; timer duration is not GPU utilization.

There is a measured CPU tradeoff: observatory render submission increased from 2.82 ms to 4.45 ms, while simulation/HUD work decreased. The final implementation favors substantially less geometry storage and GPU work without a frame-rate regression on the tested machine. Comparisons included 16-, 32-, and 64-unit cells, multiple instancing thresholds, and opaque `BatchedMesh` versus merging. These short measurements do not establish low-end device performance or a long-session thermal result.

## Empty Hoist — 2026-09-15

The vertical subregion connects the R2 loading balcony to a shaft with supporting heights of -8, 0, 8, 16, and 24. Its ground checkpoint is appended as hive 21, preserving existing save indices. `?chapter=hoist` starts a separate preview with Cannon, Overdrive, and Magnetic Traction; the settings menu exposes this preview. The full journey reaches the same entrance physically from R2.

`hoist-layout.js` describes supported decks, inclined ramps, water, and lift stops. `hoist.js` owns the local machinery, vertical support, spatial ray intersections, encounters, presentation, and persistent state. The existing flat-world movement remains in use outside the region. Ground endpoint seams accept support from both regions; elevated transport does not activate ground-level interactions, contact attacks, or conveyor forces. Ordinary enemies and obstacle bounds remain available to outgoing shots at those endpoints.

The initial ascent includes a ballast carriage, a tank-weight-operated platform and ratchet, a hanging-load latch, and a cycling carrier with a shootable brake and safety rail. The main hoist unlocks 0/8/24 travel; the 16-unit transfer floor connects to the crown by a supported ramp. Landings have recall controls. A hull straddling a platform edge pauses motion, and a descending platform waits above an occupant below it. Solved mechanisms survive rest, death, and reload; ordinary defenders reset while the optional sorter stays defeated.

Cross-floor Cannon and Laser fire use spatial rays; floors and ceilings intercept shots from either side. Mortar keeps its finite range and one landing reticle, with a blocked-trajectory cue under a ceiling. Foreground decks fade as complete structures without becoming permeable. The local map emphasizes the current height, names lifts, and marks the two regional exits. The sump service cart travels in an overhead cargo cradle and parks away from the player route. The sorter controls a suspended cover crate, and the sustained lane has visible moving slats and opposing arrows.

### Verification and fixes found during play

- `npm --prefix v2 test`: **79/79 passed**, including 15 new vertical-region tests covering support layers, water, ramp/render agreement, lift occupancy and recall, regional seams, reflected height changes, roof interception, single Mortar damage, isolated fading materials, and descending shots versus cover.
- `npm --prefix v2 run build` and `git diff --check`: passed. Vite retains its advisory about the main bundle exceeding 500 kB.
- Existing browser checks: **140 assertions passed** across Foundry (14), Transit (23), Gardens (16), small puzzles (20), middle-region acquisition/combat (36), middle-region regression (13), and rendering/pause checks (18).
- `hoist-walk-check.js`: **21 continuous route legs**, using the initial three abilities, shooting mechanisms and defenders, without position changes, invulnerability, or added abilities during the ascent. The route reaches the crown and restores the main hoist without death.
- `hoist-return-check.js`: **49 continuous route legs and 11 assertions**, including both directions on the main and optical lifts, the sump descent and Flotation loop, a failed cold-Phoenix sustained crossing, the successful Circulation crossing, its dry bypass, and arrival in the R4 outer ring and R6 service yard. Later abilities are explicitly supplied for the revisit test; travel itself uses the normal movement/heat rules. Repairing at the checkpoint is part of the route.
- `hoist-scenarios-check.js`: **8 assertions** for single-reticle optical reflection, a blocked Mortar launch, a red-hot run-up against the sorter, death recovery, ordinary-enemy reset, and persistent state after reload. These focused scenarios place the player at their starting locations; they complement rather than replace the continuous route checks.
- `hoist-input-check.js`: real browser keyboard and mouse events, without simulation stepping or position changes, verified walking, sustained right-button traction, boarding and leaving the weight lift, locking the ratchet, shooting the hanging-load latch, map access, and idle rendering while paused. The player retained full HP.
- Development and production screenshots were inspected. The production preview accepted keyboard movement and mouse fire, exposed no `window.__game`, and reported no runtime errors.

Play exposed and corrected lost magnetic attachment after the carriage moved, overhead floors stealing the latch aim, overlapping ride/ratchet interactions, ordinary call switches intercepting brake shots, a visually reversed slope, hull rejection at a ground-region seam, an optical lift originally placed over existing cover, and a fading canopy sharing its material with distant structure. The optical landing was moved to clear ground. The sustained lane has a real cold-start run-up, covers its complete supported width, and cannot be bypassed through the neighboring express spine. The carrier safety rail prevents simply walking off during its unbraked upper dwell.

### Scope of the evidence

The scripted known-route ascent takes about **53 seconds after the opening**, while the restored route takes **14.9 seconds including lift waits**, exceeding the 50 percent shortcut target. These are execution timings for a route whose solution is already known, not estimates of a first-time player's exploration duration. The original 25–35 minute first-visit suggestion has **not** been established by blind playtesting; this layout concentrates on the complete vertical loop and ability returns rather than padding waiting time. No independent first-time human playtest or low-end hardware certification is claimed.

Short local Chrome samples with shadows enabled, at five shaft locations and with Mortar trajectory checking active, remained around **59–60 FPS**. Geometry backing arrays were approximately **37.44 MiB** for the complete world; the sampled main-plus-shadow passes remained below **160,000 triangles** in the shaft. These counters exclude texture allocations and do not measure GPU utilization or long-session thermal behavior. The existing two-million-triangle/64-MiB geometry checks also passed in the old regions.

Reproducible browser scenarios live in `v2/scripts/hoist-*.js` and use the existing Playwright CLI workflow against port 5174. Ignored outputs, screenshots, and detailed results are under `v2/output/playwright/hoist/`. Design decisions and acceptance criteria remain in `Gamespec.md`; this section contains implementation and verification evidence only.

### Visual defect correction after player feedback — 2026-09-15

The initial route checks did not establish acceptable presentation. Browser reproduction showed large changing triangles at overlapping floor faces and at the docked main lift. Disabling shadows did not remove the depth conflict. The original cutaway also faded floors to 12 percent while leaving their opaque rails, cover, and gantries across the playable view.

Flat deck rendering now subtracts previously covered rectangles, retains the authored collision union, and recesses the ground slab beneath the main lift by 0.12 units. Panel seams share world coordinates. The first correction used opaque cutaways for a whole deck, its rails, supported props, and enemies, plus overhead lift platforms and their cables. Player review rejected the abrupt disappearance; the smooth transparency revision below supersedes that presentation. The camera-facing projection has separate hide/restore margins to prevent boundary chatter. Hidden geometry remains physically solid and is excluded from pointer aiming. Hidden defenders cannot start unseen attacks. Foreground decorative crossbeams, interior corner posts, and dense floor scratches were removed.

The visual regression harness (`scripts/hoist-visual-check.js`) freezes simulation and perturbs the actual camera by 0.0001–0.0003 world units while reading the WebGL framebuffer. A negative control restoring overlapping authored decks failed with 46,009 pixels changing by more than 25 channel levels in a 1280×720 frame. The corrected five-location run peaked at 245 changed pixels, below the 0.1 percent threshold; remaining changes were confined to small rasterized edges. This test detects depth instability; it does not judge composition by itself. Screenshots and the real-input trace were also inspected, including ascent and the sump where an overhead platform previously covered the hull.

Unit checks now total 83 and cover generated floor overlap, the recessed platform base, complete cutaway/restore behavior, opacity isolation, and physical ray interception through visually hidden floors. Verification artifacts for this correction are retained under `output/playwright/visual-fix/`. The earlier 79-test and rendering measurements above describe the initial implementation, not proof that its presentation was acceptable.

The corrected build also passed the 21-leg ascent, 49-leg ability/shortcut return, eight focused combat/persistence checks, and actual keyboard/mouse traction and latch interactions. A 906-frame input trace was captured and sampled for visual review. The production build accepted mouse fire with visible heat feedback and exposed neither the test API nor the injected visual probe. Five short high-quality rendering samples remained near 59–60 FPS with 37.41 MiB of geometry arrays. These are local checks, not a new claim of blind-player or low-end-device acceptance.

### Smooth occlusion transparency

Foreground structures now remain visible at 8 percent opacity and transition to or from full opacity over approximately 0.23 seconds. Decks, rails, supported props, defenders, platforms, and cables share the transition. Hysteresis and the geometry-overlap fixes remain in place. Transparent rail batches retain per-instance sorting, faded surfaces do not write depth or cast opaque shadows, and material clones isolate the effect from the rest of the world. Each mesh retains its original opacity and depth-writing policy, including soft contact-shadow planes. Faded geometry still blocks physical shots, while pointer selection ignores the foreground obstruction and faded defenders remain inactive.

The updated unit suite has 84 tests, including synchronized deck/trim fades, nonzero silhouette opacity, intermediate transition values, full restoration on ascent, and preservation of contact-shadow depth behavior. Artifacts for this revision are in `output/playwright/hoist-fade/`.

The transparency revision passed the real keyboard/mouse input check, 21 ascent legs, 49 return legs, eight focused combat/persistence scenarios, and the five-location framebuffer stability check (maximum 244 changed pixels). The captured 884-frame input trace was sampled through the lift ride and gallery traversal. Short high-quality samples remained near 59–60 FPS, with 37.43 MiB of geometry arrays. Build and whitespace checks passed.

### Direct-fire aiming height

The vertical-region pointer picker previously returned the floor surface for ordinary fire. Subtracting the barrel's 1.5-unit firing height from that point made every empty-floor aim slope downward; the browser reproduction measured approximately 12 degrees on the loading floor and 27 degrees at close range in the gallery. Upper targets already pitched upward correctly, ruling out a reversed rotation sign.

For Cannon and Laser, an exposed floor or lift now selects a firing plane 1.5 units above its supporting surface, intersected with the same pointer ray. Empty space uses the player's firing plane. Actual enemies, machinery, walls, and mirrors retain their hit heights, and Mortar retains its ground landing. The change affects both the visible barrel and the actual firing direction through their existing shared aim point.

The 86-test unit suite and build pass. `scripts/hoist-aim-check.js` verifies actual barrel pitch and firing direction for ground Cannon, the gallery beneath transparent decks, ground Laser, an upper latch, a lower ballast target, and a Mortar landing. The two ordinary-floor reproductions now have zero pitch; upper and lower targets retain opposite pitches. Artifacts are under `output/playwright/hoist-aim/`.

Real keyboard/mouse traction and latch shooting also pass, and the 21-leg combat ascent still reaches and restores the main hoist without death or browser errors.

### Reticle follows the elevation boundary

Direct fire now exposes one constrained aim point, retaining the selected horizontal position and clamping its height to the exact +/-40-degree firing cone. Both the projectile direction and the displayed reticle derive from that point. Pointer picking remains independent, so a reticle at the boundary cannot feed its corrected position back into mouse intent. Reachable aim points pass through unchanged. Mortar retains its ground-landing projection, and flat-region aiming is unchanged. No angle-limit text or additional aim marker is introduced. The interaction rule is recorded in `Gamespec.md`.

The 87-test suite covers upper/lower limits, further motion beyond the boundary, returning to reachable targets, and shared reticle/fire direction. `hoist-reticle-check.js` uses real mouse movement and checks the DOM reticle against the projected constrained point, the barrel angle against the firing direction, and the presence of exactly one reticle. It covers Cannon and Laser limits, moving the pointer back into range without changing the firing position, level fire, and Mortar. Artifacts are in `output/playwright/hoist-reticle/`.

All six reticle scenarios and six existing aim-height scenarios passed without runtime errors, followed by real keyboard/mouse machinery interaction and the 21-leg combat ascent. Build and whitespace checks passed. The test browser was closed after verification.

### Wordless machinery and shot discovery

Removed the hoist's scene-text sprites, notice state and status element, and map captions. In-play mouse bindings now use button silhouettes, while settings keep readable binding names. The map uses floor bars and lift arrows. The gameplay rules are recorded in `Gamespec.md`.

Orange paddles now operate the ballast release, gallery ratchet, landing calls, and crown drive through ordinary projectiles. The ballast continues traveling after an interrupted save, and Magnetic Traction remains an alternative. Impact feedback includes local recoil, sparks, and mechanical or rejected-metal audio. The counterweight has a visible pulley connection; the released pallet descends and the carrier rail retracts. The brake lamp brightens during the existing alignment dwell. Upper call paddles are offset from the ratchet and brake firing lines. Express lift access follows its broken shutter state, preserving the physical Phoenix gate when a projectile operates a call.

R2 track controls and R3 gutter cranks accept Cannon impacts as well as their existing hull interactions. A pump impact produces a short pressure impulse; continuous tank weight remains the way to hold the deck up for its retaining-pin shot. Occupied-basin rejection is retained. Each impact paddle owns its animated material, preventing a hit from recoloring other orange objects.

A real-mouse reproduction found that clicking a raised R2 paddle still aimed at the ground behind it. Small-puzzle pointer selection now intersects the visible paddle, pin housing, pipe plug, or carrier brake before choosing its horizontal firing target. Actual projectiles continue to respect intervening geometry. Mortar and unrelated floor aiming are unchanged.

Validation artifacts are under `output/playwright/hoist-wordless/`:

- 93 Node tests and the production build pass.
- `hoist-wordless-check.js`: 21 movement legs reach the crown and restore the main hoist using only movement and Cannon; defenders and normal heat remain active. The legacy traction/interaction ascent also passes.
- `hoist-wordless-input-check.js`: actual keyboard movement and mouse clicks release ballast, ride the lift, engage the ratchet, and shoot the latch; opening the floor map and pausing also pass.
- `puzzle-shot-check.js`: seven actual mouse-shot checks cover both rail paddles, both cranks and a repeated turn, the pipe, and the pump impulse. Water reaches the planter and the unweighted pump drains afterward.
- The existing 20-check small-puzzle traversal still passes, including failed attempts, hull controls, wall interception, physical shortcuts, repair, and reload.
- The 49-leg hoist return route passes all 11 checks, including the restored lift, sump, hot lane, and both regional exits. The restored entrance-to-crown trip takes 14.9 simulated seconds including waits.
- All six reticle cases pass. Five framebuffer stability locations remain below the existing threshold, with at most 250 changed pixels out of 921,600 under subpixel camera changes. Five short high-quality samples measured 59.4–60.4 FPS and 37.69 MiB of geometry arrays on this machine.

Screenshots of the gallery, floor map, and restored gutters were inspected. These checks establish input behavior, traversal, recovery, and rendering; they do not establish first-time human discovery time or subjective challenge. Those remain playtest judgments, without adding explanatory prose back into gameplay.

The built production preview also loaded without runtime errors, displayed no gameplay prose, omitted the development API, and opened settings successfully. The test browser and temporary production preview were stopped; the user's development server remains available.

### Folded-city playable proof — historical milestone

This subsection records the initial three-region proof. The complete city described below supersedes its entry defaults and unfinished-region limitations.

The first R2–R3–R5 folded loop is available from settings or `/?chapter=folded`. It has its own scene and save slot; the existing six-region journey remains the default entry. `/?chapter=folded&route=freight` selects a second independent save starting with Cannon, Overdrive and Mortar, without Magnet or Flotation. The normal folded entry starts with Cannon, Overdrive and Magnet. Flotation and Phoenix are acquired during play. This implements the first playable proof from `Gamespec.md`, not the complete seven-region relocation: the optical and circulation exits currently end at short, accessible outlooks after their Phoenix shutters.

`entry.js` selects the runtime before constructing a scene. Both runtimes share the existing tank/enemy models, audio, heat, speed, damage and Flotation definitions. `folded-layout.js` owns the proof's supporting surfaces, bounds and releases; `folded-world.js` constructs the view and swept ray intersections; `folded.js` integrates input, machinery, combat, checkpoints and the floor map. The original runtime receives only the new settings entry. The shared floor tessellator accepts the caller's lift footprints and recess depth, preserving the old hoist defaults.

The proof descends from the transport bridge to the canal at -16, crosses beneath the same bridge, climbs the far bank and rear dock at -8, joins the independent dry freight entrance at the common benches at 0, climbs to the carrier at 8, acquires Phoenix at 16 and reaches the roof at 24. The roof cage returns to the original turntable refuge. The split flywheel and its axle are shared physical scenery. The interior gangway opens a dry return before Phoenix, but the outer canal still requires Flotation. Upper cage calls stay unavailable until the rooftop release. Open gates and acquired modules survive death/reload; checkpoint identity restores its actual height.

The load latch and carrier brake respond to projectiles. The carrier demonstrates automatic motion before its aligned brake can be caught; afterward it remains callable from either landing. A partly boarded hull stops lift travel, while a fully boarded hull is carried continuously. The freight screen intercepts Cannon shells but leaves the Mortar arc clear. Phoenix's supported launch uses the shared 3.2× speed and ordinary acceleration. Both later shutters have sufficient supported runup. Enemy warnings require a visible, unobstructed attack lane, and both friendly and hostile projectiles test real floor/obstacle intersections. Guard frontal reduction retains armour audio and flashes.

Foreground floor patches, their trim, local machinery and obstructing posts fade with independent materials. Physics keeps the opaque geometry. Materials are transparent from their first shader compilation, even while opacity is 1; changing only the opacity/transparent fields after compiling an opaque Toon shader had left the geometry visually opaque. Floor patches are at most 12 units across, so an intrusion does not fade an entire roof route. Pointer selection ignores faded foreground objects, while the visible reticle and trunnion-centred barrel use the same constrained aim height. The selected map layer only changes its drawing; a separate dot marks the player's actual layer.

Validation on 2026-09-15:

- All 102 Node tests and the production build passed. The nine new tests cover continuous ramps, the water/bridge layer distinction, independent freight access, both Phoenix runups, persistent releases, supported enemy placement, the 40-degree aim bound and nonoverlapping floor geometry.
- `scripts/folded-walk-check.js` completed 34 consecutive movement legs with natural enemies, ordinary damage/Heat and no teleports or granted abilities. It acquired Flotation and Phoenix, opened the rear gangway, caught the carrier brake, crossed the launch shutter, restored the roof cage and returned to the original refuge. Revisiting the roof through the restored cage took 10.2 simulated seconds including movement and lift travel. This script uses informed aiming and stepping; it does not measure blind discovery or human first-play duration.
- `scripts/folded-input-check.js` used actual keyboard/mouse events to reject Cannon at the freight screen, open it with Mortar, enter the common benches without Magnet/Flotation, shoot the inside gangway release and retreat dry to the garden bank. It also checked layer selection, unchanged physical height/aim, pause and save/reload. Simulation time is advanced explicitly between these input events.
- `scripts/folded-scenarios-check.js` checked upper/lower real mouse aiming and one correctly projected reticle, solid bridge interception versus the open canal, half-boarding protection, full lift carriage and an upper-refuge reload. Five high-quality browser samples measured 59.9–60.0 FPS, 148–238 draw calls and approximately 1.91 MiB of scene geometry arrays. These are short local samples, not total GPU-memory or low-end-device measurements.
- Subpixel camera checks initially reproduced coplanar side faces between the parked cage and its recessed slab, then coplanar tops between supporting piers and the common floor. Lowering the slab below the cage underside and separating pier/wall tops removed these conflicts. The final five views changed at most 181 of 921,600 pixels under ±0.0001/0.0002 camera offsets, below the existing 0.1 percent threshold. The rendered screenshots were inspected, including the canal, suspended load, roof and floor map.
- Production smoke checks loaded the original entry and both folded entries, opened settings, and confirmed a single reticle and no development API, with no browser errors.

The dedicated test browser and temporary production server were stopped after verification; the existing development server was preserved.

Artifacts are under ignored `output/playwright/folded-city/`. Use a dedicated browser session: the route scripts clear only that browser's corresponding folded preview save. The full world still needs regional relocation and sustained human exploration testing; this proof establishes the first continuous vertical circuit and its recovery paths.


### Complete folded city

The default entry and `?chapter=folded` now start in the Foundry with Cannon and use the independent `furnace-born-v2-city` save. The former journey remains at `?chapter=legacy`, with its existing save untouched. Explicit `route=garden` and `route=freight` fixtures retain the earlier middle-entry saves. Only one runtime and scene are constructed for an entry.

`folded-city-layout.js` extends the original R2/R3/R5 circuit with authored supporting surfaces, actual shafts, opposing conveyors, finite mirrors, module locations and releases for R1/R4/R6/R7. It includes all twelve designed returns. Every lift has two physical landings and a protected shaft. The loading return arrives outside the enclosed Mortar latch; the three optical returns unlock before the guardian. The pressure return reaches the garden industrial terrace and the transit inner ring, while the predecessor approach still has a distinct sustained conveyor.

Movement substeps use the highest surface reachable within the existing step tolerance. This prevents a lower overlapping landing from capturing a returning tank below a ramp. The hull cannot enter insufficient headroom, leave unsupported ledges, board a departing lift halfway, or select a remote upper floor. Rendered flat surfaces are still tessellated to avoid coplanar overlap. Foundations give major terraces physical mass; foreground floors, tall masses, props and receiver roofs use local transparency while retaining their physical projectile bounds.

The full campaign acquires Overdrive, Magnet, Flotation, Mortar, Phoenix, Laser and Circulation in the world. The ordinary Cannon retains its 24-unit range. Laser sweeps use three-dimensional final-segment direction for rear damage; the line reuses a fixed twelve-vertex buffer with a matching draw range, including when the number of reflections changes. The optical inspector reflects incoming frontal beams. All weapons share the existing Heat budget, and Circulation preserves boosted movement and red contact during overheat.

The Foundry retains its relay/Prototype/Overdrive/Overseer sequence and 4 + 4 + 6 HP boss allocation, with timed visual armour openings. The keeper has two independently visible feed assemblies and a central drive. Assemblies stop their physical belts when destroyed. Maximum red contact carries remaining damage through assemblies; no per-attack quota discards it. Ordinary encounters reset on repair/death, while special defeats, acquired modules, machinery and shortcut releases persist.

Shot receivers, magnetic traction, a hull-weight pump, a ratchet, mirrors and automatic/callable carriers provide wordless interactions. The shared press, flywheel and coolant mains give nearby levels recognizable moving landmarks. The optional tender and array visibly respond to restoration. Two seconds of deliberate docking closes the clamps; releasing the input or moving cancels before commitment. The ending preserves a return to the final refuge, with the keeper defeated and all opened connections retained. Its continuation is available through the system menu.

Rendering retains shared primitive geometry and spatial static batching. Unchanged opacity avoids repeated material traversal, distant conveyor slats skip visual updates, and remote enemies skip visibility rays while collision/progression remain authoritative. The browser route API is development-only.

Complete-city verification:

- `npm test`: 114 tests pass, including both entry routes, independent late branches, sustained-Heat rejection, the shared water/Mortar apron, all shaft clearances, both ramp directions, the completed-foundry return and unrestricted red damage through Boss components.
- `folded-campaign-check.js`: 37 continuous legs from a fresh Cannon-only Foundry start through the relay branches, Prototype, Overdrive, Overseer, transit arrival, Magnet and Mortar acquisition, and the loading return. Enemies, ordinary damage and Heat remain enabled; repairs use actual Hives.
- `folded-walk-check.js`: the existing 34-leg Flotation/Phoenix circuit still passes, including the same bridge underpass, the inside gangway and the roof cage. The restored cage journey takes 10.2 simulated seconds.
- `folded-late-route-check.js`: 69 legs for Laser-first and 92 for Circulation-first. Each begins at the reached Phoenix roof as an explicit fixture, without Magnet, Flotation or Mortar. Each acquires both later abilities, rides the loading/garden/yard returns, opens the pressure bypass, takes the distinct predecessor lane, rides the final cage both ways, defeats the keeper with ordinary Cannon fire while moving, and reaches voluntary docking. No invincibility or enemy-health changes are used in these route runs.
- `folded-input-check.js`: real keyboard/mouse traversal, Cannon rejection and Mortar acceptance at the freight latch, the independent freight route, dry gangway return, graphical map layers and reload all pass.
- `folded-city-interactions-check.js`: isolated fixtures verify the protected loading-return firing angle, open-topped Mortar entry, tilted mirror reflection, rejection of a direct receiver shot, guardian frontal armour and reflected rear damage, full red contacts against guardian and keeper, weight-plus-shot pump operation, the pressure receiver, optional signal restoration, docking cancellation, commitment and continuation. Full-speed red fixtures yield guardian HP 36 → 12 → 0 and keeper HP 48 → 24 → 0. These fixtures establish individual interaction rules, not an unaided playthrough.
- `folded-recovery-check.js`: actual enemy contact kills a 1-HP test fixture. Automatic respawn and reload restore the final refuge at its correct height, preserve the final cage and keep the keeper defeated.
- The eleven-location visual suite checks the bridge, canal, load, carrier, roof, foundry, emitter, rig, pressure landing, predecessor refuge and furnace. It verifies real transparent materials, a single reticle, the ±40° barrel limit, floor interception, half-boarding protection and upper-refuge persistence. Short high-quality samples on this machine remain approximately 60 FPS, with 170–372 draw calls and about 4.97 MiB of geometry arrays. Subpixel camera perturbations changed at most 246 of 921,600 pixels, below the existing 0.1-percent stability threshold. This is not total GPU allocation or a low-end-device guarantee.
- The production build loads the full-city default, both independent middle previews and the legacy journey, opens settings, shows one reticle and exposes no development API. Browser runs report no page errors.

The route drivers use known waypoints and visible target positions. They demonstrate continuous traversal, recoverability and combat completion, but do not measure a first-time human player's discovery time or subjective difficulty. Gameplay remains wordless; testing and implementation details stay here rather than in `Gamespec.md`.

After verification, the dedicated `furnace-city` browser and temporary production preview were closed. The existing development service was preserved. Ignored screenshots and result logs are under `output/playwright/`.

### Folded-city playability revision — 2026-09-15

This pass addresses the reported sparse encounters, incomplete prop cutaways, conveyor readability, unclear machinery, missing repair/reconstruction motion and slow empty returns. It retains the previous uncommitted city implementation and the v2 legacy runtime. No v1 source or assets were used.

`folded-world.js` now registers complete object subtrees for cutaways, including child trim, spatially batched scenery, machinery, controls, Hives and enemy parts. Materials preserve their original opacity and shadow settings. Distant-floor actors are subdued independently of actual obstruction; only actual cutaways are omitted from pointer selection. Physical shots still intersect floors and active walls. Static scenery is batched within 12-unit spatial cells. Conveyor assemblies follow sloped supporting decks and retain their phase when stopped. Hive proximity, repair and respawn drive distinct mechanical tool and scan motions.

Ordinary enemy squads combine close pressure and ranged support, share a short alert, and pursue only within a bounded home area. Scouts approach before their charge warning; the former warning range exceeded their actual charge reach. Quiet Hive pockets suppress fresh engagement until the player attacks. The cannon's previous sphere/tail silhouette is restored without changing its collision radius, range or damage. Floating travel rises from 0.75 to 1.15 times base speed while deployed dry driving retains its previous multiplier. The press canal gains a local loop; Phoenix gates on long optional approaches are encountered near their entrances.

Blind-review build 1 was copied from a passing production build and served independently on port 4183. Three reviewers began with no project history or implementation access, using only screenshots and ordinary input in separate First-region, Garden and Freight previews. Each spent over 90 seconds in active play, excluding tool reading and menus. All three rejected first-time discoverability: overlapping floors looked mutually accessible, the original map lacked door/device information, and machinery effects were difficult to connect with routes. None completed a region. Damage taken while tools left the browser idle was not treated as evidence of unfair combat balance.

Review build 2 on port 4184 adds screen-aligned maps with nearby route discovery and nonverbal machine/door/lift/module marks, subdued actors on other floors, stronger closed-door edges, bullseye shot receivers, an immediately visible first-relay shutter, contact pickup installation and pictorial demonstrations of preview starting equipment. The same reviewers repeat their independent tests without a walkthrough or access to other reports. A repeat reviewer is no longer a fresh player; the first passes provide the cold-start evidence.

The second reviews confirmed usable improvements: the Foundry reviewer recognized and shot both bullseyes, interpreted the two conduit states, and repaired from partial to full health; the freight reviewer used the rotated map to find the Mortar receiver and visibly lowered its enclosure. All reviewers still rejected navigation in their tested slices. The Garden reviewer never found Garden progression from the shared hub. The Foundry screenshots isolated a narrow unsupported shoulder between the reclamation path and its adjacent ramp.

Build 3 puts Garden/Freight previews at new local entrance Hives, adds rail/seam silhouettes to ramps, reuses the HUD Phoenix emblem on momentum shutters, and restores a distinct Mortar impact blast/sound. Build 4 also fills the reclamation entrance shoulder without extending it into the Prototype lock. The third Foundry/Freight passes use build 4; the third Garden pass uses build 3, whose Garden geometry and runtime are identical. These remain repeated reviewers, not newly recruited cold players.

The third Foundry reviewer completed the relay, Prototype, Overdrive and local return loop and approved that tested slice. A fourth focused pass on build 7 retained that approval after approximately 47 seconds of active input, checking both switches, the repaired junction and visible enemy wrecks. This is not a claim of full-region completion. The third Garden pass acquired Flotation, crossed water under fire and returned to land, but still rejected an unavailable maintenance return: preview saves omitted the Foundry prerequisites. Build 7 applies those prerequisites to both fresh and existing middle-preview saves while preserving the checkpoint and independently acquired modules. The full campaign save is unaffected.

Build 7 also separates water visually with a blue Phong material and broken ripple texture, adds transient moving-hull wakes, collapses defeated enemy meshes into persistent dark wrecks until reset, covers the carrier brake outside its upper alignment window, and folds locked landing handles. The new browser regression checks exercise real repair/respawn animation, shell dimensions, complete occluder materials, sloped belt motion, projectile-created wrecks and brake availability. Preview input checks acquire Flotation through actual movement and open the freight enclosure using the Mortar, then verify migration of an existing incomplete Garden preview save.

The third freight observations exposed conflicting automatic travel and the manual E reversal prompt. Build 8 withholds carrier ride/call controls until the brake is released. A browser input regression verifies that E cannot interrupt the first automatic rise, an aligned shot releases the brake, and E then returns the carrier to the lower landing.

The latest Node run passes all 118 tests, and the production build passes with the existing bundle-size advisory. Eleven high-quality browser samples after the water/material changes measured 59.7–60.4 FPS, 126–469 draw calls and at most 9.22 MiB of geometry arrays. The maximum subpixel-change count was 231 of 921,600 pixels. These are short local samples, not total GPU allocation or low-end-device measurements. Production smoke checks cover the journey menu, all three current previews and the retained legacy entry, with one reticle, no development API and no page errors.

Both late-route orders also pass with natural enemies and Heat: 70 consecutive legs for Laser-first and 93 for Circulation-first, including regional returns, the final cage, the keeper and voluntary docking. The route fixture now approaches the pressure receiver's open front before aiming; its old remote position correctly hit the opaque housing roof. An ordinary 4.2-unit approach made the receiver visible and shootable without changing the game's collision or aim rules.

The fourth Garden pass approved the focused Flotation-and-return slice after approximately 86.4 seconds of active input. A direct shot changed the shore target and map state, removed the barrier, and five seconds of ordinary movement carried the tank beyond the formerly blocked corner. Blue water and wakes were judged clearer. Earlier movement against the still-closed door was not counted as a collision failure. The reviewer still noted some interpretation of overlapping transparent structures and initially targeted the enemy rather than the mechanism; neither prevented the verified return. The review browser was closed after this proof.

The fourth Freight pass approved the acquisition-and-return slice on build 8. After approximately 63 seconds of active movement/shooting, excluding observation and carrier waits, the reviewer had opened three gates, fought and repaired, ridden the automatic carrier, shot the exposed brake, acquired Phoenix, and manually descended and driven onto the lower floor. This was an informed regression: the reviewer had received the mechanism diagnosis after the third pass. A brief approach toward the Phoenix-emblem wall encountered another rail/level boundary, so the reviewer did not validate discovery or traversal of that exit. The earlier continuous route script establishes physical traversal, not independent first-time discovery there.

All three initially unfamiliar reviewers now approve their respective tested slices after four passes each. Their later passes are learned regressions, not three fresh confirmations of the final build, and none constitutes a blind playthrough of the complete city. The third Freight pass stopped at approximately 80 seconds on request; the last focused passes ended after decisive evidence rather than padding an input-duration quota. All reviewer browsers and dedicated production servers were closed afterward; the user's existing Vite server on port 5174 was preserved. Screenshots and command logs remain under ignored `output/playwright/`.


### Ability rules, machinery and enemy revision — 2026-09-16

This revision changes the folded-city runtime only. The retained v2 legacy journey is unchanged, and no v1 content was consulted. Gameplay rules are recorded in `Gamespec.md`; this section records implementation and verification.

The baseline browser probe reproduced an invisible empty magnetic shot, zero conveyor displacement for an idle enemy, a released carrier remaining at its upper stop, and only three ordinary enemy types. The optical route retained its first reflection, but the additional returns were direct receivers and a broad housing roof concealed the apparatus. The Foundry lacked an immediate opposing-belt exercise on the Prototype return.

`folded-machinery.js` shares conveyor transport between the player, living enemies, wrecks and mines, including sloped decks and disabled Boss feeds. Ordinary opposing belts now run at 7.8, endurance lanes at 16.8 and Boss feeds at 3.2 world units per second. The Prototype return adds a short opposing belt before the original entrance belt. The existing cold-Phoenix endurance tests still reject the Circulation gates.

Released lifts cycle with three-second endpoint dwell; the demonstration carrier starts on boarding. Landing calls remain available, but riding no longer has an E reversal target. Browser traversal exposed two additional faults: the boarding margin disagreed with movement support at a deck edge, and a fixed ground slab still admitted the hull underneath an absent platform. The margins now agree, and recessed shaft bottoms are excluded from walking support while the platform is away. Holding movement at a landing waits safely and boards the returning deck.

`folded-visibility.js` applies one continuous world-space aperture to floor and trim materials, including batched and instanced transforms. Individual pixels fade to a minimum alpha of 0.16 through a smooth radial transition. Mesh opacity remains 1; physical geometry remains solid. Pointer rays evaluate the same aperture at each intersection. The aperture includes nearby elevated and lower receivers; the suspended-load approach and pressure return were exercised from actual route positions, not only centered fixtures. Other machinery retains its complete-object cutaway handling.

Blue fittings, shields, cover, mine racks/discs and hostile mortar shells establish one magnetic language. The scan always renders a core, glow and moving rings, with periodic sound. A connected tether reverses its pulses and keeps a pulled mine attached while it moves; it never moves the reticle. Blue guards lose their plate after a sustained pull and are staggered, blue cover retracts persistently, mines can be disarmed or shot, and arcing shells can be captured. Ordinary switches use yellow/green status. Mine lamp geometry and materials are disposed when removed.

`folded-enemies.js` defines ten ordinary archetypes and seven additional procedural silhouettes. The runtime supplies committed charges, fixed lanes, frontal shields, orbiting bursts, tracking-then-locked instantaneous rails, delayed lobbed blasts, limited mine trails, flame sweeps, finite-rate repair through clear sight, and reflective inspectors. Squads retain shared alerts and bounded pursuit. Bosses and the Prototype are not counted toward ten. The welder's sector warning has a preallocated fifteen-vertex buffer and an explicit draw range; its sweep returns to two vertices without reallocating or leaving stale sector lines.

The optical branch now develops a visible tilted first mirror into an indexed second mirror. A shot receiver rotates the second face; two reflections open the garden return through a narrow aperture. The new receiver well lacks a supporting floor and blocks the tested direct approaches. Reflected rear attacks against the tracking guardian remain a third use of the same rule. Reused beam cores and mirror contact flashes make the path visible.

Verification:

- All 126 Node tests pass, including conveyor parity, repeated automatic travel, safe boarding into an initially empty shaft, continuous transparency and receiver selection, the ten-archetype roster, shield removal, and repair without resurrection. The production build passes with its existing shared-chunk size advisory.
- `folded-rules-check.js` uses real mouse input for empty/connected magnetic feedback, shield removal, cover release, mine disarm and Cannon detonation, shell interception, single reflection, indexed double reflection and reflected guardian damage. It verifies that a living enemy and a wreck each travel 3.9 units during half a second on the same belt. All ten actual AI state sequences run. A stationary rail fixture loses 11 HP while its sidestepping control loses none; the visible welder sweep deals damage. These isolated behavior fixtures are not a blind playthrough, and the state-sequence samples use invincibility to observe repeated attacks.
- The current early campaign completes 37 continuous legs with normal enemies, damage and Heat. The Garden/Phoenix loop completes 34 legs and rides the roof return in both directions without a ride interaction. Its measured revisit takes 20.93 simulated seconds including the wait for an automatic cycle; the previous 15-second bound assumed immediate manual dispatch and was replaced by a 25-second complete-cycle bound. The route driver also uses smaller movement steps near boosted waypoints to avoid oscillating past its arrival tolerance.
- Both late-route orders pass with natural enemies and Heat: 74 continuous legs for Laser-first and 97 for Circulation-first, including both later acquisitions, regional shortcuts, the final cage, keeper defeat and voluntary docking. Each begins from an explicit reached-Phoenix fixture; it does not grant the later upgrades or disable damage.
- The interaction, preview, input, aim, height-aim, HUD and recovery regressions pass. Repair and respawn motions, original Cannon dimensions, sloped belt visuals, persistent wrecks, yellow/green brake status and repeated automatic carrier travel remain verified.
- Eleven final high-quality browser samples measured 59.1–60.4 FPS, 138–463 draw calls and approximately 11.21 MiB of geometry arrays. Subpixel camera perturbations changed at most 235 of 921,600 pixels. Floor transparency, solid projectile interception, nearby vertical targets, one reticle, the 40-degree barrel limit and save/reload passed. These are short local samples, not total GPU allocation or a low-end-device guarantee. The magnetic and optical screenshots, continuous floor aperture and visible flame sweep were inspected.

The route drivers know the map and aim at known positions. This pass supplies input, combat and traversal evidence; it does not claim that automated success proves first-time discovery or subjective enjoyment. The previous blind reviews describe their earlier builds only.

Production smoke checks pass for the journey menu, full city, all three independent previews and the retained legacy entry: settings open, one reticle responds after pointer entry, no development API is exposed even with `?test`, and no browser or Three.js/WebGL errors are reported. The dedicated `furnace-rules` browser and temporary production preview on port 4186 were closed after verification. The user's existing development server on port 5174 remains available. Logs and screenshots are under ignored `output/playwright/rules-revision/` and `output/playwright/folded-city/`.


### Explicit journey completion — 2026-09-16

The original final-docking reproduction reached `endingSeen=true` and more than ten seconds of ending time, with no visible dialog and the ordinary combat HUD still present. The timer and save worked; the completion interface was missing. The old interaction check asserted only the saved flag and elapsed animation, so it did not detect this presentation failure.

The folded runtime now withdraws the combat HUD during rekindling and presents a dedicated “传火完成” system dialog after seven seconds, with a completion chord, Continue Exploration and Return to Journey Menu. The scene pauses under the completed dialog. Keyboard focus stays on its actions, and Escape or a focus-loss pause cannot cover it with settings. Continue restores the final refuge and existing progression; reload resumes exploration without automatically replaying the ending. The journey menu reads the existing completion flag and labels a finished campaign “继续探索 · 已传火”, including older completed saves. A circular indicator at the final socket makes the existing two-second contextual hold visible and clears on cancellation. In-world storytelling and puzzles remain wordless.

`folded-ending-check.js` first reproduced the missing screen, then passed the completed interface, hold progress and cancellation, keyboard focus, continuation, repeated docking, menu status and reload checks. The city-interaction and recovery scripts also pass. All 126 Node tests and the production build pass; the existing bundle-size advisory remains. Screenshots of the hold and completed dialog were inspected. Artifacts are under ignored `output/playwright/ending/`. The dedicated browser is closed after verification and the user's server on port 5174 is retained.

## Complete progression audit — 2026-09-16

The previous folded layout implemented Mortar and its freight enclosure, but the Flotation approach bypassed both its remote pickup and every required use. The earlier campaign, Garden and late-route callbacks tested separate slices; the late callback explicitly started after Phoenix without Mortar. Those checks established individual routes, not a complete acquisition experience. The accepted design also left completion-optional abilities unresolved. `Gamespec.md` now resolves that question and records acquisition, teaching, reuse and return roles separately.

Mortar retains the saved `mortarModule` identity and moves to the shared turntable bridge mouth at `(0, 0, 12)`. Its model has a raised cup, bright rim and bipod. A new `bridge-crane` enclosure gives it a safe first application. The existing freight enclosure remains the dry branch's second application. The shared `load` screen now physically shields its receiver from Cannon fire on either approach; Mortar arcs clear it before the carrier/Phoenix reward. Screenshot inspection moved this screen to the ramp entrance, where the overhead return deck does not conceal the target. No inventory predicate was added to this mechanism.

The new `inner-optics` shutter closes the inner conveyor's safe run-up. A mirror beside the rig reflects Laser into its receiver on a separate maintenance plinth. Circulation alone cannot cross the closed shutter; after its optical release, the existing sustained belt still rejects cold Phoenix boost/cool cycles. Thus Laser and Circulation remain independently obtainable but each has an actual physical application before the inner route. Docking still checks the keeper and the deliberate interaction, not an eight-item roster. Existing acquired-item and opened-machinery save flags are preserved; a completed older save is not reset to force the revised tutorial.

`folded-progression-check.js` starts each supported journey from a clean save and uses real movement, combat, Q/F/E input and actual pickups through docking and reload. It contains no `scenario` calls or ability, position, HP, immunity or progression assignments. Its scripted route knowledge is not a blind-player usability result. `folded-progression-gates-check.js` deliberately uses isolated, invulnerable fixtures for counterfactual firing positions; it must not be presented as a complete playthrough. Movement tests independently check the load screen across the ramp width, the optical shutter and the sustained conveyor with that shutter already open.

Verification of the revised layout:

- `npm test`: 127 tests pass. `npm run build` passes with the existing shared-chunk size advisory.
- Three uninterrupted new-save journeys reach the completion panel and preserve their progression after reload: dry freight/Laser-first (119 legs), dry freight/Circulation-first (142 legs), and Magnet/Flotation/Circulation-first (159 legs, all eight abilities including the starting Cannon). Ordinary enemies, damage, Heat, repairs, lifts and boss fights remain active. No browser page errors were reported.
- The isolated gate check rejects Cannon at the bridge screen and at nine near/side ramp positions, accepts the corresponding Mortar arcs, and accepts the reflected inner Laser path. The collision tests reject walking around the carrier screen and driving through the closed optical shutter. The sustained-belt test starts with that shutter open, so the new obstacle cannot conceal a broken thermal gate.
- Screenshots were inspected for the bridge enclosure, carrier screen, optical run-up and acquisition HUD. Artifacts and the machine-readable full-route results are under `output/playwright/progression/`. These results establish the tested routes and interactions; they are not a first-time-player discoverability or enjoyment verdict.

The updated HUD check also passes for all seven pickups, eight distinct ability cards, weapon switching, remapped controls, active states, narrow-screen layout and reload. The dedicated test browser was closed after verification; the existing development server remains available on port 5174.

## Readability polish and floor-depth repair — 2026-09-16

Normal-interface inspection found a dark, apparently missing square on the awakening platform that the Tank could drive across. Disabling shadows through Settings did not remove it. The floor aperture made every floor material transparent with depth writes disabled, allowing lower structural meshes to paint over otherwise opaque floor fragments. Each floor now shares a depth-only material that writes only where the aperture is effectively opaque. The transparent color pass still provides the continuous cutaway; physical raycasts remain on the original floor geometry. Floor markings receive the same aperture, and other elevations receive a gradual brightness reduction.

`folded-floor-depth-check.js` samples two neighboring portions of the actual rendered awakening floor. Their median colors now differ by two channel values. Disabling only the new depth meshes reproduces a difference of 35 and the false hole. This counterfactual is retained alongside screenshots of both outcomes. Six additional views cover the lower relay, hub, canal, carrier, optics and inner run-up, with no browser or shader errors. The final carrier sample was approximately 59.6 FPS and 542 draw calls over 1.5 seconds on this machine; this short sample is not a general hardware guarantee.

Visual changes reduce ordinary floor/edge/conveyor contrast, replace solid yellow lift plates with restrained boarding markings, expose local control cables and persistent shutter jamb lamps, and give the Foundry relays animated flywheel drives. These drives sit behind the firing lanes with matching solid bounds, clear of the existing turret spawn. The first scout moves into the awakening bay's initial view. The training and roof return bridges narrow to six units without changing their connection order. The freight preview now includes its already-completed rear bridge release, leaving the forward enclosure as the visible outstanding interaction.

Verification:

- All 127 Node tests and the production build pass; the existing shared-chunk size advisory remains.
- Three fresh-save scripted journeys traverse the narrower bridges, obtain the required abilities in both late-region orders, complete docking and survive reload. The water route includes all eight abilities. The driver aligns with the new roof bridge mouth at `(166, -28)` before boosting; its old heading at `z = -32` followed the removed edge of the wider deck. Movement, boost speeds and steering were not changed.
- After the final relay-drive placement and collision adjustment, the complete Foundry-to-Magnet/old-loading circuit passes again with enemies, damage, repairs and Heat active. Prototype and Foundry fights, Overdrive acquisition, both reverse belts and the return loop remain functional.
- The isolated Cannon/Mortar/Laser gate checks, repair/respawn and projectile-silhouette checks, automatic carrier checks and both preview interactions pass. The freight preview check additionally drives back across its completed bridge without firing before returning to open the forward enclosure. Preview save migration still preserves later progress.
- Normal UI checks used the menu, movement keys, pointer shooting and Q selection without the development API: the first scout can be seen and destroyed from the opening bay, the floor remains continuous while driving toward the west ramp, and a clicked freight receiver opens its shutters and changes its cable/jamb lights to green. The production build was separately opened from its normal menu and the first scout was shot. These are short direct interaction checks, not a complete unscripted playthrough or a blind-player enjoyment result.

Artifacts are under `output/playwright/polish-pass/`. The subsequent approved layout revision below supersedes this pass's retained overhead routes. Temporary browser sessions and the production preview are closed after verification. The user's development server on port 5174 is retained. No commit was made in this pass.


## Approved encounter-clearance layout — 2026-09-16

The training gallery now returns through its existing cycling lift. Its ratchet opens the partition before the Magnet cradle; four obsolete return decks above the Foundry are removed. The east relay platform and squad move beside the furnace court. Freight access uses two narrow edge ramps separated from both the loading cage shaft and the carrier. The outer Phoenix gate moves ten units along its approach to preserve a cold-start run-up.

The roof return moves north, with the refuge, upper cage control and boarding landing on that side of the shaft. Both call locations have supported approaches. The optical express return moves to the north/east perimeter, and the garden optical lift uses its northern landing; its old slab above the rear dock is removed. The bank defenders move into the exposed northern shore. Control feeders, drive colliders, save-anchor positions and route-check waypoints follow the changed geometry. Existing save anchors retain their IDs.

New geometry regressions intersect the fixed camera direction with every flat/sloped deck around ordinary enemies, bosses and ability cradles, before applying any transparent cutaway. They sample the center and a two-unit cross around each position. A separate negative traversal check attempts to cross from the relocated receiving ramp onto the carrier behind the closed Mortar screen. Existing tests retain lift-shaft clearance, supported hull travel, Phoenix run-up, both late-region orders and the independent thermal gate.


Roof bridge rails now use the same open-edge checks as the deck markings, leaving the new T-junction physically and visually open. This rendering-only adjustment followed the full-route checks and does not alter support or collision.

Verification after relocation:

- All 129 Node tests and the production build pass. The existing shared-chunk size advisory remains.
- Three fresh-save scripted journeys finish and retain completion after reload: dry/Laser-first (126 legs), dry/Circulation-first (150), and Magnet/Flotation/Circulation-first (165, all eight abilities). Damage, Heat, enemies, boss fights, normal pickups and cycling lifts remain active. The driver uses the north cage exit and explicit bridge corners; no ability or progression flags are granted by these runs.
- The garden-to-roof traversal additionally rides the restored cage in both directions. Returning from the original hub refuge to the roof takes 10.83 simulated seconds, including approaches and the automatic cycle.
- Cannon/Mortar/reflective-Laser gate counterfactuals pass. The floor-depth pixel counterfactual still distinguishes the repaired floor from the original false hole. The raised-platform aim check passes at the relocated landing, including 41 cursor positions, moving aim, the 40-degree barrel/shot limit and Mortar range. Its pointer fixtures were moved inside the viewport after the landing relocation; the assertions remain unchanged.
- Nine isolated views cover both relays, the Mortar cradle, loading apron, garden bank, carrier fight, roof landing/junction and optical return. Screenshots are inspected separately from the geometric tests. A normal-menu freight preview also opens its visible receiver through Q selection and an ordinary mouse click, without the test API. This is a short direct check, not a complete unscripted or blind-player playthrough.

Logs and layout screenshots are under `output/playwright/layout-pass/`; the three completion screenshots remain under `output/playwright/progression/`. Temporary browser sessions are closed after verification, and the existing development server on port 5174 is retained. This revision is not committed.


## Third-person camera trial — 2026-09-16

The folded city defaults to a perspective follow camera, with the previous orthographic view selectable in Settings. `folded-camera.js` owns mouse yaw/pitch, camera-relative movement and a retracting boom. Five collision probes use floor and scene geometry, excluding enemies, to protect the camera near plane. Retraction is immediate; extension is damped. Third-person floors use a single opaque depth-writing pass, avoiding the coplanar color/depth artifacts seen when reusing the overhead cutaway from below. Overhead mode retains its original aperture and depth prepass.

The center camera ray supplies the aiming point without target attraction. Existing weapon limits, range and physical shot collision remain. The minimap follows camera heading. Enemy activation in third person uses physical proximity and line of sight rather than requiring the enemy to remain on screen. The view selector preserves the save and does not alter room heights, routes or movement speeds. Pointer capture is released for Settings and the map; browsers rejecting capture retain shooting and movement and offer middle-button drag to look.

Verification:

- All 133 Node tests and the production build pass. The existing shared-chunk size advisory remains. Four new camera tests cover movement bases, retraction/extension, near-plane probes and camera limits.
- `folded-third-person-check.js` verifies actual mouse look and keyboard travel, a single centered reticle, map/pause capture transitions, view persistence, a shot against a live scout and continued activity behind the camera. It also forces capture denial and checks middle-button look, movement and firing.
- Isolated fixtures cover opening, canal, furnace underpass, wall, freight ramp and roof views. Real keyboard movement traverses the freight descent and both directions of the Foundry ramp; boarding and riding the automatic carrier reaches its upper stop without another interaction. Screenshots include these views and the lift. No browser errors were reported.
- The existing overhead height-aim, floor-depth counterfactual and Cannon/Mortar/reflected-Laser gate checks pass after the camera changes. Their URLs now explicitly select overhead, as do the other fixed-camera regression fixtures.
- Normal-interface inspection in the embedded browser confirmed its capture restriction, the fallback instructions and ordinary movement. This is a camera trial with targeted traversal and combat checks, not a complete third-person campaign playthrough or a blind-player acceptance result.

Artifacts are under `output/playwright/third-person/`. Temporary verification browsers are closed after testing; the existing development server on port 5174 is retained.


## Save-point camera obstruction repair — 2026-09-16

The save-point posts reproduced the reported dark screen. Walking across the awakening Hive at `z = 85.2` collapsed the boom from 11.67 to 0.3 units: the repair assembly was treated as a solid camera wall even though the Tank can overlap its posts. The shortened camera then looked directly through the opaque post. The new keyboard traversal regression failed with that exact distance before the fix.

Repair assemblies, control props and pickup cradles now use per-mesh sightline fading instead of pushing the camera. Their materials are independent so one obstructing post does not fade the opposite post. A spatial transition begins before a part reaches the sightline; opacity recovers with damping. Floor pads remain visible. The same calculation covers a camera located inside a post. Floors, walls, lifts and structural scenery retain camera collision. Switching to overhead restores its existing occlusion materials. Both views remain supported, as recorded in Gamespec.md.

Verification:

- All 134 Node tests and the production build pass; the existing chunk-size advisory remains. The new opacity test covers camera containment, clear sightlines and a continuous spatial fade.
- The repaired 75-frame keyboard crossing keeps an 11.67-unit boom, including the previously failing post positions. An inside-post camera fixture remains readable, with the obstructing post at 16 percent opacity and the opposite post fully opaque after recovery. The dedicated check also exercises a full orbit, wall/ceiling clearance and material restoration when switching to overhead. Screenshots were visually inspected. The overhead floor-depth counterfactual also passes, with no browser errors.
- The broader third-person browser check passes for captured mouse look, camera-relative driving, shooting, map/pause capture, the capture-denied fallback, ramp travel and automatic lift boarding/riding. A headed verification browser initially rejected pointer capture; a fresh headless browser passed the captured-input check.

Artifacts and the failing baseline are under `output/playwright/camera-clearance/`. These are targeted camera and traversal checks, not another full campaign playthrough. Temporary test browsers are closed after verification; the user's server on port 5174 remains running.


## Adjustable camera settings — 2026-09-16

Settings now opens a compact side panel with an unobscured, paused preview. Third-person controls expose pitch, boom length, height offset and shoulder offset; overhead controls expose elevation angle and orthographic view size. Each mode persists its own bounded numeric preferences and resets independently. Changing a slider redraws without advancing simulation. Resizing while paused also redraws the scene. Third-person pitch is the saved starting angle; ordinary mouse look remains independent during play.

The overhead aperture now receives the actual viewing direction as a uniform. CPU aperture picking and scene-object occlusion use the same direction, keeping the cutaway aligned when the user adjusts the overhead angle. Third-person boom collision and per-part prop fading remain active at customized distances and offsets.

Verification: all 134 Node tests and the production build pass, with the existing chunk-size advisory. `folded-camera-settings-check.js` exercises the actual slider keyboard controls, immediate preview, unchanged simulation time and position, reload persistence, independent resets, maximum-setting ceiling collision, a narrow viewport, and resume. The overhead floor-depth counterfactual and the save-post clearance/orbit/view-restoration check also pass. Screenshots were inspected at 1280×720 and 640×600; logs and images are under `output/playwright/camera-settings/`. No browser errors were reported. Temporary verification browsers are closed afterward; the user's development server remains on port 5174.


## Mouse chords, sensitivity and shaded-route lighting — 2026-09-16

The capture-denied fallback reproduced an order-dependent mouse bug: left-then-middle and right-then-middle produced zero yaw change, while the reverse orders rotated normally. Pointer down/up events describe transitions into/out of an active mouse pointer, not each changed button in a chord. Canvas press handling now uses mouse down, document movement handles both captured look and an active middle drag, and mouse up releases each action independently. Captured look remains available during fire or Magnetic Traction.

The third-person camera panel adds a persistent 0.25×–3× mouse sensitivity multiplier, defaulting to 1×. It scales horizontal and vertical look while preserving pitch limits.

Controlled lighting comparisons at the furnace underpass and canal showed that disabling shadows changed sampled image brightness by less than one channel value. Restoring indirect light improved the shaded surfaces substantially. The folded city now shares a neutral ambient fill and a brighter hemisphere ground contribution between both views, retaining directional illumination and shadow casting. This does not add per-frame lights or shadow maps.

Verification:

- `folded-mouse-chord-check.js` passes captured left/right look, both orders of middle+left and middle+right, a three-button chord, firing and visible magnetic scanning during the drag, and independent button release. The same 80-pixel movement produces 0.2 radians at 1× and 0.4 at 2×; preference persistence and reset pass.
- `folded-lighting-check.js` compares final lighting with the previous lighting at identical paused fixtures in both views. Third-person underpass sample brightness rises from 53.3 to 62.9 and canal from 64.1 to 75.8. All six fixtures retain shadows, have no fully clipped white pixels in the sampled region, and produce no browser errors. These measurements apply to the sampled fixtures, not every room. Before/after images were inspected.
- All 134 Node tests and the production build pass, with the existing chunk-size advisory. The camera settings check also passes with the added slider, including the narrow viewport and maximum-offset ceiling collision. The overhead floor-depth counterfactual also passes after the lighting change.

Reproduction logs, screenshots and checks are under `output/playwright/camera-input-light/`. Temporary verification browsers are closed after testing; the existing development server on port 5174 remains running.


## Folded-city draw submission batching — 2026-09-16

The wide third-person view exposed thousands of individual floor, trim and enemy-part submissions. The renderer now shares floor/trim materials and batches the opaque third-person floor representation and its trim. Batches preserve each textured floor patch's geometry, UVs and transform, with per-object frustum culling. Both camera representations have frozen static transforms. Collision and aim queries retain the original floor meshes.

The overhead view keeps local floor/trim batches and the original depth prepass: global transparent batches cannot interleave correctly with machinery and other floors. Only the active camera representation is drawn. Keeping both representations uses additional geometry storage in exchange for correct transparency in overhead and lower submission cost in third person.

Rigid sibling parts of enemies are merged by material and shadow settings before per-enemy materials are cloned. Wheels, moving tools, removable shields, radiators and articulated groups retain their identities and transforms. Enemy triangles, collision definitions, behavior, weapons and animation are unchanged. Resolution, camera range and live shadow updates remain unchanged.

Validation tooling:

- `folded-render-perf.js` measures real animation-frame simulation and CPU render submission with asynchronous GPU timer queries, using 3 seconds of warm-up and 8 seconds per fixture at 1600 × 900, pixel ratio 1.75. CPU and GPU work overlap and must not be added. These development-build measurements are fixture-specific, not a whole-game frame-rate guarantee.
- `folded-render-batching-check.js` compares six deterministic fixtures with these batches enabled and disabled. The maximum mean RGB difference is 0.185/255; the largest fraction of pixels differing by more than 30 in a channel is 0.283%. The opening and optics overhead samples are pixel-identical. Screenshots were inspected. Early attempts to combine the overhead depth/color passes or globally batch its transparent trims failed this comparison and are not used.
- Node regression tests exercise all 12 enemy models, preserving triangles, bounds, moving parts, materials and shadows, plus geometry/UV preservation for textured slabs. All 137 Node tests and the production build pass; the existing bundle-size advisory remains.
- Browser checks pass the floor-depth counterfactual, save-post fading and structural camera collision, camera settings/view switching, magnetic scanning and shield removal, laser/mirror puzzles, moving conveyors, automatic lifts, and the distinct attacks of all ten ordinary enemy kinds.

Logs and screenshots are under `output/playwright/render-optimization/`.

Remaining validation limits: the older full-scenario check reports turntable micro-camera flicker and an upper-refuge persistence assertion. Both also fail when the pre-optimization world module is restored through browser interception (turntable: 3,553 changed pixels before versus 3,545 after at the same viewport). They are not reported as passing or attributed to this batching change. The pointer-lock-dependent third-person input script was blocked by the browser denying pointer lock; camera clearance, settings, view switching and the other gameplay checks above ran independently.

Final paired measurements (Apple M3 Max, settings above):

| Fixture | Main draws | CPU render ms/frame | CPU reduction | GPU mean ms |
| --- | ---: | ---: | ---: | ---: |
| third / opening | 2348 → 1355 | 14.42 → 6.48 | 55.1% | 3.20 → 2.80 |
| overhead / opening | 345 → 336 | 4.92 → 4.75 | 3.5% | 2.36 → 2.48 |
| third / hub | 1117 → 670 | 11.06 → 4.73 | 57.2% | 2.62 → 2.38 |
| third / carrier | 670 → 363 | 8.60 → 3.56 | 58.7% | 2.95 → 2.33 |

The opening third-person main-pass triangle count remains 275,572 in both runs. The primary gain is CPU submission, not polygon reduction. Dedicated verification browsers were closed; the existing user server on port 5174 was retained.


## Mouse-event scene query scheduling — 2026-09-17

Every captured or middle-drag mouse event previously called `updateCamera(0)` and `updateAim`, including five collision probes and per-part camera fading, in addition to the normal frame updates. Mouse events now change only the follow camera's yaw/pitch. `advance` resolves the latest orientation, collision and aim once per frame. A mouse-button press synchronizes the camera before aiming/firing, so a press between frames uses the latest direction. This adds no angle smoothing, sensitivity changes or movement-control changes.

Controlled browser interception measured 500 dispatched events taking 128.5 ms with the old handler versus 1.5 ms with scene queries deferred. The old batch performed 500 camera updates, 2,500 collision probes and 500 aim queries; the deferred batch performed none. An open-view six-second control delivering eight small events every 8 ms reduced camera/aim calls from 6,361 to 361. Camera distance remained constant in both controls. Both maintained approximately 60 FPS in this headless fixture, so this demonstrates unnecessary input work, not a measured improvement to every player's frame pacing or a physical mouse polling-rate benchmark.

`folded-mouse-scheduling-check.js` first failed on 100 event-driven camera/aim updates. It now passes zero scene queries during the event burst, exactly one update per frame, preserved total yaw, unchanged stationary hull heading, immediate fire using the latest orientation, and ignored paused input. The existing mouse-chord check passes real captured look while firing or pulling, both button orders in middle-drag fallback, independent release, and sensitivity persistence/reset. All 137 Node tests and the production build pass, with the existing bundle-size advisory.

Evidence is under `output/playwright/mouse-latency/`. The dedicated test browser was closed; the user server on port 5174 remains running.

## Raw third-person mouse input — 2026-09-17

Third-person pointer capture now requests `unadjustedMovement: true`. This asks the browser for raw platform mouse movement instead of movement affected by the system pointer acceleration. A `NotSupportedError` retries ordinary pointer lock; a denied capture retains middle-drag look. Pending requests are deduplicated, and the raw-request error event does not disable the ordinary-lock retry. Angle multipliers, saved sensitivity, camera collision and per-frame scene-query scheduling remain unchanged. No aim smoothing or extrapolation is added.

`folded-raw-mouse-check.js` failed before the change because raw input was not requested. Afterward the test browser accepted native raw capture; forced unsupported and denied cases exercised ordinary capture and middle drag respectively. All three preserved vertical look while firing and exact stationary angles after input stopped. The existing mouse-chord and scheduling checks, all 137 Node tests and the production build passed (the existing bundle-size advisory remains).

This is an input-path correction, not a verified cure for the reported physical-mouse stair stepping. Earlier quarter-pixel browser automation produced integer `movementY` values and stepped pitch at constant camera distance, but that experiment does not isolate physical device input from automation injection. Raw capture does not promise fractional deltas or eliminate sensor count granularity. Actual-device smoothness and frame pacing still need acceptance. Evidence is under `output/playwright/raw-mouse/`.
