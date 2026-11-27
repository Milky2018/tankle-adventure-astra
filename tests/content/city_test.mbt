///|
fn city() -> Raw raise {
  @archive.read_json_gz("content/art/city.scene.json.gz")
}

///|
fn city_buffers() -> Bytes raise {
  @archive.decompress(@fs.read_file_to_bytes("content/art/city.buffers.bin.gz"))
}

///|
fn doubles(value : Raw) -> Array[Double] {
  let a : FixedArray[Double] = value.cast()
  Array::from_fixed_array(a)
}

///|
fn fallback_number(r : Raw, key : String, fallback : Double) -> Double {
  let v = @model.get(r, key)
  if v.is_undefined() {
    fallback
  } else {
    v.cast()
  }
}

///|
fn position_geometry(g : Raw, bytes : Bytes) -> @core.BufferGeometry {
  let geo = @core.BufferGeometry::new()
  let p = g.get("data").get("attributes").get("position")
  let array = @archive.view(bytes, p.get("array"))
  ignore(
    geo.set_attribute(
      "position",
      @core.BufferAttribute::new(array, quantity(p, "itemSize").to_int()),
    ),
  )
  let idx = @model.get(g.get("data").get("index"), "array")
  if !idx.is_undefined() {
    ignore(
      geo.set_index(@core.BufferAttribute::new(@archive.view(bytes, idx), 1)),
    )
  }
  geo
}

///|
fn mesh(geometry : @core.BufferGeometry, side~ : Int32 = 0) -> @core.Object3D {
  let material = @core.MeshBasicMaterial::new()
  material.side = side
  @core.Mesh::new(geometry~, material=Single(material))
}

///|
fn distance_to(
  origin : @math.Vector3,
  direction : @math.Vector3,
  targets : Array[@core.Object3D],
) -> Double {
  let ray = @core.Raycaster::new(origin~, direction~)
  let hits = ray.intersect_objects(targets, recursive=false)
  if hits.is_empty() {
    @double.infinity
  } else {
    hits[0].distance
  }
}

///|
test "enemy models stay outside the scenery cutaway, including detached boss parts" {
  let scene = city()
  let materials = resources(scene, "materials")
  let models = []
  @archive.walk(scene.get("object"), node => {
    let binding = @model.binding(node)
    if binding.has_prefix("enemies/") && !node.get("material").is_undefined() {
      models.push(node)
    }
  })
  let mut casings = 0
  for node in models {
    let binding = @model.binding(node)
    let m = materials[@model.str(node, "material")]
    assert_true(
      @model.str(@model.data(m), "renderRole").is_empty(),
      msg=binding,
    )
    if binding.has_suffix("/model/casting") {
      assert_eq(
        @model.str(@model.data(m), "surfaceFinish"),
        "enemyEnamel",
        msg=binding,
      )
      casings += 1
    }
  }
  assert_true(casings > 0)
}

///|
test "workshop panes transmit the scene and sit in open window frames" {
  let scene = city()
  let bytes = city_buffers()
  let glazing = Set([])
  for m in rows(scene, "materials") {
    if @model.str(@model.data(m), "surfaceFinish") == "glass" {
      assert_true(@model.truth(m, "transparent"))
      assert_true(m.get("depthWrite").strict_equal(Raw::of(false)))
      assert_true(quantity(m, "opacity") > 0 && quantity(m, "opacity") < 1)
      glazing.insert(@model.str(m, "uuid"))
    }
  }
  let geometries = resources(scene, "geometries")
  let bays = []
  @archive.walk(scene.get("object"), n => {
    if @model.str(n, "type") == "Group" &&
      @model.str(n, "name").has_prefix("Factory windows · ") {
      bays.push(n)
    }
  })
  let mut tested = 0
  for bay in bays {
    let children = rows(bay, "children")
    guard children
      .iter()
      .find_first(c => glazing.contains(@model.str(c, "material")))
      is Some(pane) else {
      continue
    }
    let vertices = position_geometry(
        geometries[@model.str(pane, "geometry")],
        bytes,
      )
      .get_attribute("position")
      .unwrap()
    let surround = [
      for n in children if !n.strict_equal(pane) => {
        mesh(position_geometry(geometries[@model.str(n, "geometry")], bytes))
      }
    ]
    // Offset each sample from the centre to avoid window mullions.
    for start = 0; start < vertices.count(); start = start + 36 {
      let bounds = @math.Box3::new()
      for i = start; i < start + 36; i = i + 1 {
        ignore(
          bounds.expand_by_point(
            @math.Vector3::new(
              vertices.get_x(i),
              vertices.get_y(i),
              vertices.get_z(i),
            ),
          ),
        )
      }
      let p = bounds.get_center(@math.Vector3::new(0, 0, 0))
      let normal = if bounds.max.x - bounds.min.x < bounds.max.z - bounds.min.z {
        p.z += (bounds.max.z - bounds.min.z) * 0.19
        @math.Vector3::new(1, 0, 0)
      } else {
        p.x += (bounds.max.x - bounds.min.x) * 0.19
        @math.Vector3::new(0, 0, 1)
      }
      for sign in [-1.0, 1.0] {
        let direction = normal.clone().multiply_scalar(sign)
        let origin = p.clone().add_scaled_vector(direction, -0.2)
        assert_true(
          distance_to(origin, direction, surround) > 0.4,
          msg=@model.str(bay, "name"),
        )
      }
      tested += 1
    }
  }
  assert_true(tested > 0)
}

///|
test "workshop interiors are enclosed and the open reservoir looks onto the quarry bank" {
  let scene = city()
  let bytes = city_buffers()
  let nodes = rows(scene.get("object"), "children")
  let shell = by_key(nodes, "name", "City · building envelope")
  let materials = resources(scene, "materials")
  let geometries = resources(scene, "geometries")
  for m in materials.values() {
    let role = @model.str(@model.data(m), "renderRole")
    let solid = @model.str(@model.data(m), "surfaceFinish")
      is ("paving" | "masonry" | "ironwork")
    if role is ("structure" | "floor" | "floorDetail" | "scenery" | "belt") &&
      (m.get("map").is_undefined() || solid) &&
      !m.get("colorWrite").strict_equal(Raw::of(false)) &&
      fallback_number(m, "opacity", 1) == 1 &&
      m.get("alphaMap").is_undefined() &&
      fallback_number(m, "alphaTest", 0) == 0 {
      assert_false(@model.truth(m, "transparent"), msg=role)
      assert_false(m.get("depthWrite").strict_equal(Raw::of(false)), msg=role)
    }
  }
  fn mesh_for(n : Raw) -> @core.Object3D {
    let g = position_geometry(geometries[@model.str(n, "geometry")], bytes)
    let mat = materials[@model.str(n, "material")]
    let m = mesh(g, side=fallback_number(mat, "side", 0).to_int())
    ignore(m.matrix.from_array(doubles(n.get("matrix"))))
    m.matrix_auto_update = false
    m.update_matrix_world()
    m
  }
  let meshes = []
  for n in rows(shell, "children") {
    let mat = materials[@model.str(n, "material")]
    assert_eq(@model.str(@model.data(n), "renderRole"), "enclosure")
    assert_false(@model.truth(mat, "transparent"))
    assert_false(mat.get("depthWrite").strict_equal(Raw::of(false)))
    meshes.push(mesh_for(n))
  }
  let v = @math.Vector3::new
  let up = v(0, 1, 0)
  let down = v(0, -1, 0)
  let east = v(1, 0, 0)
  let west = v(-1, 0, 0)
  let north = v(0, 0, -1)
  let south = v(0, 0, 1)
  for
    point in [
      v(0, -6, 86),
      v(-126, 10, 19),
      v(82, 18, -129),
      v(284, 26, -24),
      v(290, -22, 120),
      v(69, -38, 63),
    ] {
    for direction in [up, down, east, west, north, south] {
      let d = distance_to(point, direction, meshes)
      assert_true(
        d > 1 && d < 230,
        msg="Interior sightline ends at " + d.to_string(),
      )
    }
  }
  let bank = mesh_for(by_key(nodes, "name", "Reservoir · far quarry face"))
  let quay = v(-143, -6, 115)
  for direction in [west, south] {
    let d = distance_to(quay, direction, [bank])
    assert_true(d > 45 && d < 150)
    assert_true(distance_to(quay, direction, meshes) > d)
  }
  for dir in [down, east, north] {
    assert_true(distance_to(quay, dir, meshes) < 230)
  }
  assert_true(distance_to(v(-110, -6, 83), up, meshes) < 30)
  for p in [v(198, 42, 146), v(183, 26, -30), quay] {
    assert_eq(distance_to(p, up, meshes), @double.infinity)
  }
  for lift in @archive.items(records("lifts")) {
    let stops = doubles(lift.get("stops"))
    stops.sort()
    let p = v(
      quantity(lift, "x") + quantity(lift, "w") / 2,
      stops[0],
      quantity(lift, "z") + quantity(lift, "d") / 2,
    )
    assert_true(
      distance_to(p, up, meshes) > stops[stops.length() - 1] - stops[0] + 2,
      msg=@model.str(lift, "id"),
    )
  }
}

///|
test "static floor and depth batches leave the lift carriages room to descend" {
  let scene = city()
  let lifts = @archive.items(records("lifts"))
  let materials = resources(scene, "materials")
  let images = resources(scene, "images")
  let mut checked = 0
  fn visit(n : Raw, parent : @math.Matrix4) -> Unit raise {
    if n.get("visible").strict_equal(Raw::of(false)) {
      return
    }
    let world = parent
      .clone()
      .multiply(@math.Matrix4::new().from_array(doubles(n.get("matrix"))))
    if @model.str(n, "type") == "BatchedMesh" &&
      @model.str(
        @model.data(materials[@model.str(n, "material")]),
        "renderRole",
      ) ==
      "floor" {
      let matrices = doubles(
        @model.get(
          @model.get(
            images[@model.str(n.get("matricesTexture"), "image")],
            "url",
          ),
          "data",
        ),
      )
      let geometry = rows(n, "geometryInfo")
      for i, entry in rows(n, "instanceInfo") {
        guard @model.truth(entry, "active") && @model.truth(entry, "visible") else {
          continue
        }
        let g = geometry[quantity(entry, "geometryIndex").to_int()]
        let transform = world
          .clone()
          .multiply(@math.Matrix4::new().from_array(matrices, offset=i * 16))
        let lo = @math.Vector3::new(0, 0, 0).from_array(
          doubles(g.get("boundingBox").get("min")),
        )
        let hi = @math.Vector3::new(0, 0, 0).from_array(
          doubles(g.get("boundingBox").get("max")),
        )
        let box = @math.Box3::new(min=lo, max=hi).apply_matrix4(transform)
        // Landing ramps may abut a shaft. Only slabs wholly inside constrain the carriage.
        for lift in lifts {
          let x = quantity(lift, "x")
          let z = quantity(lift, "z")
          if box.min.x < x - 0.01 ||
            box.max.x > x + quantity(lift, "w") + 0.01 ||
            box.min.z < z - 0.01 ||
            box.max.z > z + quantity(lift, "d") + 0.01 {
            continue
          }
          let stops = doubles(lift.get("stops"))
          if box.max.y < stops[0] - 4 ||
            box.min.y > stops[stops.length() - 1] + 1 {
            continue
          }
          checked += 1
          assert_true(
            box.max.y < stops[0] - 0.7,
            msg=@model.str(lift, "id") +
              " has static flooring in the carriage path",
          )
        }
      }
    }
    for c in rows(n, "children") {
      visit(c, world)
    }
  }
  visit(scene.get("object"), @math.Matrix4::new())
  assert_true(checked > 0)
}
