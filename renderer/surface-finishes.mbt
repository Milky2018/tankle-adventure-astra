///|
// Project the reflected ray onto the walls of the room in which the panorama
// was captured. Fade back to the ordinary material outside that volume.
let room_reflection : String =
  #| uniform vec3 probeCenter, probeMin, probeMax;
  #| uniform float wetness;
  #| vec4 roomReflection(vec3 ray) {
  #|   vec3 edge = min(apertureWorld-probeMin, probeMax-apertureWorld);
  #|   float coverage = smoothstep(-0.8,1.3,min(edge.x,edge.z)) *
  #|                    smoothstep(-1.0,0.0,edge.y);
  #|   vec3 walls = mix(probeMin,probeMax,step(vec3(0.0),ray));
  #|   vec3 travel = (walls-apertureWorld) / (max(abs(ray),vec3(0.0001))*mix(vec3(-1.0),vec3(1.0),step(vec3(0.0),ray)));
  #|   float hit = max(0.0,min(travel.x,min(travel.y,travel.z)));
  #|   vec3 sampleDir = normalize(apertureWorld+ray*hit-probeCenter);
  #|   vec2 uv = vec2(atan(sampleDir.z,sampleDir.x)*0.15915494+0.5,asin(clamp(sampleDir.y,-1.0,1.0))*0.31830989+0.5);
  #|   return vec4(texture2D(emissiveMap,uv).rgb,coverage);
  #| }

///|
let mirror_reflection : String =
  #| vec3 eye = isOrthographic ? -vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]) : normalize(apertureWorld-cameraPosition);
  #| vec3 worldNormal = inverseTransformDirection(normal,viewMatrix);
  #| vec3 room = roomReflection(reflect(eye,worldNormal)).rgb;
  #| outgoingLight = outgoingLight * .15 + room * vec3(.96,1.00,.98);

///|
let wet_floor : String =
  #| vec3 eye = isOrthographic ? -vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]) : normalize(apertureWorld-cameraPosition);
  #| vec2 uv = apertureWorld.xz;
  #| float wear = sin(uv.x*.48+sin(uv.y*.77))*sin(uv.y*.69-uv.x*.07);
  #| float film = mix(0.18,1.0,smoothstep(-0.45,0.39,wear));
  #| vec3 reflected = reflect(eye,normalize(vec3(0.014*sin(uv.x*1.3),1.0,0.012*cos(uv.y*1.4))));
  #| vec4 bay = roomReflection(reflected);
  #| float fresnel = 0.10+0.90*pow(1.0-abs(eye.y),2.0);
  #| outgoingLight = mix(outgoingLight,bay.rgb*1.6,film*wetness*fresnel*bay.a);

///|
let canal_reflection : String =
  #| vec3 eye = isOrthographic ? -vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]) : normalize(apertureWorld-cameraPosition);
  #| vec2 p = apertureWorld.xz;
  #| float swell = sin(dot(p,vec2(.72,.40))+waterTime*.93);
  #| float crossWave = cos(dot(p,vec2(-.33,1.21))-waterTime*1.14);
  #| float capillary = sin(dot(p,vec2(2.86,2.29))+crossWave*1.6-waterTime*1.63);
  #| float nearDetail = 1.0-smoothstep(18.0,65.0,distance(apertureWorld,cameraPosition));
  #| vec3 waterNormal = normalize(vec3(.017*swell+.008*capillary*nearDetail,1.0,.021*crossWave-.009*capillary*nearDetail));
  #| vec3 ray = reflect(eye,waterNormal);
  #| vec4 shore = roomReflection(ray);
  #| vec2 skyUv = vec2(atan(ray.z,ray.x)*.15915494+.5,asin(clamp(ray.y,-1.0,1.0))*.31830989+.5);
  #| vec3 sceneLight = mix(texture2D(map,skyUv).rgb,shore.rgb,shore.a);
  #| float fresnel = .074+.86*pow(1.0-max(0.0,dot(-eye,waterNormal)),2.1);
  #| vec3 water = mix(vec3(.018,.061,.064),vec3(.045,.13,.113),.5+.5*swell*crossWave);
  #| outgoingLight = mix(water,sceneLight*1.18,fresnel);

///|
let steam_fragment : String =
  #| float plumeNoise(vec2 p) {
  #|   vec2 cell=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  #|   vec4 q=dot(cell,vec2(127.1,311.7))+vec4(0,127.1,311.7,438.8);
  #|   vec4 n=fract(sin(q)*43758.5453);
  #|   return mix(mix(n.x,n.y,f.x),mix(n.z,n.w,f.x),f.y);
  #| }

///|
let steam_alpha : String =
  #| float h=plumeUv.y;
  #| vec2 flow=vec2(plumeUv.x*3.0,h*5.0-waterTime*.68);
  #| float noise=plumeNoise(flow)*.64+plumeNoise(flow*2.13)*.36;
  #| float axis=plumeUv.x-.5-.14*sin(4.0*h-waterTime*.64)*h;
  #| float width=.045+.42*h;
  #| float density=(1.0-smoothstep(width*.25,width,abs(axis)))*smoothstep(0.0,.13,h)*(1.0-smoothstep(.28,1.0,h));
  #| diffuseColor.a *= density*smoothstep(.19,.79,noise)*.85;
  #| diffuseColor.rgb = vec3(.72,.75,.70);
