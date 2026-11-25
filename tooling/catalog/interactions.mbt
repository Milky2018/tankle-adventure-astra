///|
pub enum Trigger {
  Shot
  Single(@interaction.Action)
}

///|
pub impl @json.FromJson for Trigger with fn from_json(value, path) {
  if value == "shot" {
    return Shot
  }
  let action : @interaction.Action = @json.from_json(value, path~)
  match action {
    MagnetAction | LaserAction | Use | Dock => Single(action)
    CannonAction | MortarAction =>
      raise path.error(
        "A weapon-specific shot control uses kind 'shot' and a weapons list",
      )
  }
}

///|
#derive(FromJson(rename_fields="camelCase"))
pub struct Control {
  id : String
  x : Double
  y : Double
  z : Double
  ground : Double?
  rest_y : Double?
  kind : Trigger
  weapons : Array[@interaction.Action]?
  target_key : String?
  circuit_key : String?
  requires : String?
  effects : Array[String]?
  mount : String?
  facing : (Double, Double, Double)?
  normal : (Double, Double, Double)?
  surface : String?
  rotor : Bool?
  counterweight : Bool?
}

///|
pub fn Control::actions(self : Control) -> Array[@interaction.Action] {
  match (self.weapons, self.kind) {
    (Some(actions), _) => actions
    (None, Shot) => [CannonAction, MortarAction, LaserAction]
    (None, Single(action)) => [action]
  }
}

///|
#derive(FromJson)
pub struct PickupPlacement {
  id : String
  x : Double
  y : Double
  z : Double
  requires : String?
  lift : String?
  hidden : Bool?
  preview : Bool?
}

///|
pub struct Pickup {
  placement : PickupPlacement
  acquisition : @interaction.Acquisition
}

///|
pub impl @json.FromJson for Pickup with fn from_json(value, path) {
  let placement : PickupPlacement = @json.from_json(value, path~)
  let acquisition : @interaction.Acquisition = match value {
    { "ability": ability, .. } =>
      match ability {
        "overdrive" => Overdrive
        "magnet" => Magnet
        "mortar" => MortarModule
        "flotation" => Flotation
        "phoenix" => Phoenix
        "laser" => LaserModule
        "circulation" => Circulation
        _ => raise path.add_key("ability").error("Unknown pickup ability")
      }
    { "upgrade": upgrade, .. } =>
      match upgrade {
        "armor" => Armor
        "cooling" => Cooling
        "cannon" => CannonCoil
        "mortar" => MortarCharge
        "laser" => LaserFocus
        "scope" => Scope
        _ => raise path.add_key("upgrade").error("Unknown pickup upgrade")
      }
    _ => raise path.error("Pickup needs an ability or upgrade")
  }
  { placement, acquisition, }
}

///|
#derive(FromJson)
pub struct Hive {
  id : String
  name : String
  x : Double
  y : Double
  z : Double
  heading : Double?
  requires : String?
}

///|
#derive(FromJson)
pub struct Mirror {
  id : String
  x : Double
  y : Double
  z : Double
  n : (Double, Double, Double)
  size : Double
  turnable : Bool?
}
