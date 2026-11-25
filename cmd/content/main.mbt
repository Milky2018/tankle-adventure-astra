///|
extern "js" fn run_moon(args : FixedArray[String]) -> Unit = "args => process.getBuiltinModule('child_process').execFileSync('moon',args,{stdio:'inherit'})"

///|
extern "js" fn executable() -> String = "()=>process.argv[1]"

///|
extern "js" fn rename_file(source : String, destination : String) -> Unit = "(a,b)=>process.getBuiltinModule('fs').renameSync(a,b)"

///|
extern "js" fn unique_id() -> String = "()=>crypto.randomUUID()"

///|
fn read_catalog() -> Record raise {
  let records = Map([])
  for name in @archive.list_files("content/levels/city") {
    if name.strip_suffix(".json") is Some(stem) {
      records[stem.to_owned()] = catalog(stem.to_owned())
    }
  }
  records
}

///|
fn validate_roles(scene : @archive.Raw, catalog : Record) -> Unit raise {
  let geometries = Set([])
  for g in @archive.items(scene.get("geometries")) {
    geometries.add(@archive.str(g, "uuid"))
  }
  let bindings = Set([])
  fn visit(n : @archive.Raw) -> Unit raise {
    let id = @archive.str(n, "geometry")
    if !id.is_empty() && !geometries.contains(id) {
      raise Failure(
        "Missing geometry " + id + " for " + @archive.str(n, "name"),
      )
    }
    let matrix : FixedArray[Double] = @archive.items(n.get("matrix")).map(x => {
      x.cast()
    })
    guard matrix.iter().all(v => v.is_finite()) else {
      raise Failure("Invalid scene transform: " + @archive.str(n, "uuid"))
    }
    let binding = @archive.str(n.get("userData"), "binding")
    if !binding.is_empty() {
      if bindings.contains(binding) {
        raise Failure("Duplicate scene binding: " + binding)
      }
      bindings.add(binding)
    }
    for c in @archive.items(n.get("children")) {
      visit(c)
    }
  }
  visit(scene.get("object"))
  fn require_binding(s : String) -> Unit raise {
    if !bindings.contains(s) {
      raise Failure(
        "Missing scene role: " + s + ". Add its bound art before building.",
      )
    }
  }
  for role in ["root", "body", "turret", "barrel"] {
    require_binding("player/" + role)
  }
  for e in list(catalog["enemies"]) {
    for role in ["root", "body", "turret"] {
      require_binding("enemies/" + text(object(e)["id"]) + "/model/" + role)
    }
  }
  for h in list(catalog["hives"]) {
    require_binding("world/hives/" + text(object(h)["id"]) + "/root")
  }
}

///|
fn bake_if_changed(records : Record) -> Unit raise {
  let hashes = [@archive.digest(@archive.read_file(executable()))]
  for dir in ["content/art", "content/levels/city"] {
    for name in @archive.list_files(dir) {
      hashes.push(name)
      hashes.push(@archive.digest(@archive.read_file(dir + "/" + name)))
    }
  }
  let digest = @archive.digest(@archive.Raw::of(hashes.join("\n")))
  let dest = "public/generated/art"
  let stamp = "_build/city-art-cache.json"
  let cached = if @archive.exists(stamp) {
    read_json(stamp) catch {
      _ => @json.null
    }
  } else {
    @json.null
  }
  if cached is Object(c) &&
    field(c, "digest") == Json::string(digest) &&
    field(c, "files") is Array(files) &&
    !files.is_empty() &&
    files.every(v => v is String(name) && @archive.exists(dest + "/" + name)) {
    return
  }
  validate_roles(
    @archive.read_json_gz("content/art/city.scene.json.gz"),
    records,
  )
  @art.bake_city(
    "content/art",
    dest,
    @archive.Raw::from_json(records["barriers"]).cast(),
    @archive.Raw::from_json(records["controls"]).cast(),
  )
  let files = [
    "folded-scene.json.gz", "folded-views.json.gz", "folded-buffers.bin.gz",
  ]
  for name in @archive.list_files(dest + "/images") {
    files.push("images/" + name)
  }
  let meta : Json = {
    "digest": Json::string(digest),
    "files": Json::array(files.map(Json::string)),
  }
  let tmp = stamp + "." + unique_id()
  write_text(tmp, meta.stringify())
  rename_file(tmp, stamp)
}

///|
fn main {
  try {
    run_moon([
      "run", "--quiet", "scripts/tuning.mbtx", "--", "content/abilities.json", "simulation/tuning.generated.mbt",
    ])
    let records = read_catalog()
    @catalog.validate(records)
    generate_levels(records)
    generate_audio()
    bake_if_changed(records)
  } catch {
    e => abort(e.to_string())
  }
}
