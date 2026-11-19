///|
struct Session {
  settings : Settings
  sound : Sound
  mut rebinding : String?
  mut menu_open : Bool
  mut restart_armed : Bool
  hud : Hud
  game : @sim.Game
  queries : @sim.Queries
  aim_queries : @sim.Queries
  mut pointer : @sim.Vec2
  mut firing : Bool
  view : @view.View
  keys : Set[String]
  mut time : Double
  mut previous : Double
  mut paused : Bool
  mut looking : Bool
  mut map_open : Bool
  mut redraw : Bool
  mut rendered : Bool
  mut saved_at : Double
}

///|
fn Session::advance(self : Session, milliseconds : Double) -> Unit {
  let dt = Double::min(
    0.05,
    Double::max(0, (milliseconds - self.previous) / 1000),
  )
  self.previous = milliseconds
  if !self.paused && !self.map_open && !self.menu_open {
    self.time += dt
    self.game.time = self.time
    let p = self.game.player
    self.game.advance_world(dt)
    self.view.update_machinery(self.game, dt)
    let horizontal = (if self.held("right") { 1.0 } else { 0.0 }) -
      (if self.held("left") { 1.0 } else { 0.0 })
    let vertical = (if self.held("down") { 1.0 } else { 0.0 }) -
      (if self.held("up") { 1.0 } else { 0.0 })
    let magnitude = (horizontal * horizontal + vertical * vertical).sqrt()
    let movement = if magnitude > 0 {
      if self.view.third_person {
        @sim.Vec2::{
          x: (
            -@math.cos(self.view.yaw) * horizontal -
            @math.sin(self.view.yaw) * vertical
          ) /
          magnitude,
          z: (
            @math.sin(self.view.yaw) * horizontal -
            @math.cos(self.view.yaw) * vertical
          ) /
          magnitude,
        }
      } else {
        @sim.screen_movement(horizontal, vertical)
      }
    } else {
      @sim.Vec2::{ x: 0, z: 0, }
    }
    self.game.dock(self.held("interact"), magnitude > 0, dt)
    self.game.move_player(movement, self.held("boost"), dt)
    self.view.position_player(p, self.game.world, dt)
    let aim = self.view.aim(self.game, self.aim_queries, self.pointer)
    self.game.aim_point = aim
    p.aim = @math.atan2(aim.x - p.x, aim.z - p.z)
    self.view.aim_player(aim, p.weapon)
    self.firing = self.held("fire")
    if self.firing && self.game.ending_at is None {
      self.game.fire(self.queries, self.view.weapon_origin(), aim) |> ignore
    }
    if self.game.ending_at is None && p.hp > 0 {
      self.game.update_enemies(self.queries, dt)
    }
    if self.game.ending_at is None && p.hp > 0 {
      self.game.update_shots(self.queries, dt)
      self.game.update_mines(dt)
    }
    if self.game.ending_at is None {
      self.game.laser(
        self.queries,
        self.view.weapon_origin(),
        aim,
        self.firing,
        dt,
      )
      self.game.magnet(
        self.queries,
        self.view.weapon_origin(),
        aim,
        self.held("magnet"),
        dt,
      )
    }
    self.view.update_player(self.game, dt)
    self.view.update_belts(self.game, dt)
    self.view.update_hives(self.game, dt)
    self.view.update_renewal(self.game, dt)
    self.view.update_enemies(self.game, dt)
    self.view.update_projectiles(self.game)
    self.view.update_feeds(self.game)
    self.view.update_effects(self.game, aim, self.queries, dt)
    self.view.update_ending(self.game)
    if p.ending_time >= 26 {
      @host.hidden("ending", false)
      self.keys.clear()
      @host.release_pointer()
    }
    self.sound.update(self.game, self.settings, false, magnitude > 0)
    self.hud.acquisitions(self.game, self.settings)
    self.game.effects.clear()
    self.hud.update(self.game, self.view, self.map_open)
    @host.style(
      "reticle",
      "left",
      if self.view.third_person {
        "50%"
      } else {
        "\{(self.pointer.x+1)*50}%"
      },
    )
    @host.style(
      "reticle",
      "top",
      if self.view.third_person {
        "50%"
      } else {
        "\{(1.0-self.pointer.z)*50}%"
      },
    )
    if self.time - self.saved_at >= 1 {
      self.saved_at = self.time
      @host.write_save(self.game.save())
    }
  }
  if self.paused || self.map_open || self.menu_open {
    self.sound.update(self.game, self.settings, true, false)
  }
  if self.map_open {
    self.hud.update(self.game, self.view, true)
  }
  if (!self.paused && !self.map_open && !self.menu_open) ||
    !self.rendered ||
    self.redraw {
    self.view.draw(self.game.player, self.game.world)
    self.redraw = false
  }
  if !self.rendered {
    self.rendered = true
    @host.ready()
  }
  @host.frame(fn(time) { self.advance(time) })
}

///|
pub fn start() -> Unit {
  @host.load_scene(
    "/generated/art/folded-scene.json.gz",
    fn(scene) {
      let game = if @host.query("chapter") == "circulation" {
        @sim.Game::new(start={ x: 290, y: -24, z: 120, })
      } else {
        let game = @sim.Game::new()
        game.restore(@host.read_save()) |> ignore
        game
      }
      let settings = Settings::load()
      let view = @view.View::new(scene, game)
      view.third_person = match @host.query("view") {
        "overhead" => false
        "third" => true
        _ => settings.third_person
      }
      let session = Session::{
        game,
        settings,
        sound: Sound::new(),
        rebinding: None,
        menu_open: !@host.direct_entry(),
        restart_armed: false,
        hud: Hud::new(),
        queries: view.queries(game),
        aim_queries: view.queries(game, aiming=true),
        view,
        pointer: { x: 0, z: 0, },
        firing: false,
        keys: Set([]),
        time: 0,
        previous: 0,
        paused: false,
        looking: false,
        map_open: false,
        saved_at: 0,
        rendered: false,
        redraw: true,
      }
      @host.on_key(fn(key, down, repeat) { session.input(key, down, repeat) })
      @host.on_button(fn(button, down) {
        session.input("Mouse\{button}", down, false)
        if button == 1 {
          session.looking = down
        }
        if down &&
          session.view.third_person &&
          !session.paused &&
          !session.map_open &&
          !session.menu_open {
          @host.capture_pointer()
        }
      })
      @host.on_pointer(fn(dx, dy, x, y) {
        session.pointer = { x, z: y, }
        if (session.looking || @host.pointer_locked()) &&
          session.view.third_person &&
          !session.paused &&
          !session.map_open {
          session.view.turn(dx, dy)
        }
      })
      @host.on_blur(fn() {
        session.keys.clear()
        session.looking = false
        session.firing = false
      })
      @host.on_resize(fn() {
        session.view.resize()
        session.redraw = true
      })
      view.barrel.matrix_auto_update = true
      view.position_player(game.player, game.world, 0)
      session.mount_settings()
      @host.hidden("journey", !session.menu_open)
      @host.inspect_projection(fn(x, y, z) {
        let p = view.project({ x, y, z, })
        [p.x, p.z]
      })
      @host.diagnostics(fn() { game.snapshot() })
      @host.frame(fn(time) { session.advance(time) })
    },
    fn(error) { @host.text("startup-message", error) },
  )
}

///|
fn main {
  ()
}
