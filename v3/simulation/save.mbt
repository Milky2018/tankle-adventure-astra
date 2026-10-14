///|
priv struct Save {
  version : Int32
  flags : Map[String, Bool]
  pending : Map[String, Signal]
  anchor : String
  mirrors : Map[String, Int32]
  slides : Map[String, Double]
  discovered : Array[String]
  rail : RailPuzzle
  gutter : GutterPuzzle
  delivery : Delivery
  puzzle_signals : Map[String, Double]
} derive(@json.ToJson, @json.FromJson)

///|
pub fn Game::save(self : Game) -> String {
  let state = self.progress
  Save::{
    version: 1,
    flags: state.flags,
    pending: state.pending,
    anchor: state.anchor,
    mirrors: state.mirror_turns,
    slides: state.slide_positions,
    discovered: state.discovered,
    rail: self.puzzles.rail,
    gutter: self.puzzles.gutter,
    delivery: self.puzzles.delivery,
    puzzle_signals: self.puzzles.pending,
  }
  |> @json.ToJson::to_json
  |> Json::stringify
}

///|
pub fn Game::restore(self : Game, text : String) -> Bool {
  let saved : Save = @json.from_json(@json.parse(text)) catch {
    _ => return false
  }
  if saved.version != 1 {
    return false
  }
  for pickup in self.pickups {
    if saved.flags.get(pickup.id) == Some(true) {
      self.player.install(pickup.acquisition)
    }
  }
  for id, flag in saved.flags {
    self.progress.flags[id] = flag
  }
  for id, signal in saved.pending {
    self.progress.pending[id] = signal
  }
  self.progress.anchor = saved.anchor
  for id, turns in saved.mirrors {
    self.progress.mirror_turns[id] = turns
  }
  for m in self.mirrors {
    m.angle = -saved.mirrors.get(m.id).unwrap_or(0).to_double() * @math.PI / 2
  }
  for id, position in saved.slides {
    self.progress.slide_positions[id] = position
  }
  for bodies in [self.world.solids, self.world.obstacles] {
    for body in bodies {
      if body.rail is Some(rail) && saved.slides.get(body.id) is Some(position) {
        body.set_coordinate(rail.axis, clamp(position, rail.min, rail.max))
      }
    }
  }
  self.progress.discovered.clear()
  for id in saved.discovered {
    self.progress.discovered.push(id)
  }
  self.puzzles.rail = saved.rail
  self.puzzles.gutter = saved.gutter
  self.puzzles.delivery = saved.delivery
  for id, left in saved.puzzle_signals {
    self.puzzles.pending[id] = left
  }
  self.player.apply_upgrades(self.progress, pickups=self.pickups)
  self.progress.events.clear()
  self.respawn()
  true
}

///|
priv struct EnemySnapshot {
  id : String
  hp : Double
  x : Double
  y : Double
  z : Double
  vent : Bool
  parts : Array[(Double, Double, Double, Double)]
} derive(@json.ToJson)

///|
priv struct Snapshot {
  aim : Vec3
  last_hit : String
  x : Double
  y : Double
  z : Double
  hp : Double
  heat : Double
  time : Double
  shots : Int32
  weapon : String
  flags : Map[String, Bool]
  pending : Array[String]
  enemies : Array[EnemySnapshot]
  interactable : String?
} derive(@json.ToJson)

///|
pub fn Game::snapshot(self : Game) -> String {
  let p = self.player
  Snapshot::{
    aim: self.aim_point,
    last_hit: self.last_hit,
    x: p.x,
    y: p.y,
    z: p.z,
    hp: p.hp,
    heat: p.heat,
    time: self.time,
    shots: self.shots.length(),
    weapon: match p.weapon {
      Cannon => "cannon"
      Mortar => "mortar"
      Laser => "laser"
    },
    flags: self.progress.flags,
    pending: self.progress.pending.keys().to_array(),
    enemies: self.enemies
    .filter(fn(e) { e.position().distance(p.position()) < 80 })
    .map(fn(e) {
      {
        id: e.definition.id,
        hp: e.hp,
        x: e.x,
        y: e.y,
        z: e.z,
        vent: e.phase == Vent,
        parts: e.parts.map(fn(part) {
          (part.position.x, part.position.y, part.position.z, part.hp)
        }),
      }
    }),
    interactable: self.interactable(),
  }
  |> @json.ToJson::to_json
  |> Json::stringify
}
