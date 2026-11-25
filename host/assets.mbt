///|
#external
priv type Response

///|
extern "js" fn fetch(url : String) -> @js_async.Promise[Response] = "fetch"

///|
extern "js" fn Response::status(self : Response) -> Int32 = "r=>r.status"

///|
extern "js" fn Response::has_encoding(self : Response) -> Bool = "r=>r.headers.has('Content-Encoding')"

///|
extern "js" fn Response::content_encoding(self : Response) -> String =
  #| r=>r.headers.get('Content-Encoding')

///|
extern "js" fn Response::gunzip(self : Response) -> Response =
  #| r=>new Response(r.body.pipeThrough(new DecompressionStream('gzip')))

///|
extern "js" fn Response::text(self : Response) -> @js_async.Promise[String] = "r=>r.text()"

///|
extern "js" fn Response::buffer(
  self : Response,
) -> @js_async.Promise[@core.ArrayBuffer] = "r=>r.arrayBuffer()"

///|
pub extern "js" fn mark(name : String) -> Unit = "name=>performance.mark(name)"

///|
async fn asset(path : String) -> Response {
  let response = fetch(path).wait()
  let status = response.status()
  if !(status is (200..<300)) {
    raise Failure("Art asset " + path + ": " + status.to_string())
  }
  // Fetch removes HTTP Content-Encoding. Static hosts can instead serve the
  // gzip file as ordinary bytes, which must be decompressed while streaming.
  if response.has_encoding() &&
    response
    .content_encoding()
    .split(",")
    .any(c => c.trim().to_lower() == "gzip") {
    response
  } else {
    response.gunzip()
  }
}

///|
fn scene_buffers(
  views : @scene_format.PackedViews,
  buffer : @core.ArrayBuffer,
) -> @loader.Buffers raise {
  let bytes = buffer.byte_length()
  fn open_view(
    id : String,
    view : @scene_format.BufferView,
  ) -> @core.TypedArray raise {
    view.check_range(bytes, id~)
    let array = @core.TypedArray::view_by_name(
      view.type_name,
      buffer,
      byte_offset=view.byte_offset,
      length=view.length,
    )
    if view.copy {
      array.clone()
    } else {
      array
    }
  }
  fn attributes(
    id : String,
    slots : Map[String, @scene_format.BufferView],
  ) -> Map[String, @core.TypedArray] raise {
    slots.map((name, view) => open_view(id + "/" + name, view))
  }
  {
    geometry: views.geometry.map(attributes),
    images: views.images.map(open_view),
    instances: views.instances.map(attributes),
  }
}

///|
pub async fn load_scene(url : String) -> @core.Object3D {
  mark("art-start")
  let mut result = None
  @async.with_task_group(group => {
    let tree = group.spawn(() => asset(url).text().wait())
    let binary = group.spawn(() => {
      asset("/generated/art/folded-buffers.bin.gz").buffer().wait()
    })
    let manifest = group.spawn(() => {
      @json.from_json(
        @json.parse(asset("/generated/art/folded-views.json.gz").text().wait()),
      )
    })
    let scene_text = tree.wait()
    let buffer = binary.wait()
    let views = manifest.wait()
    mark("art-decoded")
    let buffers = scene_buffers(views, buffer)
    mark("art-parse-start")
    result = Some(
      buffers.parse(@json.parse(scene_text), on_parsed=() => mark("art-parsed")),
    )
  })
  result.unwrap()
}
