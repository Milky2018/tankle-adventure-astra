///|
#derive(@json.ToJson, @json.FromJson)
priv struct CameraSettings {
  pitch : Double
  distance : Double
  height : Double
  shoulder : Double
  sensitivity : Double
  angle : Double
  scale : Double
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
    angle: @math.atan2(39.6, (28.0 * 28 * 2).sqrt()) * 180 / @math.PI,
    scale: 17,
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
  v.overhead_angle = c.angle * @math.PI / 180
  v.area = c.scale
  v.set_render_distance(c.render_distance)
  v.resize()
  v.position_player(self.game.player, self.game.world, 0)
  self.redraw = true
}

///|
fn Session::mount_camera(self : Session) -> Unit {
  let c = self.settings.camera
  let fields = [
    ("pitch", "Pitch", -30.0, 54.0, 0.1, c.pitch),
    ("distance", "Follow distance", 6.0, 20.0, 0.5, c.distance),
    ("height", "Camera height", 0.0, 5.0, 0.1, c.height),
    ("shoulder", "Shoulder offset", -3.0, 3.0, 0.1, c.shoulder),
    ("sensitivity", "Mouse sensitivity", 1.0, 10.0, 0.1, c.sensitivity),
    ("angle", "Overhead angle", 30.0, 70.0, 1.0, c.angle),
    ("scale", "Visible area", 12.0, 28.0, 0.5, c.scale),
    ("render-distance", "Render distance", 40.0, 400.0, 1.0, c.render_distance),
  ]
  let mut markup = ""
  for (id, label, min, max, step, value) in fields {
    markup += "<label>" +
      label +
      "<input id=\"camera-" +
      id +
      "\" type=\"range\" min=\"\{min}\" max=\"\{max}\" step=\"\{step}\" value=\"\{value}\"/></label>"
  }
  @host.html("camera-options", markup)
  self.apply_camera()
  for (id, _, _, _, _, _) in fields {
    @host.on_change("camera-" + id, fn() {
      self.settings.camera = {
        pitch: @host.setting_number("camera-pitch"),
        distance: @host.setting_number("camera-distance"),
        height: @host.setting_number("camera-height"),
        shoulder: @host.setting_number("camera-shoulder"),
        sensitivity: @host.setting_number("camera-sensitivity"),
        angle: @host.setting_number("camera-angle"),
        scale: @host.setting_number("camera-scale"),
        render_distance: @host.setting_number("camera-render-distance"),
      }
      self.apply_camera()
      self.settings.save()
    })
  }
}
