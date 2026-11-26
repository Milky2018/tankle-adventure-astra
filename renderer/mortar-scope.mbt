///|
priv struct MortarScope {
  camera : @core.Object3D
  mut contact : @sim.Vec3?
  mut blocked : Bool
  mut viewport : (Double, Double, Double, Double)?
}

///|
fn MortarScope::new() -> MortarScope {
  let camera = @core.OrthographicCamera::new(
    left=-8,
    right=8,
    top=8,
    bottom=-8,
    near=0.1,
    far=32,
  )
  camera.up.set(0, 0, -1) |> ignore
  { camera, contact: None, blocked: false, viewport: None, }
}

///|
/// The driving pass has already updated the scene matrices and shadow maps.
fn View::draw_mortar_scope(self : View, p : @sim.Player) -> Unit {
  let scope = self.mortar_scope
  let visible = p.weapon == @sim.Mortar && p.hp > 0 && !self.film
  @host.hidden("mortar-scope", !visible)
  if !visible {
    return
  }
  @host.class_toggle("mortar-scope", "lost", scope.contact is None)
  @host.class_toggle("mortar-scope", "intercept", scope.blocked)
  guard scope.contact is Some(at) else { return }
  let (x, y, width, height) = match scope.viewport {
    Some(rect) => rect
    None => {
      let rect = @host.viewport_rect("mortar-scope")
      scope.viewport = Some(rect)
      rect
    }
  }
  scope.camera.position.set(at.x, at.y + 5.5, at.z) |> ignore
  scope.camera.up.set(@math.sin(self.yaw), 0, @math.cos(self.yaw)) |> ignore
  scope.camera.look_at(vector(at))
  let r = self.renderer
  let shadows = r.shadow_map.auto_update
  let matrices = self.scene.matrix_world_auto_update
  let cutaway = self.cutaway.enabled.value
  r.shadow_map.auto_update = false
  self.scene.matrix_world_auto_update = false
  self.cutaway.enabled.value = Number(0)
  r.set_viewport(x, y, width, height)
  r.set_scissor(x, y, width, height)
  r.set_scissor_test(true)
  r.render(self.scene, scope.camera)
  r.set_scissor_test(false)
  r.set_viewport(0, 0, @host.width().to_double(), @host.height().to_double())
  r.shadow_map.auto_update = shadows
  self.scene.matrix_world_auto_update = matrices
  self.cutaway.enabled.value = cutaway
}
