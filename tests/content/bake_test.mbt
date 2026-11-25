///|
fn vector_attr(size : Int32, values : Json) -> Raw {
  @archive.obj([
    ("itemSize", Raw::of(size)),
    ("type", Raw::of("Float32Array")),
    ("array", Raw::of(@archive.typed("Float32Array", raw(values)))),
  ])
}

///|
fn batch_scene() -> Raw {
  let scene = raw({
    "object": {
      "type": "Scene",
      "uuid": "scene",
      "matrix": matrix(),
      "children": [],
    },
    "geometries": [{ "uuid": "tri", "data": { "attributes": {} } }],
    "materials": [
      {
        "uuid": "iron",
        "type": "MeshBasicMaterial",
        "color": 16777215,
        "side": 2,
      },
    ],
    "textures": [],
    "images": [],
  })
  let attrs = @model.array(scene, "geometries")[0].get("data").get("attributes")
  attrs.set("position", vector_attr(3, [0, 0, 0, 1, 0, 0, 0, 1, 0]))
  attrs.set("normal", vector_attr(3, [0, 0, 1, 0, 0, 1, 0, 0, 1]))
  attrs.set("uv", vector_attr(2, [0, 0, 1, 0, 0, 1]))
  scene
}

///|
fn tri(binding : String, x : Double) -> Raw {
  raw({
    "type": "Mesh",
    "uuid": @json.to_json(binding),
    "geometry": "tri",
    "material": "iron",
    "matrix": matrix(x~),
    "userData": { "binding": @json.to_json(binding) },
    "castShadow": true,
    "receiveShadow": true,
    "layers": 1,
  })
}

///|
test "stationary fittings share a spatial draw and moving doors keep local geometry" {
  let scene = batch_scene()
  let defs : Array[Json] = []
  let walls = []
  for i, x in [0.0, 36, 48] {
    defs.push({
      "x": @json.to_json(x - 1),
      "y": -1,
      "z": -1,
      "w": 2,
      "h": 2,
      "d": 2,
      "permanent": @json.to_json(i != 2),
      "circuitKey": @json.to_json(i.to_string()),
    })
    let wall = tri("world/walls/" + i.to_string() + "/mesh", x)
    let attachments = if i < 2 {
      [tri("world/occluders/" + (i + 1).to_string() + "/meshes/0/mesh", 0)]
    } else {
      [
        tri("world/occluders/0/meshes/0/mesh", 1),
        tri("world/occluders/0/meshes/1/mesh", 2),
      ]
    }
    set_children(wall, attachments)
    walls.push(wall)
  }
  set_children(scene.get("object"), walls)
  @art.bake_fittings(
    scene,
    v => v.cast(),
    @art.FixtureLayout::from_catalog(@json.from_json(Json::array(defs)), []),
  )
  let materials = resources(scene, "materials")
  for wall in walls[:2] {
    assert_eq(@model.str(wall, "geometry"), "tri")
    let m = materials[@model.str(wall, "material")]
    assert_eq(@model.str(m, "uuid"), "iron")
    assert_eq(quantity(m, "side"), 2)
  }
  let batch = by_key(
    rows(scene.get("object"), "children"),
    "type",
    "BatchedMesh",
  )
  assert_true(@model.truth(batch, "castShadow"))
  assert_eq(rows(batch, "instanceInfo").length(), 2)
  expect_json(batch.get("boundingBox"), { "min": [0, 0, 0], "max": [37, 1, 0] })
  let door = walls[2]
  assert_eq(@model.str(door, "material"), "iron")
  assert_eq(rows(door, "children").length(), 1)
  let merged = resources(scene, "geometries")[@model.str(
      @model.children(door)[0],
      "geometry",
    )]
  assert_eq(
    doubles(merged.get("data").get("attributes").get("position").get("array"))[0],
    1,
  )
}

///|
test "hardware instances retain active transforms, depth layers and the original index range" {
  let scene = batch_scene()
  let geo = @model.array(scene, "geometries")[0].get("data")
  let idx = raw({ "type": "Uint16Array", "itemSize": 1 })
  idx.set(
    "array",
    Raw::of(@archive.typed("Uint16Array", raw([0, 1, 2, 3, 4, 5]))),
  )
  geo.set("index", idx)
  for key in @archive.keys(geo.get("attributes")) {
    let a = geo.get("attributes").get(key)
    a.set(
      "array",
      raw({
        "type": "Float32Array",
        "byteOffset": 0,
        "length": @json.to_json(6.0 * quantity(a, "itemSize")),
      }),
    )
  }
  @model.array(scene, "materials")[0].set("colorWrite", Raw::of(false))
  scene.set("textures", raw([{ "uuid": "matrices", "image": "data" }]))
  let transforms = []
  let instances = []
  for i in 0..<128 {
    for e in doubles(raw(matrix(x=i.to_double()))) {
      transforms.push(e)
    }
    instances.push(
      raw({
        "geometryIndex": 0,
        "active": @json.to_json(i != 1),
        "visible": @json.to_json(i != 3),
      }),
    )
  }
  scene.set(
    "images",
    raw([{ "uuid": "data", "url": { "data": @json.to_json(transforms) } }]),
  )
  let batch = raw({
    "type": "BatchedMesh",
    "uuid": "depth",
    "name": "static/plates",
    "geometry": "tri",
    "material": "iron",
    "matrix": matrix(x=5),
    "layers": 4,
    "matricesTexture": { "uuid": "matrices" },
    "geometryInfo": [
      { "vertexStart": 3, "vertexCount": 3, "start": 3, "count": 3 },
    ],
  })
  batch.set("instanceInfo", Raw::from_array(instances[:]))
  set_children(scene.get("object"), [batch])
  @art.extract_repeats(scene, v => v.cast())
  let xs = []
  for node in rows(scene.get("object"), "children") {
    assert_eq(@model.str(node, "type"), "InstancedMesh")
    assert_eq(quantity(node, "layers"), 4)
    assert_eq(doubles(node.get("matrix"))[12], 5)
    for i, x in doubles(node.get("instanceMatrix").get("array")) {
      if i % 16 == 12 {
        xs.push(x.to_int())
      }
    }
  }
  xs.sort()
  assert_eq(xs, [ for i in 0..<128 if i != 1 && i != 3 => i ])
  let gs = rows(scene, "geometries")
  let g = gs[gs.length() - 1]
  expect_json(
    @archive.array_copy(g.get("data").get("index").get("array").cast()),
    [0, 1, 2],
  )
  assert_eq(
    quantity(
      g.get("data").get("attributes").get("position").get("array"),
      "byteOffset",
    ),
    36,
  )
}

///|
test "roller instances keep segment transforms and independent belt animations" {
  let scene = batch_scene()
  let segments = []
  for (belt, offset) in [("feed", 10.0), ("return", 80.0)] {
    let path = "world/belts/" + belt + "/segments/0"
    let seg = raw({
      "type": "Group",
      "matrix": matrix(x=offset),
      "userData": { "binding": @json.to_json(path + "/root") },
    })
    set_children(seg, [
      tri(path + "/rollers/0", -2),
      tri(path + "/rollers/1", 3),
    ])
    segments.push(seg)
  }
  set_children(scene.get("object"), segments)
  @art.extract_repeats(scene, v => v.cast())
  let nodes = rows(scene.get("object"), "children")
  for seg in segments {
    let root = nodes
      .iter()
      .find_first(n => @model.binding(n) == @model.binding(seg))
      .unwrap()
    let batch_id = @model.str(
      @model.data(@model.children(root)[0]),
      "rollerBatch",
    )
    let batch = nodes
      .iter()
      .find_first(n => @model.binding(n) == batch_id)
      .unwrap()
    assert_eq(@model.str(batch, "type"), "InstancedMesh")
    assert_eq(quantity(batch, "count"), 2)
    for roller in rows(root, "children") {
      assert_eq(@model.str(roller, "type"), "Object3D")
      assert_eq(
        @model.str(@model.data(roller), "rollerBatch"),
        @model.binding(batch),
      )
      let idx = quantity(@model.data(roller), "instance").to_int() * 16 + 12
      assert_eq(
        doubles(batch.get("instanceMatrix").get("array"))[idx],
        doubles(root.get("matrix"))[12] + doubles(roller.get("matrix"))[12],
      )
    }
  }
}

///|
test "static switch housings batch across circuits and moving controls and lamps remain independent" {
  let s = batch_scene()
  let roots = []
  let retained = []
  let controls : Array[@catalog.Control] = @json.from_json([
    { "id": "left", "kind": "shot", "x": 0, "y": 0, "z": 0 },
    { "id": "right", "kind": "shot", "x": 20, "y": 0, "z": 0 },
    {
      "id": "carriage",
      "kind": "shot",
      "x": 40,
      "y": 0,
      "z": 0,
      "mount": "lift",
    },
    {
      "id": "other-carriage",
      "kind": "shot",
      "x": 60,
      "y": 0,
      "z": 0,
      "mount": "lift",
    },
  ])
  for control in controls {
    let id = control.id
    let binding = "world/controls/" + id
    let root = raw({
      "type": "Group",
      "uuid": @json.to_json(id),
      "matrix": matrix(x=control.x),
      "userData": { "binding": @json.to_json(binding + "/root") },
    })
    let inner = raw({
      "type": "Group",
      "name": @json.to_json("local-circuit:" + id),
      "matrix": matrix(x=1),
    })
    if control.mount is Some(_) {
      @archive.remove(root, "uuid")
    }
    let a = tri("", 2)
    a.set("uuid", Raw::of("shared-with-lamp"))
    a.set("name", Raw::of("Control bezel · outer"))
    let b = tri("", 4)
    @archive.remove(b, "uuid")
    b.set("name", Raw::of("Control bezel · inner"))
    set_children(inner, [a, b])
    let lamp = tri(binding + "/lamp", 5)
    lamp.set("uuid", Raw::of("shared-with-lamp"))
    set_children(root, [inner, lamp])
    roots.push(root)
    retained.push((inner, lamp))
  }
  set_children(s.get("object"), roots)
  @art.bake_fittings(
    s,
    v => v.cast(),
    @art.FixtureLayout::from_catalog([], controls),
  )
  let combined = rows(s.get("object"), "children").filter(n => {
    @model.str(n, "type") == "BatchedMesh"
  })
  assert_eq(combined.length(), 1)
  expect_json(combined[0].get("boundingBox"), {
    "min": [3, 0, 0],
    "max": [26, 1, 0],
  })
  for root in roots[2:] {
    let draws = rows(root, "children").filter(n => {
      @model.str(n, "name") == "Workshop fittings"
    })
    assert_eq(draws.length(), 1)
    let mesh = resources(s, "geometries")[@model.str(draws[0], "geometry")]
    assert_eq(
      doubles(mesh.get("data").get("attributes").get("position").get("array")).length(),
      18,
    )
  }
  for i, root in roots {
    let (wrapper, lamp) = retained[i]
    assert_true(
      rows(s.get("object"), "children").any(n => n.strict_equal(root)),
    )
    let children = rows(root, "children")
    assert_true(children.any(n => n.strict_equal(wrapper)))
    assert_true(rows(wrapper, "children").is_empty())
    assert_true(children.any(n => n.strict_equal(lamp)))
    assert_eq(@model.str(lamp, "material"), "iron")
  }
}

///|
fn panel_geometry(positions : Json) -> Raw {
  let panel = raw({
    "uuid": "panel",
    "data": {
      "attributes": {},
      "index": { "type": "Uint16Array", "itemSize": 1 },
    },
  })
  let geometry = panel.get("data")
  geometry.get("attributes").set("position", vector_attr(3, positions))
  geometry
  .get("index")
  .set("array", Raw::of(@archive.typed("Uint16Array", raw([0, 1, 2, 0, 2, 3]))))
  panel
}

///|
test "camera bounds follow their placed fixture without sealing panel gaps" {
  let geo = panel_geometry([0, 0, 0, 0, 3, 0, 0, 3, 4, 0, 0, 4])
  let s = raw({
    "materials": [{ "uuid": "metal" }],
    "object": {
      "matrix": matrix(x=5),
      "userData": { "binding": "station/fixture-collider" },
      "children": [
        { "matrix": matrix(), "geometry": "panel", "material": "metal" },
        {
          "matrix": matrix(z=4),
          "geometry": "panel",
          "material": "metal",
          "visible": false,
        },
      ],
    },
  })
  s.set("geometries", Raw::from_array([geo]))
  @art.camera_faces(s, v => v.cast())
  expect_json(s.get("object").get("userData").get("cameraFaces"), [
    [5, 0, 0, 5, 3, 4],
  ])
  geo
  .get("data")
  .get("index")
  .set("array", Raw::of(@archive.typed("Uint16Array", raw([0, 1, 2, 0, 1, 3]))))
  @art.camera_faces(s, v => v.cast())
  expect_json(s.get("object").get("userData").get("cameraFaces"), [])
}

///|
fn portals(material : Json) -> Raw {
  let scene = raw({
    "object": {
      "matrix": matrix(),
      "children": [
        {
          "name": "City · building envelope",
          "matrix": matrix(),
          "children": [
            {
              "type": "Mesh",
              "material": "wall",
              "geometry": "panel",
              "userData": { "renderRole": "enclosure" },
              "matrix": matrix(),
            },
          ],
        },
      ],
    },
    "materials": [material],
  })
  scene.set(
    "geometries",
    Raw::from_array([
      panel_geometry([156, -42, 36, 156, 0, 36, 156, 0, 42, 156, -42, 42]),
    ]),
  )
  let m = @model.array(scene, "materials")[0]
  m.set("uuid", Raw::of("wall"))
  m.set("userData", raw({ "renderRole": "enclosure" }))
  @art.room_portals(scene, v => v.cast())
  @model.get(@model.data(scene.get("object")), "portalRooms")
}

///|
test "a one-sided enclosure seals only its front and keeps adjacent doorways open" {
  let rooms : Array[@scene_format.Room] = @json.from_json(portals({}).to_json())
  fn solid_face(sign : Int32, z : Double) -> Bool raise {
    for room in rooms {
      for edge in room.portals {
        let { min, max, } = edge.bounds
        if edge.destination >= 0 &&
          edge.face == sign &&
          min.0 == 156 &&
          min.1 < -15 &&
          max.1 > -15 &&
          min.2 < z &&
          z < max.2 {
          return edge.solid
        }
      }
    }
    fail("Missing portal at z=" + z.to_string())
  }
  assert_true(solid_face(-1, 39))
  assert_false(solid_face(1, 39))
  assert_false(solid_face(-1, 45))
  assert_false(solid_face(1, 45))
  assert_true(portals({ "transparent": true }).is_undefined())
  assert_true(portals({ "alphaTest": 0.5 }).is_undefined())
}

///|
test "compiled art preserves typed pixels and independent attributes with identical contents" {
  let dir = temp_dir()
  defer @fs.remove_dir(dir)
  let attr : Json = {
    "itemSize": 3,
    "type": "Float32Array",
    "array": { "byteOffset": 0, "length": 3, "type": "Float32Array" },
  }
  let scene = raw({
    "object": {
      "uuid": "scene",
      "type": "Scene",
      "matrix": matrix(),
      "children": [
        {
          "uuid": "model",
          "type": "Mesh",
          "geometry": "mesh",
          "material": "metal",
          "matrix": matrix(),
        },
      ],
    },
    "geometries": [
      {
        "uuid": "mesh",
        "data": { "attributes": { "position": attr, "normal": attr } },
      },
    ],
    "materials": [{ "uuid": "metal", "envMap": "probe" }, { "uuid": "unused" }],
    "textures": [{ "uuid": "probe", "image": "hdr" }],
    "images": [
      {
        "uuid": "hdr",
        "url": {
          "type": "Uint16Array",
          "width": 1,
          "height": 1,
          "data": [0, 3, 32768, 65535],
        },
      },
    ],
  })
  @archive.write_json_gz(dir + "/city.scene.json.gz", scene)
  @fs.write_bytes_to_file(
    dir + "/city.buffers.bin.gz",
    @archive.compress(
      @archive.byte_view(@archive.typed("Float32Array", raw([-4, 7, 3.5]))),
    ),
  )
  @art.bake_city(dir, dir, @art.FixtureLayout::from_catalog([], []), [])
  let packed = @archive.read_json_gz(dir + "/folded-scene.json.gz")
  let views : @scene_format.PackedViews = @json.from_json(
    @archive.read_json_gz(dir + "/folded-views.json.gz").to_json(),
  )
  let bytes = @archive.decompress(
    @fs.read_file_to_bytes(dir + "/folded-buffers.bin.gz"),
  )
  assert_eq(rows(packed, "materials").map(@model.uuid), ["metal"])
  expect_json(@model.array(packed, "images")[0].get("url").get("data"), [])
  fn values(desc : @scene_format.BufferView) -> Array[Double] {
    @archive.view(bytes, raw(@json.ToJson::to_json(desc))).to_array()
  }
  let attributes = views.geometry["mesh"]
  assert_eq(values(views.images["probe"]), [0, 3, 32768, 65535])
  assert_eq(values(attributes["position"]), [-4, 7, 3.5])
  assert_eq(
    attributes["position"].byte_offset,
    attributes["normal"].byte_offset,
  )
  assert_true(attributes["normal"].copy)
}
