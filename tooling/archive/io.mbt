///|
pub type Raw = @core.JsValue

///|
pub using @compression {compress, decompress}

///|
pub extern "js" fn stringify(value : Raw) -> String = "JSON.stringify"

///|
extern "js" fn parse_js(text : String, on_error : (String) -> Unit) -> Raw =
  #| (text,onError)=>{try{return JSON.parse(text)}catch(e){onError(e.message)}}

///|
pub fn parse(text : String) -> Raw raise {
  let mut error = None
  let result = parse_js(text, message => error = Some(message))
  if error is Some(message) {
    raise Failure("Invalid JSON: " + message)
  }
  result
}

///|
pub fn digest(bytes : Bytes) -> String {
  @crypto.bytes_to_hex_string(@crypto.sha256(bytes))
}

///|
pub extern "js" fn byte_view(data : @core.TypedArray) -> Bytes = "a=>new Uint8Array(a.buffer,a.byteOffset,a.byteLength)"

///|
pub extern "js" fn keys(value : Raw) -> FixedArray[String] = "v=>Object.keys(v??{})"

///|
pub fn items(value : Raw) -> FixedArray[Raw] {
  if value.is_undefined() || value.is_null() {
    []
  } else {
    value.cast()
  }
}

///|
pub extern "js" fn is_array(value : Raw) -> Bool = "Array.isArray"

///|
pub extern "js" fn is_string(value : Raw) -> Bool = "v=>typeof v==='string'"

///|
pub extern "js" fn is_number(value : Raw) -> Bool = "v=>typeof v==='number'"

///|
extern "js" fn is_record(value : Raw) -> Bool = "v=>v!==null && typeof v==='object' && !Array.isArray(v)"

///|
pub extern "js" fn append(array : Raw, value : Raw) -> Unit = "(a,v)=>a.push(v)"

///|
pub extern "js" fn copy(value : Raw) -> Raw = "v=>({...v})"

///|
pub extern "js" fn remove(value : Raw, key : String) -> Unit = "(v,k)=>{delete v[k]}"

///|
pub extern "js" fn array_copy(value : @core.TypedArray) -> Raw = "a=>Array.from(a)"

///|
pub fn str(value : Raw, key : String) -> String {
  let field = prop(value, key)
  if field.is_null() || field.is_undefined() {
    ""
  } else {
    field.cast()
  }
}

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
  for (key, value) in fields {
    result.set(key, value)
  }
  result
}

///|
/// The upstream numeric array is already a JS array. Pass it to three.mbt
/// directly so exporting a complete city does not copy millions of doubles.
priv struct NumberArray(Raw)

///|
impl @core.TypedArrayInit for NumberArray with fn to_js_init(self) {
  self.0
}

///|
pub fn typed(name : String, values : Raw) -> @core.TypedArray {
  guard @scene_format.element_width(name) is Some(_) else {
    abort("Unsupported attribute type: " + name)
  }
  @core.TypedArray::new_by_name(name, NumberArray(values))
}

///|
/// Bytes has the Uint8Array representation on this package's JS target.
pub fn typed_view(
  bytes : Bytes,
  name : String,
  offset~ : Int32,
  length~ : Int32,
) -> @core.TypedArray {
  guard @scene_format.element_width(name) is Some(_) else {
    abort("Unsupported attribute type: " + name)
  }
  let source : @core.TypedArray = Raw::of(bytes).cast()
  @core.TypedArray::view_by_name(
    name,
    source.buffer(),
    byte_offset=source.byte_offset() + offset,
    length~,
  )
}

///|
pub fn view(buffer : Bytes, descriptor : Raw) -> @core.TypedArray {
  typed_view(
    buffer,
    str(descriptor, "type"),
    offset=descriptor.get("byteOffset").cast(),
    length=descriptor.get("length").cast(),
  )
}

///|
pub fn read_json_gz(path : String) -> Raw raise {
  parse(@utf8.decode_lossy(decompress(@fs.read_file_to_bytes(path))))
}

///|
pub fn write_json_gz(path : String, value : Raw) -> Unit raise {
  @fs.write_bytes_to_file(path, compress(@utf8.encode(stringify(value))))
}
