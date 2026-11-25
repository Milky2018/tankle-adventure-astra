///|
pub struct EntityBundle {
  root : @core.Object3D
  objects : Array[@core.Object3D]
}

///|
fn[T] bundle_members(
  children : Iter[T],
  owner : Raw,
  is_root : (T) -> Bool,
  binding : (T) -> String,
) -> Array[T] {
  let prefix = prefix_for(str(owner, "collection"), str(owner, "key"))
  children
  .filter(n => is_root(n) || (prefix is Some(p) && belongs_to(binding(n), p)))
  .to_array()
}

///|
pub fn entity_bundle(
  scene : @core.Object3D,
  root : @core.Object3D,
) -> EntityBundle {
  {
    root,
    objects: bundle_members(
      scene.children.iter(),
      root.user_data.get("entity"),
      n => n.id == root.id,
      n => str(n.user_data, "binding"),
    ),
  }
}

///|
pub fn clone_entity(
  scene : @core.Object3D,
  source : @core.Object3D,
  id : String,
  offset~ : @math.Vector3 = @math.Vector3::new(0, 0, 0),
  defaults? : Json,
) -> EntityBundle raise {
  guard exists(source.user_data.get("entity")) else {
    raise Failure("Missing gameplay identity on copied entity")
  }
  let old = EntityRef::read(source.user_data.get("entity"))
  let e : EntityRef = { collection: old.collection, id, key: id, index: None, }
  let properties = match defaults {
    Some(value) => value
    None => {
      let field = source.user_data.get("game")
      guard exists(field) else {
        raise Failure("Missing gameplay properties on copied entity")
      }
      field.to_json()
    }
  }
  guard properties is Object(original_game) else {
    raise Failure("Missing gameplay properties on copied entity")
  }
  let game = original_game.copy()
  game["id"] = Json::string(id)
  if e.collection == "controls" {
    game["circuitKey"] = Json::string(id)
    if defaults is Some(_) {
      game["effects"] = [id]
    } else if game.get("effects") is (None | Some(Null)) {
      game["effects"] = [old.id]
    }
  }
  e.check_new(id)
  let bundle = entity_bundle(scene, source).clone_with_offset(
    offset,
    old_prefix=prefix_for(old.collection, old.key).unwrap(),
    prefix=prefix_for(e.collection, e.key).unwrap(),
  )
  let user = bundle.root.user_data
  user.set("entity", Raw::from_json(@json.to_json(e)))
  user.set("game", Raw::from_json(Json::object(game)))
  bundle.root.name = e.collection + ": " + id
  if exists(get(user, "circuit")) {
    if defaults is Some(_) {
      @archive.remove(user, "circuit")
    } else {
      user.get("circuit").set("id", Raw::of(id))
    }
  }
  bundle
}

///|
// Retain sharing within the copied entity, independently of the original's resources.
fn[T] shared_clone(clone : (T) -> T) -> (T) -> T {
  let copies : @webgl.WeakMap[T, T] = @webgl.WeakMap::new()
  fn(source) {
    if copies.get(source) is Some(copy) {
      return copy
    }
    let copy = clone(source)
    copies.set(source, copy)
    copy
  }
}

///|
fn EntityBundle::clone_with_offset(
  self : EntityBundle,
  offset : @math.Vector3,
  old_prefix~ : String,
  prefix~ : String,
) -> EntityBundle raise {
  let clone_material = shared_clone(copy_material)
  let clone_geometry = shared_clone(copy_geometry)
  fn slot(value : @core.MaterialSlot) -> @core.MaterialSlot {
    match value {
      Single(material) => Single(clone_material(material))
      Multiple(materials) => Multiple(materials.map(clone_material))
    }
  }
  fn rebase(source : @core.Object3D, n : @core.Object3D) {
    if source_nodes.get(source) is Some(record) {
      source_nodes.set(n, record)
    }
    let b = str(n.user_data, "binding")
    if !b.is_empty() {
      let role = if b == old_prefix {
        prefix
      } else if b.strip_prefix(old_prefix + "/") is Some(tail) {
        prefix + "/" + tail.to_owned()
      } else {
        prefix + "/art/" + n.uuid
      }
      n.user_data.set("binding", Raw::of(role))
    }
    if n.name.contains("/") {
      let role = str(n.user_data, "binding")
      n.name = if role.is_empty() { n.type_ } else { role }
    }
    match (source.kind, n.kind) {
      (Mesh(a), Mesh(b)) => {
        b.geometry = clone_geometry(a.geometry)
        b.material = slot(a.material)
      }
      (Line(a), Line(b)) => {
        b.geometry = clone_geometry(a.geometry)
        b.material = slot(a.material)
      }
      (Points(a), Points(b)) => {
        b.geometry = clone_geometry(a.geometry)
        b.material = slot(a.material)
      }
      (Sprite(a), Sprite(b)) => {
        b.geometry = clone_geometry(a.geometry)
        b.material = clone_material(a.material)
      }
      _ => ()
    }
    for i, child in source.children {
      rebase(child, n.children[i])
    }
  }
  let mut cloned_root = None
  let objects = self.objects.map(original => {
    let c = original.clone()
    rebase(original, c)
    if original.id == self.root.id {
      cloned_root = Some(c)
    }
    c
  })
  guard cloned_root is Some(root) else {
    raise Failure("Missing gameplay root")
  }
  for n in objects {
    ignore(n.position.add(offset))
    n.update_matrix_world(force=true)
  }
  { root, objects, }
}

///|
pub fn creation_offset(
  source : @core.Object3D,
  x : Double,
  ground : Double,
  z : Double,
) -> @math.Vector3 raise {
  let origin = get(source.user_data.get("placement"), "origin")
  guard exists(origin) else {
    raise Failure("Missing template placement origin")
  }
  let (ox, oy, oz) : (Double, Double, Double) = @json.from_json(
    origin.to_json(),
  )
  let control_ground = get(source.user_data.get("game"), "ground")
  let base = if str(source.user_data.get("entity"), "collection") != "controls" {
    oy
  } else if exists(control_ground) {
    @json.from_json(control_ground.to_json())
  } else {
    oy - 1.3
  }
  @math.Vector3::new(x - ox, ground - base, z - oz)
}
