///|
fn enemy(e : @catalog.Enemy) -> String {
  // A nullary enum constructor is also a complete MoonBit source expression.
  let kind = @debug.to_string(e.kind)
  let patrol = match e.patrol {
    Some(p) => "Some(" + rect_source(p.x, p.z, p.w, p.d) + ")"
    None => "None"
  }
  let activation = match e.activation {
    Some(p) =>
      "Some({ position: " +
      vec_source(p.x, p.y, p.z) +
      ", radius: " +
      source(p.radius) +
      " })"
    None => "None"
  }
  let swim = e.swim_patrol
    .unwrap_or([])
    .map(p => "{x:" + source(p.0) + ",z:" + source(p.1) + "}")
    .join(",")
  let parts = e.parts.unwrap_or([]).map(p => source(p)).join(",")
  let result =
    $|{
    $|  id: \{source(e.id)}, kind: \{kind}, spawn: \{vec_source(e.x,e.y,e.z)}, hp: \{source(e.hp)},
    $|  persistent: \{e.persistent.unwrap_or(false)}, emplacement: \{e.emplacement.unwrap_or(false)}, magnetic_shield: \{e.magnetic_shield.unwrap_or(false)}, coordinated: \{e.coordinated.unwrap_or(false)},
    $|  encounter: \{option_source(e.encounter)}, battle: \{option_source(e.battle)}, wave: \{source(e.wave.unwrap_or(0))}, startup: \{option_source(e.startup)}, opening_crossing: \{source(e.opening_crossing.unwrap_or(0))},
    $|  spotter_height: \{option_source(e.spotter_height)}, detection_range: \{option_source(e.detection_range)}, patrol: \{patrol},
    $|  activation: \{activation},
    $|  swim_patrol: [\{swim}], part_hp: [\{parts}], core: \{option_source(e.core)}, mirror: \{e.mirror.unwrap_or(false)}, reserve_for: \{option_source(e.reserve_for)}, reserve_at: \{source(e.reserve_at.unwrap_or(0))}
    $|}
  result
}

///|
fn optional_vec(v : (Double, Double, Double)?) -> String {
  match v {
    Some((x, y, z)) =>
      "Some({x:" + source(x) + ",y:" + source(y) + ",z:" + source(z) + "})"
    None => "None"
  }
}

///|
fn control(c : @catalog.Control) -> String {
  let actions = c.actions().map(a => @debug.to_string(a)).join(",")
  let effects = c.effects.unwrap_or([c.id]).map(s => source(s)).join(",")
  let ground = c.ground.unwrap_or(c.y - 1.3)
  let key = location_key(
    c.target_key,
    c.circuit_key,
    c.id,
    c.x,
    c.ground.unwrap_or(c.rest_y.unwrap_or(c.y) - 1.3),
    c.z,
  )
  "{id:\{source(c.id)},position:\{vec_source(c.x,c.y,c.z)},ground:\{source(ground)},actions:[\{actions}],requires:\{option_source(c.requires)},effects:[\{effects}],circuit_key:\{source(key)},mount:\{option_source(c.mount)},facing:\{optional_vec(c.facing)},optical_normal:\{optional_vec(c.normal)},top:\{c.surface==Some("top")},rotor:\{c.rotor.unwrap_or(false)},counterweight:\{c.counterweight.unwrap_or(false)},flash:0,pull:0}"
}

///|
fn hive(h : @catalog.Hive) -> String {
  "{id:\{source(h.id)},name:\{source(h.name)},position:\{vec_source(h.x,h.y,h.z)},heading:\{source(h.heading.unwrap_or(3.141592653589793))},requires:\{option_source(h.requires)}}"
}

///|
fn pickup(item : @catalog.Pickup) -> String {
  let p = item.placement
  "{id:\{source(p.id)},position:\{vec_source(p.x,p.y,p.z)},acquisition:\{@debug.to_string(item.acquisition)},requires:\{option_source(p.requires)},lift:\{option_source(p.lift)},hidden:\{p.hidden.unwrap_or(false)},preview:\{p.preview.unwrap_or(false)}}"
}

///|
fn mirror(m : @catalog.Mirror) -> String {
  let (x, y, z) = m.n
  "{id:\{source(m.id)},position:\{vec_source(m.x,m.y,m.z)},base_normal:{x:\{source(x)},y:\{source(y)},z:\{source(z)}},size:\{source(m.size)},turnable:\{m.turnable.unwrap_or(false)},flash:0,angle:0}"
}

///|
fn circuit(c : @catalog.Circuit) -> String raise {
  let branches = c.branches
    .map(b => {
      // Editable route drafts can carry only points; simulation consumes resolved branches.
      guard b.target is Some(target) && b.duration is Some(duration) else {
        raise Failure(
          "Circuit " +
          c.id +
          " branch " +
          b.key +
          " needs a target and duration for gameplay",
        )
      }
      "{key:\{source(b.key)},target:\{source(target)},duration:\{source(duration)}}"
    })
    .join(",")
  "{id:\{source(c.id)},duration:\{source(c.duration)},branches:[\{branches}]}"
}
