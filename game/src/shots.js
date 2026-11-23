// Deterministic live-WebGL screenshot staging for ?shot=chase|heist|map|title.
import*as THREE from'three';
import{setFixedCamera}from'./camera-controller.js';
import{startMission,STORY_MISSIONS}from'./missions-story.js';
import{animateCharacterRig,setCharacterWeapon}from'./player-onfoot.js';
import{spawnPedestrian}from'./traffic-peds.js';
import{removeVehicle,spawnVehicle,stepVehiclePhysics}from'./vehicles.js';

const V3=(x,y,z)=>new THREE.Vector3(x,y,z),P=Math.PI;
const clr=(sc,l,cx,cz,r)=>{for(let i=l.length-1;i>=0;i--)if(Math.hypot(l[i].x-cx,l[i].z-cz)<r)removeVehicle(sc,l,l[i]);};
const sync=(l,w,fx)=>l.forEach(v=>{
if(v.spec.isHeli)return stepVehiclePhysics(v,{},w,fx,.016,1.4);
const r=v.rig;r.root.position.set(v.x,v.y,v.z);r.root.rotation.y=v.yaw;r.body.rotation.z=v.rollAngle||0;
if(r.nitroFlame)r.nitroFlame.visible=!!v.nitroActive;if(r.sirens)r.sirens.forEach(s=>s.visible=true);
});

export function stageShowcaseShot(shot,st){
const{scene:sc,player:pl,vehicles:vh,pedestrians:pd,wanted:wn,missions:ms,activities:ac,effects:fx,cameraCtrl:cc,saveSystem:sv,world:w,rng}=st;
sv.ensurePopulatedSlots();
const addV=(m,x,z,y,o)=>{const v=spawnVehicle(sc,m,x,z,y,rng,o);vh.push(v);return v;};
const addCop=([m,x,z,y,callsign,tactic,speed=0])=>addV(m,x,z,y,{driverType:'police',siren:true,callsign,tactic,speed});
const addP=(x,z,role,o,spd=0,aim=false,ph=0)=>{const p=spawnPedestrian(sc,x,z,rng,role,o);animateCharacterRig(p.rig,spd,aim,ph,true);pd.push(p);return p;};

if(shot==='title'){
st.timeOfDay=13.8;st.mode='title';cc.mode='panorama';clr(sc,vh,240,-60,52);
[['mako_v12',235,-72,0,'#f22248',24],['aureo_cabrio',245,-34,P,'#fde047',18],['solaria_coupe',235,-18,0,'#22d3ee',20],['corsair_boat',356,-42,.25,'#22d3ee',22],['corsair_boat',392,46,-.45,'#f8fafc',18]].forEach(([m,x,z,y,color,speed])=>addV(m,x,z,y,{color,driverType:'traffic',speed}));
[[276,-86,'#ff5e78'],[286,-68,'#22d3ee'],[280,-40,'#fbbf24'],[292,-16,'#34d399'],[274,-104,'#a78bfa']].forEach(([x,z,jacket],i)=>addP(x,z,'civilian',{jacket},2,false,i));
sync(vh,w,fx);setFixedCamera(cc,[326,43,-162],[262,13,30],56);return'title';
}
if(shot==='map'){
st.timeOfDay=14.2;st.mode='atlas';ms.missionIndex=5;ms.stageIndex=1;ms.completedIds=STORY_MISSIONS.slice(0,5).map(m=>m.id);
ac.completedIds=['race_coral','race_mirage','race_downtown','race_bridge','stunt_coral','stunt_pier','stunt_mirage','hide_docks','hide_brisa','exp_mako','exp_cabrio','prop_coral','prop_isle','prop_mirage'];
ac.ownedProperties=['prop_coral','prop_isle','prop_mirage'];ac.relicsFound=9;Object.assign(pl,{x:240,z:-120,cash:142850,respect:2150});
setFixedCamera(cc,[310,40,-152],[250,14,24],54);return'atlas';
}
if(shot==='heist'){
st.timeOfDay=19.25;st.mode='play';startMission(ms,3,1,sc,vh,pd,rng);ms.completedIds=STORY_MISSIONS.slice(0,3).map(m=>m.id);ms.bannerTimer=0;
ms.comms={speaker:'Rico Vega',role:'WHEELMAN',timer:14,text:'Armored escort is burning! Drop the Syndicate shooters and hijack that Aureo Cabrio for getaway!'};
clr(sc,vh,0,-200,74);wn.clearRoadblocks();wn.state.units.length=0;
Object.assign(pl,{inVehicle:false,vehicle:null,x:-1.6,y:.16,z:-185,yaw:P-.08,aiming:true,weaponIndex:2,cash:96400,respect:1280,health:88,armor:74});
setCharacterWeapon(pl.rig,'stinger_smg');pl.rig.root.visible=true;pl.rig.root.position.set(pl.x,pl.y,pl.z);pl.rig.root.rotation.y=pl.yaw;animateCharacterRig(pl.rig,.2,true,.5,true);
pl.nearbyVehicle=addV('aureo_cabrio',4.3,-189.2,P+.36,{color:'#ff2b55'});addV('boveda_armored',-3.5,-206,.38,{color:'#8d9cb2',destroyed:true,burning:true});
wn.setWantedImmediate(3,pl.x,pl.z);wn.state.units.push(...[['sbpd_cruiser',6.8,-210.5,-.58,'SBPD-14','OPEN FIRE'],['sbpd_enforcer',-8.8,-220,.44,'SBPD-22','BOX IN'],['sbpd_swat',1.2,-231,.14,'SWAT-03','ROADBLOCK']].map(addCop));
const ps=[[-6.4,-190.5,'partner',P+.16,'Rico Vega'],[-.8,-199.5,'syndicate',.08],[3.2,-203,'syndicate',-.18],[-7.2,-203.5,'syndicate',.24],[4.4,-208.5,'police',-.22],[8.6,-207,'police',-.35]].map(([x,z,r,yaw,name])=>addP(x,z,r,{yaw,aiming:true,...(name?{name}:{})},0,true));
fx.spawnExplosion(-3.5,1.4,-206,.92);fx.spawnFireFlame(-3.3,2,-204.5,1.25);fx.spawnFireFlame(-2.4,1.6,-205.5,1.05);
[[pl.x-.34,1.46,pl.z-.92,'#ffe89e',.85],[ps[1].x,1.42,ps[1].z+.85,'#fb7185',.72],[ps[4].x,1.42,ps[4].z+.85,'#38bdf8',.72]].forEach(a=>fx.spawnMuzzleFlash(...a));
[[[pl.x-.34,1.46,pl.z-.95],[-.8,1.38,-199.4],'#fde047',.036],[[pl.x-.25,1.46,pl.z-1.08],[2.9,1.45,-202.8],'#fbbf24',.032],[[ps[0].x-.25,1.45,ps[0].z-.9],[-6.8,1.35,-203.3],'#22d3ee',.034],[[ps[2].x,1.42,ps[2].z+.8],[1.4,1.55,-188.5],'#fb7185',.032],[[ps[4].x,1.42,ps[4].z+.8],[.4,1.35,-192],'#38bdf8',.032]].forEach(([a,b,c,th])=>fx.spawnTracer(V3(...a),V3(...b),c,th,.3));
[[-.8,2.8,-199.5,'CRIT -68!','#fde047'],[3.4,2.75,-203,'-36','#fff'],[-4.2,4.7,-206,'CONVOY BREACHED +$1,500','#34d399']].forEach(a=>fx.spawnFloatingNumber(...a));
sync(vh,w,fx);cc.yaw=P;setFixedCamera(cc,[-2.95,2.35,-180],[.4,2.25,-208.5],54);return'play';
}

st.timeOfDay=16.55;st.mode='play';startMission(ms,5,1,sc,vh,pd,rng);ms.completedIds=STORY_MISSIONS.slice(0,5).map(m=>m.id);ms.bannerTimer=0;
ms.comms={speaker:'Rico Vega',role:'WHEELMAN',timer:14,text:'AIR-1 locked spotlight on your roof and SBPD threw a spike roadblock ahead—drift left toward Solaria Arch Bridge!'};
clr(sc,vh,240,-128,72);wn.clearRoadblocks();wn.state.units.length=0;
const hero=addV('mako_v12',240,-148.5,.12,{color:'#f22048',driverType:'player',speed:69});
Object.assign(hero,{steer:-.35,drifting:true,nitroActive:true,nitro:84,health:232,rollAngle:.06});
Object.assign(pl,{inVehicle:true,vehicle:hero,x:hero.x,y:hero.y,z:hero.z,yaw:hero.yaw,speed:69,cash:142850,respect:2150,health:96,armor:84});pl.rig.root.visible=false;
wn.setWantedImmediate(4,pl.x,pl.z);wn.state.units.push(...[['sbpd_cruiser',235.6,-145.8,.28,'SBPD-14','PIT MANEUVER',65],['sbpd_cruiser',244.5,-145.2,-.26,'SBPD-22','RAMMING',64],['sbpd_enforcer',234.4,-126,.24,'SBPD-31','FLANKING',52],['sbpd_swat',246.4,-106.5,-.68,'SWAT-03','BOX IN']].map(addCop));
wn.spawnRoadblock(240.5,-108,.05,vh);addV('corsair_boat',356,-72,.28,{color:'#22d3ee',driverType:'traffic',speed:24});
const heli=wn.ensureHeli(vh,pl.x,pl.z);Object.assign(heli,{x:243.5,y:22.8,z:-114,yaw:-2.88});
if(heli.rig.spotlightCone){heli.rig.spotlightCone.visible=true;heli.rig.spotlightCone.rotation.x=-.34;}
[[223.5,-142,'#ff5e78'],[224.2,-130,'#fbbf24'],[223,-118,'#22d3ee'],[224.8,-104,'#a78bfa'],[256.5,-142,'#34d399'],[258.5,-128,'#ff5e78'],[261,-114,'#fde047'],[274,-140,'#ff5e78'],[278,-122,'#fb923c'],[286,-108,'#22d3ee'],[280,-90,'#fde047']].forEach(([x,z,jacket],i)=>addP(x,z,'civilian',{jacket,yaw:x<240?P/2:-P/2},4.2,false,i*1.1));
for(let s=0;s<10;s++){const t=s*1.15;for(const o of[-.85,.85])fx.addSkidmark(hero.x+o-t*.12,.14,hero.z-1.8-t,.12);}
for(const o of[-.95,.85])fx.spawnDriftSmoke(hero.x+o,.24,hero.z-2.6,4,.7);
fx.spawnSparks(237.8,.65,-147.2,18,'#ff8c1a');fx.update(.05);
sync(vh,w,fx);cc.yaw=.08;setFixedCamera(cc,[239.4,4.15,-161.5],[243.4,3.1,-96],56);return'play';
}
