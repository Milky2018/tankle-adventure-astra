// The upstream editor operates on native Three.js objects. Keep these handles
// distinct from the MoonBit scene records used by the project compiler.

///|
#external
priv type Editor

///|
#external
priv type Three

///|
#external
priv type Commands

///|
#external
priv type CommandClass

///|
#external
priv type Command

///|
#external
priv type SceneNode

///|
#external
priv type Coordinates

///|
#external
priv type ThreeRenderer

///|
#external
priv type Background

///|
#external
priv type Plane

///|
#external
priv type Material

///|
#external
priv type Color

///|
#external
priv type Hit

///|
extern "js" fn open_editor() -> @js_async.Promise[Editor] =
  #|()=>import('/upstream/js/Editor.js').then(({Editor})=>new Editor())

///|
extern "js" fn create_viewport(e : Editor) -> @js_async.Promise[Element] =
  #|e=>import('/upstream/js/Viewport.js').then(({Viewport})=>new Viewport(e).dom)

///|
extern "js" fn import_three() -> @js_async.Promise[Three] = "()=>import('three')"

///|
extern "js" fn import_commands() -> @js_async.Promise[Commands] = "()=>import('/upstream/js/commands/Commands.js')"

///|
extern "js" fn import_command_class() -> @js_async.Promise[CommandClass] = "()=>import('/upstream/js/Command.js').then(m=>m.Command)"

///|
extern "js" fn Three::renderer(self : Three) -> ThreeRenderer = "m=>new m.WebGLRenderer({antialias:true})"

///|
extern "js" fn Three::background_color(self : Three, hex : Int32) -> Background = "(m,hex)=>new m.Color(hex)"

///|
extern "js" fn Three::plane(
  self : Three,
  normal_y : Double,
  constant : Double,
) -> Plane =
  #|(m,y,c)=>new m.Plane(new m.Vector3(0,y,0),c)

///|
extern "js" fn ThreeRenderer::clip(
  self : ThreeRenderer,
  planes : FixedArray[Plane],
) -> Unit =
  #|(r,p)=>{r.clippingPlanes=p}

///|
extern "js" fn Three::parse_object(
  self : Three,
  project : Raw,
) -> @js_async.Promise[SceneNode] =
  #|(m,project)=>new m.ObjectLoader().parseAsync(project)

///|
extern "js" fn Editor::scene(self : Editor) -> SceneNode = "e=>e.scene"

///|
extern "js" fn Editor::set_history_storage(
  self : Editor,
  enabled : Bool,
) -> Unit =
  #|(e,value)=>e.config.setKey('settings/history',value)

///|
extern "js" fn Editor::set_shading(self : Editor, style : String) -> Unit = "(e,style)=>e.setViewportShading(style)"

///|
extern "js" fn Editor::load_project(
  self : Editor,
  project : Raw,
) -> @js_async.Promise[Unit] = "(e,p)=>e.fromJSON(p)"

///|
extern "js" fn Editor::serialize(self : Editor) -> @js_async.Promise[Raw] = "async e=>e.toJSON()"

///|
extern "js" fn Editor::can_undo(self : Editor) -> Bool = "e=>e.history.undos.length>0"

///|
extern "js" fn Editor::can_redo(self : Editor) -> Bool = "e=>e.history.redos.length>0"

///|
extern "js" fn Editor::undo(self : Editor) -> Unit = "e=>e.undo()"

///|
extern "js" fn Editor::redo(self : Editor) -> Unit = "e=>e.redo()"

///|
extern "js" fn Editor::select(self : Editor, node : SceneNode) -> Unit = "(e,n)=>e.select(n)"

///|
extern "js" fn Editor::deselect(self : Editor) -> Unit = "e=>e.deselect()"

///|
extern "js" fn Editor::append_object(
  self : Editor,
  node : SceneNode,
  parent : SceneNode,
) -> Unit = "(e,n,p)=>e.addObject(n,p)"

///|
extern "js" fn Editor::insert_object(
  self : Editor,
  node : SceneNode,
  parent : SceneNode,
  at : Int32,
) -> Unit = "(e,n,p,i)=>e.addObject(n,p,i)"

///|
extern "js" fn Editor::remove_object(self : Editor, node : SceneNode) -> Unit = "(e,n)=>e.removeObject(n)"

///|
extern "js" fn Editor::execute(self : Editor, cmd : Command) -> Unit = "(e,c)=>e.execute(c)"

///|
extern "js" fn Editor::center(self : Editor) -> Coordinates = "e=>e.controls.center"

///|
extern "js" fn Editor::camera_position(self : Editor) -> Coordinates = "e=>e.camera.position"

///|
extern "js" fn Editor::look_at(self : Editor, point : Coordinates) -> Unit = "(e,v)=>e.camera.lookAt(v)"

///|
extern "js" fn Editor::camera_changed(self : Editor) -> Unit = "e=>e.signals.cameraChanged.dispatch()"

///|
extern "js" fn Editor::resized(self : Editor) -> Unit = "e=>e.signals.windowResize.dispatch()"

///|
extern "js" fn Editor::transform_mode(self : Editor, mode : String) -> Unit = "(e,m)=>e.signals.transformModeChanged.dispatch(m)"

///|
extern "js" fn Editor::renderer_created(
  self : Editor,
  renderer : ThreeRenderer,
) -> Unit = "(e,r)=>e.signals.rendererCreated.dispatch(r)"

///|
extern "js" fn Editor::show_helpers(
  self : Editor,
  grid : Bool,
  camera : Bool,
  light : Bool,
  skeleton : Bool,
) -> Unit =
  #|(e,g,c,l,s)=>e.signals.showHelpersChanged.dispatch({gridHelper:g,cameraHelpers:c,lightHelpers:l,skeletonHelpers:s})

///|
extern "js" fn Editor::enable_graph_updates(
  self : Editor,
  active : Bool,
) -> Unit = "(e,v)=>{e.signals.sceneGraphChanged.active=v}"

///|
extern "js" fn Editor::graph_changed(self : Editor) -> Unit = "e=>e.signals.sceneGraphChanged.dispatch()"

///|
extern "js" fn Editor::on_select(
  self : Editor,
  cb : (SceneNode) -> Unit,
) -> Unit = "(e,f)=>e.signals.objectSelected.add(f)"

///|
extern "js" fn Editor::on_object_change(
  self : Editor,
  cb : (SceneNode) -> Unit,
) -> Unit = "(e,f)=>e.signals.objectChanged.add(f)"

///|
extern "js" fn Editor::on_material_change(
  self : Editor,
  cb : () -> Unit,
) -> Unit = "(e,f)=>e.signals.materialChanged.add(f)"

///|
extern "js" fn Editor::on_history_change(
  self : Editor,
  cb : () -> Unit,
) -> Unit = "(e,f)=>e.signals.historyChanged.add(f)"

///|
extern "js" fn Editor::filter_picks(
  self : Editor,
  keep : (Hit) -> Bool,
) -> Unit =
  #|(e,keep)=>{const s=e.selector, get=s.getIntersects.bind(s); s.getIntersects=ray=>get(ray).filter(keep)}

///|
extern "js" fn Hit::object(self : Hit) -> SceneNode = "h=>h.object"

///|
extern "js" fn Hit::y(self : Hit) -> Double = "h=>h.point.y"

///|
fn SceneNode::raw(self : SceneNode) -> Raw = "%identity"

///|
fn SceneNode::from_raw(raw : Raw) -> SceneNode = "%identity"

///|
extern "js" fn SceneNode::same(self : SceneNode, other : SceneNode) -> Bool = "(a,b)=>a===b"

///|
extern "js" fn SceneNode::present(self : SceneNode) -> Bool = "n=>n!=null"

///|
extern "js" fn SceneNode::parent(self : SceneNode) -> SceneNode = "n=>n.parent"

///|
extern "js" fn SceneNode::children(self : SceneNode) -> FixedArray[SceneNode] = "n=>n.children"

///|
extern "js" fn SceneNode::index_of(
  self : SceneNode,
  child : SceneNode,
) -> Int32 = "(n,c)=>n.children.indexOf(c)"

///|
extern "js" fn SceneNode::visit(
  self : SceneNode,
  f : (SceneNode) -> Unit,
) -> Unit = "(n,f)=>n.traverse(f)"

///|
extern "js" fn SceneNode::by_uuid(self : SceneNode, uuid : String) -> SceneNode = "(n,id)=>n.getObjectByProperty('uuid',id)"

///|
extern "js" fn SceneNode::uuid(self : SceneNode) -> String = "n=>n.uuid"

///|
extern "js" fn SceneNode::name(self : SceneNode) -> String = "n=>n.name"

///|
extern "js" fn SceneNode::is_mesh(self : SceneNode) -> Bool = "n=>n.isMesh===true"

///|
extern "js" fn SceneNode::data(self : SceneNode) -> Raw = "n=>n.userData"

///|
fn SceneNode::entity(self : SceneNode) -> Raw {
  self.data().get("entity")
}

///|
fn SceneNode::binding(self : SceneNode) -> String {
  @model.binding(self.raw())
}

///|
extern "js" fn SceneNode::set_visible(self : SceneNode, visible : Bool) -> Unit = "(n,v)=>{n.visible=v}"

///|
extern "js" fn SceneNode::background(self : SceneNode) -> Background = "n=>n.background"

///|
extern "js" fn SceneNode::set_background(
  self : SceneNode,
  value : Background,
) -> Unit = "(n,v)=>{n.background=v}"

///|
extern "js" fn SceneNode::update_world(self : SceneNode) -> Unit = "n=>n.updateMatrixWorld(true)"

///|
extern "js" fn SceneNode::world_position(self : SceneNode) -> Coordinates = "n=>n.getWorldPosition(n.position.clone())"

///|
extern "js" fn SceneNode::position(self : SceneNode) -> Coordinates = "n=>n.position"

///|
extern "js" fn SceneNode::rotation(self : SceneNode) -> Coordinates = "n=>n.rotation"

///|
extern "js" fn SceneNode::scale(self : SceneNode) -> Coordinates = "n=>n.scale"

///|
extern "js" fn Coordinates::x(self : Coordinates) -> Double = "v=>v.x"

///|
extern "js" fn Coordinates::y(self : Coordinates) -> Double = "v=>v.y"

///|
extern "js" fn Coordinates::z(self : Coordinates) -> Double = "v=>v.z"

///|
extern "js" fn Coordinates::set_x(self : Coordinates, x : Double) -> Unit = "(v,x)=>{v.x=x}"

///|
extern "js" fn Coordinates::set_y(self : Coordinates, y : Double) -> Unit = "(v,y)=>{v.y=y}"

///|
extern "js" fn Coordinates::set_z(self : Coordinates, z : Double) -> Unit = "(v,z)=>{v.z=z}"

///|
extern "js" fn Coordinates::clone(self : Coordinates) -> Coordinates = "v=>v.clone()"

///|
extern "js" fn Coordinates::set(
  self : Coordinates,
  x : Double,
  y : Double,
  z : Double,
) -> Unit = "(v,x,y,z)=>v.set(x,y,z)"

///|
extern "js" fn SceneNode::material(self : SceneNode) -> Material = "n=>n.material"

///|
extern "js" fn Material::colored(self : Material) -> Bool = "m=>m?.color!=null"

///|
extern "js" fn Material::clone(self : Material) -> Material = "m=>m.clone()"

///|
extern "js" fn Material::color(self : Material) -> Color = "m=>m.color"

///|
extern "js" fn Color::hex(self : Color) -> String = "c=>c.getHexString()"

///|
extern "js" fn Color::set(self : Color, hex : String) -> Unit = "(c,h)=>c.set(h)"

///|
extern "js" fn Commands::position(
  self : Commands,
  editor : Editor,
  node : SceneNode,
  value : Coordinates,
) -> Command =
  #|(m,e,n,v)=>new m.SetPositionCommand(e,n,v)

///|
extern "js" fn Commands::rotation(
  self : Commands,
  editor : Editor,
  node : SceneNode,
  value : Coordinates,
) -> Command =
  #|(m,e,n,v)=>new m.SetRotationCommand(e,n,v)

///|
extern "js" fn Commands::scale(
  self : Commands,
  editor : Editor,
  node : SceneNode,
  value : Coordinates,
) -> Command =
  #|(m,e,n,v)=>new m.SetScaleCommand(e,n,v)

///|
extern "js" fn Commands::material(
  self : Commands,
  editor : Editor,
  node : SceneNode,
  value : Material,
) -> Command =
  #|(m,e,n,v)=>new m.SetMaterialCommand(e,n,v)

///|
extern "js" fn Commands::user_data(
  self : Commands,
  editor : Editor,
  node : SceneNode,
  value : Raw,
) -> Command =
  #|(m,e,n,v)=>new m.SetValueCommand(e,n,'userData',v)

///|
extern "js" fn CommandClass::presence(
  self : CommandClass,
  editor : Editor,
  name : String,
  execute : () -> Unit,
  undo : () -> Unit,
) -> Command =
  #|(Base,e,name,execute,undo)=>Object.assign(new Base(e),{type:'EntityPresenceCommand',name,execute,undo})
