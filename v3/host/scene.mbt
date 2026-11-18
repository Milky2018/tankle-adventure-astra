///|
#module("tankle-astra-platform/host")
extern "js" fn load_art(
  url : String,
  parse : (String, @core.JsValue) -> @core.Object3D,
  ready : (@core.Object3D) -> Unit,
  failed : (String) -> Unit,
) -> Unit = "loadScene"

///|
pub fn load_scene(
  url : String,
  ready : (@core.Object3D) -> Unit,
  failed : (String) -> Unit,
) -> Unit {
  load_art(url, parse_scene, ready, failed)
}

///|
fn parse_scene(text : String, buffers : @core.JsValue) -> @core.Object3D {
  let scene = @loaders.ObjectLoader::new().parse(try! @json.parse(text))
  fn restore(attribute : @core.BufferAttribute, view : @core.JsValue) {
    if !view.is_undefined() {
      attribute.array = view.cast()
      attribute.count = attribute.array.length() / attribute.item_size
    }
  }
  scene.traverse(fn(object) {
    guard object.get_geometry() is Some(geometry) else { return }
    let packed = buffers.get(geometry.uuid)
    if packed.is_undefined() {
      return
    }
    if geometry.index is Some(Buffer(index)) {
      restore(index, packed.get("index"))
    }
    let attributes = packed.get("attributes")
    for name, slot in geometry.attributes {
      if slot is Buffer(attribute) {
        restore(attribute, attributes.get(name))
      }
    }
    // Meshes can share a geometry.
    buffers.set(geometry.uuid, @core.JsValue::undefined())
  })
  scene
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
