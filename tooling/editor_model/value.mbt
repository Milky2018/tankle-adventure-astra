///|
pub type Raw = @core.JsValue

///|
pub fn get(v : Raw, k : String) -> Raw {
  @archive.prop(v, k)
}

///|
pub using @archive {str}

///|
pub fn exists(v : Raw) -> Bool {
  !v.is_undefined() && !v.is_null()
}

///|
pub fn children(v : Raw) -> FixedArray[Raw] {
  array(v, "children")
}

///|
pub fn array(v : Raw, k : String) -> FixedArray[Raw] {
  @archive.items(get(v, k))
}

///|
pub fn truth(v : Raw, k : String) -> Bool {
  get(v, k).strict_equal(Raw::of(true))
}

///|
pub fn data(v : Raw) -> Raw {
  get(v, "userData")
}

///|
pub fn entity(v : Raw) -> Raw {
  get(data(v), "entity")
}

///|
pub fn binding(v : Raw) -> String {
  str(data(v), "binding")
}

///|
pub fn uuid(v : Raw) -> String {
  str(v, "uuid")
}

///|
pub extern "js" fn clone(v : Raw) -> Raw = "v=>structuredClone(v)"

///|
using @archive {append}

///|
fn transform(node : Raw) -> @math.Matrix4 raise {
  let matrix = @math.Matrix4::new()
  let raw = get(node, "matrix")
  if raw.is_undefined() {
    return matrix
  }
  guard @archive.is_array(raw) && @archive.items(raw).length() == 16 else {
    raise Failure("Expected a 4 by 4 transform on " + str(node, "name"))
  }
  let values : Array[Double] = []
  for v in @archive.items(raw) {
    guard @archive.is_number(v) && (v.cast() : Double).is_finite() else {
      raise Failure("Non-finite transform on " + str(node, "name"))
    }
    values.push(v.cast())
  }
  matrix.from_array(values)
}

///|
fn matrix_value(m : @math.Matrix4) -> Raw {
  Raw::from_array(m.elements[:])
}

///|
priv struct SceneEntry {
  node : Raw
  world : @math.Matrix4
  parent : SceneEntry?
}

///|
fn index_scene(root : Raw) -> Map[String, SceneEntry] raise {
  let result = Map([])
  fn visit(node : Raw, parent : SceneEntry?) -> Unit raise {
    let raw_id = get(node, "uuid")
    guard @archive.is_string(raw_id) && (raw_id.cast() : String) != "" else {
      raise Failure("Missing object UUID on " + str(node, "name"))
    }
    let id : String = raw_id.cast()
    guard !result.contains(id) else {
      raise Failure("Duplicate object UUID: " + id)
    }
    let matrix = transform(node)
    let world = match parent {
      Some(p) => p.world.clone().multiply(matrix)
      None => matrix
    }
    let entry = { node, world, parent, }
    result[id] = entry
    for child in children(node) {
      visit(child, Some(entry))
    }
  }
  visit(root, None)
  result
}
