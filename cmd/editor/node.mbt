///|
#external
priv type Request

///|
#external
priv type Response

///|
#external
priv type InputStream

///|
extern "js" fn listen(
  port : Int32,
  handler : (Request, Response) -> @js_async.Promise[Unit],
) -> @js_async.Promise[Int32] =
  #| (port,handler)=>new Promise((resolve,reject)=>{
  #|   const server=process.getBuiltinModule("node:http").createServer((req,res)=>{handler(req,res).catch(e=>res.destroy(e))});
  #|   server.once("error",reject);
  #|   server.listen(port,"127.0.0.1",()=>{server.removeListener("error",reject);resolve(server.address().port)});
  #| })

///|
extern "js" fn Request::http_method(self : Request) -> String = "req=>req.method"

///|
extern "js" fn Request::url(self : Request) -> String = "req=>req.url"

///|
extern "js" fn pathname(url : String) -> @js_async.Promise[String] =
  #| async url=>new URL(url,"http://localhost").pathname

///|
extern "js" fn Request::header(self : Request, key : String) -> String =
  #| (req,k)=>req.headers[k]??""

///|
fn Request::stream(self : Request) -> InputStream = "%identity"

///|
extern "js" fn InputStream::from_bytes(bytes : Bytes) -> InputStream =
  #| b=>process.getBuiltinModule("node:stream").Readable.from([b])

///|
#external
priv type InputChunks

///|
priv struct InputChunk {
  done : Bool
  value : Bytes
}

///|
extern "js" fn InputStream::chunks(self : InputStream) -> InputChunks =
  #| s=>s[Symbol.asyncIterator]()

///|
extern "js" fn InputChunks::next(
  self : InputChunks,
) -> @js_async.Promise[InputChunk] =
  #| it=>it.next()

///|
extern "js" fn stdin() -> InputStream = "()=>process.stdin"

///|
extern "js" fn stdout(bytes : Bytes) -> @js_async.Promise[Unit] =
  #| b=>new Promise((ok,fail)=>process.stdout.write(b,e=>e?fail(e):ok()))

///|
extern "js" fn Response::header(
  self : Response,
  key : String,
  value : String,
) -> Unit =
  #| (res,key,val)=>res.setHeader(key,val)

///|
extern "js" fn Response::finish(
  self : Response,
  status : Int32,
  body : Bytes,
) -> Unit =
  #| (res,status,body)=>{res.writeHead(status);res.end(body)}

///|
priv struct ProcessResult {
  output : Bytes
  stderr : String
  failure : String
}

///|
/// Keep the HTTP request readable if a failing child closes stdin early.
/// stream.pipeline would destroy the IncomingMessage and its response socket.
extern "js" fn exec_stream(
  command : String,
  root : String,
  args : FixedArray[String],
  input : InputStream,
  max_output : Int32,
) -> @js_async.Promise[ProcessResult] =
  #| (command,cwd,args,input,maxBuffer)=>new Promise(resolve=>{
  #|   const child=process.getBuiltinModule("node:child_process").execFile(command,args,{cwd,encoding:"buffer",maxBuffer},(error,output,stderr)=>{
  #|     input.off("aborted",stop);input.off("error",stop);
  #|     resolve({output,stderr:stderr.toString(),failure:error?.message??""});
  #|   });
  #|   function stop(){input.unpipe(child.stdin);child.stdin.end()}
  #|   input.once("aborted",stop);input.once("error",stop);
  #|   child.stdin.on("error",e=>{if(e.code!=="EPIPE")stop()});
  #|   input.pipe(child.stdin);
  #| })

///|
async fn moon_process(
  root : String,
  args : FixedArray[String],
  input : InputStream,
  max_output : Int32,
) -> Bytes {
  let result = exec_stream("moon", root, args, input, max_output).wait()
  if !result.failure.is_empty() {
    let detail = result.stderr.trim()
    raise Failure(
      if detail.is_empty() {
        result.failure
      } else {
        detail.to_owned()
      },
    )
  }
  result.output
}

///|
extern "js" fn read_file(path : String) -> @js_async.Promise[Bytes] =
  #| p=>process.getBuiltinModule("node:fs/promises").readFile(p)

///|
priv struct WorkerOutput(@io.BinaryWriterController)

///|
impl @io.BinaryWriterImpl for WorkerOutput with fn name(_) {
  "editor worker stdout"
}

///|
impl @io.BinaryWriterImpl for WorkerOutput with fn get_controller(self) {
  self.0
}

///|
impl @io.BinaryWriterImpl for WorkerOutput with fn raw_write_impl(
  _,
  bytes,
  offset~,
  len~,
) {
  stdout(bytes[offset:offset + len].to_owned()).wait()
  len
}

///|
impl @io.BinaryWriterImpl for WorkerOutput with fn flush_partial_data(_) {
  ()
}

///|
impl @io.BinaryWriter for WorkerOutput
