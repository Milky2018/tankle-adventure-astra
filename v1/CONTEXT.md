# Tank Metroidvania

This context defines the player-facing language for a 3D cartoon tank game built around exploration, combat, traversal abilities, and deliberate backtracking.

## Visual Language

**Exaggerated Industrial Style**:
The game's cartoon visual language, built from oversized readable machinery, rounded large forms, saturated color blocks, stepped shading, expressive deformation, and effects that may greatly exceed realistic scale.
_Avoid_: Realistic military art, photoreal materials, generic low-poly style, toy diorama

**Wordless Presentation**:
The language-free presentation of gameplay, interface, environment, and story through action, composition, animation, sound, icons, and unlabelled bars. Text is reserved solely for system settings and accessibility menus.
_Avoid_: Dialogue, narration, subtitles, labels, numeric HUD values

**Player-Led Discovery**:
The onboarding principle that lets players discover mechanics through free observation, experimentation, and natural environmental affordances without camera control, path highlighting, forced pauses, or tutorial-completion gates. Brief input glyphs may identify otherwise unknowable physical controls.
_Avoid_: Guided tutorial, objective marker, cinematic hint

**Mechanical Score**:
The wordless musical identity built from playful metal percussion, valves, tread rhythms, melodic synthesizers, and adaptive combat layers. It reinforces machinery and adventure without becoming realistic war music.
_Avoid_: Military score, industrial horror ambience, vocal music

## Level Structure

**Abandoned Tank Assembly Plant**:
The first level's setting: a stylized industrial complex built into a canyon, spanning its cargo entrance, maintenance passage, assembly courtyard, power facilities, foundry, and canyon exit.
_Avoid_: Realistic factory, military battlefield, horror ruin

**First-Level Slice**:
A roughly 10-minute playable loop that proves exploration, an initially impassable route, combat, ability acquisition, backtracking, and a final boss encounter.
_Avoid_: Combat demo, tutorial corridor

**Conveyor Gate**:
A narrow conveyor-only route whose opposing surface speed exceeds the Tank's normal movement speed. It becomes traversable only after the Tank acquires Overdrive.
_Avoid_: Locked door, invisible wall

**Rest Point**:
A Souls-like checkpoint that anchors saving, recovery, and respawning. The first level places one at its entrance, one at Location C's central landmark, and one beyond the defeated Final Boss.
_Avoid_: Recovery point, save menu, autosave trigger

**Repair Hive**:
The physical form of a Rest Point: a folding maintenance station that repairs the Tank, clears Heat, emits a world-reset pulse, and remains lit as an activated respawn beacon.
_Avoid_: Bonfire, save terminal, healing pickup

**Expansion Pocket**:
A small, reachable side space reserved for future collectibles. Until collectibles are designed, it offers environmental interest but no objective, progression requirement, or implied unavailable reward.
_Avoid_: Empty room, collectible room, blocked future area

**Elite Barrier**:
The energy barrier that makes the Elite visible but unreachable from Location C's central area until both Gate Relays are destroyed.
_Avoid_: Locked door, boss door

**Gate Relay**:
One of two destructible devices connected visibly to the Elite Barrier. Each branch of Location C contains one, and destroying both with the Standard Cannon removes the barrier.
_Avoid_: Key, interaction switch

**Furnace Hazard**:
A traversable molten-waste area that continuously damages the Tank until the player drives out through a physical exit. It never knocks the Tank back, teleports it, or restores it to a safe position.
_Avoid_: Bottomless pit, reset volume, automatic rescue zone

**Region Map**:
A player-opened schematic of discovered level topology, Rest Points, known Conveyor Gates, and major destinations. It reveals spaces through exploration without prescribing a navigation route.
_Avoid_: Objective guide, three-dimensional terrain model

**Minimap**:
The fixed-north, always-visible HUD view of nearby discovered geography, Hull Heading, Turret Aim, visible enemies, and known local landmarks. It complements rather than replaces the Region Map.
_Avoid_: Region map, navigation arrow

## Actors and Abilities

**Tank**:
The player-controlled rejected prototype that awakens inside the Abandoned Tank Assembly Plant and evolves by integrating modules from other failed machines. It begins the first level with 50 HP, normal movement, and one weapon.
_Avoid_: Character, hero

**Hull Heading**:
The visual forward orientation of the Tank's chassis. It turns to follow the current direct movement direction but does not constrain WASD input or Turret Aim.
_Avoid_: Movement input, aim direction

**Turret Aim**:
The independently controlled direction of the Tank's turret and weapon. It follows the mouse cursor's projected ground position without changing movement direction.
_Avoid_: Hull heading, movement input

**Isometric Camera**:
The fixed 45-degree three-quarter camera that follows the Tank's ground position. It defines the screen-relative WASD basis but never rotates in response to movement or mouse input.
_Avoid_: Combat Camera, free orbit, mouse-look camera

**Standard Cannon**:
The Tank's sole starting weapon: a semi-automatic cannon that fires visible, straight, unguided projectiles for strong direct-hit damage and minor splash damage. It consumes no ammunition and has no reload cycle because Heat alone limits its use.
_Avoid_: Hitscan gun, machine gun, interchangeable ammunition

**Overdrive**:
A traversal ability earned from an Elite that continuously accelerates the Tank along its current direct movement direction up to 1.5 times normal speed while generating Heat. Its maximum speed is sufficient to overcome an opposing Conveyor Gate.
_Avoid_: Dash, sprint, cooldown-based boost

**Overdrive Ram**:
An offensive collision produced only when Overdrive has accelerated the Tank beyond its impact threshold. It damages ordinary enemies according to their armor but never grants invulnerability, passes through targets, or damages Elites and Final Bosses.
_Avoid_: Normal collision, melee attack, dodge

**Heat**:
A shared pressure resource generated by sustained use of Overdrive and by firing the Tank's weapon. Reaching its red threshold causes the Tank to become Overheated.
_Avoid_: Mana, ammunition

**Overheated**:
The shutdown state entered when Heat reaches its red threshold. The Tank cannot fire or engage Overdrive again until Heat has fully dissipated to zero.
_Avoid_: Weapon reload, weapon cooldown

**Elite**:
A powerful non-boss enemy unlocked after completing both branches of Location C. Defeating it awards Overdrive.
_Avoid_: Mini-boss, final boss

**Overdrive Prototype**:
The first level's Elite: a heavy experimental tank that demonstrates Overdrive through telegraphed straight-line charges, then exposes its rear radiator while Overheated. Its defeated power module grants Overdrive to the Tank.
_Avoid_: Final boss, ordinary Furnace Guard

**Scrap Scout**:
A fast, fragile enemy vehicle that flanks the Tank and is destroyed by one direct Standard Cannon hit.
_Avoid_: Swarm enemy, melee infantry

**Rivet Turret**:
A stationary or very slow mid-range enemy that fires clearly telegraphed projectiles and is destroyed by two direct Standard Cannon hits.
_Avoid_: Sniper, mobile gunner

**Furnace Guard**:
A slow armored enemy whose front strongly reduces damage while its exposed side and rear radiator form a three-hit weak point.
_Avoid_: Damage sponge, shield bearer

**Final Boss**:
The culminating enemy encounter beyond the original Conveyor Gate. Defeating it grants access to the first level's final Rest Point.
_Avoid_: Elite, level guardian

**Furnace Overseer**:
The first level's Final Boss: an unfinished super-heavy tank fought on active foundry conveyors. The Tank destroys its two cooling assemblies before attacking its exposed central power core.
_Avoid_: Overdrive Prototype, factory machinery
