///|
fn attributes(
  project : Raw,
  visit : (Raw, String) -> Unit raise?,
) -> Unit raise? {
  let scene = project.get("scene")
  for g in array(scene, "geometries") {
    let d = get(g, "data")
    let attrs = get(d, "attributes")
    for k in @archive.keys(attrs) {
      visit(attrs.get(k), "array")
    }
    if exists(get(d, "index")) {
      visit(d.get("index"), "array")
    }
  }
  for image in array(scene, "images") {
    let url = get(image, "url")
    if exists(get(url, "data")) {
      visit(url, "data")
    }
  }
  let pending = [scene.get("object")]
  while pending.pop() is Some(n) {
    for k in ["instanceMatrix", "instanceColor"] {
      if exists(get(n, k)) {
        visit(n.get(k), "array")
      }
    }
    for c in children(n) {
      pending.push(c)
    }
  }
}

///|
/// On JS the base64 encoder builds a string one character at a time. Materialize
/// each block before storing it in a city project. Otherwise all intermediate
/// string nodes survive until the HTTP response is serialized.
fn encode_attribute(bytes : Bytes) -> String {
  let encoded = @buffer.Buffer(capacity=(bytes.length() + 2) / 3 * 4)
  // Multiples of three only need base64 padding in the final block.
  for start = 0; start < bytes.length(); start = start + 24576 {
    let end = (start + 24576).min(bytes.length())
    encoded.write_bytes(@utf8.encode(@base64.encode(bytes[start:end])))
  }
  @utf8.decode_lossy(encoded.to_bytes())
}

///|
const PACK_THRESHOLD = 256

///|
fn pack_attribute(data : @core.TypedArray) -> Raw {
  if data.length() < PACK_THRESHOLD {
    @archive.array_copy(data)
  } else {
    Raw::of(encode_attribute(@archive.byte_view(data)))
  }
}

///|
pub fn pack_scene_transfer(project : Raw) -> Raw {
  attributes(project, (a, k) => {
    let v = get(a, k)
    let t = str(a, "type")
    if @scene_format.element_width(t) is Some(_) &&
      @archive.is_array(v) &&
      @archive.items(v).length() >= PACK_THRESHOLD {
      a.set(k, pack_attribute(@archive.typed(t, v)))
    }
  })
  project
}

///|
pub fn unpack_scene_transfer(project : Raw) -> Raw raise {
  attributes(project, (a, k) => {
    let v = get(a, k)
    if @archive.is_string(v) {
      let t = str(a, "type")
      guard @scene_format.element_width(t) is Some(width) else {
        raise Failure("Unknown scene attribute type " + t)
      }
      let encoded : String = v.cast()
      let bytes = @base64.decode(encoded, ignore_whitespace=true)
      guard bytes.length() % width == 0 else {
        raise Failure("Truncated scene attribute of type " + t)
      }
      a.set(
        k,
        @archive.array_copy(
          @archive.typed_view(bytes, t, offset=0, length=bytes.length() / width),
        ),
      )
    }
  })
  project
}
