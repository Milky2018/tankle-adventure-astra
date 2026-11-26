///|
// Project the impact hall's roof monitor onto the concrete, machinery and
// moving vehicles. The two rows of glazing share four-metre mullion bays.
let proving_daylight : String =
  #| #ifdef STANDARD
  #| vec3 provingEdge = min(apertureWorld-vec3(106.0,15.2,-198.0),vec3(172.0,36.0,-128.5)-apertureWorld);
  #| if (all(greaterThan(provingEdge,vec3(0.0)))) {
  #|   float fade = smoothstep(0.0,2.0,min(provingEdge.x,provingEdge.z))*smoothstep(0.0,.65,provingEdge.y);
  #|   vec3 ray = vec3(1.0,.49,-.48);
  #|   float run = max(0.0,171.52-apertureWorld.x);
  #|   vec2 pane = apertureWorld.zy + run*ray.zy;
  #|   vec2 edges = min(pane-vec2(-193.0,28.2),vec2(-141.8,34.46)-pane);
  #|   float rim = min(edges.x,edges.y);
  #|   float penumbra = .08+run*.014;
  #|   float window = smoothstep(-penumbra,penumbra,rim);
  #|   float jamb = abs(fract((pane.x+193.0)*.25+.5)-.5)*4.0-.12;
  #|   float sash = min(jamb,abs(pane.y-31.30)-.11);
  #|   float frame = mix(.22,1.0,smoothstep(-penumbra,penumbra,sash));
  #|   reflectedLight.indirectDiffuse += diffuseColor.rgb*vec3(.18,.21,.24)*smoothstep(-9.0,3.0,rim)*fade;
  #|   if (window > 0.0) {
  #|     IncidentLight sun;
  #|     sun.direction = normalize(mat3(viewMatrix)*ray);
  #|     sun.color = vec3(8.8,8.1,6.9)*window*frame*fade;
  #|     sun.visible = true;
  #|     vec3 originalSpecular = reflectedLight.directSpecular;
  #|     RE_Direct(sun,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);
  #|     reflectedLight.directSpecular = mix(originalSpecular,reflectedLight.directSpecular,.24);
  #|   }
  #| }
  #| #endif
