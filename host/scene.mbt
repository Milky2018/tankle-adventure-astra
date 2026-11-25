///|
pub fn create_renderer() -> @webgl.WebGLRenderer {
  @webgl.WebGLRenderer::new(
    canvas=canvas_element("game"),
    antialias=true,
    power_preference="high-performance",
  )
}
