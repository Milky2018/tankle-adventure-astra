///|
extern "js" fn run_moon(args : FixedArray[String]) -> Unit = "args => process.getBuiltinModule('child_process').execFileSync('moon',args,{stdio:'inherit'})"

///|
#module("node:fs")
extern "js" fn rename_file(source : String, destination : String) -> Unit = "renameSync"

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
#derive(FromJson, ToJson)
priv struct ArtCache {
  digest : String
  files : Array[String]
}

///|
fn sha256(data : Bytes) -> String {
  @crypto.bytes_to_hex_string(@crypto.sha256(data))
}

///|
fn bake_if_changed(level : @catalog.Level) -> Unit raise {
  // On Node the first two arguments identify the runtime and the compiled script.
  let hashes = [sha256(@fs.read_file_to_bytes(@env.args()[1]))]
  for dir in ["content/art", "content/levels/city"] {
    let names = @fs.read_dir(dir).to_owned()
    names.sort_by(String::lexical_compare)
    for name in names {
      hashes.push(name)
      hashes.push(sha256(@fs.read_file_to_bytes(dir + "/" + name)))
    }
  }
  let digest = sha256(@utf8.encode(hashes.join("\n")))
  let dest = "public/generated/art"
  let stamp = "_build/city-art-cache.json"
  let cached : ArtCache? = Some(@json.from_json(read_json(stamp))) catch {
    _ => None
  }
  if cached is Some(entry) &&
    entry.digest == digest &&
    !entry.files.is_empty() &&
    entry.files.every(name => @fs.path_exists(dest + "/" + name)) {
    return
  }
  @art.bake_city(
    "content/art",
    dest,
    @art.FixtureLayout::from_catalog(level.barriers, level.controls),
    required_roles(level),
  )
  let files = [
    "folded-scene.json.gz", "folded-views.json.gz", "folded-buffers.bin.gz",
  ]
  let images = @fs.read_dir(dest + "/images").to_owned()
  images.sort_by(String::lexical_compare)
  for name in images {
    files.push("images/" + name)
  }
  let entry : ArtCache = { digest, files, }
  guard @env.rand(16) is Some(random) else {
    raise Failure("Cannot allocate a unique cache file name")
  }
  let tmp = stamp + "." + @hex.encode(random)
  @fs.write_string_to_file(tmp, @json.to_json(entry).stringify())
  rename_file(tmp, stamp)
}

///|
fn main {
  try {
    let level = @catalog.decode(@catalog.read_directory("content/levels/city"))
    run_moon([
      "run", "--quiet", "scripts/tuning.mbtx", "--", "content/abilities.json", "simulation/tuning.generated.mbt",
    ])
    generate_levels(level)
    generate_audio()
    bake_if_changed(level)
  } catch {
    e => {
      eprintln(e)
      @env.exit(1)
    }
  }
}
