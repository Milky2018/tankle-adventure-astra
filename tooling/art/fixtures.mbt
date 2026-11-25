///|
/// Only fixtures at their authored stationary positions can share a world batch.
pub struct FixtureLayout {
  walls : Map[String, (Double, Double, Double)]
  controls : Set[String]
}

///|
pub fn FixtureLayout::from_catalog(
  barriers : Array[@catalog.Solid],
  controls : Array[@catalog.Control],
) -> FixtureLayout {
  let walls = Map([])
  for wall in barriers {
    if wall.permanent == Some(true) &&
      wall.motion is None &&
      wall.rail is None &&
      wall.arena.unwrap_or("").is_empty() &&
      wall.circuit_key is Some(key) {
      walls["world/walls/" + key + "/mesh"] = (
        wall.x + wall.w / 2,
        wall.y + wall.h / 2,
        wall.z + wall.d / 2,
      )
    }
  }
  let fixed = Set([])
  for control in controls {
    if control.mount.unwrap_or("").is_empty() {
      fixed.add("world/controls/" + control.id + "/root")
    }
  }
  { walls, controls: fixed, }
}
