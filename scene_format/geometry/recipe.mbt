///|
priv enum Column {
  Cycle(BytesView)
  Palette(values~ : BytesView, indices~ : BytesView, width~ : Int32)
  Words(BytesView)
}

///|
/// All lengths and offsets are validated before a recipe can be scheduled.
pub struct Recipe {
  priv size : Int32
  priv pattern : Pattern
}

///|
priv enum Pattern {
  Repeat(BytesView)
  Indices(width~ : Int32, step~ : Int32, base~ : BytesView)
  Corners(vertices~ : Int32, templates~ : BytesView, boxes~ : BytesView)
  Columns(Array[Column])
}

///|
fn word(data : BytesView, at : Int32) -> Int32 {
  data[at].to_int() |
  (data[at + 1].to_int() << 8) |
  (data[at + 2].to_int() << 16) |
  (data[at + 3].to_int() << 24)
}

///|
fn index_value(data : BytesView, at : Int32, width : Int32) -> Int32 {
  match width {
    1 => data[at].to_int()
    2 => data[at].to_int() | (data[at + 1].to_int() << 8)
    _ => word(data, at)
  }
}

///|
priv struct Reader {
  bytes : BytesView
  mut pos : Int32
}

///|
fn Reader::take(self : Reader, n : Int32) -> BytesView raise {
  guard n >= 0 && n <= self.bytes.length() - self.pos else {
    raise Failure("Truncated geometry recipe")
  }
  let start = self.pos
  self.pos += n
  self.bytes[start:self.pos]
}

///|
fn Reader::int(self : Reader) -> Int32 raise {
  word(self.take(4), 0)
}

///|
pub fn Recipe::parse(input : BytesView, size~ : Int32) -> Recipe raise {
  let r = Reader::{ bytes: input, pos: 0, }
  guard size > 0 else { raise Failure("Invalid geometry size") }
  let pattern = match r.int() {
    1 => {
      let base = r.take(input.length() - r.pos)
      guard !base.is_empty() && base.length() <= size else {
        raise Failure("Invalid repeated attribute")
      }
      Repeat(base)
    }
    2 => {
      let width = r.int()
      let step = r.int()
      let base = r.take(input.length() - r.pos)
      guard width is (2 | 4) &&
        step > 0 &&
        base.length() >= width &&
        base.length() % width == 0 &&
        size % width == 0 else {
        raise Failure("Invalid index template")
      }
      Indices(width~, step~, base~)
    }
    3 => {
      let vertices = r.int()
      let count = r.int()
      guard vertices is (4 | 24 | 36) &&
        count is (1..<=256) &&
        size % (vertices * 12) == 0 else {
        raise Failure("Invalid box template")
      }
      let templates = r.take(count * vertices)
      let boxes = r.take(size / (vertices * 12) * 25)
      for i in 0..<(boxes.length() / 25) {
        guard boxes[i * 25].to_int() < count else {
          raise Failure("Unknown box template")
        }
      }
      Corners(vertices~, templates~, boxes~)
    }
    4 => {
      let dims = r.int()
      guard dims is (1..<=4) && size % (4 * dims) == 0 else {
        raise Failure("Invalid attribute dimensions")
      }
      let n = size / (4 * dims)
      let columns = []
      for _ in 0..<dims {
        let mode = r.int()
        let column = match mode {
          0 => Words(r.take(n * 4))
          1 => {
            let k = r.int()
            guard k > 0 && k <= n else {
              raise Failure("Invalid column period")
            }
            Cycle(r.take(k * 4))
          }
          2 | 3 => {
            let k = r.int()
            let width = mode - 1
            guard k > 0 && k <= 1 << (8 * width) else {
              raise Failure("Invalid geometry palette")
            }
            let values = r.take(k * 4)
            let indices = r.take(n * width)
            if k < 1 << (8 * width) {
              for i in 0..<n {
                guard index_value(indices, i * width, width) < k else {
                  raise Failure("Unknown palette entry")
                }
              }
            }
            Palette(values~, indices~, width~)
          }
          _ => raise Failure("Unknown attribute column")
        }
        columns.push(column)
      }
      Columns(columns)
    }
    _ => raise Failure("Unknown geometry recipe")
  }
  guard r.pos == input.length() else {
    raise Failure("Trailing geometry recipe data")
  }
  { size, pattern, }
}

///|
pub fn Recipe::expand(self : Recipe) -> Bytes {
  let out : FixedArray[Byte] = FixedArray::make(self.size, 0)
  fn copy_word(to : Int32, src : BytesView, at : Int32) {
    // Recipe parsing bounds every source table; the loops below cover complete words.
    out.unsafe_write_uint32_le(to, src.unsafe_read_uint32_le(at))
  }
  match self.pattern {
    Repeat(base) => {
      out.blit_from_bytesview(0, base)
      for used = base.length(); used < self.size; {
        let len = Int32::min(used, self.size - used)
        out.blit_to(out, src_offset=0, dst_offset=used, len~)
        continue used + len
      }
    }
    Indices(width~, step~, base~) =>
      for i in 0..<(self.size / width) {
        let at = i * width
        let x = index_value(base, at % base.length(), width) +
          at / base.length() * step
        for j in 0..<width {
          out[at + j] = (x >> (j * 8)).to_byte()
        }
      }
    Corners(vertices~, templates~, boxes~) =>
      for box in 0..<(boxes.length() / 25) {
        let template = boxes[box * 25].to_int() * vertices
        for v in 0..<vertices {
          let mask = templates[template + v].to_int()
          for axis in 0..<3 {
            copy_word(
              ((box * vertices + v) * 3 + axis) * 4,
              boxes,
              box * 25 + 1 + (axis + 3 * ((mask >> axis) & 1)) * 4,
            )
          }
        }
      }
    Columns(columns) => {
      let stride = columns.length() * 4
      for axis, column in columns {
        for i in 0..<(self.size / stride) {
          let to = i * stride + axis * 4
          match column {
            Words(bytes) => copy_word(to, bytes, i * 4)
            Cycle(base) => copy_word(to, base, i * 4 % base.length())
            Palette(values~, indices~, width~) =>
              copy_word(to, values, index_value(indices, i * width, width) * 4)
          }
        }
      }
    }
  }
  out.unsafe_reinterpret_as_bytes()
}
