///|
pub type Raw = @core.JsValue

///|
pub fn get(v : Raw, k : String) -> Raw {
  @archive.prop(v, k)
}

///|
pub fn str(v : Raw, k : String) -> String {
  @archive.str(v, k)
}

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
pub extern "js" fn call(v : Raw, key : String, args : FixedArray[Raw]) -> Raw = "(v,k,a)=>v[k](...a)"

///|
pub extern "js" fn append(v : Raw, item : Raw) -> Unit = "(a,v)=>a.push(v)"

///|
pub extern "js" fn index_of(a : Raw, v : Raw) -> Int32 = "(a,v)=>a.indexOf(v)"

///|
extern "js" fn assign_at(a : Raw, i : Int32, v : Raw) -> Unit = "(a,i,v)=>{a[i]=v}"

///|
extern "js" fn new_uuid() -> String = "()=>crypto.randomUUID()"

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
pub fn entity_key(e : Raw) -> String {
  str(e, "collection") + ":" + str(e, "id")
}

///|
pub fn editable(collection : String) -> Bool {
  collection is ("enemies" | "controls" | "pickups")
}

///|
pub fn entity_prefix(e : Raw) -> String {
  let base = match str(e, "collection") {
    "enemies" => "enemies"
    "controls" => "world/controls"
    "pickups" => "world/views/pickups"
    "barriers" => "world/walls"
    "lifts" => "world/views/lifts"
    "mirrors" => "world/views/mirrors"
    "hives" => "world/hives"
    _ => "undefined"
  }
  base + "/" + str(e, "key")
}

///|
pub fn belongs_to(b : String, prefix : String) -> Bool {
  b == prefix || b.has_prefix(prefix + "/")
}

///|
fn required(e : Raw) -> Array[String] {
  let roles = if str(e, "collection") == "enemies" {
    ["model/root", "model/body", "model/turret"]
  } else {
    ["root"]
  }
  roles.map(r => entity_prefix(e) + "/" + r)
}

///|
fn valid_identity(e : Raw, game : Raw) -> Unit raise {
  let id = str(e, "id")
  let chars = id.to_array()
  fn letter(c : Char) -> Bool {
    (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')
  }
  guard editable(str(e, "collection")) &&
    str(e, "key") == id &&
    str(game, "id") == id &&
    chars.length() > 0 &&
    chars.length() <= 96 &&
    letter(chars[0]) &&
    chars
    .iter()
    .all(c => letter(c) || (c >= '0' && c <= '9') || c == '_' || c == '-') else {
    raise Failure("Invalid new gameplay identity: " + entity_key(e))
  }
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

///|
pub fn entity_bundle(scene : Raw, root : Raw) -> FixedArray[Raw] {
  let prefix = entity_prefix(entity(root))
  FixedArray::from_array(
    [
      for n in children(scene) if n.strict_equal(root) ||
      belongs_to(binding(n), prefix) => n
    ][:],
  )
}

///|
pub fn clone_entity(
  scene : Raw,
  source : Raw,
  id : String,
  position : Raw,
  defaults? : Raw,
) -> Raw raise {
  let old = entity(source)
  let e = @archive.obj([
    ("collection", old.get("collection")),
    ("id", Raw::of(id)),
    ("key", Raw::of(id)),
  ])
  let game = clone(defaults.unwrap_or(get(data(source), "game")))
  game.set("id", Raw::of(id))
  if str(e, "collection") == "controls" {
    game.set("circuitKey", Raw::of(id))
    if defaults is Some(_) {
      game.set("effects", Raw::from_array([id]))
    } else if !exists(get(game, "effects")) {
      game.set("effects", Raw::from_array([str(old, "id")]))
    }
  }
  valid_identity(e, game)
  let old_prefix = entity_prefix(old)
  let prefix = entity_prefix(e)
  let mats = Map([])
  let geos = Map([])
  fn resource(cache : Map[String, Raw], v : Raw) -> Raw {
    let key = uuid(v)
    if cache.get(key) is Some(c) {
      return c
    }
    let c = call(v, "clone", [])
    cache[key] = c
    c
  }
  let bundle = []
  let mut root = Raw::undefined()
  for original in entity_bundle(scene, source) {
    let c = call(original, "clone", [Raw::of(true)])
    @archive.walk(c, n => {
      let b = binding(n)
      if !b.is_empty() {
        let role = if b == old_prefix {
          prefix
        } else if b.strip_prefix(old_prefix + "/") is Some(tail) {
          prefix + "/" + tail.to_owned()
        } else {
          prefix + "/art/" + uuid(n)
        }
        data(n).set("binding", Raw::of(role))
      }
      if str(n, "name").contains("/") {
        n.set(
          "name",
          if !binding(n).is_empty() {
            data(n).get("binding")
          } else {
            n.get("type")
          },
        )
      }
      if exists(get(n, "geometry")) {
        n.set("geometry", resource(geos, n.get("geometry")))
      }
      let mat = get(n, "material")
      if exists(mat) {
        n.set(
          "material",
          if @archive.kind(mat) == "array" {
            Raw::from_array(
              [ for m in @archive.items(mat) => resource(mats, m) ][:],
            )
          } else {
            resource(mats, mat)
          },
        )
      }
    })
    if !exists(root) && exists(entity(c)) {
      root = c
    }
    bundle.push(c)
  }
  guard exists(root) else { raise Failure("Missing gameplay root") }
  data(root).set("entity", e)
  data(root).set("game", game)
  root.set("name", Raw::of(str(e, "collection") + ": " + id))
  if exists(get(data(root), "circuit")) {
    if defaults is Some(_) {
      @archive.remove(data(root), "circuit")
    } else {
      data(root).get("circuit").set("id", Raw::of(id))
    }
  }
  let delta = call(call(position, "clone", []), "sub", [source.get("position")])
  for n in bundle {
    ignore(call(n.get("position"), "add", [delta]))
    ignore(call(n, "updateMatrixWorld", [Raw::of(true)]))
  }
  @archive.obj([("root", root), ("objects", Raw::from_array(bundle[:]))])
}

///|
pub fn creation_position(
  source : Raw,
  x : Double,
  ground : Double,
  z : Double,
) -> Raw {
  let origin = elements(data(source).get("placement").get("origin"))
  let game = data(source).get("game")
  let pos = source.get("position")
  let base = if str(entity(source), "collection") == "controls" {
    if exists(get(game, "ground")) {
      number(game, "ground")
    } else {
      origin[1] - 1.3
    }
  } else {
    origin[1]
  }
  call(call(pos, "clone", []), "set", [
    Raw::of(x + number(pos, "x") - origin[0]),
    Raw::of(ground + number(pos, "y") - base),
    Raw::of(z + number(pos, "z") - origin[2]),
  ])
}
