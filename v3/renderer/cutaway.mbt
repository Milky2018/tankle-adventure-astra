///|
struct Cutaway {
  player : @m3.Vector3
  sight_length : @core.Uniform
  distance : @core.Uniform
  water_time : @core.Uniform
  heading : @core.Uniform
  direction : @m3.Vector3
  enabled : @core.Uniform
  mode : @core.Uniform
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
  #| uniform float sightLength;
  #| uniform float apertureMode, apertureEnabled, renderDistance;
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
fn Cutaway::new(scene : @core.Object3D) -> Cutaway {
  let cutaway = {
    water_time: @core.Uniform::new(Number(0)),
    heading: @core.Uniform::new(Number(0)),
    player: @m3.Vector3::new(0, -8, 86),
    sight_length: @core.Uniform::new(Number(0)),
    distance: @core.Uniform::new(Number(230)),
    direction: @m3.Vector3::new(28, 39.6, 28).normalize(),
    enabled: @core.Uniform::new(Number(1)),
    mode: @core.Uniform::new(Number(1)),
    bounds: Array::makei(4, fn(_) { @m3.Vector4::new(0, 0, 0, 0) }),
    planes: Array::makei(4, fn(_) { @m3.Vector4::new(0, 0, 0, 0) }),
  }
  let registered : Set[String] = Set([])
  scene.traverse(fn(object) {
    if object.kind is Mesh(mesh) {
      for material in mesh_materials(mesh.material) {
        if registered.contains(material.uuid) {
          continue
        }
        registered.add(material.uuid) |> ignore
        cutaway.apply(material)
      }
    }
  })
  cutaway
}

///|
fn Cutaway::apply(self : Cutaway, material : @core.Material) -> Unit {
  let role = metadata_string(material.user_data, "renderRole")
  let finish = metadata_string(material.user_data, "surfaceFinish")
  let finish_uv = match finish {
    "paving" =>
      (
        #| vMapUv = (mapTransform * vec3(apertureWorld.xz, 1.0)).xy;
        #| vAoMapUv = (aoMapTransform * vec3(apertureWorld.xz,1.0)).xy;
      )
    "apron" =>
      (
        #| vMapUv = (mapTransform * vec3(apertureWorld.xz*.30,1.0)).xy;
      )
    "masonry" | "ironwork" =>
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
  let relief_uv = if finish == "paving" ||
    finish == "masonry" ||
    finish == "ironwork" {
    "\n#ifdef USE_NORMALMAP\n vNormalMapUv = vMapUv;\n#endif\n"
  } else {
    ""
  }
  let probe = !material.user_data.get("probeCenter").is_undefined() &&
    material.emissive_map is Some(_)
  let map_fragment = match finish {
    "vapor" => steam_alpha
    _ => "#include <map_fragment>"
  }
  let reflected = if !probe {
    ""
  } else if finish == "canal" {
    canal_reflection
  } else {
    wet_floor
  }
  let radius = if role == "structure" ||
    role == "backdrop" ||
    role == "enclosure" {
    36.0
  } else {
    13.0
  }
  // The atlas packs one plan of window light per eight-metre storey. Ramps
  // blend adjacent plans while the material continues to receive live shadows.
  let lighting = if finish == "paving" {
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
  let contact = if role == "floor" || role == "belt" {
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
  let camera_only = role == "fixture" || role == "belt"
  let terrain = role == "floor" || role == "belt"
  let aperture =
    #| vec3 delta = apertureWorld-aperturePlayer-vec3(0.0,1.3,0.0);
    #| vec3 viewDirection = apertureDirection;
    #| float along = dot(delta,viewDirection);
    #| float radius = length(delta-viewDirection*along);
    #| float nearest = clamp(along, 0.0, sightLength);
    #| float eyeCut = smoothstep(-0.8,0.0,along)*(1.0-smoothstep(2.05,2.42,length(delta-viewDirection*nearest)));
  let overhead = if camera_only {
    "0.0"
  } else {
    "(1.0-smoothstep(float(\{radius*5/13}),float(\{radius}),radius))*smoothstep(1.5,3.5,delta.y)*(1.0-smoothstep(55.0,62.0,along))"
  }
  let fragment = if finish == "enemyEnamel" {
    // Preserve the moulded relief in shadow. Blue induction strips keep their
    // local colour even when the hull is lit only by the workshop skylights.
    (
      #| float induction = smoothstep(.20,.46,vColor.b-vColor.r) * smoothstep(.08,.26,vColor.b-vColor.g);
      #| float pigment = max(vColor.r,max(vColor.g,vColor.b));
      #| outgoingLight -= totalEmissiveRadiance * (.58*(1.0-pigment));
      #| outgoingLight += diffuseColor.rgb*.42 + vColor.rgb*(.12+induction*.64);
      #| #include <opaque_fragment>
    )
  } else if finish == "glass" {
    (
      #| float edge = 1.0-abs(dot(normal,normalize(vViewPosition)));
      #| diffuseColor.a = min(.67, diffuseColor.a + .42*edge*edge);
      #| #include <opaque_fragment>
    )
  } else if role == "" {
    "#include <opaque_fragment>"
  } else {
    aperture +
    "\nfloat cut = mix(\{overhead},eyeCut,apertureMode)*apertureEnabled;\n" +
    (if terrain { support_shader } else { "" }) +
    // Write solid color and depth together. Only the narrow edge of the
    // camera cut uses ordered coverage, so aiming through its center is clear.
    (
      #|
      #| if (cut > 0.0) {
      #|   vec2 pixel = mod(floor(gl_FragCoord.xy), 4.0);
      #|   vec2 low = mod(pixel, 2.0), high = floor(pixel * 0.5);
      #|   float lo = 2.0*mod(low.x+low.y,2.0)+low.y;
      #|   float hi = 2.0*mod(high.x+high.y,2.0)+high.y;
      #|   if (smoothstep(0.56,0.75,cut) > (4.0*lo+hi+0.5)/16.0) discard;
      #| }
    ) +
    "\noutgoingLight *= mix(1.0,0.65,smoothstep(3.0,12.0,abs(apertureWorld.y-aperturePlayer.y))*(1.0-apertureMode)*apertureEnabled);\n" +
    reflected +
    "\n" +
    contact +
    "\n#include <opaque_fragment>"
  }
  material.on_before_compile = Some(fn(shader, _renderer) {
    let uniforms = shader.uniforms
    if probe {
      for key in ["probeCenter", "probeMin", "probeMax"] {
        let p = material.user_data.get(key)
        uniforms[key] = @core.Uniform::new(
          Vector3(
            @m3.Vector3::new(
              p.get("0").cast(),
              p.get("1").cast(),
              p.get("2").cast(),
            ),
          ),
        )
      }
      uniforms["wetness"] = @core.Uniform::new(
        Number(material.user_data.get("wetness").cast()),
      )
    }
    uniforms["waterTime"] = self.water_time
    uniforms["hullHeading"] = self.heading
    uniforms["aperturePlayer"] = @core.Uniform::new(Vector3(self.player))
    uniforms["apertureDirection"] = @core.Uniform::new(Vector3(self.direction))
    uniforms["renderDistance"] = self.distance
    uniforms["sightLength"] = self.sight_length
    uniforms["apertureMode"] = self.mode
    uniforms["apertureEnabled"] = self.enabled
    for i in 0..<4 {
      uniforms["bounds\{i}"] = @core.Uniform::new(Vector4(self.bounds[i]))
      uniforms["plane\{i}"] = @core.Uniform::new(Vector4(self.planes[i]))
    }
    let extra_varying = if finish == "vapor" {
      "\nvarying vec2 plumeUv;"
    } else {
      ""
    }
    let extra_fragment = if finish == "vapor" { steam_fragment } else { "" }
    shader.vertex_shader = shader.vertex_shader
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
          (if finish == "vapor" { "\nplumeUv = uv;" } else { "" }),
      )
    shader.fragment_shader = shader.fragment_shader
      .replace(
        old="#include <common>",
        new=world_declarations + extra_varying + "\n" + extra_fragment,
      )
      .replace(
        old="#include <emissivemap_pars_fragment>",
        new=if probe {
          "#include <emissivemap_pars_fragment>\n" + room_reflection
        } else {
          "#include <emissivemap_pars_fragment>"
        },
      )
      .replace(
        old="#include <emissivemap_fragment>",
        new=if probe { "" } else { "#include <emissivemap_fragment>" },
      )
      .replace(old="#include <opaque_fragment>", new=fragment)
      .replace(old="#include <aomap_fragment>", new=lighting)
      .replace(old="#include <map_fragment>", new=map_fragment)
      .replace(
        old="#include <fog_fragment>",
        new=(
          #| #ifdef USE_FOG
          #| float playerDistance = distance(apertureWorld,aperturePlayer);
          #| if(playerDistance > renderDistance) discard;
          #| float underground = smoothstep(12.0,39.0,-aperturePlayer.y);
          #| vec3 air = mix(vec3(.62,.68,.69),vec3(.49,.39,.32),underground);
          #| float recess = 1.0-exp(-max(0.0,playerDistance-7.0)*mix(.011,.024,underground));
          #| gl_FragColor.rgb = mix(gl_FragColor.rgb,air,recess*.54);
          #| gl_FragColor.rgb = mix(gl_FragColor.rgb,fogColor,smoothstep(fogNear,fogFar,playerDistance));
          #| #endif
        ),
      )
  })
  material.custom_program_cache_key = Some(fn() {
    "typed-cutaway-\{role}-\{finish}-\{probe}"
  })
}

///|
fn Cutaway::update(
  self : Cutaway,
  p : @sim.Player,
  world : @sim.World,
  camera : @core.Object3D,
  third : Bool,
) -> Unit {
  self.heading.value = Number(p.heading)
  self.player.set(p.x, p.y, p.z) |> ignore
  self.direction.copy(camera.position).sub(self.player) |> ignore
  if third {
    self.direction.set_y(self.direction.y - 1.3) |> ignore
  }
  self.sight_length.value = Number(self.direction.length())
  self.direction.normalize() |> ignore
  self.mode.value = Number(if third { 1 } else { 0 })
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

///|
fn Cutaway::aim_visible(
  self : Cutaway,
  pos : @sim.Vec3,
  terrain : Bool,
  structure : Bool,
  third : Bool,
) -> Bool {
  let mut cut = 0.0
  if third {
    let origin = point(self.player).add({ x: 0, y: 1.3, z: 0, })
    let delta = pos.sub(origin)
    let dir = point(self.direction)
    let along = delta.dot(dir)
    if self.sight_length.value is Number(length) {
      let nearest = @sim.clamp(along, 0, length)
      cut = smooth(-0.8, 0, along) *
        (1 - smooth(2.05, 2.42, delta.sub(dir.scale(nearest)).length()))
    }
  } else {
    let delta = pos.sub(point(self.player)).sub({ x: 0, y: 1.3, z: 0, })
    let direction = point(self.direction)
    let along = delta.dot(direction)
    let radius = delta.sub(direction.scale(along)).length()
    let outer = if structure { 36.0 } else { 13.0 }
    cut = (1 - smooth(outer * 5 / 13, outer, radius)) *
      smooth(1.5, 3.5, delta.y) *
      (1 - smooth(55, 62, along))
  }
  if terrain {
    for i in 0..<4 {
      let b = self.bounds[i]
      let p = self.planes[i]
      if p.z > 0 &&
        pos.x >= b.x - 0.02 &&
        pos.x <= b.z + 0.02 &&
        pos.z >= b.y - 0.02 &&
        pos.z <= b.w + 0.02 {
        let height = p.x + p.y * @sim.clamp(pos.z - b.y, 0, b.w - b.y)
        cut *= smooth(0.12, 0.3, (pos.y - height).abs())
      }
    }
  }
  cut < 0.655
}
