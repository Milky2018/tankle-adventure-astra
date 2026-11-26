///|
#derive(ToJson(rename_cases="lowercase"), FromJson(rename_cases="lowercase"))
priv enum GraphicsQuality {
  High
  Low
}

///|
#derive(@json.ToJson, @json.FromJson)
priv struct Settings {
  mut camera : CameraSettings
  mut bindings : Bindings
  mut volume : Double
  mut music : Bool
  mut sfx : Bool
  mut quality : GraphicsQuality
}

///|
fn Settings::new() -> Settings {
  {
    camera: CameraSettings::new(),
    bindings: Bindings::defaults(),
    volume: 0.55,
    music: true,
    sfx: true,
    quality: High,
  }
}

///|
fn Settings::load() -> Settings {
  @json.from_json(@json.parse(@host.read_preferences())) catch {
    _ => Settings::new()
  }
}

///|
fn Settings::save(self : Settings) -> Unit {
  @host.write_preferences(@json.ToJson::to_json(self).stringify())
}

///|
fn Session::held(self : Session, action : Action) -> Bool {
  self.keys.contains(self.settings.bindings.0[action])
}

///|
fn Session::pause(self : Session, paused : Bool) -> Unit {
  self.paused = paused
  self.keys.clear()
  self.looking = false
  @host.hidden("settings", !paused)
  if paused {
    @host.release_pointer()
  }
}

///|
fn Settings::show_binding(
  self : Settings,
  id : String,
  action : Action,
) -> Unit {
  let key = self.bindings.0[action]
  let button = match key {
    "Mouse0" => Some("Left mouse button")
    "Mouse1" => Some("Middle mouse button")
    "Mouse2" => Some("Right mouse button")
    _ => None
  }
  if button is Some(label) {
    @host.text(id, "")
    let icon = append_element(@host.element(id), "span")
    icon.set_attribute("class", "mouse-key")
    icon.set_attribute("data-button", key)
    icon.set_attribute("role", "img")
    icon.set_attribute("aria-label", label)
  } else {
    @host.text(
      id,
      key.strip_prefix("Key").map(fn(s) { s.to_owned() }).unwrap_or(key),
    )
  }
}

///|
fn Session::bindings(self : Session) -> Unit {
  for (action, id, _) in controls {
    @host.text("binding-" + id, self.settings.bindings.0[action])
    match action {
      Boost | Pause | Skip => ()
      _ => self.settings.show_binding(id + "-key", action)
    }
  }
  if self.hud.acquired_action is Some(action) {
    self.settings.show_binding("acquired-key", action)
  }
}

///|
fn Session::input(
  self : Session,
  key : String,
  down : Bool,
  repeat : Bool,
) -> Unit {
  if !down {
    self.keys.remove(key) |> ignore
    return
  }
  self.sound.start(self.settings.volume)
  if self.rebinding is Some(action) {
    if !repeat {
      self.settings.bindings.0[action] = key
      self.rebinding = None
      self.settings.save()
      self.bindings()
    }
    return
  }
  fn is_action(action : Action) -> Bool {
    self.settings.bindings.0[action] == key
  }
  if self.menu_open {
    return
  }
  if self.game.ending_at is Some(_) {
    if (is_action(Pause) || is_action(Skip)) &&
      self.game.player.ending_time >= 0.75 {
      self.game.ending_at = Some(self.game.time - 26)
      self.game.player.ending_time = 26
    }
    return
  }
  if is_action(Pause) && !repeat {
    if self.map_open {
      self.map_open = false
      @host.hidden("region", true)
    } else {
      self.pause(!self.paused)
    }
    return
  }
  if self.paused || self.menu_open {
    return
  }
  if is_action(MapScreen) && !repeat {
    self.map_open = !self.map_open
    self.hud.layer = None
    @host.hidden("region", !self.map_open)
    self.keys.clear()
    @host.release_pointer()
    return
  }
  if self.map_open {
    return
  }
  self.keys.add(key) |> ignore
  if repeat {
    return
  }
  let p = self.game.player
  if self.game.death_at is Some(_) {
    if is_action(Skip) {
      self.game.respawn()
    }
    return
  }
  if is_action(Interact) {
    if self.game.interact() {
      @host.write_save(self.game.save())
    }
  }
  if is_action(Weapon) {
    p.weapon = match p.weapon {
      @sim.Cannon =>
        if p.abilities.mortar {
          @sim.Mortar
        } else if p.abilities.laser {
          @sim.Laser
        } else {
          @sim.Cannon
        }
      @sim.Mortar => if p.abilities.laser { @sim.Laser } else { @sim.Cannon }
      @sim.Laser => @sim.Cannon
    }
  }
  if is_action(Flotation) {
    if p.toggle_flotation(fn(x, z) {
        self.game.world.support(x, z, p.y, false) is Some(_)
      }) &&
      self.settings.sfx {
      self.sound.play("flotation")
    }
  }
}

///|
fn Session::apply_quality(self : Session) -> Unit {
  let shadows = self.settings.quality is High
  self.view.renderer.set_pixel_ratio(
    if shadows {
      @host.pixel_ratio()
    } else {
      1
    },
  )
  self.view.renderer.shadow_map.enabled = shadows
  self.view.resize()
  self.redraw = true
}

///|
fn Session::mount_settings(self : Session) -> Unit {
  self.bindings()
  for (action, id, _) in controls {
    @host.on_click("binding-" + id, fn() {
      self.rebinding = Some(action)
      @host.text("binding-" + id, "Press a key…")
    })
  }
  self.mount_camera()
  @host.on_click("reset-camera", fn() {
    self.settings.camera = CameraSettings::new()
    self.show_camera()
    self.settings.save()
  })
  self.apply_quality()
  @host.set_value("volume", "\{self.settings.volume}")
  @host.set_value(
    "quality",
    if self.settings.quality is High {
      "high"
    } else {
      "low"
    },
  )
  @host.set_checked("music", self.settings.music)
  @host.set_checked("sfx", self.settings.sfx)
  for id in ["volume", "music", "sfx"] {
    @host.on_change(id, fn() {
      self.settings.volume = @host.setting_number("volume")
      self.settings.music = @host.setting_checked("music")
      self.settings.sfx = @host.setting_checked("sfx")
      self.settings.save()
    })
  }
  @host.on_change("quality", fn() {
    self.settings.quality = if @host.setting_value("quality") == "low" {
      Low
    } else {
      High
    }
    self.apply_quality()
    self.settings.save()
  })
  @host.on_click("reset-bindings", fn() {
    self.settings.bindings = Bindings::defaults()
    self.rebinding = None
    self.settings.save()
    self.bindings()
  })
  @host.on_click("settings-button", fn() { self.pause(true) })
  @host.on_click("resume", fn() { self.pause(false) })
  @host.on_click("ending-continue", fn() {
    self.game.continue_after_ending()
    self.view.update_ending(self.game)
    @host.hidden("ending", true)
  })
  @host.on_click("ending-menu", fn() {
    self.game.continue_after_ending()
    self.view.update_ending(self.game)
    @host.hidden("ending", true)
    self.show_journey()
  })
  @host.on_click("fullscreen", fn() { @host.fullscreen() })
  @host.on_click("close-map", fn() {
    self.map_open = false
    @host.hidden("region", true)
  })
  @host.on_click("journey-button", fn() {
    self.pause(false)
    self.keys.clear()
    self.show_journey()
    @host.release_pointer()
  })
  fn play() {
    self.has_journey = true
    self.menu_open = false
    @host.close_dialog("journey")
    self.sound.start(self.settings.volume)
  }
  @host.on_click("journey-continue", play)
  @host.on_click("new-game", fn() { @host.remove_save() })
  @host.on_click("journey-start", fn() {
    if self.has_journey {
      @host.remove_save()
    } else {
      @host.write_save(self.game.save())
      play()
    }
  })
}

///|
fn Session::show_journey(self : Session) -> Unit {
  self.menu_open = true
  @host.hidden("journey-continue", !self.has_journey)
  @host.class_toggle("journey-start", "journey-primary", !self.has_journey)
  @host.open_dialog(
    "journey",
    if self.has_journey {
      "journey-continue"
    } else {
      "journey-start"
    },
  )
}
