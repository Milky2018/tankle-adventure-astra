///|
priv struct Renewal {
  cart : @core.Object3D?
  eye : @core.Object3D?
  conduits : Array[@core.Object3D?]
  scraps : Array[Array[@core.Object3D?]]
  jaws : Array[@core.Object3D?]
  wheels : Array[@core.Object3D?]
  phases : Array[Double]
}

///|
fn Renewal::new(nodes : Map[String, @core.Object3D]) -> Renewal {
  fn get(path : String) -> @core.Object3D? {
    let node = nodes.get(path)
    if node is Some(node) {
      node.matrix_auto_update = true
    }
    node
  }
  {
    cart: get("finale/cart"),
    eye: get("finale/eye"),
    conduits: Array::makei(16, fn(i) { get("finale/conduits/\{i}/mesh") }),
    scraps: Array::makei(2, fn(i) {
      Array::makei(3, fn(j) { get("finale/feeds/\{i}/scraps/\{j}/root") })
    }),
    jaws: Array::makei(2, fn(i) { get("finale/feeds/\{i}/jaw") }),
    wheels: Array::makei(2, fn(i) { get("finale/feeds/\{i}/wheel") }),
    phases: [0, 0],
  }
}

///|
fn View::update_renewal(self : View, game : @sim.Game, dt : Double) -> Unit {
  let v = self.renewal
  let seconds = if game.player.ending_time > 0 {
    game.player.ending_time
  } else if game.progress.has("endingSeen") {
    26.0
  } else {
    0.0
  }
  let power = smooth(2, 8, seconds)
  let wake = smooth(21, 23, seconds)
  let travel = smooth(23, 25, seconds)
  if v.cart is Some(cart) {
    cart.position.set_z(79 + travel * 1.6) |> ignore
    cart.update_matrix_world(force=true)
  }
  if v.eye is Some(eye) && eye.kind is Mesh(mesh) {
    for m in mesh_materials(mesh.material) {
      m.color
      .unwrap()
      .set_rgb(0.12 + wake * 0.68, 0.17 + wake * 0.58, 0.14 + wake * 0.3)
      |> ignore
    }
  }
  for i, node in v.conduits {
    if node is Some(node) {
      let step = (i % 8).to_double()
      color(
        node,
        if power > step / 9 {
          if (game.time * 3 - step * 0.3) % 2 < 0.5 {
            0xffdf9a
          } else {
            0xc78f54
          }
        } else {
          0x685947
        },
      )
    }
  }
  if game.enemies.iter().find_first(fn(e) { e.definition.id == "keeper" })
    is Some(keeper) {
    for i in 0..<2 {
      let live = keeper.hp > 0 && keeper.parts[i].hp > 0
      if live {
        v.phases[i] += dt * 3.2
      }
      for j, node in v.scraps[i] {
        if node is Some(node) {
          node.position.set(
            if i == 0 {
              -19
            } else {
              19
            },
            -56,
            49 - (j.to_double() * 8 + v.phases[i]) % 26,
          )
          |> ignore
          node.update_matrix_world(force=true)
        }
      }
      if v.jaws[i] is Some(jaw) {
        jaw.position.set_y(
          damp(
            jaw.position.y,
            if live {
              -53.8 + @math.sin(v.phases[i] * 0.8) * 0.6
            } else {
              -55.25
            },
            6,
            dt,
          ),
        )
        |> ignore
        jaw.update_matrix_world(force=true)
      }
      if v.wheels[i] is Some(wheel) {
        wheel.rotation.set(@math.PI / 2, 0, v.phases[i]) |> ignore
        wheel.update_matrix_world(force=true)
      }
    }
  }
}
