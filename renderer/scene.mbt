///|
/// Artist-authored Three.js userData is an open JSON object.
fn[T : @json.FromJson] scene_field(data : @core.JsValue, key : String) -> T? {
  let value = data.get(key)
  if value.is_undefined() || value.is_null() {
    None
  } else {
    Some(@json.from_json(value.to_json())) catch {
      _ => None
    }
  }
}

///|
fn scene_binding(object : @core.Object3D) -> String {
  scene_field(object.user_data, "binding").unwrap_or("")
}

///|
#derive(Debug, FromJson(rename_cases="camelCase"))
priv enum SurfaceFinish {
  Paving
  SignalDeck
  Apron
  Masonry
  Ironwork
  Canal
  Vapor
  OpticalMirror
  EnemyEnamel
  Glass
}

///|
fn surface_finish(material : @core.Material) -> SurfaceFinish? {
  scene_field(material.user_data, "surfaceFinish")
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
