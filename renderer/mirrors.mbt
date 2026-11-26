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
    let glass = @geometries.PlaneGeometry::new(
      width=mirror.size / surface.scale.x,
      height=3,
    )
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
    let mut pending = false
    let mut measuring = false
    let mut visible = true
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
      if visible {
        let behind = point(camera.position)
          .sub(mirror.position)
          .dot(mirror.normal()) <
          0
        face.rotation.set(0, if behind { @math.PI } else { 0 }, 0) |> ignore
        face.update_matrix_world(force=true)
        // A room outside the driver's frustum can still be seen in the glass.
        for node in self.room_visibility.hidden {
          node.layers.set(0)
        }
        let aperture = self.cutaway.enabled.value
        self.cutaway.enabled.value = Number(0)
        reflect(renderer, scene, camera, geometry, material, group)
        self.cutaway.enabled.value = aperture
        for node in self.room_visibility.hidden {
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
