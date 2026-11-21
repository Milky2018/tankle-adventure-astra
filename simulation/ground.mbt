///|
pub fn World::ground_patches(self : World, player : Player) -> Array[Deck] {
  guard self.support(player.x, player.z, player.y, player.deployed)
    is Some(center) else {
    return []
  }
  if center.deck.water {
    return []
  }
  let candidates = self.decks.copy()
  for lift in self.lifts {
    candidates.push({
      id: lift.id,
      map_label: "Lift",
      rect: lift.rect,
      y: lift.y,
      rise: 0,
      water: false,
    })
  }
  let candidates = candidates.filter(fn(d) {
    let x = clamp(player.x, d.rect.x, d.rect.x + d.rect.w)
    let z = clamp(player.z, d.rect.z, d.rect.z + d.rect.d)
    !d.water &&
    Vec2::{ x: x - player.x, z: z - player.z, }.length() < 6 &&
    (d.height(z) - center.deck.height(z)).abs() < 0.15
  })
  fn distance(d : Deck) -> Double {
    if d.id == center.deck.id {
      return -1
    }
    Vec2::{
      x: player.x - clamp(player.x, d.rect.x, d.rect.x + d.rect.w),
      z: player.z - clamp(player.z, d.rect.z, d.rect.z + d.rect.d),
    }.length()
  }
  candidates.sort_by(fn(a, b) { distance(a).compare(distance(b)) })
  candidates[:Int32::min(4, candidates.length())].to_owned()
}

///|
pub fn ground_height(
  x : Double,
  z : Double,
  fallback : Double,
  patches : Array[Deck],
) -> Double {
  let expected = patches.get(0).map(fn(d) { d.height(z) }).unwrap_or(fallback)
  let mut best : Double? = None
  for d in patches {
    if d.rect.contains(x, z, margin=0.01) {
      let y = d.height(z)
      if best is None ||
        (best is Some(h) && (y - expected).abs() < (h - expected).abs()) {
        best = Some(y)
      }
    }
  }
  best.unwrap_or(expected)
}
