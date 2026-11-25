///|
fn literal(v : Json) -> String {
  v.stringify(escape_slash=false)
}

///|
fn[T] array_def(
  name : String,
  ty : String,
  rows : Array[T],
  encode : (T) -> String raise?,
) -> String raise? {
  let chunks = rows.chunks(256)
  if chunks.is_empty() {
    chunks.push(rows[:])
  }
  let parts = []
  let declarations = []
  for i, chunk in chunks {
    let part = if chunks.length() == 1 { name } else { "\{name}_\{i}" }
    let visibility = if chunks.length() == 1 { "pub " } else { "" }
    let values = chunk.map(v => "  " + encode(v) + ",").join("\n")
    let declaration =
      $|///|
      $|\{visibility}fn \{part}() -> Array[\{ty}] {
      $|[
      $|\{values}
      $|]
      $|}
      $|
    declarations.push(declaration)
    parts.push(part)
  }
  if parts.length() > 1 {
    let calls = parts.map(part => "for item in \{part}() {items.push(item)}")
    let combined =
      $|///|
      $|pub fn \{name}() -> Array[\{ty}] {
      $|let items : Array[\{ty}] = []
      $|\{calls.join("\n")}
      $|items
      $|}
      $|
    declarations.push(combined)
  }
  declarations.join("\n")
}

///|
fn read_json(path : String) -> Json raise {
  @json.parse(@fs.read_file_to_string(path))
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
  "{ x: \{source(x)}, y: \{source(y)}, z: \{source(z)} }"
}

///|
fn rect_source(x : Double, z : Double, w : Double, d : Double) -> String {
  "{ x: \{source(x)}, z: \{source(z)}, w: \{source(w)}, d: \{source(d)} }"
}
