import * as T from 'three';

export function cameraMovement(horizontal,vertical,yaw){
  const length=Math.hypot(horizontal,vertical);
  if(!length)return {x:0,z:0};
  return {x:(-Math.cos(yaw)*horizontal-Math.sin(yaw)*vertical)/length,z:(Math.sin(yaw)*horizontal-Math.cos(yaw)*vertical)/length};
}

export class FollowCamera{
  constructor(aspect,yaw=Math.PI){
    this.camera=new T.PerspectiveCamera(60,aspect,.15,350);
    this.yaw=yaw;this.pitch=.32;this.distance=12;
    this.boom=12;this.height=1.6;this.shoulder=1.2;this.sensitivity=1;
    this.pivot=new T.Vector3();this.forward=new T.Vector3();this.right=new T.Vector3();this.up=new T.Vector3();
    this.offset=new T.Vector3();this.probe=new T.Vector3();
  }
  turn(dx,dy){
    this.yaw-=dx*.0025*this.sensitivity;
    this.pitch=T.MathUtils.clamp(this.pitch+dy*.002*this.sensitivity,-.65,.95);
  }
  update(player,dt,obstruction){
    this.pivot.set(player.x,player.y+1.8,player.z);
    this.forward.set(Math.sin(this.yaw)*Math.cos(this.pitch),-Math.sin(this.pitch),Math.cos(this.yaw)*Math.cos(this.pitch));
    this.right.set(-Math.cos(this.yaw),0,Math.sin(this.yaw));
    this.up.crossVectors(this.right,this.forward).normalize();
    this.offset.copy(this.forward).multiplyScalar(-this.boom).addScaledVector(this.right,this.shoulder).addScaledVector(this.up,this.height);
    // Looking above the horizon must not swing the camera underneath the hull.
    this.offset.y=Math.max(this.height,this.offset.y);
    const desired=this.offset.length();this.offset.normalize();
    let clear=desired;
    // Probe a small volume so the near plane cannot slip through a corner.
    for(const [x,y]of [[0,0],[.4,0],[-.4,0],[0,.4],[0,-.4]]){
      this.probe.copy(this.pivot).addScaledVector(this.right,x).addScaledVector(this.up,y);
      clear=Math.min(clear,obstruction(this.probe,this.offset,desired)-.5);
    }
    clear=Math.max(.3,clear);
    this.distance=clear<this.distance?clear:T.MathUtils.damp(this.distance,clear,6,dt);
    this.camera.position.copy(this.pivot).addScaledVector(this.offset,this.distance);
    this.camera.lookAt(this.probe.copy(this.camera.position).add(this.forward));
    this.camera.updateMatrixWorld();
    return this.distance;
  }
}

const propCenter=new T.Vector3(),viewSegment=new T.Vector3(),viewPoint=new T.Vector3();
export function cameraPropOpacity(bounds,camera,target){
  bounds.getCenter(propCenter);viewSegment.subVectors(target,camera);
  const lengthSq=viewSegment.lengthSq();
  const t=lengthSq?T.MathUtils.clamp(propCenter.sub(camera).dot(viewSegment)/lengthSq,0,1):0;
  viewPoint.copy(camera).addScaledVector(viewSegment,t);
  return .16+.84*T.MathUtils.smoothstep(bounds.distanceToPoint(viewPoint),.6,2);
}
