///|
fn Effects::mark_shell(self : Effects, at : @sim.Vec3) -> Unit {
  let center = at.add({ x: 0, y: 0.12, z: 0, })
  for i in 0..<12 {
    let a = i.to_double() * @math.PI / 6
    let b = a + @math.PI / 10
    let r = @sim.HostileBlastRadius
    self.strokes.stroke(
      center.add({ x: r * @math.sin(a), y: 0, z: r * @math.cos(a), }),
      center.add({ x: r * @math.sin(b), y: 0, z: r * @math.cos(b), }),
      0.10,
      0xff9057,
    )
  }
}

///|
fn Effects::enemy_signals(self : Effects, game : @sim.Game) -> Unit {
  for e in game.enemies {
    guard e.on_field() && e.phase is Warn(plan) else { continue }
    let pulse = 0.65 + 0.25 * @math.sin(e.warning_age * 18)
    match plan {
      Fire(Lob) => {
        for target in @sim.barrage_targets(e.position(), e.lock) {
          self.mark_shell(target.position)
        }
        if e.second_lock is Some(lock) {
          for target in @sim.barrage_targets(e.position(), lock) {
            self.mark_shell(target.position)
          }
        }
      }
      Fire(ChargeAttack) => {
        let forward = @sim.Vec3::{
          x: @math.sin(e.aim),
          y: 0,
          z: @math.cos(e.aim),
        }
        let side = @sim.Vec3::{ x: forward.z, y: 0, z: -forward.x, }
        for i in 0..<3 {
          let tip = e
            .position()
            .add(forward.scale(e.radius + 1.4 + i.to_double() * 1.7))
          if game.world.support(tip.x, tip.z, e.y, e.afloat) is Some(floor) {
            let tip = { ..tip, y: floor.height + 0.12, }
            let back = tip.sub(forward.scale(0.58))
            self.strokes.stroke(back.sub(side.scale(0.53)), tip, 0.10, 0xf4c273)
            self.strokes.stroke(tip, back.add(side.scale(0.53)), 0.10, 0xf4c273)
          }
        }
      }
      Volley(pattern, sources) => {
        for target in e.impact_pattern(pattern.kind) {
          self.mark_shell(target.position)
        }
        for source in sources {
          let pose = match source {
            Some(i) => e.parts[i].weapon_pose
            None => e.weapon_pose
          }
          if pose is Some(p) {
            self.light.puff(p.muzzle, 1.2, 1.2, pulse, 0xffc778)
          }
        }
      }
      _ =>
        if e.weapon_pose is Some(p) {
          if plan is Fire(RailAttack) {
            self.strokes.stroke(p.muzzle, e.lock, 0.035, 0xf65146)
          }
          let hue = if plan is Aid(_) { 0xa5dfb4 } else { 0xffc778 }
          self.light.puff(p.muzzle, 1.25, 1.25, pulse, hue)
        } else if plan is Fire(SuctionAttack) {
          let nose = e
            .position()
            .add({
              x: @math.sin(e.aim) * e.radius,
              y: 1.2,
              z: @math.cos(e.aim) * e.radius,
            })
          self.light.puff(nose, 1.2, 0.6, pulse, 0xb7d8ae)
        }
    }
  }
  for shot in game.shots {
    if shot.mortar && shot.owner is Some(_) && !shot.captured {
      self.mark_shell(shot.target)
    }
  }
  self.jet_time.value = Number(game.time)
  for beam in game.beams {
    self.weapon_stream(beam, game.time)
  }
  self.jets.finish()
}

///|
fn Effects::weapon_stream(
  self : Effects,
  beam : @sim.Beam,
  time : Double,
) -> Unit {
  guard beam.length > 0 else { return }
  let end = beam.origin.add(beam.direction.scale(beam.length))
  let side = @sim.Vec3::{ x: beam.direction.z, y: 0, z: -beam.direction.x, }
  match beam.kind {
    RailTracer => {
      self.strokes.stroke(beam.origin, end, 0.063, 0xffedbe)
      self.light.puff(beam.origin, 1.7, 1.7, 0.85, 0xffbe76)
    }
    RepairArc => {
      let mut prev = beam.origin
      for i in 1..<=6 {
        let t = i.to_double() / 6
        let flicker = @math.sin(time * 41 + i.to_double() * 7)
        let next = beam.origin
          .lerp(end, t)
          .add(side.scale(if i == 6 { 0 } else { 0.17 * flicker }))
        self.strokes.stroke(prev, next, 0.055, 0xb5e6c5)
        prev = next
      }
      self.light.puff(end, 0.8, 0.8, 0.8, 0xb5e6c5)
    }
    CuttingTorch | FurnaceSweep => {
      let wide = beam.kind is FurnaceSweep
      let pose = self.jets.pose
      pose.position.copy(vector(beam.origin)) |> ignore
      pose.look_at(vector(end))
      pose.scale.set(if wide { 1.2 } else { 1.0 }, 1, beam.length) |> ignore
      self.jets.put(if wide { 0xff6930 } else { 0xff942e })
      self.light.puff(beam.origin, 1.32, 1.32, 0.9, 0xffe8ad)
    }
  }
}

///|
/// A camera-facing slice of the burning jet. The local Z axis runs from the
/// nozzle to the first obstruction. The side profile widens and breaks up downstream.
fn heat_jet_material(time : @core.Uniform) -> @core.Material {
  let m = @core.ShaderMaterial::new()
  m.transparent = true
  m.depth_write = false
  m.side = @core.DoubleSide
  m.force_single_pass = true
  m.uniforms = Some({ "jetTime": time })
  m.vertex_shader = Some(
    (
      #|uniform float jetTime;
      #|varying vec2 flowUV;
      #|varying float travel;
      #|varying vec3 tint;
      #|void main() {
      #|  mat4 beam = modelViewMatrix * instanceMatrix;
      #|  float t = uv.x;
      #|  vec3 axis = beam[2].xyz;
      #|  vec3 p = beam[3].xyz + axis*t;
      #|  vec3 across = cross(normalize(axis), normalize(-p));
      #|  across = length(across) > 0.001 ? normalize(across) : vec3(1.,0.,0.);
      #|  travel = t * length(axis);
      #|  float phase = travel*1.8 - jetTime*16.;
      #|  float spread = (0.13 + 0.82*smoothstep(0.,0.68,t)) * length(beam[0].xyz);
      #|  spread *= 1. + t*(0.18*sin(phase) + 0.12*sin(phase*1.71));
      #|  float curl = t*(0.20*sin(phase*.64) + 0.08*sin(phase*1.12));
      #|  flowUV = vec2(t, uv.y*2.-1.);
      #|  tint = instanceColor;
      #|  gl_Position = projectionMatrix * vec4(p + across * spread*(flowUV.y+curl),1.);
      #|}
    ),
  )
  m.fragment_shader = Some(
    (
      #|uniform float jetTime;
      #|varying vec2 flowUV;
      #|varying float travel;
      #|varying vec3 tint;
      #|void main() {
      #|  float t = flowUV.x, y = flowUV.y;
      #|  float wave = travel*2.1 - jetTime*17.;
      #|  float eddy = sin(wave + y*6.0) * sin(wave*.57 - y*4.1);
      #|  float rim = abs(y) + (0.08+0.25*t)*eddy;
      #|  float gas = (1.-smoothstep(.35,1.0,rim))*(1.-smoothstep(.76,1.,t));
      #|  float core = (1.-smoothstep(.03,.52,rim))*(1.-.88*t);
      #|  vec3 color = mix(tint,vec3(1.,.94,.65),core);
      #|  color = mix(color,vec3(.72,.91,1.),(1.-smoothstep(.015,.14,t))*core);
      #|  gl_FragColor = vec4(color, gas*(.67+.28*core));
      #|  #include <colorspace_fragment>
      #|}
    ),
  )
  m
}
