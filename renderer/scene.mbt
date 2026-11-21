///|
fn metadata_string(data : @core.JsValue, key : String) -> String {
  let value = data.get(key)
  if value.is_undefined() {
    ""
  } else {
    value.cast()
  }
}

///|
fn scene_binding(object : @core.Object3D) -> String {
  metadata_string(object.user_data, "binding")
}

///|
fn mesh_materials(slot : @core.MaterialSlot) -> Array[@core.Material] {
  match slot {
    Single(material) => [material]
    Multiple(items) => items
  }
}

///|
fn basic_material(color : Int32) -> @core.Material {
  let material = @core.MeshBasicMaterial::new()
  material.color = Some(@m3.Color::from_hex(color))
  material
}

///|
pub fn View::present(
  self : View,
  game : @sim.Game,
  queries : @sim.Queries,
  aim : @sim.Vec3,
  dt : Double,
) -> Unit {
  self.update_player(game, dt)
  self.update_belts(game, dt)
  self.update_hives(game, dt)
  self.update_renewal(game, dt)
  self.update_enemies(game, dt)
  self.update_projectiles(game)
  self.update_feeds(game)
  self.update_effects(game, aim, queries)
  self.update_ending(game)
}
