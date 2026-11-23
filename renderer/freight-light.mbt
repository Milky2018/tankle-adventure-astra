///|
// World bounds of the +8 dispatch hall and the direction to its west windows.
let freight_declarations : String =
  #| const vec3 freightMin = vec3(-146.4,7.5,-12.0);
  #| const vec3 freightMax = vec3(-64.0,21.5,42.0);
  #| const vec3 freightSun = vec3(-1.0,.32,.42);
  #| const float freightWindowX = -143.985;
  #| const vec2 freightSill = vec2(-10.0,9.15);
  #| const vec2 freightHead = vec2(38.0,16.20);
  #| float freightOpening(vec2 pane, float blur) {
  #|   vec2 edges = min(pane-freightSill,freightHead-pane);
  #|   float pier = abs(fract((freightHead.x-pane.x)/8.0+.5)-.5)*8.0;
  #|   float edge = min(min(edges.x,edges.y),pier-.36);
  #|   edge = min(edge,abs(pane.x-26.0)-3.9);
  #|   edge = min(edge,max(abs(pane.x-10.0)-3.95,pane.y-13.65));
  #|   edge = min(edge,max(abs(pane.x-2.0)-3.95,pane.y-11.85));
  #|   return smoothstep(-blur,blur,edge);
  #| }

///|
// The low sills bounce light onto the wall foot. Direct sunlight passes
// through the glazing above them, including the transoms over the winch and the loading recess.
let freight_daylight : String =
  #| #ifdef STANDARD
  #| vec3 hallEdge = min(apertureWorld - freightMin, freightMax - apertureWorld);
  #| if (all(greaterThan(hallEdge,vec3(0.0)))) {
  #|   float shelter = smoothstep(0.0,2.5,min(hallEdge.x,hallEdge.z)) * smoothstep(0.0,.45,hallEdge.y);
  #|   reflectedLight.directDiffuse *= 1.0-.27*shelter;
  #|   reflectedLight.indirectDiffuse *= mix(vec3(1.0),vec3(.63,.51,.46),shelter);
  #|   reflectedLight.indirectSpecular *= 1.0-.30*shelter;
  #|   float run = apertureWorld.x - freightWindowX;
  #|   vec2 pane = apertureWorld.zy + run*freightSun.zy;
  #|   float bounce = exp(-.08*abs(run))*smoothstep(-2.0,2.0,min(pane.x-freightSill.x,freightHead.x-pane.x));
  #|   reflectedLight.indirectDiffuse += diffuseColor.rgb*vec3(.32,.18,.09)*bounce*shelter;
  #|   if (run > -.7 && run < 34.0) {
  #|     float bayLight = freightOpening(vec2(pane.x,freightSill.y+.7),.45);
  #|     float sillBounce = exp(-.23*abs(run))*bayLight;
  #|     reflectedLight.indirectDiffuse += diffuseColor.rgb*vec3(1.65,1.03,.56)*sillBounce;
  #|     float blur = .045+.007*max(run,0.0);
  #|     float opening = freightOpening(pane,blur);
  #|     float spacing = 8.0/6.0;
  #|     float jamb = abs(fract((freightHead.x-pane.x)/spacing+.5)-.5)*spacing;
  #|     float sash = min(jamb-.075,min(min(abs(pane.y-11.12),abs(pane.y-13.12)),abs(pane.y-14.84))-.08);
  #|     float frame = mix(.13,1.0,smoothstep(-blur,blur,sash));
  #|     if (opening > 0.0) {
  #|       IncidentLight sunlight;
  #|       sunlight.direction = normalize(mat3(viewMatrix)*freightSun);
  #|       sunlight.color = vec3(23.0,14.2,7.8)*opening*frame;
  #|       sunlight.visible = true;
  #|       vec3 originalSpecular = reflectedLight.directSpecular;
  #|       RE_Direct(sunlight,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);
  #|       reflectedLight.directSpecular = mix(originalSpecular,reflectedLight.directSpecular,.055);
  #|     }
  #|   }
  #| }
  #| #endif

///|
// Only the part of the sightline inside the hall contributes dust. Parallel
// overhead rays start on the camera plane, just like the perspective rays.
let freight_haze : String =
  #| vec3 rayStart = cameraPosition;
  #| if (isOrthographic) {
  #|   vec3 forward = -vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]);
  #|   rayStart = apertureWorld-forward*dot(apertureWorld-cameraPosition,forward);
  #| }
  #| if (all(greaterThan(max(rayStart,apertureWorld),freightMin)) && all(lessThan(min(rayStart,apertureWorld),freightMax))) {
  #|   vec3 ray = apertureWorld-rayStart;
  #|   vec3 divisor = mix(min(ray,vec3(-.0001)),max(ray,vec3(.0001)),step(vec3(0.0),ray));
  #|   vec3 a = (freightMin-rayStart)/divisor, b = (freightMax-rayStart)/divisor;
  #|   vec3 lo = min(a,b), hi = max(a,b);
  #|   float enter = max(0.0,max(lo.x,max(lo.y,lo.z)));
  #|   float leave = min(1.0,min(hi.x,min(hi.y,hi.z)));
  #|   if (leave > enter) {
  #|     float path = (leave-enter)*length(ray);
  #|     vec3 mid = rayStart + ray*((leave+enter)*.5);
  #|     vec2 pane = mid.zy + (mid.x-freightWindowX)*freightSun.zy;
  #|     vec2 edge = min(pane-freightSill,freightHead-pane);
  #|     float lit = smoothstep(-4.0,.65,min(edge.x,edge.y));
  #|     float towardsWindows = max(0.0,dot(normalize(ray),normalize(freightSun)));
  #|     vec3 air = mix(vec3(.32,.25,.18),vec3(1.12,.77,.42),lit*(.45+.55*towardsWindows));
  #|     gl_FragColor.rgb = mix(gl_FragColor.rgb,air,1.0-exp(-(.0022+.0014*lit)*path));
  #|   }
  #| }
