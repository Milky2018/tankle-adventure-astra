///|
fn city() -> Raw {
  @archive.read_json_gz("content/art/city.scene.json.gz")
}

///|
fn city_buffers() -> Raw {
  @archive.gunzip(@archive.read_file("content/art/city.buffers.bin.gz"))
}

///|
fn doubles(value : Raw) -> Array[Double] {
  let a : FixedArray[Double] = value.cast()
  Array::from_fixed_array(a)
}

///|
fn fallback_number(r : Raw, key : String, fallback : Double) -> Double {
  let v = lookup(r, key)
  if v.is_undefined() {
    fallback
  } else {
    v.cast()
  }
}

///|
fn position_geometry(g : Raw, bytes : Raw) -> @core.BufferGeometry {
  let geo = @core.BufferGeometry::new()
  let p = lookup(g, "data.attributes.position")
  let array = @archive.view(bytes, p.get("array"))
  ignore(
    geo.set_attribute(
      "position",
      @core.BufferAttribute::new(array.cast(), quantity(p, "itemSize").to_int()),
    ),
  )
  let idx = lookup(g, "data.index.array")
  if !idx.is_undefined() {
    ignore(
      geo.set_index(
        @core.BufferAttribute::new(@archive.view(bytes, idx).cast(), 1),
      ),
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
    let binding = name_at(node, "userData.binding")
    if binding.has_prefix("enemies/") && !node.get("material").is_undefined() {
      models.push(node)
    }
  })
  let mut casings = 0
  for node in models {
    let binding = name_at(node, "userData.binding")
    let m = materials[name_at(node, "material")]
    assert_true(name_at(m, "userData.renderRole").is_empty(), msg=binding)
    if binding.has_suffix("/model/casting") {
      assert_eq(
        name_at(m, "userData.surfaceFinish"),
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
    if name_at(m, "userData.surfaceFinish") == "glass" {
      assert_true(flag(m, "transparent"))
      assert_true(m.get("depthWrite").strict_equal(Raw::of(false)))
      assert_true(quantity(m, "opacity") > 0 && quantity(m, "opacity") < 1)
      glazing.add(name_at(m, "uuid"))
    }
  }
  let geometries = resources(scene, "geometries")
  let bays = []
  @archive.walk(scene.get("object"), n => {
    if name_at(n, "type") == "Group" &&
      name_at(n, "name").has_prefix("Engine house · ") {
      bays.push(n)
    }
  })
  let mut tested = 0
  for bay in bays {
    let children = rows(bay, "children")
    let pane = children[children
      .search_by(c => glazing.contains(name_at(c, "material")))
      .unwrap()]
    let vertices = position_geometry(
        geometries[name_at(pane, "geometry")],
        bytes,
      )
      .get_attribute("position")
      .unwrap()
    let surround = [
      for n in children if !n.strict_equal(pane) => {
        mesh(position_geometry(geometries[name_at(n, "geometry")], bytes))
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
      p.x += (bounds.max.x - bounds.min.x) * 0.19
      p.z = bounds.max.z + 0.04
      let distance = distance_to(p, @math.Vector3::new(0, 0, -1), surround)
      assert_true(
        distance.is_finite() && distance > 0.45,
        msg=name_at(bay, "name"),
      )
      tested += 1
    }
  }
  assert_true(tested > 0)
}

///|
test "workshop interiors are enclosed and the open reservoir looks onto the quarry bank" {
  let scene = city()
  let bytes = city_buffers()
  let nodes = rows(scene, "object.children")
  let shell = by_key(nodes, "name", "City · building envelope")
  let materials = resources(scene, "materials")
  let geometries = resources(scene, "geometries")
  for m in materials.values() {
    let role = name_at(m, "userData.renderRole")
    let solid = name_at(m, "userData.surfaceFinish")
      is ("paving" | "masonry" | "ironwork")
    if role is ("structure" | "floor" | "floorDetail" | "scenery" | "belt") &&
      (m.get("map").is_undefined() || solid) &&
      !m.get("colorWrite").strict_equal(Raw::of(false)) &&
      fallback_number(m, "opacity", 1) == 1 &&
      m.get("alphaMap").is_undefined() &&
      fallback_number(m, "alphaTest", 0) == 0 {
      assert_false(flag(m, "transparent"), msg=role)
      assert_false(m.get("depthWrite").strict_equal(Raw::of(false)), msg=role)
    }
  }
  fn mesh_for(n : Raw) -> @core.Object3D {
    let g = position_geometry(geometries[name_at(n, "geometry")], bytes)
    let mat = materials[name_at(n, "material")]
    let m = mesh(g, side=fallback_number(mat, "side", 0).to_int())
    ignore(m.matrix.from_array(doubles(n.get("matrix"))))
    m.matrix_auto_update = false
    m.update_matrix_world()
    m
  }
  let meshes = []
  for n in rows(shell, "children") {
    let mat = materials[name_at(n, "material")]
    assert_eq(name_at(n, "userData.renderRole"), "enclosure")
    assert_false(flag(mat, "transparent"))
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
      msg=name_at(lift, "id"),
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
    if name_at(n, "type") == "BatchedMesh" &&
      name_at(materials[name_at(n, "material")], "userData.renderRole") ==
      "floor" {
      let matrices = doubles(
        lookup(images[name_at(n, "matricesTexture.image")], "url.data"),
      )
      let geometry = rows(n, "geometryInfo")
      for i, entry in rows(n, "instanceInfo") {
        guard flag(entry, "active") && flag(entry, "visible") else { continue }
        let g = geometry[quantity(entry, "geometryIndex").to_int()]
        let transform = world
          .clone()
          .multiply(@math.Matrix4::new().from_array(matrices, offset=i * 16))
        let lo = @math.Vector3::new(0, 0, 0).from_array(
          doubles(lookup(g, "boundingBox.min")),
        )
        let hi = @math.Vector3::new(0, 0, 0).from_array(
          doubles(lookup(g, "boundingBox.max")),
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
            msg=name_at(lift, "id") +
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
