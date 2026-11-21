///|
#module("tankle-astra-platform/host")
extern "js" fn load_art(
  url : String,
  parse : (String, @core.JsValue, () -> Unit) -> @core.Object3D,
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
fn parse_scene(
  text : String,
  buffers : @core.JsValue,
  textures_ready : () -> Unit,
) -> @core.Object3D {
  let loader = @loaders.ObjectLoader::new()
  let images = buffers.get("images")
  loader.set_parse_materials_override(fn(json, textures) {
    for id, texture in textures {
      let pixels = images.get(id)
      if !pixels.is_undefined() && texture.image() is DataImage(image) {
        image.data = Some(pixels.cast())
      }
    }
    @loaders.ObjectLoader::new().parse_materials(json, textures)
  })
  let scene = loader.parse(try! @json.parse(text), on_load=fn(_) {
    textures_ready()
  })
  let geometries = buffers.get("geometry")
  let instances = buffers.get("instances")
  fn restore(attribute : @core.BufferAttribute, view : @core.JsValue) {
    if !view.is_undefined() {
      attribute.array = view.cast()
      attribute.count = attribute.array.length() / attribute.item_size
    }
  }
  scene.traverse(fn(object) {
    if object.kind is Mesh({ kind: InstancedMesh(data), .. }) {
      let attrs = instances.get(object.uuid)
      if !attrs.is_undefined() {
        restore(data.instance_matrix, attrs.get("instanceMatrix"))
        if data.instance_color is Some(color) {
          restore(color, attrs.get("instanceColor"))
        }
      }
    }
    guard object.get_geometry() is Some(geometry) else { return }
    let packed = geometries.get(geometry.uuid)
    if packed.is_undefined() {
      return
    }
    if geometry.index is Some(Buffer(index)) {
      restore(index, packed.get("index"))
    }
    let attributes = packed
    for name, slot in geometry.attributes {
      if slot is Buffer(attribute) {
        restore(attribute, attributes.get(name))
      }
    }
    // Meshes can share a geometry.
    geometries.set(geometry.uuid, @core.JsValue::undefined())
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
