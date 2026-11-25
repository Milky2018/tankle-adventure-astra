///|
pub struct EntityBundle {
  root : Raw
  objects : FixedArray[Raw]
}

///|
pub fn entity_bundle(scene : Raw, root : Raw) -> EntityBundle {
  let e = entity(root)
  let prefix = prefix_for(str(e, "collection"), str(e, "key"))
  let objects = children(scene)
    .iter()
    .filter(n => {
      n.strict_equal(root) || (prefix is Some(p) && belongs_to(binding(n), p))
    })
  { root, objects: FixedArray::from_iter(objects), }
}

///|
pub fn clone_entity(
  scene : Raw,
  source : Raw,
  id : String,
  offset~ : @math.Vector3 = @math.Vector3::new(0, 0, 0),
  defaults? : Raw,
) -> EntityBundle raise {
  let old = EntityRef::read(entity(source))
  let e : EntityRef = { collection: old.collection, id, key: id, index: None, }
  let game = clone(defaults.unwrap_or(get(data(source), "game")))
  game.set("id", Raw::of(id))
  if e.collection == "controls" {
    game.set("circuitKey", Raw::of(id))
    if defaults is Some(_) {
      game.set("effects", Raw::from_array([id]))
    } else if !exists(get(game, "effects")) {
      game.set("effects", Raw::from_array([old.id]))
    }
  }
  e.check_new(str(game, "id"))
  let bundle = entity_bundle(scene, source).clone_with_offset(
    offset,
    old_prefix=prefix_for(old.collection, old.key).unwrap(),
    prefix=prefix_for(e.collection, e.key).unwrap(),
  )
  let user = data(bundle.root)
  user.set("entity", Raw::from_json(@json.to_json(e)))
  user.set("game", game)
  bundle.root.set("name", Raw::of(e.collection + ": " + id))
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
fn EntityBundle::clone_with_offset(
  self : EntityBundle,
  offset : @math.Vector3,
  old_prefix~ : String,
  prefix~ : String,
) -> EntityBundle raise {
  let mats = Map([])
  let geos = Map([])
  fn resource(cache : Map[String, Raw], v : Raw) -> Raw {
    cache.get_or_init(uuid(v), () => clone_resource(v))
  }
  let mut cloned_root = None
  let objects = self.objects.map(original => {
    let c = clone_tree(original)
    @archive.walk(c, n => {
      let b = binding(n)
      if !b.is_empty() {
        let role = if b == old_prefix {
          prefix
        } else if b.strip_prefix(old_prefix + "/") is Some(tail) {
          prefix + "/" + tail.to_owned()
        } else {
          prefix + "/art/" + uuid(n)
        }
        data(n).set("binding", Raw::of(role))
      }
      if str(n, "name").contains("/") {
        n.set(
          "name",
          if !binding(n).is_empty() {
            data(n).get("binding")
          } else {
            n.get("type")
          },
        )
      }
      if exists(get(n, "geometry")) {
        n.set("geometry", resource(geos, n.get("geometry")))
      }
      let mat = get(n, "material")
      if exists(mat) {
        n.set(
          "material",
          if @archive.is_array(mat) {
            Raw::from_array(
              [ for m in @archive.items(mat) => resource(mats, m) ][:],
            )
          } else {
            resource(mats, mat)
          },
        )
      }
    })
    if original.strict_equal(self.root) {
      cloned_root = Some(c)
    }
    c
  })
  guard cloned_root is Some(root) else {
    raise Failure("Missing gameplay root")
  }
  for n in objects {
    let pos = n.get("position")
    set_position(
      n,
      number(pos, "x") + offset.x,
      number(pos, "y") + offset.y,
      number(pos, "z") + offset.z,
    )
    update_matrix_world(n)
  }
  { root, objects, }
}

///|
pub fn creation_offset(
  source : Raw,
  x : Double,
  ground : Double,
  z : Double,
) -> @math.Vector3 {
  let origin = elements(data(source).get("placement").get("origin"))
  let game = data(source).get("game")
  let base = if str(entity(source), "collection") == "controls" {
    if exists(get(game, "ground")) {
      number(game, "ground")
    } else {
      origin[1] - 1.3
    }
  } else {
    origin[1]
  }
  @math.Vector3::new(x - origin[0], ground - base, z - origin[2])
}

///|
extern "js" fn clone_resource(resource : Raw) -> Raw = "r=>r.clone()"

///|
extern "js" fn clone_tree(node : Raw) -> Raw = "n=>n.clone(true)"

///|
extern "js" fn set_position(
  node : Raw,
  x : Double,
  y : Double,
  z : Double,
) -> Unit = "(n,x,y,z)=>n.position.set(x,y,z)"

///|
extern "js" fn update_matrix_world(node : Raw) -> Unit = "n=>n.updateMatrixWorld(true)"
