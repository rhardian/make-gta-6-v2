// 18 sculpted 3D vehicles: two-tone white & navy SBPD cruisers, crimson Mako V12 GT, AIR-1 spotlight & physics.
import*as THREE from'three';
import{VEHICLES,WORLD}from'./config.js';
import{SHARED_BEAM_TEX,SHARED_FLARE_TEX,SHARED_POOL_TEX}from'./effects-particles.js';
import{pick}from'./random.js';
import{createPoliceLiveryTextures}from'./textures-procedural.js';
import{getGroundHeightAt,isWaterAt,resolveBuildingCollision}from'./world-city.js';

const{Group:Grp,Mesh,BoxGeometry:Box,CylinderGeometry:Cyl,SphereGeometry:Sph,ConeGeometry:Cone,PlaneGeometry:Plane,CircleGeometry:Circ,TorusGeometry:Tor,MeshStandardMaterial:Std,MeshPhysicalMaterial:Phys,MeshBasicMaterial:Bas,SpriteMaterial:SprM,Sprite:Spr,Shape,ExtrudeGeometry,MathUtils:MU,AdditiveBlending:ADD,DoubleSide:DBL}=THREE;
const{sin,cos,abs,min,max,hypot,random:R,floor,PI:P}=Math,H=P/2,cl=MU.clamp,lp=MU.lerp,{minX,maxX,minZ,maxZ,shorelineX}=WORLD;
const sM=(c,r=.5,mt=0)=>new Std({color:c,roughness:r,metalness:mt}),pM=o=>new Phys(o),bM=(c,o={})=>new Bas({color:c,...o}),trM=(c,op,o={})=>bM(c,{transparent:true,opacity:op,depthWrite:false,...o});

const G={t:new Cyl(.42,.42,.34,16).rotateZ(H),r:new Cyl(.27,.27,.36,12).rotateZ(H),s:new Box(.46,.055,.37),h:new Box(.44,.14,.08),tl:new Box(.56,.14,.08)};
const M={tire:sM('#1b2029',.85),rim:sM('#e2eaf5',.22,.82),trim:sM('#242c3b',.5,.45),leather:sM('#bd7946',.68),glass:pM({color:'#132238',roughness:.08,metalness:.42,clearcoat:1,transparent:true,opacity:.92}),navy:pM({color:'#16305e',roughness:.24,metalness:.32,clearcoat:.85}),white:pM({color:'#f8fafc',roughness:.16,metalness:.2,clearcoat:1}),hl:bM('#fff9db'),tl:bM('#ff2042'),taxi:bM('#fde047'),fO:trM('#ff7b1c',.86,{blending:ADD}),fI:trM('#60d5ff',.9,{blending:ADD})};
const CC=new Map();
function chassisGeo(sp){
if(CC.has(sp.id))return CC.get(sp.id);
const{l:L,w:W,h:Ht,style:st,openTop:ot}=sp,hL=L/2,s=new Shape();
const pts=['super','coupe','cabrio'].includes(st)?[[-hL,.36],[hL,.34],[hL,.56],[hL*.44,Ht*.56],...(ot?[[hL*.18,Ht*.62],[-hL*.48,Ht*.6]]:[[hL*.12,Ht*1.02],[-hL*.38,Ht*.98],[-hL*.88,Ht*.63]]),[-hL,.86]]:['suv','police_suv','van','swat','truck'].includes(st)?[[-hL,.38],[hL,.38],[hL,Ht*.46],[hL*.52,Ht*.54],[hL*.34,Ht],[-hL*.92,Ht],[-hL,Ht*.86]]:[[-hL,.36],[hL,.36],[hL,Ht*.49],[hL*.44,Ht*.58],[hL*.18,Ht*1.02],[-hL*.38,Ht*1.02],[-hL*.64,Ht*.6],[-hL,Ht*.56]];
pts.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();
const g=new ExtrudeGeometry(s,{depth:W-.16,bevelEnabled:true,bevelThickness:.08,bevelSize:.07,bevelSegments:2});
g.translate(0,0,-(W-.16)/2);g.rotateY(-H);g.computeVertexNormals();CC.set(sp.id,g);return g;
}
const add=(p,g,m,x,y,z,rx=0,ry=0)=>{const o=new Mesh(g,m);o.position.set(x,y,z);if(rx)o.rotation.x=rx;if(ry)o.rotation.y=ry;p.add(o);return o;};
const B=(p,w,h,d,m,x,y,z,rx=0)=>add(p,new Box(w,h,d),m,x,y,z,rx),C=(p,a,b,h,sg,m,x,y,z,rx=0)=>add(p,new Cyl(a,b,h,sg),m,x,y,z,rx);
const flr=(p,c,op,sx,sy,x,y,z)=>{const s=new Spr(new SprM({map:SHARED_FLARE_TEX,color:c,transparent:true,opacity:op,blending:ADD,depthWrite:false}));s.position.set(x,y,z);s.scale.set(sx,sy,1);p.add(s);return s;};
function mkWh(){const pivot=new Grp(),spin=new Grp(),t=new Mesh(G.t,M.tire),s1=new Mesh(G.s,M.trim),s2=s1.clone();t.castShadow=true;s2.rotation.x=H;spin.add(t,new Mesh(G.r,M.rim),s1,s2);pivot.add(spin);return{pivot,spin};}

export function buildVehicleMesh(sp,hex){
const root=new Grp(),body=new Grp(),wheels=[];root.add(body);
const arm=!!sp.armored,paintMat=pM({color:hex,roughness:arm?.34:.15,metalness:arm?.58:.44,clearcoat:arm?.45:1,clearcoatRoughness:.07,emissive:['cabrio','super'].includes(sp.style)?'#24050c':'#000',emissiveIntensity:.25});
let sirens,mainRotor,tailRotor,spotlightCone,spotlightPool,nitroFlame;

if(sp.isHeli){
const hu=C(body,1.15,1.3,4.6,12,M.white,0,1.5,.5,H);hu.scale.set(.95,1,.86);hu.castShadow=true;
add(body,new Sph(1.12,12,10),M.glass,0,1.42,2.75).scale.set(.92,.8,1.45);C(body,.18,.45,5.4,8,M.white,0,1.78,-4.3,H);
[[1.88,.72,4.3,M.navy,0,1.05,.45],[2.12,.32,4.2,M.navy,0,1.44,.4],[.18,1.9,1.15,M.white,0,2.38,-6.7],[2.2,.12,.55,M.navy,0,1.82,-5.8]].forEach(a=>B(body,...a));
for(const s of[-1.15,1.15])C(body,.09,.09,5.2,6,M.trim,s,.22,.6,H);
mainRotor=new Grp();mainRotor.position.set(0,2.95,.6);const b1=new Mesh(new Box(10.8,.08,.36),M.trim),b2=b1.clone();b2.rotation.y=H;
mainRotor.add(b1,b2,add(mainRotor,new Circ(5.3,24),trM('#cbd5e1',.14,{side:DBL}),0,0,0,-H));body.add(mainRotor);
tailRotor=new Grp();tailRotor.position.set(.42,2.5,-6.7);B(tailRotor,.08,1.8,.22,M.trim,0,0,0);body.add(tailRotor);
spotlightCone=add(body,new Cone(7.2,34,28,1,true).translate(0,-17,0),trM('#e8f7ff',.21,{map:SHARED_BEAM_TEX,side:DBL}),0,.55,3.6,-.32);
add(body,new Sph(.42,10,10),bM('#fff'),0,.55,3.75);spotlightPool=add(root,new Circ(7.8,24),trM('#fff8e2',.24,{map:SHARED_POOL_TEX}),0,0,0,-H);
return{root,body,paintMat,wheels,mainRotor,tailRotor,spotlightCone,spotlightPool};
}
if(sp.isBoat){
B(body,sp.w,.85,sp.l*.78,paintMat,0,.45,-.35).castShadow=true;add(body,new Cone(sp.w*.68,2.4,4),paintMat,0,.48,sp.l*.48,H,P/4).scale.set(1,1,.42);
B(body,sp.w+.06,.22,sp.l*.74,sM(sp.stripe||'#ff4d6d',.3),0,.76,-.2);B(body,sp.w*.78,.55,1.15,M.glass,0,1.12,.45,-.38);B(body,sp.w*.7,.48,1.3,M.leather,0,.85,-1);
return{root,body,paintMat,wheels};
}
if(sp.isBike){
B(body,.48,.58,sp.l*.72,paintMat,0,.68,0).castShadow=true;[[.54,.46,.72,paintMat,0,.92,sp.l*.28,.28],[.42,.32,.25,M.glass,0,1.18,sp.l*.35],[.42,.16,.88,M.trim,0,.96,-.34]].forEach(a=>B(body,...a));add(body,G.h,M.hl,0,.86,sp.l*.46);
for(const wz of[sp.l*.34,-sp.l*.34]){const w=mkWh();w.pivot.scale.set(.55,.85,.85);w.pivot.position.set(0,.38,wz);body.add(w.pivot);wheels.push({...w,front:wz>0});}
return{root,body,paintMat,wheels};
}

const{l:L,w:W,h:Ht,style:st}=sp,tall=['suv','van','truck','swat','police_suv'].includes(st);
const ch=add(body,chassisGeo(sp),paintMat,0,0,0);ch.castShadow=ch.receiveShadow=true;B(body,W-.12,.18,L-.18,M.trim,0,.34,0);B(body,W*.88,.24,.18,M.trim,0,.46,-L*.502);
if(st==='super')for(const fx of[-.55,-.2,.2,.55])B(body,.06,.22,.22,M.trim,fx,.45,-L*.515);
if(st==='van')[[W*.88,.08,L*.72,M.rim,0,Ht+.04,-.2],[W*.76,.42,.14,M.trim,0,.78,L*.505],[W+.06,.24,L*.78,M.taxi,0,1.15,-.1]].forEach(a=>B(body,...a));
const lH=tall?Ht*.54:Ht*.56,cLen=['van','swat','truck'].includes(st)?L*.72:['suv','police_suv','limo'].includes(st)?L*.58:L*.44,cH=tall?Ht*.38:Ht*.36,cZ=st==='super'?-.22:-.14;
if(sp.openTop){B(body,W*.84,.44,.1,M.glass,0,lH+.24,L*.16,-.56);B(body,W*.78,.26,cLen*.9,M.leather,0,lH+.04,-.22);for(const sx of[-.42,.42])add(body,new Tor(.26,.045,6,12,P),M.rim,sx,lH+.14,-.88);}
else[[W*.93,cH*.9,cLen*.94,M.glass,0,lH+cH*.52,cZ],[W*.85,cH*1.1,.14,M.glass,0,lH+cH*.46,cZ+cLen*.58,-.78],[W*.84,cH*1.15,.16,M.glass,0,lH+cH*.52,cZ-cLen*.64,st==='super'?1.12:.68]].forEach(a=>B(body,...a));
if(sp.isPolice){
const pT=createPoliceLiveryTextures(),sw=st==='swat',pm=map=>pM({map,roughness:.2,metalness:.18,clearcoat:.92}),sMat=pm(sw?pT.swatSide:pT.side);
if(!sw){for(const sz of[.39,-.39])B(body,W+.04,lH*.42,L*.22,M.navy,0,.52,L*sz);B(body,W*.88,.07,cLen*.88,M.white,0,Ht+.03,cZ);add(body,new Plane(W*.52,lH*.4),pm(pT.rear),0,.72,-L*.514,0,P);}
const dG=new Plane(L*.62,lH*.72),bY=Ht+.12,gG=new Plane(5.6,5.6).rotateX(-H);
add(body,dG,sMat,W*.508,.44+lH*.36,.02,0,H);add(body,dG,sMat,-W*.508,.44+lH*.36,.02,0,-H);B(body,W*.76,.5,.24,M.trim,0,.62,L*.53);B(body,W*.68,.11,.32,M.trim,0,bY,cZ+.1);
sirens=[B(body,W*.3,.2,.34,bM('#ff2448'),-W*.17,bY+.11,cZ+.1),B(body,W*.3,.2,.34,bM('#2998ff'),W*.17,bY+.11,cZ+.1),flr(body,'#ff2b52',.88,3.2,3.2,-W*.17,bY+.11,cZ+.1),flr(body,'#38bdf8',.88,3.2,3.2,W*.17,bY+.11,cZ+.1),add(body,gG,trM('#ff2a55',.26,{map:SHARED_POOL_TEX,blending:ADD}),-1.1,.22,-.4),add(body,gG,trM('#38bdf8',.26,{map:SHARED_POOL_TEX,blending:ADD}),1.1,.22,-.4)];
}
if(sp.stripe&&st!=='van')B(body,.38,.04,L*.9,sM(sp.stripe,.3),0,Ht*.72,0);
if(sp.spoiler)[[W*.94,.07,.34,0,lH+.38],[.07,.3,.15,-W*.34,lH+.22],[.07,.3,.15,W*.34,lH+.22]].forEach(([a,b,c,x,y])=>B(body,a,b,c,M.trim,x,y,-L*.44));
if(sp.scoop)B(body,.58,.24,.82,M.rim,0,lH+.12,L*.24);if(sp.taxiSign)B(body,.76,.24,.28,M.taxi,0,Ht+.14,.05);
for(const sx of[-W*.34,W*.34]){add(body,G.h,M.hl,sx,.62,L*.51);add(body,G.tl,M.tl,sx,.74,-L*.516);C(body,.07,.07,.22,8,M.rim,sx*.68,.42,-L*.52,H);}
if(st==='super'||st==='coupe'){B(body,W*.86,.085,.07,M.tl,0,.75,-L*.518);for(const sx of[-W*.34,W*.34])flr(body,'#ff2b4a',.42,1.1,.5,sx,.75,-L*.54);}
nitroFlame=new Grp();nitroFlame.visible=false;
for(const sx of[-W*.23,W*.23]){add(nitroFlame,new Cone(.085,.78,10),M.fO,sx,.42,-L/2-.39,-H);add(nitroFlame,new Cone(.045,.46,8),M.fI,sx,.42,-L/2-.25,-H);flr(nitroFlame,'#ff8a24',.55,.65,.65,sx,.42,-L/2-.26);}
body.add(nitroFlame);
const wx=W*.495,zF=L*.31;for(const[x,z,front]of[[-wx,zF,1],[wx,zF,1],[-wx,-zF,0],[wx,-zF,0]]){const w=mkWh();w.pivot.position.set(x,.42,z);body.add(w.pivot);wheels.push({...w,front:!!front});}
return{root,body,paintMat,wheels,sirens,nitroFlame};
}

let vid=1;
export function spawnVehicle(sc,id,x,z,yaw,rng,o={}){
const spec=VEHICLES[id]||VEHICLES.brisa_sedan,color=o.color||pick(rng,spec.colors),rig=buildVehicleMesh(spec,color),y=o.y??(spec.isHeli?26:getGroundHeightAt(x,z));
rig.root.position.set(x,y,z);rig.root.rotation.y=yaw;sc.add(rig.root);
return{id:vid++,modelId:spec.id,spec,color,rig,x,y,z,vx:0,vy:0,vz:0,yaw,speed:o.speed||0,steer:0,drifting:false,nitro:100,nitroActive:false,health:o.health??spec.hp,maxHealth:spec.hp,destroyed:!!o.destroyed,burning:!!o.burning,driverType:o.driverType||'parked',siren:!!(o.siren||(spec.isPolice&&o.driverType==='police')),callsign:o.callsign||'',tactic:o.tactic||'',roadAxis:o.roadAxis||'z',roadDir:o.roadDir||1,upgrades:{engine:0,armor:0,handling:0},rollAngle:0,pitchAngle:0,airTime:0,spikeTimer:0,missionTag:o.missionTag||null};
}
export function repaintVehicle(v,c){v.color=c;v.rig.paintMat.color.set(c);}
export function removeVehicle(sc,l,v){sc.remove(v.rig.root);const i=l.indexOf(v);if(i>=0)l.splice(i,1);}

export function stepVehiclePhysics(v,c,w,fx,dt,el){
const sp=v.spec,rg=v.rig,sync=()=>{rg.root.position.set(v.x,v.y,v.z);rg.root.rotation.y=v.yaw;};
if(sp.isHeli){if(rg.mainRotor)rg.mainRotor.rotation.y+=dt*26;if(rg.tailRotor)rg.tailRotor.rotation.x+=dt*34;sync();if(rg.spotlightPool&&rg.spotlightCone){rg.spotlightPool.visible=rg.spotlightCone.visible;rg.spotlightPool.position.set(0,-v.y+.24,12.5);}return;}
if(rg.sirens){const r=floor(el*9+v.id)%2===0,a=v.siren&&!v.destroyed,[sR,sB,bR,bB,gR,gB]=rg.sirens;sR.visible=!a||r;sB.visible=!a||!r;bR.visible=gR.visible=a&&r;bB.visible=gB.visible=a&&!r;}
if(v.destroyed){v.speed*=max(0,1-dt*4);if(v.burning&&R()<.45)fx.spawnFireFlame(v.x,v.y+.9,v.z,1.1);return sync();}
const th=c.throttle||0,st=c.steer||0,hb=!!c.handbrake,bst=!!c.nitro&&v.nitro>4&&th>.1,eM=1+(v.upgrades?.engine||0)*.12,hM=1+(v.upgrades?.handling||0)*.12,maxS=sp.maxSpd*eM*(bst?1.28:1)*(v.spikeTimer>0?.52:1),acc=sp.accel*eM*(bst?1.45:1);
v.nitro=bst?max(0,v.nitro-dt*28):min(100,v.nitro+dt*11);v.nitroActive=bst;if(rg.nitroFlame){rg.nitroFlame.visible=bst;if(bst)rg.nitroFlame.scale.set(1,1,.85+R()*.35);}
if(v.spikeTimer>0)v.spikeTimer=max(0,v.spikeTimer-dt);
const fX=sin(v.yaw),fZ=cos(v.yaw),rX=-cos(v.yaw),rZ=sin(v.yaw);let fwd=v.vx*fX+v.vz*fZ,lat=v.vx*rX+v.vz*rZ;
fwd=th>.01?fwd+acc*th*dt:th<-.01?fwd+(fwd>2?-acc*1.45*dt:acc*.6*th*dt):fwd*max(0,1-dt*(sp.isBoat?1.2:1.55));
if(hb)fwd*=max(0,1-dt*2.1);fwd=cl(fwd,-maxS*.38,maxS);
const sR=min(1,abs(fwd)/14);v.steer=lp(v.steer,st*(hb?1.38:1),min(1,dt*10));v.yaw+=v.steer*sp.turn*hM*sR*(fwd>=-.5?1:-1)*dt;
lat*=max(0,1-dt*(sp.isBoat?2.4:hb?1.8:6.4*hM));
const nfX=sin(v.yaw),nfZ=cos(v.yaw),nrX=-cos(v.yaw),nrZ=sin(v.yaw);v.vx=nfX*fwd+nrX*lat;v.vz=nfZ*fwd+nrZ*lat;v.speed=hypot(v.vx,v.vz);v.drifting=!sp.isBoat&&abs(lat)>4.2&&v.speed>14;
const nx=cl(v.x+v.vx*dt,minX,maxX),nz=cl(v.z+v.vz*dt,minZ,maxZ),nW=isWaterAt(nx,nz);
if(sp.isBoat){if(nW||nx>shorelineX-6){v.x=nx;v.z=nz;}else{v.vx*=-.3;v.vz*=-.3;}v.y=-.15+sin(el*2.5+v.x*.08)*.18;if(v.speed>8&&R()<.5)fx.spawnDriftSmoke(v.x-nfX*2.6,.1,v.z-nfZ*2.6,1,.5);}
else{
if(nW&&v.y<1.2){v.vx*=-.45;v.vz*=-.45;}else{v.x=nx;v.z=nz;}
const col=resolveBuildingCollision(w,v.x,v.z,sp.w*.62);if(col.hit){v.x=col.x;v.z=col.z;if(v.speed>16)fx.spawnSparks(v.x,v.y+.8,v.z,8);v.vx*=.35;v.vz*=.35;}
const gy=getGroundHeightAt(v.x,v.z,w.ramps);
if(v.y>gy+.06||v.vy>.1){v.vy-=26*dt;v.y+=v.vy*dt;v.airTime+=dt;if(v.y<=gy){v.y=gy;v.vy=0;if(v.airTime>.45)fx.spawnSparks(v.x,v.y+.3,v.z,10);v.airTime=0;}}
else{if(gy-v.y>.08&&v.speed>20)v.vy=min(13,(gy-v.y)/max(dt,.016)*.52);v.y=gy;}
}
if(v.drifting&&!v.airTime){const bX=v.x-nfX*sp.l*.36,bZ=v.z-nfZ*sp.l*.36;if(R()<.65)for(const s of[-.85,.85])fx.spawnDriftSmoke(bX+nrX*s,v.y,bZ+nrZ*s,1,.38);if(R()<.65)for(const s of[-.82,.82])fx.addSkidmark(bX+nrX*s,v.y,bZ+nrZ*s,v.yaw);}
if(v.health<v.maxHealth*.35&&R()<.25)fx.spawnParticle(v.x+nfX*1.4,v.y+1.1,v.z+nfZ*1.4,0,2.2,0,.7,'#475569',.7,{opacity:.38,grow:2});
for(const wh of rg.wheels){wh.spin.rotation.x+=fwd/.42*dt;if(wh.front)wh.pivot.rotation.y=v.steer*.46;}
v.rollAngle=lp(v.rollAngle,cl(-v.steer*sR*(sp.isBike?.34:.085),-.35,.35),min(1,dt*8));v.pitchAngle=lp(v.pitchAngle,cl(-th*.035,-.05,.05),min(1,dt*8));
sync();rg.body.rotation.z=v.rollAngle;rg.body.rotation.x=v.pitchAngle;
}

export function resolveVehicleCollisions(vh,fx){
for(let i=0;i<vh.length;i++){
const a=vh[i];if(a.spec.isHeli)continue;
for(let j=i+1;j<vh.length;j++){
const b=vh[j];if(b.spec.isHeli)continue;
const dx=b.x-a.x,dz=b.z-a.z,mD=(a.spec.w+b.spec.w)*.56+.6,d2=dx*dx+dz*dz;
if(d2>.001&&d2<mD*mD){
const d=Math.sqrt(d2),nx=dx/d,nz=dz/d,ov=(mD-d)*.55;a.x-=nx*ov;a.z-=nz*ov;b.x+=nx*ov;b.z+=nz*ov;
const rel=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;
if(rel<0){const imp=-rel*.72;a.vx-=nx*imp;a.vz-=nz*imp;b.vx+=nx*imp;b.vz+=nz*imp;if(abs(rel)>10){fx.spawnSparks((a.x+b.x)/2,max(a.y,b.y)+.85,(a.z+b.z)/2,10);const dmg=min(28,abs(rel)*.45);for(const u of[a,b])if(!u.destroyed)u.health=max(5,u.health-dmg*(u.driverType==='player'?.35:.75));}}
}
}
}
}
