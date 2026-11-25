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
extern "js" fn on_keydown(f : (@dom.KeyboardEvent) -> Unit) -> Unit = "f=>window.addEventListener('keydown',f)"

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
extern "js" fn round4(n : Double) -> Double = "v=>Number(v.toFixed(4))"

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
async fn api(path : String, body? : Raw) -> Raw {
  let url = "/api/" + path
  let response = match body {
    Some(value) => fetch_post(url, @archive.stringify(value)).wait()
    None => fetch_get(url).wait()
  }
  let result = response.json().wait()
  guard response.ok() else { raise Failure(str(result, "error")) }
  result
}

///|
fn message(err : Error) -> String {
  match err {
    Failure(s) => s
    _ => err.to_string()
  }
}
