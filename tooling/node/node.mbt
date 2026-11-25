///|
#module("node:child_process")
extern "js" fn exec_file_sync(
  command : String,
  args : FixedArray[String],
  options : @dom.JsObjectObscure,
) -> Unit = "execFileSync"

///|
pub fn run_moon(args : FixedArray[String], cwd? : String) -> Unit raise {
  let options = @dom.JsObjectObscure::new()
  options.set("stdio", @dom.JsObscure::from_string("inherit"))
  if cwd is Some(dir) {
    options.set("cwd", @dom.JsObscure::from_string(dir))
  }
  checked(() => exec_file_sync("moon", args, options))
}

///|
#module("node:os")
extern "js" fn system_tmpdir() -> String = "tmpdir"

///|
#module("node:fs")
extern "js" fn make_temp(prefix : String) -> String = "mkdtempSync"

///|
pub fn temp_dir(prefix : String) -> String raise {
  let mut dir = ""
  checked(() => {
    dir = make_temp(
      (@path.Path(system_tmpdir()) / @path.Path(prefix)).to_string(),
    )
  })
  dir
}

///|
#module("node:fs")
extern "js" fn rename_sync(source : String, destination : String) -> Unit = "renameSync"

///|
extern "js" fn host_error(action : () -> Unit) -> String =
  #| action=>{try{action();return ""}catch(error){return String(error)}}

///|
pub fn checked(action : () -> Unit) -> Unit raise {
  let message = host_error(action)
  guard message.is_empty() else { raise Failure(message) }
}

///|
pub fn rename(source : String, destination : String) -> Unit raise {
  checked(() => rename_sync(source, destination))
}

///|
pub extern "js" fn process_id() -> Int32 = "()=>process.pid"

///|
extern "js" fn signal_process(pid : Int32, signal : @dom.JsObscure) -> String =
  #| (pid,signal)=>{try{process.kill(pid,signal);return ""}catch(error){return error.code}}

///|
/// A process owned by another account is alive even if it cannot be signalled.
pub fn process_exists(pid : Int32) -> Bool {
  pid > 0 && signal_process(pid, @dom.JsObscure::from_number(0)) != "ESRCH"
}

///|
/// POSIX detached child processes lead their own process groups.
pub fn terminate_group(pid : Int32) -> Bool raise {
  match signal_process(-pid, @dom.JsObscure::from_string("SIGTERM")) {
    "" => true
    "ESRCH" | "EPERM" => false
    code => raise Failure("Cannot signal process group: " + code)
  }
}

///|
#module("node:process")
extern "js" fn change_dir(path : String) -> Unit = "chdir"

///|
pub fn chdir(path : String) -> Unit raise {
  checked(() => change_dir(path))
}
