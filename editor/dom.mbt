///|
using @model {type Raw, get, str, exists, truth}

///|
using @dom {type Element, type HtmlInputElement}

///|
fn by_id(id : String) -> Element {
  @dom.document_get_element_by_id(id).unwrap()
}

///|
extern "js" fn open_window(url : String, name : String) -> @dom.JsObscure = "(url,name)=>window.open(url,name)"

///|
fn preview_window() -> @dom.Window? {
  let opened = open_window("about:blank", "tankle-preview")
  if opened.is_nullish() {
    None
  } else {
    Some(@dom.js_obscure_to_v(opened))
  }
}

///|
fn as_keyboard_event(e : @dom.Event) -> @dom.KeyboardEvent = "%identity"

///|
extern "js" fn keyboard_target_matches(
  e : @dom.KeyboardEvent,
  selector : String,
) -> Bool = "(e,s)=>!!e.target?.matches?.(s)"

///|
extern "js" fn prevent_unload(e : @dom.BeforeUnloadEvent) -> Unit = "e=>{e.preventDefault();e.returnValue=''}"

///|
extern "js" fn close_dialog(dialog : Element) -> Unit = "d=>d.close()"

///|
extern "js" fn show_dialog(dialog : Element) -> Unit = "d=>d.showModal()"

///|
extern "js" fn input_number(control : HtmlInputElement) -> Double = "c=>c.valueAsNumber"

///|
extern "js" fn frame() -> @js_async.Promise[Unit] = "()=>new Promise(r=>requestAnimationFrame(()=>r()))"

///|
#external
priv type ApiResponse

///|
extern "js" fn fetch_get(url : String) -> @js_async.Promise[ApiResponse] = "url=>fetch(url)"

///|
extern "js" fn fetch_post(
  url : String,
  body : String,
) -> @js_async.Promise[ApiResponse] =
  #|(url,body)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body})

///|
extern "js" fn ApiResponse::json(self : ApiResponse) -> @js_async.Promise[Raw] = "r=>r.json()"

///|
extern "js" fn ApiResponse::ok(self : ApiResponse) -> Bool = "r=>r.ok"

///|
fn round4(n : Double) -> Double {
  try! @string.parse_double(@scene_format.format_coordinate(n))
}

///|
fn el(tag : String, label? : String, style? : String) -> Element {
  let node = @dom.window().document().create_element(tag)
  if label is Some(text) {
    set_text(node, text)
  }
  if style is Some(css_class) {
    node.set_attribute("class", css_class)
  }
  node
}

///|
fn append(parent : Element, child : Element) -> Unit {
  parent.append_child(child.reinterpret_as_node())
}

///|
extern "js" fn replace(
  parent : Element,
  children : FixedArray[Element],
) -> Unit = "(p,children)=>p.replaceChildren(...children)"

///|
fn handler(n : Element, event : String, cb : () -> Unit) -> Unit {
  n.reinterpret_as_event_target().add_event_listener(event, _ => cb())
}

///|
extern "js" fn set_text(node : Element, s : String) -> Unit = "(n,s)=>{n.textContent=s}"

///|
fn option(menu : Element, id : String, label : String) -> Unit {
  let n = el("option", label~)
  n.set_attribute("value", id)
  append(menu, n)
}

///|
fn status(message : String, error~ : Bool = false) -> Unit {
  let node = by_id("status")
  set_text(node, message)
  if error {
    node.class_list().add("error")
  } else {
    node.class_list().remove("error")
  }
}

///|
async fn request(path : String, body? : String) -> ApiResponse {
  let url = "/api/" + path
  let response = match body {
    Some(text) => fetch_post(url, text).wait()
    None => fetch_get(url).wait()
  }
  guard response.ok() else {
    let detail = @json.parse(response.text().wait())
    raise Failure(
      if detail is { "error": String(message), .. } {
        message
      } else {
        "Editor request failed"
      },
    )
  }
  response
}

///|
/// Keep packed geometry in its transfer representation until the scene loader
/// can decode each attribute directly into a typed array.
async fn get_scene(path : String) -> Raw {
  request(path).json().wait()
}

///|
extern "js" fn ApiResponse::text(
  self : ApiResponse,
) -> @js_async.Promise[String] = "r=>r.text()"

///|
async fn[T : @json.FromJson] request_json(path : String, body? : String) -> T {
  @json.from_json(@json.parse(request(path, body?).text().wait()))
}

///|
fn message(err : Error) -> String {
  match err {
    Failure(s) => s
    _ => err.to_string()
  }
}
