// Articulated 3D humanoid characters, held 3D weapons, on-foot movement & carjacking.
import*as THREE from'three';
import{SERVICE_POIS,WEAPONS,WORLD}from'./config.js';
import{getGroundHeightAt,isWaterAt,resolveBuildingCollision}from'./world-city.js';

const{Group:Grp,Mesh,BoxGeometry:Box,CylinderGeometry:Cyl,SphereGeometry:Sph,ConeGeometry:Cone,MeshStandardMaterial:Std,MeshBasicMaterial:Bas}=THREE;
const{sin,cos,hypot,min,max,atan2,PI:P}=Math,H=P/2;
const sM=(c,r=.58,mt=0,ex={})=>new Std({color:c,roughness:r,metalness:mt,...ex}),WD=sM('#273040',.35,.72),WM=sM('#cbd5e1',.25,.82),WW=sM('#9c5d30',.68);
const add=(p,g,m,x,y,z,rx=0)=>{const o=new Mesh(g,m);o.position.set(x,y,z);if(rx)o.rotation.x=rx;p.add(o);return o;};
const B=(p,w,h,d,m,x,y,z)=>add(p,new Box(w,h,d),m,x,y,z),C=(p,a,b,h,s,m,x,y,z,rx=0)=>add(p,new Cyl(a,b,h,s),m,x,y,z,rx);

export function buildWeaponPropMesh(id){
const g=new Grp();if(id==='fists')return g;
if(id==='viper_9mm'){B(g,.08,.1,.34,WD,0,.04,.16);B(g,.07,.14,.09,WD,0,-.05,.04);}
else if(id==='stinger_smg'){B(g,.11,.14,.56,WD,0,.03,.24);B(g,.06,.24,.08,WM,0,-.13,.28);}
else if(id==='coral_shotgun'){B(g,.1,.12,.92,WD,0,.04,.38);B(g,.12,.12,.28,WW,0,.01,.45);}
else if(id==='cobre_launcher'){C(g,.08,.08,1.25,8,sM('#4d7c17'),0,.08,.25,H);add(g,new Cone(.12,.34,8),sM('#ef4444'),0,.08,.96,H);}
else if(id==='sol_grenade')add(g,new Sph(.1,8,8),sM('#22c55e'),0,0,.14);
else{const l=id==='mirage_sniper'?1.18:.92;B(g,.1,.14,l,WD,0,.04,l*.4);C(g,.04,.04,.28,7,WM,0,.14,.25,H);B(g,.06,.22,.09,WD,0,-.1,.32);}
return g;
}

export function createCharacterRig(o={}){
const root=new Grp(),sk=sM(o.skin||'#e2ae88'),jM=sM(o.jacket||'#f43f5e',.44,0,o.emissive?{emissive:o.emissive,emissiveIntensity:.28}:{});
const iM=sM(o.inner||'#f8fafc',.6),pM=sM(o.pants||'#293548',.68),hM=sM(o.hair||'#221a16',.72),shM=sM('#18202c',.5);
const legL=new Grp();legL.position.set(-.135,.86,0);C(legL,.095,.078,.78,10,pM,0,-.39,0).castShadow=true;B(legL,.16,.12,.27,shM,0,-.81,.045);
const legR=legL.clone();legR.position.x=.135;
const torso=C(root,.24,.19,.66,12,jM,0,1.2,0);torso.scale.set(1.12,1,.68);torso.castShadow=true;
B(root,.15,.56,.28,iM,0,1.22,.03);C(root,.2,.2,.08,12,shM,0,.89,0).scale.set(1.12,1,.7);
const hG=new Grp();hG.position.set(0,1.69,0);C(hG,.065,.075,.14,8,sk,0,-.14,0);
const hd=add(hG,new Sph(.165,14,12),sk,0,0,0);hd.scale.set(.92,1.06,.96);hd.castShadow=true;
add(hG,new Sph(.178,14,10,0,P*2,0,P*.62),hM,0,.02,-.015);
if(o.longHair)C(hG,.15,.18,.34,10,hM,0,-.1,-.09);
if(o.isPolice){C(hG,.18,.16,.1,12,sM('#1b3563'),0,.15,.02);B(hG,.24,.03,.14,shM,0,.11,.16);B(root,.07,.08,.03,new Bas({color:'#fbbf24'}),.12,1.32,.16);}
if(o.sunglasses)B(hG,.24,.065,.05,WD,0,.01,.145);
const armL=new Grp(),armR=new Grp(),wm=new Grp();armL.position.set(-.31,1.46,0);armR.position.set(.31,1.46,0);wm.position.set(0,-.54,.04);wm.rotation.x=H;
const shL=add(armL,new Sph(.085,8,8),jM,0,0,0),lbL=C(armL,.072,.058,.56,8,jM,0,-.28,0),hdL=add(armL,new Sph(.058,8,8),sk,0,-.57,0);lbL.castShadow=true;
armR.add(shL.clone(),lbL.clone(),hdL.clone(),wm);root.add(legL,legR,hG,armL,armR);
return{root,legL,legR,armL,armR,torso,headGroup:hG,weaponMount:wm,weaponId:''};
}

export function setCharacterWeapon(rig,id){if(rig.weaponId===id)return;rig.weaponId=id;while(rig.weaponMount.children.length)rig.weaponMount.remove(rig.weaponMount.children[0]);rig.weaponMount.add(buildWeaponPropMesh(id));}
export function animateCharacterRig(rig,spd,aim,ph,alive=true){
if(!alive){rig.root.rotation.x=-H;rig.root.position.y=max(.22,rig.root.position.y);return;}
rig.root.rotation.x=0;const sw=sin(ph)*min(.75,spd*.09);rig.legL.rotation.x=sw;rig.legR.rotation.x=-sw;
if(aim){rig.armR.rotation.x=-P*.48;rig.armL.rotation.x=-P*.34;rig.armL.rotation.y=.25;}else{rig.armL.rotation.x=-sw*.85;rig.armL.rotation.y=0;rig.armR.rotation.x=sw*.85;}
}
export function createPlayer(scene){
const rig=createCharacterRig({skin:'#e0a57f',jacket:'#f4355a',emissive:'#6e1429',pants:'#27344a',hair:'#1d1410',longHair:true,sunglasses:true});setCharacterWeapon(rig,'stinger_smg');scene.add(rig.root);
return{name:'Valeria "Val" Reyes',rig,x:240,y:.16,z:-90,vx:0,vy:0,vz:0,yaw:0,speed:0,gaitPhase:0,health:100,maxHealth:100,armor:85,maxArmor:100,cash:48500,respect:420,inVehicle:false,vehicle:null,nearbyVehicle:null,nearbyPoi:null,weaponIndex:2,ammo:Object.fromEntries(WEAPONS.map(w=>[w.id,w.ammo])),fireCooldown:0,aiming:false,stats:{missionsCompleted:0,activitiesCompleted:0,carsHijacked:4,eliminations:12,copsEvaded:3,stuntJumps:2,totalEarnings:48500,distanceKm:4.8}};
}
const nearV=(pl,vh)=>{let b=null,d=7.2;for(const v of vh)if(!v.spec.isHeli&&!v.destroyed){const k=hypot(v.x-pl.x,v.z-pl.z);if(k<d){d=k;b=v;}}return b;};
export function enterOrExitVehicle(pl,vh,wn){
if(pl.inVehicle&&pl.vehicle){
const v=pl.vehicle;v.driverType='parked';pl.inVehicle=false;pl.vehicle=null;
pl.x=v.x+cos(v.yaw)*(v.spec.w*.72+.9);pl.z=v.z-sin(v.yaw)*(v.spec.w*.72+.9);pl.y=getGroundHeightAt(pl.x,pl.z);pl.yaw=v.yaw;pl.rig.root.visible=true;pl.rig.root.position.set(pl.x,pl.y,pl.z);
return{action:'exit',vehicle:v};
}
const best=nearV(pl,vh);if(!best)return null;const npc=best.driverType==='traffic'||best.driverType==='police';
best.driverType='player';Object.assign(pl,{inVehicle:true,vehicle:best,x:best.x,y:best.y,z:best.z,yaw:best.yaw});pl.rig.root.visible=false;pl.stats.carsHijacked++;
if(wn&&(npc||best.spec.isPolice))wn.addHeat(best.spec.isPolice?2.2:1,best.x,best.z);return{action:'enter',vehicle:best};
}
export function updatePlayerOnFoot(pl,inp,camYaw,w,vh,dt){
pl.nearbyVehicle=pl.inVehicle?null:nearV(pl,vh);pl.nearbyPoi=null;
let bpd=12;for(const poi of SERVICE_POIS){const d=hypot(poi.x-pl.x,poi.z-pl.z);if(d<bpd){bpd=d;pl.nearbyPoi=poi;}}
if(pl.inVehicle&&pl.vehicle){Object.assign(pl,{x:pl.vehicle.x,y:pl.vehicle.y,z:pl.vehicle.z,yaw:pl.vehicle.yaw,speed:pl.vehicle.speed});pl.stats.distanceKm+=pl.speed*dt/1000;return;}
const k=inp.keys,f=(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0),s=(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0),spr=Boolean(k.ShiftLeft||k.ShiftRight),sp=spr?11.2:6.4;
let mx=sin(camYaw)*f-cos(camYaw)*s,mz=cos(camYaw)*f+sin(camYaw)*s;const mg=hypot(mx,mz);if(mg>.01){mx=mx/mg*sp;mz=mz/mg*sp;}
pl.aiming=Boolean(inp.mouseDown||inp.rightMouseDown);
if(pl.aiming)pl.yaw=camYaw;else if(mg>.05){let df=atan2(mx,mz)-pl.yaw;while(df>P)df-=P*2;while(df<-P)df+=P*2;pl.yaw+=df*min(1,dt*12);}
const nx=THREE.MathUtils.clamp(pl.x+mx*dt,WORLD.minX,WORLD.maxX),nz=THREE.MathUtils.clamp(pl.z+mz*dt,WORLD.minZ,WORLD.maxZ);
if(!isWaterAt(nx,nz)){const col=resolveBuildingCollision(w,nx,nz,.55);pl.x=col.x;pl.z=col.z;}
const gy=getGroundHeightAt(pl.x,pl.z,w.ramps);if(inp.consumeJump()&&pl.y<=gy+.08)pl.vy=8.4;
pl.vy-=22*dt;pl.y+=pl.vy*dt;if(pl.y<gy){pl.y=gy;pl.vy=0;}
pl.speed=hypot(mx,mz);pl.stats.distanceKm+=pl.speed*dt/1000;if(pl.speed>.2)pl.gaitPhase+=dt*(spr?12.5:8.5);
setCharacterWeapon(pl.rig,WEAPONS[pl.weaponIndex].id);pl.rig.root.visible=true;pl.rig.root.position.set(pl.x,pl.y,pl.z);pl.rig.root.rotation.y=pl.yaw;
animateCharacterRig(pl.rig,pl.speed,pl.aiming,pl.gaitPhase,pl.health>0);
}
