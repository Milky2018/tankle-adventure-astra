///|
struct Sound {
  mut audio : @host.Audio?
  mut laser_at : Double
  mut magnet_at : Double
  mut engine_at : Double
  mut press_down : Bool?
  lifts : Map[String, (Double, Bool)]
  warning_enemies : Set[String]
}

///|
fn Sound::new() -> Sound {
  {
    audio: None,
    laser_at: -1,
    magnet_at: -1,
    engine_at: -1,
    press_down: None,
    lifts: {},
    warning_enemies: Set([]),
  }
}

///|
fn Sound::start(self : Sound) -> Unit {
  match self.audio {
    None => self.audio = Some(@host.create_audio())
    Some(audio) => @host.audio_resume(audio)
  }
}

///|
fn Sound::play(
  self : Sound,
  id : String,
  pan~ : Double = 0,
  gain~ : Double = 1,
) -> Unit {
  if self.audio is Some(audio) && sound_layers.get(id) is Some(layers) {
    for layer in layers {
      audio.play_voice(layer, gain~, pan~)
    }
  }
}

///|
fn Sound::update(
  self : Sound,
  game : @sim.Game,
  settings : Settings,
  paused : Bool,
  moving : Bool,
) -> Unit {
  guard self.audio is Some(audio) else { return }
  @host.audio_volume(audio, settings.volume)
  let p = game.player
  let track = match game.active_arena() {
    Some(arena) => arena.music
    None =>
      if p.abilities.circulation {
        "mz-dungeon1"
      } else if p.abilities.phoenix {
        "mz-scene7"
      } else if p.abilities.overdrive {
        "mz-scene5"
      } else {
        "mz-castle3"
      }
  }
  if music_tracks.get(track) is Some((url, gain)) {
    audio.update_music(
      url,
      volume=settings.volume * gain,
      paused=paused || !settings.music || p.hp <= 0,
      restart=game.effects.any(event => event is Respawned),
    )
  }
  if paused || !settings.sfx {
    return
  }
  self.update_machinery(game)
  self.play_events(game)
  if game.laser_path.any(fn(b) { b.live }) && game.time - self.laser_at > 0.13 {
    self.laser_at = game.time
    self.play("laser")
  }
  if game.magnet_end is Some(_) && game.time - self.magnet_at > 0.7 {
    self.magnet_at = game.time
    self.play(
      if game.magnet_lock is Some(_) {
        "magnet-pull"
      } else {
        "magnet"
      },
    )
  }
  for e in game.enemies {
    let warn = e.phase.is_warning()
    if warn &&
      !self.warning_enemies.contains(e.definition.id) &&
      e.position().distance(p.position()) < 35 {
      self.play("warn", gain=0.45, pan=@sim.clamp((e.x - p.x) / 24, -1, 1))
    }
    if warn {
      self.warning_enemies.add(e.definition.id)
    } else {
      self.warning_enemies.remove(e.definition.id)
    }
  }
  let speed = Double::min(24, game.velocity.length())
  if moving && p.hp > 0 && game.time - self.engine_at > 0.17 - speed * 0.003 {
    self.engine_at = game.time
    if speed > 1 && !p.afloat {
      self.play("tread", gain=Double::min(1, speed / 12))
    }
    let hz = 52.0 + speed * 2.3
    audio.play_voice({
      source: Tone(wave=Triangle, from_hz=hz, to_hz=hz),
      duration: 0.2,
      gain: 0.025,
      delay: 0,
      attack: 0.035,
      hold: 0.05,
      filter: Some((Lowpass, 900)),
    })
  }
}

///|
fn Sound::update_machinery(self : Sound, game : @sim.Game) -> Unit {
  let listener = game.player.position()
  let pressed = game.press_cycle() >= 0.5
  if pressed && self.press_down == Some(false) {
    let distance = listener.distance({ x: -44, y: -5, z: 86, })
    if distance < 49 {
      self.play("die-strike", gain=1 - distance / 49)
    }
  }
  self.press_down = Some(pressed)
  for lift in game.world.lifts {
    let (height, was_moving) = self.lifts
      .get(lift.id)
      .unwrap_or((lift.y, false))
    let travelling = (lift.y - height).abs() > 0.0001
    self.lifts[lift.id] = (lift.y, travelling)
    if travelling != was_moving {
      let at = @sim.Vec3::{
        x: lift.rect.x + lift.rect.w / 2,
        y: lift.y,
        z: lift.rect.z + lift.rect.d / 2,
      }
      let gain = @sim.clamp(1 - at.distance(listener) / 25, 0, 1)
      if gain > 0 {
        self.play(if travelling { "hoist-drive" } else { "hoist-brake" }, gain~)
      }
    }
  }
}

///|
fn Sound::play_events(self : Sound, game : @sim.Game) -> Unit {
  let p = game.player
  for event in game.effects {
    let (cue, origin) = match event {
      Fired(at, Cannon) if p.upgrades.cannon => {
        self.play("recoil-return")
        ("shot", Some(at))
      }
      Fired(at, Mortar) | EnemyFired(at, Mortar) => ("mortar", Some(at))
      Fired(at, _) | EnemyFired(at, _) => ("shot", Some(at))
      Killed(index) => ("explode", Some(game.enemies[index].position()))
      Impact(at, exploded) =>
        (if exploded { "explode" } else { "hit" }, Some(at))
      Chips(at, _) => ("chip", Some(at))
      Armored(at) | Ricochet(at, _) => ("armor", Some(at))
      Hurt => ("hurt", None)
      Acquired(_) => ("unlock", None)
      Activated(_) => ("lever", None)
      Repaired(_) => ("repair", None)
      ReinforcedStrike(_, _, _) | Respawned => continue
    }
    let gain = match origin {
      Some(at) => 1.0 - @sim.clamp((at.distance(p.position()) - 5) / 54, 0, 1)
      None => 1.0
    }
    if gain > 0 {
      self.play(cue, gain~)
    }
  }
}
