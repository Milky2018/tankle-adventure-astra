///|
fn element(id : String) -> @dom.Element {
  @dom.document_get_element_by_id(id).unwrap()
}

///|
pub extern "js" fn width() -> Int32 = "()=>innerWidth"

///|
pub extern "js" fn height() -> Int32 = "()=>innerHeight"

///|
extern "js" fn device_pixel_ratio() -> Double = "()=>devicePixelRatio"

///|
pub fn pixel_ratio() -> Double {
  device_pixel_ratio().min(1.75)
}

///|
/// Keep the animation timestamp as a Double throughout long play sessions.
pub extern "js" fn frame(callback : (Double) -> Unit) -> Unit = "callback=>requestAnimationFrame(callback)"

///|
pub fn on_resize(callback : () -> Unit) -> Unit {
  @dom.window()
  .reinterpret_as_event_target()
  .add_event_listener("resize", _ => callback())
}

///|
pub fn on_blur(callback : () -> Unit) -> Unit {
  @dom.window()
  .reinterpret_as_event_target()
  .add_event_listener("blur", _ => callback())
}

///|
extern "js" fn set_text(node : @dom.Element, value : String) -> Unit = "(node,value)=>{node.textContent=value}"

///|
pub fn text(id : String, text : String) -> Unit {
  set_text(element(id), text)
}

///|
pub fn hidden(id : String, hidden : Bool) -> Unit {
  ignore(element(id).toggle_attribute_with_force("hidden", hidden))
}

///|
pub fn style(id : String, property : String, value : String) -> Unit {
  element(id).reinterpret_as_node().style().set_property(property, value)
}

///|
pub fn on_click(id : String, callback : () -> Unit) -> Unit {
  element(id)
  .reinterpret_as_event_target()
  .add_event_listener("click", _ => callback())
}

///|
pub fn ready() -> Unit {
  @dom.window().document().body().unwrap().class_list().remove("starting")
  element("startup").reinterpret_as_node().remove()
  mark("moonbit-first-frame")
}

///|
extern "js" fn expose_read(read : () -> @core.JsValue) -> Unit = "read=>{window.__typedRead=read}"

///|
pub fn diagnostics(read : () -> Json, camera_yaw : () -> Double) -> Unit {
  if query_params().has("test") {
    expose_read(fn() {
      let state = @core.JsValue::from_json(read())
      state.set("yaw", @core.JsValue::of(camera_yaw()))
      state
    })
  }
}

///|
extern "js" fn expose_projection(
  project : (Double, Double, Double) -> FixedArray[Double],
) -> Unit = "p=>{window.__typedProject=p}"

///|
pub fn inspect_projection(
  project : (Double, Double, Double) -> FixedArray[Double],
) -> Unit {
  if query_params().has("test") {
    expose_projection(project)
  }
}

///|
let save_key = "tankle-moonbit-v1"

///|
let preferences_key = "tankle-moonbit-settings-v1"

///|
pub fn read_save() -> String {
  @dom.window().local_storage().get_item(save_key).unwrap_or("")
}

///|
let playtest : Bool = query("chapter") == "circulation"

///|
pub fn write_save(text : String) -> Unit {
  if !playtest {
    @dom.window().local_storage().set_item(save_key, text)
  }
}

///|
extern "js" fn history_state() -> @core.JsValue = "()=>({...history.state})"

///|
extern "js" fn replace_history(state : @core.JsValue) -> Unit = "state=>history.replaceState(state,'')"

///|
extern "js" fn delete_property(obj : @core.JsValue, key : String) -> Unit = "(o,k)=>{delete o[k]}"

///|
pub fn remove_save() -> Unit {
  if !playtest {
    @dom.window().local_storage().remove_item(save_key)
  }
  let state = history_state()
  state.set("tankleRestart", @core.JsValue::of(true))
  replace_history(state)
  @dom.window().location().reload()
}

///|
pub fn direct_entry() -> Bool {
  let state = history_state()
  if state.get("tankleRestart").strict_equal(@core.JsValue::of(true)) {
    delete_property(state, "tankleRestart")
    replace_history(state)
    true
  } else {
    query_params().has("chapter")
  }
}

///|
extern "js" fn has_pointer_lock(node : @dom.Element) -> Bool = "n=>document.pointerLockElement===n"

///|
pub fn pointer_locked() -> Bool {
  has_pointer_lock(element("game"))
}

///|
extern "js" fn request_lock(node : @dom.Element) -> Unit = "n=>n.requestPointerLock?.()?.catch?.(()=>{})"

///|
pub fn capture_pointer() -> Unit {
  request_lock(element("game"))
}

///|
pub extern "js" fn release_pointer() -> Unit = "()=>{if(document.pointerLockElement)document.exitPointerLock()}"

///|
pub fn html(id : String, markup : String) -> Unit {
  element(id).set_inner_html(markup)
}

///|
pub fn attribute(id : String, key : String, value : String) -> Unit {
  element(id).set_attribute(key, value)
}

///|
pub extern "js" fn fullscreen() -> Unit = "()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()"

///|
pub type Canvas = @webgl.CanvasRenderingContext2D

///|
fn canvas_element(id : String) -> @webgl.HTMLCanvasElement {
  @core.JsValue::of(element(id)).cast()
}

///|
pub fn canvas(id : String) -> Canvas {
  canvas_element(id).get_context_2d().unwrap()
}

///|
extern "js" fn surface(ctx : Canvas) -> @webgl.HTMLCanvasElement = "ctx=>ctx.canvas"

///|
extern "js" fn reset_transform(ctx : Canvas) -> Unit = "ctx=>ctx.resetTransform()"

///|
extern "js" fn translate(ctx : Canvas, x : Double, y : Double) -> Unit = "(ctx,x,y)=>ctx.translate(x,y)"

///|
extern "js" fn rotate(ctx : Canvas, angle : Double) -> Unit = "(ctx,a)=>ctx.rotate(a)"

///|
extern "js" fn global_alpha(ctx : Canvas, alpha : Double) -> Unit = "(ctx,a)=>{ctx.globalAlpha=a}"

///|
extern "js" fn fill_style(ctx : Canvas, color : String) -> Unit = "(ctx,c)=>{ctx.fillStyle=c}"

///|
extern "js" fn stroke_style(ctx : Canvas, color : String) -> Unit = "(ctx,c)=>{ctx.strokeStyle=c}"

///|
extern "js" fn line_width(ctx : Canvas, width : Double) -> Unit = "(ctx,w)=>{ctx.lineWidth=w}"

///|
extern "js" fn fill_rect(
  ctx : Canvas,
  x : Double,
  y : Double,
  w : Double,
  h : Double,
) -> Unit = "(ctx,x,y,w,h)=>ctx.fillRect(x,y,w,h)"

///|
extern "js" fn stroke_rect(
  ctx : Canvas,
  x : Double,
  y : Double,
  w : Double,
  h : Double,
) -> Unit = "(ctx,x,y,w,h)=>ctx.strokeRect(x,y,w,h)"

///|
extern "js" fn begin_path(ctx : Canvas) -> Unit = "ctx=>ctx.beginPath()"

///|
extern "js" fn arc(
  ctx : Canvas,
  x : Double,
  y : Double,
  r : Double,
  start : Double,
  end : Double,
) -> Unit = "(ctx,x,y,r,a,b)=>ctx.arc(x,y,r,a,b)"

///|
extern "js" fn move_to(ctx : Canvas, x : Double, y : Double) -> Unit = "(ctx,x,y)=>ctx.moveTo(x,y)"

///|
extern "js" fn line_to(ctx : Canvas, x : Double, y : Double) -> Unit = "(ctx,x,y)=>ctx.lineTo(x,y)"

///|
extern "js" fn fill_path(ctx : Canvas) -> Unit = "ctx=>ctx.fill()"

///|
extern "js" fn close_path(ctx : Canvas) -> Unit = "ctx=>ctx.closePath()"

///|
extern "js" fn save_transform(ctx : Canvas) -> Unit = "ctx=>ctx.save()"

///|
extern "js" fn restore_transform(ctx : Canvas) -> Unit = "ctx=>ctx.restore()"

///|
pub fn canvas_begin(
  ctx : Canvas,
  width : Int32,
  height : Int32,
  angle : Double,
) -> Unit {
  let target = surface(ctx)
  if target.width() != width {
    target.set_width(width)
  }
  if target.height() != height {
    target.set_height(height)
  }
  reset_transform(ctx)
  global_alpha(ctx, 1)
  fill_style(ctx, "#192e27")
  fill_rect(ctx, 0, 0, width.to_double(), height.to_double())
  translate(ctx, width.to_double() / 2, height.to_double() / 2)
  rotate(ctx, angle)
}

///|
pub fn rectangle(
  ctx : Canvas,
  x : Double,
  y : Double,
  width : Double,
  height : Double,
  fill : String,
  alpha : Double,
) -> Unit {
  global_alpha(ctx, alpha)
  fill_style(ctx, fill)
  fill_rect(ctx, x, y, width, height)
  stroke_style(ctx, "#c1c7a0")
  line_width(ctx, 0.5)
  stroke_rect(ctx, x, y, width, height)
}

///|
pub fn dot(
  ctx : Canvas,
  x : Double,
  y : Double,
  radius : Double,
  fill : String,
) -> Unit {
  global_alpha(ctx, 1)
  fill_style(ctx, fill)
  begin_path(ctx)
  arc(ctx, x, y, radius, 0, 2 * @math.PI)
  fill_path(ctx)
}

///|
pub fn arrow(ctx : Canvas, x : Double, y : Double, heading : Double) -> Unit {
  save_transform(ctx)
  global_alpha(ctx, 1)
  translate(ctx, x, y)
  rotate(ctx, -heading)
  begin_path(ctx)
  move_to(ctx, 0, 8)
  line_to(ctx, -5, -5)
  line_to(ctx, 0, -2)
  line_to(ctx, 5, -5)
  close_path(ctx)
  fill_style(ctx, "#ffe4a3")
  fill_path(ctx)
  restore_transform(ctx)
}

///|
pub fn class_toggle(id : String, name : String, enabled : Bool) -> Unit {
  set_class_enabled(element(id).class_list(), name, enabled)
}

///|
extern "js" fn set_class_enabled(
  classes : @dom.DomTokenList,
  name : String,
  enabled : Bool,
) -> Unit = "(classes,name,enabled)=>classes.toggle(name,enabled)"

///|
pub fn setting_value(id : String) -> String {
  let control = element(id)
  match control.tag_name() {
    "SELECT" => control.reinterpret_as_html_select_element().value()
    "TEXTAREA" => control.reinterpret_as_html_textarea_element().value()
    _ => control.reinterpret_as_html_input_element().value()
  }
}

///|
pub fn setting_number(id : String) -> Double {
  numeric_value(element(id).reinterpret_as_html_input_element())
}

///|
extern "js" fn numeric_value(input : @dom.HtmlInputElement) -> Double = "input=>Number(input.value)"

///|
pub fn setting_checked(id : String) -> Bool {
  element(id).reinterpret_as_html_input_element().checked()
}

///|
pub fn set_value(id : String, value : String) -> Unit {
  let control = element(id)
  match control.tag_name() {
    "SELECT" => control.reinterpret_as_html_select_element().set_value(value)
    "TEXTAREA" =>
      control.reinterpret_as_html_textarea_element().set_value(value)
    _ => control.reinterpret_as_html_input_element().set_value(value)
  }
}

///|
pub fn set_checked(id : String, value : Bool) -> Unit {
  element(id).reinterpret_as_html_input_element().set_checked(value)
}

///|
pub fn on_change(id : String, callback : () -> Unit) -> Unit {
  element(id)
  .reinterpret_as_event_target()
  .add_event_listener("input", _ => callback())
}

///|
pub fn read_preferences() -> String {
  @dom.window().local_storage().get_item(preferences_key).unwrap_or("")
}

///|
pub fn write_preferences(value : String) -> Unit {
  @dom.window().local_storage().set_item(preferences_key, value)
}

///|
fn query_params() -> @dom.URLSearchParams {
  @dom.new_url_search_params(@dom.window().location().search())
}

///|
pub fn query(key : String) -> String {
  query_params().get(key).unwrap_or("")
}

///|
extern "js" fn prevent_dialog_cancel(
  dialog : @dom.Element,
  listener : (@dom.Event) -> Unit,
) -> Unit = "(d,f)=>{d.oncancel=f}"

///|
extern "js" fn show_modal(dialog : @dom.Element) -> Unit = "d=>d.showModal()"

///|
pub fn open_dialog(id : String, focus : String) -> Unit {
  let dialog = element(id)
  prevent_dialog_cancel(dialog, e => e.prevent_default())
  if !dialog.has_attribute("open") {
    show_modal(dialog)
  }
  element(focus).focus()
}

///|
extern "js" fn close_modal(dialog : @dom.Element) -> Unit = "d=>d.close()"

///|
pub fn close_dialog(id : String) -> Unit {
  close_modal(element(id))
}

///|
extern "js" fn draw_sub_image(
  ctx : Canvas,
  source : @webgl.HTMLCanvasElement,
  sx : Int32,
  sy : Int32,
  sw : Int32,
  sh : Int32,
  dx : Int32,
  dy : Int32,
  dw : Int32,
  dh : Int32,
) -> Unit =
  #| (ctx,src,sx,sy,sw,sh,dx,dy,dw,dh)=>ctx.drawImage(src,sx,sy,sw,sh,dx,dy,dw,dh)

///|
pub fn copy_mortar_scope(size : Int32) -> Unit {
  let source = canvas_element("game")
  let target = canvas_element("mortar-image")
  draw_sub_image(
    target.get_context_2d().unwrap(),
    source,
    0,
    source.height() - size,
    size,
    size,
    0,
    0,
    target.width(),
    target.height(),
  )
}
