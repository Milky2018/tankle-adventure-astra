///|
struct Voice {
  noise : Bool
  frequency : Double
  end : Double
  duration : Double
  gain : Double
  delay : Double
  attack : Double
  hold : Double
  wave : String
  cutoff : Double
  filter : String
}

///|
struct Sound {
  mut audio : @host.Audio?
  mut laser_at : Double
  mut magnet_at : Double
  mut engine_at : Double
  phases : Map[String, Bool]
}

///|
fn Sound::new() -> Sound {
  { audio: None, laser_at: -1, magnet_at: -1, engine_at: -1, phases: {}, }
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
    for v in layers {
      @host.audio_voice(
        audio,
        v.noise,
        v.frequency,
        v.end,
        v.duration,
        v.gain * gain,
        v.delay,
        v.attack,
        v.hold,
        v.wave,
        v.cutoff,
        v.filter,
        pan,
      )
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
  let track = match game.progress.combat_arena {
    Some("prototype") => "mz-battle1"
    Some("foundry") => "mz-battle3"
    Some("sorter") => "mz-battle4"
    Some("guardian") => "mz-battle6"
    Some("keeper") => "mz-battle8"
    _ =>
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
    @host.music(
      audio,
      url,
      settings.volume * gain,
      paused || !settings.music || p.hp <= 0,
    )
  }
  if paused || !settings.sfx {
    return
  }
  for event in game.effects {
    self.play(
      match event {
        @sim.Fired(_, @sim.Mortar) => "mortar"
        @sim.Fired(_, _) => "shot"
        @sim.Impact(_, true) | @sim.Killed(_) => "explode"
        @sim.Impact(_, false) => "hit"
        @sim.Armored(_) => "armor"
        @sim.Hurt => "hurt"
        @sim.Acquired(_) => "unlock"
        @sim.Activated(_) => "lever"
        @sim.Repaired(_) => "repair"
      },
    )
  }
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
    let warn = e.phase == @sim.Warn
    if warn &&
      self.phases.get(e.definition.id) != Some(true) &&
      e.position().distance(p.position()) < 35 {
      self.play("warn", gain=0.45, pan=@sim.clamp((e.x - p.x) / 24, -1, 1))
    }
    self.phases[e.definition.id] = warn
  }
  if moving && p.hp > 0 && game.time - self.engine_at > 0.12 {
    self.engine_at = game.time
    @host.audio_voice(
      audio,
      false,
      65 + p.speed * 12,
      65 + p.speed * 12,
      0.2,
      0.025,
      0,
      0.035,
      0.05,
      "triangle",
      900,
      "lowpass",
      0,
    )
  }
}
