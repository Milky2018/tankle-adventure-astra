///|
// ObjectLoader may finish synchronously when all textures are packed in memory.
extern "js" fn when_textured(
  start : ((@core.Object3D) -> Unit) -> Unit,
) -> @js_async.Promise[@core.Object3D] = "f=>new Promise(f)"

///|
fn parse_scene(
  tree : Json,
  buffers : SceneBuffers,
) -> @js_async.Promise[@core.Object3D] {
  let loader = @loaders.ObjectLoader::new()
  // The override calls the default material parser after supplying packed image data.
  let defaults = @loaders.ObjectLoader::new()
  loader.set_parse_materials_override(fn(json, textures) {
    for id, texture in textures {
      if buffers.images.get(id) is Some(pixels) &&
        texture.image() is DataImage(image) {
        image.data = Some(pixels)
      }
    }
    defaults.parse_materials(json, textures)
  })
  when_textured(fn(done) {
    let scene = loader.parse(tree, on_load=done)
    fn restore(attribute : @core.BufferAttribute, array : @core.TypedArray?) {
      if array is Some(array) {
        attribute.array = array
        attribute.count = array.length() / attribute.item_size
      }
    }
    scene.traverse(fn(object) {
      if object.kind is Mesh({ kind: InstancedMesh(data), .. }) &&
        buffers.instances.get(object.uuid) is Some(attrs) {
        restore(data.instance_matrix, attrs.get("instanceMatrix"))
        if data.instance_color is Some(color) {
          restore(color, attrs.get("instanceColor"))
        }
      }
      // Multiple meshes can reference the same geometry.
      guard object.get_geometry() is Some(geometry) &&
        buffers.geometry.remove_and_get(geometry.uuid) is Some(packed) else {
        return
      }
      if geometry.index is Some(Buffer(index)) {
        restore(index, packed.get("index"))
      }
      for name, slot in geometry.attributes {
        if slot is Buffer(attribute) {
          restore(attribute, packed.get(name))
        }
      }
    })
  })
}

///|
extern "js" fn game_canvas() -> @webgl.HTMLCanvasElement =
  #| () => document.getElementById('game')

///|
pub fn create_renderer() -> @webgl.WebGLRenderer {
  @webgl.WebGLRenderer::new(
    canvas=game_canvas(),
    antialias=true,
    power_preference="high-performance",
  )
}
