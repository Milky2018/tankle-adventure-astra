///|
priv struct HiveVisual {
  body : @sim.Hive
  root : @core.Object3D
  scan : @core.Object3D?
  arms : Array[@core.Object3D?]
  beacon : @core.Object3D?
  mut proximity : Double
  mut pulse : Double
}

///|
fn hives(
  nodes : Map[String, @core.Object3D],
  game : @sim.Game,
) -> Array[HiveVisual] {
  game.hives.map(fn(body) {
    fn get(suffix : String) -> @core.Object3D? {
      let node = nodes.get("world/hives/\{body.id}/" + suffix)
      if node is Some(node) {
        node.matrix_auto_update = true
      }
      node
    }
    {
      body,
      root: get("root").unwrap(),
      scan: get("scan"),
      arms: Array::makei(2, fn(j) { get("arms/\{j}/pivot") }),
      beacon: get("lamps/0"),
      proximity: 0,
      pulse: 0,
    }
  })
}

///|
fn View::update_hives(self : View, game : @sim.Game, dt : Double) -> Unit {
  for v in self.hives {
    v.root.visible = v.body.requires is None ||
      (v.body.requires is Some(id) && game.progress.has(id))
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
        arm.rotation.set(
          0,
          0,
          (if i == 0 { 1.0 } else { -1.0 }) *
          (0.82 - v.proximity * 0.44 - work * 0.95),
        )
        |> ignore
      }
    }
    if v.scan is Some(scan) {
      scan.visible = v.pulse > 0
      scan.position.set_y(
        0.25 + (if v.pulse > 0 { (1.8 - v.pulse) * 1.8 % 1 * 2.4 } else { 0 }),
      )
      |> ignore
      let scale = if v.pulse > 0 {
        1.0 + work * 0.3
      } else {
        0.95 + @math.sin(game.time * 2) * 0.04
      }
      scan.scale.set(scale, scale, scale) |> ignore
    }
    if v.beacon is Some(beacon) {
      color(beacon, if active { 0xa4efd0 } else { 0x627d72 })
    }
  }
}
