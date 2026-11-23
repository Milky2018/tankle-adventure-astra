///|
pub fn Enemy::drive_exposed(self : Enemy) -> Bool {
  self.jam > 0 ||
  (self.definition.kind == ScrapRam && self.phase is Traverse(_, _))
}

///|
pub fn Enemy::battery_exposed(self : Enemy, index : Int32) -> Bool {
  self.parts.get(index) is Some(p) &&
  p.hp > 0 &&
  (self.definition.kind == Keeper || p.recoil > 0)
}

///|
pub fn EnemyKind::boss_name(self : EnemyKind) -> String {
  match self {
    ScrapRam => "Scrap Ram"
    Sorter => "Sorter"
    Overseer => "Overseer"
    Guardian => "Optical Guardian"
    Keeper => "Final Keeper"
    _ => ""
  }
}

///|
pub fn Enemy::boss_status(self : Enemy) -> String {
  match self.definition.kind {
    ScrapRam =>
      if self.drive_exposed() {
        "Drive exposed"
      } else {
        "Front plated · rear drive exposed"
      }
    Sorter =>
      if self.drive_exposed() {
        "Arm jammed · drive exposed"
      } else {
        "Front guarded · flank the gearbox"
      }
    Overseer =>
      if self.parts.all(fn(p) { p.hp <= 0 }) {
        "Core exposed"
      } else if self.battery_exposed(0) && self.battery_exposed(1) {
        "Both breeches open"
      } else if self.battery_exposed(0) {
        "West breech open"
      } else if self.battery_exposed(1) {
        "East breech open"
      } else {
        "Front shutters closed · attack outer cylinders"
      }
    Guardian => "Rear intake exposed"
    Keeper =>
      if self.parts.all(fn(p) { p.hp <= 0 }) {
        "Core exposed"
      } else if self.parts[0].hp <= 0 {
        "Starboard feed online"
      } else if self.parts[1].hp <= 0 {
        "Port feed online"
      } else {
        "Two feeds online · core sealed"
      }
    _ => ""
  }
}
