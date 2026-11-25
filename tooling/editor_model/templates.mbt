///|
#derive(@json.FromJson)
pub struct TemplateDefinition {
  id : String
  label : String
  source : String
  collection : String
  defaults : Json
}

///|
pub fn export_templates(definitions : Array[TemplateDefinition]) -> Raw raise {
  let scene = packed_project().get("scene")
  let root = scene.get("object")
  let sources = Map([])
  for n in children(root) {
    if exists(entity(n)) {
      sources[entity_key(entity(n))] = n
    }
  }
  let chosen = []
  let seen = Set([])
  for d in definitions {
    let key = d.collection + ":" + d.source
    guard sources.get(key) is Some(template) else {
      raise Failure("Missing template source " + key)
    }
    for
      n in bundle_members(
        children(root).iter(),
        entity(template),
        n => n.strict_equal(template),
        binding,
      ) {
      let id = uuid(n)
      if !seen.contains(id) {
        seen.add(id)
        chosen.push(n)
      }
    }
  }
  root.set("children", Raw::from_array(chosen[:]))
  root.set("userData", Raw::object())
  let templates = @archive.select_resources(scene, root)
  @archive.hydrate_scene(templates)
  templates
}
