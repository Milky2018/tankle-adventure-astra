///|
async test "editor JSON round trip with a supplementary character at the output chunk boundary" {
  let target = temp_name(".tankle-editor-json")
  defer (if @fs.path_exists(target) { @fs.remove_file(target) })
  let text = "a".repeat(JSON_CHUNK - 1) + "🚇\t\"中"
  write_project(target, @archive.obj([("label", Raw::of(text))]))
  assert_true(@model.str(read_project(target), "label") == text)
}

///|
test "windowed editor import reads escaped delimiters, UTF-8 and nested arrays across file windows" {
  let path = temp_name(".tankle-editor-window")
  defer (if @fs.path_exists(path) { @fs.remove_file(path) })
  let prefix = "\u{feff}{\"layer\\\"\\u4e2d\":[[\""
  let x = "x".repeat(JSON_CHUNK - @utf8.encode(prefix).length() - 1)
  let y = "y".repeat(JSON_CHUNK - 2)
  // The escape starts on the last byte of one window, the scalar on the last
  // byte of the next. Enough numbers follow to split the nested array itself.
  let text = prefix +
    x +
    "\\\"" +
    y +
    "🚇\"," +
    "1.25,-2,".repeat(300000) +
    "{\"__proto__\":\"tail\"}]],\"zone\":7}"
  @fs.write_string_to_file(path, text)
  let project = read_project(path)
  let items = @archive.items(@archive.items(project.get("layer\"中"))[0])
  assert_eq(items.length(), 600002)
  assert_true(items[0].strict_equal(Raw::of(x + "\"" + y + "🚇")))
  assert_true(items[600000].strict_equal(Raw::of(-2)))
  assert_eq(@model.str(items[600001], "__proto__"), "tail")
  assert_true(project.get("zone").strict_equal(Raw::of(7)))
}
