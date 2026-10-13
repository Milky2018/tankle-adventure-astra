///|
struct Hud {
  mini : @host.Canvas
  map : @host.Canvas
  mut dead : Bool
  mut reveal_at : Double
  mut layer : Double?
  mut layers : String
  mut health : String
  mut map_at : Double
  mut acquired_until : Double
}

///|
fn Hud::new() -> Hud {
  @host.attribute("boss-fill", "aria-label", "Boss health")
  @host.html(
    "bindings", "<p>W A S D — Drive</p><p>Mouse — Aim · Left button — Fire</p><p>Right button — Magnet · Shift — Overdrive</p><p>Q — Weapon · F — Flotation</p><p>E — Interact · C — Camera · Tab — Map</p>",
  )
  {
    mini: @host.canvas("minimap"),
    map: @host.canvas("region-map"),
    dead: false,
    reveal_at: -10,
    layer: None,
    layers: "",
    health: "",
    map_at: -1,
    acquired_until: -1,
  }
}

///|
fn Hud::update(
  self : Hud,
  game : @sim.Game,
  view : @view.View,
  map_open : Bool,
) -> Unit {
  let p = game.player
  @host.hidden("hud", game.ending_at is Some(_))
  self.death_iris(game, view)
  let mut health = ""
  for i in 0..<(p.max_hp() / 5).to_int() {
    health += "<i class=\"" +
      (if p.hp <= i.to_double() * 5 {
        "empty"
      } else if p.hp < (i + 1).to_double() * 5 {
        "half"
      } else {
        ""
      }) +
      "\"></i>"
  }
  if health != self.health {
    self.health = health
    @host.html("hp", health)
  }
  @host.class_toggle("status", "critical", p.hp > 0 && p.hp <= 15)
  @host.style("heat", "stroke-dashoffset", "\{100.0-p.heat}")
  @host.class_toggle("reticle", "hot", p.overheated)
  @host.style(
    "reticle",
    "--heat-color",
    if p.overheated {
      "#ff6352"
    } else if p.heat > 65 {
      "#f49d59"
    } else {
      "#ffeda3"
    },
  )
  @host.hidden("overdrive", !p.abilities.overdrive)
  @host.style("boost-fill", "width", "\{(p.speed-1)/2.2*100}%")
  @host.hidden(
    "tools",
    !p.abilities.magnet &&
    !p.abilities.flotation &&
    !p.abilities.mortar &&
    !p.abilities.laser,
  )
  @host.hidden("magnet-tool", !p.abilities.magnet)
  @host.hidden("flotation-tool", !p.abilities.flotation)
  @host.hidden("weapon-tool", !p.abilities.mortar && !p.abilities.laser)
  @host.text(
    "weapon-icon",
    match p.weapon {
      @sim.Cannon => "▬"
      @sim.Mortar => "⌒"
      @sim.Laser => "↯"
    },
  )
  @host.class_toggle("flotation-tool", "active", p.deployed)
  let boss = game.enemies
    .iter()
    .find_first(fn(e) {
      Some(e.definition.id) == game.progress.combat_arena && e.hp > 0
    })
  @host.style(
    "boss-health",
    "display",
    if boss is Some(_) {
      "flex"
    } else {
      "none"
    },
  )
  if boss is Some(boss) {
    @host.style("boss-fill", "width", "\{boss.hp/boss.definition.hp*100}%")
  }
  let interaction = game.interactable()
  @host.style(
    "interaction",
    "display",
    if interaction is Some(_) && p.hp > 0 {
      "block"
    } else {
      "none"
    },
  )
  if interaction is Some(id) {
    let target = if game.pickups.iter().find_first(fn(q) { q.id == id })
      is Some(q) {
      q.position
    } else if game.hives.iter().find_first(fn(h) { h.id == id }) is Some(h) {
      h.position
    } else {
      p.position()
    }
    let screen = view.project(target.add({ x: 0, y: 4, z: 0, }))
    @host.style("interaction", "left", "\{screen.x}px")
    @host.style("interaction", "top", "\{screen.z}px")
  }
  if game.time - self.map_at >= 0.1 || map_open {
    self.map_at = game.time
    self.draw_map(game, view, false)
    if map_open {
      self.map_layers(game)
      self.draw_map(game, view, true)
    }
  }
}

///|
fn Hud::draw_map(
  self : Hud,
  game : @sim.Game,
  view : @view.View,
  large : Bool,
) -> Unit {
  let p = game.player
  let layer = if large { self.layer.unwrap_or(p.y) } else { p.y }
  let ctx = if large { self.map } else { self.mini }
  let width = if large { @host.width() } else { 256 }
  let height = if large { @host.height() } else { 256 }
  let known = game.world.decks.filter(fn(d) {
    game.progress.discovered.contains(d.id)
  })
  let angle = if large || !view.third_person {
    @math.PI / 4
  } else {
    view.yaw + @math.PI
  }
  @host.canvas_begin(ctx, width, height, angle)
  let mut x0 = p.x - 8
  let mut x1 = p.x + 8
  let mut z0 = p.z - 8
  let mut z1 = p.z + 8
  if large {
    for d in known {
      if layer >= Double::min(d.y, d.y + d.rise) &&
        layer <= Double::max(d.y, d.y + d.rise) {
        x0 = Double::min(x0, d.rect.x - 8)
        x1 = Double::max(x1, d.rect.x + d.rect.w + 8)
        z0 = Double::min(z0, d.rect.z - 8)
        z1 = Double::max(z1, d.rect.z + d.rect.d + 8)
      }
    }
  }
  let scale = if large {
    Double::min(width.to_double() - 160, height.to_double() - 100) /
    ((x1 - x0 + z1 - z0) / 2.0.sqrt())
  } else {
    3.0
  }
  let ox = if large { (x0 + x1) / 2 } else { p.x }
  let oz = if large { (z0 + z1) / 2 } else { p.z }
  for d in known {
    let current = layer >= Double::min(d.y, d.y + d.rise) - 0.4 &&
      layer <= Double::max(d.y, d.y + d.rise) + 0.4
    let alpha = if current {
      1.0
    } else if (d.y - layer).abs() <= 8 {
      0.08
    } else {
      0.0
    }
    if alpha > 0 {
      @host.rectangle(
        ctx,
        (d.rect.x - ox) * scale,
        (d.rect.z - oz) * scale,
        d.rect.w * scale,
        d.rect.d * scale,
        if d.water {
          "#4e8587"
        } else {
          "#829185"
        },
        alpha,
      )
    }
  }
  for b in game.world.solids {
    if !b.permanent &&
      b.active(game.progress) &&
      (b.y - layer).abs() < 3 &&
      known.any(fn(d) { d.rect.contains(b.rect.x, b.rect.z) }) {
      @host.rectangle(
        ctx,
        (b.rect.x - ox) * scale,
        (b.rect.z - oz) * scale,
        b.rect.w * scale,
        b.rect.d * scale,
        "#d7a66d",
        1,
      )
    }
  }
  for h in game.hives {
    if (h.position.y - layer).abs() < 3 &&
      known.any(fn(d) { d.rect.contains(h.position.x, h.position.z) }) {
      @host.dot(
        ctx,
        (h.position.x - ox) * scale,
        (h.position.z - oz) * scale,
        4,
        "#87dfb6",
      )
    }
  }
  if (p.y - layer).abs() < 3 {
    @host.arrow(ctx, (p.x - ox) * scale, (p.z - oz) * scale, p.heading)
  }
}

///|
fn Hud::map_layers(self : Hud, game : @sim.Game) -> Unit {
  let levels : Array[Double] = []
  for d in game.world.decks {
    if game.progress.discovered.contains(d.id) {
      for y in [d.y, d.y + d.rise] {
        if !levels.contains(y) {
          levels.push(y)
        }
      }
    }
  }
  levels.sort_by(fn(a, b) { b.compare(a) })
  let selected = self.layer.unwrap_or(game.player.y)
  let mut markup = ""
  for i, y in levels {
    markup += "<button id=\"map-layer-\{i}\" aria-label=\"View discovered floor at \{y.to_int()} metres\" aria-pressed=\"\{(y-selected).abs()<0.5}\">━\{if (y-game.player.y).abs()<3 { " ◂" } else { "" }}</button>"
  }
  if markup == self.layers {
    return
  }
  self.layers = markup
  @host.html("map-layers", markup)
  for i, y in levels {
    @host.on_click("map-layer-\{i}", fn() { self.layer = Some(y) })
  }
}

///|
fn Hud::death_iris(self : Hud, game : @sim.Game, view : @view.View) -> Unit {
  let opening = if game.death_at is Some(at) {
    self.dead = true
    1.0 - @sim.clamp((game.time - at - 1.65) / 0.85, 0, 1)
  } else {
    if self.dead {
      self.dead = false
      self.reveal_at = game.time
    }
    @sim.clamp((game.time - self.reveal_at) / 0.45, 0, 1)
  }
  @host.hidden("death-iris", opening >= 1)
  if opening >= 1 {
    return
  }
  let center = view.project(game.player.position().add({ x: 0, y: 1.1, z: 0, }))
  let width = @host.width().to_double()
  let height = @host.height().to_double()
  let radius = (width * width + height * height).sqrt() *
    opening *
    opening *
    (3 - 2 * opening)
  let mut path = "M0 0H\{width}V\{height}H0Z"
  for i in 0..<6 {
    let angle = i.to_double() * @math.PI / 3
    path += (if i == 0 { " M" } else { " L" }) +
      "\{center.x+@math.cos(angle)*radius} \{center.z+@math.sin(angle)*radius}"
  }
  @host.attribute("death-shutter", "d", path + "Z")
}
