///|
/// Conservative CPU depth for the permanent walls and floors. A tile is filled
/// only if the same opaque face covers all four corners. The stored distance
/// is the farthest point on that face within the tile, in camera space.
priv struct OcclusionBuffer {
  depths : FixedArray[Double]
  view : @m3.Matrix4
  projection : @m3.Matrix4
}

///|
const DepthWidth = 48

///|
const DepthHeight = 28

///|
fn OcclusionBuffer::new(camera : @core.Object3D) -> OcclusionBuffer {
  {
    depths: FixedArray::make(DepthWidth * DepthHeight, 1.0 / 0.0),
    view: camera.matrix_world_inverse(),
    projection: @m3.Matrix4::new().multiply_matrices(
      camera.projection_matrix(),
      camera.matrix_world_inverse(),
    ),
  }
}

///|
fn tile_coord(x : Double, size : Int32) -> Int32 {
  ((x * 0.5 + 0.5).clamp(min=0.0, max=1.0) * size.to_double())
  .floor()
  .to_int()
  .min(size - 1)
}

///|
fn OcclusionBuffer::fill(
  self : OcclusionBuffer,
  camera : @core.Object3D,
  face : OpaqueFace,
  screen : ScreenRect,
) -> Unit {
  let near_clip = camera.as_perspective_camera().near
  let lo_x = tile_coord(screen.left, DepthWidth)
  let hi_x = tile_coord(screen.right, DepthWidth)
  let lo_y = tile_coord(screen.bottom, DepthHeight)
  let hi_y = tile_coord(screen.top, DepthHeight)
  let a = face.axis
  let u = (a + 1) % 3
  let v = (a + 2) % 3
  let b = face.bounds
  let e = camera.position
  let d = (e.get_component(a) - b.min.get_component(a)) * face.sign
  let left = (b.min.get_component(u) + 0.015 - e.get_component(u)) / d
  let right = (b.max.get_component(u) - 0.015 - e.get_component(u)) / d
  let bottom = (b.min.get_component(v) + 0.015 - e.get_component(v)) / d
  let top = (b.max.get_component(v) - 0.015 - e.get_component(v)) / d
  let m = camera.matrix_world.elements
  let p = camera.projection_matrix().elements
  // World direction at tile (x,y) is affine in both screen coordinates.
  fn ray(k : Int32) -> (Double, Double, Double) {
    let dx = 2.0 * m[k] / (p[0] * DepthWidth.to_double())
    let dy = 2.0 * m[k + 4] / (p[5] * DepthHeight.to_double())
    (
      m[k] * (p[8] - 1) / p[0] +
      m[k + 4] * (p[9] - 1) / p[5] -
      m[k + 8] +
      (dx + dy) / 2,
      dx,
      dy,
    )
  }
  let (ca, ax, ay) = ray(a)
  let s = -face.sign
  let (sc, sx, sy) = (s * ca, s * ax, s * ay)
  let (uc, ux, uy) = ray(u)
  let (vc, vx, vy) = ray(v)
  // Intersect the five half-planes with a row of tile centers. The margin
  // contracts each half-plane by the support of a complete pixel footprint.
  let planes = [
    (sc, sx, sy),
    (uc - left * sc, ux - left * sx, uy - left * sy),
    (right * sc - uc, right * sx - ux, right * sy - uy),
    (vc - bottom * sc, vx - bottom * sx, vy - bottom * sy),
    (top * sc - vc, top * sx - vx, top * sy - vy),
  ]
  for y in lo_y..<=hi_y {
    let mut x0 = lo_x
    let mut x1 = hi_x
    for (c, dx, dy) in planes {
      let offset = c +
        y.to_double() * dy -
        (dx.abs() + dy.abs()) / 2 -
        0.0000001
      if dx > 0.00000000001 {
        let edge = -offset / dx
        if edge > x1.to_double() {
          x0 = x1 + 1
          break
        }
        if edge > x0.to_double() {
          x0 = edge.ceil().to_int()
        }
      } else if dx < -0.00000000001 {
        let edge = -offset / dx
        if edge < x0.to_double() {
          x0 = x1 + 1
          break
        }
        if edge < x1.to_double() {
          x1 = edge.floor().to_int()
        }
      } else if offset + dx * (if dx >= 0 { x0 } else { x1 }).to_double() <= 0 {
        x0 = x1 + 1
        break
      }
    }
    let row = sc + sy * y.to_double() - (sx.abs() + sy.abs()) / 2
    for x in x0..<=x1 {
      let k = y * DepthWidth + x
      let denominator = row + sx * x.to_double()
      if d > near_clip * (denominator + sx.abs() + sy.abs()) {
        self.depths[k] = self.depths[k].min(d / denominator)
      }
    }
  }
}

///|
fn OcclusionBuffer::hidden(self : OcclusionBuffer, b : @m3.Box3) -> Bool {
  let v = self.view.elements
  let near = -v[14] -
    v[2] * (if v[2] > 0 { b.max.x } else { b.min.x }) -
    v[6] * (if v[6] > 0 { b.max.y } else { b.min.y }) -
    v[10] * (if v[10] > 0 { b.max.z } else { b.min.z }) -
    0.04
  if near <= 0 {
    return false
  }
  let m = self.projection.elements
  let hx = (b.max.x - b.min.x) / 2
  let hy = (b.max.y - b.min.y) / 2
  let hz = (b.max.z - b.min.z) / 2
  let x = b.min.x + hx
  let y = b.min.y + hy
  let z = b.min.z + hz
  let far = near +
    0.04 +
    2.0 * (v[2].abs() * hx + v[6].abs() * hy + v[10].abs() * hz)
  fn span(k : Int32) -> (Double, Double) {
    let center = m[k] * x + m[k + 4] * y + m[k + 8] * z + m[k + 12]
    let radius = m[k].abs() * hx + m[k + 4].abs() * hy + m[k + 8].abs() * hz
    let lo = center - radius
    let hi = center + radius
    (
      lo / (if lo < 0 { near } else { far }),
      hi / (if hi > 0 { near } else { far }),
    )
  }
  let (left, right) = span(0)
  let (bottom, top) = span(1)
  if left > 1.001 || right < -1.001 || bottom > 1.001 || top < -1.001 {
    return true
  }
  let x0 = tile_coord(left - 0.001, DepthWidth)
  let x1 = tile_coord(right + 0.001, DepthWidth)
  let y0 = tile_coord(bottom - 0.001, DepthHeight)
  let y1 = tile_coord(top + 0.001, DepthHeight)
  for y in y0..<=y1 {
    for x in x0..<=x1 {
      if self.depths[y * DepthWidth + x] >= near {
        return false
      }
    }
  }
  true
}
