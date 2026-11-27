///|
/// The open roof takes over gradually on the last stretch of the signal ramp.
/// Lower floors occupy the same plan coordinates.
fn signal_exposure(p : @sim.Vec3) -> Double {
  smooth(29, 39.5, p.y) *
  smooth(150, 156, p.x) *
  (1 - smooth(216, 224, p.x)) *
  smooth(108, 138, p.z) *
  (1 - smooth(154, 163, p.z))
}

///|
/// Both the billboard sun and the live shadow camera use this bearing.
const SignalSunBearing : Double = -0.98

///|
fn signal_sky(
  sky : @core.Object3D?,
  exposure : @core.Uniform,
  panorama : @core.Texture,
) -> Unit {
  guard sky is Some(node) && node.get_material() is Some(Single(material)) else {
    return
  }
  material.on_before_compile = Some(fn(shader, _) {
    shader.uniforms["signalBasin"] = @core.Uniform::new(Texture(panorama))
    shader.uniforms["signalExposure"] = exposure
    shader.uniforms["signalBearing"] = @core.Uniform::new(
      Number(SignalSunBearing),
    )
    shader.vertex_shader = shader.vertex_shader
      .replace(
        old="#include <common>",
        new="#include <common>\nvarying vec3 basinRay;",
      )
      .replace(
        old="#include <begin_vertex>",
        new="#include <begin_vertex>\nbasinRay=position;",
      )
    shader.fragment_shader = shader.fragment_shader
      .replace(
        old="#include <common>",
        new="#include <common>\nvarying vec3 basinRay; uniform float signalExposure;\n" +
          signal_panorama,
      )
      .replace(
        old="#include <map_fragment>",
        new=(
          #| #include <map_fragment>
          #| if (signalExposure > 0.0) diffuseColor.rgb=mix(diffuseColor.rgb,basinLight(normalize(basinRay)),signalExposure);
        ),
      )
  })
  material.custom_program_cache_key = Some(() => "signal-basin-sky")
}

///|
let signal_panorama : String =
  #| uniform sampler2D signalBasin;
  #| uniform float signalBearing;
  #| vec3 basinLight(vec3 ray) {
  #|   vec2 uv=vec2(.197+(atan(ray.x,ray.z)-signalBearing)/6.2831853,
  #|                clamp(.50+(asin(clamp(ray.y,-1.,1.))-.105)*.85,.004,.996));
  #|   vec2 dx=dFdx(uv), dy=dFdy(uv);
  #|   dx.x-=floor(dx.x+.5); dy.x-=floor(dy.x+.5);
  #|   return textureGrad(signalBasin,uv,dx,dy).rgb;
  #| }

///|
let signal_air : String =
  #| if (signalExposure > .001) {
  #|   vec3 ray=apertureWorld-cameraPosition;
  #|   float veil=smoothstep(48.,198.,length(ray))*signalExposure;
  #|   if(veil>.001) gl_FragColor.rgb=mix(gl_FragColor.rgb,basinLight(normalize(ray)),veil);
  #| }

///|
/// The low sun catches settled water in the slab joints and shallow hollows.
/// The roughness map leaves the surrounding aggregate matte.
let roof_paving_glaze : String =
  #| vec3 toEye=normalize(cameraPosition-apertureWorld);
  #| vec3 roofNormal=inverseTransformDirection(normal,viewMatrix);
  #| float film=(1.-smoothstep(.32,.72,roughnessFactor))*signalExposure;
  #| float fresnel=pow(1.-clamp(dot(roofNormal,toEye),0.,1.),1.8);
  #| outgoingLight=mix(outgoingLight,basinLight(reflect(-toEye,roofNormal)),film*fresnel*.39);
