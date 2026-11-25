///|
extern "js" fn frame(callback : (Double) -> Unit) -> Unit = "cb=>requestAnimationFrame(cb)"

///|
extern "js" fn expose(stop : () -> FixedArray[Double]) -> Unit = "cb=>window.__tankleEndFrameSample=cb"

///|
fn main {
  let frames = []
  let mut measuring = true
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
  expose(fn() {
    measuring = false
    FixedArray::from_array(frames)
  })
  frame(sample)
}
