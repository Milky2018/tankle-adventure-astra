///|
extern "js" fn children(node : @core.JsValue) -> FixedArray[@core.JsValue] = "(n) => n.children ?? []"

///|
extern "js" fn binding(node : @core.JsValue) -> String = "(n) => n.userData?.binding ?? ''"

///|
extern "js" fn visible(node : @core.JsValue) -> Bool = "(n) => n.visible !== false"

///|
extern "js" fn has_order(node : @core.JsValue) -> Bool = "(n) => !!n.renderOrder"

///|
fn roller_key(belt : String, roller : Raw, material : Raw) -> String {
  let props = @archive.copy(material)
  for key in ["uuid", "name"] {
    @archive.remove(props, key)
  }
  @archive.stringify(
    Raw::from_array([
      Raw::of(belt),
      roller.get("geometry"),
      props,
      roller.get("castShadow"),
      roller.get("receiveShadow"),
      roller.get("layers"),
      roller.get("renderOrder"),
    ]),
  )
}

///|
fn attach_roller_batch(
  root : Raw,
  id : String,
  roller : Raw,
  matrix : FixedArray[Double],
  matrices : FixedArray[Double],
  count : Int32,
) -> Unit {
  let n = @archive.obj([
    ("uuid", Raw::of(id)),
    ("name", Raw::of("Conveyor rollers")),
    ("type", Raw::of("InstancedMesh")),
    ("matrix", Raw::of(matrix)),
    ("matrixAutoUpdate", Raw::of(false)),
  ])
  for
    key in [
      "geometry", "material", "layers", "renderOrder", "castShadow", "receiveShadow",
    ] {
    n.set(key, roller.get(key))
  }
  n.set("userData", @archive.obj([("binding", Raw::of(id))]))
  n.set("count", Raw::of(count))
  n.set(
    "instanceMatrix",
    @archive.obj([
      ("type", Raw::of("Float32Array")),
      ("itemSize", Raw::of(16)),
      ("array", Raw::of(matrices)),
      ("normalized", Raw::of(false)),
    ]),
  )
  append_item(root.get("children"), n)
}

///|
fn bind_roller(n : Raw, batch : String, index : Int32) -> Unit {
  n.set("type", Raw::of("Object3D"))
  n.get("userData").set("rollerBatch", Raw::of(batch))
  n.get("userData").set("instance", Raw::of(index))
  @archive.remove(n, "material")
  @archive.remove(n, "geometry")
}

///|
pub fn instance_belt_rollers(scene : @core.JsValue) -> Unit {
  let materials : Map[String, @core.JsValue] = Map([])
  let entries : FixedArray[@core.JsValue] = scene.get("materials").cast()
  for m in entries {
    materials[m.get("uuid").cast()] = m
  }
  let root = scene.get("object")
  let groups : Map[String, Array[(String, @core.JsValue, @core.JsValue)]] = Map([],
  )
  for segment in children(root) {
    guard visible(segment) &&
      !has_order(segment) &&
      segment.get("type").cast() == "Group" else {
      continue
    }
    let path = binding(segment)
    guard path.split("/").to_array()
      is ["world", "belts", belt, "segments", index, "root"] &&
      !belt.is_empty() &&
      !index.is_empty() &&
      index.iter().all(c => c >= '0' && c <= '9') else {
      continue
    }
    let prefix = "world/belts/\{belt}/segments/\{index}/rollers/"
    for roller in children(segment) {
      guard visible(roller) &&
        roller.get("type").cast() == "Mesh" &&
        children(roller).length() == 0 &&
        binding(roller).has_prefix(prefix) else {
        continue
      }
      guard materials.get(roller.get("material").cast()) is Some(material) else {
        continue
      }
      let k = roller_key(belt.to_owned(), roller, material)
      if groups.get(k) is None {
        groups[k] = []
      }
      groups[k].push((belt.to_owned(), segment, roller))
    }
  }
  let mut serial = 0
  for group in groups.values() {
    guard group.length() >= 2 else { continue }
    let id = "world/beltInstances/\{group[0].0}/\{serial}"
    serial += 1
    let matrices : Array[Double] = []
    for entry in group {
      let (_, segment, roller) = entry
      for
        n in compose_transform(
          segment.get("matrix").cast(),
          roller.get("matrix").cast(),
        ) {
        matrices.push(n)
      }
    }
    attach_roller_batch(
      root,
      id,
      group[0].2,
      identity(),
      FixedArray::from_array(matrices[:]),
      group.length(),
    )
    for index, entry in group {
      bind_roller(entry.2, id, index)
    }
  }
}
