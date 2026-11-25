///|
extern "js" fn to_base64(kind : String, array : Raw) -> String =
  #| (t,a)=>{const b=new Uint8Array(new globalThis[t](a).buffer);
  #| if(b.toBase64)return b.toBase64();
  #| const parts=[];for(let i=0;i<b.length;i+=24576)parts.push(btoa(String.fromCharCode(...b.subarray(i,i+24576))));
  #| return parts.join('')}

///|
extern "js" fn from_base64(kind : String, text : String) -> Raw =
  #| (t,s)=>{const b=Uint8Array.fromBase64?Uint8Array.fromBase64(s):Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  #| return Array.from(new globalThis[t](b.buffer,b.byteOffset,b.byteLength/globalThis[t].BYTES_PER_ELEMENT))}

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
fn typed_kind(t : String) -> Bool {
  t
  is ("Float32Array"
  | "Float64Array"
  | "Uint32Array"
  | "Uint16Array"
  | "Uint8Array"
  | "Uint8ClampedArray"
  | "Int32Array"
  | "Int16Array"
  | "Int8Array")
}

///|
pub fn pack_scene_transfer(project : Raw) -> Raw {
  attributes(project, (a, k) => {
    let v = get(a, k)
    let t = str(a, "type")
    if typed_kind(t) &&
      @archive.kind(v) == "array" &&
      @archive.items(v).length() >= 256 {
      a.set(k, Raw::of(to_base64(t, v)))
    }
  })
  project
}

///|
pub fn unpack_scene_transfer(project : Raw) -> Raw raise {
  attributes(project, (a, k) => {
    let v = get(a, k)
    if @archive.kind(v) == "string" {
      let t = str(a, "type")
      guard typed_kind(t) else {
        raise Failure("Unknown scene attribute type " + t)
      }
      a.set(k, from_base64(t, v.cast()))
    }
  })
  project
}
