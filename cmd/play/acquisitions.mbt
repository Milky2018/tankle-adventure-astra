///|
fn Hud::acquisitions(self : Hud, game : @sim.Game, settings : Settings) -> Unit {
  for effect in game.effects {
    guard effect is @sim.Acquired(id) else { continue }
    guard game.pickups.iter().find_first(fn(p) { p.id == id }) is Some(pickup) else {
      continue
    }
    let (label, action, detail, duration) = match pickup.acquisition {
      @sim.Overdrive => ("Overdrive", "boost", "Hold to accelerate", 8.0)
      @sim.Magnet => ("Magnet", "magnet", "Hold to pull", 8.0)
      @sim.MortarModule =>
        ("Mortar", "weapon", "Switch weapon · Fire over cover", 8.0)
      @sim.Flotation =>
        ("Flotation", "float", "Deploy floats to cross water", 8.0)
      @sim.Phoenix =>
        (
          "Phoenix Engine", "boost", "Build speed to break reinforced barriers",
          8.0,
        )
      @sim.LaserModule =>
        (
          "Laser", "weapon", "Switch weapon · Hold fire for a continuous beam",
          8.0,
        )
      @sim.Circulation =>
        (
          "Water Circulation", "boost", "Ram heat-sealed barriers while overheated",
          8.0,
        )
      @sim.Armor => ("Armor Pack", "", "+1 hull segment", 6.0)
      @sim.Cooling => ("Cooling Filter", "", "+25% cooling speed", 6.0)
      @sim.CannonCoil => ("Cannon Reinforcement", "", "+50% weapon damage", 6.0)
      @sim.MortarCharge =>
        ("Mortar Reinforcement", "", "+50% weapon damage", 6.0)
      @sim.LaserFocus => ("Laser Reinforcement", "", "+50% weapon damage", 6.0)
      @sim.Scope => ("Weapon Scope", "", "+50% Cannon and Mortar range", 6.0)
    }
    self.acquired_until = game.time + duration
    @host.text("acquired-title", label)
    @host.text("acquired-detail", detail)
    @host.hidden("acquired-key", action == "")
    @host.text("acquired-key", settings.bindings.get(action).unwrap_or(""))
  }
  @host.hidden(
    "acquired",
    game.time >= self.acquired_until || game.player.hp <= 0,
  )
}
