import * as T from 'three';

export const SIGNAL={magnet:0x328fff,ready:0xf3d250,open:0x85db58};
export const APERTURE_AIM_THRESHOLD=.45;
export const STRUCTURE_APERTURE_RADIUS=36;
const direction=new T.Vector3(28,39.6,28).normalize();
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

// The camera aperture is continuous across meshes; a point's opacity never depends on a tile ID.
export function apertureOpacity(point,player,viewDirection=direction,outerRadius=13){
  const x=point.x-player.x,y=point.y-player.y-1.3,z=point.z-player.z;
  const along=x*viewDirection.x+y*viewDirection.y+z*viewDirection.z;
  const radius=Math.hypot(x-along*viewDirection.x,y-along*viewDirection.y,z-along*viewDirection.z);
  const aperture=(1-smooth(outerRadius*5/13,outerRadius,radius))*smooth(1.5,3.5,y)*(1-smooth(55,62,along));
  return 1-.84*aperture;
}

// Only the corridor from the tank to the eye fades; terrain ahead still blocks shots.
export function cameraApertureOpacity(point,p,camera){
  const dx=camera.x-p.x,dy=camera.y-p.y-1.6,dz=camera.z-p.z,l2=dx*dx+dy*dy+dz*dz;
  const x=point.x-p.x,y=point.y-p.y-1.6,z=point.z-p.z,t=(x*dx+y*dy+z*dz)/Math.max(.001,l2);
  const r=Math.hypot(x-dx*t,y-dy*t,z-dz*t);
  return 1-.84*(1-smooth(2.4,4.2,r))*smooth(-.06,.04,t)*(1-smooth(1.03,1.12,t))*smooth(.2,1.4,point.y-p.y);
}

export function makeAperture(){
  const player={value:new T.Vector3()},enabled={value:1},viewDirection={value:direction.clone()},camera={value:new T.Vector3()},mode={value:0};
  function apply(material,{depthOnly=false,radius=13,cameraOnly=false}={}){
    if(material.userData.aperture)return;
    material.userData.aperture=true;material.transparent=!depthOnly;material.depthWrite=depthOnly;
    if(depthOnly)material.colorWrite=false;
    material.onBeforeCompile=shader=>{
      shader.uniforms.apertureCamera=camera;shader.uniforms.apertureMode=mode;shader.uniforms.aperturePlayer=player;shader.uniforms.apertureEnabled=enabled;shader.uniforms.apertureDirection=viewDirection;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 apertureWorld;').replace('#include <project_vertex>',`#include <project_vertex>
        vec4 aperturePosition = vec4(transformed, 1.0);
        #ifdef USE_BATCHING
          aperturePosition = batchingMatrix * aperturePosition;
        #endif
        #ifdef USE_INSTANCING
          aperturePosition = instanceMatrix * aperturePosition;
        #endif
        apertureWorld = (modelMatrix * aperturePosition).xyz;
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 apertureCamera;\nuniform float apertureMode;\nuniform vec3 aperturePlayer;\nuniform float apertureEnabled;\nuniform vec3 apertureDirection;\nvarying vec3 apertureWorld;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        vec3 apertureDelta = apertureWorld - aperturePlayer - vec3(0.0, 1.3, 0.0);
        float apertureAlong = dot(apertureDelta, apertureDirection);
        float apertureRadius = length(apertureDelta - apertureDirection * apertureAlong);
        float apertureCut = (1.0 - smoothstep(${(radius*5/13).toFixed(4)}, ${radius.toFixed(4)}, apertureRadius)) * smoothstep(1.5, 3.5, apertureDelta.y) * (1.0 - smoothstep(55.0, 62.0, apertureAlong));
        vec3 eyeDelta = apertureCamera - aperturePlayer - vec3(0.0, 1.6, 0.0);
        vec3 pointDelta = apertureWorld - aperturePlayer - vec3(0.0, 1.6, 0.0);
        float eyeT = dot(pointDelta,eyeDelta) / max(0.001,dot(eyeDelta,eyeDelta));
        float eyeRadius = length(pointDelta-eyeDelta*eyeT);
        float eyeCut = (1.0-smoothstep(2.4,4.2,eyeRadius))*smoothstep(-0.06,0.04,eyeT)*(1.0-smoothstep(1.03,1.12,eyeT))*smoothstep(0.2,1.4,apertureWorld.y-aperturePlayer.y);
        float cut = mix(${cameraOnly?'0.0':'apertureCut'},eyeCut,apertureMode);
        diffuseColor.a *= 1.0 - 0.84 * cut * apertureEnabled;
        ${depthOnly?'if (diffuseColor.a < 0.999) discard;':''}
        ${depthOnly?'':'outgoingLight *= mix(1.0, 0.42, smoothstep(3.0, 12.0, abs(apertureWorld.y - aperturePlayer.y)) * apertureEnabled * (1.0-apertureMode));'}
        #include <opaque_fragment>
      `);
    };
    material.customProgramCacheKey=()=> `folded-continuous-aperture-v7-${cameraOnly}-${radius}-${depthOnly?'depth':'color'}`;
  }
  return {apply,setCamera:(p,c)=>{player.value.set(p.x,p.y,p.z);camera.value.copy(c);},setView:third=>{mode.value=third?1:0;},update:(p,d=direction)=>{player.value.set(p.x,p.y,p.z);viewDirection.value.copy(d);},enable:value=>{enabled.value=value?1:0;}};
}
