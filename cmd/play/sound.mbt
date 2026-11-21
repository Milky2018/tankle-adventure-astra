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
  lift_heights : Map[String, Double]
  phases : Map[String, Bool]
}

///|
fn Sound::new() -> Sound {
  {
    audio: None,
    laser_at: -1,
    magnet_at: -1,
    engine_at: -1,
    lift_heights: {},
    phases: {},
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
  let pressed = game.press_cycle() >= 0.5
  if pressed && self.phases.get("west-die") == Some(false) {
    let distance = p.position().distance({ x: -44, y: -5, z: 86, })
    if distance < 49 {
      self.play("die-strike", gain=1 - distance / 49)
    }
  }
  self.phases["west-die"] = pressed
  for lift in game.world.lifts {
    let previous = self.lift_heights.get(lift.id)
    let travelling = previous is Some(h) && (lift.y - h).abs() > 0.0001
    let key = "hoist/" + lift.id
    if previous is Some(_) && self.phases.get(key) != Some(travelling) {
      let at = @sim.Vec3::{
        x: lift.rect.x + lift.rect.w / 2,
        y: lift.y,
        z: lift.rect.z + lift.rect.d / 2,
      }
      let gain = @sim.clamp(1 - at.distance(p.position()) / 25, 0, 1)
      if gain > 0 {
        self.play(if travelling { "hoist-drive" } else { "hoist-brake" }, gain~)
      }
    }
    self.lift_heights[lift.id] = lift.y
    self.phases[key] = travelling
  }
  for event in game.effects {
    let distance = match event {
      @sim.Fired(at, _)
      | @sim.Impact(at, _)
      | @sim.Chips(at, _)
      | @sim.Ricochet(at, _)
      | @sim.Armored(at) => at.distance(p.position())
      @sim.Killed(index) =>
        game.enemies[index].position().distance(p.position())
      _ => 0
    }
    let gain = 1.0 - @sim.clamp((distance - 5) / 54, 0, 1)
    if gain <= 0 {
      continue
    }
    self.play(
      match event {
        @sim.Fired(_, @sim.Mortar) => "mortar"
        @sim.Fired(_, _) => "shot"
        @sim.Impact(_, true) | @sim.Killed(_) => "explode"
        @sim.Impact(_, false) => "hit"
        @sim.Chips(_, _) => "chip"
        @sim.Armored(_) | @sim.Ricochet(_, _) => "armor"
        @sim.Hurt => "hurt"
        @sim.Acquired(_) => "unlock"
        @sim.Activated(_) => "lever"
        @sim.Repaired(_) => "repair"
      },
      gain~,
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
    let warn = e.phase.is_warning()
    if warn &&
      self.phases.get(e.definition.id) != Some(true) &&
      e.position().distance(p.position()) < 35 {
      self.play("warn", gain=0.45, pan=@sim.clamp((e.x - p.x) / 24, -1, 1))
    }
    self.phases[e.definition.id] = warn
  }
  let speed = Double::min(24, game.velocity.length())
  if moving && p.hp > 0 && game.time - self.engine_at > 0.17 - speed * 0.003 {
    self.engine_at = game.time
    if speed > 1 {
      self.play("tread", gain=Double::min(1, speed / 12))
    }
    @host.audio_voice(
      audio,
      false,
      52 + speed * 2.3,
      52 + speed * 2.3,
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
