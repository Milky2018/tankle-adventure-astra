///|
type SceneNode = @core.Object3D

///|
fn binding(node : SceneNode) -> String {
  str(node.user_data, "binding")
}

///|
fn entity(node : SceneNode) -> Raw {
  node.user_data.get("entity")
}

///|
priv struct Command {
  apply : () -> Unit
  revert : () -> Unit
}

///|
priv struct Transform {
  position : @math.Vector3
  rotation : @math.Euler
  scale : @math.Vector3
}

///|
fn Transform::read(node : SceneNode) -> Transform {
  {
    position: node.position.clone(),
    rotation: node.rotation.clone(),
    scale: node.scale.clone(),
  }
}

///|
fn Transform::equals(a : Transform, b : Transform) -> Bool {
  a.position.equals(b.position) &&
  a.rotation.equals(b.rotation) &&
  a.scale.equals(b.scale)
}

///|
fn Transform::write(self : Transform, node : SceneNode) -> Unit {
  ignore(node.position.copy(self.position))
  ignore(node.rotation.copy(self.rotation))
  ignore(node.scale.copy(self.scale))
  node.update_matrix_world(force=true)
}

///|
priv struct Editor {
  scene : SceneNode
  camera : SceneNode
  overlay : SceneNode
  outline : SceneNode
  renderer : @webgl.WebGLRenderer
  orbit : @controls.OrbitControls
  gizmo : @controls.TransformControls
  ray : @core.Raycaster
  canvas : Element
  undos : Array[Command]
  redos : Array[Command]
  mut floor : Double?
  mut queued : Bool
  mut display_camera : SceneNode
  mut shading : @core.Material?
  mut update_overlay : () -> Unit
  mut pickable : (SceneNode) -> Bool
  mut selection_changed : (SceneNode?) -> Unit
  mut object_changed : (SceneNode) -> Unit
  mut history_changed : () -> Unit
}

///|
fn raw_canvas(canvas : Element) -> @webgl.HTMLCanvasElement = "%identity"

///|
fn pointer(e : @dom.Event) -> @dom.PointerEvent = "%identity"

///|
fn Editor::new(canvas : Element, scene : SceneNode) -> Editor {
  let renderer = @webgl.WebGLRenderer::new(
    canvas=raw_canvas(canvas),
    antialias=true,
  )
  renderer.set_clear_color_hex(0x222d38)
  renderer.tone_mapping = @core.ACESFilmicToneMapping
  renderer.tone_mapping_exposure = 1.1
  let camera = @core.PerspectiveCamera::new(fov=50, near=0.1, far=2000)
  ignore(camera.position.set(55, 65, 75))
  let element = Raw::of(canvas)
  // Register the gizmo first so a drag on a handle doesn't start an orbit.
  let gizmo = @controls.TransformControls::new(camera, dom_element=element)
  let orbit = @controls.OrbitControls::new(camera, dom_element=element)
  let overlay = @core.Scene::new()
  let outline = @helpers.BoxHelper::new(color=@math.Color::from_hex(0xffbd45))
  outline.visible = false
  ignore(overlay.add(outline).add(gizmo.get_helper()))
  if outline.get_material() is Some(Single(material)) {
    material.depth_test = false
  }
  let view : Editor = {
    scene,
    camera,
    overlay,
    outline,
    renderer,
    orbit,
    gizmo,
    ray: @core.Raycaster::new(),
    canvas,
    undos: [],
    redos: [],
    queued: false,
    floor: None,
    display_camera: camera,
    shading: None,
    update_overlay: () => (),
    pickable: _ => true,
    selection_changed: _ => (),
    object_changed: _ => (),
    history_changed: () => (),
  }
  orbit.add_event_listener("change", _ => view.redraw())
  gizmo.add_event_listener("change", _ => view.redraw())
  let mut before : Transform? = None
  gizmo.add_event_listener("mouseDown", _ => {
    if gizmo.object is Some(node) {
      before = Some(Transform::read(node))
    }
    orbit.base.enabled = false
  })
  gizmo.add_event_listener("objectChange", _ => {
    @helpers.BoxHelper::update(outline)
    view.redraw()
  })
  gizmo.add_event_listener("mouseUp", _ => {
    orbit.base.enabled = true
    if before is Some(old) && gizmo.object is Some(node) {
      let current = Transform::read(node)
      if !current.equals(old) {
        view.edit_transform(node, old, current)
      }
    }
    before = None
  })
  let mut start : (Float, Float)? = None
  let events = canvas.reinterpret_as_event_target()
  events.add_event_listener("pointerdown", e => {
    let p = pointer(e)
    start = if p.button() == 0 && !gizmo.dragging {
      Some((p.client_x(), p.client_y()))
    } else {
      None
    }
  })
  events.add_event_listener("pointercancel", _ => start = None)
  events.add_event_listener("pointerup", e => {
    let p = pointer(e)
    if start is Some((x, y)) &&
      (x - p.client_x()).abs() < 3 &&
      (y - p.client_y()).abs() < 3 {
      view.pick(p.client_x().to_double(), p.client_y().to_double())
    }
    start = None
  })
  view.resized()
  view
}

///|
fn Editor::redraw(self : Editor) -> Unit {
  guard !self.queued else { return }
  self.queued = true
  ignore(
    @dom.window().request_animation_frame(_ => {
      self.queued = false
      let sc = self.scene.as_scene()
      let background = sc.background
      let material = sc.override_material
      defer {
        sc.override_material = material
      }
      sc.override_material = self.shading
      defer {
        sc.background = background
      }
      sc.background = None
      self.renderer.render(self.scene, self.display_camera)
      (self.update_overlay)()
      guard self.display_camera.id == self.camera.id else { return }
      self.renderer.auto_clear = false
      let planes = self.renderer.clipping_planes
      defer {
        self.renderer.auto_clear = true
        self.renderer.clipping_planes = planes
      }
      self.renderer.clipping_planes = []
      self.renderer.clear_depth()
      self.renderer.render(self.overlay, self.camera)
    }),
  )
}

///|
fn Editor::resized(self : Editor) -> Unit {
  let box = self.canvas.get_bounding_client_rect()
  if box.width > 0 && box.height > 0 {
    self.camera.as_perspective_camera().aspect = (box.width / box.height).to_double()
    self.camera.update_projection_matrix()
    self.renderer.set_size(
      box.width.to_double(),
      box.height.to_double(),
      update_style=false,
    )
    self.redraw()
  }
}

///|
fn Editor::pick(self : Editor, x : Double, y : Double) -> Unit {
  let r = self.canvas.get_bounding_client_rect()
  let ndc = @math.Vector2::new(
    (x - r.left.to_double()) / r.width.to_double() * 2 - 1,
    1 - (y - r.top.to_double()) / r.height.to_double() * 2,
  )
  self.camera.update_matrix_world()
  self.scene.update_matrix_world()
  self.ray.set_from_camera(ndc, self.display_camera)
  let candidates = []
  self.scene.traverse_visible(n => {
    if (n.is_mesh() || n.is_line() || n.is_points() || n.is_sprite()) &&
      (self.pickable)(n) {
      candidates.push(n)
    }
  })
  for hit in self.ray.intersect_objects(candidates, recursive=false) {
    if self.floor is Some(h) && (hit.point.y < h - 1 || hit.point.y > h + 6) {
      continue
    }
    self.select(hit.object)
    return
  }
  self.deselect()
}

///|
fn Editor::select(self : Editor, n : SceneNode) -> Unit {
  ignore(self.gizmo.attach(n))
  ignore(@helpers.BoxHelper::set_from_object(self.outline, n))
  self.outline.visible = true
  (self.selection_changed)(Some(n))
  self.redraw()
}

///|
fn Editor::deselect(self : Editor) -> Unit {
  ignore(self.gizmo.detach())
  self.outline.visible = false
  (self.selection_changed)(None)
  self.redraw()
}

///|
fn Editor::clip_floor(self : Editor, floor : Double?) -> Unit {
  self.floor = floor
  self.renderer.clipping_planes = match floor {
    Some(h) =>
      [
        @math.Plane::new(normal=@math.Vector3::new(0, -1, 0), constant=h + 6),
        @math.Plane::new(normal=@math.Vector3::new(0, 1, 0), constant=1 - h),
      ]
    None => []
  }
  self.redraw()
}

///|
fn Editor::focus(
  self : Editor,
  at : @math.Vector3,
  overview~ : Bool = false,
) -> Unit {
  let (x, y, z) = if overview { (0.0, 65.0, 0.01) } else { (16.0, 21.0, 24.0) }
  ignore(self.camera.position.set(at.x + x, at.y + y, at.z + z))
  ignore(self.orbit.target.copy(at))
  ignore(self.orbit.update())
  self.redraw()
}

///|
fn Editor::transform_mode(self : Editor, mode : String) -> Unit {
  self.gizmo.set_mode(mode)
  self.redraw()
}

///|
fn Editor::execute(self : Editor, cmd : Command) -> Unit {
  (cmd.apply)()
  self.undos.push(cmd)
  self.redos.clear()
  (self.history_changed)()
  self.redraw()
}

///|
fn Editor::undo(self : Editor) -> Unit {
  if self.undos.pop() is Some(cmd) {
    (cmd.revert)()
    self.redos.push(cmd)
    (self.history_changed)()
    self.redraw()
  }
}

///|
fn Editor::redo(self : Editor) -> Unit {
  if self.redos.pop() is Some(cmd) {
    (cmd.apply)()
    self.undos.push(cmd)
    (self.history_changed)()
    self.redraw()
  }
}

///|
fn Editor::edit_transform(
  self : Editor,
  node : SceneNode,
  old : Transform,
  value : Transform,
) -> Unit {
  fn set(t : Transform) {
    t.write(node)
    @helpers.BoxHelper::update(self.outline)
    (self.object_changed)(node)
  }
  self.execute({ apply: () => set(value), revert: () => set(old), })
}
