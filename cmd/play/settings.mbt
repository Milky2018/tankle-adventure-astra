///|
#derive(@json.ToJson, @json.FromJson)
priv struct Settings {
  mut camera : CameraSettings
  bindings : Map[String, String]
  mut volume : Double
  mut music : Bool
  mut sfx : Bool
  mut quality : String
  mut third_person : Bool
}

///|
fn Settings::new() -> Settings {
  {
    camera: CameraSettings::new(),
    bindings: {
      "up": "KeyW",
      "down": "KeyS",
      "left": "KeyA",
      "right": "KeyD",
      "fire": "Mouse0",
      "magnet": "Mouse2",
      "boost": "ShiftLeft",
      "weapon": "KeyQ",
      "float": "KeyF",
      "interact": "KeyE",
      "camera": "KeyC",
      "map": "Tab",
      "pause": "Escape",
      "skip": "Space",
    },
    volume: 0.55,
    music: true,
    sfx: true,
    quality: "high",
    third_person: true,
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
fn Session::held(self : Session, action : String) -> Bool {
  self.settings.bindings.get(action) is Some(key) && self.keys.contains(key)
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
fn Session::bindings(self : Session) -> Unit {
  let mut markup = ""
  for
    (action, label) in [
      ("up", "Forward"),
      ("down", "Backward"),
      ("left", "Left"),
      ("right", "Right"),
      ("fire", "Fire"),
      ("magnet", "Magnet"),
      ("boost", "Overdrive"),
      ("weapon", "Weapon"),
      ("float", "Flotation"),
      ("interact", "Interact"),
      ("camera", "Camera"),
      ("map", "Map"),
      ("pause", "Pause"),
      ("skip", "Skip"),
    ] {
    markup += "<div class=\"binding-row\"><span>" +
      label +
      "</span><button id=\"binding-" +
      action +
      "\">" +
      self.settings.bindings.get(action).unwrap_or("Unbound") +
      "</button></div>"
  }
  for
    action in [
      "up", "left", "down", "right", "map", "interact", "weapon", "magnet", "float",
    ] {
    let key = self.settings.bindings.get(action).unwrap_or("—")
    let legend = match key {
      "Mouse0" => "LMB"
      "Mouse1" => "MMB"
      "Mouse2" => "RMB"
      _ => key.strip_prefix("Key").map(fn(s) { s.to_owned() }).unwrap_or(key)
    }
    @host.text(action + "-key", legend)
  }
  @host.html("bindings", markup)
  for action in self.settings.bindings.keys() {
    @host.on_click("binding-" + action, fn() {
      self.rebinding = Some(action)
      @host.text("binding-" + action, "Press a key…")
    })
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
  self.sound.start()
  if self.rebinding is Some(action) {
    if !repeat {
      self.settings.bindings[action] = key
      self.rebinding = None
      self.settings.save()
      self.bindings()
    }
    return
  }
  fn is_action(action : String) -> Bool {
    self.settings.bindings.get(action) == Some(key)
  }
  if self.menu_open {
    return
  }
  if self.game.ending_at is Some(_) {
    if (is_action("pause") || is_action("skip")) &&
      self.game.player.ending_time >= 0.75 {
      self.game.ending_at = Some(self.game.time - 26)
      self.game.player.ending_time = 26
    }
    return
  }
  if is_action("pause") && !repeat {
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
  if is_action("map") && !repeat {
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
    if is_action("skip") {
      self.game.respawn()
    }
    return
  }
  if is_action("interact") {
    if self.game.interact() {
      @host.write_save(self.game.save())
    }
  }
  if is_action("weapon") {
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
  if is_action("float") {
    if p.toggle_flotation(fn(x, z) {
        self.game.world.support(x, z, p.y, false) is Some(_)
      }) {
      self.sound.play("flotation")
    }
  }
  if is_action("camera") {
    self.view.third_person = !self.view.third_person
    self.settings.third_person = self.view.third_person
    self.settings.save()
    @host.set_value(
      "camera-view",
      if self.view.third_person {
        "third"
      } else {
        "overhead"
      },
    )
    @host.release_pointer()
  }
}

///|
fn Session::mount_settings(self : Session) -> Unit {
  self.bindings()
  self.mount_camera()
  @host.on_click("reset-camera", fn() {
    self.settings.camera = CameraSettings::new()
    self.mount_camera()
    self.settings.save()
  })
  self.view.renderer.set_pixel_ratio(
    if self.settings.quality == "low" {
      1
    } else {
      @host.pixel_ratio()
    },
  )
  self.view.renderer.shadow_map.enabled = self.settings.quality != "low"
  self.view.resize()
  @host.set_value("volume", "\{self.settings.volume}")
  @host.set_value("quality", self.settings.quality)
  @host.set_checked("music", self.settings.music)
  @host.set_checked("sfx", self.settings.sfx)
  @host.set_value(
    "camera-view",
    if self.view.third_person {
      "third"
    } else {
      "overhead"
    },
  )
  for id in ["volume", "music", "sfx", "quality", "camera-view"] {
    @host.on_change(id, fn() {
      self.settings.volume = @host.setting_number("volume")
      self.settings.music = @host.setting_checked("music")
      self.settings.sfx = @host.setting_checked("sfx")
      self.settings.quality = @host.setting_value("quality")
      self.view.third_person = @host.setting_value("camera-view") == "third"
      self.settings.third_person = self.view.third_person
      self.view.renderer.set_pixel_ratio(
        if self.settings.quality == "low" {
          1
        } else {
          @host.pixel_ratio()
        },
      )
      self.view.renderer.shadow_map.enabled = self.settings.quality != "low"
      self.view.resize()
      self.redraw = true
      self.settings.save()
    })
  }
  @host.on_click("reset-bindings", fn() {
    let defaults = Settings::new()
    self.settings.bindings.clear()
    for k, v in defaults.bindings {
      self.settings.bindings[k] = v
    }
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
    self.sound.start()
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
