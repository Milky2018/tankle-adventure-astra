///|
struct Server {
  root : String
  mut busy : Bool
}

///|
extern "js" fn listen(
  port : Int32,
  handler : (Raw, Raw) -> @js_async.Promise[Unit],
  ready : (Int32) -> Unit,
) -> Unit =
  #| (p,handle,ready)=>{const s=process.getBuiltinModule('http').createServer((q,r)=>handle(q,r));s.listen(p,'127.0.0.1',()=>ready(s.address().port))}

///|
extern "js" fn port() -> Int32 = "()=>Number(process.env.EDITOR_PORT??5176)"

///|
extern "js" fn run_moon(
  root : String,
  args : FixedArray[String],
  input : Raw,
  stream : Bool,
) -> @js_async.Promise[Raw] =
  #| (cwd,args,input,stream)=>new Promise((resolve,reject)=>{
  #| const child=process.getBuiltinModule('child_process').execFile('moon',args,{cwd,encoding:'buffer',maxBuffer:256*1024*1024},(e,out,err)=>e?reject(new Error(err.toString().trim()||e.message)):resolve(out));
  #| child.stdin.on('error',e=>{if(e.code!=='EPIPE')child.kill()});
  #| if(stream){input.once('aborted',()=>child.kill());input.pipe(child.stdin)}else child.stdin.end(input)
  #| })

///|
extern "js" fn iterator(stream : Raw) -> Raw = "s=>s[Symbol.asyncIterator]()"

///|
extern "js" fn next_chunk(it : Raw) -> @js_async.Promise[Raw] = "i=>i.next()"

///|
extern "js" fn read_file(path : String) -> @js_async.Promise[Raw] = "p=>process.getBuiltinModule('fs/promises').readFile(p)"

///|
extern "js" fn js_call(f : () -> Raw) -> @js_async.Promise[Raw] = "f=>Promise.resolve().then(f)"

///|
extern "js" fn url_path(s : String) -> String = "s=>new URL(s,'http://localhost').pathname"

///|
extern "js" fn resolve(dir : String, path : String) -> String = "(d,p)=>process.getBuiltinModule('path').resolve(d,p)"

///|
extern "js" fn decode(s : String) -> String = "s=>decodeURIComponent(s)"

///|
extern "js" fn is_file(path : String) -> Bool = "p=>process.getBuiltinModule('fs').statSync(p,{throwIfNoEntry:false})?.isFile()??false"

///|
extern "js" fn stdin() -> Raw = "()=>process.stdin"

///|
extern "js" fn stdout(b : Raw) -> Unit = "b=>process.stdout.write(b)"

///|
async fn read_body(stream : Raw) -> Raw {
  let chunks = []
  let iter = iterator(stream)
  let mut total = 0
  while true {
    let n = next_chunk(iter).wait()
    if @model.truth(n, "done") {
      break
    }
    let chunk = n.get("value")
    let size : Int32 = chunk.get("length").cast()
    total += size
    guard total <= 256 * 1024 * 1024 else {
      raise Failure("Project exceeds the 256 MB save limit")
    }
    chunks.push(chunk)
  }
  let buf = @archive.concat(FixedArray::from_array(chunks[:]))
  js_call(() => @archive.parse(buf)).wait()
}

///|
fn send(
  res : Raw,
  status : Int32,
  mime : String,
  body : Raw,
  cache~ : String = "no-store",
  gzip~ : Bool = false,
) -> Unit {
  let h = @archive.obj([
    ("Content-Type", Raw::of(mime)),
    ("Cache-Control", Raw::of(cache)),
  ])
  if gzip {
    h.set("Content-Encoding", Raw::of("gzip"))
  }
  ignore(call(res, "writeHead", [Raw::of(status), h]))
  ignore(call(res, "end", [body]))
}

///|
fn json(res : Raw, req : Raw, value : Raw, status~ : Int32 = 200) -> Unit {
  let b = bytes(@archive.stringify(value))
  let length : Int32 = b.get("length").cast()
  let gzip = length > 4096 &&
    str(req.get("headers"), "accept-encoding").contains("gzip")
  send(
    res,
    status,
    "application/json",
    if gzip {
      @archive.gzip(b)
    } else {
      b
    },
    gzip~,
  )
}

///|
fn problem(res : Raw, q : Raw, status : Int32, msg : String) -> Unit {
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
async fn Server::handle(s : Server, q : Raw, res : Raw) -> Unit {
  let path = js_call(() => Raw::of(url_path(str(q, "url")))).wait().cast()
  let verb = str(q, "method")
  let h = q.get("headers")
  if verb == "POST" && str(h, "origin") != "http://" + str(h, "host") {
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
    let stream = verb == "POST"
    let result = run_moon(
      s.root,
      ["run", "--quiet", "cmd/editor", "--", "scene-worker", verb, cwd()],
      if stream {
        q
      } else {
        Raw::undefined()
      },
      stream,
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
        let payload = read_body(q)
        let file = "content/abilities.json"
        let current = read_file(file).wait()
        guard str(payload, "revision") == @archive.digest(current) else {
          raise Failure("Skills changed on disk. Reload before saving.")
        }
        let next = Raw::of(@model.pretty(payload.get("values")) + "\n")
        ignore(
          run_moon(
            s.root,
            ["run", "--quiet", "scripts/tuning.mbtx", "--", "-"],
            next,
            false,
          ).wait(),
        )
        let tmp = temp_name(file)
        defer (if @archive.exists(tmp) { @archive.unlink(tmp) })
        @archive.write_file(tmp, next)
        rename(tmp, file)
        json(
          res,
          q,
          @archive.obj([("revision", Raw::of(@archive.digest(next)))]),
        )
      }
      "/api/build" => {
        ignore(
          run_moon(
            cwd(),
            ["run", "scripts/build.mbtx"],
            Raw::undefined(),
            false,
          ).wait(),
        )
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
        @archive.parse(read_file("content/editor/templates.json").wait()),
      )
    "/api/abilities" => {
      let source = read_file("content/abilities.json").wait()
      json(
        res,
        q,
        @archive.obj([
          ("values", @archive.parse(source)),
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
          let rel : String = js_call(() => Raw::of(decode(suffix.to_owned())))
            .wait()
            .cast()
          let root = resolve(dir, "")
          let file = resolve(
            root,
            if rel.is_empty() {
              "index.html"
            } else {
              rel
            },
          )
          guard file.has_prefix(root + "/") else {
            problem(res, q, 403, "Invalid path")
            return
          }
          if prefix is ("/examples/" | "/build/") {
            ensure_three_file(
              s.root,
              prefix[1:].to_owned() + file[root.length() + 1:].to_owned(),
            )
          }
          guard is_file(file) else {
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
fn serve(root : String) -> Unit {
  let s : Server = { root, busy: false, }
  listen(
    port(),
    (q, res) => {
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
    },
    p => println("Project editor: http://127.0.0.1:" + p.to_string()),
  )
}

///|
async fn scene_worker(verb : String) -> Unit {
  let result = match verb {
    "GET" => @model.pack_scene_transfer(@model.export_project(colliders=true))
    "POST" =>
      @model.import_project(@model.unpack_scene_transfer(read_body(stdin())))
    _ => raise Failure("Expected GET or POST for scene worker")
  }
  stdout(@archive.gzip(Raw::of(@archive.stringify(result))))
}
