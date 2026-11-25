///|
fn message(err : Error) -> String {
  match err {
    Failure(s) => s
    @fs.IOError(detail) => detail
    other => other.to_string()
  }
}

///|
async fn main {
  try {
    let args = @env.args()[2:].to_owned()
    let root = cwd()
    match args.get(0).unwrap_or("serve") {
      "prepare-core" => ensure_three_file(root, "build/three.core.js")
      "serve" => {
        setup(root)
        ignore(run_moon(root, ["build", "editor", "--release"]))
        if args.get(1) is Some(dir) {
          change_directory(dir).wait()
        }
        serve(root)
      }
      "scene-worker" => {
        guard args.get(1) is Some(verb) && args.get(2) is Some(dir) else {
          raise Failure("Expected scene-worker METHOD DIRECTORY")
        }
        change_directory(dir).wait()
        scene_worker(verb)
      }
      "export" => {
        guard args.get(1) is Some(path) else {
          raise Failure(
            "Usage: moon run cmd/editor -- export FILE [--entity COLLECTION:ID] [--colliders]",
          )
        }
        if path == "--list" {
          @archive.walk(@archive.read_scene().get("object"), n => {
            let e = @model.entity(n)
            if exists(e) {
              println(@model.entity_key(e))
            }
          })
          println("player")
        } else {
          let mut selected = None
          for i, option in args {
            if option == "--entity" {
              guard args.get(i + 1) is Some(id) else {
                raise Failure("--entity needs a collection and ID")
              }
              selected = Some(id)
            }
          }
          write_project(
            path,
            @model.export_project(
              selection?=selected,
              colliders=args.contains("--colliders"),
            ),
          )
          println("Editor project written to " + path)
        }
      }
      "import" => {
        guard args.get(1) is Some(path) else {
          raise Failure("Usage: moon run cmd/editor -- import FILE [--check]")
        }
        println(
          @archive.stringify(
            @model.import_project(
              read_project(path),
              dry_run=args.contains("--check"),
            ),
          ),
        )
      }
      "templates" => make_templates()
      "test" => {
        ensure_three_file(root, "build/three.core.js")
        stdout(run_moon(root, ["test", "tests/content"])).wait()
      }
      _ =>
        raise Failure(
          "Usage: moon run cmd/editor -- [serve|export|import|templates|test]",
        )
    }
  } catch {
    err => {
      eprintln(message(err))
      @env.exit(1)
    }
  }
}
