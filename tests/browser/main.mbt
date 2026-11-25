///|
async fn run() -> Bool {
  let choice = @env.args().get(2).unwrap_or("all")
  @node.run_moon(["build", "tests/browser/probe", "--release"])
  let executable = chrome_path()
  @fs.create_dir("output/browser")
  let profile = @node.temp_dir("tankle-browser-")
  defer @async.protect_from_cancel(() => remove_chrome_profile(profile))
  let proc = launch(executable, [
    "--remote-debugging-pipe",
    "--headless=new",
    "--user-data-dir=" + profile,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--window-size=1280,720",
    "about:blank",
  ]).wait()
  defer @async.protect_from_cancel(() => kill(proc).wait())
  let base = @env.get_env_var("TANKLE_URL").unwrap_or("http://127.0.0.1:5175")
  let b : Browser = {
    proc,
    stream: @js_async.ReadableStream::from_js(debugger_output(proc)),
    id: 0,
    session: "",
    errors: [],
    base,
    probe_id: "",
    firing: false,
    width: 1280,
    height: 720,
  }
  let success = try {
    b.attach()
    let choices = if choice == "all" {
      ["new-game", "camera", "performance", "campaign"]
    } else {
      [choice]
    }
    for name in choices {
      println("Running " + name)
      match name {
        "new-game" => b.new_game()
        "camera" => b.camera()
        "performance" => b.performance()
        "campaign" => b.campaign()
        _ =>
          raise Failure(
            "Expected all, new-game, camera, performance, or campaign",
          )
      }
      ensure(b.errors.is_empty(), b.errors.join("\n"))
      println("Passed " + name)
    }
    true
  } catch {
    e => {
      println("Browser check failed: " + e.to_string())
      try {
        b.shot("failure")
        println(
          if b.game_ready() {
            text(b.probe(PlayerSnapshot))
          } else {
            text(b.probe(BodyText))
          },
        )
        if !b.errors.is_empty() {
          println(b.errors.join("\n"))
        }
      } catch {
        _ => ()
      }
      false
    }
  }
  success
}

///|
async fn main {
  let ok = run() catch {
    err => {
      eprintln("Browser check failed: " + err.to_string())
      false
    }
  }
  if !ok {
    @env.exit(1)
  }
}

///|
// Chrome helpers can briefly keep files open after the browser exits on Windows.
async fn remove_chrome_profile(path : String) -> Unit {
  for attempt in 0..<7 {
    @fs.remove_dir(path) catch {
      e => {
        if !@fs.path_exists(path) {
          return
        }
        if attempt == 6 {
          raise e
        }
        @async.sleep((attempt + 1) * 100)
        continue
      }
    }
    return
  }
}
