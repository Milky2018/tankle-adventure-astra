///|
priv struct MortarScope {
  camera : @core.Object3D
  mut contact : @sim.Vec3?
  mut blocked : Bool
  mut refresh_in : Double
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
  { camera, contact: None, blocked: false, refresh_in: 0, }
}

///|
/// Render only the storey at the first impact. The driving pass replaces this
/// scratch viewport immediately; the HUD keeps the image between updates.
fn View::draw_mortar_scope(self : View, p : @sim.Player) -> Unit {
  let scope = self.mortar_scope
  let visible = p.weapon == @sim.Mortar && p.hp > 0 && !self.film
  @host.hidden("mortar-scope", !visible)
  if !visible {
    scope.refresh_in = 0
    return
  }
  @host.class_toggle("mortar-scope", "lost", scope.contact is None)
  @host.class_toggle("mortar-scope", "intercept", scope.blocked)
  guard scope.contact is Some(at) else {
    scope.refresh_in = 0
    return
  }
  if scope.refresh_in > 0 {
    return
  }
  scope.refresh_in = 0.1
  scope.camera.position.set(at.x, at.y + 5.5, at.z) |> ignore
  scope.camera.look_at(vector(at))
  scope.camera.update_matrix_world(force=true)
  let r = self.renderer
  let size = Double::min(
    192 / r.get_pixel_ratio(),
    Double::min(@host.width().to_double(), @host.height().to_double()),
  )
  let shadows = r.shadow_map.auto_update
  r.shadow_map.auto_update = false
  r.set_viewport(0, 0, size, size)
  r.set_scissor(0, 0, size, size)
  r.set_scissor_test(true)
  self.cutaway.enabled.value = Number(0)
  r.render(self.scene, scope.camera)
  @host.copy_mortar_scope((size * r.get_pixel_ratio()).floor().to_int())
  r.set_scissor_test(false)
  r.set_viewport(0, 0, @host.width().to_double(), @host.height().to_double())
  r.shadow_map.auto_update = shadows
}
