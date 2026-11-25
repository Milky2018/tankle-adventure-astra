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
fn required_roles(level : @catalog.Level) -> Array[String] {
  let roles = []
  for role in ["root", "body", "turret", "barrel"] {
    roles.push("player/" + role)
  }
  for e in level.enemies {
    for role in ["root", "body", "turret"] {
      roles.push("enemies/" + e.id + "/model/" + role)
    }
  }
  for hive in level.hives {
    roles.push("world/hives/" + hive.id + "/root")
  }
  roles
}

///|
fn bake_if_changed(records : Record, level : @catalog.Level) -> Unit raise {
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
  @art.bake_city(
    "content/art",
    dest,
    @art.FixtureLayout::from_catalog(
      required(records, "barriers"),
      required(records, "controls"),
    ),
    required_roles(level),
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
    let records = read_catalog()
    let level = @catalog.decode(records)
    run_moon([
      "run", "--quiet", "scripts/tuning.mbtx", "--", "content/abilities.json", "simulation/tuning.generated.mbt",
    ])
    generate_levels(records, level)
    generate_audio()
    bake_if_changed(records, level)
  } catch {
    e => report_error(e.to_string())
  }
}

///|
extern "js" fn report_error(message : String) -> Unit = "s=>{console.error(s);process.exitCode=1}"
