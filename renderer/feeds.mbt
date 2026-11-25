///|
priv struct Feed {
  mesh : @core.Object3D
  id : String
  duration : Double
  progress : Array[Double]
  colors : Array[Int32]
}

///|
#derive(FromJson)
priv struct FeedLights {
  id : String
  duration : Double
  progress : Array[Double]
}

///|
fn feeds(scene : @core.Object3D) -> Array[Feed] {
  let result = []
  scene.traverse(fn(mesh) {
    let lights : FeedLights? = scene_field(mesh.user_data, "artFeed")
    if lights is Some(f) &&
      mesh.kind is Mesh({ kind: InstancedMesh(_), count, .. }) &&
      f.progress.length() <= count {
      result.push({
        mesh,
        id: f.id,
        duration: f.duration,
        progress: f.progress,
        colors: Array::make(f.progress.length(), -1),
      })
    }
  })
  result
}

///|
fn View::update_feeds(self : View, game : @sim.Game) -> Unit {
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
