///|
fn vector_attr(size : Int32, values : Json) -> Raw {
  @archive.obj([
    ("itemSize", Raw::of(size)),
    ("type", Raw::of("Float32Array")),
    ("array", @archive.typed("Float32Array", raw(values))),
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
  let attrs = lookup(scene, "geometries.0.data.attributes")
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
  let defs = []
  let walls = []
  for i, x in [0.0, 36, 48] {
    defs.push(
      raw({
        "x": @json.to_json(x - 1),
        "y": -1,
        "z": -1,
        "w": 2,
        "h": 2,
        "d": 2,
        "permanent": @json.to_json(i != 2),
        "circuitKey": @json.to_json(i.to_string()),
      }),
    )
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
  @art.bake_fittings(scene, v => v, FixedArray::from_array(defs[:]), [])
  let materials = resources(scene, "materials")
  for wall in walls[:2] {
    assert_eq(name_at(wall, "geometry"), "tri")
    let m = materials[name_at(wall, "material")]
    assert_eq(name_at(m, "uuid"), "iron")
    assert_eq(quantity(m, "side"), 2)
  }
  let batch = by_key(rows(scene, "object.children"), "type", "BatchedMesh")
  assert_true(flag(batch, "castShadow"))
  assert_eq(rows(batch, "instanceInfo").length(), 2)
  expect_json(batch.get("boundingBox"), { "min": [0, 0, 0], "max": [37, 1, 0] })
  let door = walls[2]
  assert_eq(name_at(door, "material"), "iron")
  assert_eq(rows(door, "children").length(), 1)
  let merged = resources(scene, "geometries")[name_at(
      door, "children.0.geometry",
    )]
  assert_eq(quantity(merged, "data.attributes.position.array.0"), 1)
}

///|
test "hardware instances retain active transforms, depth layers and the original index range" {
  let scene = batch_scene()
  let geo = lookup(scene, "geometries.0.data")
  let idx = raw({ "type": "Uint16Array", "itemSize": 1 })
  idx.set("array", @archive.typed("Uint16Array", raw([0, 1, 2, 3, 4, 5])))
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
  lookup(scene, "materials.0").set("colorWrite", Raw::of(false))
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
  @art.extract_repeats(scene, v => v)
  let xs = []
  for node in rows(scene, "object.children") {
    assert_eq(name_at(node, "type"), "InstancedMesh")
    assert_eq(quantity(node, "layers"), 4)
    assert_eq(quantity(node, "matrix.12"), 5)
    for i, x in doubles(lookup(node, "instanceMatrix.array")) {
      if i % 16 == 12 {
        xs.push(x.to_int())
      }
    }
  }
  xs.sort()
  assert_eq(xs, [ for i in 0..<128 if i != 1 && i != 3 => i ])
  let gs = rows(scene, "geometries")
  let g = gs[gs.length() - 1]
  expect_json(@archive.array_copy(lookup(g, "data.index.array")), [0, 1, 2])
  assert_eq(quantity(g, "data.attributes.position.array.byteOffset"), 36)
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
  @art.extract_repeats(scene, v => v)
  let nodes = rows(scene, "object.children")
  for seg in segments {
    let root = by_key(
      nodes,
      "userData.binding",
      name_at(seg, "userData.binding"),
    )
    let batch = by_key(
      nodes,
      "userData.binding",
      name_at(root, "children.0.userData.rollerBatch"),
    )
    assert_eq(name_at(batch, "type"), "InstancedMesh")
    assert_eq(quantity(batch, "count"), 2)
    for roller in rows(root, "children") {
      assert_eq(name_at(roller, "type"), "Object3D")
      assert_eq(
        name_at(roller, "userData.rollerBatch"),
        name_at(batch, "userData.binding"),
      )
      let idx = quantity(roller, "userData.instance").to_int() * 16 + 12
      assert_eq(
        doubles(lookup(batch, "instanceMatrix.array"))[idx],
        quantity(root, "matrix.12") + quantity(roller, "matrix.12"),
      )
    }
  }
}

///|
test "static switch housings batch across circuits and moving controls and lamps remain independent" {
  let s = batch_scene()
  let roots = []
  let controls = @archive.items(
    raw([
      { "id": "left" },
      { "id": "right" },
      { "id": "carriage", "mount": "lift" },
    ]),
  )
  for i, control in controls {
    let id = name_at(control, "id")
    let binding = "world/controls/" + id
    let root = raw({
      "type": "Group",
      "uuid": @json.to_json(id),
      "matrix": matrix(x=(i * 20).to_double()),
      "userData": { "binding": @json.to_json(binding + "/root") },
    })
    let inner = raw({
      "type": "Group",
      "name": @json.to_json("local-circuit:" + id),
      "matrix": matrix(x=1),
    })
    let a = tri("", 2)
    a.set("name", Raw::of("Control bezel · outer"))
    let b = tri("", 4)
    b.set("name", Raw::of("Control bezel · inner"))
    set_children(inner, [a, b])
    set_children(root, [inner, tri(binding + "/lamp", 5)])
    roots.push(root)
  }
  set_children(s.get("object"), roots)
  @art.bake_fittings(s, v => v, [], controls)
  let combined = rows(s, "object.children").filter(n => {
    name_at(n, "type") == "BatchedMesh"
  })
  assert_eq(combined.length(), 1)
  expect_json(combined[0].get("boundingBox"), {
    "min": [3, 0, 0],
    "max": [26, 1, 0],
  })
  assert_eq(
    rows(roots[2], "children")
    .filter(n => {
      name_at(n, "type") == "Mesh" && name_at(n, "userData.binding") == ""
    })
    .length(),
    1,
  )
  for root in roots {
    let lamps = rows(root, "children").filter(n => {
      name_at(n, "userData.binding").has_suffix("/lamp")
    })
    assert_eq(name_at(lamps[0], "material"), "iron")
  }
}

///|
test "camera bounds follow their placed fixture without sealing panel gaps" {
  let geo = raw({
    "uuid": "panel",
    "data": {
      "attributes": {
        "position": { "array": [0, 0, 0, 0, 3, 0, 0, 3, 4, 0, 0, 4] },
      },
      "index": { "array": [0, 1, 2, 0, 2, 3] },
    },
  })
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
  @art.camera_faces(s, v => v)
  expect_json(lookup(s, "object.userData.cameraFaces"), [[5, 0, 0, 5, 3, 4]])
  lookup(geo, "data.index").set("array", raw([0, 1, 2, 0, 1, 3]))
  @art.camera_faces(s, v => v)
  expect_json(lookup(s, "object.userData.cameraFaces"), [])
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
    "geometries": [
      {
        "uuid": "panel",
        "data": {
          "index": { "array": [0, 1, 2, 0, 2, 3] },
          "attributes": {
            "position": {
              "itemSize": 3,
              "array": [156, -42, 36, 156, 0, 36, 156, 0, 42, 156, -42, 42],
            },
          },
        },
      },
    ],
  })
  let m = lookup(scene, "materials.0")
  m.set("uuid", Raw::of("wall"))
  m.set("userData", raw({ "renderRole": "enclosure" }))
  @art.room_portals(scene, v => v)
  lookup(scene, "object.userData.portalRooms")
}

///|
test "a one-sided enclosure seals only its front and keeps adjacent doorways open" {
  let rooms = portals({})
  fn face(sign : Double, z : Double) -> Double raise {
    for room in @archive.items(rooms) {
      for edge in rows(room, "6") {
        let e = doubles(edge)
        if e[0] >= 0 &&
          e[1] == sign &&
          e[3] == 156 &&
          e[4] < -15 &&
          e[7] > -15 &&
          e[5] < z &&
          z < e[8] {
          return e[2]
        }
      }
    }
    fail("Missing portal at z=" + z.to_string())
  }
  assert_eq(face(-1, 39), 1)
  assert_eq(face(1, 39), 0)
  assert_eq(face(-1, 45), 0)
  assert_eq(face(1, 45), 0)
  assert_true(portals({ "transparent": true }).is_undefined())
  assert_true(portals({ "alphaTest": 0.5 }).is_undefined())
}

///|
test "compiled art preserves typed pixels and independent attributes with identical contents" {
  let dir = temp_dir()
  defer remove_dir(dir)
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
  @archive.write_file(
    dir + "/city.buffers.bin.gz",
    @archive.gzip(
      @archive.byte_view(@archive.typed("Float32Array", raw([-4, 7, 3.5]))),
    ),
  )
  @art.bake_city(dir, dir, [], [])
  let packed = @archive.read_json_gz(dir + "/folded-scene.json.gz")
  let views = @archive.read_json_gz(dir + "/folded-views.json.gz")
  let bytes = @archive.gunzip(
    @archive.read_file(dir + "/folded-buffers.bin.gz"),
  )
  assert_eq(rows(packed, "materials").map(m => name_at(m, "uuid")), ["metal"])
  expect_json(lookup(packed, "images.0.url.data"), [])
  fn values(path : String) -> Raw {
    @archive.array_copy(@archive.view(bytes, lookup(views, path)))
  }
  expect_json(values("images.probe"), [0, 3, 32768, 65535])
  expect_json(values("geometry.mesh.position"), [-4, 7, 3.5])
  assert_eq(
    quantity(views, "geometry.mesh.position.byteOffset"),
    quantity(views, "geometry.mesh.normal.byteOffset"),
  )
  assert_true(flag(views, "geometry.mesh.normal.copy"))
}
