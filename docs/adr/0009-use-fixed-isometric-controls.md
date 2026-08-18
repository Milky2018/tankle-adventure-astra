# Use fixed isometric controls

The game will use a fixed three-quarter camera at approximately 45 degrees of elevation while all gameplay remains constrained to the ground plane. WASD moves directly in screen space, the hull visually follows movement, the mouse selects a projected ground target, and each left click fires toward that target. The camera follows position without free orbit or Pointer Lock. This supersedes the original hull-steering and mouse-look control model because that implementation made basic navigation and aiming unreliable and obscured the Tank behind level geometry.
