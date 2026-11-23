///|
pub extern "js" fn width() -> Int32 =
  #| () => innerWidth

///|
pub extern "js" fn height() -> Int32 =
  #| () => innerHeight

///|
pub extern "js" fn pixel_ratio() -> Double =
  #| () => Math.min(devicePixelRatio, 1.75)

///|
pub extern "js" fn frame(callback : (Double) -> Unit) -> Unit =
  #| callback => { requestAnimationFrame(callback); }

///|
#module("tankle-astra-platform/host")
pub extern "js" fn on_key(callback : (String, Bool, Bool) -> Unit) -> Unit = "onKey"

///|
#module("tankle-astra-platform/host")
pub extern "js" fn on_pointer(
  callback : (Double, Double, Double, Double) -> Unit,
) -> Unit = "onPointer"

///|
#module("tankle-astra-platform/host")
pub extern "js" fn on_button(callback : (Int32, Bool) -> Unit) -> Unit = "onButton"

///|
pub extern "js" fn on_resize(callback : () -> Unit) -> Unit =
  #| callback => addEventListener('resize', callback)

///|
pub extern "js" fn on_blur(callback : () -> Unit) -> Unit =
  #| callback => addEventListener('blur', callback)

///|
pub extern "js" fn text(id : String, text : String) -> Unit =
  #| (id, text) => { document.getElementById(id).textContent = text; }

///|
pub extern "js" fn hidden(id : String, hidden : Bool) -> Unit =
  #| (id, hidden) => { document.getElementById(id).hidden = hidden; }

///|
pub extern "js" fn style(
  id : String,
  property : String,
  value : String,
) -> Unit =
  #| (id, property, value) => { document.getElementById(id).style.setProperty(property, value); }

///|
pub extern "js" fn on_click(id : String, callback : () -> Unit) -> Unit =
  #| (id, callback) => document.getElementById(id).addEventListener('click', callback)

///|
pub extern "js" fn ready() -> Unit =
  #| () => { document.body.classList.remove('starting'); document.getElementById('startup').remove(); performance.mark('moonbit-first-frame'); }

///|
pub extern "js" fn diagnostics(read : () -> String) -> Unit =
  #| read => { if (new URLSearchParams(location.search).has('test')) window.__typedRead = () => JSON.parse(read()); }

///|
pub extern "js" fn inspect_projection(
  project : (Double, Double, Double) -> FixedArray[Double],
) -> Unit =
  #| project => { if (new URLSearchParams(location.search).has('test')) window.__typedProject = project; }

///|
pub extern "js" fn read_save() -> String =
  #| () => localStorage.getItem('tankle-moonbit-v1') ?? ''

///|
let playtest : Bool = query("chapter") == "circulation"

///|
pub fn write_save(text : String) -> Unit {
  if !playtest {
    store_progress(text)
  }
}

///|
extern "js" fn store_progress(text : String) -> Unit =
  #| text => { localStorage.setItem('tankle-moonbit-v1',text); }

///|
pub fn remove_save() -> Unit {
  restart(clear_save=!playtest)
}

///|
extern "js" fn restart(clear_save~ : Bool) -> Unit =
  #| clear => {
  #|   if (clear) localStorage.removeItem('tankle-moonbit-v1');
  #|   history.replaceState({ ...history.state, tankleRestart: true }, '');
  #|   location.reload();
  #| }

///|
pub extern "js" fn pointer_locked() -> Bool =
  #| () => document.pointerLockElement === document.getElementById('game')

///|
pub extern "js" fn capture_pointer() -> Unit =
  #| () => { document.getElementById('game').requestPointerLock?.()?.catch?.(() => {}); }

///|
pub extern "js" fn release_pointer() -> Unit =
  #| () => { if(document.pointerLockElement) document.exitPointerLock(); }

///|
pub extern "js" fn html(id : String, markup : String) -> Unit =
  #| (id,markup) => {document.getElementById(id).innerHTML=markup;}

///|
pub extern "js" fn attribute(id : String, key : String, value : String) -> Unit =
  #| (id,key,value) => {document.getElementById(id).setAttribute(key,value);}

///|
pub extern "js" fn fullscreen() -> Unit =
  #| () => { if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); }

///|
pub type Canvas

///|
pub extern "js" fn canvas(id : String) -> Canvas =
  #| id => document.getElementById(id).getContext('2d')

///|
pub extern "js" fn canvas_begin(
  ctx : Canvas,
  width : Int32,
  height : Int32,
  angle : Double,
) -> Unit =
  #| (ctx,width,height,angle) => { if(ctx.canvas.width!==width)ctx.canvas.width=width;if(ctx.canvas.height!==height)ctx.canvas.height=height;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle='#192e27';ctx.fillRect(0,0,width,height);ctx.translate(width/2,height/2);ctx.rotate(angle); }

///|
pub extern "js" fn rectangle(
  ctx : Canvas,
  x : Double,
  y : Double,
  width : Double,
  height : Double,
  fill : String,
  alpha : Double,
) -> Unit =
  #| (ctx,x,y,width,height,fill,alpha) => {ctx.globalAlpha=alpha;ctx.fillStyle=fill;ctx.fillRect(x,y,width,height);ctx.strokeStyle='#c1c7a0';ctx.lineWidth=.5;ctx.strokeRect(x,y,width,height);}

///|
pub extern "js" fn dot(
  ctx : Canvas,
  x : Double,
  y : Double,
  radius : Double,
  fill : String,
) -> Unit =
  #| (ctx,x,y,radius,fill) => {ctx.globalAlpha=1;ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();}

///|
pub extern "js" fn arrow(
  ctx : Canvas,
  x : Double,
  y : Double,
  heading : Double,
) -> Unit =
  #| (ctx,x,y,heading) => {ctx.save();ctx.globalAlpha=1;ctx.translate(x,y);ctx.rotate(-heading);ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(-5,-5);ctx.lineTo(0,-2);ctx.lineTo(5,-5);ctx.closePath();ctx.fillStyle='#ffe4a3';ctx.fill();ctx.restore();}

///|
pub extern "js" fn class_toggle(
  id : String,
  name : String,
  enabled : Bool,
) -> Unit =
  #| (id,name,enabled) => {document.getElementById(id).classList.toggle(name,enabled);}

///|
pub type Audio

///|
#module("tankle-astra-platform/host")
pub extern "js" fn create_audio() -> Audio = "createAudio"

///|
#module("tankle-astra-platform/host")
pub extern "js" fn audio_voice(
  audio : Audio,
  noise : Bool,
  frequency : Double,
  end : Double,
  duration : Double,
  gain : Double,
  delay : Double,
  attack : Double,
  hold : Double,
  wave : String,
  cutoff : Double,
  filter : String,
  pan : Double,
) -> Unit = "audioVoice"

///|
#module("tankle-astra-platform/host")
pub extern "js" fn music(
  audio : Audio,
  url : String,
  volume : Double,
  paused : Bool,
  restart : Bool,
) -> Unit = "setMusic"

///|
pub extern "js" fn audio_volume(audio : Audio, volume : Double) -> Unit =
  #| (audio,volume) => {audio.master.gain.setTargetAtTime(volume,audio.ctx.currentTime,.1);}

///|
pub extern "js" fn audio_resume(audio : Audio) -> Unit =
  #| audio => {audio.ctx.resume();}

///|
pub extern "js" fn setting_value(id : String) -> String =
  #| id => document.getElementById(id).value

///|
pub extern "js" fn setting_number(id : String) -> Double =
  #| id => Number(document.getElementById(id).value)

///|
pub extern "js" fn setting_checked(id : String) -> Bool =
  #| id => document.getElementById(id).checked

///|
pub extern "js" fn set_value(id : String, value : String) -> Unit =
  #| (id,value) => {document.getElementById(id).value=value;}

///|
pub extern "js" fn set_checked(id : String, value : Bool) -> Unit =
  #| (id,value) => {document.getElementById(id).checked=value;}

///|
pub extern "js" fn on_change(id : String, callback : () -> Unit) -> Unit =
  #| (id,callback) => {document.getElementById(id).addEventListener('input',callback);}

///|
pub extern "js" fn read_preferences() -> String =
  #| () => localStorage.getItem('tankle-moonbit-settings-v1') ?? ''

///|
pub extern "js" fn write_preferences(value : String) -> Unit =
  #| value => {localStorage.setItem('tankle-moonbit-settings-v1',value);}

///|
pub extern "js" fn direct_entry() -> Bool =
  #| () => {
  #|   const { tankleRestart, ...state } = history.state ?? {};
  #|   if (tankleRestart) history.replaceState(state, '');
  #|   return !!tankleRestart || new URLSearchParams(location.search).has('chapter');
  #| }

///|
pub extern "js" fn query(key : String) -> String =
  #| key => new URLSearchParams(location.search).get(key) ?? ''

///|
pub extern "js" fn open_dialog(id : String, focus : String) -> Unit =
  #| (id, focus) => {
  #|   const dialog = document.getElementById(id);
  #|   dialog.oncancel = event => event.preventDefault();
  #|   if (!dialog.open) dialog.showModal();
  #|   document.getElementById(focus).focus();
  #| }

///|
pub extern "js" fn close_dialog(id : String) -> Unit =
  #| id => document.getElementById(id).close()

///|
pub extern "js" fn copy_mortar_scope(size : Int32) -> Unit =
  #| size => {
  #|   const src = document.getElementById('game');
  #|   const dst = document.getElementById('mortar-image');
  #|   dst.getContext('2d').drawImage(src, 0, src.height-size, size, size, 0, 0, dst.width, dst.height);
  #| }
