// 5-Star SBPD Tactical Dispatch AI: pursuit, PIT, ramming, roadblocks, spike strips & AIR-1 heli.
import*as THREE from'three';
import{WANTED_TIERS}from'./config.js';
import{spawnPedestrian}from'./traffic-peds.js';
import{removeVehicle,spawnVehicle,stepVehiclePhysics}from'./vehicles.js';
import{getGroundHeightAt}from'./world-city.js';

const CS=['SBPD-14','SBPD-22','SBPD-07','SWAT-03','SBPD-31','SBPD-44'];
const TC=['RAMMING','PIT MANEUVER','BOX IN','FLANKING','ROADBLOCK','OPEN FIRE'];
const BG={RAMMING:'RAMMING','PIT MANEUVER':'PIT',ROADBLOCK:'ROADBLOCK','BOX IN':'BOX','OPEN FIRE':'FIRE',FLANKING:'FLANK'};
const{Group,Mesh,BoxGeometry:Box,ConeGeometry:Cone,MeshStandardMaterial:Std,MeshBasicMaterial:Bas,MathUtils:MU}=THREE;
const{sin,cos,min,max,hypot,atan2,round,PI:P}=Math;

export function createPoliceDispatch(scene,rng){
const pg=new Group();scene.add(pg);
const st={stars:0,heat:0,inSight:false,sightMeter:0,cooldownTimer:0,jamTimer:0,lastKnownX:240,lastKnownZ:-80,units:[],roadblocks:[],heli:null,spawnTimer:0,dispatchLog:[]};
const bM=new Std({color:'#f97316',roughness:.55}),sM=new Bas({color:'#f8fafc'}),kM=new Std({color:'#e2e8f0',metalness:.85,roughness:.22});
const mk=(p,g,m,x,y,z)=>{const o=new Mesh(g,m);o.position.set(x,y,z);p.add(o);return o;};

const setSight=(x,z)=>{st.inSight=st.stars>0;st.sightMeter=st.stars>0?100:0;st.cooldownTimer=WANTED_TIERS[st.stars].cooldown;if(x!==undefined){st.lastKnownX=x;st.lastKnownZ=z;}};
const addHeat=(a,x,z)=>{st.heat=min(5,st.heat+(st.jamTimer>0?a*.25:a));st.stars=max(st.stars,min(5,Math.floor(st.heat+1e-3)));setSight(x,z);};
const setWantedImmediate=(s,x,z)=>{st.stars=st.heat=max(0,min(5,s));setSight(x,z);};
const clearRoadblocks=()=>{while(pg.children.length)pg.remove(pg.children[0]);st.roadblocks.length=0;};
function clearHeat(d=5,vh=[]){
st.stars=st.heat=max(0,st.stars-d);
if(!st.stars){st.inSight=false;st.sightMeter=0;clearRoadblocks();if(st.heli){removeVehicle(scene,vh,st.heli);st.heli=null;}for(const u of st.units){u.siren=false;u.driverType='traffic';}st.units.length=0;}
}
function spawnRoadblock(x,z,yaw,vh){
const g=new Group();g.position.set(x,getGroundHeightAt(x,z),z);g.rotation.y=yaw;
for(const sx of[-5.2,5.2]){mk(g,new Box(3.8,1.15,.55),bM,sx,.62,0).castShadow=true;mk(g,new Box(3.84,.28,.58),sM,sx,.84,0);}
mk(g,new Box(5.6,.12,.72),kM,0,.08,0);for(let t=-2.4;t<=2.4;t+=.6)mk(g,new Cone(.1,.34,4),kM,t,.24,0);
pg.add(g);const rb={x,z,yaw,mesh:g,triggered:false};st.roadblocks.push(rb);
if(vh){const c=spawnVehicle(scene,'sbpd_cruiser',x-cos(yaw)*5.8,z+sin(yaw)*5.8,yaw+P*.42,rng,{driverType:'police',siren:true,callsign:'SBPD-07',tactic:'ROADBLOCK'});vh.push(c);st.units.push(c);}
return rb;
}
function ensureHeli(vh,px,pz){
if(st.heli)return st.heli;
const h=spawnVehicle(scene,'sbpd_air1',px+18,pz+32,P,rng,{y:26,driverType:'police',siren:true,callsign:'AIR-1',tactic:'SPOTLIGHT'});
vh.push(h);return(st.heli=h);
}
function update(dt,el,pl,vh,pd,w,fx){
if(st.jamTimer>0)st.jamTimer=max(0,st.jamTimer-dt);if(st.stars<=0)return;
const tier=WANTED_TIERS[st.stars];
for(let i=st.units.length-1;i>=0;i--)if(st.units[i].destroyed||st.units[i].driverType==='player')st.units.splice(i,1);
st.spawnTimer-=dt;
if(st.units.length<tier.maxUnits&&st.spawnTimer<=0){
st.spawnTimer=3.2;const i=st.units.length,ang=pl.yaw+(i%2?-.35:.35)+(i>2?P:0);
const sx=MU.clamp(pl.x+sin(ang)*(56+i*14),-350,248),sz=MU.clamp(pl.z+cos(ang)*(56+i*14),-350,350);
const u=spawnVehicle(scene,tier.swat&&i%3===2?'sbpd_swat':i%2?'sbpd_enforcer':'sbpd_cruiser',sx,sz,atan2(pl.x-sx,pl.z-sz),rng,{driverType:'police',siren:true,callsign:CS[i%6],tactic:TC[i%6]});
vh.push(u);st.units.push(u);
if(!pl.inVehicle&&pd.filter(p=>p.alive&&p.role==='police').length<4)pd.push(spawnPedestrian(scene,sx+3,sz+2,rng,'police',{aiming:true}));
}
if(tier.chopper){
const h=ensureHeli(vh,pl.x,pl.z),a=el*.48;h.x=MU.lerp(h.x,pl.x+cos(a)*18,min(1,dt*1.4));h.z=MU.lerp(h.z,pl.z+sin(a)*24+14,min(1,dt*1.4));
h.y=25+sin(el*1.6)*1.5;h.yaw=atan2(pl.x-h.x,pl.z-h.z);if(h.rig.spotlightCone)h.rig.spotlightCone.visible=st.jamTimer<=0;stepVehiclePhysics(h,{},w,fx,dt,el);
}
let closest=Infinity;const pfx=sin(pl.yaw),pfz=cos(pl.yaw);
st.units.forEach((u,i)=>{
const d=hypot(pl.x-u.x,pl.z-u.z);if(d<closest)closest=d;
if(u.tactic==='ROADBLOCK'&&d>24)return stepVehiclePhysics(u,{handbrake:true},w,fx,dt,el);
let tx=pl.x,tz=pl.z;
if(u.tactic==='PIT MANEUVER'){tx-=pfx*3.5-pfz*2.4;tz-=pfz*3.5+pfx*2.4;}
else if(u.tactic==='FLANKING'||u.tactic==='BOX IN'){const s=i%2?-1:1;tx+=pfx*12+pfz*5.2*s;tz+=pfz*12-pfx*5.2*s;}
let yd=atan2(tx-u.x,tz-u.z)-u.yaw;while(yd>P)yd-=P*2;while(yd<-P)yd+=P*2;
stepVehiclePhysics(u,{throttle:d<9&&!pl.inVehicle?0:.96,steer:MU.clamp(yd*1.85,-1,1),nitro:d>36&&d<95},w,fx,dt,el);
});
if(pl.inVehicle&&pl.vehicle)for(const rb of st.roadblocks)if(!rb.triggered&&hypot(pl.x-rb.x,pl.z-rb.z)<4.2){rb.triggered=true;pl.vehicle.spikeTimer=4.5;fx.spawnSparks(pl.x,pl.y+.3,pl.z,16,'#38bdf8');fx.spawnFloatingNumber(pl.x,pl.y+2.5,pl.z,'SPIKE STRIP HIT!','#f87171');}
const spot=st.jamTimer<=0&&(closest<85||(st.heli&&hypot(pl.x-st.heli.x,pl.z-st.heli.z)<95));st.inSight=spot;
if(spot){st.sightMeter=min(100,st.sightMeter+dt*35);st.cooldownTimer=tier.cooldown;st.lastKnownX=pl.x;st.lastKnownZ=pl.z;}
else{st.sightMeter=max(0,st.sightMeter-dt*14);st.cooldownTimer-=dt;if(st.cooldownTimer<=0){pl.stats.copsEvaded++;pl.respect+=st.stars*35;clearHeat(5,vh);}}
}
function getActiveUnits(pl){
if(st.stars<=0)return[];
const l=st.heli?[{callsign:'AIR-1',dist:round(hypot(st.heli.x-pl.x,st.heli.z-pl.z)),tactic:st.jamTimer>0?'JAMMED':'SPOTLIGHT',badge:'SPOTLIGHT'}]:[];
st.units.forEach((u,i)=>l.push({callsign:u.callsign||CS[i%6],dist:round(hypot(u.x-pl.x,u.z-pl.z)),tactic:u.tactic||'RAMMING',badge:BG[u.tactic]||'RAMMING'}));
return l.sort((a,b)=>a.callsign==='AIR-1'?-1:b.callsign==='AIR-1'?1:a.dist-b.dist).slice(0,6);
}
return{state:st,addHeat,setWantedImmediate,clearHeat,clearRoadblocks,spawnRoadblock,ensureHeli,update,getActiveUnits};
}
