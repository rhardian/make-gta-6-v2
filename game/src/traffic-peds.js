// Living Solaria Bay population: ambient multi-lane traffic, bay boats, pedestrians & AI.
import*as THREE from'three';
import{WORLD}from'./config.js';
import{pick,randRange}from'./random.js';
import{animateCharacterRig,createCharacterRig,setCharacterWeapon}from'./player-onfoot.js';
import{spawnVehicle,stepVehiclePhysics}from'./vehicles.js';
import{getGroundHeightAt,isWaterAt,resolveBuildingCollision}from'./world-city.js';

const MD=['brisa_sedan','palma_taxi','aureo_cabrio','solaria_coupe','tormenta_muscle','cobre_suv','docks_pickup','cargo_boxtruck','vortex_moto','palma_scooter','mirage_limo','mako_v12'];
const SH=['#ff5e78','#22d3ee','#fbbf24','#34d399','#a78bfa','#f97316','#f8fafc','#38bdf8'],SK=['#e2b290','#c88c65','#f2cfb6','#8d5535','#d9a17c'],HR=['#1e1b18','#523620','#b45309','#facc15'];
const{sin,cos,abs,max,hypot,atan2,PI:P}=Math;let pid=1;

export function spawnPedestrian(sc,x,z,rng,role='civilian',o={}){
const c=role==='police',s=role==='syndicate',pt=role==='partner';
const rig=createCharacterRig({skin:o.skin||pick(rng,SK),jacket:o.jacket||(c?'#2b4d8a':s?'#a82246':pt?'#0ea5e9':pick(rng,SH)),emissive:c?'#102248':s?'#4a0f22':pt?'#083a5e':'',pants:c?'#1c2b47':s?'#1f2937':'#334155',hair:o.hair||(pt?'#18181b':pick(rng,HR)),isPolice:c,sunglasses:s||pt});
const wId=o.weaponId||(c?'viper_9mm':s?'stinger_smg':pt?'helios_carbine':'fists'),y=getGroundHeightAt(x,z),yaw=o.yaw??randRange(rng,0,P*2),hp=o.health??(s?85:c?95:pt?250:45);
setCharacterWeapon(rig,wId);rig.root.position.set(x,y,z);rig.root.rotation.y=yaw;sc.add(rig.root);
return{id:pid++,role,name:o.name||(c?'SBPD Officer':s?'Syndicate Gunman':pt?'Rico Vega':'Resident'),rig,x,y,z,yaw,speed:0,gaitPhase:randRange(rng,0,P*2),health:hp,maxHealth:hp,alive:true,panicTimer:o.panicTimer||0,weaponId:wId,fireCd:randRange(rng,.4,1.1),aiming:Boolean(o.aiming),walkDir:rng()<.5?1:-1,homeX:x,homeZ:z,cashDrop:s?450:c?200:85};
}
export function populateAmbientCity(sc,vh,pd,rng){
for(let i=0;i<24;i++){
const av=i%2===0,dr=i%4<2?1:-1,x=av?WORLD.avenuesX[i%6]+(dr>0?-5.2:5.2):randRange(rng,-310,210),z=av?randRange(rng,-310,310):WORLD.streetsZ[i%7]+(dr>0?5.2:-5.2);
vh.push(spawnVehicle(sc,MD[i%12],x,z,av?(dr>0?0:P):(dr>0?P/2:-P/2),rng,{driverType:'traffic',roadAxis:av?'z':'x',roadDir:dr,speed:14}));
}
for(const a of[['corsair_boat',358,-80,.12,{driverType:'parked'}],['corsair_boat',392,95,-.35,{driverType:'traffic',speed:12}],['mako_v12',235,-82,0,{color:'#f22248',driverType:'parked'}],['aureo_cabrio',235,-45,0,{color:'#ff476c',driverType:'parked'}]])vh.push(spawnVehicle(sc,a[0],a[1],a[2],a[3],rng,a[4]));
for(let i=0;i<36;i++){
const x=i<16?(i%2?256:223)+randRange(rng,-2,3):i<24?randRange(rng,274,308):(i%2?17:-17)+randRange(rng,-2,2),z=i<16?randRange(rng,-240,220):i<24?randRange(rng,-200,200):randRange(rng,-300,120);
pd.push(spawnPedestrian(sc,x,z,rng,'civilian'));
}
}
export function updateTrafficVehicles(vh,pl,w,fx,dt,el){
for(let i=0;i<vh.length;i++){
const v=vh[i];if(v.driverType!=='traffic'||v.destroyed||v.spec.isHeli)continue;
if(v.spec.isBoat){stepVehiclePhysics(v,{throttle:.48,steer:sin(el*.4+v.id)*.25},w,fx,dt,el);continue;}
const fX=sin(v.yaw),fZ=cos(v.yaw);let blk=(pl.x-v.x)*fX+(pl.z-v.z)*fZ>0&&hypot(pl.x-v.x,pl.z-v.z)<12;
for(let j=0;!blk&&j<vh.length;j++)if(i!==j){const dx=vh[j].x-v.x,dz=vh[j].z-v.z,ah=dx*fX+dz*fZ;if(ah>0&&ah<15&&abs(-dx*fZ+dz*fX)<3.4)blk=true;}
if(v.roadAxis==='z'){if(v.z>350)v.z=-345;else if(v.z<-350)v.z=345;}else{if(v.x>235)v.x=-345;else if(v.x<-355)v.x=230;}
let yd=(v.roadAxis==='z'?(v.roadDir>0?0:P):(v.roadDir>0?P/2:-P/2))-v.yaw;while(yd>P)yd-=P*2;while(yd<-P)yd+=P*2;
stepVehiclePhysics(v,{throttle:blk?-.45:v.speed<16?.55:.12,steer:THREE.MathUtils.clamp(yd*1.4,-.7,.7)},w,fx,dt,el);
}
}
export function updatePedestrians(pd,pl,w,cb,dt){
for(const p of pd){
if(!p.alive){animateCharacterRig(p.rig,0,false,p.gaitPhase,false);continue;}
const dx=pl.x-p.x,dz=pl.z-p.z,d=hypot(dx,dz);p.aiming=false;
if(p.role==='syndicate'||p.role==='police'){
if(d<(p.role==='syndicate'?62:52)){p.yaw=atan2(dx,dz);p.aiming=true;if(d>22){p.speed=4.6;p.x+=sin(p.yaw)*4.6*dt;p.z+=cos(p.yaw)*4.6*dt;}else p.speed=0;p.fireCd-=dt;if(p.fireCd<=0&&cb){p.fireCd=p.role==='syndicate'?.68:.82;cb.fireNpcShot(p,pl);}}else p.speed=0;
}else if(p.role==='partner'){
let tg=null,bd=55;for(const o of pd)if(o.alive&&o.role==='syndicate'){const od=hypot(o.x-p.x,o.z-p.z);if(od<bd){bd=od;tg=o;}}
if(tg){p.yaw=atan2(tg.x-p.x,tg.z-p.z);p.aiming=true;p.speed=0;p.fireCd-=dt;if(p.fireCd<=0&&cb){p.fireCd=.55;cb.firePartnerShot(p,tg);}}
else if(!pl.inVehicle&&d>8&&d<70){p.yaw=atan2(dx,dz);p.speed=5.4;p.x+=sin(p.yaw)*5.4*dt;p.z+=cos(p.yaw)*5.4*dt;}else p.speed=0;
}else{
if(p.panicTimer>0){p.panicTimer=max(0,p.panicTimer-dt);p.yaw=atan2(-dx,-dz);p.speed=6.2;}else{p.yaw=p.walkDir>0?0:P;p.speed=1.9;if(abs(p.z-p.homeZ)>48)p.walkDir*=-1;}
const nx=p.x+sin(p.yaw)*p.speed*dt,nz=p.z+cos(p.yaw)*p.speed*dt;if(!isWaterAt(nx,nz)){const col=resolveBuildingCollision(w,nx,nz,.5);p.x=col.x;p.z=col.z;}
}
p.y=getGroundHeightAt(p.x,p.z);if(p.speed>.2)p.gaitPhase+=dt*p.speed*1.45;p.rig.root.position.set(p.x,p.y,p.z);p.rig.root.rotation.y=p.yaw;animateCharacterRig(p.rig,p.speed,p.aiming,p.gaitPhase,true);
}
}
