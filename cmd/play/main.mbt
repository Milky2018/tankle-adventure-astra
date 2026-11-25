///|
struct Session {
  settings : Settings
  sound : Sound
  mut rebinding : String?
  mut menu_open : Bool
  mut has_journey : Bool
  hud : Hud
  game : @sim.Game
  queries : @sim.Queries
  view : @view.View
  keys : Set[String]
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
    self.game.time += dt
    let p = self.game.player
    self.game.advance_world(dt)
    self.view.update_machinery(self.game, dt)
    let horizontal = (if self.held("right") { 1.0 } else { 0.0 }) -
      (if self.held("left") { 1.0 } else { 0.0 })
    let vertical = (if self.held("down") { 1.0 } else { 0.0 }) -
      (if self.held("up") { 1.0 } else { 0.0 })
    let magnitude = (horizontal * horizontal + vertical * vertical).sqrt()
    let movement = if magnitude > 0 {
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
      @sim.Vec2::{ x: 0, z: 0, }
    }
    self.game.dock(self.held("interact"), magnitude > 0, dt)
    self.game.move_player(movement, self.held("boost"), dt)
    self.view.position_player(p, self.game.world, dt)
    let aim = if p.hp > 0 && self.game.death_at is None {
      let target = self.view.aim(self.game, self.queries)
      self.game.aim_point = target
      p.aim = @math.atan2(target.x - p.x, target.z - p.z)
      self.view.aim_player(target, p.weapon)
      target
    } else {
      self.game.aim_point
    }
    self.game.advance_combat(
      self.queries,
      self.view.weapon_origin(),
      aim,
      firing=self.held("fire"),
      magnet=self.held("magnet"),
      dt~,
    )
    self.view.present(self.game, self.queries, aim, dt)
    if p.ending_time >= 26 {
      @host.hidden("ending", false)
      self.keys.clear()
      @host.release_pointer()
    }
    self.sound.update(self.game, self.settings, false, magnitude > 0)
    self.hud.acquisitions(self.game, self.settings)
    self.game.effects.clear()
    self.hud.update(self.game, self.view, self.map_open)
    if self.game.time - self.saved_at >= 1 {
      self.saved_at = self.game.time
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
async fn main {
  try {
    let scene = @host.load_scene("/generated/art/folded-scene.json.gz")
    let direct = @host.direct_entry()
    let (game, restored) = if @host.query("chapter") == "circulation" {
      (@sim.Game::new(start={ x: 290, y: -24, z: 120, }), false)
    } else {
      let game = @sim.Game::new()
      (game, game.restore(@host.read_save()))
    }
    if direct && !restored {
      @host.write_save(game.save())
    }
    let settings = Settings::load()
    let view = @view.View::new(scene, game)
    let session = Session::{
      game,
      settings,
      sound: Sound::new(),
      rebinding: None,
      menu_open: !direct,
      has_journey: restored || direct,
      hud: Hud::new(),
      queries: view.queries(game),
      view,
      keys: Set([]),
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
      if down && !session.paused && !session.map_open && !session.menu_open {
        @host.capture_pointer()
      }
    })
    @host.on_pointer(fn(dx, dy, _, _) {
      if (session.looking || @host.pointer_locked()) &&
        !session.paused &&
        !session.map_open {
        session.view.turn(dx, dy)
      }
    })
    @host.on_blur(fn() {
      session.keys.clear()
      session.looking = false
    })
    @host.on_resize(fn() {
      session.view.resize()
      session.redraw = true
    })
    view.barrel.matrix_auto_update = true
    view.position_player(game.player, game.world, 0)
    session.mount_settings()
    if session.menu_open {
      session.show_journey()
    }
    @host.inspect_projection(fn(x, y, z) {
      let p = view.project({ x, y, z, })
      [p.x, p.z]
    })
    @host.diagnostics(() => game.snapshot(), () => view.yaw)
    @host.frame(fn(time) { session.advance(time) })
    @host.mark("view-created")
  } catch {
    err => @host.text("startup-message", err.to_string())
  }
}
