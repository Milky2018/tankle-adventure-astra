///|
test "a diagonal broad phase includes obstacles touching an exact grid corner" {
  let ray : @sim.Ray = {
    origin: { x: 8, y: 0, z: 8, },
    direction: @sim.Vec3::{ x: -1, y: 0, z: 1, }.normalized(),
  }
  let cells : Set[(Int32, Int32)] = Set([])
  ray_cells(ray, 22, cell => cells.insert(cell) |> ignore)
  for cell in [(0, 0), (-1, 0), (0, 1), (-1, 1)] {
    assert_true(cells.contains(cell))
  }
}
