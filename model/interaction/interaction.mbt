///|
#derive(Eq, Debug, FromJson(rename_cases="lowercase", cases(CannonAction(rename="cannon"), MortarAction(rename="mortar"), LaserAction(rename="laser"), MagnetAction(rename="magnet"))))
pub(all) enum Action {
  CannonAction
  MortarAction
  LaserAction
  MagnetAction
  Use
  Dock
}

///|
#deprecated
pub extend Action with Eq::{equal, not_equal}

///|
#derive(Debug)
pub(all) enum Acquisition {
  Overdrive
  Magnet
  MortarModule
  Flotation
  Phoenix
  LaserModule
  Circulation
  Armor
  Cooling
  CannonCoil
  MortarCharge
  LaserFocus
  Scope
}
