import * as T from 'three';

export const SIGNAL={magnet:0x328fff,ready:0xf3d250,open:0x85db58};
export const APERTURE_AIM_THRESHOLD=.45;
const direction=new T.Vector3(28,39.6,28).normalize();
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

// The camera aperture is continuous across meshes; a point's opacity never depends on a tile ID.
export function apertureOpacity(point,player,viewDirection=direction){
  const x=point.x-player.x,y=point.y-player.y-1.3,z=point.z-player.z;
  const along=x*viewDirection.x+y*viewDirection.y+z*viewDirection.z;
  const radius=Math.hypot(x-along*viewDirection.x,y-along*viewDirection.y,z-along*viewDirection.z);
  const aperture=(1-smooth(5,13,radius))*smooth(1.5,3.5,y)*(1-smooth(55,62,along));
  return 1-.84*aperture;
}

export function makeAperture(){
  const player={value:new T.Vector3()},enabled={value:1},viewDirection={value:direction.clone()};
  function apply(material,{depthOnly=false}={}){
    if(material.userData.aperture)return;
    material.userData.aperture=true;material.transparent=!depthOnly;material.depthWrite=depthOnly;
    if(depthOnly)material.colorWrite=false;
    material.onBeforeCompile=shader=>{
      shader.uniforms.aperturePlayer=player;shader.uniforms.apertureEnabled=enabled;shader.uniforms.apertureDirection=viewDirection;
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
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 aperturePlayer;\nuniform float apertureEnabled;\nuniform vec3 apertureDirection;\nvarying vec3 apertureWorld;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        vec3 apertureDelta = apertureWorld - aperturePlayer - vec3(0.0, 1.3, 0.0);
        float apertureAlong = dot(apertureDelta, apertureDirection);
        float apertureRadius = length(apertureDelta - apertureDirection * apertureAlong);
        float apertureCut = (1.0 - smoothstep(5.0, 13.0, apertureRadius)) * smoothstep(1.5, 3.5, apertureDelta.y) * (1.0 - smoothstep(55.0, 62.0, apertureAlong));
        diffuseColor.a *= 1.0 - 0.84 * apertureCut * apertureEnabled;
        ${depthOnly?'if (diffuseColor.a < 0.999) discard;':''}
        ${depthOnly?'':'outgoingLight *= mix(1.0, 0.42, smoothstep(3.0, 12.0, abs(apertureWorld.y - aperturePlayer.y)) * apertureEnabled);'}
        #include <opaque_fragment>
      `);
    };
    material.customProgramCacheKey=()=> `folded-continuous-aperture-v5-${depthOnly?'depth':'color'}`;
  }
  return {apply,update:(p,d=direction)=>{player.value.set(p.x,p.y,p.z);viewDirection.value.copy(d);},enable:value=>{enabled.value=value?1:0;}};
}
