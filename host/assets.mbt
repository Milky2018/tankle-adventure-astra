///|
#external
priv type Response

///|
extern "js" fn fetch(url : String) -> @js_async.Promise[Response] = "s=>fetch(s)"

///|
extern "js" fn response_ok(r : Response) -> Bool = "r=>r.ok"

///|
extern "js" fn status(r : Response) -> Int32 = "r=>r.status"

///|
extern "js" fn encoded(r : Response) -> Bool = "r=>r.headers.get('Content-Encoding')==='gzip'"

///|
extern "js" fn decompress(r : Response) -> Response =
  #| r=>new Response(r.body.pipeThrough(new DecompressionStream('gzip')))

///|
extern "js" fn read_body(
  r : Response,
  kind : String,
) -> @js_async.Promise[@core.JsValue] = "(r,k)=>r[k]()"

///|
extern "js" fn mark(name : String) -> Unit = "s=>performance.mark(s)"

///|
async fn asset(path : String, kind : String) -> @core.JsValue {
  let response = fetch(path).wait()
  if !response_ok(response) {
    raise Failure("Art asset " + path + ": " + status(response).to_string())
  }
  read_body(
    if encoded(response) {
      response
    } else {
      decompress(response)
    },
    kind,
  ).wait()
}

///|
extern "js" fn keys(obj : @core.JsValue) -> FixedArray[String] = "o=>Object.keys(o)"

///|
extern "js" fn typed_view(
  bin : @core.JsValue,
  spec : @core.JsValue,
) -> @core.JsValue =
  #| (buffer,s)=>new globalThis[s.type](buffer,s.byteOffset,s.length)

///|
extern "js" fn copy_view(view : @core.JsValue) -> @core.JsValue = "v=>v.slice()"

///|
fn unpack(bin : @core.JsValue, table : @core.JsValue) -> Unit {
  for name in keys(table) {
    let spec = table.get(name)
    let view = typed_view(bin, spec)
    table.set(
      name,
      if spec.get("copy").cast() {
        copy_view(view)
      } else {
        view
      },
    )
  }
}

///|
extern "js" fn textures_loaded(
  start : (() -> Unit) -> Unit,
) -> @js_async.Promise[Unit] = "f=>new Promise(f)"

///|
pub fn load_scene(
  url : String,
  ready : (@core.Object3D) -> Unit,
  failed : (String) -> Unit,
) -> Unit {
  ignore(
    @js_async.Promise::from_async(async fn() {
      try {
        mark("art-start")
        @async.with_task_group(group => {
          let tree = group.spawn(() => asset(url, "text"))
          let binary = group.spawn(() => {
            asset("/generated/art/folded-buffers.bin.gz", "arrayBuffer")
          })
          let manifest = group.spawn(() => {
            asset("/generated/art/folded-views.json.gz", "json")
          })
          let text : String = tree.wait().cast()
          let bin = binary.wait()
          let views = manifest.wait()
          mark("art-decoded")
          if views.get("instances").is_undefined() {
            views.set("instances", @core.JsValue::object())
          }
          for name in ["geometry", "instances"] {
            let table = views.get(name)
            for id in keys(table) {
              unpack(bin, table.get(id))
            }
          }
          unpack(bin, views.get("images"))
          mark("art-parse-start")
          let mut scene = None
          let textures = textures_loaded(fn(done) {
            scene = Some(parse_scene(text, views, done))
          })
          mark("art-parsed")
          textures.wait()
          ready(scene.unwrap())
          mark("view-created")
        })
      } catch {
        err => failed(err.to_string())
      }
    }),
  )
}
