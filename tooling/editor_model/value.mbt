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
pub extern "js" fn pretty(v : Raw) -> String = "v=>JSON.stringify(v,null,2)"

///|
fn number(v : Raw, k : String) -> Double {
  get(v, k).cast()
}

///|
fn elements(a : Raw) -> Array[Double] {
  let x : FixedArray[Double] = a.cast()
  Array::from_fixed_array(x)
}

///|
fn transform(node : Raw) -> @math.Matrix4 {
  let m = @math.Matrix4::new()
  if exists(get(node, "matrix")) {
    ignore(m.from_array(elements(node.get("matrix"))))
  }
  m
}

///|
fn matrix_value(m : @math.Matrix4) -> Raw {
  Raw::from_array(m.elements[:])
}

///|
fn transforms(root : Raw) -> Map[String, @math.Matrix4] {
  let result = Map([])
  fn visit(n : Raw, parent : @math.Matrix4) {
    let world = parent.clone().multiply(transform(n))
    result[uuid(n)] = world
    for child in children(n) {
      visit(child, world)
    }
  }
  visit(root, @math.Matrix4::new())
  result
}
