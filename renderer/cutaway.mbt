///|
#derive(Debug)
priv enum ApertureRole {
  Uncut
  Ground
  Scenery
}

///|
#derive(Debug)
priv struct CutawayEffect {
  role : ApertureRole
  finish : SurfaceFinish?
  probe : Bool
  hull_fill : Bool
  currents : Int32
}

///|
priv struct PatchedShader {
  vertex : String
  fragment : String
  patched_vertex : String
  patched_fragment : String
}

///|
struct Cutaway {
  basin : @core.Texture
  roof : @core.Uniform
  player : @m3.Vector3
  sight_length : @core.Uniform
  distance : @core.Uniform
  exterior_distance : @core.Uniform
  water_time : @core.Uniform
  wake_speed : @core.Uniform
  currents : Array[(@sim.Current, @m3.Vector3)]
  heading : @core.Uniform
  direction : @m3.Vector3
  enabled : @core.Uniform
  bounds : Array[@m3.Vector4]
  planes : Array[@m3.Vector4]
}

///|
let world_vertex : String =
  #| #include <project_vertex>
  #| vec4 aperturePosition = vec4(transformed, 1.0);
  #| #ifdef USE_BATCHING
  #| aperturePosition = batchingMatrix * aperturePosition;
  #| #endif
  #| #ifdef USE_INSTANCING
  #| aperturePosition = instanceMatrix * aperturePosition;
  #| #endif
  #| apertureWorld = (modelMatrix * aperturePosition).xyz;

///|
let world_declarations : String =
  #| #include <common>
  #| varying vec3 apertureWorld;
  #| uniform vec3 aperturePlayer;
  #| uniform float hullHeading, waterTime;
  #| uniform float sightLength, signalExposure;
  #| uniform float apertureEnabled, renderDistance;
  #| uniform vec3 apertureDirection;
  #| uniform vec4 bounds0, bounds1, bounds2, bounds3;
  #| uniform vec4 plane0, plane1, plane2, plane3;

///|
let support_shader : String =
  #| vec4 supportBounds[4] = vec4[4](bounds0, bounds1, bounds2, bounds3);
  #| vec4 supportPlanes[4] = vec4[4](plane0, plane1, plane2, plane3);
  #| float supportKeep = 0.0;
  #| for (int i = 0; i < 4; i++) {
  #|   vec4 b = supportBounds[i], plane = supportPlanes[i];
  #|   float within = step(b.x-0.02,apertureWorld.x)*step(apertureWorld.x,b.z+0.02)*step(b.y-0.02,apertureWorld.z)*step(apertureWorld.z,b.w+0.02);
  #|   float height = plane.x + plane.y * clamp(apertureWorld.z-b.y,0.0,b.w-b.y);
  #|   supportKeep = max(supportKeep,within*plane.z*(1.0-smoothstep(0.12,0.3,abs(apertureWorld.y-height))));
  #| }
  #| cut *= 1.0-supportKeep;

///|
fn Cutaway::new(
  scene : @core.Object3D,
  roof? : @core.Uniform,
  basin? : @core.Texture,
  currents~ : Array[@sim.Current] = [],
  player? : PlayerVisual,
) -> Cutaway {
  let cutaway = {
    basin: basin.unwrap_or_else(() => @core.Texture::new()),
    roof: roof.unwrap_or_else(() => @core.Uniform::new(Number(0))),
    water_time: @core.Uniform::new(Number(0)),
    wake_speed: @core.Uniform::new(Number(0)),
    currents: currents.map(fn(c) {
      (c, @m3.Vector3::new(c.velocity.x, c.velocity.z, c.y))
    }),
    heading: @core.Uniform::new(Number(0)),
    player: @m3.Vector3::new(0, -8, 86),
    sight_length: @core.Uniform::new(Number(0)),
    distance: @core.Uniform::new(Number(230)),
    exterior_distance: @core.Uniform::new(Number(460)),
    direction: @m3.Vector3::new(28, 39.6, 28).normalize(),
    enabled: @core.Uniform::new(Number(0)),
    bounds: Array::makei(4, fn(_) { @m3.Vector4::new(0, 0, 0, 0) }),
    planes: Array::makei(4, fn(_) { @m3.Vector4::new(0, 0, 0, 0) }),
  }
  let hull_fills = Map([])
  if player is Some(visual) {
    for entry in visual.materials {
      if entry.material.is_mesh_standard_material() ||
        entry.material.is_mesh_toon_material() {
        hull_fills[entry.material.uuid] = visual.fill_strength
      }
    }
  }
  let shaders : Map[String, Array[PatchedShader]] = Map([])
  let registered : Set[String] = Set([])
  scene.traverse(fn(object) {
    if object.kind is Mesh(mesh) && scene_binding(object) != "city/sky" {
      for material in mesh_materials(mesh.material) {
        if registered.contains(material.uuid) ||
          surface_finish(material) is Some(OpticalMirror) {
          continue
        }
        registered.add(material.uuid) |> ignore
        cutaway.apply(material, hull_fills.get(material.uuid), shaders)
      }
    }
  })
  cutaway
}

///|
#derive(FromJson(rename_fields="camelCase"))
priv struct ReflectionProbe {
  probe_center : (Double, Double, Double)
  probe_min : (Double, Double, Double)
  probe_max : (Double, Double, Double)
  wetness : Double
}

///|
fn Cutaway::apply(
  self : Cutaway,
  material : @core.Material,
  hull_fill : @core.Uniform?,
  shaders : Map[String, Array[PatchedShader]],
) -> Unit {
  let role = match scene_field(material.user_data, "renderRole") {
    Some("floor" | "belt") => Ground
    Some("") | None => Uncut
    Some(_) => Scenery
  }
  let finish = surface_finish(material)
  let reflection : ReflectionProbe? = if material.emissive_map is Some(_) {
    Some(@json.from_json(material.user_data.to_json())) catch {
      _ => None
    }
  } else {
    None
  }
  let probe = reflection is Some(_)
  let effect : CutawayEffect = {
    role,
    finish,
    probe,
    hull_fill: hull_fill is Some(_),
    currents: if probe && finish is Some(Canal) {
      self.currents.length()
    } else {
      0
    },
  }
  let key = "typed-cutaway-\{@debug.to_string(effect)}"
  let sources = shaders.get_or_init(key, () => [])
  material.on_before_compile = Some(fn(shader, _renderer) {
    let uniforms = shader.uniforms
    if reflection is Some(r) {
      for
        (name, (x, y, z)) in [
          ("probeCenter", r.probe_center),
          ("probeMin", r.probe_min),
          ("probeMax", r.probe_max),
        ] {
        uniforms[name] = @core.Uniform::new(Vector3(@m3.Vector3::new(x, y, z)))
      }
      uniforms["wetness"] = @core.Uniform::new(Number(r.wetness))
    }
    uniforms["waterTime"] = self.water_time
    if finish is Some(Canal) && probe {
      uniforms["wakeSpeed"] = self.wake_speed
      for i, (c, velocity) in self.currents {
        let bounds = "currentBounds\{i}"
        let flow = "currentFlow\{i}"
        uniforms[bounds] = @core.Uniform::new(
          Vector4(
            @m3.Vector4::new(
              c.rect.x,
              c.rect.z,
              c.rect.x + c.rect.w,
              c.rect.z + c.rect.d,
            ),
          ),
        )
        uniforms[flow] = @core.Uniform::new(Vector3(velocity))
      }
    }
    uniforms["hullHeading"] = self.heading
    uniforms["signalBasin"] = @core.Uniform::new(Texture(self.basin))
    uniforms["signalBearing"] = @core.Uniform::new(Number(SignalSunBearing))
    uniforms["signalExposure"] = self.roof
    uniforms["aperturePlayer"] = @core.Uniform::new(Vector3(self.player))
    uniforms["apertureDirection"] = @core.Uniform::new(Vector3(self.direction))
    uniforms["renderDistance"] = match
      scene_field(material.user_data, "renderRole") {
      Some("enclosure" | "structure" | "backdrop") => self.exterior_distance
      _ => self.distance
    }
    uniforms["sightLength"] = self.sight_length
    uniforms["apertureEnabled"] = self.enabled
    for i in 0..<4 {
      uniforms["bounds\{i}"] = @core.Uniform::new(Vector4(self.bounds[i]))
      uniforms["plane\{i}"] = @core.Uniform::new(Vector4(self.planes[i]))
    }
    if hull_fill is Some(strength) {
      uniforms["hullFill"] = strength
    }
    let vertex = shader.vertex_shader
    let fragment = shader.fragment_shader
    let cached = for entry in sources {
      if entry.vertex == vertex && entry.fragment == fragment {
        break entry
      }
    } nobreak {
      let entry = effect.patch(vertex, fragment)
      sources.push(entry)
      entry
    }
    shader.vertex_shader = cached.patched_vertex
    shader.fragment_shader = cached.patched_fragment
  })
  material.custom_program_cache_key = Some(() => key)
}

///|
fn CutawayEffect::patch(
  self : CutawayEffect,
  vertex : String,
  fragment_source : String,
) -> PatchedShader {
  let finish = self.finish
  let probe = self.probe
  let finish_uv = match finish {
    Some(Paving) =>
      (
        #| vMapUv = (mapTransform * vec3(apertureWorld.xz, 1.0)).xy;
        #| vAoMapUv = (aoMapTransform * vec3(apertureWorld.xz,1.0)).xy;
      )
    Some(SignalDeck) =>
      (
        #| vMapUv = apertureWorld.xz / vec2(6.,5.);
        #| vRoughnessMapUv = vMapUv;
        #| vBumpMapUv = vMapUv;
      )
    Some(Apron) =>
      (
        #| vMapUv = (mapTransform * vec3(apertureWorld.xz*.30,1.0)).xy;
      )
    Some(Masonry) | Some(Ironwork) =>
      (
        #| vec3 face = normal;
        #| #ifdef USE_BATCHING
        #| face = mat3(batchingMatrix) * face;
        #| #endif
        #| face = abs(normalize(face));
        #| vec2 faceUv = face.y > 0.6 ? apertureWorld.xz : vec2(face.x > face.z ? apertureWorld.z : apertureWorld.x, apertureWorld.y);
        #| vMapUv = (mapTransform * vec3(faceUv,1.0)).xy;
      )
    _ => ""
  }
  let relief_uv = if finish is Some(Paving | Masonry | Ironwork) {
    "\n#ifdef USE_NORMALMAP\n vNormalMapUv = vMapUv;\n#endif\n"
  } else {
    ""
  }
  let map_fragment = match finish {
    Some(Vapor) => steam_alpha
    _ => "#include <map_fragment>"
  }
  let reflected = if finish is Some(SignalDeck) {
    roof_paving_glaze
  } else if !probe {
    ""
  } else if finish is Some(Canal) {
    canal_reflection
  } else {
    wet_floor
  }
  // The atlas packs one plan of window light per eight-metre storey. Ramps
  // blend adjacent plans while the material continues to receive live shadows.
  let lighting = if finish is Some(Paving) {
    (
      #| float level = clamp((apertureWorld.y+56.0)/8.0,0.0,12.0);
      #| float lower = floor(level), upper = min(lower+1.0,12.0);
      #| vec2 chart = clamp(vAoMapUv,0.001,0.999);
      #| vec2 lo = (chart+vec2(mod(lower,4.0),floor(lower/4.0)))*0.25;
      #| vec2 hi = (chart+vec2(mod(upper,4.0),floor(upper/4.0)))*0.25;
      #| vec3 daylight = mix(texture2D(aoMap,lo).rgb,texture2D(aoMap,hi).rgb,fract(level));
      #| reflectedLight.directDiffuse *= smoothstep(vec3(0.14),vec3(0.87),daylight)*1.34+0.32;
      #| reflectedLight.indirectDiffuse *= 0.77+daylight*0.75;
      #| vec3 eyeRay = normalize(apertureWorld-cameraPosition);
      #| vec2 reflectedChart = clamp(chart + eyeRay.xz*vec2(0.009,0.014)/max(0.28,abs(eyeRay.y)),0.001,0.999);
      #| vec3 loGlaze = texture2D(aoMap,(reflectedChart+vec2(mod(lower,4.0),floor(lower/4.0)))*0.25).rgb;
      #| vec3 hiGlaze = texture2D(aoMap,(reflectedChart+vec2(mod(upper,4.0),floor(upper/4.0)))*0.25).rgb;
      #| vec3 glazed = mix(loGlaze,hiGlaze,fract(level));
      #| float sheen = pow(1.0-abs(eyeRay.y),2.0)*(0.30+0.7*smoothstep(0.04,0.36,diffuseColor.r));
      #| reflectedLight.indirectSpecular += smoothstep(vec3(0.36),vec3(0.97),glazed)*sheen*0.32;
    )
  } else {
    "#include <aomap_fragment>"
  }
  let terrain = self.role is Ground
  let contact = if terrain {
    (
      #| vec2 groundDelta = apertureWorld.xz - aperturePlayer.xz;
      #| vec2 localHull = vec2(dot(groundDelta,vec2(cos(hullHeading),-sin(hullHeading))),dot(groundDelta,vec2(sin(hullHeading),cos(hullHeading))));
      #| vec2 outsideHull = max(abs(localHull)-vec2(0.94,1.34),vec2(0.0));
      #| float contactShade = exp(-dot(outsideHull,outsideHull)*1.8)*(1.0-smoothstep(0.12,1.25,abs(apertureWorld.y-aperturePlayer.y)));
      #| outgoingLight *= 1.0-0.62*contactShade;
    )
  } else {
    ""
  }
  let aperture =
    #| if (apertureEnabled > 0.0) {
    #| vec3 delta = apertureWorld-aperturePlayer-vec3(0.0,1.3,0.0);
    #| vec3 viewDirection = apertureDirection;
    #| float along = dot(delta,viewDirection);
    #| float projection = sightLength / max(0.10,sightLength-along);
    #| vec3 radial = (delta - viewDirection * along) * projection;
    #| vec3 right = normalize(vec3(viewDirection.z, 0., -viewDirection.x));
    #| vec3 up = cross(viewDirection, right);
    #| vec3 hull = vec3(sin(hullHeading),0.,cos(hullHeading));
    #| float halfWidth = 1.5 + 0.52*abs(dot(right,hull));
    #| float halfHeight = 1.05 + 0.7*abs(viewDirection.y);
    #| float silhouette = length(max(abs(vec2(dot(radial,right),dot(radial,up))) - vec2(halfWidth,halfHeight)*0.70,vec2(0.)));
    #| float eyeCut = (1.-smoothstep(.32,.62,silhouette))*step(.05,along)*step(along,sightLength);
  let fragment = if self.hull_fill {
    hull_fill_fragment
  } else if finish is Some(EnemyEnamel) {
    // Preserve the moulded relief in shadow. Blue induction strips keep their
    // local colour even when the hull is lit only by the workshop skylights.
    (
      #| float induction = smoothstep(.20,.46,vColor.b-vColor.r) * smoothstep(.08,.26,vColor.b-vColor.g);
      #| float pigment = max(vColor.r,max(vColor.g,vColor.b));
      #| outgoingLight -= totalEmissiveRadiance * (.58*(1.0-pigment));
      #| outgoingLight += diffuseColor.rgb*.42 + vColor.rgb*diffuse*(.12+induction*.64);
      #| #include <opaque_fragment>
    )
  } else if finish is Some(Glass) {
    (
      #| float edge = 1.0-abs(dot(normal,normalize(vViewPosition)));
      #| diffuseColor.a = min(.67, diffuseColor.a + .42*edge*edge);
      #| #include <opaque_fragment>
    )
  } else if self.role is Uncut {
    "#include <opaque_fragment>"
  } else {
    aperture +
    "\nfloat cut = eyeCut;\n" +
    (if terrain { support_shader } else { "" }) +
    (
      #|
      #| if (cut > 0.0) {
      #|   vec2 pixel = mod(floor(gl_FragCoord.xy), 4.0);
      #|   vec2 low = mod(pixel, 2.0), high = floor(pixel * 0.5);
      #|   float lo = 2.0*mod(low.x+low.y,2.0)+low.y;
      #|   float hi = 2.0*mod(high.x+high.y,2.0)+high.y;
      #|   if (0.625 * cut > (4.0*lo+hi+0.5)/16.0) discard;
      #| }
      #| }
    ) +
    reflected +
    "\n" +
    contact +
    "\n#include <opaque_fragment>"
  }
  let extra_varying = if finish is Some(Vapor) {
    "\nvarying vec2 plumeUv;"
  } else {
    ""
  }
  let extra_fragment = if self.hull_fill {
    "uniform float hullFill;"
  } else if finish is Some(Vapor) {
    steam_fragment
  } else {
    ""
  }
  let mut water_source = ""
  if finish is Some(Canal) && probe {
    water_source = "uniform float wakeSpeed;\n"
    let mut regions = ""
    for i in 0..<self.currents {
      let bounds = "currentBounds\{i}"
      let flow = "currentFlow\{i}"
      water_source += "uniform vec4 \{bounds}; uniform vec3 \{flow};\n"
      regions += "if (abs(p.y-\{flow}.z)<0.5 && all(greaterThanEqual(p.xz,\{bounds}.xy)) && all(lessThanEqual(p.xz,\{bounds}.zw))) return \{flow}.xy;\n"
    }
    water_source += "vec2 canalFlow(vec3 p){\n" +
      regions +
      "return vec2(0.0);\n}\n"
  }
  let patched_vertex = vertex
    .replace(
      old="#include <common>",
      new="#include <common>\nvarying vec3 apertureWorld;" + extra_varying,
    )
    .replace(
      old="#include <project_vertex>",
      new=world_vertex +
        "\n" +
        finish_uv +
        relief_uv +
        (if finish is Some(Vapor) { "\nplumeUv = uv;" } else { "" }),
    )
  let patched_fragment = fragment_source
    .replace(
      old="#include <common>",
      new=world_declarations +
        "\n" +
        signal_panorama +
        "\n" +
        freight_declarations +
        extra_varying +
        "\n" +
        extra_fragment,
    )
    .replace(
      old="#include <emissivemap_pars_fragment>",
      new=if probe {
        "#include <emissivemap_pars_fragment>\n" +
        water_source +
        room_reflection
      } else {
        "#include <emissivemap_pars_fragment>"
      },
    )
    .replace(
      old="#include <tonemapping_fragment>",
      new="#include <tonemapping_fragment>\n" + signal_air,
    )
    .replace(
      old="#include <emissivemap_fragment>",
      new=if probe { "" } else { "#include <emissivemap_fragment>" },
    )
    .replace(
      old="#include <opaque_fragment>",
      new=fragment + "\n" + freight_haze,
    )
    .replace(
      old="#include <aomap_fragment>",
      new=lighting + "\n" + freight_daylight + "\n" + proving_daylight,
    )
    .replace(old="#include <map_fragment>", new=map_fragment)
    .replace(
      old="#include <clipping_planes_fragment>",
      new=(
        #| #include <clipping_planes_fragment>
        #| vec3 offsetFromPlayer = apertureWorld - aperturePlayer;
        #| if (dot(offsetFromPlayer, offsetFromPlayer) > renderDistance * renderDistance) discard;
      ),
    )
  { vertex, fragment: fragment_source, patched_vertex, patched_fragment, }
}

///|
fn Cutaway::update(
  self : Cutaway,
  p : @sim.Player,
  world : @sim.World,
  camera : @core.Object3D,
) -> Unit {
  self.heading.value = Number(p.heading)
  self.player.set(p.x, p.y, p.z) |> ignore
  self.direction.copy(camera.position).sub(self.player) |> ignore
  self.direction.set_y(self.direction.y - 1.3) |> ignore
  self.sight_length.value = Number(self.direction.length())
  self.direction.normalize() |> ignore
  let mut slot = 0
  {
    let decks = world.ground_patches(p)
    for deck in decks {
      if slot >= 4 {
        break
      }
      self.bounds[slot].set(
        deck.rect.x,
        deck.rect.z,
        deck.rect.x + deck.rect.w,
        deck.rect.z + deck.rect.d,
      )
      |> ignore
      self.planes[slot].set(deck.y, deck.rise / deck.rect.d, 1, 0) |> ignore
      slot += 1
    }
  }
  for i in slot..<4 {
    self.planes[i].set_z(0) |> ignore
  }
}

///|
fn smooth(a : Double, b : Double, value : Double) -> Double {
  let t = @sim.clamp((value - a) / (b - a), 0, 1)
  t * t * (3 - 2 * t)
}
