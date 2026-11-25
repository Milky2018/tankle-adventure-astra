///|
/// Only fixtures at their authored stationary positions can share a world batch.
pub struct FixtureLayout {
  walls : Map[String, (Double, Double, Double)]
  controls : Set[String]
}

///|
pub fn FixtureLayout::from_catalog(
  barriers : Json,
  controls : Json,
) -> FixtureLayout raise {
  guard barriers is Array(wall_records) && controls is Array(control_records) else {
    raise Failure("Expected barrier and control catalogs")
  }
  fn unassigned(record : Map[String, Json], field : String) -> Bool {
    match record.get(field) {
      None | Some(Null | False | String("")) => true
      _ => false
    }
  }
  let walls = Map([])
  for row in wall_records {
    guard row is Object(r) &&
      row
      is {
        "permanent": True,
        "circuitKey": String(key),
        "x": Number(x, ..),
        "y": Number(y, ..),
        "z": Number(z, ..),
        "w": Number(w, ..),
        "h": Number(h, ..),
        "d": Number(d, ..),
        ..
      } else {
      continue
    }
    if unassigned(r, "motion") &&
      unassigned(r, "rail") &&
      unassigned(r, "arena") {
      walls["world/walls/" + key + "/mesh"] = (x + w / 2, y + h / 2, z + d / 2)
    }
  }
  let fixed = Set([])
  for row in control_records {
    if row is Object(r) &&
      row is { "id": String(id), .. } &&
      unassigned(r, "mount") {
      fixed.add("world/controls/" + id + "/root")
    }
  }
  { walls, controls: fixed, }
}
