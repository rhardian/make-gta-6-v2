// 10-Mission Multi-Stage Story Campaign ("Sun & Syndicate") with 3D beacons & crew comms.
import*as THREE from'three';
import{spawnPedestrian}from'./traffic-peds.js';
import{spawnVehicle}from'./vehicles.js';
import{getGroundHeightAt}from'./world-city.js';

const{hypot,cos,sin,max,min,PI}=Math;
const SP={r:['Rico Vega','WHEELMAN'],v:['Valeria "Val" Reyes','LEADER'],s:['Sora Chen','MECHANIC'],d:['Dante Morales','NETRUNNER'],e:['Elena Vance','SYNDICATE'],a:['Capt. Alvarez','SBPD']};
const TY=['waypoint','clear','enter_veh'],AC=['ACT I','ACT II','ACT III','ACT IV','ACT V','FINALE'];
const S=(obj,next,t,x,z,sp,msg,ex={})=>({obj,next:next||'Mission Complete',type:TY[t],x,z,speaker:SP[sp][0],role:SP[sp][1],msg,...ex});
const M=(id,a,title,rewardCash,rewardRespect,stages)=>({id,act:AC[a],title,rewardCash,rewardRespect,stages});

export const STORY_MISSIONS=[
M('m1_coral_boost',0,'Coral Drive Boost',15000,120,[
S('Boost Mako V12 GT on Ocean Palm Blvd','Evade patrol',2,235,-82,'r','Elena left her Mako V12 GT by Hotel Solaria. Grab it!'),
S('Race past Hotel Solaria to Pier','Deliver to Customs',0,240,118,'r','SBPD flagged the V12! Drift south to Starlight Pier!',{r:22,wanted:2}),
S('Deliver supercar to Solaria Customs','',0,102,-200,'s','Bay doors open at Solaria Customs—bring it in hot!',{r:22}),
]),
M('m2_harbor_wiretap',0,'Harbor Wiretap',22000,150,[
S('Drive to Cobre Docks Terminal','Clear guards',0,-120,260,'d','Syndicate manifest servers run out of Container Row.',{r:24}),
S('Eliminate Syndicate dock guards','Upload at Armory',1,-120,270,'v','Four lookouts guarding the crates—clearing the yard.',{count:4,wanted:2}),
S('Upload ledger at Brisa Armory','',0,-200,98,'d','Ledger decrypted—every bullion run is mapped!',{r:22}),
]),
M('m3_brisa_sweep',1,'Brisa Armory Sweep',28000,180,[
S('Intercept enforcers in Little Brisa','Drive east',1,-240,80,'s','Syndicate enforcers hit Brisa Armory. Shut them down!',{count:4}),
S('Drive through Solaria Downtown','Reach Penthouse',0,0,0,'v','Little Brisa clear. Pushing east with their hardware.',{r:24,wanted:3}),
S('Stash arsenal at Coral Penthouse','',0,214,-90,'r','SMGs and Carbines stocked for the Mirage vault hit!',{r:22}),
]),
M('m4_mirage_heist',1,'Mirage Vault Breach',42000,240,[
S('Breach armored convoy at Mirage Lounge','Eliminate escort',0,0,-205,'v','Boveda Bullion Van pinned on Mirage Strip. Moving in!',{r:26}),
S('Neutralize Syndicate escort & hold the avenue','Steal Aureo Cabrio & escape south',1,0,-215,'r','Armored escort is burning! Drop the Syndicate shooters and hijack that Aureo Cabrio for getaway!',{count:5,spawnVan:true,wanted:3}),
S('Escape 3-star pursuit to Solaria Customs','',0,102,-200,'s','Bearer bonds secured! Hit the spray booth to drop heat!',{r:24}),
]),
M('m5_palma_ledger',2,'Palma Villa Ledger',48000,260,[
S('Infiltrate Palma Vista compound','Clear guards',0,-240,-240,'d','Elena keeps offshore accounts in Palma Vista.',{r:24}),
S('Defeat Palma Vista security squad','Race to Meridian',1,-240,-250,'e','Playing with fire, Reyes! My squad will bury you!',{count:5,wanted:3}),
S('Deliver ledger to Meridian Plaza','',0,120,-120,'d','Got the ledger—now we track their bridge convoy.',{r:24}),
]),
M('m6_coral_takedown',2,'Coral Bay Takedown',65000,320,[
S('Intercept courier on Coral Promenade','Break roadblock',2,240,-140,'r','Courier turned onto Ocean Palm Blvd! Floor the Mako V12!'),
S('Smash past the SBPD roadblock & evade AIR-1 down Coral Promenade','Cross Solaria Arch Bridge to Starlight Isle',0,408,0,'r','AIR-1 locked spotlight on your roof and SBPD threw a spike roadblock ahead—drift left toward Solaria Arch Bridge!',{r:30,wanted:4}),
S('Lose 4-star lockdown at Starlight Villa','',0,640,-90,'s','Cleared the bridge at 240 km/h! Pull into Starlight Villa!',{r:26}),
]),
M('m7_pier_smuggle',3,'Sky-Ring Bay Run',74000,350,[
S('Board Corsair 380 beside Sky-Ring Pier','Collect drop',0,358,-80,'v','Offshore drop east of Sky-Ring Pier. Taking the boat!',{r:28}),
S('Cut past Starlight channel to buoy','Dock at Marina',0,430,165,'d','Harbor patrol pinged us—keep twin outboards open!',{r:30,wanted:3}),
S('Dock at Starlight Isle Yacht Slip','',0,560,120,'r','Clean drop! Syndicate shipping belongs to us.',{r:28}),
]),
M('m8_bridge_ambush',3,'Arch Bridge Convoy',86000,400,[
S('Reach crest of Solaria Arch Bridge','Clear blockade',0,408,0,'v','Elena is hauling reserve bullion across Arch Bridge.',{r:26}),
S('Eliminate Syndicate bridge strike team','Haul to Cobre',1,408,0,'a','All SBPD units: gunfire on Arch Bridge! Deploy SWAT!',{count:5,spawnVan:true,wanted:4}),
S('Deliver shipment to Cobre Customs','',0,-140,220,'s','Bullion van under the cranes—Elena is cornered!',{r:26}),
]),
M('m9_banco_blackout',4,'Banco Solaria Blackout',110000,480,[
S('Cut relays outside Banco Solaria','Clear guards',0,0,-40,'d','Looping Banco Solaria cameras now. Take the plaza!',{r:24}),
S('Defeat Banco Solaria defenders','Escape 5-star',1,0,-45,'v','Six armored guards down—vault codes uploaded!',{count:6,wanted:5}),
S('Outrun SWAT lockdown to Mirage Strip','',0,0,-260,'r','Five stars across Downtown and we took the bank!',{r:28}),
]),
M('m10_crown_solaria',5,'Crown of Solaria Bay',250000,800,[
S('Cross Arch Bridge to Elena Estate','Defeat garrison',0,640,80,'v','One last run, crew. Solaria Bay gets new management.',{r:26}),
S('Neutralize Starlight Isle garrison','Victory Lap',1,640,85,'e','Every soldier on the isle is converging on you!',{count:6,wanted:5}),
S('Return victorious to Coral Penthouse','Campaign Complete!',0,214,-90,'r','The whole coast is ours, Val! Legends of Solaria Bay!',{r:28}),
]),
];

export function createMissionDirector(scene){
const g=new THREE.Group(),r=new THREE.Mesh(new THREE.TorusGeometry(4.2,.28,8,32),new THREE.MeshBasicMaterial({color:'#fbbf24',transparent:true,opacity:.9}));r.rotation.x=PI/2;
const b=new THREE.Mesh(new THREE.CylinderGeometry(1.1,2.4,58,16,1,true),new THREE.MeshBasicMaterial({color:'#fbbf24',transparent:true,opacity:.14,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));
b.position.y=29;g.add(r,b);scene.add(g);const s=STORY_MISSIONS[0].stages[0];
return{missionIndex:0,stageIndex:0,completedIds:[],activeGuards:[],beaconGroup:g,bannerText:'',bannerTimer:0,comms:{speaker:s.speaker,role:s.role,text:s.msg,timer:14}};
}
export const getActiveMission=d=>STORY_MISSIONS[min(d.missionIndex,STORY_MISSIONS.length-1)];
export const getActiveStage=d=>{const m=getActiveMission(d);return m.stages[min(d.stageIndex,m.stages.length-1)];};

function spawnTargets(d,st,sc,vh,pd,rng){
d.activeGuards=[];if(st.type!=='clear')return;
for(let i=0,n=st.count||4;i<n;i++){const a=i/n*PI*2,g=spawnPedestrian(sc,st.x+cos(a)*11,st.z+sin(a)*11,rng,'syndicate',{aiming:true});pd.push(g);d.activeGuards.push(g);}
if(st.spawnVan)vh.push(spawnVehicle(sc,'boveda_armored',st.x,st.z,.2,rng,{driverType:'parked',missionTag:'bullion'}));
}
export function startMission(d,idx,sIdx,sc,vh,pd,rng){
d.missionIndex=max(0,min(STORY_MISSIONS.length-1,idx));d.stageIndex=sIdx||0;
const m=getActiveMission(d),st=getActiveStage(d);
d.comms={speaker:st.speaker,role:st.role,text:st.msg,timer:14};d.bannerText=`${m.act} · ${m.title}`;d.bannerTimer=3.5;spawnTargets(d,st,sc,vh,pd,rng);
}
export function updateMissionDirector(d,dt,el,sc,pl,vh,pd,wn,rng){
d.bannerTimer=max(0,d.bannerTimer-dt);d.comms.timer=max(0,d.comms.timer-dt);
const m=getActiveMission(d),st=getActiveStage(d);
d.beaconGroup.position.set(st.x,getGroundHeightAt(st.x,st.z)+.35,st.z);d.beaconGroup.rotation.y=el*1.4;
let done=st.type==='enter_veh'?pl.inVehicle:st.type==='waypoint'?hypot(pl.x-st.x,pl.z-st.z)<=(st.r||24):false;
if(st.type==='clear'){if(!d.activeGuards.length&&hypot(pl.x-st.x,pl.z-st.z)<75)spawnTargets(d,st,sc,vh,pd,rng);done=d.activeGuards.length>0&&d.activeGuards.every(g=>!g.alive);}
if(!done)return null;
if(st.wanted&&wn)wn.setWantedImmediate(max(wn.state.stars,st.wanted),pl.x,pl.z);
const next=()=>{const ns=getActiveStage(d);d.comms={speaker:ns.speaker,role:ns.role,text:ns.msg,timer:14};spawnTargets(d,ns,sc,vh,pd,rng);};
if(d.stageIndex+1<m.stages.length){d.stageIndex++;next();return{event:'stage',mission:m};}
if(!d.completedIds.includes(m.id))d.completedIds.push(m.id);
pl.cash+=m.rewardCash;pl.respect+=m.rewardRespect;pl.stats.missionsCompleted=d.completedIds.length;pl.stats.totalEarnings+=m.rewardCash;
d.bannerText=`MISSION PASSED · +$${m.rewardCash.toLocaleString()}`;d.bannerTimer=4.5;
if(d.missionIndex+1<STORY_MISSIONS.length){d.missionIndex++;d.stageIndex=0;next();}
return{event:'complete',mission:m};
}
