///|
priv struct HiveVisual {
  body : @sim.Hive
  root : @three.Object3D
  halo : @three.Object3D?
  scan : @three.Object3D?
  arms : Array[@three.Object3D?]
  lamps : Array[@three.Object3D?]
  mut proximity : Double
  mut pulse : Double
}

///|
fn hives(
  nodes : Map[String, @three.Object3D],
  game : @sim.Game,
) -> Array[HiveVisual] {
  game.hives.mapi(fn(i, body) {
    fn get(suffix : String) -> @three.Object3D? {
      let node = nodes.get("world/hives/\{i}/" + suffix)
      if node is Some(node) {
        node.set_matrix_auto_update(true)
      }
      node
    }
    {
      body,
      root: get("root").unwrap(),
      halo: get("halo"),
      scan: get("scan"),
      arms: Array::makei(2, fn(j) { get("arms/\{j}/pivot") }),
      lamps: Array::makei(4, fn(j) { get("lamps/\{j}") }),
      proximity: 0,
      pulse: 0,
    }
  })
}

///|
pub fn View::update_hives(self : View, game : @sim.Game, dt : Double) -> Unit {
  for v in self.hives {
    v.root.set_visible(
      v.body.requires is None ||
      (v.body.requires is Some(id) && game.progress.has(id)),
    )
    let nearby = (game.player.y - v.body.position.y).abs() < 2 &&
      @sim.Vec2::{
        x: game.player.x - v.body.position.x,
        z: game.player.z - v.body.position.z,
      }.length() <
      6
    let active = game.progress.anchor == v.body.id
    v.proximity = damp(v.proximity, if nearby { 1 } else { 0 }, 5, dt)
    for effect in game.effects {
      if effect is @sim.Repaired(id) && id == v.body.id {
        v.pulse = 1.8
      }
    }
    v.pulse = Double::max(0, v.pulse - dt)
    let work = if v.pulse > 0 {
      @math.sin((1 - v.pulse / 1.8) * @math.PI)
    } else {
      0.0
    }
    for i, arm in v.arms {
      if arm is Some(arm) {
        arm.set_rotation_xyz(
          0,
          0,
          (if i == 0 { -1.0 } else { 1.0 }) *
          (0.55 - v.proximity * 0.4 - work * 0.55),
        )
      }
    }
    let lamp_color = if active || nearby { 0x9ad4ba } else { 0x829185 }
    if v.halo is Some(halo) {
      let scale = 1.0 + @math.sin(game.time * 2) * 0.025 + v.proximity * 0.08
      halo.set_scale_xyz(scale, scale, scale)
      color(halo, lamp_color)
    }
    if v.scan is Some(scan) {
      scan.set_visible(nearby || v.pulse > 0)
      scan
      .position()
      .set_y(
        0.25 + (if v.pulse > 0 { (1.8 - v.pulse) * 1.8 % 1 * 2.4 } else { 0 }),
      )
      |> ignore
      let scale = if v.pulse > 0 {
        1.0 + work * 0.3
      } else {
        0.95 + @math.sin(game.time * 2) * 0.04
      }
      scan.set_scale_xyz(scale, scale, scale)
    }
    for lamp in v.lamps {
      if lamp is Some(lamp) {
        color(lamp, if v.pulse > 0 { 0xffdf9a } else { lamp_color })
      }
    }
  }
}
