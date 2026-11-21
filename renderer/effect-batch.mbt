///|
/// Beam segments share one draw. Dust and light each use a billboard batch
/// because their blend modes differ. Extra pages are reused after busy fights.
priv struct EffectBatch {
  scene : @core.Object3D
  geometry : @core.BufferGeometry
  material : @core.Material
  pages : Array[@core.Object3D]
  pose : @core.Object3D
  tint : @m3.Color
  mut used : Int32
}

///|
const EffectPageSize = 128

///|
fn EffectBatch::new(
  scene : @core.Object3D,
  geometry : @core.BufferGeometry,
  material : @core.Material,
) -> EffectBatch {
  {
    scene,
    geometry,
    material,
    pages: [],
    pose: @core.Object3D::new(),
    tint: @m3.Color::from_hex(0xffffff),
    used: 0,
  }
}

///|
fn EffectBatch::put(self : EffectBatch, hue : Int32) -> Unit {
  let page = self.used / EffectPageSize
  let index = self.used % EffectPageSize
  if page == self.pages.length() {
    let mesh = @core.InstancedMesh::new(
      geometry=self.geometry,
      material=Single(self.material),
      EffectPageSize,
    )
    mesh.frustum_culled = false
    self.scene.add(mesh) |> ignore
    self.pages.push(mesh)
  }
  self.pose.update_matrix()
  self.pages[page]
  .set_matrix_at(index, self.pose.matrix)
  .set_color_at(index, self.tint.set_hex(hue))
  |> ignore
  self.used += 1
}

///|
fn EffectBatch::finish(self : EffectBatch) -> Unit {
  for i, page in self.pages {
    let count = Int32::max(
      0,
      Int32::min(EffectPageSize, self.used - i * EffectPageSize),
    )
    page.visible = count > 0
    if page.kind is Mesh(mesh) && mesh.kind is InstancedMesh(data) {
      mesh.count = count
      if count > 0 {
        data.instance_matrix.set_needs_update(true)
        if data.instance_color is Some(c) {
          c.set_needs_update(true)
        }
      }
    }
  }
  self.used = 0
}

///|
fn EffectBatch::stroke(
  self : EffectBatch,
  from : @sim.Vec3,
  to : @sim.Vec3,
  width : Double,
  hue : Int32,
) -> Unit {
  self.pose.position.copy(vector(from.lerp(to, 0.5))) |> ignore
  self.pose.scale.set(width, width, from.distance(to)) |> ignore
  self.pose.look_at(vector(to))
  self.put(hue)
}

///|
fn EffectBatch::puff(
  self : EffectBatch,
  p : @sim.Vec3,
  width : Double,
  height : Double,
  opacity : Double,
  hue : Int32,
) -> Unit {
  self.pose.position.set(p.x, p.y, p.z) |> ignore
  self.pose.scale.set(width, height, opacity) |> ignore
  self.put(hue)
}

///|
fn puff_material(dust~ : Bool) -> @core.Material {
  let mat = @core.ShaderMaterial::new()
  mat.transparent = true
  mat.depth_write = false
  if !dust {
    mat.blending = @core.AdditiveBlending
  }
  mat.vertex_shader = Some(
    (
      #|varying vec2 coord;
      #|varying vec3 tint;
      #|varying float strength;
      #|void main() {
      #|  vec4 center = modelViewMatrix * instanceMatrix[3];
      #|  center.xy += position.xy * vec2(instanceMatrix[0].x, instanceMatrix[1].y);
      #|  gl_Position = projectionMatrix * center;
      #|  coord = uv * 2.0 - 1.0;
      #|  tint = instanceColor;
      #|  strength = instanceMatrix[2].z;
      #|}
    ),
  )
  let surface = if dust {
    (
      #|float edge = length(coord) + .10*sin(coord.x*11.0+coord.y*4.0)*sin(coord.y*9.0);
      #|float alpha = .63 * (1.0-smoothstep(.24,1.0,edge));
      #|vec3 light = tint * (.87+.23*coord.y);
    )
  } else {
    (
      #|float r = length(coord);
      #|float spoke = min(abs(coord.x), min(abs(dot(coord,vec2(.5,.866))), abs(dot(coord,vec2(.5,-.866)))));
      #|float blades = exp(-22.0*spoke) * exp(-2.8*r);
      #|float alpha = (1.4*exp(-4.8*r) + blades) * (1.0-smoothstep(.68,1.0,r));
      #|vec3 light = mix(tint,vec3(1.0,.94,.75),exp(-14.0*r));
    )
  }
  mat.fragment_shader = Some(
    (
      #|varying vec2 coord;
      #|varying vec3 tint;
      #|varying float strength;
      #|void main() {
    ) +
    "\n" +
    surface +
    "\n" +
    (
      #|gl_FragColor = vec4(light,clamp(alpha*strength,0.0,1.0));
      #|#include <colorspace_fragment>
      #|}
    ),
  )
  mat
}
