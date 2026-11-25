///|
#derive(@json.ToJson, @json.FromJson)
priv struct CameraSettings {
  pitch : Double
  distance : Double
  height : Double
  shoulder : Double
  sensitivity : Double
  render_distance : Double
}

///|
fn CameraSettings::new() -> CameraSettings {
  {
    pitch: 15.3,
    distance: 15,
    height: 2.5,
    shoulder: 0,
    sensitivity: 3,
    render_distance: 230,
  }
}

///|
fn Session::apply_camera(self : Session) -> Unit {
  let c = self.settings.camera
  let v = self.view
  v.pitch = c.pitch * @math.PI / 180
  v.distance = c.distance
  v.camera_height = c.height
  v.shoulder = c.shoulder
  v.sensitivity = c.sensitivity
  v.set_render_distance(c.render_distance)
  v.resize()
  v.position_player(self.game.player, self.game.world, 0)
  self.redraw = true
}

///|
fn Session::show_camera(self : Session) -> Unit {
  let c = self.settings.camera
  for
    (id, value) in [
      ("pitch", c.pitch),
      ("distance", c.distance),
      ("height", c.height),
      ("shoulder", c.shoulder),
      ("sensitivity", c.sensitivity),
      ("render-distance", c.render_distance),
    ] {
    @host.set_value("camera-" + id, value.to_string())
  }
  self.apply_camera()
}

///|
fn Session::mount_camera(self : Session) -> Unit {
  self.show_camera()
  for
    id in [
      "pitch", "distance", "height", "shoulder", "sensitivity", "render-distance",
    ] {
    @host.on_change("camera-" + id, fn() {
      self.settings.camera = {
        pitch: @host.setting_number("camera-pitch"),
        distance: @host.setting_number("camera-distance"),
        height: @host.setting_number("camera-height"),
        shoulder: @host.setting_number("camera-shoulder"),
        sensitivity: @host.setting_number("camera-sensitivity"),
        render_distance: @host.setting_number("camera-render-distance"),
      }
      self.apply_camera()
      self.settings.save()
    })
  }
}
