///|
/// Authored weapon parameters. Values come from content/abilities.json.
priv struct ProjectileTuning {
  damage : Double
  heat : Double
  cooldown : Double
  range : Double
  speed : Double
  duration : Double
  arc : Double
}

///|
priv struct LaserTuning {
  damage_per_second : Double
  heat_per_second : Double
  range : Double
  segments : Int32
}

///|
priv struct MagnetTuning {
  range : Double
  shield_range : Double
  locked_range : Double
  idle_heat_per_second : Double
  pull_heat_per_second : Double
}

///|
priv struct DriveTuning {
  speed : Double
  overdrive : Double
  phoenix : Double
  boost_heat_per_second : Double
  acceleration_time : Double
  deceleration_time : Double
}
