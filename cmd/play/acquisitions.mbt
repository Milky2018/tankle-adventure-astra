///|
fn Hud::acquisitions(self : Hud, game : @sim.Game, settings : Settings) -> Unit {
  for effect in game.effects {
    guard effect is @sim.Acquired(id) else { continue }
    guard game.pickups.iter().find_first(fn(p) { p.id == id }) is Some(pickup) else {
      continue
    }
    let (label, action, detail, duration) = match pickup.acquisition {
      Overdrive => ("Overdrive", "boost", "Hold to accelerate", 8.0)
      Magnet => ("Magnet", "magnet", "Hold to pull", 8.0)
      MortarModule =>
        ("Mortar", "weapon", "Switch weapon · Fire over cover", 8.0)
      Flotation => ("Flotation", "float", "Deploy floats to cross water", 8.0)
      Phoenix =>
        (
          "Phoenix Engine", "boost", "Build speed to break reinforced barriers",
          8.0,
        )
      LaserModule =>
        (
          "Laser", "weapon", "Switch weapon · Hold fire for a continuous beam",
          8.0,
        )
      Circulation =>
        (
          "Water Circulation", "boost", "Ram heat-sealed barriers while overheated",
          8.0,
        )
      Armor => ("Armor Pack", "", "+1 hull segment", 6.0)
      Cooling => ("Cooling Filter", "", "+25% cooling speed", 6.0)
      CannonCoil => ("Cannon Reinforcement", "", "+50% weapon damage", 6.0)
      MortarCharge => ("Mortar Reinforcement", "", "+50% weapon damage", 6.0)
      LaserFocus => ("Laser Reinforcement", "", "+50% weapon damage", 6.0)
      Scope => ("Weapon Scope", "", "+50% Cannon and Mortar range", 6.0)
    }
    self.acquired_until = game.time + duration
    @host.text("acquired-title", label)
    @host.text("acquired-detail", detail)
    @host.hidden("acquired-key", action == "")
    self.acquired_action = if action == "" { None } else { Some(action) }
    if action != "" {
      settings.show_binding("acquired-key", action)
    }
  }
  @host.hidden(
    "acquired",
    game.time >= self.acquired_until || game.player.hp <= 0,
  )
}
