///|
extern "js" fn key_event(
  event : String,
  callback : (String, Bool, () -> Unit) -> Unit,
) -> Unit =
  #| (name,cb)=>addEventListener(name,e=>cb(e.code,e.repeat,()=>e.preventDefault()))

///|
extern "js" fn journey_dialog_open() -> Bool =
  #| ()=>document.getElementById('journey').open

///|
pub fn on_key(callback : (String, Bool, Bool) -> Unit) -> Unit {
  key_event("keydown", fn(code, repeated, prevent) {
    if journey_dialog_open() && code is ("Tab" | "Space" | "Enter") {
      if repeated && code != "Tab" {
        prevent()
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
      prevent()
    }
    callback(code, true, repeated)
  })
  key_event("keyup", fn(code, _, _) { callback(code, false, false) })
}

///|
extern "js" fn mouse_movement(
  callback : (Double, Double, Double, Double) -> Unit,
) -> Unit =
  #| cb=>document.getElementById('game').addEventListener('mousemove',e=>cb(e.movementX,e.movementY,e.clientX,e.clientY))

///|
pub fn on_pointer(callback : (Double, Double, Double, Double) -> Unit) -> Unit {
  mouse_movement(fn(dx, dy, x, y) {
    callback(
      dx,
      dy,
      2 * x / width().to_double() - 1,
      1 - 2 * y / height().to_double(),
    )
  })
}

///|
pub extern "js" fn on_button(callback : (Int32, Bool) -> Unit) -> Unit =
  #| cb=>{
  #|   const canvas=document.getElementById('game');
  #|   canvas.addEventListener('contextmenu',e=>e.preventDefault());
  #|   canvas.addEventListener('mousedown',e=>cb(e.button,true));
  #|   addEventListener('mouseup',e=>cb(e.button,false));
  #| }
