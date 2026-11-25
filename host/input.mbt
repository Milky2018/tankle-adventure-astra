///|
fn key_event(name : String, callback : (@dom.KeyboardEvent) -> Unit) -> Unit {
  @dom.window()
  .reinterpret_as_event_target()
  .add_event_listener(name, e => callback(@core.JsValue::of(e).cast()))
}

///|
pub fn on_key(callback : (String, Bool, Bool) -> Unit) -> Unit {
  key_event("keydown", e => {
    let code = e.code()
    if element("journey").has_attribute("open") &&
      code is ("Tab" | "Space" | "Enter") {
      if e.repeat() && code != "Tab" {
        e.prevent_default()
      }
      return
    }
    if code
      is ("Tab"
      | "Space"
      | "ArrowUp"
      | "ArrowDown"
      | "ArrowLeft"
      | "ArrowRight") {
      e.prevent_default()
    }
    callback(code, true, e.repeat())
  })
  key_event("keyup", e => callback(e.code(), false, false))
}

///|
fn mouse_event(
  target : @dom.EventTarget,
  name : String,
  callback : (@dom.MouseEvent) -> Unit,
) -> Unit {
  target.add_event_listener(name, e => callback(@core.JsValue::of(e).cast()))
}

///|
extern "js" fn movement_x(e : @dom.MouseEvent) -> Double = "e=>e.movementX"

///|
extern "js" fn movement_y(e : @dom.MouseEvent) -> Double = "e=>e.movementY"

///|
extern "js" fn mouse_button(e : @dom.MouseEvent) -> Int32 = "e=>e.button"

///|
pub fn on_pointer(callback : (Double, Double, Double, Double) -> Unit) -> Unit {
  mouse_event(element("game").reinterpret_as_event_target(), "mousemove", e => {
    callback(
      movement_x(e),
      movement_y(e),
      2 * e.client_x().to_double() / width().to_double() - 1,
      1 - 2 * e.client_y().to_double() / height().to_double(),
    )
  })
}

///|
pub fn on_button(callback : (Int32, Bool) -> Unit) -> Unit {
  let canvas = element("game").reinterpret_as_event_target()
  canvas.add_event_listener("contextmenu", e => e.prevent_default())
  mouse_event(canvas, "mousedown", e => callback(mouse_button(e), true))
  mouse_event(@dom.window().reinterpret_as_event_target(), "mouseup", e => {
    callback(mouse_button(e), false)
  })
}
