///|
#derive(FromJson)
pub struct Footprint {
  x : Double
  z : Double
  w : Double
  d : Double
}

///|
#derive(FromJson)
pub struct Activation {
  x : Double
  y : Double
  z : Double
  radius : Double
}

///|
#derive(FromJson(rename_fields="camelCase", fields(kind(rename="type"))))
pub struct Enemy {
  id : String
  kind : @machine.EnemyKind
  x : Double
  y : Double
  z : Double
  hp : Double
  persistent : Bool?
  emplacement : Bool?
  magnetic_shield : Bool?
  coordinated : Bool?
  encounter : String?
  battle : String?
  wave : Int32?
  startup : Double?
  opening_crossing : Double?
  spotter_height : Double?
  detection_range : Double?
  patrol : Footprint?
  activation : Activation?
  swim_patrol : Array[(Double, Double)]?
  parts : Array[Double]?
  core : Double?
  mirror : Bool?
  reserve_for : String?
  reserve_at : Double?
}

///|
#derive(FromJson(rename_fields="camelCase"))
pub struct Arena {
  id : String
  boss : String
  x : Double
  y : Double
  z : Double
  w : Double
  d : Double
  cover : String?
  music : String
  victory_effects : Array[String]?
}

///|
#derive(FromJson)
pub struct Deck {
  id : String
  x : Double
  y : Double
  z : Double
  w : Double
  d : Double
  rise : Double?
  water : Bool?
  region : String?
}

///|
#derive(FromJson)
pub struct Drive {
  enemy : String
  part : Int32
}

///|
#derive(FromJson)
pub struct ConveyorMotion {
  vx : Double?
  vz : Double?
  heat : Double?
  release : String?
  stop : String?
  drive : Drive?
}

///|
pub struct Belt {
  deck : Deck
  motion : ConveyorMotion
}

///|
pub impl @json.FromJson for Belt with fn from_json(value, path) {
  {
    deck: @json.from_json(value, path~),
    motion: @json.from_json(value, path~),
  }
}

///|
#derive(FromJson(rename_fields="camelCase"))
pub struct Circuit {
  id : String
  duration : Double
  cleared_battle : String?
  branches : Array[Branch]
}

///|
#derive(FromJson)
pub struct Branch {
  key : String
  target : String?
  duration : Double?
}

///|
#derive(FromJson(fields(segments(rename="belt-segments"))))
pub struct Level {
  controls : Array[Control]
  pickups : Array[Pickup]
  hives : Array[Hive]
  mirrors : Array[Mirror]
  enemies : Array[Enemy]
  arenas : Array[Arena]
  decks : Array[Deck]
  belts : Array[Belt]
  heat : Array[Belt]
  circuits : Array[Circuit]
  segments : Map[String, Array[(Double, Int32)]]
}
