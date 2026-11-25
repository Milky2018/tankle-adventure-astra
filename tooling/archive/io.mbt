///|
pub type Raw = @core.JsValue

///|
pub extern "js" fn read_file(path : String) -> Raw = "p=>process.getBuiltinModule('fs').readFileSync(p)"

///|
pub extern "js" fn write_file(path : String, contents : Raw) -> Unit = "(p,v)=>process.getBuiltinModule('fs').writeFileSync(p,v)"

///|
pub extern "js" fn gunzip(bytes : Raw) -> Raw = "b=>process.getBuiltinModule('zlib').gunzipSync(b)"

///|
pub extern "js" fn gzip(bytes : Raw) -> Raw = "b=>process.getBuiltinModule('zlib').gzipSync(b)"

///|
pub extern "js" fn stringify(value : Raw) -> String = "v=>JSON.stringify(v)"

///|
pub extern "js" fn parse(value : Raw) -> Raw = "v=>JSON.parse(v)"

///|
pub extern "js" fn digest(bytes : Raw) -> String = "b=>process.getBuiltinModule('crypto').createHash('sha256').update(b).digest('hex')"

///|
pub extern "js" fn list_files(path : String) -> FixedArray[String] = "p=>process.getBuiltinModule('fs').readdirSync(p).sort()"

///|
pub extern "js" fn exists(path : String) -> Bool = "p=>process.getBuiltinModule('fs').existsSync(p)"

///|
pub extern "js" fn mkdir(path : String) -> Unit = "p=>process.getBuiltinModule('fs').mkdirSync(p,{recursive:true})"

///|
pub extern "js" fn unlink(path : String) -> Unit = "p=>process.getBuiltinModule('fs').unlinkSync(p)"

///|
pub extern "js" fn concat(chunks : FixedArray[Raw]) -> Raw = "a=>Buffer.concat(a)"

///|
pub extern "js" fn zeros(count : Int32) -> Raw = "n=>Buffer.alloc(n)"

///|
pub extern "js" fn from_base64(data : String) -> Raw = "s=>Buffer.from(s,'base64')"

///|
pub extern "js" fn byte_view(data : Raw) -> Raw = "a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength)"

///|
pub extern "js" fn keys(value : Raw) -> FixedArray[String] = "v=>Object.keys(v??{})"

///|
pub extern "js" fn items(value : Raw) -> FixedArray[Raw] = "v=>v??[]"

///|
pub extern "js" fn kind(value : Raw) -> String = "v=>Array.isArray(v)?'array':typeof v"

///|
pub extern "js" fn copy(value : Raw) -> Raw = "v=>({...v})"

///|
pub extern "js" fn remove(value : Raw, key : String) -> Unit = "(v,k)=>{delete v[k]}"

///|
pub extern "js" fn array_copy(value : Raw) -> Raw = "v=>Array.from(v)"

///|
pub extern "js" fn str(value : Raw, key : String) -> String = "(v,k)=>v?.[k]??''"

///|
pub fn prop(value : Raw, key : String) -> Raw {
  if value.is_undefined() || value.is_null() {
    Raw::undefined()
  } else {
    value.get(key)
  }
}

///|
pub fn obj(fields : Array[(String, Raw)]) -> Raw {
  let result = Raw::object()
  for pair in fields {
    result.set(pair.0, pair.1)
  }
  result
}

///|
extern "js" fn new_typed(ty : String, data : Raw) -> Raw = "(t,d)=>new globalThis[t](d)"

///|
extern "js" fn typed_view(
  ty : String,
  bytes : Raw,
  offset : Int32,
  length : Int32,
) -> Raw =
  #| (t,b,o,n)=>new globalThis[t](b.buffer,b.byteOffset+o,n)

///|
fn checked_type(ty : String) -> String {
  match ty {
    "Float32Array"
    | "Float64Array"
    | "Uint8Array"
    | "Uint16Array"
    | "Uint32Array"
    | "Int8Array"
    | "Int16Array"
    | "Int32Array" => ty
    _ => abort("Unsupported attribute type: " + ty)
  }
}

///|
pub fn typed(ty : String, values : Raw) -> Raw {
  new_typed(checked_type(ty), values)
}

///|
pub fn view(buffer : Raw, descriptor : Raw) -> Raw {
  typed_view(
    checked_type(str(descriptor, "type")),
    buffer,
    descriptor.get("byteOffset").cast(),
    descriptor.get("length").cast(),
  )
}

///|
pub fn read_json_gz(path : String) -> Raw {
  parse(gunzip(read_file(path)))
}

///|
pub fn write_json_gz(path : String, value : Raw) -> Unit {
  write_file(path, gzip(Raw::of(stringify(value))))
}
