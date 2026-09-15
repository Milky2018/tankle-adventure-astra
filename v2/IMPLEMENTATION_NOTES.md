# Implementation and Verification Notes

Technical history moved out of `Gamespec.md`; these dated observations describe the revisions they inspected, not the current build. Game-design rules remain in `Gamespec.md`.

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
