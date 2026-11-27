///|
priv struct MirrorRefresh {
  mirror : @sim.Mirror
  target : @core.RenderTarget
  half_height : Double
  mut seen : Bool
  mut age : Int32
  mut refresh : Bool
}

///|
/// Use the last visibility query to share secondary views. The pane under a
/// laser sight refreshes immediately, including a rotating carriage.
fn View::schedule_mirrors(
  self : View,
  camera : @core.Object3D,
  laser : Bool,
) -> Unit {
  let eye = point(camera.position)
  let ray = point(camera.get_world_direction(@m3.Vector3::new(0, 0, 0)))
  let mut focused : MirrorRefresh? = None
  let mut nearest = 1.0 / 0.0
  let mut next : MirrorRefresh? = None
  let mut priority = 0.0
  for m in self.mirrors {
    m.refresh = false
    if !m.seen {
      m.age = 0
      continue
    }
    m.seen = false
    m.age += 1
    let delta = m.mirror.position.sub(eye)
    let normal = m.mirror.normal()
    let angle = ray.dot(normal)
    if laser && angle.abs() > 0.0001 {
      let distance = delta.dot(normal) / angle
      let hit = ray.scale(distance).sub(delta)
      if distance > 0 &&
        distance < nearest &&
        hit.y.abs() <= m.half_height &&
        (hit.x * normal.z - hit.z * normal.x).abs() <= m.mirror.size / 2 {
        focused = Some(m)
        nearest = distance
      }
    }
    // Larger apparent panes warrant more frequent updates, while age keeps
    // small distant panes from starving. Cached images stay world-projected.
    let size = m.mirror.size / delta.length().max(1)
    let weight = @sim.clamp(size, 0.07, 1)
    let score = m.age.to_double() * weight
    if score > priority {
      next = Some(m)
      priority = score
    }
  }
  if focused is Some(m) {
    m.refresh = true
  }
  if next is Some(m) && (focused is None || m.age >= 8) {
    m.refresh = true
  }
}

///|
/// Both sides of the glass can turn a beam. Keep its reflecting plane coincident
/// with the surface used by the raycaster, including on the indexed carriage.
fn View::install_mirrors(self : View, mirrors : Array[@sim.Mirror]) -> Unit {
  let gl = self.renderer.get_context()
  let pick_material = @core.MeshBasicMaterial::new()
  pick_material.side = @core.DoubleSide
  pick_material.visible = false
  for mirror in mirrors {
    let key = "world/views/mirrors/\{mirror.id}/mesh"
    guard self.nodes.get(key) is Some(surface) && surface.kind is Mesh(mesh) else {
      continue
    }
    // The asset stretches the pane and its carrier together. The catalog width
    // is measured across the installed glass, before converting to local units.
    let width = mirror.size / surface.scale.x
    let glass = @geometries.PlaneGeometry::new(width~, height=3)
    let face = @objects.Reflector::new(
      geometry=glass,
      color=0xbcbcbc,
      texture_width=768,
      texture_height=512,
      multisample=0,
    )
    face.name = surface.name
    // The authored node stays in the room visibility bins and holds the pick surface.
    face.layers = surface.layers
    if face.kind is Mesh({ material: Single(material), .. }) {
      material.side = @core.DoubleSide
    }
    mesh.geometry = glass
    mesh.material = Single(pick_material)
    surface.add(face) |> ignore
    // Test the glass against the opaque scene depth. Read only completed GPU
    // queries so a mirror behind a wall costs a surface draw, not a scene pass.
    face.render_order = 1
    let query = gl.create_query()
    let refresh : MirrorRefresh = {
      mirror,
      target: @objects.Reflector::get_render_target(face),
      half_height: 1.5 *
      surface.get_world_scale(@m3.Vector3::new(0, 0, 0)).y.abs(),
      seen: false,
      age: 0,
      refresh: false,
    }
    self.mirrors.push(refresh)
    let mut pending = false
    let mut measuring = false
    let mut visible = false
    let texture = @objects.Reflector::of(face).unwrap().texture_matrix
    let reflect = face.on_before_render
    face.on_before_render = fn(
      renderer,
      scene,
      camera,
      geometry,
      material,
      group,
    ) {
      if camera.id != self.camera().id {
        return
      }
      if pending &&
        gl.get_query_parameter(query, @webgl.GL_QUERY_RESULT_AVAILABLE).cast() {
        visible = gl.get_query_parameter(query, @webgl.GL_QUERY_RESULT).cast()
        pending = false
      }
      refresh.seen = visible
      if visible && refresh.refresh {
        refresh.age = 0
        let behind = point(camera.position)
          .sub(mirror.position)
          .dot(mirror.normal()) <
          0
        face.rotation.set(0, if behind { @math.PI } else { 0 }, 0) |> ignore
        face.update_matrix_world(force=true)
        // A room outside the driver's frustum can still be seen in the glass.
        let main_buffer = self.room_visibility.pass.val
        let primary = self.room_visibility.hidden
        self.room_visibility.hidden = []
        for node in primary {
          node.layers.set(0)
        }
        let aperture = self.cutaway.enabled.value
        self.cutaway.enabled.value = Number(0)
        let hooks = self.scene.as_scene()
        let before = hooks.on_before_render
        hooks.on_before_render = fn(r, root, reflected, target) {
          before(r, root, reflected, target)
          crop_to_glass(reflected, texture, width, 3)
          self.room_visibility.apply(reflected, self.cutaway, reflected=true)
        }
        let matrices = self.scene.matrix_world_auto_update
        self.scene.matrix_world_auto_update = false
        reflect(renderer, scene, camera, geometry, material, group)
        self.scene.matrix_world_auto_update = matrices
        hooks.on_before_render = before
        self.cutaway.enabled.value = aperture
        self.room_visibility.restore()
        self.room_visibility.pass.val = main_buffer
        self.room_visibility.hidden = primary
        for node in primary {
          node.layers.set(ShadowOnlyLayer)
        }
      }
      if !pending {
        gl.begin_query(@webgl.GL_ANY_SAMPLES_PASSED, query)
        measuring = true
      }
    }
    face.on_after_render = fn(_, _, camera, _, _, _) {
      if camera.id == self.camera().id && measuring {
        gl.end_query(@webgl.GL_ANY_SAMPLES_PASSED)
        measuring = false
        pending = true
      }
    }
  }
}

///|
/// Screen and linear reflection targets use different material programs.
pub fn View::prepare(self : View, ready : () -> Unit) -> Unit {
  fn screen() {
    self.renderer.compile_async(self.scene, self.third, _ => ready())
  }
  if self.mirrors.get(0) is Some(first) {
    let previous = self.renderer.get_render_target()
    self.renderer.set_render_target(Some(first.target))
    self.renderer.compile_async(self.scene, self.third, _ => {
      self.renderer.set_render_target(previous)
      screen()
    })
  } else {
    screen()
  }
}

///|
/// The reflector has set up its virtual eye and oblique near plane by the time
/// the scene starts drawing. Keep that plane, zoom onto the pane, and apply
/// the same UV remap to the glass so the reflected target stays on the ray.
fn crop_to_glass(
  camera : @core.Object3D,
  texture : @m3.Matrix4,
  width : Double,
  height : Double,
) -> Unit {
  let mut left = 1.0
  let mut bottom = 1.0
  let mut right = 0.0
  let mut top = 0.0
  for x in [-width / 2, width / 2] {
    for y in [-height / 2, height / 2] {
      let p = @m3.Vector4::new(x, y, 0, 1).apply_matrix4(texture)
      guard p.w > 0.0001 else { return }
      left = left.min(p.x / p.w)
      right = right.max(p.x / p.w)
      bottom = bottom.min(p.y / p.w)
      top = top.max(p.y / p.w)
    }
  }
  left = (left - 0.002).max(0)
  right = (right + 0.002).min(1)
  bottom = (bottom - 0.002).max(0)
  top = (top + 0.002).min(1)
  guard right > left && top > bottom else { return }
  let sx = 1.0 / (right - left)
  let sy = 1.0 / (top - bottom)
  let crop = @m3.Matrix4::new().make_scale(sx, sy, 1)
  crop.elements[12] = (1 - left - right) * sx
  crop.elements[13] = (1 - bottom - top) * sy
  let projection = camera.projection_matrix().premultiply(crop)
  camera.projection_matrix_inverse().copy(projection).invert() |> ignore
  crop.elements[12] = -left * sx
  crop.elements[13] = -bottom * sy
  texture.premultiply(crop) |> ignore
}
