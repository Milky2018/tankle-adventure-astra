///|
using @catalog {type Record, field, object, list, text, num}

///|
fn literal(v : Json) -> String {
  v.stringify(escape_slash=false)
}

///|
fn optional(r : Record, key : String) -> String {
  match field(r, key) {
    Null => "None"
    value => "Some(" + literal(value) + ")"
  }
}

///|
fn sequence(v : Json) -> String raise {
  list(v).map(literal).join(",")
}

///|
fn rect(r : Record) -> String raise {
  "{ x: " +
  literal(required(r, "x")) +
  ", z: " +
  literal(required(r, "z")) +
  ", w: " +
  literal(required(r, "w")) +
  ", d: " +
  literal(required(r, "d")) +
  " }"
}

///|
fn[T] array_def(
  name : String,
  ty : String,
  rows : Array[T],
  encode : (T) -> String raise?,
) -> String raise? {
  let declarations = []
  let chunks = (rows.length() + 255) / 256
  let calls = []
  for i in 0..<chunks.max(1) {
    let values = rows[i * 256:(i * 256 + 256).min(rows.length())].map(v => {
      "  " + encode(v) + ","
    })
    let part = if chunks > 1 { name + "_" + i.to_string() } else { name }
    let visibility = if chunks > 1 { "" } else { "pub " }
    declarations.push(
      "///|\n" +
      visibility +
      "fn " +
      part +
      "() -> Array[" +
      ty +
      "] {\n[\n" +
      values.join("\n") +
      "\n]\n}\n",
    )
    calls.push("for item in " + part + "() {items.push(item)}")
  }
  if chunks > 1 {
    declarations.push(
      "///|\npub fn " +
      name +
      "() -> Array[" +
      ty +
      "] {\nlet items : Array[" +
      ty +
      "] = []\n" +
      calls.join("\n") +
      "\nitems\n}\n",
    )
  }
  declarations.join("\n")
}

///|
extern "js" fn read_text(path : String) -> String = "path => process.getBuiltinModule('fs').readFileSync(path, 'utf8')"

///|
extern "js" fn write_text(path : String, contents : String) -> Unit = "(path,s) => process.getBuiltinModule('fs').writeFileSync(path,s)"

///|
fn read_json(path : String) -> Json raise {
  @json.parse(read_text(path))
}

///|
fn catalog(name : String) -> Json raise {
  read_json("content/levels/city/" + name + ".json")
}

///|
fn[T : @json.ToJson] source(v : T) -> String {
  literal(@json.to_json(v))
}

///|
fn[T : @json.ToJson] option_source(v : T?) -> String {
  match v {
    None => "None"
    Some(a) => "Some(" + source(a) + ")"
  }
}

///|
fn vec_source(x : Double, y : Double, z : Double) -> String {
  "{ x: " + source(x) + ", y: " + source(y) + ", z: " + source(z) + " }"
}

///|
fn rect_source(x : Double, z : Double, w : Double, d : Double) -> String {
  "{ x: " +
  source(x) +
  ", z: " +
  source(z) +
  ", w: " +
  source(w) +
  ", d: " +
  source(d) +
  " }"
}

///|
fn required(r : Record, key : String) -> Json raise {
  guard r.get(key) is Some(v) else {
    raise Failure("Missing authored field: " + key)
  }
  v
}
