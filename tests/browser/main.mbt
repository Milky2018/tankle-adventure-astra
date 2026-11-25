///|
async fn main {
  let choice = @env.args().get(2).unwrap_or("all")
  let executable = chrome_path()
  mkdir("output/browser")
  let profile = temp_profile()
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
  ])
  let base = @env.get_env_var("TANKLE_URL").unwrap_or("http://127.0.0.1:5175")
  let b : Browser = {
    proc,
    stream: pipe_stream(proc),
    carry: "",
    id: 0,
    session: "",
    errors: [],
    base,
    yaw: 0,
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
          text(
            b.evaluate(
              "typeof __typedRead==='function' ? __typedRead() : document.title",
            ),
          ),
        )
      } catch {
        _ => ()
      }
      false
    }
  }
  kill(proc).wait()
  remove_profile(profile)
  if !success {
    @env.exit(1)
  }
}
