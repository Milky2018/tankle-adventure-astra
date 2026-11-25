///|
let directory = "content/levels/city"

///|
priv struct EditableCatalog {
  files : Map[String, Json]
}

///|
fn EditableCatalog::read() -> EditableCatalog raise {
  let files = Map([])
  for file in @archive.list_files(directory) {
    if file.strip_suffix(".json") is Some(stem) {
      files[stem.to_owned()] = @json.parse(
        buffer_text(@archive.read_file(directory + "/" + file)),
      )
    }
  }
  { files, }
}

///|
fn EditableCatalog::rows(
  self : EditableCatalog,
  collection : String,
) -> Array[Json] {
  match self.files.get(collection) {
    Some(Array(rows)) => rows
    _ => []
  }
}

///|
fn EditableCatalog::find(self : EditableCatalog, e : Raw) -> Int32? {
  let k = str(e, "collection")
  let rows = self.rows(k)
  let slot = get(e, "index")
  if collidable(k) && exists(slot) {
    let i : Int32 = slot.cast()
    return match rows.get(i) {
      Some({ "id": String(id), .. }) if id == str(e, "id") => Some(i)
      _ => None
    }
  }
  let key = if k == "barriers" { "circuitKey" } else { "id" }
  let id = Json::string(str(e, "key"))
  for i, row in rows {
    if row is Object(record) && record.get(key) == Some(id) {
      return Some(i)
    }
  }
  None
}

///|
/// Record links once per referring object, including the prefixes of circuit keys.
/// A reference to the current entity itself is omitted in the delete dialog.
fn EditableCatalog::references(
  self : EditableCatalog,
) -> Map[String, Array[String]] {
  let sources = if @archive.exists("simulation") {
    [
      for file in @archive.list_files("simulation") if file.has_suffix(".mbt") &&
      !file.contains("generated") &&
      !file.contains("_test") &&
      !file.contains("_wbtest") => {
        (file, buffer_text(@archive.read_file("simulation/" + file)))
      }
    ]
  } else {
    []
  }
  let targets : Map[String, Array[(String, Int32)]] = Map([])
  let result : Map[String, Set[String]] = Map([])
  for k in ["enemies", "controls", "pickups"] {
    for i, row in self.rows(k) {
      if row is { "id": String(id), .. } {
        targets.get_or_init(id, () => []).push((k, i))
        result[k + ":" + id] = Set([])
      }
    }
  }
  for lib, entries in self.files {
    guard entries is Array(rows) else { continue }
    for index, row in rows {
      let label = lib +
        ": " +
        (match row {
          { "id": String(id), .. } => id
          _ => "unnamed"
        })
      fn record(id : String) {
        if targets.get(id) is Some(matches) {
          for target in matches {
            if target != (lib, index) {
              result[target.0 + ":" + id].add(label)
            }
          }
        }
      }
      fn scan(value : Json) {
        match value {
          String(s) => {
            record(s)
            for i in 0..<s.length() {
              if s[i] == ':' {
                record(s[:i].to_owned())
              }
            }
          }
          Array(a) =>
            for child in a {
              scan(child)
            }
          Object(m) =>
            for key, child in m {
              if key != "id" {
                scan(child)
              }
            }
          _ => ()
        }
      }
      scan(row)
    }
  }
  let circuits = Set::from_iter(
    self
    .rows("circuits")
    .iter()
    .filter_map(row => {
      match row {
        { "id": String(id), .. } => Some(id)
        _ => None
      }
    }),
  )
  for id, owners in targets {
    let query = Json::string(id).stringify(escape_slash=false)
    for owner in owners {
      let references = result[owner.0 + ":" + id]
      if circuits.contains(id) {
        references.add("circuits: " + id)
      }
      for entry in sources {
        if entry.1.contains(query) {
          references.add("simulation/" + entry.0)
        }
      }
    }
  }
  result.map((_, v) => v.to_array())
}
