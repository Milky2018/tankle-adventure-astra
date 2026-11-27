///|
priv struct AttributeRange {
  attribute : Raw
  start : Int32
  end : Int32
  kind : String
  length : Int32
}

///|
/// Only decompress into a bounded window. A selected enemy can use attributes
/// at opposite ends of the city buffer, with other rooms' geometry in between.
fn inflate_chunks(
  input : Bytes,
  consume : (BytesView) -> Unit raise?,
) -> Unit raise {
  let decoder = @compression.Decoder()
  let window = FixedArray::make(262144, b'\x00')
  let mut pos = 0
  for ;; {
    let step = decoder.step(input[pos:], window.mut_view())
    pos += step.consumed
    consume(window.unsafe_reinterpret_as_bytes()[:step.produced])
    match step.status {
      Done =>
        if pos < input.length() &&
          input[pos] == b'\x1f' &&
          (pos + 1 == input.length() || input[pos + 1] == b'\x8b') {
          decoder.reset()
        } else {
          break
        }
      NeedMoreInput if pos == input.length() => ignore(decoder.check_end())
      _ => ()
    }
  }
}

///|
pub fn hydrate_scene(
  scene : Raw,
  decode~ : (@core.TypedArray) -> Raw = array_copy,
) -> Unit raise {
  let ranges : Array[AttributeRange] = []
  attributes(scene, attribute => {
    let desc = attribute.get("array")
    if is_record(desc) {
      let v : @scene_format.BufferView = @json.from_json(desc.to_json())
      v.check_range(@int.MAX_VALUE, id="geometry attribute")
      ranges.push({
        attribute,
        start: v.byte_offset,
        end: v.byte_offset +
        v.length * @scene_format.element_width(v.type_name).unwrap(),
        length: v.length,
        kind: v.type_name,
      })
    }
  })
  guard !ranges.is_empty() else { return }
  ranges.sort_by((a, b) => a.start.compare(b.start))
  let mut next = 0
  let mut cursor = 0
  let mut active : Array[(AttributeRange, @buffer.Buffer)] = []
  inflate_chunks(@fs.read_file_to_bytes("content/art/city.buffers.bin.gz"), bytes => {
    guard bytes.length() <= @int.MAX_VALUE - cursor else {
      raise Failure("The geometry buffer exceeds the supported byte range")
    }
    let end = cursor + bytes.length()
    while next < ranges.length() && ranges[next].start <= end {
      let r = ranges[next]
      active.push((r, @buffer.Buffer()))
      next += 1
    }
    active = active.filter(item => {
      let (r, collected) = item
      let a = r.start.max(cursor) - cursor
      let b = r.end.min(end) - cursor
      collected.write_bytesview(bytes[a:b])
      if r.end <= end {
        r.attribute.set(
          "array",
          decode(
            typed_view(collected.to_bytes(), r.kind, offset=0, length=r.length),
          ),
        )
        false
      } else {
        true
      }
    })
    cursor = end
  })
  if next < ranges.length() || !active.is_empty() {
    raise Failure(
      "Packed geometry attribute is outside the \{cursor}-byte buffer",
    )
  }
}
