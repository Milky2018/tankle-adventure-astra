# Tank Metroidvania — First-Level Game Design

## Document Status

This document records the agreed game design for the first playable level. It is a roughly ten-minute vertical slice intended to prove the complete game loop, controls, progression, presentation, and visual identity. Balance values are first-pass tuning targets rather than final production values.

Technical architecture and later-level content are deliberately outside this document.

## Vision

The game is a three-dimensional tank Metroidvania presented through a fixed 45-degree isometric camera and played on a two-dimensional ground plane. WASD moves directly in screen space, the hull turns to follow movement, and the turret independently aims at the mouse cursor.

The first level must prove one complete Metroidvania loop:

1. Discover a route that normal movement cannot overcome.
2. Take a visible detour.
3. Explore a compact branching area and fight enemies.
4. Defeat an Elite and acquire a traversal ability.
5. Backtrack through familiar spaces using the new ability.
6. Apply the level's learned rules in a Final Boss encounter.

The game uses an exaggerated industrial cartoon style. It is not a realistic military game, a generic low-poly game, or a toy diorama.

## Design Pillars

### Direct movement and independent aim

WASD directly controls screen-relative movement without tank-style steering. Hull Heading follows the current movement direction for animation and silhouette, while Turret Aim follows the cursor's projected ground position. The player can move and fire in different directions.

### Abilities change both traversal and combat

Overdrive opens Conveyor Gates, changes combat positioning, and enables high-speed ramming against ordinary enemies. It is not a binary key or a cooldown-based dodge.

### Pressure comes from shared Heat

The Standard Cannon and Overdrive draw from the same Heat budget. Aggressive shooting leaves less capacity for movement, while extended Overdrive leaves less capacity for attacking.

### Discovery belongs to the player

The game does not rotate or pull the camera to reveal solutions, highlight paths, show objective arrows, force pauses, or track tutorial completion. Scene composition may make options naturally readable, and brief input glyphs may identify physical controls that cannot be inferred from the world.

### The game tells its story without words

Gameplay, story, environment, maps, and HUD contain no dialogue, prose, labels, or numeric values. Action, animation, staging, icons, unlabelled bars, music, and sound communicate meaning. Text is allowed only in system settings, input configuration, and future accessibility menus.

### Hazards preserve consequences

Environmental hazards never bounce, teleport, or reset the Tank to safety. The player must physically escape or be destroyed.

## Scope

### Included

- One approximately ten-minute level.
- Locations A, B, and C plus a Final Boss room and exit.
- One player Tank with 50 HP.
- One Standard Cannon.
- One acquired ability: Overdrive.
- Three ordinary enemy types, one Elite, and one Final Boss.
- Three Repair Hives.
- A Region Map and an always-visible Minimap.
- Full keyboard remapping and essential system settings.
- A short wordless opening, ability-acquisition sequence, death sequence, and ending.

### Deliberately excluded from this version

- Field Repair or any healing between Repair Hives.
- Collectibles; only future Expansion Pockets are reserved.
- Additional weapons or abilities.
- NPCs, dialogue, logs, narration, subtitles, and environmental writing.
- Mobile controls, controller input, aim assistance, and multiplayer.
- Accessibility options other than input remapping; broader accessibility work is deferred to the second version.
- Future-level environments, creatures, or plot commitments.

## Story

The Tank is a small experimental machine rejected by the automated factory that produced it. It wakes on a maintenance platform after years of inactivity while the remaining factory systems attempt to send it back to the furnace for recycling.

The Tank has no dialogue. Twin headlights, an antenna, hull motion, turret gestures, and mechanical timing give it a silent personality. Its long-term growth comes from integrating modules taken from other failed prototypes.

The first level communicates this premise through action:

- The Tank wakes and leaves its inspection platform.
- Location A's machinery attempts to carry rejected material toward the furnace.
- Factory maintenance and defense machines oppose the Tank.
- The Overdrive Prototype demonstrates a discarded power system before the Tank claims it.
- The Furnace Overseer attempts to prevent the rejected Tank from leaving.
- Defeating the Overseer opens the factory exit.

## Visual and Audio Direction

### Exaggerated industrial style

- Oversized barrels, turrets, tracks, vents, pistons, and machinery create readable silhouettes.
- Models use rounded large forms rather than dense realistic mechanical detail.
- Saturated color blocks, stepped lighting, soft dark outlines, and expressive deformation replace photoreal materials.
- Firing produces exaggerated recoil across the entire vehicle.
- Overdrive leans and stretches the Tank's motion while making its tracks and exhaust visibly strain.
- Explosions use colorful fireballs, ring-shaped shockwaves, and clustered smoke rather than realistic simulation.
- The Tank is primarily warm yellow; facilities use teal and green; orange-red consistently communicates danger and Heat.

### Tank personality

- The Tank is compact with an oversized turret and barrel.
- Twin headlights suggest eyes without becoming a literal face.
- A short antenna reacts to discovery, danger, damage, and ability acquisition.
- Idle motion resembles breathing machinery.
- Low HP is shown through unstable track motion, intermittent exhaust, and visible damage without changing control responsiveness.
- The first level uses no written factory number or name. A formal name may be earned later.

### Mechanical score

- Music combines playful metal percussion, valves, tread rhythms, melodic synthesizers, and adaptive combat layers.
- A and B use a sparse arrangement; C adds mechanical layers; Elite and Boss encounters intensify the same musical identity.
- Acquiring Overdrive reveals the full main melody for the first time.
- There are no vocals, spoken announcements, or intelligible broadcast language.
- Driving produces a continuous engine sound; Overdrive progressively increases its volume and pitch, and stopping fades it out.
- Heat raises engine pitch and exhaust tempo so approaching Overheat is audible without looking at the HUD.
- Overheat, cannon readiness, Repair Hive activation, and heavy attack warnings each use a distinct sound shape.
- Important threats support positional audio.

## Player Control and Camera

### Input

- `W / A / S / D`: move directly up, left, down, or right relative to the screen; diagonal movement is normalized.
- Mouse: choose a ground target for Turret Aim.
- Left mouse button: fire one Standard Cannon shot toward the cursor target.
- `Shift`: hold Overdrive while moving.
- `Tab`: open the Region Map.
- `E`: activate a Repair Hive.
- `Space`: skip the death animation.

All controls may be rebound in the system settings.

### Isometric Camera

- The camera uses a fixed three-quarter orientation at approximately 45 degrees of elevation.
- It follows the Tank's ground position smoothly without rotating, zooming, or accepting mouse-look input.
- Camera orientation defines the screen-space WASD basis and remains unchanged during every encounter, including the Final Boss.
- The high angle keeps the player and nearby routes readable over low machinery.
- The first version has no free orbit, first-person view, scope, manual zoom, or shoulder switching.

## Core Status Systems

### HP

- The Tank begins with and has a maximum of 50 HP.
- There is no Field Repair in the first version.
- HP is restored only through Repair Hives and respawning.
- Direct hits grant approximately 0.6 seconds of repeated-hit protection to prevent stacked collision events from deleting HP instantly.
- Continuous Furnace Hazard damage bypasses this protection.
- Combat hurtboxes are independent of solid-body collision. The player uses an inset hurtbox (0.8 world-unit radius); enemy body hurtboxes and Boss weak points receive 15 percent additional radius for forgiving edge hits. Armour and vulnerability rules still apply. Enemy charge damage uses the player hurtbox; walls, body separation, and Furnace Hazards retain their existing physical rules.

### Heat

- Heat ranges internally from 0 to 100 but is shown only as an unlabelled circular gauge around the cursor reticle.
- Each Standard Cannon shot adds 20 Heat.
- A cold Tank may safely fire four consecutive shots; the fifth reaches the red threshold and causes Overheat.
- Overdrive adds 15 Heat per second while accelerating, at full use, and during deceleration.
- Shooting and Overdrive Heat are additive.
- After all Heat-generating activity ends, cooling begins after a 0.75-second delay.
- Cooling removes 25 Heat per second.
- At 100 Heat, the Tank becomes Overheated and cannot fire or engage Overdrive.
- Overheated ends only when Heat returns fully to zero.
- Normal direct movement remains available while Overheated.

The Heat ring fills clockwise and shifts continuously from pale yellow through orange to flashing red, remaining red throughout Overheated cooldown. Near Overheat the Tank emits increasingly intense steam. No percentage or status word is displayed.

## Standard Cannon

- The sole starting weapon is semi-automatic.
- Projectiles travel in a straight line with no gravity, guidance, lock-on, or aim correction.
- A projectile takes roughly 0.6 seconds to cross an ordinary combat room.
- A single on-screen reticle follows the mouse cursor. The projected ground target is used for aiming internally, without a separate world-space marker.
- The turret turns directly toward that target, and each click fires along the same ground-plane direction.
- Minimum shot interval is approximately 0.5 seconds.
- Direct impact deals full damage; a small splash area deals approximately 25 percent damage.
- Projectiles may destroy designated fragile scrap and Gate Relays but not ordinary walls or major machinery.
- Impacts leave brief cartoon scorch marks without permanently changing normal geometry.
- There is no ammunition count, reload cycle, alternate fire, charge shot, or ammunition selection.

## Overdrive

The Overdrive Prototype's defeated power module grants Overdrive.

- Overdrive operates only while the Tank is receiving non-zero movement input.
- Holding it accelerates from 1.0x to 1.6x speed over 0.5 seconds.
- Releasing movement or Overdrive returns speed to 1.0x over approximately 0.35 seconds.
- Heat continues to accumulate while the Tank remains above 1.0x during deceleration.
- Cooling delay begins only after speed returns fully to 1.0x and the cannon is not generating Heat.
- Re-engaging during deceleration resumes acceleration from the current multiplier.
- Direction changes remain immediate at maximum speed so WASD always preserves direct control.
- Turret Aim remains fully independent during Overdrive.
- Overdrive cannot accelerate stationary motion.

### Overdrive Ram

Ramming becomes offensive at 1.3x speed or higher.

- Scrap Scout: destroyed and thrown aside.
- Rivet Turret: takes one direct-cannon-hit equivalent and sharply reduces the Tank's speed.
- Furnace Guard front: takes no damage; the Tank loses 5 HP and slows sharply.
- Furnace Guard side or rear radiator: counts as one weak-point hit.
- Elite and Final Boss: cannot be damaged or displaced by ramming.
- Overdrive Ram never grants invulnerability, passes through a target, or replaces ordinary collision.

## Conveyor Gates

- Conveyor movement is a real world-direction velocity added continuously to the Tank.
- Normal Tank speed is defined as 1.0x; an opposing Conveyor Gate moves at approximately 1.15x.
- Normal driving therefore loses ground against the conveyor.
- During Overdrive the Tank transitions from being pushed back, through equilibrium, into slow forward progress.
- The Tank retains direct movement control and may leave laterally wherever physical walls permit.
- Location A's narrow walls make its conveyor the only forward route.
- The Location A gate allows a cold Tank to cross with roughly two seconds of sustained Overdrive, consuming about 30 percent of its Heat budget. The A and B–C gate surfaces are about 50 percent longer than the initial prototype, preserving a visible traversal while leaving Heat for subsequent actions.
- The B–C conveyor is slightly shorter and becomes the first safe practical use after ability acquisition.
- Animated surface blocks, rollers, debris, and particles show conveyor direction without written arrows.

## Rest, Death, and Respawn

### Repair Hives

The first level contains exactly three Repair Hives:

1. At the level entrance.
2. At Location C's central landmark.
3. Beyond the defeated Final Boss.

A Repair Hive unfolds as the Tank approaches. Activating it performs a rapid mechanical repair, restores HP to 50, clears Heat, saves and updates the respawn anchor, and emits a visible world pulse as ordinary enemies return. It remains lit with the same beacon symbol used on both maps. Repeated activations may skip or shorten the maintenance motion.

There is no Repair Hive immediately before the Final Boss.

### Death sequence

- At zero HP, tracks stop, the turret drops, headlights turn off, and black smoke rises.
- Music stops while the remaining machinery slows audibly.
- The fixed camera holds on the destroyed Tank for approximately one second.
- A Repair Hive-shaped mechanical iris closes the screen.
- The last activated Repair Hive rebuilds the Tank as the iris opens.
- HP returns to 50, Heat returns to zero, and ordinary enemies respawn according to the Souls-like Rest Point loop.
- Every death sequence lasts approximately three seconds.
- `Space` may skip it at any point.
- The first level has no currency, experience, death drop, or corpse-retrieval system.

## First-Level Structure

### Topology

```text
                                  Final Boss room
                                         |
                              Repair Hive 3 / exit
                                         |
                          opposing Conveyor Gate
                                         |
Level entrance / Location A ---- maintenance path ---- Location B
       Repair Hive 1                                      |
                                                  forward conveyor
                                                         |
                         branch 1 ---- Location C ---- branch 2
                                          |
                           central landmark / Repair Hive 2
                                          |
                                 Elite Barrier / Elite
```

The actual progression is:

1. The Tank wakes beside Repair Hive 1 in Location A.
2. It discovers an opposing Conveyor Gate that exceeds normal speed.
3. It takes the maintenance path to Location B.
4. A forward conveyor carries it from B into Location C.
5. It activates Repair Hive 2 at C's central landmark.
6. It explores C's two branches in either order and destroys one Gate Relay in each.
7. Both relays remove the Elite Barrier.
8. It defeats the Overdrive Prototype and acquires Overdrive.
9. It uses Overdrive to travel backward over the B–C conveyor and returns through B to A.
10. It uses Overdrive to overcome A's original Conveyor Gate.
11. It defeats the Furnace Overseer.
12. It activates Repair Hive 3 beyond the Boss and completes the level.

### Setting by area

- **Location A — cargo entrance:** awakening platform, Repair Hive 1, recycling machinery, and the initially impassable Conveyor Gate.
- **Location B — maintenance passage:** a narrow alternative route and the first ordinary enemy.
- **Location C — assembly courtyard:** a central stopped mechanical arm, Repair Hive 2, two compact looped branches, visible Elite Barrier, and Elite arena.
- **Branch 1 — scrap storage:** the combat-focused loop.
- **Branch 2 — elevated power maintenance:** ramps, overpasses, and sightline navigation without jumping.
- **Final area — foundry and assembly hall:** active furnace channels, Conveyor Gates, and the Furnace Overseer.
- **Exit:** Repair Hive 3 and a deliberately undefined exterior light beyond a partially opened gate.

### Location C

- The central landmark and Elite Barrier are visible immediately on entry.
- Two visible power connections lead from the barrier toward the branches.
- Each branch loops back to the centre rather than ending in a long forced backtrack.
- Branch 1 centres on combat.
- Branch 2 centres on ramps, elevated routes, underpasses, and firing sightlines; the Tank never jumps.
- Each branch ends at a destructible Gate Relay.
- Destroying a relay visibly removes half the Elite Barrier's power.
- Two or three short Expansion Pockets reserve space for future collectibles. They contain a view or environmental motion but no objective, progression dependency, locked-reward indicator, or suggestion that content is missing.

### Timing budget

- Opening and Locations A/B: approximately 1.5 minutes.
- Arrival at C's central Rest Point: approximately 2 minutes cumulative.
- Both C branches: approximately 3 minutes total.
- Overdrive Prototype: approximately 1 minute.
- Ability acquisition and return to A: approximately 1 minute.
- Furnace Overseer: approximately 2 minutes.
- Ending and Repair Hive 3: approximately 30 seconds.

Ten minutes is the intended clean first-play flow without deaths. Death and retry time is not part of the level-content budget.

## Encounter Plan

The level contains six ordinary enemies, one Elite, and one Final Boss.

| Area | Encounter |
| --- | --- |
| Location A | No enemies |
| Location B | 1 Scrap Scout |
| C central landmark | Safe area |
| C branch 1 | 2 Scrap Scouts + 1 Rivet Turret |
| C branch 2 | 1 Furnace Guard + 1 Rivet Turret |
| Elite arena | Overdrive Prototype only |
| Return journey | No newly spawned enemies; ordinary enemies may have respawned after resting |
| Boss room | Furnace Overseer only |

### Ordinary enemies

**Scrap Scout**

- Low wedge silhouette without a conventional turret.
- Orange-yellow body, loose parts, and exaggerated motion.
- Flanks and prepares a visible head-down ram with a white exhaust burst.
- One direct cannon hit destroys it.
- Ram damage to the Tank: 5 HP.

**Rivet Turret**

- Tall narrow base with an unusually long barrel.
- Teal-blue body with a bright red muzzle warning.
- Stationary or extremely slow; applies mid-range pressure with clearly telegraphed projectiles.
- A spring-like barrel compression and thin ground shape show firing direction.
- Two direct cannon hits destroy it.
- Projectile damage to the Tank: 8 HP.

**Furnace Guard**

- Wide rectangular front, heavy tracks, and a small turret.
- Dark armour with industrial warning structures and a bright side/rear radiator.
- Slow turning makes flanking possible.
- Front armour reduces damage by 60%. A front hit briefly flashes the armour plate, throws pale sparks back toward the incoming shot, and plays a distinct metallic ricochet. Side/rear damage retains orange impact bursts and the normal damage sound.
- Three radiator hits destroy it.
- Heavy cannon damage to the Tank: 10 HP.

Ordinary enemies have no names, levels, or persistent overhead health bars. Shape, material damage, flashes, and mechanical state communicate their identity and condition. The three types remain distinguishable in silhouette alone.

## Elite Encounter — Overdrive Prototype

The Overdrive Prototype demonstrates the ability before granting it.

1. Its engine visibly and audibly charges while a forward warning shape appears.
2. It performs a straight high-speed charge.
3. The player avoids the charge using lateral movement and arena machinery.
4. The Prototype becomes Overheated and exposes its rear radiator.
5. The player attacks during this short vulnerability window while managing cannon Heat.
6. The Prototype has 9 HP. Vulnerability windows have no damage cap; the number of cycles depends on successful hits and Heat management.

The later part of the fight adds ordinary cannon shots but no summoned enemies. A Prototype cannon hit deals approximately 8 HP; its direct charge deals approximately 12 HP.

On defeat, its power module integrates into the Tank. Tracks illuminate and the Tank demonstrates a brief self-propelled acceleration. A one-time `Shift` input glyph appears. A short safe conveyor beyond the arena allows immediate experimentation without a guided camera or forced tutorial state.

## Final Boss — Furnace Overseer

The Furnace Overseer is an unfinished super-heavy tank in the foundry assembly hall. The arena contains several active conveyors and traversable Furnace Hazards while always retaining physically reachable safe ground.

### Phase 1 — cooling assemblies

- The Overseer fires slow heavy cannon shots and readable fan-shaped projectile patterns.
- It periodically activates floor conveyors that push the Tank toward furnace channels.
- Its left and right cooling assemblies open after attack sequences.
- The player preserves Heat for Overdrive, crosses opposing conveyor movement, and shoots an exposed assembly.
- Destroying either assembly permanently stops the associated conveyor and expands safe ground.

### Phase 2 — central power core

- Destroying both cooling assemblies exposes the central core.
- Cannon tempo increases and the Overseer slowly rotates its hull to track the Tank.
- The player chooses between spending Heat on core damage and preserving it for escape.
- The fight should last approximately two minutes and must not use excessive HP to extend duration.

Normal Boss attacks deal approximately 8–10 HP. The most strongly telegraphed heavy attacks deal 15 HP. The Overseer cannot be damaged by Overdrive Ram.

### Furnace Hazards

- Furnace channels are shallow traversable molten-waste areas, not bottomless pits.
- The Tank retains full direct movement and must drive to a physical side ramp to escape.
- Damage is 5 HP every 0.5 seconds.
- Hazard damage ignores direct-hit protection.
- Overdrive makes escape faster but is not the sole available exit method.
- There is no knockback, automatic bounce, teleport, or safe-position reset.

## Maps and HUD

### Region Map

- Opens on demand and progressively reveals visited areas.
- Shows current location, activated Repair Hives, discovered Conveyor Gates, the discovered Boss room, and explored topology.
- Unexplored spaces show only vague connected exits.
- C's branches and Expansion Pockets appear only when entered.
- Acquiring Overdrive does not mark A as an objective or provide a route.
- The map is schematic rather than a precise or rotatable three-dimensional model.

### Minimap

- Always visible in the upper-right HUD and hidden while the Region Map is open.
- Fixed north-up and centred on the player's local area.
- Shows discovered walls, paths, conveyors, Furnace Hazards, activated Repair Hives, and known Conveyor Gates.
- A broad arrow shows movement-facing Hull Heading; a thin line shows cursor-driven Turret Aim.
- Ordinary enemies appear only while currently visible and disappear immediately when sight is lost.
- Elite and Final Boss receive large icons after combat begins.
- It never shows an objective route or unexplored room.

### Combat HUD

- Lower-left: unlabelled segmented HP bar with no number.
- Cursor position: one cartoon industrial targeting reticle surrounded by an unlabelled circular Heat gauge. The native cursor is hidden over gameplay, and no projected ground marker is drawn.
- Lower-left: an unlabelled Overdrive bar beside HP. Heat is displayed only at the reticle.
- During Overdrive: a graphical acceleration gauge indicates progress from normal to maximum speed without numeric text.
- Upper-right: Minimap.
- Top-centre: unlabelled Elite or Boss health bar during those encounters only.
- Directional red edge impacts briefly indicate incoming damage without realistic blood effects.
- No ammunition, reload, weapon-slot, objective, or enemy-name display exists.

## Player-Led Onboarding

The level provides opportunities to discover mechanics without deliberate guidance:

- Brief one-time `WASD`, mouse, left-click, `E`, `Tab`, and `Shift` glyphs may reveal otherwise unknowable inputs and disappear after use.
- Location A naturally exposes the opposing Conveyor Gate and visible maintenance detour.
- No camera pull, camera rotation, light chase, route highlight, arrow, forced pause, or scripted tutorial state directs the player.
- Fragile scrap in B offers a safe opportunity to discover turret independence, projectile travel, and Heat.
- The player may discover Overheat whenever their own firing behaviour reaches the threshold; the level does not force it.
- Repair Hive animations make HP recovery, Heat clearing, activation, and enemy reset visible.
- The Overdrive Prototype demonstrates acceleration and Overheat through its combat behaviour.
- The short conveyor beyond the Elite arena provides a natural opportunity to try Overdrive.

## Ending

- The Furnace Overseer's defeat opens the rear door.
- The player remains in control and drives to Repair Hive 3.
- Activating the Hive restores and saves the Tank, then sends a light pulse toward the exit.
- The exit opens only far enough to reveal bright, undefined exterior light.
- The Tank looks toward the opening and raises its antenna.
- After approximately three seconds the image fades to a system-level completion menu.
- No future biome, creature, character, or detailed plot point is shown.

## First-Version Validation Criteria

The slice succeeds when playtesting demonstrates all of the following:

- The clean first playthrough remains close to ten minutes without making C feel like two empty corridors.
- A player understands screen-relative movement and independent cursor aim without forced guidance.
- A player discovers that the Location A conveyor cannot be crossed at normal speed.
- Both C branches are readable from the central landmark and can be completed in either order.
- The Overdrive Prototype communicates the relationship between acceleration and Overheat before the ability is acquired.
- The player can infer that Overdrive enables the return through B and the original gate at A.
- Shared Heat creates observable choices between firing, movement, and ramming.
- The Final Boss recombines Conveyor Gates, Heat, Overdrive, weak points, and Furnace Hazards without introducing an unrelated rule.
- All critical states remain understandable without gameplay text or numeric HUD values.
- Ordinary enemies remain distinguishable by silhouette, warning animation, and sound.
- The exaggerated industrial style supports oversized animation and effects without resembling realistic military art.
- Death, Repair Hive activation, and level completion are readable without words.

## Deferred Design

The following subjects intentionally remain open for later design rather than being implied by this level:

- Collectible types and rewards.
- Additional weapons and their evolution paths.
- Additional traversal abilities.
- Currency, experience, equipment inventory, and corpse-retrieval rules.
- Later locations, factions, NPCs, and the Tank's eventual name.
- Controller and mobile interaction.
- Accessibility options beyond key remapping.
- Exact final balance after hands-on playtesting.
