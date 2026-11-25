///|
fn Hud::acquisitions(self : Hud, game : @sim.Game, settings : Settings) -> Unit {
  for effect in game.effects {
    guard effect is @sim.Acquired(id) else { continue }
    guard game.pickups.iter().find_first(fn(p) { p.id == id }) is Some(pickup) else {
      continue
    }
    let (label, action, detail, duration) : (String, Action?, String, Double) = match
      pickup.acquisition {
      Overdrive => ("Overdrive", Some(Boost), "Hold to accelerate", 8.0)
      Magnet => ("Magnet", Some(Magnet), "Hold to pull", 8.0)
      MortarModule =>
        ("Mortar", Some(Weapon), "Switch weapon · Fire over cover", 8.0)
      Flotation =>
        ("Flotation", Some(Flotation), "Deploy floats to cross water", 8.0)
      Phoenix =>
        (
          "Phoenix Engine",
          Some(Boost),
          "Build speed to break reinforced barriers",
          8.0,
        )
      LaserModule =>
        (
          "Laser",
          Some(Weapon),
          "Switch weapon · Hold fire for a continuous beam",
          8.0,
        )
      Circulation =>
        (
          "Water Circulation",
          Some(Boost),
          "Ram heat-sealed barriers while overheated",
          8.0,
        )
      Armor => ("Armor Pack", None, "+1 hull segment", 6.0)
      Cooling => ("Cooling Filter", None, "+25% cooling speed", 6.0)
      CannonCoil => ("Cannon Reinforcement", None, "+50% weapon damage", 6.0)
      MortarCharge => ("Mortar Reinforcement", None, "+50% weapon damage", 6.0)
      LaserFocus => ("Laser Reinforcement", None, "+50% weapon damage", 6.0)
      Scope => ("Weapon Scope", None, "+50% Cannon and Mortar range", 6.0)
    }
    self.acquired_until = game.time + duration
    @host.text("acquired-title", label)
    @host.text("acquired-detail", detail)
    @host.hidden("acquired-key", action is None)
    self.acquired_action = action
    if action is Some(action) {
      settings.show_binding("acquired-key", action)
    }
  }
  @host.hidden(
    "acquired",
    game.time >= self.acquired_until || game.player.hp <= 0,
  )
}
