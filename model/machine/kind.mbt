///|
#derive(Eq, FromJson(rename_cases="lowercase", cases(ScrapRam(rename="prototype"))), Debug)
pub(all) enum EnemyKind {
  Hunter
  Dredger
  Scout
  Turret
  Guard
  Skirmisher
  Sniper
  Artillery
  Miner
  Welder
  Repairer
  Reflector
  Interceptor
  Bastion
  Siege
  Prism
  Flanker
  ScrapRam
  Sorter
  Overseer
  Guardian
  Keeper
}

///|
#deprecated
pub extend EnemyKind with Eq::{equal, not_equal}

///|
pub fn EnemyKind::is_boss(self : EnemyKind) -> Bool {
  self is (ScrapRam | Sorter | Overseer | Guardian | Keeper)
}

///|
pub fn EnemyKind::boss_name(self : EnemyKind) -> String {
  match self {
    ScrapRam => "Scrap Ram"
    Sorter => "Sorter"
    Overseer => "Overseer"
    Guardian => "Optical Guardian"
    Keeper => "Final Keeper"
    _ => ""
  }
}
