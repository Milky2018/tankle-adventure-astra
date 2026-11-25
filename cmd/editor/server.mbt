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
  moon_process(root, args, InputStream::from_bytes(input), max_transfer_bytes).wait()
}

///|
async fn read_body(input : InputStream) -> Raw {
  let chunks = input.chunks()
  let decoder = Utf8Decoder::new()
  let text = StringBuilder()
  let mut total = 0
  while chunks.next().wait() is { done: false, value: chunk, } {
    guard chunk.length() <= max_transfer_bytes - total else {
      raise Failure("Project exceeds the 256 MB save limit")
    }
    total += chunk.length()
    text.write_string(decoder.decode(chunk).wait())
  }
  text.write_string(decoder.finish().wait())
  @archive.parse(text.to_string())
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
  value : Raw,
  status~ : Int32 = 200,
) -> Unit {
  let encoded = @utf8.encode(@archive.stringify(value))
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
  json(res, q, @archive.obj([("error", Raw::of(msg))]), status~)
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
    ).wait()
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
        let payload = read_body(q.stream())
        let file = "content/abilities.json"
        let current = read_file(file).wait()
        guard str(payload, "revision") == @archive.digest(current) else {
          raise Failure("Skills changed on disk. Reload before saving.")
        }
        let next_text = @model.pretty(payload.get("values")) + "\n"
        let next = @utf8.encode(next_text)
        ignore(
          run_moon(
            s.root,
            ["run", "--quiet", "scripts/tuning.mbtx", "--", "-"],
            input=next,
          ),
        )
        let tmp = temp_name(file)
        defer (if @fs.path_exists(tmp) { @fs.remove_file(tmp) })
        @fs.write_string_to_file(tmp, next_text)
        rename(tmp, file).wait()
        json(
          res,
          q,
          @archive.obj([("revision", Raw::of(@archive.digest(next)))]),
        )
      }
      "/api/build" => {
        ignore(run_moon(cwd(), ["run", "scripts/build.mbtx"]))
        json(res, q, Raw::from_json({ "url": "/play/?chapter=folded" }))
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
      json(
        res,
        q,
        @archive.parse(
          @utf8.decode_lossy(read_file("content/editor/templates.json").wait()),
        ),
      )
    "/api/abilities" => {
      let source = read_file("content/abilities.json").wait()
      json(
        res,
        q,
        @archive.obj([
          ("values", @archive.parse(@utf8.decode_lossy(source))),
          ("revision", Raw::of(@archive.digest(source))),
        ]),
      )
    }
    "/pathtracer/index.module.js" | "/bvh/index.module.js" =>
      send(
        res,
        200,
        "text/javascript",
        read_file(s.root + "/editor/vendor" + path + ".gz").wait(),
        gzip=true,
        cache="no-cache",
      )
    "/editor-ui.js" =>
      send(
        res,
        200,
        "text/javascript",
        read_file(s.root + "/_build/js/release/build/editor/editor.js").wait(),
        cache="no-cache",
      )
    _ => {
      let upstream = s.root + "/.editor/three-r185/"
      for
        route in [
          ("/upstream/", upstream + "editor"),
          ("/build/", upstream + "build"),
          ("/examples/", upstream + "examples"),
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
          if prefix is ("/examples/" | "/build/") {
            ensure_three_file(
              s.root,
              prefix[1:].to_owned() +
              relative.replace_all(old=@path.sep.to_string(), new="/"),
            )
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
      @model.import_project(@model.unpack_scene_transfer(read_body(stdin())))
    _ => raise Failure("Expected GET or POST for scene worker")
  }
  stdout(@archive.compress(@utf8.encode(@archive.stringify(result)))).wait()
}
