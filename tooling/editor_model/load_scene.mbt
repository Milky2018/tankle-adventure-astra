///|
/// The archive stays in its editable transfer representation. Pass only the
/// scene description through ObjectLoader's Json API and attach typed GPU data
/// with the same loader used by the game.
pub async fn load_scene(scene : Raw) -> @core.Object3D {
  let buffers : @loader.Buffers = {
    geometry: Map([]),
    images: Map([]),
    instances: Map([]),
  }
  let tree = {
    let detached : Array[(Raw, String, Raw)] = []
    defer (for (owner, field, original) in detached {
      owner.set(field, original)
    })
    fn take(owner : Raw, field : String) -> @core.TypedArray? raise {
      let value = get(owner, field)
      guard exists(value) else { return None }
      let kind = str(owner, "type")
      guard @scene_format.element_width(kind) is Some(width) else {
        return None
      }
      let view = if @archive.is_string(value) {
        let encoded : String = value.cast()
        let bytes = @base64.decode(encoded, ignore_whitespace=true)
        guard bytes.length() % width == 0 else {
          raise Failure("Truncated " + kind + " attribute")
        }
        @archive.typed_view(
          bytes,
          kind,
          offset=0,
          length=bytes.length() / width,
        )
      } else {
        @archive.typed(kind, value)
      }
      detached.push((owner, field, value))
      owner.set(field, Raw::from_json([]))
      Some(view)
    }
    for geometry in array(scene, "geometries") {
      let data = get(geometry, "data")
      let slots = get(data, "attributes")
      let attrs = Map([])
      for name in @archive.keys(slots) {
        if take(slots.get(name), "array") is Some(view) {
          attrs[name] = view
        }
      }
      if take(get(data, "index"), "array") is Some(view) {
        attrs["index"] = view
      }
      if !attrs.is_empty() {
        buffers.geometry[uuid(geometry)] = attrs
      }
    }
    @archive.walk(scene.get("object"), n => {
      let attrs = Map([])
      for key in ["instanceMatrix", "instanceColor"] {
        if take(get(n, key), "array") is Some(view) {
          attrs[key] = view
        }
      }
      if !attrs.is_empty() {
        buffers.instances[uuid(n)] = attrs
      }
    })
    let pixels = Map([])
    for image in array(scene, "images") {
      if take(get(image, "url"), "data") is Some(view) {
        pixels[uuid(image)] = view
      }
    }
    for texture in array(scene, "textures") {
      if pixels.get(str(texture, "image")) is Some(view) {
        buffers.images[uuid(texture)] = view
      }
    }
    scene.to_json()
  }
  buffers.parse(tree)
}
