///|
/// Smallest repeated prefix in complete elements, including partial final cycles.
fn period(bytes : BytesView, width : Int32) -> Int32? {
  let n = bytes.length() / width
  for k in 1..<(Int32::min(72, n / 2) + 1) {
    let step = k * width
    if bytes[step:step + width] == bytes[:width] &&
      bytes[step:] == bytes[:bytes.length() - step] {
      return Some(step)
    }
  }
  None
}

///|
fn stepped_indices(bytes : BytesView, width : Int32) -> Bytes? {
  let n = bytes.length() / width
  for k in [1, 3, 6, 12, 18, 24, 30, 36, 48, 60, 72, 96, 108, 120, 144, 192] {
    if 2 * k > n {
      break
    }
    let delta = index_value(bytes, k * width, width) -
      index_value(bytes, 0, width)
    if delta <= 0 {
      continue
    }
    let mut same = true
    for i in k..<n {
      if index_value(bytes, i * width, width) -
        index_value(bytes, (i - k) * width, width) !=
        delta {
        same = false
        break
      }
    }
    if same {
      let out = @buffer.Buffer()
      out.write_int_le(2)
      out.write_int_le(width)
      out.write_int_le(delta)
      out.write_bytesview(bytes[:k * width])
      return Some(out.to_bytes())
    }
  }
  None
}

///|
/// Each axis selects one of two original bit patterns. The corner order is
/// shared across blocks and preserves seams, winding and duplicated vertices.
fn box_positions(bytes : BytesView, vertices : Int32) -> Bytes? {
  let stride = vertices * 12
  guard bytes.length() % stride == 0 else { return None }
  let templates : Map[Bytes, Int32] = Map([])
  let table = @buffer.Buffer()
  let boxes = @buffer.Buffer()
  for start = 0; start < bytes.length(); start = start + stride {
    let first = FixedArray::makei(3, axis => word(bytes, start + axis * 4))
    let second = first.copy()
    let selectors : FixedArray[Byte] = FixedArray::make(vertices, 0)
    for v in 0..<vertices {
      let mut mask = 0
      for axis in 0..<3 {
        let value = word(bytes, start + v * 12 + axis * 4)
        if value != first[axis] {
          if second[axis] != first[axis] && second[axis] != value {
            return None
          }
          second[axis] = value
          mask = mask | (1 << axis)
        }
      }
      selectors[v] = mask.to_byte()
    }
    let order = selectors.unsafe_reinterpret_as_bytes()
    let id = templates.get_or_init(order, () => {
      let id = templates.length()
      table.write_bytes(order)
      id
    })
    if id >= 256 {
      return None
    }
    boxes.write_byte(id.to_byte())
    for v in first {
      boxes.write_int_le(v)
    }
    for v in second {
      boxes.write_int_le(v)
    }
  }
  let out = @buffer.Buffer()
  out.write_int_le(3)
  out.write_int_le(vertices)
  out.write_int_le(templates.length())
  out.write_bytes(table.to_bytes())
  out.write_bytes(boxes.to_bytes())
  Some(out.to_bytes())
}

///|
fn attribute_columns(bytes : BytesView, dims : Int32) -> Bytes {
  let n = bytes.length() / (dims * 4)
  let out = @buffer.Buffer()
  out.write_int_le(4)
  out.write_int_le(dims)
  for axis in 0..<dims {
    let values = @buffer.Buffer(capacity=n * 4)
    for i in 0..<n {
      values.write_int_le(word(bytes, (i * dims + axis) * 4))
    }
    let column = values.to_bytes()
    if period(column[:], 4) is Some(size) {
      out.write_int_le(1)
      out.write_int_le(size / 4)
      out.write_bytesview(column[:size])
      continue
    }
    let palette : Map[Int32, Int32] = Map([])
    for i in 0..<n {
      palette[word(column[:], i * 4)] = 0
      if palette.length() >= 65536 {
        break
      }
    }
    let count = palette.length()
    let width = if count <= 256 { 1 } else { 2 }
    if count >= 65536 || count * 4 + n * width >= n * 4 {
      out.write_int_le(0)
      out.write_bytes(column)
      continue
    }
    let sorted = palette.keys().to_array()
    sorted.sort()
    out.write_int_le(width + 1)
    out.write_int_le(count)
    for i, value in sorted {
      palette[value] = i
      out.write_int_le(value)
    }
    for i in 0..<n {
      let idx = palette[word(column[:], i * 4)]
      out.write_byte(idx.to_byte())
      if width == 2 {
        out.write_byte((idx >> 8).to_byte())
      }
    }
  }
  out.to_bytes()
}

///|
/// Choose against compressed literals, since repeating brickwork often already
/// compresses well. A stream with no useful recipe stays a direct typed view.
pub fn encode(
  bytes : Bytes,
  name~ : String,
  type_name~ : String,
  item_size~ : Int32,
) -> Bytes? {
  if bytes.length() < 64 || item_size < 1 || item_size > 4 {
    return None
  }
  let width = match type_name {
    "Uint16Array" => 2
    "Float32Array" | "Uint32Array" => 4
    _ => return None
  }
  guard bytes.length() % (width * item_size) == 0 else { return None }
  let options = []
  if period(bytes[:], width * item_size) is Some(size) {
    let out = @buffer.Buffer()
    out.write_int_le(1)
    out.write_bytesview(bytes[:size])
    options.push(out.to_bytes())
  } else if name == "index" && type_name != "Float32Array" {
    if stepped_indices(bytes[:], width) is Some(recipe) {
      options.push(recipe)
    }
  } else if type_name == "Float32Array" && name != "index" {
    if name == "position" && item_size == 3 {
      for vertices in [24, 36, 4] {
        if box_positions(bytes[:], vertices) is Some(recipe) {
          options.push(recipe)
          break
        }
      }
    }
    options.push(attribute_columns(bytes[:], item_size))
  }
  guard !options.is_empty() else { return None }
  let mut limit = @gzip.compress(bytes[:]).length() - 16
  let mut winner = None
  for candidate in options {
    let size = @gzip.compress(candidate[:]).length()
    if size < limit {
      winner = Some(candidate)
      limit = size
    }
  }
  winner
}
