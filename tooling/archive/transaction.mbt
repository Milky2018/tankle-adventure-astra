///|
/// Each save claims a unique directory before checking for other writers. A
/// contender either sees the first writer or is seen by it; both may back off.
fn with_writer(publish : (String) -> Unit raise) -> Unit raise {
  guard @env.rand(16) is Some(nonce) else {
    raise Failure("Cannot allocate a save directory")
  }
  let stage = "content/.city-save-\{@node.process_id()}-\{digest(nonce)}"
  @fs.create_dir(stage)
  defer (if !@fs.path_exists(stage + "/journal.json") { @fs.remove_dir(stage) })
  let abandoned = []
  for (dir, pid) in save_directories() {
    if dir == stage || !@fs.path_exists(dir) {
      continue
    }
    guard !@node.process_exists(pid) else {
      raise Failure("Another city save is in progress")
    }
    abandoned.push(dir)
  }
  for dir in abandoned {
    rollback(dir)
    if @fs.path_exists(dir) {
      @fs.remove_dir(dir)
    }
  }
  publish(stage)
}

///|
fn save_directories() -> Array[(String, Int32)] raise {
  let found = []
  for name in @fs.read_dir("content") {
    if name.strip_prefix(".city-save-") is Some(suffix) &&
      suffix.split_once("-") is Some((pid, nonce)) &&
      nonce.length() == 64 &&
      nonce.iter().all(c => c.is_ascii_hexdigit()) &&
      (Some(@string.parse_int(pid)) catch { _ => None }) is Some(pid) &&
      pid > 0 {
      found.push(("content/" + name, pid))
    }
  }
  found
}

///|
pub fn recover_city_save() -> Unit raise {
  if !save_directories().is_empty() {
    with_writer(_ => ())
  }
}

///|
fn city_file(path : String) -> Bool {
  match path.split("/").to_array() {
    ["content", "abilities.json"] => true
    ["content", "art", "city.scene.json.gz" | "city.buffers.bin.gz"] => true
    ["content", "levels", "city", name] =>
      name.has_suffix(".json") && !name.contains("..") && !name.contains("\\")
    _ => false
  }
}

///|
fn rollback(stage : String) -> Unit raise {
  let journal = stage + "/journal.json"
  if !@fs.path_exists(journal) {
    return
  }
  let entries : Array[(String, Bool)] = @json.from_json(
    @json.parse(@fs.read_file_to_string(journal)),
  )
  for i, (path, existed) in entries {
    guard city_file(path) else {
      raise Failure("Invalid path in city save journal")
    }
    if @fs.path_exists("\{stage}/new-\{i}") {
      continue
    }
    let backup = "\{stage}/old-\{i}"
    if existed {
      if @fs.path_exists(backup) {
        @node.rename(backup, path)
      }
    } else if @fs.path_exists(path) {
      @fs.remove_file(path)
    }
  }
  @fs.remove_file(journal)
}

///|
pub fn publish_content(
  output : Map[String, Bytes],
  check_current~ : () -> Unit raise,
) -> Unit raise {
  with_writer(stage => {
    check_current()
    let entries = []
    for path, bytes in output {
      guard city_file(path) else {
        raise Failure("Invalid city save path: " + path)
      }
      let i = entries.length()
      let existed = @fs.path_exists(path)
      if existed {
        let backup = @fs.read_file_to_bytes(path)
        if backup == bytes {
          continue
        }
        @fs.write_bytes_to_file("\{stage}/old-\{i}", backup)
      }
      @fs.write_bytes_to_file("\{stage}/new-\{i}", bytes)
      entries.push((path, existed))
    }
    if entries.is_empty() {
      return
    }
    // Publish the journal only after all staged files and backups are complete.
    @fs.write_string_to_file(
      stage + "/staged",
      @json.to_json(entries).stringify(),
    )
    @node.rename(stage + "/staged", stage + "/journal.json")
    errdefer rollback(stage)
    for i, (path, _) in entries {
      @node.rename("\{stage}/new-\{i}", path)
    }
    @fs.remove_file(stage + "/journal.json")
  })
}
