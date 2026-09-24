# Campaign playtest review — 2026-09-18

Baseline: `a32df2e`. This review records observations, not new game-design requirements. No gameplay code was changed during the review.

## Coverage and limits

- Started a fresh save in one headed Chromium browser at `http://127.0.0.1:5174/`.
- Played the Foundry with real keyboard/mouse input and real-time simulation: opening encounters, both relays, Prototype, Overdrive pickup, reverse conveyor return, repair, and the Foundry boss. Paused between samples. Read runtime snapshots and used two projected target positions when aiming at Foundry components; this was not blind play.
- Continued the **same save** through the water approach, Arsenal, Reservoir, Proving Works, Coolant before Lens, the optical/thermal convergence, Hearth and final keeper. This portion used known waypoints, debug aiming and accelerated simulation. It did not teleport, grant equipment, alter health or bypass progression. Repairs used actual Hives.
- The continuous run reached **Mission Accomplished**, acquired all eight abilities including the original Cannon, finished at 44/50 HP, and recorded no page errors during the assisted portion. The runtime clock reached 1,756.6 seconds. That is simulated time, **not a human completion-time estimate**.
- Reloaded the completed save. All seven acquired modules, the keeper defeat and ending persisted; the player returned to the last refuge normally.
- Subsequently used explicitly positioned fixtures to revisit a cable and the optional laser guardian. These are separate from the continuous run. The guardian real-input sample ended in death; two later debug-aim controls confirmed the reflected beam still does damage from both tested positions.
- This is one complete main-route traversal with assisted coverage, **not a fully manual campaign playthrough**, all optional content, a novice navigation study, or Safari validation. The optional rail, garden, maintenance and roof-sorter loops were not completed in this run. The alternate dry approach and Laser-first order were not replayed.

Evidence is in the ignored local directory `output/playwright/full-play/`. `result.json` contains the main-run telemetry and completed-save backup. Screenshots numbered 01–18 are the opening input samples; 020–110 are the continuous assisted route; 111 onward are ending, persistence and separate follow-up checks.

## Findings, in priority order

### 1. Major: expanded districts repeat one room sequence

Arsenal, Reservoir and the later districts repeatedly produce the same experience: large square room, small trial, fight, repair detour, central module, return lane. The overhead map makes the repeated six-room loop especially obvious. Changing the route order does not sufficiently change the local exploration experience.

This is visible in the playthrough and corroborated by `src/content/expansion-layout.js:27`: all six districts share the same six slots, 64-by-64 room dimensions and 80-unit spacing. Each module occupies room four's center; the same cover offsets recur in combat rooms. Mirror/flip transforms and regional palettes do not provide a distinct spatial problem.

Evidence: `024-arsenal-room-0.png`, `027-arsenal-room-2.png`, `102-hearth-two-waves.png`, `112-final-save-map.png`.

Recommended direction: author different room footprints, routes and encounter objectives around each district's machinery. Judge additional scale by meaningful decisions and discoveries rather than floor area. This needs a level-layout pass, not more decorative objects on the same template.

### 2. Major: ability acquisition spaces remain conspicuously empty

The Magnet, Flotation and Laser arrival frames show a tank/module pedestal surrounded by a very large, mostly blank floor. The Coolant pickup has a strip of heat panels, but most of the frame is still unused space. There is little visual buildup or nearby environmental activity to make the acquired machine feel like part of the place.

These are arrival/acquisition frames; a pedestal disappearing after collection is expected and is not being reported as a missing-pickup bug. The empty surrounding room is the issue.

Evidence: `030-arsenal-room-4.png`, `039-reservoir-room-4.png`, `069-coolant-room-4.png`, `081-lens-room-4.png`.

Recommended direction: stage the machine's former use before acquisition, make the approach itself memorable, and place a compact first application immediately after it. Vary the acquisition rhythm instead of always repeating a central pickup after a repair room.

### 3. Major: the first ability guardian does not demand a combat decision

At the Prototype entrance, aimed once and held the real mouse button for approximately **5.1 seconds**, without moving or continuously correcting aim. Prototype went from 9 HP to dead; the player went from 46 to 42 HP. It charged and reached the player, so this was not an inactive enemy outside its engagement range.

Evidence: `07-prototype-entry.png`, `08-prototype-range.png`. The later Foundry boss did require attacking its batteries and respecting its opening; this criticism is specifically about Prototype, not proof that every boss is trivial. The optional laser guardian subsequently killed the player during a separate sample.

Recommended direction: improve Prototype's attack geometry and punish remaining in its committed path, while making a successful dodge create a clear counterattack. Preserve the accepted 9 HP and absence of per-round damage quotas; neither arbitrary gating nor more health is the first remedy.

### 4. Major: combat rooms underuse their space, and Mortar dominates the sampled wave solution

In the large district courts, a few enemies cluster among the same three cover blocks. The continuous runner could repeatedly move toward its next point while targeting a nearby enemy with Mortar. For the mandatory Proving and Hearth waves, a small rectangular orbit and nearest-target Mortar fire were sufficient; the Hearth wave checkpoint ended at 50 HP.

This is **assisted** combat evidence with exact aim, not proof that an ordinary player cannot be challenged. It does show that the tested sequence did not require changing that simple tactic across very different named regions. Screenshots independently show that most of each court is not doing useful combat work.

Evidence: `053-proving-two-waves.png`, `102-hearth-two-waves.png`; movement and battle loops are preserved in `assisted-continuation.js`.

Recommended direction: change the spatial relationship between pressure enemies, ranged support, cover and the route objective. Require repositioning for a reason; avoid solving this with larger HP pools or simply spawning more enemies.

### 5. Moderate: local returns do not always eliminate the long external approach

The Arsenal return reconnects to the district entrance, after which the same long bridge still leads back to the city. The straight segment from approximately `(-56, 8, 31)` to `(-180, 8, 31)` is about 124 units and was traversed both ways. Each traversal took 17.7 simulated seconds at base speed in this runner.

That timing is **not a minimum travel time**: the runner did not boost there. Also, the Reservoir has a downstream water alternative that this runner did not take; its recorded bank retrace must not be misreported as an unavoidable design requirement.

Recommended direction: inspect where each return deposits the player relative to the next meaningful destination. A shortcut that saves part of a six-room loop can still leave a repetitive external commute.

### 6. Moderate: trials repeat their input recipe without enough development

Arsenal and Reservoir both use the same pressure-plate plus nearby shooting target arrangement. Lens, Coolant and Hearth use the same timed opening pattern. The screenshots do not communicate enough difference in what the player is trying to make happen in the world.

Source corroboration: `src/content/expansion-layout.js:49–55` assigns the two pressure trials, the Mortar-top trial, and the three identical 4.5-second cycles with 2.1-second openings.

Evidence: `025-arsenal-room-1.png`, `034-reservoir-room-1.png`, `049-proving-room-1.png`, and the later district room-one captures.

Recommended direction: retain simple inputs but vary their physical consequences and combine a learned interaction with one new spatial constraint. Repeated controls can teach a language; repeated entire rooms do not develop it.

### 7. Moderate: the camera does not consistently show the information needed for combat

In the fresh third-person opening, the player lost 4 HP during the first short movement before the attacker was visible. Switching to overhead exposed the nearby scout behind the tank. The exact impact was not separately instrumented, so the scout attribution is inferred from its position and contact damage, while the off-screen damage itself was observed.

In the optional guardian fixture, a reflected laser successfully damaged the guardian's rear, but the second mirror and part of the beam path were outside the overhead frame. Other-floor enemies, platforms and walls occupied much of the right side of that same combat view. The interaction works, but its cause is hard to read while dodging and re-aiming.

Evidence: `01-west-approach.png`, `02-first-turn.png`, `117-guardian-entry.png`, `118-guardian-reflection.png`.

Recommended direction: design approach direction and combat framing together. Make the initial threat visible and keep the important reflection chain readable from the intended firing positions. Reassess overlapping floors around this arena before adding more HUD explanations.

### 8. Confirmed UI bug: full-map player marker does not distinguish another floor

After reload the player was at `(44, -40, -10)`. Opening the map and selecting height **0** kept a fully bright yellow player arrow in that layer's plan, in an empty area. The layer-selector dot still identified the actual player layer, but the map arrow itself looked like an ordinary current-floor position.

Evidence: `112-final-save-map.png`, `113-other-floor-marker.png`. `src/app/session.js:717` draws the player marker at full opacity regardless of the selected layer.

Recommended direction: distinguish an off-layer position explicitly, or show the player marker only on its actual layer. Keep elevation connections discoverable without drawing a misleading same-floor position.

### 9. Confirmed visual defect: circuit cables lose visible sections while lamps remain

Multiple region captures show a cable ending, a row of isolated yellow/green lamps, then cable geometry resuming. Revisited the Arsenal pressure trial after completion and reproduced the appearance after real movement and a camera switch. This is not just a single in-flight activation screenshot.

Evidence: `025-arsenal-room-1.png`, `102-hearth-two-waves.png`, `116-cable-after-input.png`. The source creates continuous segments and separate instanced lamps, but the precise rendering failure has **not** been isolated. Do not assume these are obsolete floating props and delete them.

Recommended direction: isolate depth ordering, transparent materials and batching with the same camera/position before changing the geometry. Verify both camera views while moving, with inactive and activated circuits.

## Assessment

The run confirms that the selected main route is connected, the required abilities can be obtained, its ability gates work, and the ending persists. It does not support the earlier 81/100 assessment as a reliable whole-game quality judgment. That assessment weighted local fixes and successful route checks too heavily relative to room quality, repeated encounter structure and what the player actually sees.

The first corrective pass should address the district layout/encounter template and camera-readable interaction spaces. The map marker and broken-looking cables are narrower defects with clear reproduction cases. All remain open in this review; no fixes or new design decisions are implied by this document.

## Corrective pass — 2026-09-18

The findings above describe baseline `a32df2e` and remain as the original evidence. The following work replaces their implementation; the earlier numerical quality assessment is not reused.

| Finding | Correction and evidence |
| --- | --- |
| Repeated expansion template | Six explicitly authored districts now contain 35 rooms with different footprints, branch shapes and encounter sequences. Full-hull route tests and the campaign runner traverse their actual paths. Empty floor was removed instead of preserving the previous area quota. |
| Empty acquisition spaces | Magnet belongs to an assembly installation, Flotation to a pontoon dock and Laser to a calibration station. Both-view captures show the local machinery and exit relationships. |
| Trivial Prototype trading | Nine HP retained, with a moving frontal plate, 60 percent frontal reduction, unrestricted recovery/rear damage, committed charge damage and knockback. Paired normal-health fixtures ended at 22 HP stationary versus 50 HP while evading. |
| Weak encounter differentiation | Districts use different shield, repair, sightline, mine and artillery arrangements. Skirmishers continue lateral movement while warning and firing: the single-shot control missed with Mortar and hit with Cannon. Four repair groups now approach and actually heal a wounded ally in a browser fixture. Only two courts use finite reinforcements. |
| Long return retraces | Arsenal now deposits the Tank on the city side of the long bridge; the water outlet uses the downstream channel. The other districts have separate runouts or maintenance returns. Authored return lengths are 39–63 percent of outward paths before accounting for engines and currents. |
| Repeated input recipe | One load plate remains; reservoir inlet/transfer rotors, an optical shutter/reflected exit and a falling counterweight replace duplicated pressure and timed-sleeve rooms. Existing optional rail/garden/tender/sorter interactions remain. |
| Combat framing | Fresh third-person W input encounters the opening scout in view before damage. All four guardian mirrors and the tested reflected beam fit in the ordinary overhead frame; other-floor scenery recedes during the live encounter. |
| Misleading map floor | The arrow is absent on another floor. The layer selector and map agree at ramp midpoints. Rotated floor bounds fit the map frame. |
| Broken-looking circuits | A same-scene draw-order control isolated translucent floor color repainting merged cable segments. Floors now draw before fixtures while retaining the opaque depth pass. Both views and circuit states are covered by captures. |

Normal keyboard/mouse input also crossed the Magnet pickup threshold, updated the equipment display, pulled the exit latch and completed the new service return with Cannon and Magnetic Traction. The confirmed acquisition-to-city run finished at 38/50 HP; its fixture began eight units before the module with the incoming Overdrive/Mortar loadout. Navigation and aiming used known coordinates and projected targets. This is a local input acceptance sample, not blind exploration or a manually completed campaign.

Artifacts and detailed reproduction/validation boundaries are in `output/playwright/overhaul/` and `IMPLEMENTATION_NOTES.md`. Whole-game encounter balance and unaided newcomer understanding still require human playtesting; successful route and mechanism checks establish functionality, not a numerical fun score.
