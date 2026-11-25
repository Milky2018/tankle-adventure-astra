///|
test "box corners round-trip different vertex orders and floating-point bit patterns" {
  let bytes = @buffer.Buffer()
  for box in 0..<80 {
    for vertex in 0..<24 {
      let corner = (vertex + box) % 8
      bytes.write_int_le(if (corner & 1) == 0 { -2147483648 } else { box + 1 })
      bytes.write_int_le(if (corner & 2) == 0 { 0 } else { -box - 17 })
      bytes.write_int_le(if (corner & 4) == 0 { 0x7fc00003 } else { box })
    }
  }
  let original = bytes.to_bytes()
  let recipe = @geometry.encode(
    original,
    name="position",
    type_name="Float32Array",
    item_size=3,
  ).unwrap()
  assert_eq(
    @geometry.Recipe::parse(recipe[:], size=original.length()).expand(),
    original,
  )
}

///|
test "a corrupt palette index cannot reach a deferred upload" {
  let data = @buffer.Buffer()
  for value in [4, 1, 2, 1, 23] {
    data.write_int_le(value)
  }
  data.write_byte(1)
  let bytes = data.to_bytes()
  let accepted = try {
    ignore(@geometry.Recipe::parse(bytes[:], size=4))
    true
  } catch {
    _ => false
  }
  assert_false(accepted)
}
