///|
struct Server {
  root : String
  mut busy : Bool
}

///|
fn port() -> Int32 raise {
  let text = @env.get_env_var("EDITOR_PORT").unwrap_or("5176").trim()
  if text.is_empty() {
    return 0
  }
  let value = @string.parse_int(text) catch { _ => -1 }
  guard value >= 0 && value <= 65535 else {
    raise Failure("Invalid editor port: \{text}")
  }
  value
}

///|
let max_transfer_bytes : Int32 = 256 * 1024 * 1024

///|
async fn run_moon(
  root : String,
  args : FixedArray[String],
  input~ : Bytes = b"",
) -> Bytes {
  moon_process(root, args, InputStream::from_bytes(input), max_transfer_bytes)
}

///|
async fn read_body(input : InputStream) -> BytesView {
  let chunks = input.chunks()
  let parts : Array[Bytes] = []
  let mut total = 0
  while chunks.next().wait() is { done: false, value: chunk, } {
    guard chunk.length() <= max_transfer_bytes - total else {
      raise Failure("Project exceeds the 256 MB save limit")
    }
    total += chunk.length()
    parts.push(chunk)
  }
  let body = FixedArray::make(total, b'\x00')
  let mut offset = 0
  for chunk in parts {
    body.blit_from_bytesview(offset, chunk[:])
    offset += chunk.length()
  }
  body.unsafe_reinterpret_as_bytes()[:]
}

///|
fn send(
  res : Response,
  status : Int32,
  mime : String,
  body : Bytes,
  cache~ : String = "no-store",
  gzip~ : Bool = false,
) -> Unit {
  res.header("Content-Type", mime)
  res.header("Cache-Control", cache)
  if gzip {
    res.header("Content-Encoding", "gzip")
  }
  res.finish(status, body)
}

///|
fn json(
  res : Response,
  req : Request,
  value : Json,
  status~ : Int32 = 200,
) -> Unit {
  let encoded = @utf8.encode(value.stringify(escape_slash=false))
  let length = encoded.length()
  let gzip = length > 4096 && req.header("accept-encoding").contains("gzip")
  send(
    res,
    status,
    "application/json",
    if gzip {
      @archive.compress(encoded)
    } else {
      encoded
    },
    gzip~,
  )
}

///|
fn problem(res : Response, q : Request, status : Int32, msg : String) -> Unit {
  json(res, q, { "error": msg }, status~)
}

///|
fn mime_type(path : String) -> String {
  let ext = path.split(".").to_array().last().unwrap_or("").to_owned()
  match ext {
    "html" => "text/html"
    "js" | "mjs" => "text/javascript"
    "css" => "text/css"
    "json" => "application/json"
    "svg" => "image/svg+xml"
    "png" => "image/png"
    "jpg" => "image/jpeg"
    "gz" => "application/gzip"
    "woff2" => "font/woff2"
    "mp3" => "audio/mpeg"
    "ogg" => "audio/ogg"
    "webm" => "audio/webm"
    _ => "application/octet-stream"
  }
}

///|
async fn Server::handle(s : Server, q : Request, res : Response) -> Unit {
  let path = pathname(q.url()).wait()
  let verb = q.http_method()
  if verb == "POST" && q.header("origin") != "http://" + q.header("host") {
    problem(
      res, q, 403, "Open the editor from its localhost address before saving",
    )
    return
  }
  if verb is ("POST" | "GET") && path == "/api/scene" {
    guard !s.busy else {
      problem(
        res, q, 409, "Another scene operation, save or build is in progress",
      )
      return
    }
    s.busy = true
    defer {
      s.busy = false
    }
    let input = if verb == "POST" {
      q.stream()
    } else {
      InputStream::from_bytes(b"")
    }
    let result = moon_process(
      s.root,
      ["run", "--quiet", "cmd/editor", "--", "scene-worker", verb, cwd()],
      input,
      max_transfer_bytes,
    )
    send(res, 200, "application/json", result, gzip=true)
    return
  }
  if verb == "POST" {
    guard !s.busy else {
      problem(res, q, 409, "Another save or build is in progress")
      return
    }
    s.busy = true
    defer {
      s.busy = false
    }
    match path {
      "/api/abilities" => {
        let payload = @json.parse(@utf8.decode(read_body(q.stream()))) catch {
          err => raise Failure("Invalid JSON: " + err.to_string())
        }
        guard payload is { "revision": String(revision), "values": values, .. } else {
          raise Failure("Expected ability values and revision")
        }
        let file = "content/abilities.json"
        fn check_current() -> Unit raise {
          guard revision == @archive.digest(@fs.read_file_to_bytes(file)) else {
            raise Failure("Skills changed on disk. Reload before saving.")
          }
        }
        @archive.recover_city_save()
        check_current()
        let next_text = values.stringify(indent=2, escape_slash=false) + "\n"
        let next = @utf8.encode(next_text)
        ignore(
          run_moon(
            s.root,
            ["run", "--quiet", "scripts/tuning.mbtx", "--", "-"],
            input=next,
          ),
        )
        @archive.publish_content(Map([(file, next)]), check_current~)
        json(res, q, { "revision": @archive.digest(next) })
      }
      "/api/build" => {
        ignore(run_moon(cwd(), ["run", "scripts/build.mbtx"]))
        json(res, q, { "url": "/play/?chapter=folded" })
      }
      _ => problem(res, q, 404, "Unknown operation")
    }
    return
  }
  guard verb == "GET" else {
    problem(res, q, 405, "Method not supported")
    return
  }
  match path {
    "/api/templates" =>
      send(
        res,
        200,
        "application/json",
        read_file("content/editor/templates.scene.json.gz").wait(),
        gzip=true,
        cache="no-cache",
      )
    "/api/template-definitions" =>
      send(
        res,
        200,
        "application/json",
        read_file("content/editor/templates.json").wait(),
      )
    "/api/abilities" => {
      let source = read_file("content/abilities.json").wait()
      json(res, q, {
        "values": @json.parse(@utf8.decode(source)),
        "revision": @archive.digest(source),
      })
    }
    "/editor-ui.js" =>
      send(
        res,
        200,
        "text/javascript",
        read_file(s.root + "/_build/js/release/build/editor/editor.js").wait(),
        cache="no-cache",
      )
    _ =>
      for
        route in [
          ("/assets/", "dist/assets"),
          ("/generated/", "dist/generated"),
          ("/music/", "dist/music"),
          ("/art/", "dist/art"),
          ("/play/", "dist"),
          ("/", s.root + "/editor"),
        ] {
        let (prefix, dir) = route
        if path.strip_prefix(prefix) is Some(suffix) {
          let rel = @percent.decode(suffix)
          let root = @path.Path(dir).resolve()
          let requested = @path.Path(
            if rel.is_empty() {
              "index.html"
            } else {
              rel
            },
          )
          let target = if requested.is_absolute() {
            requested.normalize()
          } else {
            root.join(requested)
          }
          let file = target.to_string()
          let relative = target.relative(base=root).to_string()
          guard relative != "." &&
            relative != ".." &&
            !relative.has_prefix(".." + @path.sep.to_string()) &&
            !@path.Path(relative).is_absolute() else {
            problem(res, q, 403, "Invalid path")
            return
          }
          guard @fs.path_exists(file) && @fs.is_file(file) else {
            problem(res, q, 404, "Not a file")
            return
          }
          send(
            res,
            200,
            mime_type(file),
            read_file(file).wait(),
            cache="no-cache",
          )
          return
        }
      }
  }
}

///|
async fn serve(root : String) -> Unit {
  let s : Server = { root, busy: false, }
  let port = listen(port(), (q, res) => {
    @js_async.Promise::from_async(async fn() {
      s.handle(q, res) catch {
        err => {
          let message = message(err)
          problem(
            res,
            q,
            if message.contains("ENOENT") {
              404
            } else {
              400
            },
            message,
          )
        }
      }
    })
  }).wait()
  println("Project editor: http://127.0.0.1:" + port.to_string())
}

///|
async fn scene_worker(verb : String) -> Unit {
  let result = match verb {
    "GET" => @model.export_project(colliders=true, transfer=true)
    "POST" =>
      @model.import_project(
        @model.unpack_scene_transfer(
          parse_project_value(read_body(stdin())),
          native_views=true,
        ),
      )
    _ => raise Failure("Expected GET or POST for scene worker")
  }
  let gzip = @gzip.StreamEncoder(WorkerOutput(@io.BinaryWriterController()))
  let json : JsonOutput = {
    write: async fn(text) { gzip.write(@utf8.encode(text)[:]) },
    text: StringBuilder(),
    size: 0,
  }
  json.value(result)
  json.flush()
  gzip.end()
}
