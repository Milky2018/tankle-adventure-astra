///|
extern "js" fn install(run : (@core.JsValue) -> @core.JsValue) -> Unit = "run=>{window.__tankleProbe=run}"

///|
extern "js" fn snapshot() -> @core.JsValue = "()=>window.__typedRead()"

///|
extern "js" fn has_snapshot() -> Bool = "()=>typeof window.__typedRead==='function'"

///|
extern "js" fn project(
  x : Double,
  y : Double,
  z : Double,
) -> FixedArray[Double] = "(x,y,z)=>window.__typedProject(x,y,z)"

///|
extern "js" fn relative_mouse(
  kind : String,
  x : Int32,
  y : Int32,
) -> @dom.Event = "(kind,x,y)=>new MouseEvent(kind,{button:1,movementX:x,movementY:y})"

///|
extern "js" fn frame(callback : (Double) -> Unit) -> Unit = "cb=>requestAnimationFrame(cb)"

///|
extern "js" fn next_frame() -> @js_async.Promise[Double] = "()=>new Promise(requestAnimationFrame)"

///|
extern "js" fn has_rects(element : @dom.Element) -> Bool = "e=>e.getClientRects().length>0"

///|
extern "js" fn performance_entries(kind : String) -> FixedArray[@core.JsValue] = "kind=>performance.getEntriesByType(kind)"

///|
fn node(selector : String) -> @dom.Element {
  @dom.document_query_selector(selector).unwrap()
}

///|
fn startup_timing() -> @core.JsValue {
  let mut stamp = @dom.window().performance().now().to_double()
  for e in performance_entries("mark") {
    if e.get("name").strict_equal(@core.JsValue::of("moonbit-first-frame")) {
      stamp = e.get("startTime").cast()
      break
    }
  }
  let loads : Array[Json] = []
  for e in performance_entries("resource") {
    let bytes : Double = e.get("transferSize").cast()
    if bytes > 200000 {
      loads.push({
        "name": Json::string(e.get("name").cast()),
        "bytes": bytes,
        "end": Json::number(e.get("responseEnd").cast()),
      })
    }
  }
  @core.JsValue::from_json({ "ready": stamp, "resources": Json::array(loads) })
}

///|
fn main {
  let frames = []
  let mut measuring = false
  let mut previous = None
  fn sample(t : Double) {
    if !measuring {
      return
    }
    if previous is Some(start) && t > start {
      frames.push(t - start)
    }
    previous = Some(t)
    frame(sample)
  }
  install(raw => {
    let request : @protocol.Request = @json.from_json(raw.to_json()) catch {
      err =>
        return @core.JsValue::of(
          @js_async.Promise::from_async(fn() -> Unit raise { raise err }),
        )
    }
    match request {
      PageUrl => @core.JsValue::of(@dom.window().location().href())
      BodyText =>
        @core.JsValue::of(
          @dom.window()
          .document()
          .body()
          .map(e => e.text_content())
          .unwrap_or(""),
        )
      GameReady =>
        @core.JsValue::of(
          has_snapshot() &&
          !@dom.window()
          .document()
          .body()
          .unwrap()
          .class_list()
          .contains("starting"),
        )
      PlayerSnapshot => snapshot()
      Project(x, y, z) => @core.JsValue::of(project(x, y, z))
      NextFrame => @core.JsValue::of(next_frame())
      Visible(selector) =>
        @core.JsValue::of(
          @dom.document_query_selector(selector) is Some(e) && has_rects(e),
        )
      Center(selector) => {
        let r = node(selector).get_bounding_client_rect()
        @core.JsValue::from_array([
          r.x.to_double() + r.width.to_double() / 2,
          r.y.to_double() + r.height.to_double() / 2,
        ])
      }
      HasAttribute(selector, key) =>
        @core.JsValue::of(node(selector).has_attribute(key))
      Attribute(selector, key) =>
        @core.JsValue::of(node(selector).get_attribute(key).unwrap_or(""))
      TextContent(selector) => @core.JsValue::of(node(selector).text_content())
      ElementCount(selector) =>
        @core.JsValue::of(@dom.document_query_selector_all(selector).length())
      InputValue(selector) =>
        @core.JsValue::of(
          node(selector).reinterpret_as_html_input_element().value(),
        )
      SetSlider(selector, value) => {
        let element = node(selector)
        element.reinterpret_as_html_input_element().set_value(value)
        for ev in ["input", "change"] {
          ignore(
            element
            .reinterpret_as_event_target()
            .dispatch_event(@dom.Event::new_with_options(ev, bubbles=true)),
          )
        }
        @core.JsValue::undefined()
      }
      Drag(x, y) => {
        ignore(
          node("#game")
          .reinterpret_as_event_target()
          .dispatch_event(relative_mouse("mousemove", x, y)),
        )
        @core.JsValue::undefined()
      }
      Look(down) => {
        let (target, kind) = if down {
          (node("#game").reinterpret_as_event_target(), "mousedown")
        } else {
          (@dom.window().reinterpret_as_event_target(), "mouseup")
        }
        ignore(target.dispatch_event(relative_mouse(kind, 0, 0)))
        @core.JsValue::undefined()
      }
      StartupTiming => startup_timing()
      BeginFrameSample => {
        frames.clear()
        previous = None
        measuring = true
        frame(sample)
        @core.JsValue::undefined()
      }
      EndFrameSample => {
        measuring = false
        @core.JsValue::from_array(frames[:])
      }
    }
  })
}
