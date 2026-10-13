///|
priv struct Feed {
  mesh : @three.Object3D
  id : String
  duration : Double
  progress : Array[Double]
  colors : Array[Int32]
}

///|
extern "js" fn feed_id(mesh : @three.Object3D) -> String =
  #| mesh => mesh.userData.artFeed?.id ?? ''

///|
extern "js" fn feed_duration(mesh : @three.Object3D) -> Double =
  #| mesh => mesh.userData.artFeed.duration

///|
extern "js" fn feed_progress(mesh : @three.Object3D) -> FixedArray[Double] =
  #| mesh => mesh.userData.artFeed.progress

///|
extern "js" fn instance_color(
  mesh : @three.Object3D,
  index : Int32,
  value : Int32,
) -> Unit =
  #| (mesh,index,value) => { mesh.getColorAt(index, mesh.userData.colorScratch ??= mesh.material.color.clone()).setHex(value); mesh.setColorAt(index,mesh.userData.colorScratch); mesh.instanceColor.needsUpdate=true; }

///|
fn feeds(scene : @three.Scene) -> Array[Feed] {
  let result : Array[Feed] = []
  scene
  .as_object3d()
  .traverse(fn(mesh) {
    let id = feed_id(mesh)
    if id != "" {
      let progress = feed_progress(mesh).iter().to_array()
      result.push({
        mesh,
        id,
        duration: feed_duration(mesh),
        progress,
        colors: Array::make(progress.length(), -1),
      })
    }
  })
  result
}

///|
pub fn View::update_feeds(self : View, game : @sim.Game) -> Unit {
  for feed in self.feeds {
    let active = game.commands.active(game.progress, feed.id)
    let elapsed = if game.progress.pending.get(feed.id) is Some(signal) {
      signal.duration - signal.remaining
    } else {
      game.commands.starts
      .get(feed.id)
      .map(fn(t) { game.time - t })
      .unwrap_or(1.0 / 0.0)
    }
    for i, progress in feed.progress {
      let color = if active && elapsed >= progress * feed.duration {
        0x9ad4ba
      } else {
        0xebae57
      }
      if feed.colors[i] != color {
        instance_color(feed.mesh, i, color)
        feed.colors[i] = color
      }
    }
  }
}
