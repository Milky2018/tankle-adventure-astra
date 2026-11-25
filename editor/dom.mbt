///|
using @model {
  type Raw,
  get,
  str,
  exists,
  call,
  truth,
  children,
  data,
  entity,
  uuid,
  binding,
}

///|
extern "js" fn by_id(id : String) -> Raw = "s=>document.getElementById(s)"

///|
extern "js" fn create(tag : String) -> Raw = "s=>document.createElement(s)"

///|
extern "js" fn fragment() -> Raw = "()=>document.createDocumentFragment()"

///|
extern "js" fn window_obj() -> Raw = "()=>window"

///|
extern "js" fn document_body() -> Raw = "()=>document.body"

///|
extern "js" fn new_instance(ctor : Raw, args : FixedArray[Raw]) -> Raw = "(c,args)=>Reflect.construct(c,args)"

///|
extern "js" fn load_module(path : String) -> @js_async.Promise[Raw] = "path=>import(path)"

///|
extern "js" fn promise(v : Raw) -> @js_async.Promise[Raw] = "v=>Promise.resolve(v)"

///|
extern "js" fn frame() -> @js_async.Promise[Unit] = "()=>new Promise(r=>requestAnimationFrame(()=>r()))"

///|
extern "js" fn fetch_url(url : String, options : Raw) -> @js_async.Promise[Raw] = "(url,o)=>fetch(url,o)"

///|
extern "js" fn invoke_async(f : () -> Raw) -> @js_async.Promise[Raw] = "f=>Promise.resolve().then(f)"

///|
extern "js" fn bind_method(o : Raw, k : String) -> Raw = "(o,k)=>o[k].bind(o)"

///|
extern "js" fn apply1(f : Raw, v : Raw) -> Raw = "(f,v)=>f(v)"

///|
extern "js" fn round4(n : Double) -> Double = "v=>Number(v.toFixed(4))"

///|
extern "js" fn js_number(v : Raw) -> Double = "v=>Number(v)"

///|
fn number(o : Raw, k : String) -> Double {
  js_number(get(o, k))
}

///|
fn el(tag : String, label? : String, style? : String) -> Raw {
  let node = create(tag)
  if label is Some(s) {
    node.set("textContent", Raw::of(s))
  }
  if style is Some(s) {
    node.set("className", Raw::of(s))
  }
  node
}

///|
fn append(parent : Raw, child : Raw) -> Unit {
  ignore(call(parent, "append", [child]))
}

///|
fn replace(parent : Raw, children : FixedArray[Raw]) -> Unit {
  ignore(call(parent, "replaceChildren", children))
}

///|
fn attr(n : Raw, k : String, value : String) -> Unit {
  ignore(call(n, "setAttribute", [Raw::of(k), Raw::of(value)]))
}

///|
fn handler(n : Raw, event : String, cb : () -> Unit) -> Unit {
  n.set("on" + event, Raw::of(cb))
}

///|
fn set_text(node : Raw, s : String) -> Unit {
  node.set("textContent", Raw::of(s))
}

///|
fn option(menu : Raw, id : String, label : String) -> Unit {
  let n = el("option", label~)
  n.set("value", Raw::of(id))
  append(menu, n)
}

///|
fn status(message : String, error~ : Bool = false) -> Unit {
  let node = by_id("status")
  set_text(node, message)
  ignore(
    call(node.get("classList"), "toggle", [Raw::of("error"), Raw::of(error)]),
  )
}

///|
async fn api(path : String, body? : Raw) -> Raw {
  let opts = Raw::object()
  if body is Some(value) {
    opts.set("method", Raw::of("POST"))
    opts.set(
      "headers",
      @archive.obj([("Content-Type", Raw::of("application/json"))]),
    )
    opts.set("body", Raw::of(@archive.stringify(value)))
  }
  let response = fetch_url("/api/" + path, opts).wait()
  let result = promise(call(response, "json", [])).wait()
  guard truth(response, "ok") else { raise Failure(str(result, "error")) }
  result
}

///|
fn message(err : Error) -> String {
  match err {
    Failure(s) => s
    _ => err.to_string()
  }
}
