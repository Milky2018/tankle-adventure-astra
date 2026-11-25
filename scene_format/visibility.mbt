///|
/// Bounds are flat in the asset format to keep per-face metadata small.
#derive(Eq, Hash)
pub(all) struct Bounds {
  min : (Double, Double, Double)
  max : (Double, Double, Double)
}

///|
pub impl @json.ToJson for Bounds with fn to_json(b) {
  [b.min.0, b.min.1, b.min.2, b.max.0, b.max.1, b.max.2]
}

///|
pub impl @json.FromJson for Bounds with fn from_json(j, path) {
  guard j
    is [
      Number(x, ..),
      Number(y, ..),
      Number(z, ..),
      Number(u, ..),
      Number(v, ..),
      Number(w, ..),
    ] else {
    raise path.error("Expected six coordinates for a bounding box")
  }
  { min: (x, y, z), max: (u, v, w), }
}

///|
pub(all) struct Portal {
  destination : Int32
  face : Int32
  solid : Bool
  bounds : Bounds
}

///|
pub impl @json.ToJson for Portal with fn to_json(p) {
  let a = p.bounds.min
  let b = p.bounds.max
  [
    p.destination,
    p.face,
    if p.solid {
      1
    } else {
      0
    },
    a.0,
    a.1,
    a.2,
    b.0,
    b.1,
    b.2,
  ]
}

///|
pub impl @json.FromJson for Portal with fn from_json(j, path) {
  guard j is [dest, face, Number(flag, ..), x, y, z, u, v, w] else {
    raise path.error("Invalid room portal")
  }
  {
    destination: @json.from_json(dest, path=path.add_index(0)),
    face: @json.from_json(face, path=path.add_index(1)),
    solid: flag != 0,
    bounds: @json.from_json([x, y, z, u, v, w], path~),
  }
}

///|
pub(all) struct Room {
  bounds : Bounds
  portals : Array[Portal]
}

///|
pub impl @json.ToJson for Room with fn to_json(r) {
  let a = r.bounds.min
  let b = r.bounds.max
  [a.0, a.1, a.2, b.0, b.1, b.2, @json.to_json(r.portals)]
}

///|
pub impl @json.FromJson for Room with fn from_json(j, path) {
  guard j is [x, y, z, u, v, w, edges] else {
    raise path.error("Invalid room bounds and portals")
  }
  {
    bounds: @json.from_json([x, y, z, u, v, w], path~),
    portals: @json.from_json(edges, path=path.add_index(6)),
  }
}
