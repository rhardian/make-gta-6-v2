// Third-person chase camera, over-the-shoulder combat camera, title panorama & shake.
import*as THREE from'three';
const{Vector3:V3,MathUtils:MU}=THREE,{sin,cos,abs,min,max,PI:P}=Math;

export function createCameraController(aspect=1280/720){
const camera=new THREE.PerspectiveCamera(60,aspect,.4,2400);camera.position.set(240,6,-102);
return{camera,mode:'gameplay',yaw:0,pitch:-.06,orbitOffset:0,shake:0,smoothPos:new V3(240,6,-102),smoothLook:new V3(240,2,-80),fixedPos:null,fixedLook:null,fixedFov:58};
}
export function setFixedCamera(c,pos,look,fov=58){
c.mode='fixed';c.fixedPos=new V3(...pos);c.fixedLook=new V3(...look);c.fixedFov=c.camera.fov=fov;
c.camera.position.copy(c.fixedPos);c.camera.lookAt(c.fixedLook);c.camera.updateProjectionMatrix();
}
export const addCameraShake=(c,a)=>{c.shake=min(1.4,c.shake+a);};

export function updateCameraController(c,pl,inp,dt,el){
if(c.mode==='fixed'&&c.fixedPos&&c.fixedLook){c.camera.position.copy(c.fixedPos);c.camera.lookAt(c.fixedLook);return;}
if(c.mode==='panorama'){const sw=sin(el*.14)*14;c.camera.fov=56;c.camera.updateProjectionMatrix();c.camera.position.set(324+sw*.4,43,-162+sw*.5);c.camera.lookAt(262,13,30);return;}
const d=inp?inp.consumeMouseDelta():{dx:0,dy:0};
if(pl.inVehicle&&pl.vehicle){
const v=pl.vehicle;c.orbitOffset=MU.clamp(c.orbitOffset-d.dx*.004,-1.35,1.35);
if(abs(d.dx)<.01&&abs(v.speed)>4)c.orbitOffset=MU.lerp(c.orbitOffset,0,min(1,dt*2.2));
let df=v.yaw+c.orbitOffset-c.yaw;while(df>P)df-=P*2;while(df<-P)df+=P*2;c.yaw+=df*min(1,dt*6.5);
const dst=v.spec.isBoat?13.5:9.8+min(3.2,v.speed*.045);
c.smoothPos.lerp(new V3(v.x-sin(c.yaw)*dst,v.y+(v.spec.isBoat?4.8:3.9),v.z-cos(c.yaw)*dst),min(1,dt*9));
c.smoothLook.lerp(new V3(v.x+sin(v.yaw)*7.5,v.y+1.55,v.z+cos(v.yaw)*7.5),min(1,dt*11));
c.camera.fov=MU.lerp(c.camera.fov,58+min(12,v.speed*.16)+(v.nitroActive?5:0),min(1,dt*5));
}else{
c.yaw-=d.dx*.0045;c.pitch=MU.clamp(c.pitch-d.dy*.0035,-.45,.42);
const aim=Boolean(inp?.rightMouseDown),dst=aim?3.2:4.6,sh=aim?.95:.78,fx=sin(c.yaw),fz=cos(c.yaw),rx=-cos(c.yaw),rz=sin(c.yaw);
c.smoothPos.lerp(new V3(pl.x-fx*dst+rx*sh,pl.y+2.15-sin(c.pitch)*1.4,pl.z-fz*dst+rz*sh),min(1,dt*14));
c.smoothLook.lerp(new V3(pl.x+fx*18+rx*sh*.35,pl.y+1.48+sin(c.pitch)*8,pl.z+fz*18+rz*sh*.35),min(1,dt*16));
c.camera.fov=MU.lerp(c.camera.fov,aim?48:58,min(1,dt*8));
}
c.shake=max(0,c.shake-dt*2.8);const s=c.shake>0?c.shake*.65:0;
c.camera.position.set(c.smoothPos.x+(Math.random()-.5)*s,max(.8,c.smoothPos.y+(Math.random()-.5)*s),c.smoothPos.z);
c.camera.lookAt(c.smoothLook);c.camera.updateProjectionMatrix();
}
