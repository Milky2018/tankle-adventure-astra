///|
using @model {type Raw, str, exists}

///|
extern "js" fn rename(a : String, b : String) -> @js_async.Promise[Unit] =
  #| (a,b)=>process.getBuiltinModule("node:fs/promises").rename(a,b)

///|
fn temp_name(path : String) -> String raise {
  guard @env.rand(16) is Some(random) else {
    raise Failure("Cannot generate a temporary file name")
  }
  path + "." + @hex.encode(random)
}

///|
#external
priv type OutputFile

///|
extern "js" fn open_new(path : String) -> @js_async.Promise[OutputFile] =
  #| p=>process.getBuiltinModule("node:fs/promises").open(p,"wx")

///|
extern "js" fn OutputFile::close(self : OutputFile) -> @js_async.Promise[Unit] =
  #| file=>file.close()

///|
extern "js" fn OutputFile::write(
  self : OutputFile,
  text : String,
) -> @js_async.Promise[Unit] =
  #| (file,text)=>file.writeFile(text)

///|
extern "js" fn max_string_length() -> Int32 = "()=>process.getBuiltinModule('buffer').constants.MAX_STRING_LENGTH"

///|
async fn write_project(path : String, p : Raw) -> Unit {
  @fs.create_dir(@path.Path(path).dirname().to_string())
  let temp = temp_name(path)
  let scene = p.get("scene")
  let head = @archive.copy(p)
  let library = @archive.copy(scene)
  @archive.remove(head, "scene")
  @archive.remove(library, "geometries")
  library.set("geometries", Raw::from_json([]))
  head.set("scene", library)
  let file = open_new(temp).wait()
  defer (if @fs.path_exists(temp) { @fs.remove_file(temp) })
  {
    defer @async.protect_from_cancel(() => file.close().wait())
    let s = @archive.stringify(head)
    file.write(s[:s.length() - 3].to_owned()).wait()
    for i, g in @model.array(scene, "geometries") {
      if i > 0 {
        file.write(",").wait()
      }
      file.write(@archive.stringify(g)).wait()
    }
    file.write("]}}").wait()
  }
  rename(temp, path).wait()
}

///|
fn parse_bytes(data : BytesView) -> Raw raise {
  @archive.parse(@utf8.decode_lossy(data, ignore_bom=true))
}

///|
/// Full-city geometry libraries can exceed Node's maximum string size.
/// Scan the top-level scene geometry array, then parse one record at a time.
fn read_project(path : String) -> Raw raise {
  let chars = @fs.read_file_to_bytes(path)
  let n = chars.length()
  if n <= max_string_length() {
    return parse_bytes(chars)
  }
  fn space(start : Int32) -> Int32 {
    let mut i = start
    while i < n && chars[i].to_int() is (9 | 10 | 13 | 32) {
      i += 1
    }
    i
  }
  fn quote(start : Int32) -> Int32 raise {
    let mut i = start + 1
    while i < n {
      match chars[i].to_int() {
        34 => return i
        92 => i += 2
        _ => i += 1
      }
    }
    raise Failure("Unterminated string in editor project")
  }
  let mut at = 0
  let mut depth = 0
  let mut scene_start = -1
  while at < n {
    match chars[at].to_int() {
      123 | 91 => depth += 1
      125 | 93 => {
        depth -= 1
        if depth < 2 {
          scene_start = -1
        }
      }
      34 => {
        let key_start = at
        at = quote(at)
        if depth <= 2 && at - key_start <= 12 {
          let colon = space(at + 1)
          if colon < n && chars[colon] == 58 {
            let key = @utf8.decode_lossy(chars[key_start + 1:at])
            let start = space(colon + 1)
            if start < n && depth == 1 && key == "scene" && chars[start] == 123 {
              scene_start = start
            }
            if start < n &&
              depth == 2 &&
              scene_start >= 0 &&
              key == "geometries" &&
              chars[start] == 91 {
              let geos = []
              let mut begin = start + 1
              let mut nested = 0
              let mut i = begin
              while i < n {
                match chars[i].to_int() {
                  34 => i = quote(i)
                  44 if nested == 0 => {
                    geos.push(parse_bytes(chars[begin:i]))
                    begin = i + 1
                  }
                  93 if nested == 0 => {
                    if space(begin) != i || !geos.is_empty() {
                      geos.push(parse_bytes(chars[begin:i]))
                    }
                    let project = @archive.parse(
                      @utf8.decode_lossy(chars[:start], ignore_bom=true) +
                      "[]" +
                      @utf8.decode_lossy(chars[i + 1:], ignore_bom=true),
                    )
                    project
                    .get("scene")
                    .set("geometries", Raw::from_array(geos[:]))
                    return project
                  }
                  123 | 91 => nested += 1
                  125 | 93 => nested -= 1
                  _ => ()
                }
                i += 1
              }
              raise Failure("Unterminated geometry library in editor project")
            }
          }
        }
      }
      _ => ()
    }
    at += 1
  }
  raise Failure("Large editor project has no geometry library")
}

///|
fn make_templates() -> Unit raise {
  let definitions = @archive.items(
    @archive.parse(@fs.read_file_to_string("content/editor/templates.json")),
  )
  let project = @model.export_project()
  let scene = project.get("scene")
  let root = scene.get("object")
  let chosen = []
  let seen = Set([])
  for d in definitions {
    let objects = @model.children(root)
    guard objects
      .iter()
      .filter(n => {
        str(@model.entity(n), "collection") == str(d, "collection") &&
        str(@model.entity(n), "id") == str(d, "source")
      })
      .head()
      is Some(template) else {
      raise Failure(
        "Missing template source " +
        str(d, "collection") +
        ":" +
        str(d, "source"),
      )
    }
    for n in @model.entity_bundle(root, template).objects {
      if !seen.contains(@model.uuid(n)) {
        seen.add(@model.uuid(n))
        chosen.push(n)
      }
    }
  }
  let selected = @archive.copy(root)
  selected.set("children", Raw::from_array(chosen[:]))
  selected.set("userData", Raw::object())
  @archive.write_json_gz(
    "content/editor/templates.scene.json.gz",
    @archive.select_resources(scene, selected),
  )
  println(
    "Prepared " +
    definitions.length().to_string() +
    " independent object templates.",
  )
}
