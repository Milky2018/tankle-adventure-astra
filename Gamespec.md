# Tankle Adventure — Astra — Game Specification

A lonely, wordless tank Metroidvania set in a cooling mechanical city. This document defines the agreed game design: its story, rules, progression, places, presentation and intended player experience. Region IDs identify geography, not a required visit order. Numerical values are the current balance baseline; travel times and spatial dimensions explicitly described as targets remain authoring guidance.

## Contents

1. [Identity and scope](#1-identity-and-scope)
2. [Story and narrative structure](#2-story-and-narrative-structure)
3. [Controls, cameras and core systems](#3-controls-cameras-and-core-systems)
4. [The eight abilities](#4-the-eight-abilities)
5. [Exploration and acquisition](#5-exploration-and-acquisition)
6. [The folded mechanical city](#6-the-folded-mechanical-city)
7. [Machinery and environmental interactions](#7-machinery-and-environmental-interactions)
8. [Combat and enemies](#8-combat-and-enemies)
9. [Regional journeys](#9-regional-journeys)
10. [Final approach and ending](#10-final-approach-and-ending)
11. [Interface and information](#11-interface-and-information)
12. [Art, sound and music](#12-art-sound-and-music)
13. [Experience requirements and open scope](#13-experience-requirements-and-open-scope)

## 1. Identity and scope

The Tank escapes a factory that has marked it for recycling, explores a lost mechanical civilization, and eventually chooses to sustain the furnace on which that civilization depends. The emotional direction is loneliness, mystery and occasional tenderness. The world moves more often than it answers: empty carriers depart, observatories transmit into silence, and repair arms attend machines that no longer wake.

The game combines direct movement and independent aim, a shared Heat budget, abilities that change both exploration and combat, and a vertically connected world. The Tank remains grounded on floors, ramps, moving platforms and supported water. There is no jumping, flight or high-speed gap-leaping ability.

### Design pillars

- **Discovery belongs to the player.** An obstruction appears before its solution. Acquiring an ability changes familiar geography and creates a reason to revisit it. Local composition suggests a likely continuation without objective arrows, written quests or forced gameplay camera moves.
- **Places have purposes.** Freight, cooling, cultivation, testing and communication determine room shapes, machinery and routes. Each major room offers a concrete situation to observe, try and change. Moving cargo, opening a firing window or establishing a crossing must affect usable space, not merely animate a machine beside an unrelated door. Ruins reveal interrupted habits and expectations, not just damage.
- **Abilities are physical actions.** Every acquisition supports exploration and combat. Gates communicate a material, force, surface or firing problem instead of an inventory check. Valid alternative solutions remain valid when the physical rules allow them.
- **Combat requires decisions.** Threat combinations change where the Tank moves, what it attacks first and when it spends Heat. Difficulty comes from readable pressure and spatial choices, not uniform HP inflation or hidden damage quotas.
- **Returns change the journey.** A nearby door, bridge, lift or express rail reveals a recognized place from another side and removes a real detour. The hub is a landmark, not a mandatory stop after each reward.
- **The world communicates without prose.** Shape, motion, sound, impact feedback, symbols and unlabelled instruments explain it. The world and its machinery do not use dialogue or written puzzle instructions. Menus, maps and the equipment HUD use concise English labels. Every acquired item remains identifiable through its icon, name and relevant count or improvement; acquisition notices explain the benefit without giving route solutions. English is the only supported interface language.
- **The Tank remains expressive.** Exaggerated industrial forms, headlights, antenna motion and mechanical timing supply personality without dialogue or realistic military styling.

### Current scope

The connected journey contains seven regions organized around exactly four Repair Hives, eight abilities including the starting Cannon, twelve ordinary enemy archetypes, the Prototype and four Boss encounters, permanent regional shortcuts, optional restoration scenes, ten dispersed equipment discoveries, and one voluntary ending. The Empty Hoist is machinery distributed through these regions, not an eighth region. The four refuges, regional loops and physical shortcuts define the city; room placement follows their relationships. Reorganizing routes and machinery does not change the agreed movement, Heat, weapon, upgrade or damage values. All seven acquired abilities belong to main progression. Magnet, Mortar and Flotation can be acquired in any order within the middle stage; all three have physical roles in reaching Phoenix. All five Bosses are mandatory: Prototype guards Overdrive, Sorter guards Mortar, Overseer guards Phoenix, Guardian guards entry into Circulation Works, and Keeper guards completion. Optional repairs and equipment reinforcements remain outside the completion requirement.

There is no ammunition economy, currency, experience, corpse retrieval, field healing, limited equipment loadout or mandatory restoration percentage. Acquired abilities remain available. Ordinary movement remains available during Overheat. Hazards do not bounce or teleport the Tank to safety.

## 2. Story and narrative structure

### The city before the journey

Factories, transport, gardens and observatories once shared a central furnace. Heat travelled outward through freight and service infrastructure; coolant and reclaimed material returned inward. The builders are gone. Their origin and disappearance remain partly unexplained.

The surviving machines inherited two duties: keep the furnace alive, and repair machines that can still work. As regulation and circulation failed, feeding the furnace more scrap prolonged operation without restoring efficiency. The city consumed unused equipment, then peripheral facilities, and eventually active machines. Each contraction preserved the centre while making fewer outer places habitable.

Repair Hives preserve the Tank while reclamation systems try to destroy it. Neither duty is secretly false; the failing city can no longer fulfil both together. The opening recycling attempt acquires a different meaning as the player understands the network.

Earlier mobile prototypes reached the furnace and served as replacement drive and regulator assemblies. They eventually wore out. Retired hulls, cradles and mounting sockets remain in successive chambers.

The player is a rejected experimental chassis that can accept modules from incompatible prototypes. Its apparent fault permits the combination of drive and circulation machinery needed for the final connection. This capacity is earned through exploration, not explained by prophecy or a secret identity. Docking supplies a working assembly and connection to existing fuel and stored heat; it does not create limitless energy. Future decline remains possible.

### The player's changing motivation

| Stage | Immediate purpose | What the world reveals |
| --- | --- | --- |
| Escape | Avoid reclamation and leave the Foundry | The factory rejects the Tank; Repair Hives preserve it |
| Find passage | Reach the freight hub and encounter the orange bulkhead blocking the deeper city | The factory belonged to a larger connected system; the visible destination cannot yet be reached |
| Restore local movement | Explore the magnetic workshop, cargo works and filter gardens in a chosen order | Freight, water and testing occupy different layers of the same working structure |
| Recognize earlier attempts | Recover Phoenix, return to the orange bulkhead, then penetrate the observatory and circulation works | Failed vehicles share the Tank's sockets; optical regulation and coolant both served the core glimpsed from above |
| Inhabit the completed machine | Keep moving through Overheat and reopen old infrastructure | Heat can be carried, and the inner furnace approach is now possible |
| Choose | Defeat the keeper, inspect the socket and decide whether to dock | The familiar repair-shaped interface needs the Tank's drive to sustain the city |

The Foundry establishes escape, the interwoven freight, garden and Testworks stage reveals the city's connected work, and the ordered observatory, circulation and predecessor descent reveals its failing regulation. The three middle acquisitions do not assume an order; their evidence complements rather than repeats itself. Optional care scenes and hidden equipment deepen that reading without carrying essential plot information; the five Bosses mark distinct stages of the required journey.

### Recurring wordless motifs

| Motif | First reading | Later reading |
| --- | --- | --- |
| Repair arms and vehicle-shaped sockets | Safety and recovery | A machine can be connected to support something larger |
| Empty carriers and inward cargo | Abandonment | Distribution has been inverted toward reclamation |
| Detached hulls and module mounts | Scrap and useful upgrades | Previous attempts to carry the furnace's load |
| Outward optical pulses | A distant curiosity | Continued expectation without a reply |
| A maintenance machine repeating a failed task | Habit | An individual activity the player can restore |
| A red hull with a steady engine | Dangerous combat commitment | A body that can sustain the final connection |

Essential meaning must remain understandable if optional scenes are missed. Small acknowledgements use a light, head turn or resumed task; machines do not speak, lead the player, or point at objectives. The ending's detailed commitment and continuation rules are in [Final approach and ending](#10-final-approach-and-ending).

## 3. Controls, cameras and core systems

### Input and movement

| Default input | Action |
| --- | --- |
| W / A / S / D | Direct camera-relative movement; diagonal speed is normalized |
| Mouse | Independent aim; mouse look in third person |
| Left mouse button | Fire the selected weapon |
| Right mouse button | Magnetic Traction |
| Q | Cycle acquired Cannon, Mortar and Laser |
| Shift | Hold grounded acceleration; Phoenix upgrades the same action |
| F | Deploy or retract Flotation |
| E | Contextual use, including Repair Hives and deliberate final docking |
| C | Toggle third-person and overhead views |
| Tab | Open or close the map |
| Escape | Pause and system settings |
| Space | Skip the death sequence; the ending also exposes its system Skip action |

Bindings can be changed in settings. Movement is direct rather than tank steering: the hull turns to follow travel while the turret aims independently. Direction changes remain immediate during acceleration. A stationary Tank cannot build boost by holding Shift, and pushing against a wall cannot replace Phoenix's run-up. Actual wheel motion follows travel and slope support.

Weapon switching does not clear Heat, bypass firing recovery or retarget a launched Mortar. All owned capabilities remain available; there is no equipment-slot restriction that can strand the Tank.

### Two camera views

**Third person:** a perspective camera follows behind and above the Tank. Mouse look changes the view independently of hull heading; movement follows that view. One reticle stays centred on the screen. Mouse look remains smooth and available while firing or using Magnet, regardless of input order. Looking upward must not rotate the camera into the ground or hull.

**Overhead:** a fixed three-quarter view follows position and supporting height smoothly. Movement remains screen-relative, and the single reticle follows the mouse continuously. It does not snap to enemies, jump between platforms or move because an aim range is reached.

C switches immediately, preserving position, progress and equipment. Each view is a supported player choice. Ramps and lifts do not unexpectedly rotate the movement frame. Gameplay never pulls the camera toward a solution.

Settings provides a paused, unobscured scene preview. Third-person controls expose pitch, follow distance, height offset, shoulder offset and mouse sensitivity; overhead controls expose downward angle and visible area. Each view remembers its own settings and resets independently. The third-person preset is Pitch 15.3°, follow distance 15, camera height 2.5 and shoulder offset 0. Mouse sensitivity is a plain numeric setting from 1 to 10, defaulting to 3. The endpoints correspond to the previous 1× and 10× mouse response; the interface does not show a multiplier. Adjusting presentation does not alter speed, weapon limits or progress.

Clicking the playfield captures the mouse; pausing or opening the map releases it. Where capture is unavailable, middle-button dragging turns the view and works alongside weapon inputs. Opening settings must respond to one pause action, without requiring a second Escape merely because capture was active.

### Aiming and obstruction

Cannon and Laser aim independently of the hull and can elevate or depress by **40 degrees**. Across a same-height open floor they remain level. At the angular boundary, the barrel and firing direction stop; the player's reticle does not snap to a different target. There is no angle-limit text or second projected-ground marker. A different supported firing position is the solution to a genuinely unreachable angle.

Mortar uses the same reticle, with a dashed ring and a light trajectory preview. It can target a landing behind low cover, but its arc still strikes a sufficiently high wall or ceiling. Aim intent stays continuous even beyond the weapon's reach; trajectory and impact show the actual outcome.

Visible surfaces and aiming agree. A translucent foreground must not cause aim to select an unrelated hidden floor, and transparency never removes collision. Floors, cover and roofs block actual projectiles and beams. Apparent targets must have usable firing terraces within the elevation limit; the limit is not an unexplained puzzle rejection.

### HP and damage feedback

| Rule | Current value |
| --- | ---: |
| Starting hull / base maximum | 5 segments (25 HP) |
| Maximum after five optional armour packs | 10 segments (50 HP) |
| Hit recovery and protection after an attack | 0.6 s |
| Player damage radius | 0.8 world units, inset from the hull |
| Enemy body and weak-point hit allowance | 15% larger radius than the underlying target |

Damage volumes and solid-body collision serve different purposes. Forgiving edge hits do not bypass armour; a surviving enemy remains a physical obstacle. Direct and repeated contact damage respect the protection interval. Furnace channels are a separate environmental hazard, described under combat.

A damaging attack adds a velocity impulse away from its source: approximately 1.2 units of displacement over the first 0.18 seconds, stopped by walls and unsupported edges. This impulse combines with normal driving; it does not reset engine speed or disable steering, acceleration, aim, equipment changes or world interaction. During the 0.6-second recovery the hull blinks and further attacks cannot deal damage. Cannon, Mortar, Laser and magnetic firing are disabled until recovery ends; held fire resumes then. Repeated hits cannot extend the recovery window. Death transitions directly to reconstruction presentation.

HP is restored at Repair Hives or through reconstruction. An armour discovery adds and fills its new 5-HP segment once; it is not a repeatable field-healing supply. Low HP changes lights, exhaust, motion accents and HUD colour without weakening control responsiveness.

### Shared Heat

| Rule | Current value |
| --- | ---: |
| Heat range | 0–100 |
| Overheat begins | 100 |
| Overheat releases | At or below 30 |
| Cooling delay after weapon/tool Heat | 0.75 s |
| Cooling delay after releasing Boost | Immediate |
| Base cooling rate | 50 Heat/s |
| Cooling with the optional filter upgrade | 62.5 Heat/s |
| Boost Heat while the engine actively accelerates or sustains boost | 15 Heat/s |

Weapons and tools add their own costs, listed with each ability. Shooting and boost costs accumulate together. Releasing Boost stops its Heat generation and starts cooling immediately, even while the Tank coasts above normal speed. Weapon/tool Heat retains its 0.75-second delay; releasing Shift does not cancel a shot or tool use that just generated Heat. A cold Tank can fire four consecutive Cannon shots safely; the fifth reaches Overheat.

During Overheat, weapons and the magnetic tool lock. Ordinary movement and Flotation remain available. Without Water Circulation, acceleration also locks. With it, grounded boost can continue or restart, keeps producing Heat and maintains the red-hot state. Displayed Heat stays capped at 100; continuing boost does not secretly start a self-damage timer or force a stop. Releasing boost permits ordinary deceleration, cooling and recovery.

The single reticle carries an unlabelled clockwise Heat ring, progressing from pale yellow through orange to flashing red. It stays red through the Overheated state. Steam, engine pitch and the Circulation hull glow reinforce the gauge; blue is reserved for magnetic affordances.

### Repair, death and persistence

There are exactly four Repair Hives: A, the Old Repair Room; B, Central Transit; C, the Eastern Distribution Hall; and D, the Furnace Service Room. Their locations and connections are defined in [the city](#four-refuges-and-the-world-ring). Each occupies a complete safe room with entrances that interrupt hostile sightlines. Other alcoves and maintenance fixtures provide neither respawning nor repeatable healing. Long expeditions reconnect to these four refuges instead of introducing another checkpoint.

A Repair Hive opens as the Tank approaches. Activation unfolds articulated tools, sweeps a visible maintenance light across the hull, restores HP and Heat, saves progress and establishes the respawn anchor. A world pulse communicates ordinary-enemy reset. Repeated repair may shorten its animation; reconstruction receives the full cycle.

An active Hive is a **safe refuge** on its own floor:

- Its surroundings reserve an 18-unit enemy-free radius measured to the enemy body edge. Initial posts and returning reinforcements respect the same boundary as patrols, pursuit, charges, magnetic pulls and drifting mines.
- Entering the inner 5-unit maintenance area ends pursuit. Mobile attackers return toward their posts.
- A thin mint floor ring marks protection. Incoming and outgoing fire dissipate at the boundary with visible sparks and a short blocked sound; explosion and contact damage cannot reach the protected Tank.
- Holding a weapon does not remove protection. Magnet may operate machinery, but the refuge cannot be used to attack enemies outside it.
- Mortar's preview shows interception at the boundary. Leaving restores normal reach and vulnerability. Protection does not extend to a different floor.

At zero HP, tracks stop, the turret drops, headlights extinguish and smoke rises. Music stops immediately and discards the defeated encounter’s musical continuation; machinery remains audible. Reconstruction starts the exploration theme matching Phoenix ownership, rather than resuming the previous Boss cue. After a brief held view, a Hive-shaped mechanical iris closes, then opens around the reconstructed Tank. The sequence lasts about three seconds and can be skipped. Reconstruction restores HP, clears Heat and retracts Flotation.

| Persists through rest, death and reload | Resets with an encounter |
| --- | --- |
| Acquired abilities, activated Hives and discovered geography | Ordinary patrols and temporary damage states; completed finite courts are excluded |
| Opened shortcuts, gates and completed machinery | Projectiles, mines and active fuses |
| Stable magnetic-object positions and completed restoration | Combat crates and pressure vessels |
| Defeated persistent Bosses and completed finite courts | Temporary shield exposure; removed enemy plates return with their bearer |
| Journey completion | Unfinished Boss arena locks and reserve deployment |

Incomplete moving-object puzzles retain a supported local retry, never a stranded platform or impossible saved state. Permanent route openings do not reconstruct on rest. Boss seals reset on death or reload; defeated Bosses remain defeated. A completed finite court stays cleared, including its reserve waves. Long routes expose intermediate return releases, and later major fights offer a return to a refuge before commitment. The opening Foundry expedition is the deliberate exception: its inward conveyor prevents a living Tank from returning to A until Overdrive is acquired; death still reconstructs at A. Reducing the number of refuges is balanced through route length, retreat and encounter placement, not extra field healing or unannounced combat-value changes.

## 4. The eight abilities

| Ability | Acquired at | Exploration role | Combat role |
| --- | --- | --- | --- |
| Standard Cannon | Starting equipment | Break exposed supports, scrap and impact mechanisms | Reliable direct fire and exposed weak-point hits |
| Overdrive | R1 Prototype | Reverse familiar conveyors and operate momentum machinery | Reposition, evade and ram suitable ordinary enemies |
| Magnetic Traction | R2 loading workshop | Tear out blue locks and plates; reposition the few movable cover carts | Strip blue shields, pull light enemies, disarm mines and intercept shells |
| Flotation Chassis | R3 dry filter-work ferry berth | Traverse the connected water network and reach new banks | Change firing angle and bypass suitable floor hazards |
| Mortar | R2 lower cargo installation | Reach protected targets through a clear overhead arc | Delayed attacks over low cover against clusters or committed targets |
| Phoenix Engine | R4 test building, after the three middle expeditions | Break momentum shutters and open express routes | Destroy ordinary enemies at full speed while preserving travel momentum |
| Laser | R5 emitter, after Phoenix | Reach distant receivers and route through mirrors | Sustained precise fire and indirect weak-point attacks |
| Water Circulation | R6 cooling rig, after Laser opens internal maintenance access | Continue hot travel and open thermal-contact routes | Double contact damage against every enemy category during Overheat |

Phoenix upgrades Overdrive's speed ceiling and shares its input; it still counts as an acquisition. Circulation is passive. There is no ninth ability or general-purpose heat-transfer, resonance, electrical-link or player-reflection tool.

### Standard Cannon

| Parameter | Value |
| --- | ---: |
| Heat per shot | 20 |
| Minimum interval | 0.5 s |
| Useful travel from the hull | Approximately 24 units |
| Direct damage | One Cannon-hit equivalent |

Shots travel straight without guidance, lock-on, gravity or aim correction. Ordinary cover and major structure stop them; designated scrap, exposed supports and impact paddles respond physically. A held fire input repeats at the weapon's cadence. There is no ammunition count, reload, charge shot or alternate ammunition.

Cannon remains useful after later weapons: moving targets can evade a delayed Mortar, while brief firing opportunities may not support sustained Laser exposure. Enemy weak points and machinery must remain aimable without artificially narrowing the shell's visible presence. Scorch marks and recoil communicate impact without making ordinary walls destructible.

### Overdrive

| Parameter | Value |
| --- | ---: |
| Normal speed | 9.8 units/s |
| Maximum multiplier | 1.6× |
| Acceleration from 1.0× to 1.6× | 0.5 s |
| Multiplier acceleration | 1.2/s |
| Release from 1.6× to 1.0× | Approximately 0.35 s |
| Offensive ordinary-ram threshold | 1.3× |

Boost requires movement input. Re-engaging during deceleration resumes from the current multiplier. Turning and turret aim remain responsive; there is no invulnerability, flight, wall passage or water-crossing permission.

An ordinary ram destroys a scout, gives a turret or an unshielded guard side a Cannon-equivalent hit, and loses speed against a surviving solid body. An intact guard front rejects the ram and stops the Tank without ordinary body-contact damage. Ordinary engine contact does not damage major Elites or Bosses. Phoenix and Circulation modify these rules only as specified below.

The opening has one traversable entrance: a conveyor on the single shared ramp carries the Tank downhill and defeats ordinary movement in the reverse direction. After Prototype, a short reverse conveyor on a level service passage teaches Overdrive safely. This lower passage reconnects at the foot of the single entrance ramp; the player then reverses the familiar downhill belt on that same ramp to return to refuge A. Both belts keep running. There is no pre-Prototype inspection return, adjacent confirmation switch or ordinary bypass around either lesson. Other momentum mechanisms must visibly respond to an impact, not merely to a held input.

### Magnetic Traction

Blue grip fittings, removable plates, mines and interceptable artillery shells share a recognizable magnetic material and shape. Holding the input always produces a scan, rings and sound, including with no target. A connected tether pulses toward the Tank, visibly strains the target and persists until release, obstruction, excess distance or a deliberate turn away. It never attracts the reticle.

| Parameter | Value |
| --- | ---: |
| Tether reach | 13 units |
| Empty-scan Heat | 3/s |
| Connected-pull Heat | 12/s |
| Driving speed during connected traction | 55% of normal |
| Repositionable cover travel | 3 units/s |
| Time to remove a blue shield | 0.7 s |

Ordinary magnetic machinery uses removable blue locks, pins or plates. Holding traction for about 0.6 seconds visibly loosens the part, then tears it free and drops it beside its mounting. The empty socket and green fixed lamp remain; its passage or linked machinery stays released after leaving or reloading. Releasing traction early lets an unfinished pull settle back. Any clear reachable approach works, without an invisible rail-axis or standing-position condition. Heavy machinery responds through the exposed coupling rather than the whole machine flying toward the Tank.

Solid walls and intervening cargo interrupt the tether. Only objects whose position needs repeated adjustment use visible rails: the Testworks cover cart and Sorter cover. These remain solid, move toward the pulling position, stop before bodies or unsupported edges, and preserve partial travel. The player can pull them back from the other end. Optional mirror carriages can use the same rule; ordinary access locks do not require rails.

A blue shield tears free, throws aside and briefly staggers its bearer; the missing plate remains absent until that encounter resets. Movable cover may remove the enemy's screen and the player's shelter together. Mines can be pulled and disarmed or shot from outside their blast; blue shells can be intercepted. These are advantages, not prerequisites for every combat encounter: flanking, cover and leaving a warned impact area remain alternatives.

Traction occupies the weapon and stops on Overheat with a short red failure pulse. Pulling a clamp can interrupt its charge. Repositioning a mirror changes its location; rotation occurs only where the visible mounting converts the pull into rotation. The tool does not grapple the Tank upward or tow it through unsupported space.

### Flotation Chassis

Paired pontoons extend with a mechanical opening sound. F toggles them; a deployed-state glyph remains visible. Flotation consumes no Heat and remains usable during Overheat.

| Surface / rule | Value or behaviour |
| --- | --- |
| Water cruise | 1.15× normal driving speed |
| Deployed land travel | 0.75× normal driving speed |
| Boost while deployed | Unavailable, including on land |
| Deployment | Cancels the speed multiplier |
| Retraction | Requires support beneath the entire hull |

Ordinary tracks cannot cross unsupported water, even at high speed. Floats support connected water surfaces but do not cross walls, voids or unrelated height changes. Dry ramps and low shore edges identify entry and exit. Attempting to retract over deep water gives a short sound and warm ripple, leaving the pontoons deployed; no sinking timer, hidden HP cost or teleport is introduced.

The first crossing is calm, brief and ends at a visible landing. Later currents are readable in surface motion and drifting debris and remain escapable or traversable in reverse. Local sluices alter actual flow between a few readable channel states. They neither drain the Gardens nor create a dry bypass around Flotation. Resting landings, alternative banks and firing angles make water an inhabited route rather than a long obstacle strip; currents are not a Circulation gate.

Weapons retain their normal Heat rules while afloat. Projectiles, beams, blasts and overhead shells remain dangerous. Only physically lower ground-contact hazards may be avoided. Wheels stop rolling on water; wakes and a gentler engine register distinguish travel. Red-state contact remains eligible on a valid enemy contact, even while afloat, but grounded engine boosting does not.

### Mortar

| Parameter | Value |
| --- | ---: |
| Maximum landing distance | 24 units |
| Nominal flight time to the aimed surface | 1.15 s |
| Arc rise above the start/end-height path | 10 units |
| Heat per launch | 35 |
| Minimum interval | 1.05 s |
| Blast radius | 3 units against enemy damage volumes |
| Ordinary-enemy damage | 3 |

The aimed landing surface is fixed at launch and determines the ballistic arc; it is not a timed detonation trigger. Player, ordinary-enemy and Boss Mortars explode only on actual contact with terrain, walls, ceilings, machinery or a damage volume. If a supporting platform moves away or a target is in empty space, the shell continues forward and falls under gravity until contact. A shell lost outside the playable space disappears without a blast. Elevated pressure trays retain their physical contact surface as the aiming reference. A visible arc clears low cover but strikes roofs and sufficiently high walls. Blasts respect intervening solid cover. An overhead hit bypasses an ordinary guard's frontal plate; it does not become a rear hit against a Boss with an armoured roof. Surviving ordinary machines are briefly staggered, providing a follow-up opening without suppressing Boss attacks.

Mortar is discovered at the far end of a cargo expedition from B, after moving freight, a small combined encounter and opposing conveyors have given Overdrive room to develop. It is not handed out beside the refuge or immediately after Prototype. From the quiet installation apron, a horizontal tray behind a low screen invites a safe first lob. A descending shot or nearby blast operates it; a level or rising shot from underneath does not. The release retracts the local screen and starts the return lift. On the way back toward B, a second load release settles a freight platform onto visible supports and completes the transport crossing. The freight battery then develops low-cover geometry in combat. Before Phoenix, the Testworks hanging load is approached through a magnetic grille and a flooded inspection passage. Mortar reaches its protected top from the far landing, changing cover and forming the ascent rather than repeating an isolated tray-and-door arrangement. Optional and final uses develop an approach behind a latch and an opened optical sightline.

A ground ring marks the estimated landing and blast radius while aiming, alongside the curved flight guide. A premature collision with machinery or a ceiling shortens the guide and turns the landing ring amber. The forecast follows the same continuing arc to its first predicted collision, including a lower floor beyond the intended landing point. No landing ring is shown when no collision is predicted. It does not promise a hit beyond a wall or lock onto moving enemies.

Mortar rewards predicting a committed enemy or cluster. Its delay, range and actual overhead clearance prevent it from replacing every direct or reflected shot. It does not home or pass through a roof simply because the cursor is beyond it.

### Phoenix Engine

Phoenix raises the same grounded engine to **3.2×** speed while retaining Overdrive's **1.2 multiplier/s acceleration**. From normal moving speed, maximum takes about **1.83 seconds** and a straight run-up of about **37.73 units**. Maximum world speed is **31.36 units/s**. Release deceleration retains the existing slope, approximately **1.71 multipliers/s**. Shared engine Heat is unchanged. Short entrance shutters leave at least 40 units of usable straight approach from a normal moving start; the faster base travel must not force a precise last-moment impact.

At the same full-speed threshold that lights the Phoenix HUD indicator, twin pale-yellow flames stream backwards from the hull and pulse gently. They follow hull orientation and disappear below that threshold or on death. Hull state, speed gauge and engine register reinforce readiness. At maximum, eligible barricades break and ordinary enemies die immediately, including frontal guards and mirror inspectors. Breaking an ordinary body or obstacle preserves momentum. Intact major structures remain solid, and a blocked hull loses speed.

The finite high contact tier is 12 damage before Circulation's multiplier; ordinary full-speed destruction remains guaranteed rather than weakened by later ordinary-enemy HP. Cold Phoenix does not grant a required Boss attack or bypass special-enemy armour. Its combat purpose is overwhelming ordinary opposition during travel.

The Phoenix installation opens directly onto a test runway and safe braking apron. Its roof return reveals B's familiar flywheel and rejoins the approach to the orange bulkhead seen on first entering the middle stage. The player breaks that original barrier with Phoenix before reaching refuge C and releasing the B–C roof cage from its far side. The lesson and roof return form one continuous route; no retracing of the installation entrance or new substitute wall resolves the stage.

Express tracks have long visible run-ups, broad turns, physical guide rails and safe braking aprons. They connect actual neighboring places through player-controlled movement. Initial shutters stay broken and service returns stay open. Normal express routes fit the pre-Circulation Heat budget; they do not demand repeated mandatory cooling stops or a new jumping ability.

### Laser

| Parameter | Value |
| --- | ---: |
| Total beam path | 90 units |
| Maximum reflections | 5 |
| Heat | 24/s |
| Damage | 4.5/s |

Hold fire to sustain a beam through visible mirror faces. Opaque structure and nearer bodies stop it. Reflection follows the actual surface orientation, including tilted or enemy-mounted mirrors; framed reflective faces and outgoing segments remain readable from both sides. Authored early puzzles use one or two clear bounces rather than exhausting the maximum path.

Selecting Laser shows a thin, dashed preview of its actual reflected path and a small contact light at the final obstruction. The guide remains legible across foreground scenery, but stops wherever a physical object blocks the beam. Previewing costs no Heat, causes no damage and operates no machinery. It remains available during Overheat; firing remains locked. The guide neither moves the reticle nor chooses a target, and disappears on weapon switching, death or final docking. The solid damaging beam follows the same path when fired, with a faint guide retained for obscured segments.

Movement changes the incoming angle and therefore the useful firing line. Main-route puzzles keep the firing surface, mirrors and receivers at a common supported firing height. Broad mirror faces, receiver surfaces and openings admit a useful standing area and modest aim error. The challenge is discovering a route or changing a machine's orientation, not holding an exact pixel or finding one invisible position. Mirror faces must remain visible in both supported cameras rather than presenting an edge to the overhead view.

A receiver's visible collecting face is its actual target. One hit latches a passage permanently; the player never has to hold a beam from one position while driving through a self-closing gate elsewhere. Mandatory puzzle mirrors belong to scenery, so killing a reflective enemy cannot destroy the only solution. Magnetic mirror-carriage combinations remain optional.

For the tracking Guardian, conventional weapons can damage only the rear. Its front, sides and roof are armoured. It faces the Tank while acquiring an attack, then holds that orientation through its committed warning, attack and 2.2-second recovery. Two broad mirrors behind its flanks each support a single-bounce rear shot from the approach side. Dodging provides a stable opportunity to choose a useful mirror; the next attack reacquires the Tank. A reflected hit is judged by the **final arriving segment**, not the Tank's location. Red Circulation contact remains a close-range alternative against other surfaces. Laser is acquired before this encounter, and its victory opens the actual internal descent into Circulation Works. The safe Laser return to C is available before combat.

### Water Circulation

The module installs passively, adding no input, water-ammunition meter or refill chore. Coolant jackets, moving pipes and steam show the closed loop protecting the drive while heat spreads into the body. It does not instantly cool the Tank or restore ranged fire during Overheat.

The engine can continue or restart while Overheated. The hull remains red until the shared recovery threshold is reached, including during cooling. This visible state defines contact eligibility. Continued boosted movement can sustain it indefinitely under the normal Heat rules.

| Contact tier | Red-contact damage |
| --- | ---: |
| Low speed | 2 |
| At the offensive acceleration tier | 4 |
| Full Phoenix speed | 24 |
| Repeat interval against the same target | 0.5 s |

These are twice the positive base contact tiers, applied once. **Every enemy category is eligible**, including shielded enemies, the Prototype and Bosses. Ordinary ram immunity is not a zero base value that cancels the ability. The body remains solid, hostile damage still matters, and overlapping an enemy does not deal damage continuously per instant.

The first hot run starts from a cold, safe approach. Visible grilles add 28 Heat/s to engine use, bringing the Tank into Overheat before a jammed maintenance-bridge lock. Red contact releases its hot fasteners; the supported bridge settles and connects to the return lift toward refuge C. A cold impact gives solid recoil. The far side releases an ordinary permanent cool bypass, so the lesson need not be repeated on every return.

Later work lanes let the player stay red to cross ordinary opposition or cool in a side room to regain ranged fire; both choices lead to the same local exit. The inner route combines continued hot movement with a thermal release and retains the ordinary opposing-belt speed. The player has already restored the optical maintenance route with Laser and seen this unsustainable hot passage on entering R6. Water Circulation resolves that remembered boundary and reaches the furnace descent. Completed optical and thermal work persists in this progression order; the vestibule is not a two-key collection hub. Physically consistent alternate solutions to optional thermal machinery are allowed; required route boundaries must be established by observable hardware rather than an unexplained immunity.

Circulation must have an exploration interval through familiar reopened infrastructure before the final descent. Staying hot trades ranged fire for contact combat and travel; cooling restores the other choices. It changes neither engine maximum nor acceleration and adds no mandatory Phoenix Boss phase.

## 5. Exploration and acquisition

### The exploration rhythm

The Metroidvania structure follows a cycle: notice an unreachable place, follow a promising local route, learn a new physical possibility, return to recognized geography from another side, and choose which earlier obstruction to revisit. The world supports meaningful alternatives while keeping at least one comprehensible continuation. It does not maximize simultaneously open doors for their own sake.

Each major ability needs a visible acquisition, a forgiving first use, a later variation, and a lasting exploration or combat application. Acquisition rooms have a purpose and a former user for the equipment. New tools are not crowded into adjacent empty rooms.

Regions have layers: preview, initial access and deeper access. Seeing the observatory from transit does not grant access to its upper optical loop or Laser. Seeing water before Flotation establishes a remembered place and another bank, not merely an inaccessible strip.

### Three scales of progression

The journey has three structural stages, with region IDs matching their geography: R1 is the introductory commitment loop; R2 Freight Exchange, R3 Sunken Gardens and R4 Proving Grounds form one nested middle stage; R5 Silent Observatory, R6 Circulation Works and R7 Central Furnace form an ordered penetration of the same eastern structure. Regions are not individual item rooms or a prescribed sequence of scene transitions.

| Stage | Earlier boundary | Interior development | Recognizable payoff |
| --- | --- | --- | --- |
| R1: commitment | The entrance conveyor prevents ordinary reverse travel | Foundry exploration, Prototype and Overdrive | Learn reverse movement on a short belt, then reverse the original entrance belt to A |
| R2–R4: nested exploration | A distinctive orange structural bulkhead near B blocks the visible deeper city; ordinary Boost cannot break it | Three acquisition loops for Magnet, Mortar and Flotation, with flexible order and cross-connections; a combined approach reaches the Phoenix facility | Phoenix's roof return reaches the original bulkhead from the starting side; break it to reach C |
| R5–R7: progressive penetration | An optical maintenance route is unreachable, a lower hot passage is unsustainable, and the core is seen before entry | Laser opens the internal descent; Circulation opens the remembered hot route; existing abilities restore the final feed | Enter successive layers of the same building, reopen lateral returns, and recognize A's foundation before the final commitment |

### Required dependencies

**Cannon → Overdrive → Magnet, Mortar and Flotation in any acquisition order → their combined physical approach → Overseer → Phoenix → original orange bulkhead → Laser → Water Circulation → inner route → final feed → Keeper → voluntary docking.**

Magnet and Flotation are required main abilities. Their acquisition approaches, and Mortar's, are independently reachable with Cannon and Overdrive. Magnet may open a convenient garden connection but never owns the only first entrance to Flotation. All six acquisition orders are supported. Partial progress can be left and resumed; none of the three loops requires an uncollected middle ability to escape. Sorter must be defeated for Mortar, and Guardian must be defeated to enter R6. Care activities and the ten equipment discoveries remain optional.

```mermaid
flowchart TD
    A["A: Old Repair Room"] --> F["R1 commitment → Prototype → Overdrive"]
    F -->|"Reverse the original conveyor"| A
    A --> B["B: Freight Exchange / preview orange bulkhead"]
    B --> M["Workshop loop → Magnet"]
    B --> O["Cargo loop → Sorter → Mortar"]
    B --> W["Dry filter loop → Flotation"]
    M -.->|"Near-door return / workshop-water connection"| B
    O -.->|"Local load and return platform"| B
    W -.->|"Under the familiar bridge / dry return"| B
    W -.->|"Care court inside-release door"| A
    M --> X["Grille → flooded passage → protected load / all three tools"]
    O --> X
    W --> X
    X --> T["R4 developed trial / relief / Overseer → Phoenix"]
    T --> R["Roof return → original orange bulkhead"]
    R --> C["C: Eastern Distribution Hall"]
    C -.->|"Far-side roof-cage release"| B
    C --> L["R5 optical loop → Laser / remembered receiver"]
    L --> OG["Optical Guardian"]
    OG --> H["R6 internal descent → Circulation / remembered hot passage"]
    L -.->|"Optical return"| C
    H -.->|"Lift and permanent cool bypass"| C
    H -.->|"Inside-release industrial outlet"| G["Earlier Gardens"]
    H --> D["R7 predecessors / D: Furnace Service Room"]
    D -.->|"Old maintenance shaft"| A
    D --> FEED["Load → opened sightline → final feed"]
    FEED --> K["Keeper → voluntary docking"]
```

Solid arrows describe progression, not a demand to return to B between acquisitions. Dotted arrows are earned returns. The three middle loops share actual spaces and lateral links: workshop windows overlook the water passage, cargo routes reveal the lower Testworks, and the garden circuit reaches a workshop rear opening. Optional exploration and ordinary encounters occupy these connections; no new mandatory ability or extra control is added to justify them.

### Middle-stage boundaries and partial progress

The orange bulkhead is encountered before the player commits to a middle expedition. Its heavy orange bracing, visible continuation, failed-impact response and usable future run-up make it memorable. It is a forward boundary for the stage, not a seal trapping the player away from A. Until Phoenix, no roof cage, upper walkway, water tunnel, optional Boss reward or far-side latch enters the later side of that boundary.

All three acquisition routes remain distinct local loops. Their rewards first resolve their own earlier obstruction; their containing stage remains unfinished. An acquired tool can also improve another expedition's approach or combat without becoming a prerequisite for that expedition's acquisition. Nearby connections mean the player may move from one loop into another directly.

The final Testworks approach is one coherent installation. Magnet tears the blue retaining grille from the lower inspection entrance. Flotation carries the Tank through the exposed water passage to a dry landing behind the freight bulkhead. From there, Mortar reaches the load's protected horizontal collecting surface; the released load settles onto supports, opening a usable upper ascent and changing the approach's cover. The top target has no early direct firing line or shorter dry reach. The dry frontage and water outlook are previews of this same machine, not separate paths that bypass its requirements.

Each completed action has an immediate visible consequence and persists. With a partial loadout, the Tank can reverse the approach to the established routes; it is not stranded after pulling the grille or reaching the landing. After the preparation route, a near-arena inside release reconnects to B before Overseer, bypassing repeated swimming and puzzle work on retries. The route uses the three tools because of its geometry, not because a final door counts collected modules.

### Acquisition loops and returns

| Ability or boundary | Encountered before acquisition | Expedition and first use | Return and larger role |
| --- | --- | --- | --- |
| Overdrive | The inward entrance conveyor defeats reverse travel | Foundry workshop and Prototype; safe short reverse-belt lesson | Rejoin and reverse the original ramp to A; enter the middle stage |
| Magnet | A blue fitting holds the near workshop door; the raised module is visible deeper inside | Cannon and Boost reach the shunting task; the carrier lowers Magnet; tear out the remembered door fitting | Return to the workshop entrance near B; later remove the Testworks inspection grille |
| Mortar | A horizontal tray lies behind the cargo screen, reachable from above but not by direct fire | The artillery corridor, moving freight and a pre-fight repair return lead to Sorter; victory opens the installation, then a safe lob releases the local return | Revisit the original screened crossing from the other side; later release the Testworks load |
| Flotation | Water, drifting freight and a visible far bank beneath B's bridge | Cannon and Boost reach the dry filter route without Magnet; safe launch then varied bank approaches | Pass under the known bridge, open the dry B return and garden-to-A door; later traverse the Testworks inspection channel |
| Phoenix | The orange bulkhead by B remains closed throughout the three loops | Combine the three abilities, develop them in R4, then defeat Overseer; safe engine runway and roof return | Break the original bulkhead to C, then open express connections |
| Laser | R5's inaccessible maintenance receiver overlooks the lower circulation system | Side galleries reach the emitter; a broad reflection restores the remembered optical route | Reconnect to C, apply reflection in ordinary combat, then defeat Guardian to enter the internal R6 descent |
| Water Circulation | The hot passage is visible on the cold approach into R6, before the cooling-jacket installation | Service work and encounters lead to the module; a safe hot operation establishes the bridge and cool bypass | Return through the remembered hot route, reconnect to C and the Gardens, then reach the core descent |
| Final feed and docking | The core and its supply apparatus were visible from higher layers | Reach D; restore the load-and-light supply loop using existing tools | Return through another door of D; Keeper retries omit the completed work; docking remains voluntary |

The three middle installations have different approaches, local consequences and return geometry. Their safe first-use spaces are not followed immediately by another ability or Boss. The later sequence is ordered, but returns and sightlines continually reuse known geography rather than treating R5, R6 and R7 as disconnected scenes.

### Ability locks and alternative solutions

- **Hard physical boundaries** include unsupported water, a visible momentum threshold, a protected overhead target, an optical path and a thermal-contact release. The whole surrounding space must preserve the claimed boundary: an upper balcony or a far-side lift must not accidentally open it early.
- **Alternative-solution obstacles** offer different ways to obtain a firing line or manipulate reachable hardware. Pulling cover, reaching another bank or lobbing a shell can all be valid where geometry permits. Do not add invisible immunity to force the expected tool.
- **Knowledge obstacles** ask the player to recognize an available action: pulling from the opposite side, changing a beam angle, holding a plate with the hull or timing an impact against an exposed mechanical part. No hidden input combinations or numerical recipes are required.

Main-path openings have evidence such as a seam, exposed support, machine using the passage or view of the room beyond. Randomly shooting every wall is never necessary. Critical mirrors and movable objects remain retrievable or have a local visible recovery. An optional enemy cannot be the only unrecoverable key.

A temporary commitment must be escapable or completable with every legal incoming loadout. No route demands its own reward, a newly introduced jump, accidental falling or simultaneous operation of distant controls. Do not alter steering or momentum rules merely to manufacture a lock.

### Returns, rewards and pacing

Each major loop develops **notice → safe experiment → spatial or combat variation → acquisition or discovery → useful return**. This is an experience rhythm, not a prescribed number or order of identical rooms. First understanding happens without enemy pressure; later encounters combine familiar rules with tactical choices. Completion needs no unrelated confirmation step.

Long expeditions open intermediate connections to one of the four refuges. Before a major Boss or the proving court, the player can release a shortcut, retreat and repair instead of committing wounded. Boss retries bypass completed puzzles and full encounter gauntlets. Completed finite challenges never regenerate their waves.

| Journey | Pacing target |
| --- | --- |
| From a refuge to a discovered major Boss entrance | Approximately 10–25 seconds; no compulsory lift wait |
| From D to the Keeper entrance | Approximately 10–15 seconds; no compulsory lift |
| From completing a new ability's first use to a refuge or clear transport junction | Approximately 15–35 seconds |
| An earned shortcut between the same start and end landmarks | At least half the original traversal cost, including lift waiting and travel |

These are composition targets, not timers, minimum durations or excuses to lengthen the first trip. Count ordinary waiting, missed departures and repeated combat when judging a return. Returning to a district entrance is insufficient if a long unchanged bridge still separates it from a useful destination.

Most inside-release doors become permanently bidirectional. A genuinely one-way carrier route needs a visible, independently usable return. All returns preserve earlier ability boundaries. Direct workshop, water, optical and cooling connections supplement the four-refuge ring so visiting a refuge is a choice rather than a compulsory step after every reward.

Exploration rewards include routes, tactical positions, discoveries and clearly completed acts of restoration. Not every mechanism needs an item. Optional hull and equipment upgrades are detailed below; none is required for the ending, and Heat capacity stays fixed.

### Optional equipment discoveries

Ten one-time discoveries are separated by exploration stages, different actions and meaningful revisits. There is no minimum coordinate spacing or requirement to extend the city outward for each reward. Two nearby places can belong to different moments when their visible approaches, height and earned connections establish that relationship. An ability installation must not immediately supply its reinforcement and several armour packs on the same short run.

Hidden items do not appear on the map merely because a room is discovered. A warm glint, the equipment silhouette, a visible maintenance opening or an unusual accessible side of a machine invites inspection. There is no global collectible arrow or written ability answer. Short detours reconnect locally instead of paying for rewards with long empty return corridors. Deep optional termini earn a reward, a lasting connection or a substantial discovery. Move crowded equipment into such destinations before adding collectibles. Judge separation by the playable route and acquisition stage: major equipment must have an intervening situation to develop, and optional equipment belongs in a corner, work recess or puzzle destination rather than the through lane.

| Reward | Location and discovery | Effect |
| --- | --- | --- |
| Armour pack 1 | A recessed scrap-inspection bay off the early press service lane. Turn behind the partition to find the pack before the long trip to Boost | Add one 5-HP hull segment |
| Armour pack 2 | The rear dock corner beneath the freight station, reached by the water-and-bank expedition; this rewards the deep dock detour rather than sitting beside Flotation | Add one 5-HP hull segment |
| Armour pack 3 | A discarded-chassis recovery area beside the Phoenix runway, entered through a full-speed breakthrough; a short loop rejoins the Testworks | Add one 5-HP hull segment |
| Armour pack 4 | An optical maintenance mezzanine whose entrance is recognized from another floor. Magnet tears out a blue retaining plate to release the access opening; the reward is inside the workspace, not another drawer at the end of a long spur | Add one 5-HP hull segment |
| Armour pack 5 | A retired predecessor's service room near D. Quiet inspection returns nearby; there is no additional wave or long vault corridor | Add one 5-HP hull segment |
| Cannon reinforcement | The far corner of the upper freight inspection spur. Clearing the four remembered high artillery positions releases the stores; retreat remains open and those guns stay destroyed | Cannon damage 1 → 1.5 |
| Mortar reinforcement | A horizontal circular pressure tray rests on an inspection cabinet behind a low screen. Its open top is recognizable from the approach; a lob through the framed opening lands in the tray and opens the adjacent reward room | Mortar damage 3 → 4.5 |
| Laser reinforcement | The instrument recess at the signal tower beyond Guardian. Restoring the dish releases this reinforcement, giving the long climb a concrete payoff apart from the transmission | Laser damage 4.5 → 6.75 HP/s |
| Cooling filter | A later condensate-island revisit. Flotation bypasses the pump room's defended front and reaches the island; a nearby bank closes the return | Cooling 50 → 62.5 Heat/s |
| Weapon scope | A rangefinding workshop observation branch. Moving a maintenance screen reveals a side entrance; the workshop's long firing line lets the player immediately experience the acquired reach. No repeated magnetic drawer sequence or extended return aisle | Cannon and Mortar range 24 → 36 (+50%); damage, Cannon speed, Mortar flight duration and firing rate unchanged |

Keep a mixture of easy local finds, visible-but-unreachable rewards, ability revisits and a finite combat reward. Hidden reinforcement hardware should advertise an unusual machine or accessible side route, without a map marker revealing the item or a written ability answer. Avoid hiding every reward behind a prop.

Armour raises the maximum from five to ten segments and fills only the added segment at pickup. Repairs and reconstruction fill the earned maximum. Upgrades persist through rest, death and reload and cannot be collected repeatedly. Cooling retains the weapon/tool cooling delay, immediate Boost-release cooling, Overheat thresholds and all Heat costs. Damage reinforcement modules preserve firing rate, range and blast radius. The scope extends Cannon and Mortar range by 50%; Laser range is unchanged. Mortar landing previews use the extended reach.

Acquisition briefly pairs an armour/fan/weapon pictogram with its numerical improvement. Added hull segments and an Armor card with five collection pips retain the armour count. A Scope card with a telescopic-sight reticle permanently shows +50% range. A named Cooling card shows +25%, while each reinforced weapon card permanently shows +50%. Ability cards carry concise English names, and acquisition notices show the item name and its specific benefit. These indicators restore from the save and do not depend on the brief acquisition animation. Reinforced Cannon and Mortar rounds are brighter and larger; the reinforced Mortar adds an inner blast ring, and Laser has a thicker energy core. The ordinary weapon appearances remain unchanged.

### Rooms with a playable purpose

A major room establishes an observable situation before its decoration: what first attracts attention, what safe action can test it, what usable space changes, what choice follows, and what counts as completion. Removing an unnecessary switch is preferable to dressing the same interaction as another machine.

Cargo, filters, stators, inspection screens and service benches provide actual cover, openings, paths or observations. Their geometry follows the room's activity and leaves both camera views readable. Combat and machinery interact when moving a load changes a firing line or a route, not merely because enemies stand beside a button.

Shorten connections that offer no meaningful movement, observation, fight or story. Quiet rooms remain valuable when they contain something worth noticing. Final room count and map size follow these situations and the return network, not an area multiplier or a quota of props.

## 6. The folded mechanical city

### Site and section

The city occupies neighboring structures around a great furnace shaft in a horseshoe-shaped industrial excavation. A broken transport bridge spans its middle. The Foundry sits below the southern transit deck, a water basin occupies the west, the Testworks rises through the rear/western cliff to the roof, and optical and circulation facilities share the eastern service structure. The central furnace lies below them all.

Routes derive from freight, drainage and maintenance. Scenic distance may imply a larger city without making every distant platform a destination. Playable scale comes from authored situations, not a requirement to triple floor area or repeat the same room loop in every region.

The R2 turntable is the reference height. Neighboring authoring bands begin about eight world units apart, with smaller offsets where useful. Bands are spatial guidance, not identical storeys or numbers shown to the player.

| Region | Height envelope | Physical relationship |
| --- | --- | --- |
| R1 Recycling Foundry | -2 to 0 | Under R2's south side; press foundation borders the garden canal; maintenance gallery faces loading works |
| R2 Freight Exchange | -1 to +1 | B and its orange bulkhead frame the middle stage; the workshop, cargo decks and bridge underside overlap the garden and Testworks approaches |
| R3 Sunken Gardens | -3 to -1 | Western basin; connected water near -2; upper pump terrace meets the eastern retaining wall |
| R4 Proving Grounds | -1 to +3 | Freight and water reveal the same lower installation; the three-tool approach rises to the proving floor, and the Phoenix roof return descends toward B's original bulkhead |
| R5 Silent Observatory | +1 to +5 | Upper loop beyond the orange bulkhead; galleries overlook R6 and the core, and Laser restores the internal maintenance descent |
| R6 Circulation Works | -5 to -1 | Below the same optical stack; reached through its restored internal descent, with a remembered hot passage, a garden-side outlet and the core approach |
| R7 Predecessors / Central Furnace | -7 to -5 | Deep beneath the city; D connects upward to A beneath the familiar press foundation |

The overlaps do not imply free travel between all surfaces at the same height. Actual floors, walls, water, bridge ends and supported landings define access. R1's recycling furnace and R7's central furnace are different machines, connected by material and heat infrastructure.

### Four refuges and the world ring

| Refuge | Place and recognizable feature | Expedition coverage |
| --- | --- | --- |
| **A — Old Repair Room** | Inside the Foundry, looking onto the bent press; the Tank awakens here | Foundry exploration, Prototype and the Boost return; later foundation revisits |
| **B — Central Transit** | Beside the split flywheel, before the orange bulkhead, with the roof cage above and canal below | The three middle acquisition loops and the earned direct retry to R4 |
| **C — Eastern Distribution Hall** | Beyond the orange bulkhead, where three coolant mains meet the eastern service junction | Phoenix payoff, the optical expedition, subsequent circulation returns, and optional late revisits |
| **D — Furnace Service Room** | Deep beside the central furnace, with an empty predecessor berth | Final supply restoration, Keeper preparation and post-ending exploration |

Each refuge supports multiple expeditions and recognizable returns. They are complete protected rooms, not exposed repair posts sprinkled along corridors. No other object grants a respawn or repeatable refill. A few visibly broken service fixtures may remain as scenery, without usable-Hive cues.

```mermaid
flowchart LR
    A["A: Old Repair Room"] <-->|"After Boost: original workroom ascent"| B["B: Central Transit"]
    B <-->|"Flotation circuit / inside-release returns"| G["Garden far bank"]
    G <-->|"Garden-side maintenance door"| A
    B <-->|"Phoenix breaks original bulkhead / far-side cage release"| C["C: Eastern Distribution Hall"]
    C <-->|"Laser descent, then Circulation opens the inner route"| D["D: Furnace Service Room"]
    D <-->|"Released from below: old maintenance shaft"| A
```

These are progressively earned permanent connections, not open travel at the start. Local loops and cross-region links supplement the ring; the player need not pass a refuge between every activity. The C–D route is progressively established through the optical descent and later thermal passage; both remain physical, supported and permanently restored for return travel.

### Shared landmarks and recognition

The distant furnace exhaust spine supplies broad orientation. Three structures are recognized from ordinary play:

- **Bent press:** first seen from A and the Foundry working floor, heard under the garden canal, then recognized from below before opening D–A.
- **Split flywheel:** seen beside B, from the water beneath its bridge, from the Phoenix roof return toward the orange bulkhead, and later from the released B–C cage.
- **Three coolant pipes:** connect C, the optical and cooling building, and the garden retaining wall; restoration changes the flow along this same structure.

Use the actual structure across these views, not duplicate scenic substitutes. Overdrive's first return visibly faces the known press. Phoenix's roof return reveals the recognized flywheel before descending to the original orange bulkhead. Guardian's tower descends to a previously seen garden inspection walk. The final maintenance shaft arrives inside the city the player left at the beginning.

Major regions need an internal height change and visible relationship to another region. A lift at each end does not by itself create a connected building. No gameplay camera cut is needed to explain recognition.

### Permanent connector allocation

The table specifies destinations and opening moments; its names describe geography, not instructions displayed on gates. Earned releases survive repair, death and reload. Inside-release doors generally become bidirectional. Lift unlocks start automatic service rather than a manual call or destination menu.

| Connection | First opening | What the return accomplishes |
| --- | --- | --- |
| A → Foundry workshop | Enter on the downhill conveyor on the shared ramp | One readable commitment, without a parallel route to Prototype |
| Overdrive installation → original entrance → A | Prototype opens its exit; reverse the short lesson belt, rejoin the ramp and reverse its original belt | Resolve the remembered reverse lock without disabling either conveyor |
| A ↔ B through the workroom | Boost crosses the northward opposing belt; release its local service door from inside | Ordinary return on the original ascent; no duplicate transit ramp or immediate second Boss |
| Magnetic workshop ↔ its near entrance / B | Pull the remembered blue lock after the shunting reward | Complete Magnet's local loop and reconnect to the stage's reference landmark |
| Cargo installation ↔ its screened approach / B | One first-use lob releases the local return platform and the familiar upper freight load | Revisit the original obstacle from its other side, with relief before later combat |
| B ↔ dry filter works | The existing dry approach is available with Cannon and Boost | Flotation acquisition is independent of Magnet and Mortar; a blue latch elsewhere offers convenience, not exclusive access |
| Garden far bank ↔ B | Float under the familiar bridge and open the dry inspection return from the far bank | Close the water loop without draining the basin |
| Garden care court ↔ A | Follow the south maintenance walk and shoot A's embedded east-door latch from the garden side | Return directly to the starting refuge without passing B; the gutter plant is not a prerequisite |
| Workshop rear ↔ garden circuit | Reach and release the rear opening from the water circuit; Magnet offers an additional nearby workshop access | Interleave two expeditions and allow a different next destination without a forced hub visit |
| Freight frontage / garden channel → R4 interior | Pull the inspection grille, float to the rear landing, then lob onto the protected load | One coherent three-tool ascent; the frontage and channel do not provide a shortcut around required abilities |
| R4 interior ↔ B | Open the near-arena maintenance return after the preparation route and before Overseer | Paired freight lanes support both directions; the earned inspection connection omits the water passage, machinery sequence and preparation encounter on repair trips and Boss retries |
| Phoenix installation → B's original orange bulkhead | Follow the engine runway and roof return to the starting-side acceleration approach | Complete the containing stage by breaking its original forward boundary |
| B ↔ C | Break that bulkhead, reach C and release the roof cage from the later side | Permanent stage crossing and an additional vertical connection; neither is an early bypass |
| R5 optical circuit ↔ C | Laser restores the receiver previewed at the optical entrance | Close the local loop before Guardian; its arena exit opens the next depth |
| R6 installation ↔ cold entry / C | Red contact establishes the bridge; a far-side latch opens a cool return and lift service | Resolve the earlier hot boundary and avoid repeating the heating lesson |
| R6 industrial outlet ↔ Gardens | Open the latch from inside the cooling works | Cross-region revisit; the garden side cannot enter the unearned circulation interior |
| R6 inner hot passage → R7 / D | Use Circulation on the deeper remembered thermal route after the optical descent is already restored | Reach the core through a progressive physical route, not a final two-key hub |
| D ↔ A | Open the deep shaft from D before the final feed and Keeper | Recognize the starting room from below; A cannot open the deep route early |
| D → final supply room → D | A load release exposes a side passage and a useful optical line; restore the feed | Return through another door; Boss retries omit completed supply work |
| Upper express line between B and C | Release its mounted latch from the C side after the Phoenix breakthrough | An additional express route; neither its early end nor Sorter victory can bypass Phoenix |
| Freight Sorter forecourt ↔ B | Release the service lift from the lower cargo approach before entering the arena | Retry without repeating the four-emplacement corridor; no extra Repair Hive |
| Guardian court → R6 / optional tower → upper Gardens | Victory opens the court's internal descent, the inspection return and the optional tower | Required onward movement follows the Boss; the tower transmission and reinforcement remain optional |

Every secondary approach preserves the stage boundary it overlooks. Far-side door housings, closed carrier couplings, water edges and real walls prevent premature entry without hidden ownership checks. Repeated local combat retries use doors or ramps rather than compulsory lift waits. The main return and the original approach must differ in traversal cost or discovery; two equivalent slopes do not constitute a shortcut.

### Architectural composition

Most workrooms and inhabited industrial spaces have substantial walls and ceilings. They need foundations, columns, door faces, service openings and coherent cargo or coolant routes. Missing panels expose a building that already makes sense. Plazas, water banks, inspection walks, outdoor bridges and the optical court remain open where their purpose calls for it.

Buildings differ first in their masses, empty spaces and routes, then in materials and light. A region must remain recognizable without its palette, title, map or music. Each has a dominant structure whose function explains its surrounding rooms; the same rectangular floor, perimeter wall and scattered machines cannot stand in for every building.

| Region | Dominant structure and space | What the Tank does differently |
| --- | --- | --- |
| R1 Foundry | A bent press spans sunken work pits; belts cross between thick machine housings | Move between production and maintenance levels; use moving cargo and machine cycles to cross firing lines |
| R2 Transit | A broad trussed station spans parallel freight lanes around the split flywheel | Read long destinations, then choose exposed lanes or lateral freight cover |
| R3 Gardens | Flooded lower rooms connect beneath broken greenhouse ribs and raised banks | Compare dry landings with current-driven water routes; approach buildings through former lower rooms |
| R4 Testworks | Compact preparation bays open onto a long runway and its braking court | Observe from the side, fight across the test floor, then accelerate along its full length |
| R5 Observatory | Galleries and side chambers face a tall calibration void | Understand equipment across open space and find useful viewing and firing angles |
| R6 Circulation | Large cylindrical vessels divide a dense network of work lanes and sheltered pockets | Fight around vessels, change exposure at junctions and alternate hot movement with cool refuge |
| R7 Central Furnace | Heavy radial foundations converge on one deep furnace well | Read the remaining service connections through intimate predecessor rooms before entering the immense core |

These are building families, not seven repeated room recipes. Ordinary rooms inherit local construction without repeating the main landmark. Each region needs contrasting spaces within that family: a work floor, service access and place of observation can have different proportions and pacing. Quiet spaces earn their extent through a reveal, recognizable return or small narrative relationship; they do not require another fight or pickup.

Enclosure and release alternate: a compact interior frames the next shaft view or familiar landmark. Avoid an uninterrupted network of exposed platforms, but also avoid replacing it with repetitive narrow corridors. Doorways and turns accommodate the Tank and both cameras. Compression comes from framing, shorter sightlines and smaller adjacent bays, not unusably low roofs. Normal roofed combat workrooms retain at least 16 units of overhead clearance and Boss halls 24; Mortar trajectories and supported ramps take precedence over a desired silhouette. Lower service canopies can shelter a route where overhead fire is not required, but cannot block an essential shot or crowd the configured camera.

A normal gameplay view has one dominant local space, a readable route through it and at most one competing distant landmark. A doorway, freight opening, broken roof or shaft edge frames that landmark deliberately. Unrelated upper routes must not fill the centre of an encounter's view. Concentrate overlaps at recognizable bridges, underpasses, ramps and return junctions. Supporting piers stay out of usable paths. Rails, markings, pipes and fixtures belong visibly to their supporting structure; there are no detached floating remnants. Structural detail stays mainly at boundaries and overhead edges; usable floor, targets and warning areas remain visually quiet.

Occluding portions of walls, ceilings, posts, floors and attached details become smoothly translucent along the view to the Tank and its nearby fighting space. The camera never shortens its configured following distance to avoid an obstruction. Whole floor tiles must not vanish, and the Tank's current support must remain legible. Transparency is a local aid, not a substitute for composing rooms that can be understood without several ghosted floors.

Both views share readable world lighting. Interior paths, undersides and machine sides retain enough indirect light; ceilings cannot turn the third-person view black. Far structures fade beyond the local room network without removing nearby junctions, readable weapon targets or important landmarks.

### Regional thresholds

Transitions belong to the existing connections, not extra travel corridors. A threshold shows why one facility touches another. Architecture, surface wear and ambient sound change across the same boundary; a glimpse of the destination precedes entry. Keep one shared structural element visible through the change so the city remains connected rather than a collection of unrelated sets.

| Connection | Threshold and recognition |
| --- | --- |
| Foundry ↔ Transit | The enclosed discharge opening leads beneath the station truss. Dense press strokes give way to hollow freight movement; the material line continues into the loading hall. The maintenance return looks back toward the same press. |
| Transit ↔ Gardens | Descending below the bridge reveals watermarks on its actual piers, then broken greenhouse roofs. Rail sounds remain overhead while water becomes foreground. The dry return emerges beside the familiar flywheel. |
| Transit / Gardens → Testworks | The freight frontage overlooks the raised load and trial hall; the adjoining water channel reaches their underside behind a blue inspection grille. Both views identify the same combined installation before its ascent opens. |
| Testworks → B's bulkhead → C | The runway leaves the test enclosure for a braking apron; the roof return shows the familiar flywheel and original orange barrier. The breach then exposes the three coolant mains at C, connecting the stage payoff to the next structure. |
| C ↔ Observatory | A broad service landing narrows the view through a thick equipment doorway, then reveals the calibration void between pale gallery edges. The coolant mains remain visible outside the optical apparatus. |
| Observatory → Circulation / C return | The Laser loop first restores the return to C. Guardian then guards the court exit and descent along the pipes. Victory also opens the old inspection descent and yard lift; neither can enter R6 early. Vessel walls and pump bases replace gallery bays, and the later C return is earned inside R6. |
| Observatory / Circulation ↔ Gardens | The tower walk looks down through broken greenhouse ribs; the lower industrial terrace follows the pipes to mineral-stained banks. These are two recognizable heights of the same retaining wall. |
| Circulation → D through the inner hot passage | Following the previously seen pipes leads past the thermal boundary into the same core glimpsed from the observatory. Deep foundations replace the upper panels; smaller predecessor rooms precede the full furnace-well view. |
| D ↔ A | The old shaft runs beside the actual bent press foundation and emerges inside A. Familiar press sounds arrive before the repair-room view, making the first location recognizable from below. |

Shortcuts retain these spatial cues without replaying an entire regional entrance sequence. Neither a new ability nor a Boss victory repaints a whole region: changed machinery, flow, opened views and working transport show the player's specific actions.

## 7. Machinery and environmental interactions

### A shared physical language

Door frames and the map do not display the ability required to pass a barrier. The player sees the obstruction itself: moving water, a reachable blue grip, a screened tray, a framed mirror or a braced shutter. A failed shot produces material-specific feedback, and cables show what an operated mechanism changed. Nearby safe examples establish these relationships before combat combines them. Discovered gates show only open/closed state; unknown routes do not advertise their solution.

| Affordance | Meaning and response |
| --- | --- |
| Recessed impact paddle or bullseye, spring and travel slot | Cannon-operable mechanism; recoil, sparks, sound and connected motion on impact |
| Yellow ready face / green operated lamp | Ordinary mechanism state; fixed jamb lights remain after a shutter retracts |
| Blue removable plate or U-shaped pull ring; visible rails only on repositionable carts | Magnetic traction; a torn part stays blue beside its empty socket while the fixed status lamp turns green |
| Framed mirror and circular optical collector | Optical route; contact flare and outgoing beam show the reflection |
| Mirror on a turntable with four quarter-turn marks | Each Cannon impact or Mortar blast rotates it 90 degrees; Laser only reflects |
| Horizontal circular pressure tray with an open top and raised rim | A descending impact or exposed blast from above presses it; side and underside hits strike the protective casing |
| Sprung striped pressure plate | Hull weight maintains an action; leaving releases it |
| Hinged treadle linked to track blades | One crossing changes the visible detent once; remaining on it does not toggle repeatedly |
| Reinforced braced shutter, dented wrecks and clear approach | Momentum can break the weakened structure; the supported run-up is visible |
| Heated load-bearing fasteners | Red contact releases a thermal barrier with steam and visible separation |
| Mint repair ring | Safe maintenance area and weapon boundary |

A direct-fire switch presents an upright impact face or an inclined panel inset into a door's upper edge; neither resembles an open collecting tray. Every mechanism intended for a lob uses a horizontal circular collecting tray, including the cargo return, freight platform, freight crossing, Testworks load, final supply load and optional Mortar reinforcement cabinet. Their differing consequences do not change this shared shape. The opening and rim are visible from the intended approach, and a successful impact visibly depresses the tray. A high tray's Mortar landing preview refers to its collecting surface rather than the ground behind it. No standing target quietly demands a particular weapon when an ordinary shot physically reaches its working face.

Shape identifies the action; colour identifies readiness and completion. A closed striped metal cover conceals an unavailable target and opens when its prerequisite is restored. The exposed target is yellow when ready and turns green when operated; blue remains reserved for magnetic fittings. Directional access comes from visible recesses, backplates and protected upper trays. A shot that reaches an exposed working face must not be rejected merely because the Tank stands on another floor or crosses an invisible coordinate boundary.

Mechanisms answer unsuccessful attempts with the appropriate impact, resistance or failed pulse. An inactive target must not feel like a broken input. Local door latches, magnetic locks and screen releases are embedded in the actual door or machine, without a separate pedestal. They face the usable approach and remain visible in both camera views. Inside-release shortcut doors expose their working face only to the earned side and stay bidirectional after opening. A same-side door with no traversal, discovery or tactical purpose is removed; empty-space cover locks are removed with their unnecessary obstacles.

Direct mechanical releases move their attached parts immediately. A remote connection uses a visible yellow cable or pipe leading to its actual consequence. The source latches immediately while green power advances along the connection; remote machinery waits until that front reaches its endpoint, with branches arriving together. A latch that also serves a remote return opens its own door immediately while the remote gate waits for power. Fixed wiring terminates at the frame and stays behind when the door retracts or a blue grip tears free. It never passes through closed machinery or takes unsupported shortcuts between floors. Saving and reconstruction retain unfinished transmission, while completed connections stay green without replaying the delay. Power flow does not leave disconnected floating lamps. Distant encountered links remain identifiable on the discovered map.

Player shots operate machinery through their actual paths. Earlier walls and cover intercept them. Enemy attacks cannot silently solve progression mechanisms. Decorative panels do not copy usable target shapes. Difficulty comes from space, timing and pressure around simple actions, not written instructions or arbitrary input recipes.

Ordinary shortcut doors can remain one-hit releases. A major machine must do more than decorate such a release: its movement changes a usable path, sightline, cover position or support. Unnecessary controls are removed. Mechanisms use a few obvious positions, visible stops and safe recovery; no new input, free-form machinery calibration or complicated simulation is required.

### Mechanism families

| Family | Player action | Playable consequence |
| --- | --- | --- |
| Conveyors and freight | Move with or against transport, follow moving cover, release accessible brakes | Change traversal, firing exposure and return direction |
| Rail carts and hanging loads | Shoot visible track blades or brake paddles; release a supported load through a clear arc | Change docking, cover, bridge support and passage geometry |
| Magnetic locks and cover | Tear out a blue lock or plate; move the few rail-mounted carts | Permanently release an opening or repeatedly change cover and firing windows |
| Sluices and water | Shoot a visible latch to change a local diversion plate | Alter actual channel flow and safe approaches to the bank |
| Mirrors and optical paths | Shoot from another position, shoot a quarter-turn mirror or move an obstructing screen | Change light paths, machinery access and weak-point firing lines |
| Thermal maintenance | Sustain a hot run and release jammed fasteners with red contact | Establish a maintenance bridge, hot passage and permanent cool return |

The same simple action develops through different spatial situations. A first demonstration permits safe experimentation; later uses change position, timing or tactical consequences. A carriage or screen can be useful in combat without demanding that every fight be solved through machinery. Decoration reinforces these rules rather than pretending to be an additional mechanic.

### Conveyors and momentum

Conveyor motion is a physical world-direction force applied to the Tank, enemies, movable bodies and wrecks on the same support, including slopes.

| Conveyor purpose | Speed |
| --- | ---: |
| Ordinary opposing traversal | 9.95 units/s |
| Foundry and Keeper feed lanes | 3.2 units/s |

Ordinary walking loses ground against an opposing lane; Overdrive makes progress without a prolonged crawl. The first Foundry belt carries the Tank into the expedition and prevents ordinary retreat. Its short post-Prototype return belt teaches reverse movement, rejoins the foot of the only entrance ramp, and lets the Tank reverse that original downhill belt to A. Short safe landings allow cooling; failure on the lesson belt merely returns the Tank to its starting apron. Neither belt is disabled or bypassed by a switch. Cargo crossings also interrupt enemy fire: the player can follow a moving load or use its passing cover to reach a firing position. Supported cooling and combat bays separate longer stretches.

Belts have dark beds, side frames, end rollers and moving transverse treads with regular warm marks. Movement follows the real direction and slope. Destroying a drive stops its belt for every body and leaves its tread surface in place. Thermal-contact lanes use the Circulation rules rather than faster conveyor tuning to exclude the earlier engine. Visible heating rails add 28 Heat/s while occupied. Red contact arrives during useful traversal, without idling against a shutter. Completed thermal restoration leaves a persistent ordinary return or cool bypass rather than requiring repeated heating ceremonies.

### Automatic lifts and freight carriers

Once released, a lifting deck continually travels between its stops, occupied or empty, dwelling **three seconds at each endpoint**. It also waits three seconds before its first departure. There are no landing call buttons, E prompts, boarding triggers or manual destination choices. Missing a departure means waiting safely for the next cycle.

A partly boarded hull pauses departure. A fully supported hull near the edge travels normally and does not arrest the platform between floors. An absent platform leaves an unwalkable recessed shaft; boarding never requires a precision jump. Automatic travel and unlocked routes remain after death or reload.

A lift's visible far-side coupling releases the whole service. Remove redundant ballast, upper-ratchet and arrival-confirmation steps that merely open the next door. A first ride can teach boarding and support without adding a second switch at the destination. Boss retries have a door or ramp route rather than compulsory lift waiting.

Suspended loads obey visible supports and safe catch zones. The cargo loop's first Mortar shot starts its local return; a subsequent freight-platform release settles onto supports to complete the remembered crossing. The Testworks load changes cover and establishes the supported upper ascent; the final supply load exposes both a passage and an optical sightline. These are different consequences of the same readable action, not separate trays connected to interchangeable doors. Players cannot be stranded by dropping a load, and a wrong or interrupted attempt retains a local recovery.

### Magnetic locks and moving cover

Most magnetic mechanisms release by tearing out a recognizable blue part. The first lock opens the maintenance return toward B; optical maintenance uses the same action to reveal its workspace. Loosening, separation, the dropped part and the exposed socket explain success without text.

Rails are reserved for repeated positioning. The Testworks cover cart remains a physical obstacle and can change a firing window in either direction. Its stops leave supported access and recovery space.

Movable combat cover changes both hostile and player lines. Sorter's rail cover remains a developed example: placement can interrupt its committed sweep and expose the drive, while its barrage discourages permanent shelter. The Tank can still win without using Magnet. Any optional mirror carriage is positioned and secured before firing; no mandatory task requires simultaneous traction and Laser use.

### Magnetic workshop shunting yard — R2

The two-branch rail puzzle occupies one readable workshop space within the already accessible freight layer. The start, track junctions, destination berth and neighboring reward lift can be inspected locally; no distant unexplained control is required. Shooting an impact paddle or crossing its hull treadle flips the visible track blades once. Remaining on the plate does not toggle repeatedly. A fixed yellow linkage ends at each junction pivot; paired metal rail tongues rotate to show the selected route. The linkage itself never acts as a direction arrow.

A Cannon hit releases the parked maintenance carrier's brake. It travels along the chosen track at four units/s. Correct routing secures it at the visible freight berth, operating the catch that lowers the adjacent lift carrying Magnetic Traction from its visible raised berth to the workshop floor. The module descends with the platform and becomes reachable when it arrives; no extra confirmation or reset action is required. Wrong routing returns it to its accessible start.

The signal recalls a moving carrier; nearby deliberate use remains an alternative. Recall does not launch a parked carrier, and shooting a moving carrier does not reverse or repeatedly restart it. Track changes lock during travel. The carrier pauses for a Tank or living enemy in its way.

An unfinished delivery can restart locally while track settings remain recognizable; a correctly docked carrier stays secured. The reward is Magnetic Traction, one of the three required middle-stage acquisitions. The installation is visible overhead before solving the puzzle; there is no duplicate module elsewhere in the workshop. The puzzle does not gate entry into R2 or the other two acquisition loops; its reward is physically needed for the later Testworks approach.

### Sluices, flow and the bridge-underpass return — R3

Before Flotation, dry filter walks reveal moving water, drifting debris and a visible inspection island. Shooting an exposed sluice latch changes a diversion plate between a few clear channel states. One branch becomes calmer while another remains fast; surface motion, floating debris and the force on an afloat Tank agree. A turning pump wheel alone is not the consequence.

The dry walk reaches the Flotation installation without requiring the reward. The first crossing is short, calm and faces a clear bank. Later the direct landing is covered by a turret, while a longer route around the filter wall permits approaching a blue shield from its side or rear. Both remain understandable supported routes, with safe places to land.

Following the current beneath B's familiar bridge reaches the far-bank latch of a dry inspection door back to B. It is a simple permanent release, not another pressure-plate-and-shot procedure. A water branch reveals the Testworks inspection channel; its entrance grille needs Magnet and its rear load needs Mortar before the upper ascent is established. The Flotation loop itself returns independently. Gates never drain the entire Gardens, grant ordinary tracks unsupported-water travel or bypass the first Flotation acquisition. The restored flow is part of the same place seen during the ending.

### Optional gutter garden — R3

Two hinged gutters and low cranks lead from a leaking pipe toward an empty planter. Shooting the impact paddles or pushing the cranks with the hull advances a gutter to its next detent. A hull must withdraw before pushing again; there is no additional interaction-button step. Falling water follows the actual gutter orientation.

A rust plug restricts the pipe to a trickle. One Cannon hit breaks it, before or after alignment. A wrong alignment spills harmlessly. Two seconds of settled, connected full flow fills the planter, raises its metal stem, unfolds five leaves and lights a blossom. Interrupted flow drains an unfinished planter; completed restoration remains.

A low partition shelters the activity from the far-bank firing lane. The plant grants no collectible, HP or route key. It is a quiet act of care, separate from the maintenance delivery.

### Optional maintenance delivery — flooded foundations

Flotation reaches a stranded tender and a supported maintenance ramp. A Cannon shot releases its brake; it crosses the short floating service lane, climbs to the upper inspection berth and lights that bay. It waits for occupied track. Unfinished delivery restarts from the accessible lower dock; completion leaves the tender at its berth.

The reward is a local change in activity and a story about useful work. The ending does not move this tender elsewhere: its final awakening shot uses the different cargo machine established beside the opening bay.

### Optical machinery

The pre-acquisition route shows receivers behind equipment, framed mirrors, side windows and partitions. After Laser, one broad mirror and a forgiving receiver restore the remembered optical machinery, opening the short gallery back toward C and the internal descent into R6. The player can leave by the original approach if the first reflection has not yet been understood.

Later rooms develop two variations: moving a latched inspection screen to a fixed stop reveals a previously blocked light path; walking to a side window changes the incoming direction through familiar rooms. Neither requires shrinking the valid aim area. One main-route mirror sits on a turntable with four visible quarter-turn marks. Each Cannon impact or unobstructed nearby Mortar blast turns the mirror 90 degrees in the same direction, repeatedly; four hits return it to its original orientation. The mirror itself is the target, with no separate switch or remote linkage. Laser reflects without rotating it. Fixed mirrors retain their orientation. It changes which path is available rather than asking for free-angle tuning or simultaneous vertical and horizontal calibration.

Receivers sit behind real geometry, with useful mirror faces and contact points visible. Mandatory mirrors are fixed or indexed scenery, never a uniquely surviving enemy. Required optical shots work from stable scenery and do not demand simultaneous traction. Optional magnetic carriages and reflective enemies extend the established rule; having acquired Magnet earlier does not make every reflection a magnetic task. A receiver latches its result, so maintaining the beam while travelling through a distant gate is unnecessary.

Guardian's arena uses two broad mirrors, recognizable firing areas and committed Boss facing. Its main approach and return exist before combat. After victory, the tower offers one legible outward transmission, a brief wait and a settled quiet working state, with no reply or explanatory text. A neighboring descent connects to the previously seen upper garden inspection walk. The tower closes an optional exploration loop rather than ending in a long retraced ramp.

### Thermal maintenance and recovery

Water Circulation's first hot run leads to a jammed maintenance-bridge lock. Red contact releases the fasteners and the bridge settles on visible supports, connecting the lift return toward C. The far side opens an ordinary cool bypass. Later routes offer a choice between continued red contact through ordinary opposition and cooling in a sheltered side room before restoring ranged fire; these local choices meet at the same exit.

The observatory's optical restoration opens the internal descent first. On entering the cooling works, the Tank sees the unsustainable hot passage leading toward the core; Circulation later resolves that boundary. These are successive parts of one building, not two independently collected prerequisites at C. The established route and its cool bypass remain usable in both directions; thermal restoration is not a repeated toll on late-game travel.

## 8. Combat and enemies

### Encounter composition

An encounter combines a spatial pressure, a protected or mobile target, and at least two meaningful responses. A distant gun with a close flanker asks a different question from a shield carrier with a repairer. Cover, opposing belts, destructible machinery, water approaches and reflected fire change those decisions. More enemies or more HP alone do not create a new encounter.

Most ordinary groups use two or three complementary roles. Their arrival and sightlines must be readable before several attacks overlap. Heavy warnings within one squad take turns. Combat does not depend on whether a target happens to be on screen: directional sound and edge warnings communicate a relevant attacker beyond the camera, while unrelated floors remain visually subordinate. Enemy sight, physical cover and remembered sightings govern attacks; enemies do not know an unseen Tank's position through walls.

Mobile enemies pursue a last sighting for eight seconds and stay within 32 units of their home position. Guards and welders advance during recovery; skirmishers strafe during bursts; ranged specialists reposition between attacks; repairers follow damaged allies. Fixed turrets and heavy machinery stay fixed. Retreat to a Repair Hive ends ordinary pursuit. Ordinary encounters leave retreat available and do not all require extermination.

The Testworks approach has one short combined encounter: a shielded guard protects an artillery position around the test equipment. It has no wave trigger, reserve pair or kill-count exit. An observation interval and the earned return to B separate it from Overseer. Boss retries bypass this preparation and encounter. Boss reinforcements follow the separate arena rules below.

### Twelve ordinary archetypes

| Archetype | Silhouette and behaviour | Decision it creates |
| --- | --- | --- |
| Clamp Scout | Low rust-orange jaws and a horizontal sensor; closes, locks direction, then commits its whole body to a charge | Evade sideways, bait solid cover and punish the stagger; avoid retreating along its line |
| Fixed Turret | Pale spindle or tripod with a coil hood; holds a lane and exposes a cooling interval | Cross between volleys, break cover, flank or counterfire during recovery |
| Shield Guard | Broad refractory plate and narrow slit; advances while protecting its front | Flank, lob over it, or strip a blue shield with Magnet |
| Skirmisher | Four wheels and paired guns; circles while firing a three-shot burst | Intercept its route or remove the partner that makes following it dangerous |
| Rail Sniper | Long raised rail; tracks with a red aim line for a 2.2-second warning, locking the final 0.8 seconds | Reach cover or leave the committed line before a 120-units/s shot with 86-unit reach |
| Artillery | Raised mortar cup; brackets a remembered target with three staggered ground circles and visible arcs | Keep moving, reach the launcher, remove its spotter or intercept a blue shell |
| Miner | Retreats while lobbing a limited supply of blue discs that arm after landing | Shoot or extract a mine, change approach, or advance before it establishes a field |
| Welder | Paired bottles and a short nozzle; advances while preparing an 18-unit sweeping flame, then pushes forward along a committed bearing | Leave the warned sector, pass behind it or break the flame with solid cover; avoid retreating directly along its approach |
| Repairer | Tender arms and a green repair beam; restores a living ally at a finite rate and needs a clear line | Interrupt the beam, separate the pair or prioritize the repairer; it never resurrects a destroyed unit |
| Mirror Inspector | Broad pale reflecting face and paired angled shots; reflection follows its real facing | Flank, lob above it, use red contact or redirect Laser toward another target |
| Canal Hunter | Low amphibious patrol hull, paired blue torpedo tubes and twin wakes; strafes on water, locks a firing line, launches two spaced torpedoes and pauses | Move across its line, break sight with a pier, intercept its torpedoes or lob at its stationary recovery |
| Dredger | Broad pontoons, a circular intake and a removable blue grille; warns, draws water along a fixed sector, warns again and bites at the mouth | Exit sideways, keep a solid obstacle between the intake and hull, interrupt with Mortar or tear off the grille |

The opening Foundry introduces scout, turret, guard, skirmisher and welder behaviour. Freight and water routes add long-range aim, artillery and mines. Optical and late industrial routes combine mirrors and repairs with previously learned threats. Elite machinery and Bosses do not count toward the twelve archetypes.

The Guard's front reduces damage by **60%**. A pale plate flash, outward sparks and a hard ricochet distinguish armour contact from the orange response of a damaging hit. Blue shields use the same removable-material language as other magnetic objects. No enemy has a hidden maximum damage allowance per vulnerability window.

### Water encounters

Both water machines remain visible and damageable at the surface. Neither submerges into an invulnerable waiting phase. Water movement follows connected surfaces and real shores, with the same sluice currents as the Tank. The Hunter can reach land through low banks and ramps; its land travel and turning are slower, and it fires ordinary straight shots there. The Dredger stays afloat. Ordinary pursuit remains local, and all repair-refuge boundaries still apply.

The Hunter warns for 1.3 seconds, then sends two straight, non-homing torpedoes down the committed line, 0.65 seconds apart, at 12 units per second. Blue shells and pale wakes show their paths. Solid cover and dry banks stop them. Cannon or Laser can destroy a torpedo, and Magnet can intercept it. The Hunter pauses for two seconds after launching, giving Mortar a predictable target. Its first appearances have three HP; the late condensate Hunter has four.

The Dredger has five HP. A 1.2-second intake warning precedes 2.8 seconds of suction in an eleven-unit forward sector. It cannot turn during suction. Water streaks and floating fragments travel toward the mouth, and floating wrecks can be drawn in. Pull speed is 2.4 units per second, weaker than ordinary water cruise; suction does not deal damage, disable steering or require Boost to escape. Dry ground, another floor and intervening solid cover block the effect. A separate 0.8-second warning precedes one close bite, followed by a 2.4-second recovery. Mortar damage interrupts the current attack. Magnet tears off the blue grille and causes a longer stagger; the grille stays absent until the encounter resets, while subsequent pump cycles can resume. No magnetic ability is required to defeat it.

Introduce a patrol visible from the reservoir bank before Flotation without blocking its dry acquisition route. Preserve the first short crossing from the ferry bank. A later water lane introduces a lone Hunter with a pier; the reservoir pump pocket introduces a lone Dredger away from that first crossing. The optional condensate basin combines one of each around cover and two possible banks. Warnings start in sequence rather than simultaneously: suction can draw the Tank out of cover before the Hunter commits its line. Calm canals remain between encounters, and no required water passage becomes an extermination gate. Sluices change actual approach and drift for both the Tank and swimmers.

### Durability and cadence

Opening scouts have one HP, turrets two and guards three. Transit and reservoir light/heavy defenders retain their two/three-HP baseline. On the optical and coolant city routes, those light/heavy categories have four/five HP. Service-district health scales from its authored base by 1.25 in the Testworks, 1.5 in optics and coolant, and 1.75 in the deep Hearth, rounded upward. These are area-specific baselines, not a second multiplier on every route unit. Full-speed Phoenix still destroys ordinary enemies regardless of these increases.

| Ordinary enemy | Movement speed | Recovery after attack |
| --- | ---: | ---: |
| Scout | 5.6 | 1.5 s |
| Turret | Fixed | 1.5 s |
| Guard | 3.8 | 1.6 s |
| Skirmisher | 6.2 | 1.4 s |
| Sniper | 2.8 | 2.2 s |
| Artillery | 2.5 | 2.8 s |
| Miner | 4.6 | 2.1 s |
| Welder | 6.8 | 0.9 s |
| Repairer | 4.5 | 2.0 s |
| Mirror Inspector | 3.2 | 1.9 s |
| Canal Hunter | 6 in water / 3.3 on land | 2 s |
| Dredger | 2.4 in water | 2.4 s |

The Welder closes and tracks during the first 0.55 seconds of its 0.9-second warning, then stops and locks its bearing for the final 0.35 seconds. Its 1.8-second sweep advances at 55% of movement speed along that bearing without tracking the Tank. Both the warning sector and flame stop at solid cover. Flame damage remains one health segment; pressure comes from reach and movement, not increased damage.

Boss attack sequences override ordinary cadence. Readable commitment and exposed recovery remain essential even when an enemy moves aggressively.

### Damage to the Tank

Damage to the Tank is expressed in whole hull segments; one segment is five HP. Enemy health and player weapon damage use their existing combat values.

| Attack | Hull segments per accepted hit |
| --- | ---: |
| Ordinary enemy projectile, including Skirmisher | 1 |
| Sniper shot | 2 |
| Enemy Mortar direct impact or blast | 2 |
| Mine explosion | 1 |
| Welder flame contact | 1 |
| Boss fan and battery projectiles | 1 |
| Other ordinary Boss projectiles | 1 |
| Boss homing missile | 2 |
| Boss aimed barrage, direct hit or blast | 2 |
| Boss sweeping beam and Sorter sweep | 2 |
| Hunter torpedo or land shot; Dredger bite | 1 |
| Dredger suction | 0 |
| Ordinary enemy body contact, including a failed ram into a shield | 0 |
| Scout, Elite or Prototype during a committed charge | 1 |

Ordinary bodies still block and displace the Tank without damaging it or consuming its hit-protection window. A charging machine is harmful only during its actual charge; anticipation and recovery are harmless contact. Mortar direct impact and blast carry the same two-segment payload, and consecutive-hit protection prevents charging both for one impact. Continuous fire and beams also respect the protection interval; their values are not damage per frame.

Mortar arcs clear tall machinery while staying below the normal sixteen-unit workroom ceiling. Player shells rise ten units above the straight muzzle-to-target line; ordinary enemy lobs rise nine over 1.9 seconds, and Boss barrages rise ten while retaining their distinct timing. Where required firing lanes lack headroom, use an open roof bay rather than flattening the arc until it cannot cross cover. Roofed workrooms provide at least sixteen units of headroom, and the large enclosed Boss courts provide twenty-four. Low protective canopies remain physical cover. Player Mortar range, flight duration, blast radius, damage and Heat costs remain unchanged.

Enemy projectiles stop at the first physical body and can hit other enemies for one Cannon-equivalent damage before armour. Enemy Mortar blasts deal three to other machines, excluding the launcher. Friendly fire does not operate switches.

### Cover and environmental pressure

Wood-braced crates have two HP and can be broken by fire, ramming or committed enemy charges. Steel cover stays solid; blue rail-mounted cover can be repositioned. Charge warnings must describe the whole swept body, including the path ends, rather than drawing a misleading thin line.

A pressure vessel ignites on the first hit or ram and explodes after a full 0.8-second fuse, within a 5.5-unit radius, for three damage to enemies and eight to the Tank. More shots do not shorten the fuse. Each chained vessel starts its own full warning. Cover that is intact when the explosion begins protects bodies behind it, even if that blast destroys the cover. Blasts do not unlock unrelated progression mechanisms. Destructible combat props reset with ordinary combat; permanent route changes do not.

Shallow furnace spill is traversable but deals five damage every 0.5 seconds, independently of ordinary consecutive-hit protection. Physical exit ramps remain available. Acceleration can shorten exposure; the hazard does not return the Tank to a platform automatically.

### Committed Boss arenas

Prototype, Freight Sorter, the Testworks Overseer, Optical Guardian and Final Keeper each occupy a bounded arena. When the Tank has entered completely, visible striped shutters close with a mechanical cue. A dormant Boss cannot be damaged from outside; hits produce protected-metal feedback.

The seal persists through venting, exposed phases and reinforcement deployment. Victory retracts the shutters and ends active arena hazards. Death or reload resets the encounter lock. All five fights are required, although the player may postpone Sorter while choosing the other middle expeditions. Sorter guards the Mortar installation in Freight Exchange, and Guardian guards the only first entry into Circulation Works. The upper B–C express latch is earned through Phoenix exploration independently of Sorter. Ordinary encounters do not inherit these seals, and a sealed fight cannot be escaped by reaching a nearby refuge.

Projectile warnings last at least 0.85 seconds, lock before release and show both battery origins when both will fire. Barrages retain visible landing areas throughout flight. Reinforcement hatches light for two seconds before a reserve can attack. Main projectile Bosses provide at least one second of recovery. Reserves are finite. An active Boss health bar remains visible throughout the fight, including when cover hides its body.

| Boss | Structure and pressure | Player response and reward |
| --- | --- | --- |
| Prototype | Nine HP; a pressing carriage with a broad ram, readable radiator lids and alternating Cannon volleys and committed charges. Each Cannon volley has a fixed warning followed by three spread shots and a recovery opening. Below roughly half health, the charge becomes two charges, each with a fresh warning | Bait an impact into solid cover to cancel the follow-up and expose the drive. Defeat opens the visible Overdrive cradle and return route. No damage quota limits a successful punish |
| Sorter | The mandatory freight machine guarding Mortar, which moves rail cover and alternates a committed arm sweep with ground barrages. Hiding behind cargo invites a barrage | Read the pale-to-red-to-dark sweep warning and use its cover interaction to interrupt the arm and expose the drive. Magnet adds control of rail cover, but ordinary movement and Cannon remain viable. Victory opens a quiet Mortar installation. Cannon and Boost suffice for the fight; Magnet is a convenience, never a prerequisite. The service lift to B is released before commitment |
| R4 carrier hall / Overseer | Four HP per side battery and six in the core, fourteen total. Alternating batteries release staggered fans and aimed ground barrages. One finite pair of light reserves enters below 60% health | Use cover and side routes, then exploit open drive windows. Destroying a battery cancels its unreleased volley and stops its associated machinery, creating a flank. Ordinary Overdrive is not a Boss ram solution. Victory exposes the Phoenix installation after the three developed acquisition loops; a short quiet approach separates combat from its safe engine lesson |
| Optical Guardian | Forty-eight HP; armour protects front, sides and roof. Tracks between attacks, then holds its facing through warning, attack and recovery. Five-lane fast fans alternate with paired seeking shells whose turning is limited and ends before impact | Dodge the committed attack and use the stable recovery to find a reflected rear shot through broad mirrors and a clearly exposed rear aperture. Red contact is an alternative. No per-window quota. Victory opens the internal descent into R6, plus the optional transmission and tower descent to the upper Gardens. The safe optical return to C precedes the fight |
| Final Keeper | Two nine-HP feed assemblies and a sixty-six-HP core, eighty-four total. Alternates batteries, seeking pairs, barrages and an exposed-core sweep. Below 40% health, tighter fans overlap a delayed ground strike | Destroy feeds to stop their local belts and open flanks. Both destroyed feeds leave the core continuously vulnerable, including during its attacks. Reserve pairs become eligible at 65% and 32%; no more than two reserves may be alive or deploying |

A successful Keeper fight targets roughly 20–40 seconds with ordinary or fully reinforced weapons. Additional endurance belongs to the core; feed assemblies remain quick to dismantle. This is a pacing target, not a forced timer or per-phase damage quota.

The Keeper counters repeated fire from behind cover with a warned indirect attack acquired from sight or incoming fire, never from unknown movement through walls. Mortar remains useful, but staying behind one crate and holding fire must not solve the whole fight. Reflected fire, relocating under pressure and red ramming offer distinct approaches.

A full-speed red impact's damage can pass from a destroyed feed assembly into the core; it is not discarded at a component boundary. Four such clean impacts can defeat the Keeper. Cold Phoenix contact remains ineffective against Boss armour. The strength of an earned ability must not be erased by a hidden phase cap.

## 9. Regional journeys

Each region develops a distinct spatial activity around real machinery. The [four-refuge network](#four-refuges-and-the-world-ring) supplies expedition anchors; the [connector table](#permanent-connector-allocation) specifies returns. Room count, colour changes and additional switches do not establish variety. Simple actions gain depth through different positions, consequences and tactical choices.

### R1 — Recycling Foundry

**Purpose and character.** Receiving pits, sorting presses, service trenches and a local recycling furnace form a plant still reclaiming active machines. Dirty refractory blocks, worn teal machinery and warm furnace apertures contrast with readable cool fill. Heavy knocks and conveyor clatter organize the journey along the working line.

**Building and light.** The bent press is large enough to explain the building around it: its head spans a recessed production floor, its legs form substantial boundaries, and maintenance routes follow its sides. Belts cross the pits on supported frames rather than lying as painted strips across one broad slab. High roof gaps illuminate worn working edges; warm light escapes specific furnace mouths. Soot gathers above exhausts and abrasion follows cargo, leaving the service side quieter and visibly less worn.

The opening view frames the press from A's protected doorway. The journey alternates its tight side bays, a crossing beneath freight and an open machine court; it does not repeat identical fenced production rooms. Recesses explain height without creating precision-driving ledges. Cargo and housings define cover and enemy approaches, while the overhead press remains outside essential firing lines. The later garden and deep-foundation views reveal this same structure's supports, not another press used as decoration.

**Observe and experiment.** The Tank awakens in A facing the only traversable entrance: a single shared ramp with a supported downhill conveyor. It carries the Tank down into the Foundry, and attempting to retreat makes the directional limit tangible. Solid side boundaries prevent walking around the belt or leaving the ramp sideways. Its lower landing opens onto the press route; the separate northward transit approach remains physically opposed by its conveyor until Overdrive. A scout is visible before it attacks, followed by cargo crossings. Moving freight periodically blocks a turret's line: follow its shelter or use its passage to reach a firing position. One visible latch lowers a loading frame onto supports, opening a short path while removing cargo that screened an enemy. The machinery changes the situation in view.

**Challenge and return.** Workshop mechanisms lead to Prototype through its intended entrance. No parallel inspection ramp grants early access to the Boss or a return to A. The sorting crew defends its own working floor; surviving workers do not pursue into the engine cradle or return lesson. The arena provides solid obstacles and clear flanks for its charge, with the engine cradle visible. Victory opens the exit shutter automatically. Acquiring Overdrive leads onto a short level reverse belt with a safe run-up and no enemy pressure. The level service passage runs beneath the upper entrance corridor and rejoins the foot of the original ramp. Ordinary travel through the passage allows cooling before the climb. There is no second return ramp or lift. Reversing the familiar downhill belt on the shared ramp completes the ability lesson and restores access to the original refuge. No extra shot switch confirms the return, and neither conveyor stops. From A, Overdrive can now cross the separate northward opposing conveyor to a quiet transit workroom and the route to B. Inside service releases make the return ordinary; no second Boss stands immediately beyond the Boost lesson.

**Aftermath.** The former Overseer workroom is a transit space, not another arena. Crossing into B gives the first ability loop a clear end, without adding a post-Boss Hive or an end-of-level modal. The player leaves knowing how the Foundry folds around the starting room. Only the original workroom ascent connects this approach to Transit; no parallel return ramp duplicates it. A later visit from the Gardens opens the starting room's east maintenance door. Preservation and reclamation remain an observed contradiction, not an explained backstory.

### R2 — Freight Exchange

**Purpose and character.** The split flywheel, turntable, loading galleries, warehouses and sidings form one freight system. Oxidized machinery and hollow carrier sounds contrast with B's sheltered room. Empty inward-facing cargo clamps reveal distribution turning into reclamation.

**Station and side rooms.** A broad roof with visible trusses spans the principal freight lanes. Long roof lights illuminate their direction; lower lateral stores break that length into cover, loading openings and small inspection spaces. Crane bridges belong to the roof edges and freight system, leaving the Tank's view of lanes clear. The split flywheel interrupts the station axis and identifies B; it is not repeated in every warehouse. Worn metal lanes, pale dusty margins and scraped loading faces distinguish Transit from the Foundry's refractory pits.

The main hall gives early destination views, but crossings between shelter are short enough to read an enemy's warning and choose a response. Freight racks have solid bases that actually stop fire; open upper frames preserve orientation. The magnetic workshop feels like an adjoining assembly bay, with suspended fittings and occupied work berths around the installation, rather than a new empty hall. Stores use close rack corners, the shunting yard uses a locally visible open junction, and the roof return reveals the station's whole span. These spaces have different tactical purposes without multiplying parallel empty tracks.

**Stage entrance and remembered boundary.** B provides repair and a pause after the Foundry return. The first exit frames the distinctive orange bulkhead on the main line toward the eastern city, with its continuation visible through a structural opening. An ordinary Boost impact produces a clear failed-force response. A readable acceleration approach remains available for the later Phoenix return. The roof cage is visibly secured from the far side, so it cannot turn the same obstruction into a lift bypass. The workshop opening, cargo screen and dry descent toward water then offer local leads; there is no ability-name sign or three-item completion display.

**Mortar loop.** Four artillery emplacements overlook the descending cargo corridor, two on each side behind high solid breastworks. Their observation heads, tubes and staggered landing warnings communicate the source of indirect fire. Cannon cannot reach their bodies through the walls; the first passage asks for movement between warnings, not an unwinnable extermination. The route remains reversible, and the lower firing bay provides room to stop, observe or turn. Neither the corridor nor the acquisition apron becomes a sealed battle.

Beyond the opposing conveyor and cooling apron, the route bends through cargo staging to a forecourt overlooking Sorter. The bounded loading well is open above, keeping its working arm and rail cover visible before commitment in both camera views; the quiet installation behind it remains enclosed. A local latch releases the service lift back to B before commitment, allowing preparation and a short retry. Sorter uses its sweep, moving cover and barrage without requiring Magnet, Flotation or its own reward. Victory opens the quiet installation corridor and Mortar cradle. One safe lob into the horizontal collecting tray releases both the local return lift and the familiar upper freight load, with travelling cables connecting their delayed response. There is no second nearby collecting tray or freight-door confirmation. Before leaving, the player can return to the lower corridor and lob over the four breastworks from generous firing positions. Each destroyed emplacement reduces pressure permanently once the battery is cleared. Its connected store at the far end of the upper freight spur contains the Cannon reinforcement. The lifted return still reconnects near B for players who defer that optional clearance. Neither Magnet nor Flotation is required. Sorter precedes acquisition; no fight interrupts installation and first use. If Mortar is acquired last, the return lesson, remembered artillery opportunity, three-tool inspection approach and R4 preparation still separate Sorter from Overseer.

The freight maintenance release removes the acquisition detour and exposes the Testworks frontage, where the raised load and observation windows can be inspected. This dry outlook does not climb around the three-tool inspection route. There is only one earned local return at this boundary; a second equivalent full-height ramp would erase the distinction between preview and access.

**Magnet loop.** Near the workshop entrance, a blue retaining fitting holds the short door back to the freight side. Its casing is visible before the player takes the longer assembly route. A sniper lane interrupted by moving freight and an advancing shield carrier develop positioning; Cannon, Boost and flanking suffice without either other middle acquisition. Interior windows reveal the garden water route below and the raised Magnet installation across the shunting bay. The two track junctions, parked cart, destination and reward lift occupy one readable space. Routing the cart to its berth lowers the module. Pulling the earlier door's blue fitting then completes the local loop rather than introducing a new exit with no prior context. The assembly carrier moves automatically through its work berth, offering moving cover and a permanently open side passage rather than another shot-switch stop. The acquired tool later opens the lower Testworks inspection grille and offers a workshop-side convenience connection to the Gardens.

**Interleaving and optional activity.** The workshop rear opening faces the water circuit seen through its windows; the Flotation return can release it from that side. Cargo inspection openings reveal the Testworks machinery before the combined ascent is usable. These links let the next expedition begin from the last one's return instead of requiring a stop at B. The rail-shop patrol guards the working bay without another reward gauntlet beside Magnet. The finite artillery clearance instead develops Mortar in a previously threatening corridor and rewards a separate freight exploration. The small maintenance arm and rail remain an optional act of care, separate from the required Magnet shunting reward.

**Stage payoff.** After completing R4, the roof return frames B's flywheel and brings the Tank back to the starting side of this same orange bulkhead. Phoenix breaks it, opening the eastern continuation and C. The bulkhead remains broken and the far-side cage can now be released. Freight Exchange has changed from the place that exposed a limit into the place where the player understands and overcomes it; it is not merely a lobby passed once on the way to another item room.

### R3 — Sunken Gardens

**Purpose and character.** Retaining walls, greenhouse ribs, filter works and mineral-stained beds sit below the freight bridges. Muted green materials, reflected light, drips and distant machinery frame views across the water. Here the important relationships are the other bank, flow, shelter and where to land.

**Flooded building.** Water occupies former lower rooms, with door lintels, submerged beds and broken wall ends showing their old arrangement. Broad bank paths and supported inspection walks remain above it. Broken greenhouse ribs define a light, open silhouette against the station's solid underside; surviving glass stays at the edges of important views. Daylight reaches the water through those openings and throws restrained reflected light onto the banks. Growth is sparse and concentrated at leaks and sheltered beds, preserving the sense of a neglected mechanical garden.

Before Flotation, windows and bank turns expose connections through flooded rooms that dry walls separate. The installation sits in a recognizable ferry maintenance berth beside a calm launch basin, with its first landing visible. Later water routes pass through the old room boundaries and use filter walls as cover, while dry walks reach distinct firing positions above the banks. Bank edges remain broad and legible rather than balancing challenges. Calm pools, moving channels and enclosed filter passages vary the journey; hunters and dredgers occupy later water encounters, not the safe launch basin. Water movement, landing geometry and actual shelter carry the distinction, not a green tint over an ordinary corridor.

**Independent approach and preview.** A dry filter-work approach from the freight stage is traversable with Cannon and Boost, without Magnet or Mortar. Before reaching the installation, bank turns frame water carrying debris, the far inspection landing, and B's bridge overhead. A blue workshop-side fitting offers another connection once Magnet is owned, but does not seal this original dry route. One exposed sluice latch changes a diversion plate and actual local flow; there is no second nearby rotor repeating that input. The later mouth keeps a lateral current, which becomes a traversal choice after Flotation. The player can experiment from safety without needing the water ability to acquire itself.

**Flotation loop.** The maintenance berth gives the pontoons beside a calm launch basin; the first crossing ends at the landing previewed on the approach. A later bank turret covers the short current-assisted route; the pump-island detour and filter wall interrupt its sight and reach a different firing position. Canal hunters and dredgers develop water movement only after the safe first crossing. Neither encounter design nor the return assumes that the player already has Magnet or Mortar. Passing beneath B's familiar bridge reveals the same station from below; a far-side latch establishes a dry inspection return, while the workshop rear opening permits continuing directly into the magnetic expedition.

**Role in the containing loop.** Another visible channel follows the workshop foundations to R4's inspection grille. With Magnet the grille can be removed; with Flotation the Tank reaches the dry rear landing; with Mortar the protected load can be lowered to form the ascent. Before all three actions are possible, this branch remains a readable preview with a reversible approach. It neither replaces the independent Flotation return nor provides an alternate route around the Phoenix requirement.

**Revisits and quiet activity.** The canal follows the real press foundation and supports its maintenance return to the completed Foundry. The island armour rewards a visible Flotation revisit. The gutter plant and stranded foundation tender provide short, readable acts of care with no equipment or ending requirement. From the far-bank care court, a southbound maintenance walk turns west into A's east door. Its latch is embedded on the garden face: it cannot be shot from the starting room. Opening it permanently connects the Gardens to A without returning through Transit, and does not depend on growing the plant. The door spans the full walkway and preserves the initial Foundry commitment. Later optical descent reaches an upper inspection walk, while cooling access reveals the returning pipes. Local flow changes never drain the whole region. There is no regional Boss or separate garden Repair Hive.

### R4 — Proving Grounds

**Purpose and character.** Pale enamel, bare steel, rubber stops and scorched mounts surround test runways, buffer courts and an observation gallery. Enclosed approaches contrast with the eventual roof reveal. The player first watches how machines tested earlier hulls, then drives through the facility's full-speed test.

**Built for a test.** Preparation bays face the test floor sideways; thick observation windows and empty restraint frames show how a hull moved from inspection to launch. The continuous runway has recessed side services, substantial end buffers and repeated impact scars, with no freight stacks in its driving line. Even task light exposes the test apparatus; the roof exit is brighter and visibly open. This is a controlled testing interior, distinct from Transit's branching tracks and moving cargo distribution.

Compression belongs to reception and observation, not the proving court: that floor allows lateral responses to artillery and flankers. The Phoenix cradle faces the actual launch axis, so its new purpose can be understood before driving. The uninterrupted acceleration segment retains at least 40 units before its required full-speed collision, followed by a generous stopping area before any edge or junction. Failed chassis sit in test berths or the intended breakthrough, never as arbitrary obstacles in the braking apron. The crash-recovery pocket and observation gallery provide different scales around this one defining long space; additional identical runways would dilute it.

**Preview and combined entrance.** The freight outlook shows the upper load, observation gallery and inaccessible trial floor; the garden channel approaches the same foundation below. The blue inspection grille, water passage and overhead collecting tray are visible parts of one installation. Using Magnet, Flotation and Mortar in that physical sequence forms the upper ascent. Each intermediate state allows retreat. The inside maintenance return opens toward B immediately after the ascent, before any finite court or Boss. Acquiring Mortar alone cannot advance through this reception to Phoenix.

**Development before the climax.** Compact preparation rooms and observation windows show failed hulls, buffering equipment and the actual runway. A movable cover cart, shielded pressure and indirect firing positions develop the three acquired tools without prescribing one solution to every enemy. A short artillery-and-shield encounter around passing freight develops target choice without a mandatory wave sequence. A quiet observation passage looks back toward B. The near-arena service release opens the direct repair return before commitment; later Boss retries bypass the entire preparation route.

**Overseer.** The carrier hall is the culmination of the middle expeditions. Low cover permits Mortar attacks on exposed batteries, direct fire exploits core openings, and changing approach prevents permanent safety behind one obstacle. Destroyed feed assemblies alter their associated belts. The entrance offers the direct return to B before commitment. Victory releases the Phoenix installation and its supported access; a brief quiet approach lets the combat settle before the new engine is introduced. There is no second ordinary wave sequence between the Boss and its reward.

**Phoenix and the stage return.** The cradle faces a safe test runway with full acceleration distance, a weakened test partition and a generous braking apron. The new speed, impact and exhaust are experienced before the main return. The roof route then reveals the flywheel and orange bulkhead encountered at the beginning of R2–R4, and descends to that barrier's original approach. It stays on the middle-stage side of the wall: a high walkway or test exit cannot enter C early. A calm connecting apron permits natural cooling before the final run. Breaking the original bulkhead completes the large loop and reaches C; only then can the far-side roof cage be released. The installation exit, local lesson and return are a continuous route with no retracing to find a second runway. The nearby crash-recovery branch offers an optional armour revisit without interrupting the main recognition.

**Return and meaning.** After Phoenix breaks the remembered orange bulkhead, a mounted latch on the C end opens the B–C express track. It is an exploration reward, independent of Sorter. Failed test chassis establish modular construction and the installations' purpose before the deep predecessor rooms reveal their cost. Phoenix's main combat value remains ordinary opposition and travel, not a required Boss ram.

### R5 — Silent Observatory

**Purpose and character.** Dark glass, pale cladding, brass fittings and narrow warm light surround a calibration shaft above C. Galleries show the garden retaining wall and familiar infrastructure below. Framed mirrors and collectors belong to the working equipment; unrelated floors do not cut through a puzzle or fight's central view.

**A building around an absence.** A tall open calibration void is the main form. Solid side chambers and broad galleries occupy its edges; they do not fill its centre with stacked walkways. Pale horizontal gallery faces separate the playable levels against a darker far wall. Roof slits illuminate the apparatus, while soft task light keeps recesses and the Tank readable. Reflective faces are reserved for actual optical equipment; ordinary dark glass cannot resemble an unused puzzle mirror.

An entrance opening first frames an unreachable receiver across the void. The route then passes behind the apparatus into the installation chamber and returns to a useful firing position. Height changes reveal relationships; actual required shots use stable supported positions and generous targets, within Laser range and the existing elevation limit. The Laser cradle occupies a calibration station with an obvious emitter-to-mirror-to-receiver relationship, not a pedestal in empty floor space. Smaller side-window and screen rooms develop that language before the broad Guardian court. Its essential reflection paths stay in one legible combat space; the shaft's height and distant garden view remain scenery around those paths, never an excuse for off-screen precision aiming.

**First penetration and preview.** Beyond the original orange bulkhead, C anchors the upper optical expedition. Its initial gallery frames a maintenance receiver across the calibration void, then follows the same coolant mains toward a view of the circulation vessels below and the furnace farther down. The inner descent is visibly present but its optical machinery is not restored. Side galleries lead around the apparatus to the Laser installation; no alternate C stair or garden outlet reaches the unearned cooling interior. Reflective inspectors and supporting enemies contest useful observation and firing positions rather than conceal the next opening.

At the west gallery, the exposed approach faces the reflective inspector directly. The inner maintenance passage passes behind a solid screen and opens a side firing window at its far end. Both approaches reconnect into the open north gallery: the choice changes the firing angle and exposure, without another switch or reward inserted merely to justify the branch.

**Laser loop and onward descent.** A broad mirror and forgiving receiver let the player restore the optical path previewed at the entrance. Its machinery opens the short return toward C; the lower maintenance descent remains visibly guarded by Guardian. The player recognizes the original void from the new firing side before following the pipes downward. The approach gallery stays open: its reflector, sniper, fixed screens and side window change firing positions without another screen-release switch. Subsequent rooms develop an indexed mirror rotated directly by Cannon or Mortar. These are spatial variations with generous aim areas; no free-angle calibration or simultaneous movement, traction and Laser hold is required. The Laser return is complete before the Guardian arena. Ordinary reflection combat and the original indexed mirror precede the Boss; the R6 descent is its required onward reward. An unresolved first reflection still permits retreat along the original approach.

**Required climax and optional tower.** Guardian's two broad mirrors, clear firing areas and committed facing make rear attacks understandable. The safe return to C precedes its arena. Victory opens its east exit into the descending circulation service passage, with the old inspection descent and yard lift becoming additional returns. The optional tower gives a quiet view and a legible single transmission, wait and settled working state; nobody replies. The adjacent descent joins a previously seen garden upper inspection walk. The tower supplies both a short narrative conclusion and the other end of an optional loop, rather than an isolated ramp to retrace. The maintenance mezzanine, rangefinding workshop and restored signal tower distribute optional discoveries across separate visits.

### R6 — Circulation Works

**Purpose and character.** Copper, dark ceramics, mineral stains and neutral task light frame boilers and the separator beneath C. Three coolant mains link the building to familiar garden infrastructure. Uneven pump rhythms become steadier as the player restores actual movement through the works.

**Vessels and work pockets.** A few immense cylinders, their bases and curved jackets shape the floor plan. Routes bend around their sides and open into recognizable valve bays, separator platforms and cool maintenance pockets. Straight pipe runs link these spaces without becoming a ceiling of tangled detail. Warm light comes from exposed hot machinery; cooler task light reveals damp service walls and condensate. Wet floors and localized basins distinguish this enclosed operating plant from the Gardens' daylight and flooded architecture. Steam remains brief and peripheral to firing windows and attack warnings.

Vessels provide real cover and changing approaches, but their silhouettes must leave the next opening readable in both views. Larger pockets at lane junctions allow a turn, a retreat and sight of advancing enemies; density must not trap the Tank behind a translucent cylinder. The Circulation installation is housed in a cooling-jacket service bay whose cold approach opens directly toward the hot bridge operation. Warm and cool work spaces make the next choice visible without adding decorative red barriers or extra thermal locks. A quiet condensate recess and the exposed garden terrace interrupt the enclosed lanes, giving the region relief without another long empty connecting passage.

**Second penetration and remembered heat.** Laser's restored optical machinery provides the first internal descent. The Tank passes the same pipes and vessels seen from R5, then looks along the hot maintenance passage toward the deeper core. Ordinary Phoenix cannot sustain that passage under its physical Heat and contact conditions. A cold service route leads around the vessels to the cooling-jacket installation; it does not cross the hot boundary or demand Circulation before acquisition. Two maintenance lanes face one another around machinery: distant fire covers one while a welder advances along the other. Moving a screen changes both shelter and access. A return landing toward C is released from inside, so it supports repair without allowing an earlier Laser bypass.

The separator's outer work lane exposes the Tank to the distant lobber. A screened inner passage interrupts that observer's direct sight but brings the Tank into the welder's close approach. The screen does not promise protection from a Mortar already aimed at a known position: keep moving after its landing warning. Both lanes remain traversable in reverse. A blue magnetic screen can be pulled repeatedly along its rail to trade cover between crossings; its position changes exposure rather than granting passage through a compulsory shot switch.

**Circulation loop.** The safe cold installation apron leads into a short hot operation. Heating grilles bring the Tank into red contact naturally; releasing the jammed fasteners settles the maintenance bridge onto supports and connects the return lift toward C. The far-side release establishes an ordinary cool bypass. A following work lane offers sustained red contact through opposition or a sheltered cooling route that restores ranged fire. This application and a familiar overlook separate the last ability from the final descent; the player does not receive Circulation beside the Keeper's door.

**Return and deeper access.** The industrial outlet opens from inside the cooling works to the previously known garden retaining wall; the garden-side latch housing prevents premature entry. The condensate-island revisit develops Flotation as a combat approach. The main route then returns to the hot passage observed on arrival. Circulation now carries the Tank through it and releases the inner maintenance connection toward R7. The optical descent already restored above remains visible in the same pipe network. This is successive penetration, not a return to C to present two independent keys. Thermal restoration and the cool return persist, making later travel ordinary.

### R7 — Predecessors and Central Furnace

**Purpose and character.** Refractory chambers, charcoal surfaces and localized furnace light replace the upper city's daylight. Distant activity becomes muffled. Several short connected service rooms show worn mounts, a body attached to a pipe, dismantled predecessors and an empty interface. Their relationships around the furnace well carry meaning; a long empty corridor does not.

**Weight and scale.** Broad foundation ribs converge toward one furnace well. Thick doorway reveals and closely framed service rooms first limit the view; the final approach then opens onto the largest coherent interior of the journey. Keep the number of major forms small: foundation, feeding structure, core and service berth. Their mass establishes age and burden more effectively than a forest of pillars or repeated stacks of machinery. This central installation is architecturally distinct from R1's smaller, busy production furnace.

Predecessor rooms use restrained task pools on mounts and familiar hull fittings, with enough reflected light to understand the supporting floor and next opening. The arena takes broad indirect light from the core; readable cover silhouettes and projectile warnings remain stronger than decorative glow. The first full core view includes its feeding routes, so the supply repair and Keeper's role belong to the same machine. After victory, stillness and the now-quiet feed frame the vehicle-shaped socket. The final scale change is from an immense working system to one familiar berth, without adding a throne, inscription or spectacle that explains away the wordless ending.

**Third penetration and recognition.** Enter through the deeper thermal route after the observatory descent and Circulation loop. The furnace well is the one glimpsed from R5 and R6; its feed structures and the predecessor rooms now become reachable. Recognize A's press foundation from below, reach D, and release the D–A maintenance shaft before the final supply task or Keeper. The retired service room near D offers quiet armour exploration with a nearby return. No new ability, additional refuge or independent restoration-key checklist interrupts this descent.

**Final repair.** One coherent supply room contains a hanging load blocking maintenance access and an obscured optical interface. A Mortar release settles the load on safe supports, exposing a side passage and a firing window. From that window, the Tank uses a fixed mirror to reconnect the feed. The opened maintenance exit returns through another door of D. These familiar actions create a connected physical result in one space, instead of a sequence of isolated weapon checks. Restoration stays complete, and the short Keeper retry repeats neither it nor an endurance court.

**Climax.** The Keeper is part of the feed system: destroyed assemblies stop their local belts and alter useful ground. Cover shelters temporarily, while indirect attacks demand relocation. Victory stops reclamation and leaves a quiet approach to the familiar vehicle-shaped socket. Docking remains voluntary; there is no ninth ability, forced cutscene on victory or hidden-item requirement.

## 10. Final approach and ending

### Before commitment

After the Keeper, feeding tracks stop and the sound recedes. A short, quiet approach gives the player roughly half a minute to see the damaged furnace and inspect its socket, without enforcing a wait. The docking rails, clamps and contact marks recall Repair Hives and the predecessor bays. The Tank remains controllable and can leave.

Holding contextual use for two seconds aligns the Tank with the socket. A circular progress signal and visible clamp preparation communicate the action. Releasing the control or moving away before coupling cancels it. There is no written sacrifice prompt, spoken revelation or compulsory ending trigger on Boss death.

### The 26-second ending sequence

| Time | Image and action | Meaning |
| --- | --- | --- |
| 0–9 s | Clamps couple; wheels settle; the engine joins the furnace rhythm. Circulation connects, red heat becomes a steadier light, and power travels outward. One small turret or antenna motion remains | The Tank participates in the machine; its precise consciousness or fate remains unstated |
| 9–15 s | Transit returns to view. Useful cargo movement resumes if the player repaired the optional maintenance rail | A previous act of repair now has a larger consequence |
| 15–20 s | The Gardens receive power. Restored pumping and water activity reflect the player's actual sluice restoration | Recovery belongs to the places the player affected |
| 20–26 s | At the opening bay, the previously dormant cargo machine's eyes light; it rolls a short distance and stops | Something else can begin |

The cargo machine in the last shot is present from the beginning and is distinct from the optional foundation tender. Unrepaired facilities remain visibly unfinished even when shared power returns. The observatory continues according to its restored state; the ending does not invent actions the player skipped.

This is the only ending. It restores operation without promising permanent salvation or explaining the absent builders. The Tank's final motion permits ambiguity rather than explicitly declaring death or immortality.

### Presentation and continuation

The HUD withdraws after commitment. The coupled engine and returning network lead the sound before the final exploration theme returns. Camera direction is permitted during this committed sequence. Pause remains available; losing focus pauses the sequence. Skip becomes available after the brief coupling beat and reaches the same completed state as watching.

The completion card reads exactly **Mission Accomplished**. Its main choices are Continue Exploration and Return to Journey Menu; the menu retains a completion mark. The final exploration theme can continue beneath this card.

Continue Exploration returns to D, the Furnace Service Room, with the Keeper defeated, acquired abilities retained and opened routes intact. This is an exploration continuation from before final docking, not a literal reversal of the cinematic's events. Reloading a completed journey resumes exploration rather than automatically replaying the film. Returning to the socket allows the ending to be viewed again.

## 11. Interface and information

The title treatment places **Tankle Adventure** on one line, with **Astra** on a separate, smaller subtitle line. HUD and map symbols share the same silhouettes: a long barrel for Cannon, an elevated tube and lob for Mortar, a straight energy ray for Laser, pontoons over waves for Flotation, and engine chevrons for Overdrive. Stacked armour plates distinguish capacity from repair; a framed fan denotes cooling, and a sight reticle denotes extended Cannon and Mortar range.

### Menus and settings

The interface should feel like part of a finished industrial adventure: a strong title composition, restrained architectural imagery, oxidized brass panels, clear focus, consistent spacing and deliberate animation. Avoid a development-dashboard appearance.

The journey menu prioritizes Continue and Start. A new journey begins at the Foundry awakening with Cannon only; replacing existing progress requires confirmation. Independent location previews are clearly separated from the main journey, show their equipment scope and keep separate progress. They must not become the normal way to find the first region or travel between regions. Any archival previews belong in a secondary, collapsed area.

Pause provides a prominent Resume action and coherent display, camera, audio and input groups. Camera distance, angle and height can be previewed against the paused scene; sensitivity and full control rebinding are accessible here. Settings persist. Keyboard focus, reduced-motion treatment and compact layouts receive the same care as mouse interaction. Escape should reach pause directly rather than requiring a confusing second press after pointer release.

### Gameplay HUD and acquisition

- **Hull:** lower-left segments show health without a number. The acceleration gauge can sit beside it; Heat cannot.
- **Heat and aim:** the single reticle carries the Heat ring and Overheat state defined in the core systems. There is no extra map-point cursor, automatic enemy snapping or written angle-limit warning.
- **Equipment:** a stable tray shows distinct pictograms and concise English names for weapons, tools, engine upgrades and optional equipment. Armor count, cooling improvement and individual weapon reinforcements remain visible after the pickup notice ends. Selection and actual bound inputs remain legible. Cannon, Mortar and Laser use the weapon-cycle relation; tools retain their own actions; Phoenix upgrades the existing acceleration slot.
- **State:** Flotation deployment, active acceleration, full Phoenix speed and red Circulation have visible equipment and body feedback. A newly acquired ability updates the tray immediately and remains represented after reload.
- **Boss:** the top-centre health display appears for the active sealed encounter and remains visible behind cover. Ordinary enemies do not fill the world with names and bars.

Module contact acquires it; deliberate nearby use may also do so. An acquisition pulse and approximately eight seconds of pictorial action feedback demonstrate the new control using the player's actual binding. A new weapon can show its cycle-and-fire relationship. Control remains with the player; no paragraph, compulsory pause or generic reward popup replaces the ability's safe first-use space.

First-use control glyphs disappear once learned. A small camera-toggle affordance remains available. The non-pointer-locked look gesture can be hinted until used. Low-priority help yields during combat. The native pointer is hidden over active aiming so only the game's reticle remains.

### Map and orientation

The upper-left corner of the minimap and full map displays the current region's English name. The label follows the Tank's location and floor, including when the full map is inspecting another floor.

| Region | Display name |
| --- | --- |
| R1 | Recycling Foundry |
| R2 | Freight Exchange |
| R3 | Sunken Gardens |
| R4 | Proving Grounds |
| R5 | Silent Observatory |
| R6 | Circulation Works |
| R7 | Central Furnace |

The compact upper-right map shows nearby discovered geometry, relevant visible threats, heading and aim, without a quest arrow. Its orientation follows the camera-relative movement frame. In overhead play it becomes visually subordinate when the aiming cursor crosses it; it must not intercept a shot intended for the world.

The full map pauses play. Nearby exits can be revealed without revealing an entire unexplored route; unknown areas remain incomplete. Floors are real separate layers. The current-position arrow is shown at full presence only on the Tank's actual floor, while the floor selector identifies where the Tank is when another layer is inspected.

Discovered lift connections allow inspecting the other known landing, without revealing unknown floors. Gates distinguish closed and opened states. Receivers, circuits, encountered main ability modules and Repair Hives use recognizable pictograms and a graphical legend. Maps share the HUD's restrained material language and do not add prose room names or numeric floor labels to explain poor world composition.

## 12. Art, sound and music

### Visual language

Oversized rounded barrels, pistons, vents, thick wheels and bold silhouettes make machines expressive. The style is an exaggerated industrial world, with substantial architecture and readable materials rather than realistic military hardware or a toy diorama. Soft contact shadows and restrained outlines support form without blackening interiors.

The warm Tank silhouette stays distinct against each region's materials. Blue denotes magnetic interaction; yellow and green distinguish available and operated mechanisms; red communicates heat and danger; the Repair Hive has its own calm mint light. Shape, motion and sound reinforce these colours. Ordinary decorative lights must not imitate a usable switch or magnetic target.

Recoil moves the whole machine. Acceleration has lean, engine strain and correct wheel rotation. The hull follows supported slopes without burying half its wheels or cutting holes in the ramp to hide contact problems. Headlights and antenna motion supply attention and personality. Critical states alter expression and sound without secretly degrading steering.

Impact rings, broad projectiles, sparks, smoke and debris give weight while preserving target silhouettes and warning areas. Effects have a clear lifetime and origin; stray suspended blocks must not masquerade as architecture. Muzzle and projectile proportions remain intentionally substantial. Enclosed rooms retain enough ambient and task light to read the Tank, floor and exits in both camera views.

Regional materials, enclosure, landmarks and machinery are specified with each [regional journey](#9-regional-journeys) and the [architectural composition](#architectural-composition). Foundry, Gardens and Observatory establish the strongest contrasting compositions: machinery over pits, flooded horizontal rooms and galleries around a vertical void. Their differences set the standard for the other regions. Each region's identity must be present in ordinary travel and combat views, not only a panoramic entrance or Boss room.

Material construction supports that identity. Foundry walls use thick refractory courses and soot; Transit uses broad steel spans and scraped freight edges; Gardens uses stained retaining masonry and thin greenhouse ribs; Testworks uses enamel panels, impact-marked steel and rubber stops; Observatory uses pale gallery faces, recessed dark glazing and optical brass; Circulation uses curved jackets, ceramic insulation and mineral deposits; Furnace uses massive refractory ribs and deeply worn mounting surfaces. Shared fasteners and service fittings connect the civilization, but the same panel grid cannot dominate every wall and floor.

Large shapes read first, material boundaries second, fine seams and wear last. Concentrate detail where use explains it: contact edges, leaking joints, exhausts and mounting points. Floors remain quieter than walls around projectile warnings and interactive objects. Water has broad, soft moving ripples and restrained highlights rather than repeated bright strokes. Reflections, transparent glass, steam and furnace flicker cannot obscure a silhouette or resemble a threat. Broken structures remain attached to credible supports; decorative fragments do not hover over the playable space.

Light has a visible source and a local purpose. Roof daylight, furnace apertures, station roof lights, reflected water and maintenance lamps give rooms different distributions of light, rather than applying a different colour wash to identical geometry. All retain enough neutral indirect light to distinguish support, Tank, enemies and exits. The third-person view must not become dark simply because it looks below a roof; overhead must not lose floor warnings in bright reflection. No essential orientation depends on a dramatic camera angle, forced zoom or temporary lighting effect.

Interaction forms remain consistent across regional styles. A magnetic part remains visibly blue, a Mortar target remains a horizontal tray, and a mirror retains its recognizable optical face. Cable paths stay attached to their structures and readable through local architectural transitions. Ambient colour occupies broader, quieter surfaces; it cannot turn ordinary copper pipe into an apparent hot-contact lock, mint glass into a refuge or a decorative lamp into a ready switch. Regional character changes the situations around familiar actions, not the rules for recognizing them.

### Mechanical basin, sky and horizon

The city occupies a horseshoe excavation, with supported routes rising from the mechanical basin. Above it, overcast cloud layers leave a narrow warm opening. Broken viaducts, crane silhouettes and furnace stacks establish distant landmarks; below the routes, sediment, shallow dark water, foundations and descending pipes explain what holds the city up. Distant scenery suggests a larger lost civilization without promising playable destinations.

The upper city sees cool daylight and remote industrial silhouettes; the gardens add moisture and reflected light; the deeper works progressively lose sky and take their light from machinery and the furnace. The ending gently warms the same established foundations and landmarks. Foreground threats remain the strongest moving contrast. Background haze stays subdued and continuous through both camera views; structural supports must leave lower routes, sight lines and lift shafts readable.

### Mechanical sound and ambience

Movement produces a continuous engine and running-gear voice. Acceleration becomes louder and higher in pitch, with an audible distinction at sustained Phoenix speed. Stopping and cooling settle naturally. Overheat, renewed availability and red Circulation each have a clear state cue.

The Cannon combines a sharp discharge, a sustained low body and a brief mechanical return. Mortar has a deeper launch; Laser has a restrained continuous energy texture. Physical impacts have slight timbral variation without obscuring their identity.

Armour ricochets, successful damage, damage to the Tank, empty magnetic scanning, attached traction, switch operation, travelling power, lift arrival and Repair Hive reconstruction sound different. Repair settles into a short restorative phrase; acquiring or unlocking something has a brighter resolving cue. Enemy launches and impacts carry direction and distance, with distant reports quieter and duller. Sniper locks, incoming artillery and off-screen relevant threats carry positional warnings. Critical warnings remain intelligible above music and machinery. Alerts use an electronic vocabulary distinct from weapon reports: a rising recognition chirp for a new threat, accelerating pulses followed by a held tone for Boss lock, three even pulses for clamps, a slower alternating pair for the press and three high/low pairs for Overheat. Rejected actions use a brief double buzz. These signals have stable pitches and soft note edges, without explosive noise, sub-bass drops or metallic impact layers.

Ambient rhythm reflects purpose: Foundry clatter, hollow transit movement, water and distant freight, engine tests, optical resonance, uneven circulation, then the Hearth's low pressure. There are no vocals, spoken announcements or intelligible broadcasts. After the Keeper falls, the score leaves silence for the final approach. Quiet stretches make restoration and final coupling audible; constant drone and combat noise must not erase them.

### Musical direction

The soundtrack uses nine recordings from the owner's RPG Maker MZ collection: four exploration phases tied to permanent ability acquisitions and one distinct recording for each of the five Bosses.

| Situation | Recording |
| --- | --- |
| Initial hull, before acquiring Boost / Overdrive | Castle3 |
| After acquiring Boost, before Phoenix | Scene5 |
| After acquiring Phoenix, before Water Circulation | Scene7 |
| After acquiring Water Circulation, including earlier regions | Dungeon1 |
| Prototype arena | Battle1 |
| Carrier hall Overseer arena | Battle3 |
| Sorter arena | Battle4 |
| Optical Guardian arena | Battle6 |
| Final Keeper arena | Battle8 |

Exploration priority is Water Circulation, then Phoenix, then Overdrive, then the initial hull. Transitions follow permanent ownership, not active Boost, speed, Heat or weapon selection. Geography, ordinary encounters and backtracking do not change or restart the current phase's theme. A committed Boss fight overrides exploration until victory or death. Afterwards, exploration restores the latest acquired phase, including after reload. The final quiet approach remains silent; the ending reuses Dungeon1 without adding another piece.

Preserve each recording's original duration and loop, including the selected pieces shorter than 90 seconds. Battle1 returns to approximately 2.824 seconds and Battle4 to approximately 11.368 seconds; the other seven loop from their beginnings. Introductions are not replayed at every loop. Track transitions crossfade without a sudden volume jump. Pause preserves musical position; death discards the defeated encounter's continuation. Important warnings briefly lower the music. Music and effects keep independent mute controls.

## 13. Experience requirements and open scope

The design succeeds when the player learns understandable physical rules, uses them in different situations and recognizes how the city reconnects. Traversability alone is insufficient: the intended exits and consequences must be discoverable without prior coordinates or instructions.

- **Four safe homes.** Exactly A, B, C and D provide repair and respawn. Long regions earn intermediate returns rather than extra Hives. Each refuge and its entrances remain safe from spawns, pursuit and incoming fire.
- **Meaningful rooms.** Each major room presents something to notice, a safe experiment, a usable change, a decision and a legible result. Unnecessary switches and empty connections are removed; quiet rooms retain worthwhile observations.
- **Abilities change familiar space.** Obstructions precede solutions. Every acquisition has a safe first use, combat value and lasting exploration effect. Overdrive resolves the original conveyor; each middle ability resolves its own local obstacle; Phoenix resolves the original orange bulkhead. The entry barrier, the first-use lesson and the return are naturally visible rather than recoverable only through prior coordinates. Laser and Circulation resolve successive remembered layers of the same building.
- **Short, earned retries.** Discovered major Boss entrances target 10–25 seconds from their refuge; Keeper targets 10–15 seconds from D. Neither requires a lift wait or a repeated puzzle or finite court. A first-use exit targets 15–35 seconds to a refuge or clear transport junction. Shortcut savings compare the same endpoints and include normal waiting, aiming and traversal costs.
- **Physical consequences.** Cables explain causality but do not replace it. Water controls alter flow, slides change cover or openings, and loads change support or sightlines. A failed action gives local feedback. Simple shortcut doors remain simple.
- **Legal route orders.** All six orders of Magnet, Mortar and Flotation acquisition support their own first use and return with the equipment actually owned. All three are physically required for the combined Testworks approach. After Phoenix, Laser precedes Circulation and Circulation precedes the inner furnace route. Each of the five Bosses blocks a required route or acquired ability. All optional equipment upgrades may be skipped. Both Mortar-first and Mortar-last routes leave exploration, first use and recovery between Sorter and Overseer. No required action needs written instructions, pixel-perfect aim or a new input.
- **Controlled pressure.** First understanding is safe; later familiar rules combine with combat. Ordinary encounters allow retreat. Bosses seal properly and retain readable responses. Finite courts stay completed through repair, death and reload; endless waves and hidden damage caps are not substitutes for design.
- **Recoverable machinery.** Movable objects have supported stops and local recovery. A missed lift, an interrupted interaction, death immediately after release and acquisition followed by reload cannot strand the Tank or reconstruct permanent barriers.
- **Readable space.** Both camera views preserve the Tank, its support, meaningful firing lines and usable exits. Architecture establishes floors and route relationships before transparency assists visibility. No unrelated floor obscures the Guardian's essential reflection paths.
- **Recognizable regions.** With region names, map and music absent, ordinary approach, combat and return views identify their building through form, light and material. Recognition cannot rely on a single landmark screenshot or a colour tint. The main spatial distinction remains apparent without colour.
- **Variety within a building.** Adjacent spaces vary enclosure, sightline and activity without losing their regional construction. A repeated six-room loop, another empty ability hall or symmetrical routes with equivalent exposure fails this requirement. Architecture must change a meaningful choice of movement, cover, observation or firing position.
- **Connected places.** R2–R4 interleave their workshop, water and freight spaces; changing acquisition order does not force a hub visit between every loop. R5–R7 progressively expose one connected eastern structure instead of three independent item corridors. Shared landmarks remain the same objects seen from useful new positions. A shortcut exposes that relationship while shortening travel; acquisitions occupy working installations with a visible first use and return.
- **Dispersed discoveries.** The ten optional finds occupy different stages and kinds of detour rather than prescribed coordinate gaps. No pickup requires a long empty return merely to appear remote. Acquisition benefits remain identifiable in the HUD.
- **A complete final act.** The last ability changes exploration before the Keeper; its fight targets 20–40 seconds without a forced timer. Victory leaves the voluntary connection and existing ending. Restoration and continued exploration preserve the player's actual progress.

Judge expedition and retry pacing with the starting five-segment hull as well as upgraded equipment. Spatial and mechanical relationships must prove understandable in simple playable rooms before detailed decoration and final dimensions are fixed. More props, enemies or floor area cannot compensate for an unclear or uninteresting action.

Judge regional composition from normal play at the default third-person settings and in the overhead view, including the approach, an encounter, the ability installation and an earned return. The Tank's support, the immediate threat and a usable response must remain clear without changing camera mode. If a ceiling, vessel or upper gallery requires most of the view to become transparent, change its placement or the room's composition. Preserve supported travel, required weapon arcs, Phoenix run-up and braking, and the four-refuge returns while shaping architecture; visual identity cannot be bought by weakening those relationships.

Exact campaign duration and final room counts remain open. Travel-time and spatial targets in this document guide composition rather than demanding uniform rooms or a particular amount of floor area. Additional abilities, currencies, mandatory collection of equipment upgrades, alternate endings and new control schemes are outside the current agreed scope.
