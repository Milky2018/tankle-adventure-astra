///|
priv struct CrawlerEquipment {
  guns : Array[(@sim.Weapon, @core.Object3D, @core.Object3D)]
  armour : Array[(String, @core.Object3D)]
  gearbox : @core.Object3D
  phoenix : @core.Object3D
  winch : @core.Object3D
  poles : Array[@core.Object3D]
  circulation : @core.Object3D
  flow : @core.Object3D
  filter : @core.Object3D
  fan : @core.Object3D
  shutter : @core.Object3D
  scope : @core.Object3D
  optic : @core.Object3D
  mut previous_heat : Double
}

///|
fn CrawlerEquipment::new(
  nodes : Map[String, @core.Object3D],
) -> CrawlerEquipment {
  fn part(id : String) -> @core.Object3D {
    nodes.get("player/refit/\{id}").unwrap()
  }
  {
    guns: [
      (@sim.Cannon, part("cannon"), part("cannon-coil")),
      (@sim.Mortar, part("mortar"), part("mortar-charge")),
      (@sim.Laser, part("laser"), part("laser-focus")),
    ],
    armour: [
      "armor-foundry", "armor-reservoir", "armor-proving", "armor-lens", "armor-hearth",
    ].map(fn(id) { (id, part(id)) }),
    gearbox: part("overdrive"),
    phoenix: part("phoenix"),
    winch: part("magnet"),
    poles: [part("pole-left"), part("pole-right")],
    circulation: part("circulation"),
    flow: part("flow"),
    filter: part("cooling-filter"),
    fan: part("fan"),
    shutter: part("shutter"),
    scope: part("cannon-scope"),
    optic: part("scope-head"),
    previous_heat: 0,
  }
}

///|
fn CrawlerEquipment::update(
  self : CrawlerEquipment,
  game : @sim.Game,
  dt : Double,
) -> Unit {
  let p = game.player
  for item in self.guns {
    let (weapon, gun, attachment) = item
    gun.visible = p.weapon == weapon
    attachment.visible = gun.visible &&
      (match weapon {
        Cannon => p.upgrades.cannon
        Mortar => p.upgrades.mortar
        Laser => p.upgrades.laser
      })
  }
  for plate in self.armour {
    let (id, node) = plate
    node.visible = game.progress.has(id)
  }
  self.gearbox.visible = p.abilities.overdrive && !p.abilities.phoenix
  self.phoenix.visible = p.abilities.phoenix
  self.winch.visible = p.abilities.magnet
  for i, pole in self.poles {
    pole.visible = self.winch.visible
    if pole.visible {
      let side = if i == 0 { -1.0 } else { 1.0 }
      let angle = if game.magnet_end is Some(_) { side * 0.36 } else { 0 }
      pole.rotation.set(0, damp(pole.rotation.y, angle, 18, dt), 0) |> ignore
    }
  }
  self.circulation.visible = p.abilities.circulation
  self.flow.visible = p.red_contact() && p.hp > 0
  if self.flow.visible {
    self.flow.position.set_y(1.74 + @math.sin(game.time * 13) * 0.12) |> ignore
  }
  self.filter.visible = p.upgrades.cooling
  self.fan.visible = self.filter.visible
  self.shutter.visible = self.filter.visible
  if self.filter.visible {
    let cooling = p.hp > 0 && p.heat < self.previous_heat
    if cooling {
      self.fan.rotate_y(dt * 19) |> ignore
    }
    self.shutter.rotation.set(
      0,
      0,
      damp(self.shutter.rotation.z, if cooling { 0.90 } else { 0 }, 12, dt),
    )
    |> ignore
  }
  self.previous_heat = p.heat
  self.scope.visible = p.upgrades.scope
  self.optic.visible = self.scope.visible
  if self.optic.visible {
    let deployed = p.weapon != @sim.Laser
    self.optic.position.set_y(
      damp(self.optic.position.y, if deployed { 2.68 } else { 2.45 }, 15, dt),
    )
    |> ignore
    self.optic.position.set_z(
      damp(self.optic.position.z, if deployed { 0.39 } else { -0.20 }, 15, dt),
    )
    |> ignore
  }
}

///|
fn View::visible_muzzle(self : View, p : @sim.Player) -> @sim.Vec3 {
  let length = match p.weapon {
    Cannon => 2.65
    Mortar => 2.14
    Laser => if p.upgrades.laser { 2.68 } else { 2.42 }
  }
  point(self.barrel.local_to_world(@m3.Vector3::new(0, 0, length)))
}
