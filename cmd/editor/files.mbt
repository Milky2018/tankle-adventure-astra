///|
using @model {type Raw, str, exists, call}

///|
extern "js" fn dirname(path : String) -> String = "p=>process.getBuiltinModule('path').dirname(p)"

///|
extern "js" fn rename(a : String, b : String) -> Unit = "(a,b)=>process.getBuiltinModule('fs').renameSync(a,b)"

///|
extern "js" fn temp_name(path : String) -> String = "p=>p+'.'+crypto.randomUUID()"

///|
extern "js" fn open_new(path : String) -> Int32 = "p=>process.getBuiltinModule('fs').openSync(p,'wx')"

///|
extern "js" fn close_file(fd : Int32) -> Unit = "fd=>process.getBuiltinModule('fs').closeSync(fd)"

///|
extern "js" fn write_fd(fd : Int32, s : String) -> Unit = "(fd,s)=>process.getBuiltinModule('fs').writeFileSync(fd,s)"

///|
extern "js" fn max_string_length() -> Int32 = "()=>process.getBuiltinModule('buffer').constants.MAX_STRING_LENGTH"

///|
extern "js" fn slice(buf : Raw, start : Int32, end : Int32) -> Raw = "(b,s,e)=>b.subarray(s,e)"

///|
extern "js" fn bytes(text : String) -> Raw = "s=>Buffer.from(s)"

///|
fn write_project(path : String, p : Raw) -> Unit {
  @archive.mkdir(dirname(path))
  let temp = temp_name(path)
  defer (if @archive.exists(temp) { @archive.unlink(temp) })
  let scene = p.get("scene")
  let head = @archive.copy(p)
  let library = @archive.copy(scene)
  @archive.remove(head, "scene")
  @archive.remove(library, "geometries")
  library.set("geometries", Raw::from_json([]))
  head.set("scene", library)
  {
    let fd = open_new(temp)
    defer close_file(fd)
    let s = @archive.stringify(head)
    write_fd(fd, s[:s.length() - 3].to_owned())
    for i, g in @model.array(scene, "geometries") {
      if i > 0 {
        write_fd(fd, ",")
      }
      write_fd(fd, @archive.stringify(g))
    }
    write_fd(fd, "]}}")
  }
  rename(temp, path)
}

///|
/// Full-city geometry libraries can exceed Node's maximum string size.
/// Scan the top-level scene geometry array, then parse one record at a time.
fn read_project(path : String) -> Raw raise {
  let buf = @archive.read_file(path)
  let chars : FixedArray[Int32] = buf.cast()
  let n = chars.length()
  if n <= max_string_length() {
    return @archive.parse(buf)
  }
  fn space(start : Int32) -> Int32 {
    let mut i = start
    while i < n && chars[i] is (9 | 10 | 13 | 32) {
      i += 1
    }
    i
  }
  fn quote(start : Int32) -> Int32 raise {
    let mut i = start + 1
    while i < n {
      match chars[i] {
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
    match chars[at] {
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
            let key = @model.buffer_text(slice(buf, key_start + 1, at))
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
                match chars[i] {
                  34 => i = quote(i)
                  44 if nested == 0 => {
                    geos.push(@archive.parse(slice(buf, begin, i)))
                    begin = i + 1
                  }
                  93 if nested == 0 => {
                    if space(begin) != i || !geos.is_empty() {
                      geos.push(@archive.parse(slice(buf, begin, i)))
                    }
                    let project = @archive.parse(
                      @archive.concat([
                        slice(buf, 0, start),
                        bytes("[]"),
                        slice(buf, i + 1, n),
                      ]),
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
    @archive.parse(@archive.read_file("content/editor/templates.json")),
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
    for n in @model.entity_bundle(root, template) {
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
