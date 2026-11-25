///|
using @model {type Raw, exists}

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
/// Keep individual native JSON operations well below V8's single-string limit.
const JSON_CHUNK = 1048576

///|
priv struct JsonOutput {
  write : async (String) -> Unit
  text : StringBuilder
  mut size : Int32
}

///|
async fn JsonOutput::flush(self : JsonOutput) -> Unit {
  if self.size > 0 {
    (self.write)(self.text.to_string())
    self.text.reset()
    self.size = 0
  }
}

///|
async fn JsonOutput::add(self : JsonOutput, text : String) -> Unit {
  self.text.write_string(text)
  self.size += text.length()
  if self.size >= JSON_CHUNK {
    self.flush()
  }
}

///|
async fn JsonOutput::quoted(self : JsonOutput, text : String) -> Unit {
  if text.length() <= JSON_CHUNK {
    self.add(@archive.stringify(Raw::of(text)))
    return
  }
  self.add("\"")
  let mut token_bytes = 2
  for i = 0; i < text.length(); {
    let mut end = (i + JSON_CHUNK).min(text.length())
    if end < text.length() &&
      text[end].to_int() is (0xDC00..<=0xDFFF) &&
      text[end - 1].to_int() is (0xD800..<=0xDBFF) {
      end += 1
    }
    let part = @archive.stringify(Raw::of(text[i:end].to_owned()))
    let escaped = part[1:part.length() - 1]
    let size = @utf8.encode(escaped).length()
    guard size <= max_string_length() - token_bytes else {
      raise Failure(
        "A single editor JSON value exceeds the JavaScript string limit",
      )
    }
    token_bytes += size
    self.add(escaped.to_owned())
    continue end
  }
  self.add("\"")
}

///|
async fn JsonOutput::value(self : JsonOutput, value : Raw) -> Unit {
  if @archive.is_array(value) {
    self.add("[")
    let items = @archive.items(value)
    for i = 0; i < items.length(); {
      if i > 0 {
        self.add(",")
      }
      if @archive.is_number(items[i]) {
        // Native serialization of slices preserves numeric precision and avoids
        // one write per vertex component in large BufferGeometry attributes.
        let mut end = i + 1
        while end < (i + 32768).min(items.length()) &&
              @archive.is_number(items[end]) {
          end += 1
        }
        let part = @archive.stringify(Raw::from_array(items[i:end]))
        self.add(part[1:part.length() - 1].to_owned())
        continue end
      } else {
        self.value(items[i])
        continue i + 1
      }
    }
    self.add("]")
  } else if @archive.is_string(value) {
    self.quoted(value.cast())
  } else if value.is_null() || value.is_undefined() {
    self.add("null")
  } else if @archive.is_number(value) ||
    value.strict_equal(Raw::of(true)) ||
    value.strict_equal(Raw::of(false)) {
    self.add(@archive.stringify(value))
  } else {
    self.add("{")
    let mut comma = false
    for key in @archive.keys(value) {
      let field = value.get(key)
      if field.is_undefined() {
        continue
      }
      if comma {
        self.add(",")
      }
      self.quoted(key)
      self.add(":")
      self.value(field)
      comma = true
    }
    self.add("}")
  }
}

///|
async fn write_project(path : String, project : Raw) -> Unit {
  @fs.create_dir(@path.Path(path).dirname().to_string())
  let temp = temp_name(path)
  let file = open_new(temp).wait()
  defer (if @fs.path_exists(temp) { @fs.remove_file(temp) })
  {
    defer @async.protect_from_cancel(() => file.close().wait())
    let output : JsonOutput = {
      write: async fn(text) { file.write(text).wait() },
      text: StringBuilder(),
      size: 0,
    }
    output.value(project)
    output.flush()
  }
  @node.rename(temp, path)
}

///|
fn decode_json_bytes(data : BytesView) -> String raise {
  @utf8.decode(data) catch {
    _ => raise Failure("Invalid UTF-8 in editor project")
  }
}

///|
fn space(c : Byte) -> Bool {
  c is (b' ' | b'\t' | b'\n' | b'\r')
}

///|
#module("node:fs")
extern "js" fn open_input(path : String, mode : String) -> Int32 = "openSync"

///|
#module("node:fs")
extern "js" fn close_input(fd : Int32) -> Unit = "closeSync"

///|
extern "js" fn input_size(fd : Int32) -> Double =
  #| fd=>process.getBuiltinModule("node:fs").fstatSync(fd).size

///|
#module("node:fs")
extern "js" fn read_at(
  fd : Int32,
  data : Bytes,
  offset : Int32,
  length : Int32,
  position : Double,
) -> Int32 = "readSync"

///|
fn read_exact(
  fd : Int32,
  data : Bytes,
  length : Int32,
  position : Int64,
) -> Unit raise {
  let mut offset = 0
  @node.checked(() => {
    while offset < length {
      let count = read_at(
        fd,
        data,
        offset,
        length - offset,
        position.to_double() + offset.to_double(),
      )
      if count == 0 {
        break
      }
      offset += count
    }
  })
  guard offset == length else {
    raise Failure("Unexpected end of editor project")
  }
}

///|
const PARSE_CHUNK = 4194304

///|
priv struct ProjectInput {
  read : (Int64, Int32, Bytes?) -> BytesView raise
  size : Int64
  mut window : BytesView
  mut offset : Int64
}

///|
/// Keep only one reusable window while locating complete JSON fragments. File
/// positions are 64-bit; only offsets within an individual window are narrowed.
fn ProjectInput::at(self : ProjectInput, position : Int64) -> Int32 raise {
  let length = self.window.length().to_int64()
  if position < self.offset || position >= self.offset + length {
    let width = JSON_CHUNK.to_int64()
    self.offset = position / width * width
    self.window = (self.read)(
      self.offset,
      (self.size - self.offset).min(width).to_int(),
      Some(self.window.data()),
    )
  }
  (position - self.offset).to_int()
}

///|
fn ProjectInput::byte(self : ProjectInput, position : Int64) -> Byte raise {
  let i = self.at(position)
  self.window[i]
}

///|
fn ProjectInput::text(
  self : ProjectInput,
  start : Int64,
  end : Int64,
) -> String raise {
  let length = end - start
  guard length <= max_string_length().to_int64() else {
    raise Failure(
      "A single editor JSON value exceeds the JavaScript string limit",
    )
  }
  let n = length.to_int()
  if start >= self.offset &&
    end <= self.offset + self.window.length().to_int64() {
    let i = (start - self.offset).to_int()
    decode_json_bytes(self.window[i:i + n])
  } else {
    decode_json_bytes((self.read)(start, n, None))
  }
}

///|
/// Ignore nested/quoted delimiters across windows. JSON.parse validates every
/// complete fragment, including all number, escape and member-name syntax.
fn ProjectInput::separator(
  self : ProjectInput,
  start : Int64,
  end : Int64,
  delimiter : Byte,
) -> Int64 raise {
  let mut depth = 0
  let mut quoted = false
  let mut escaped = false
  for pos = start; pos < end; {
    let first = self.at(pos)
    let limit = (end - self.offset)
      .min(self.window.length().to_int64())
      .to_int()
    for i = first; i < limit; i = i + 1 {
      let byte = self.window[i]
      if quoted {
        if escaped {
          escaped = false
        } else if byte == b'\\' {
          escaped = true
        } else if byte == b'"' {
          quoted = false
        }
      } else {
        match byte {
          b'"' => quoted = true
          b'[' | b'{' => depth += 1
          b'}' | b']' => depth -= 1
          c if depth == 0 && c == delimiter => return self.offset + i.to_int64()
          _ => ()
        }
      }
    }
    continue self.offset + limit.to_int64()
  }
  end
}

///|
/// Define a JSON member even when its name is "__proto__".
extern "js" fn define_member(object : Raw, name : String, value : Raw) -> Unit =
  #| (o,k,v)=>{Object.defineProperty(o,k,{value:v,writable:true,configurable:true,enumerable:true})}

///|
extern "js" fn max_string_length() -> Int32 = "()=>process.getBuiltinModule('node:buffer').constants.MAX_STRING_LENGTH"

///|
fn ProjectInput::parse(
  self : ProjectInput,
  start : Int64,
  end : Int64,
) -> Raw raise {
  if end - start <= PARSE_CHUNK.to_int64() {
    return @archive.parse(self.text(start, end))
  }
  let mut a = start
  let mut b = end
  while a < b && space(self.byte(a)) {
    a += 1
  }
  while b > a && space(self.byte(b - 1)) {
    b -= 1
  }
  if a == b || !(self.byte(a) is (b'{' | b'[')) {
    return @archive.parse(self.text(a, b))
  }
  let object = self.byte(a) == b'{'
  let (opening, closing) = if object { ("{", "}") } else { ("[", "]") }
  guard self.byte(b - 1) == (if object { b'}' } else { b']' }) else {
    raise Failure("Invalid closing delimiter in editor project")
  }
  a += 1
  b -= 1
  while a < b && space(self.byte(a)) {
    a += 1
  }
  while b > a && space(self.byte(b - 1)) {
    b -= 1
  }
  let result = if object { Raw::object() } else { Raw::from_json([]) }
  fn merge(start : Int64, end : Int64) -> Unit raise {
    let group = @archive.parse(opening + self.text(start, end) + closing)
    if object {
      let keys = @archive.keys(group)
      guard !keys.is_empty() else {
        raise Failure("Empty JSON member in editor project")
      }
      for key in keys {
        define_member(result, key, group.get(key))
      }
    } else {
      let items = @archive.items(group)
      guard !items.is_empty() else {
        raise Failure("Empty JSON array element in editor project")
      }
      for item in items {
        @archive.append(result, item)
      }
    }
  }
  let mut group = a
  for i = a; i < b; {
    let end = self.separator(i, b, b',')
    guard i < end else { raise Failure("Empty JSON member in editor project") }
    if end - i > PARSE_CHUNK.to_int64() {
      if group < i {
        merge(group, i - 1)
      }
      if object {
        let colon = self.separator(i, end, b':')
        guard colon < end else {
          raise Failure("Missing JSON member separator")
        }
        let key = self.parse(i, colon)
        guard @archive.is_string(key) else {
          raise Failure("Expected JSON member name")
        }
        define_member(result, key.cast(), self.parse(colon + 1, end))
      } else {
        @archive.append(result, self.parse(i, end))
      }
      group = end + 1
    } else if end == b || end - group >= PARSE_CHUNK.to_int64() {
      merge(group, end)
      group = end + 1
    }
    if end + 1 == b {
      raise Failure("Trailing comma in editor project")
    }
    continue end + 1
  }
  result
}

///|
fn read_project(path : String) -> Raw raise {
  let mut fd = -1
  @node.checked(() => fd = open_input(path, "r"))
  defer @node.checked(() => close_input(fd))
  let mut size : Int64 = 0
  @node.checked(() => size = input_size(fd).to_int64())
  fn read(
    position : Int64,
    length : Int32,
    buffer : Bytes?,
  ) -> BytesView raise {
    let bytes = match buffer {
      Some(bytes) => bytes
      None => Bytes::make(length, 0)
    }
    read_exact(fd, bytes, length, position)
    bytes[:length]
  }
  let length = if size <= PARSE_CHUNK.to_int64() {
    size.to_int()
  } else {
    JSON_CHUNK
  }
  let input : ProjectInput = {
    read,
    size,
    offset: 0,
    window: read(0, length, None),
  }
  input.project()
}

///|
fn ProjectInput::project(self : ProjectInput) -> Raw raise {
  let start = if self.window.has_prefix(b"\xef\xbb\xbf") { 3L } else { 0L }
  self.parse(start, self.size)
}

///|
fn parse_project_value(data : BytesView) -> Raw raise {
  let size = data.length().to_int64()
  let input : ProjectInput = {
    size,
    offset: 0,
    window: data,
    read: (pos, length, _) => data[pos.to_int():pos.to_int() + length],
  }
  input.project()
}

///|
fn make_templates() -> Unit raise {
  let definitions : Array[@model.TemplateDefinition] = @json.from_json(
    @json.parse(@fs.read_file_to_string("content/editor/templates.json")),
  )
  @archive.write_json_gz(
    "content/editor/templates.scene.json.gz",
    @model.export_templates(definitions),
  )
  println(
    "Prepared " +
    definitions.length().to_string() +
    " independent object templates.",
  )
}
