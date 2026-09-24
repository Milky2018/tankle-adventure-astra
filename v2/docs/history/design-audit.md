# Current design implementation audit

Scope: the accepted folded-city design in `../Gamespec.md`, including retained machinery and optional restoration scenes. Later accepted regional and pacing sections supersede older standalone layouts and numerical tuning. Explicit proposals (numerical collectible upgrades, additional mirror-carriage arrangements and alternative enemy concepts) are not silently treated as approved requirements.

This audit distinguishes source coverage from runtime verification. Passing controlled routes is not proof of blind-player comprehension or of the absence of all presentation bugs.

| Design area | Current implementation / work |
| --- | --- |
| Eight abilities, Phoenix before Laser, independent Laser/Circulation branches | Three uninterrupted normal-health campaign orders complete with actual module pickups and successful ending reloads. |
| Overdrive ordinary ram before Phoenix readiness | Missing from the folded runtime; restored scout/turret/shield-facing rules with elite/Boss exclusions. |
| Magnetic lightweight-enemy traction | Added supported-ground pulling, clear blue body fittings, occlusion, range, heat and refuge restrictions. |
| Armour feedback | Distinguish actual armour from health/part damage truncation. |
| Enemy warning animation | Return barrels and arms to their authored resting positions; remove accumulated drift. |
| R2 carrier shunting and local shortcut | Added to the arsenal repair room, with Cannon/treadle controls and a paired-gate crossing between crane and return rooms. Uses the retained rail puzzle rules. |
| R3 optional water/plant restoration | Added a garden-bank care alcove, visible hinged gutters, shot/hull controls, rust plug and persistent flowering plant. |
| Garden pump and carrier lift | Current folded mechanisms retain the accepted replacement rules; old standalone cistern geometry is not another mandatory gate. |
| Visible circuit relationships on discovered map | Added visited same-layer circuit segments; undiscovered destinations remain hidden. |
| Fixed camera, local transparency, C switching, aiming limits | Regional, ending and four optional-room views pass; transparent care-wall aiming and physical shot blocking are checked separately. |
| Ten enemy roles, telegraphs, artillery, waves and Boss recovery | Focused sniper/artillery, finite-wave, Boss and full-campaign checks pass after ram/pull changes. |
| Safe Hives and respawn | All 26 anchors pass the refuge regression; carrier placement also passes a repair-room access regression. |
| Slope support, currents, water previews, conveyance | Ramp, current and progression tests pass, along with optional corridor, care entrance and complete delivery-route support checks. |
| Optional maintenance delivery and roof sorting encounter | Added the actual sump-to-upper-berth delivery and optional sorting-arm encounter, with a moving physical cover unit. Controlled runtime checks cover launch, delivery/reload, warning/sweep/recovery and damage. |
| Regional architecture, story restoration, ending | Both camera views inspected; completed restoration persists, delivery determines its ending viewpoint, and voluntary docking completes all three campaign orders. |
| Runtime performance | One full world update per frame instead of two. Isolated opening sample improves from 58.0 to 59.9 FPS, with 1-percent low from 30.0 to 49.7; this is not a universal locked-60 claim. |

Validation evidence is recorded in `IMPLEMENTATION_NOTES.md`, with browser output under the ignored `output/playwright/completion/` directory.
