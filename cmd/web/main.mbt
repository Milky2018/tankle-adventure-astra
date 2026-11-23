///|
async fn copy_tree(source : String, target : String) -> Unit {
  match @fs.kind(source) {
    Directory => {
      @fs.mkdir(target, recursive=true, allow_existing=true)
      for name in @fs.readdir(source) {
        copy_tree("\{source}/\{name}", "\{target}/\{name}")
      }
    }
    Regular => @fs.write_binary(target, @fs.read_binary(source))
    _ => raise Failure("Unexpected file type at \{source}")
  }
}

///|
async fn run_moon(args : Array[String]) -> Unit {
  @process.run("moon", args[:], accepted_exit_code=code => code == 0) |> ignore
}

///|
async fn main {
  for
    name in [
      "folded-scene.json.gz", "folded-buffers.bin.gz", "folded-views.json.gz",
    ] {
    guard @fs.exists("public/generated/art/\{name}") else {
      raise Failure(
        "Missing prepared city asset \{name}. See the Run section of README.md.",
      )
    }
  }
  run_moon([
    "run", "cmd/tuning", "--target", "native", "--", "content/abilities.json", "simulation/tuning.generated.mbt",
  ])
  run_moon(["build", "cmd/play", "--target", "js", "--release"])

  // Prepare on the destination filesystem before replacing a playable build.
  let stage = "_build/web-\{@env.now()}"
  @fs.mkdir(stage)
  let site = "\{stage}/site"
  let previous = "\{stage}/previous"
  errdefer @async.protect_from_cancel(() => {
    if !@fs.exists(previous) {
      @fs.remove(stage, recursive=true)
    }
  })
  copy_tree("public", site)
  copy_tree("index.html", "\{site}/index.html")
  copy_tree("browser/styles", "\{site}/browser/styles")
  for file in ["main.js", "host.js"] {
    copy_tree("browser/\{file}", "\{site}/browser/\{file}")
  }
  let game = "_build/js/release/build/cmd/play"
  @fs.mkdir("\{site}/\{game}", recursive=true)
  copy_tree("\{game}/play.js", "\{site}/\{game}/play.js")
  let had_previous = @fs.exists("dist")
  if had_previous {
    @fs.rename("dist", previous)
  }
  {
    errdefer @async.protect_from_cancel(() => {
      if had_previous {
        @fs.rename(previous, "dist")
      }
    })
    @fs.rename(site, "dist")
  }
  @fs.remove(stage, recursive=true)
  println("Game ready in dist/")
}
