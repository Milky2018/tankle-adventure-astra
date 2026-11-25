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
  source : Bytes,
) -> @loader.Buffers raise {
  let bytes = buffer.byte_length()
  let decoded : Map[Int32, @core.TypedArray] = Map([])
  fn open_view(
    id : String,
    view : @scene_format.BufferView,
  ) -> @core.TypedArray raise {
    view.check_range(
      if view.recipe_bytes == 0 {
        bytes
      } else {
        source.length()
      },
      id~,
      packed=true,
    )
    let array = if view.recipe_bytes == 0 {
      @core.TypedArray::view_by_name(
        view.type_name,
        buffer,
        byte_offset=view.byte_offset,
        length=view.length,
      )
    } else if decoded.get(view.byte_offset) is Some(value) {
      value
    } else {
      let width = @scene_format.element_width(view.type_name).unwrap()
      let recipe = @geometry.Recipe::parse(
        source[view.byte_offset:view.byte_offset + view.recipe_bytes],
        size=view.length * width,
      )
      let restored : @core.TypedArray = @core.JsValue::of(recipe.expand()).cast()
      let value = @core.TypedArray::view_by_name(
        view.type_name,
        restored.buffer(),
        byte_offset=restored.byte_offset(),
        length=view.length,
      )
      decoded[view.byte_offset] = value
      value
    }
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
    let views : @scene_format.PackedViews = manifest.wait()
    // Old baked scenes have only literal geometry. New recipes occupy a separate
    // backing store so that live GPU attributes cannot retain their ingredients.
    let recipes : Bytes = if views.geometry
      .values()
      .any(slots => slots.values().any(v => v.recipe_bytes > 0)) {
      let data = asset("/generated/art/folded-recipes.bin.gz").buffer().wait()
      @core.TypedArray::view_by_name("Uint8Array", data).to_js_init().cast()
    } else {
      b""
    }
    let scene_text = tree.wait()
    let buffer = binary.wait()
    mark("art-decoded")
    let buffers = scene_buffers(views, buffer, recipes)
    mark("art-parse-start")
    result = Some(
      buffers.parse(@json.parse(scene_text), on_parsed=() => mark("art-parsed")),
    )
  })
  result.unwrap()
}
