///|
fn Editor::viewport_controls(self : Editor, panel : Element) -> Unit {
  let bar = el("div", style="viewport-display")
  let cameras = [self.camera]
  self.scene.traverse(n => if n.is_camera() { cameras.push(n) })
  if cameras.length() > 1 {
    let menu = el("select")
    menu.set_attribute("aria-label", "视口相机")
    for camera in cameras {
      option(
        menu,
        camera.uuid,
        if camera.id == self.camera.id {
          "编辑相机"
        } else {
          camera.name
        },
      )
    }
    handler(menu, "change", () => {
      let id = menu.reinterpret_as_html_select_element().value()
      if cameras.iter().find_first(c => c.uuid == id) is Some(camera) {
        self.display_camera = camera
        self.orbit.base.enabled = camera.id == self.camera.id
        self.gizmo.set_enabled(camera.id == self.camera.id)
        self.redraw()
      }
    })
    append(bar, menu)
  }
  let menu = el("select")
  menu.set_attribute("aria-label", "视口着色")
  for
    (id, label) in [
      ("solid", "材质"),
      ("normals", "法线"),
      ("wireframe", "线框"),
    ] {
    option(menu, id, label)
  }
  let wire = @core.MeshBasicMaterial::new()
  wire.wireframe = Some(true)
  wire.color = Some(@math.Color::from_hex(0xbed3e0))
  let normals = @core.MeshNormalMaterial::new()
  handler(menu, "change", () => {
    self.shading = match menu.reinterpret_as_html_select_element().value() {
      "normals" => Some(normals)
      "wireframe" => Some(wire)
      _ => None
    }
    self.redraw()
  })
  append(bar, menu)
  append(panel, bar)
  let compass = el("div", style="view-compass")
  let axes = [
    ("+X", @math.Vector3::new(1, 0, 0)),
    ("−X", @math.Vector3::new(-1, 0, 0)),
    ("+Y", @math.Vector3::new(0, 1, 0)),
    ("−Y", @math.Vector3::new(0, -1, 0)),
    ("+Z", @math.Vector3::new(0, 0, 1)),
    ("−Z", @math.Vector3::new(0, 0, -1)),
  ].map(axis => {
    let (label, normal) = axis
    let button = el("button", label~)
    button.set_attribute("aria-label", "沿 " + label + " 轴查看")
    handler(button, "click", () => {
      guard self.display_camera.id == self.camera.id else { return }
      let offset = normal.clone().multiply_scalar(self.orbit.get_distance())
      ignore(self.camera.position.copy(self.orbit.target).add(offset))
      ignore(self.orbit.update())
      self.redraw()
    })
    append(compass, button)
    (button, normal)
  })
  append(panel, compass)
  let info = el("output", style="view-stats")
  append(panel, info)
  self.update_overlay = () => {
    let rotation = self.display_camera.quaternion.clone().invert()
    for (button, axis) in axes {
      let d = axis.clone().apply_quaternion(rotation)
      let left = 50.0 + d.x * 36
      let top = 50.0 - d.y * 36
      let z = (d.z * 10 + 11).to_int()
      button.set_attribute(
        "style",
        "left: \{left}%; top: \{top}%; z-index: \{z}",
      )
    }
    let stats = self.renderer.info.render
    set_text(
      info,
      "\{stats.calls} 次绘制 · \{stats.triangles.to_int()} 三角形",
    )
  }
}
