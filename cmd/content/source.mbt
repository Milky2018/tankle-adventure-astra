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
fn sequence(v : Json) -> String {
  list(v).map(literal).join(",")
}

///|
fn rect(r : Record) -> String {
  "{ x: " +
  literal(r["x"]) +
  ", z: " +
  literal(r["z"]) +
  ", w: " +
  literal(r["w"]) +
  ", d: " +
  literal(r["d"]) +
  " }"
}

///|
fn vec3(r : Record) -> String {
  "{ x: " +
  literal(r["x"]) +
  ", y: " +
  literal(r["y"]) +
  ", z: " +
  literal(r["z"]) +
  " }"
}

///|
fn array_def(
  name : String,
  ty : String,
  rows : Array[Json],
  encode : (Record) -> String,
) -> String {
  let declarations = []
  let chunks = (rows.length() + 255) / 256
  let calls = []
  for i in 0..<chunks.max(1) {
    let values = rows[i * 256:(i * 256 + 256).min(rows.length())].map(v => {
      "  " + encode(object(v)) + ","
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
fn capitalized(s : String) -> String {
  if s.is_empty() {
    s
  } else {
    s[:1].to_owned().to_upper() + s[1:].to_owned()
  }
}
