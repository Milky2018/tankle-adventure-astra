///|
pub fn View::update_ending(self : View, game : @sim.Game) -> Unit {
  self.film = game.ending_at is Some(_)
  if !self.film {
    return
  }
  let (eye, at) : (@sim.Vec3, @sim.Vec3) = if game.player.ending_time < 9 {
    ({ x: 7, y: -49, z: 9, }, { x: 0, y: -54, z: -1, })
  } else if game.player.ending_time < 15 {
    ({ x: 8, y: 12, z: 25, }, { x: 0, y: 7, z: 12, })
  } else if game.player.ending_time < 20 {
    ({ x: 85, y: -3, z: -30, }, { x: 77, y: -7.4, z: -35.3, })
  } else {
    ({ x: 14, y: -3, z: 86, }, { x: 8, y: -7.5, z: 79, })
  }
  self.ending.set_position(vector(eye))
  self.ending.look_at(vector(at))
  self.ending.update_matrix_world(true)
}
