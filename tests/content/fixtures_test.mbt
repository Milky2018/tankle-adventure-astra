///|
type Raw = @core.JsValue

///|
fn raw(value : Json) -> Raw {
  Raw::from_json(value)
}

///|
fn rows(value : Raw, key : String) -> Array[Raw] {
  Array::from_fixed_array(@model.array(value, key))
}

///|
fn quantity(value : Raw, key : String) -> Double {
  value.get(key).cast()
}

///|
fn matrix(x~ : Double = 0, y~ : Double = 0, z~ : Double = 0) -> Json {
  [
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    Json::number(x),
    Json::number(y),
    Json::number(z),
    1,
  ]
}

///|
fn by_key(items : Array[Raw], key : String, value : String) -> Raw {
  items.iter().filter(v => @model.str(v, key) == value).nth(0).unwrap()
}

///|
fn resources(scene : Raw, key : String) -> Map[String, Raw] {
  let result = Map([])
  for r in rows(scene, key) {
    result[@model.uuid(r)] = r
  }
  result
}

///|
fn read_json(path : String) -> Raw raise {
  raw(@json.parse(@fs.read_file_to_string(path)))
}

///|
fn records(name : String) -> Raw raise {
  read_json("content/levels/city/" + name + ".json")
}

///|
fn record(name : String, id : String) -> Raw raise {
  by_key(Array::from_fixed_array(@archive.items(records(name))), "id", id)
}

///|
fn expect_json(actual : Raw, expected : Json) -> Unit raise {
  guard !actual.is_undefined() else {
    fail("Expected " + expected.stringify() + ", got undefined")
  }
  let received = actual.to_json()
  if received != expected {
    fail("Expected " + expected.stringify() + ", got " + received.stringify())
  }
}

///|
fn temp_dir() -> String raise {
  @node.temp_dir("tankle-authoring-")
}

///|
fn copy_fixture(source : String, target : String) -> Unit raise {
  if @fs.is_dir(source) {
    @fs.create_dir(target)
    for entry in @fs.read_dir(source) {
      copy_fixture(
        (@path.Path(source) / @path.Path(entry)).to_string(),
        (@path.Path(target) / @path.Path(entry)).to_string(),
      )
    }
  } else {
    @fs.write_bytes_to_file(target, @fs.read_file_to_bytes(source))
  }
}

///|
fn cwd() -> String raise {
  guard @env.current_dir() is Some(path) else {
    raise Failure("Current working directory is unavailable")
  }
  path
}

///|
fn set_children(node : Raw, children : Array[Raw]) -> Unit {
  node.set("children", Raw::from_array(children[:]))
}

///|
fn raises_like(expected : String, action : () -> Unit raise) -> Unit raise {
  action() catch {
    err => {
      let s = match err {
        Failure(message) => message
        other => other.to_string()
      }
      assert_true(s.contains(expected), msg=s)
      return
    }
  }
  fail("Expected failure containing " + expected)
}

///|
fn project_world(project : Raw) -> Raw {
  project.get("scene").get("object")
}
