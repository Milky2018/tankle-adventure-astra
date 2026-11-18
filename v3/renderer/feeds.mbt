///|
priv struct Feed {
  mesh : @core.Object3D
  id : String
  duration : Double
  progress : Array[Double]
  colors : Array[Int32]
}

///|
fn feeds(scene : @core.Object3D) -> Array[Feed] {
  let result : Array[Feed] = []
  scene.traverse(fn(mesh) {
    let feed = mesh.user_data.get("artFeed")
    if !feed.is_undefined() {
      let id = metadata_string(feed, "id")
      let values : FixedArray[Double] = feed.get("progress").cast()
      let progress = values.iter().to_array()
      result.push({
        mesh,
        id,
        duration: feed.get("duration").cast(),
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
        feed.mesh.set_color_at(i, @m3.Color::from_hex(color)) |> ignore
        if feed.mesh.kind
          is Mesh(
            { kind: InstancedMesh({ instance_color: Some(attribute), .. }), .. },
          ) {
          attribute.set_needs_update(true)
        }
        feed.colors[i] = color
      }
    }
  }
}
