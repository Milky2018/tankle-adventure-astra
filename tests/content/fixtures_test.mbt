///|
type Raw = @core.JsValue

///|
fn raw(value : Json) -> Raw {
  Raw::from_json(value)
}

///|
fn lookup(value : Raw, path : String) -> Raw {
  let mut result = value
  for key in path.split(".") {
    result = @archive.prop(result, key.to_owned())
  }
  result
}

///|
fn rows(value : Raw, path : String) -> Array[Raw] {
  Array::from_fixed_array(@archive.items(lookup(value, path)))
}

///|
fn quantity(value : Raw, path : String) -> Double {
  lookup(value, path).cast()
}

///|
fn name_at(value : Raw, path : String) -> String {
  let item = lookup(value, path)
  if item.is_null() || item.is_undefined() {
    ""
  } else {
    item.cast()
  }
}

///|
fn flag(value : Raw, path : String) -> Bool {
  lookup(value, path).strict_equal(Raw::of(true))
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
  items.iter().filter(v => name_at(v, key) == value).nth(0).unwrap()
}

///|
fn resources(scene : Raw, key : String) -> Map[String, Raw] {
  let result = Map([])
  for r in rows(scene, key) {
    result[name_at(r, "uuid")] = r
  }
  result
}

///|
fn read_json(path : String) -> Raw {
  @archive.parse(@archive.read_file(path))
}

///|
fn records(name : String) -> Raw {
  read_json("content/levels/city/" + name + ".json")
}

///|
fn record(name : String, id : String) -> Raw {
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
fn read_catalog() -> @catalog.Record {
  let result = Map([])
  for name in @archive.list_files("content/levels/city") {
    if name.strip_suffix(".json") is Some(key) {
      result[key.to_owned()] = records(key.to_owned()).to_json()
    }
  }
  result
}

///|
extern "js" fn temp_dir() -> String =
  #| () => process.getBuiltinModule("fs").mkdtempSync(process.getBuiltinModule("path").join(process.getBuiltinModule("os").tmpdir(),"tankle-authoring-"))

///|
extern "js" fn remove_dir(path : String) -> Unit =
  #| path => process.getBuiltinModule("fs").rmSync(path,{recursive:true,force:true})

///|
extern "js" fn copy_dir(source : String, target : String) -> Unit =
  #| (src,dst) => process.getBuiltinModule("fs").cpSync(src,dst,{recursive:true})

///|
extern "js" fn cwd() -> String = "() => process.cwd()"

///|
extern "js" fn chdir(path : String) -> Unit = "path => process.chdir(path)"

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
