///|
#external
priv type Response

///|
extern "js" fn fetch(url : String) -> @js_async.Promise[Response] = "url=>fetch(url)"

///|
extern "js" fn Response::ok(self : Response) -> Bool = "r=>r.ok"

///|
extern "js" fn Response::status(self : Response) -> Int32 = "r=>r.status"

///|
extern "js" fn Response::content_encoding(self : Response) -> String =
  #| r=>r.headers.get('Content-Encoding')??''

///|
extern "js" fn Response::decompress(self : Response) -> Response =
  #| r=>new Response(r.body.pipeThrough(new DecompressionStream('gzip')))

///|
extern "js" fn Response::text(self : Response) -> @js_async.Promise[String] = "r=>r.text()"

///|
extern "js" fn Response::buffer(
  self : Response,
) -> @js_async.Promise[@core.ArrayBuffer] = "r=>r.arrayBuffer()"

///|
extern "js" fn mark(name : String) -> Unit = "name=>performance.mark(name)"

///|
async fn asset(path : String) -> Response {
  let response = fetch(path).wait()
  if !response.ok() {
    raise Failure("Art asset " + path + ": " + response.status().to_string())
  }
  if response.content_encoding().to_lower() == "gzip" {
    response
  } else {
    response.decompress()
  }
}

///|
priv struct SceneBuffers {
  geometry : Map[String, Map[String, @core.TypedArray]]
  images : Map[String, @core.TypedArray]
  instances : Map[String, Map[String, @core.TypedArray]]
}

///|
fn scene_buffers(
  views : @scene_format.PackedViews,
  buffer : @core.ArrayBuffer,
) -> SceneBuffers raise {
  let bytes = buffer.byte_length()
  fn open_view(
    id : String,
    view : @scene_format.BufferView,
  ) -> @core.TypedArray raise {
    let stride = match view.type_name {
      "Uint8Array" | "Uint8ClampedArray" | "Int8Array" => 1
      "Uint16Array" | "Int16Array" => 2
      "Float32Array" | "Uint32Array" | "Int32Array" => 4
      "Float64Array" => 8
      name => raise Failure("Packed view \{id}: unsupported array type \{name}")
    }
    let offset = view.byte_offset
    if offset % stride != 0 {
      raise Failure(
        "Packed view \{id}: byte offset \{offset} is not aligned to \{stride} bytes for \{view.type_name}",
      )
    }
    if offset < 0 ||
      offset > bytes ||
      view.length < 0 ||
      view.length > (bytes - offset) / stride {
      raise Failure(
        "Packed view \{id}: \{view.type_name} at byte \{offset} with \{view.length} elements is outside the \{bytes}-byte buffer",
      )
    }
    let array = @core.TypedArray::view_by_name(
      view.type_name,
      buffer,
      byte_offset=offset,
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
          let tree = group.spawn(() => asset(url).text().wait())
          let binary = group.spawn(() => {
            asset("/generated/art/folded-buffers.bin.gz").buffer().wait()
          })
          let manifest = group.spawn(() => {
            let text = asset("/generated/art/folded-views.json.gz")
              .text()
              .wait()
            @json.from_json(@json.parse(text))
          })
          let scene_text = tree.wait()
          let buffer = binary.wait()
          let views = manifest.wait()
          mark("art-decoded")
          let buffers = scene_buffers(views, buffer)
          mark("art-parse-start")
          let scene = parse_scene(@json.parse(scene_text), buffers)
          mark("art-parsed")
          ready(scene.wait())
          mark("view-created")
        })
      } catch {
        err => failed(err.to_string())
      }
    }),
  )
}
