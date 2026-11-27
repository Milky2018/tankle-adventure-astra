///|
test "cropping an off-axis mirror keeps a distant target on the same glass ray" {
  let camera = @core.PerspectiveCamera::new(
    fov=60,
    aspect=1.6,
    near=0.1,
    far=200,
  )
  let projection = camera.projection_matrix()
  let pane = @m3.Matrix4::new().make_translation(4, 1, -12)
  let texture = @m3.Matrix4::new().make_scale(0.5, 0.5, 0.5)
  texture.elements[12] = 0.5
  texture.elements[13] = 0.5
  texture.elements[14] = 0.5
  texture.multiply(projection).multiply(pane) |> ignore
  let before = projection.clone()
  crop_to_glass(camera, texture, 5, 3)
  for (x, y) in [(-2.2, 1.3), (1.6, -1.2), (0.0, 0.0)] {
    let uv = @m3.Vector4::new(x, y, 0, 1).apply_matrix4(texture)
    let target = @m3.Vector4::new((4 + x) * 3, (1 + y) * 3, -36, 1)
    let old = target.clone().apply_matrix4(before)
    let clip = target.apply_matrix4(projection)
    assert_true(((clip.x / clip.w + 1) / 2 - uv.x / uv.w).abs() < 0.000001)
    assert_true(((clip.y / clip.w + 1) / 2 - uv.y / uv.w).abs() < 0.000001)
    assert_true((clip.z / clip.w - old.z / old.w).abs() < 0.000001)
  }
  let outside = @m3.Vector4::new(-2, 0, -12, 1)
  assert_true(outside.clone().apply_matrix4(before).x.abs() < 12)
  assert_true(outside.apply_matrix4(projection).x.abs() > 12)
}
