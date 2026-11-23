// Persistent 3-slot localStorage save/load manager with quick save/load (F5/F9).
import{SAVE_STORAGE_KEY}from'./config.js';
import{SIDE_ACTIVITIES}from'./activities-economy.js';
import{computeCompletionPercent}from'./crew-progression.js';
import{STORY_MISSIONS}from'./missions-story.js';
import{getDistrictAt}from'./world-city.js';

export function createSaveSystem(){
const mem=[null,null,null],R=Math.round;
const read=()=>{try{const p=JSON.parse(localStorage.getItem(SAVE_STORAGE_KEY)||'null');return Array.isArray(p)&&p.length===3?p:[...mem];}catch{return[...mem];}};
const write=s=>{for(let i=0;i<3;i++)mem[i]=s[i];try{localStorage.setItem(SAVE_STORAGE_KEY,JSON.stringify(s));}catch{}};

function saveSlot(i,st){
const{player:pl,missions:ms,activities:ac,audio:au,timeOfDay}=st,sl=read();
sl[i]={version:1,savedAt:'Today · 16:45',x:R(pl.x*10)/10,z:R(pl.z*10)/10,yaw:pl.yaw,cash:R(pl.cash),respect:R(pl.respect),health:R(pl.health),armor:R(pl.armor),weaponIndex:pl.weaponIndex,ammo:{...pl.ammo},stats:{...pl.stats},missionIndex:ms.missionIndex,stageIndex:ms.stageIndex,missionTitle:(STORY_MISSIONS[ms.missionIndex]||STORY_MISSIONS[0]).title,completedMissions:[...ms.completedIds],completedActivities:[...ac.completedIds],ownedProperties:[...ac.ownedProperties],relicsFound:ac.relicsFound,upgradeTiers:{...ac.upgradeTiers},radioIndex:au.state.stationIndex,timeOfDay,district:getDistrictAt(pl.x,pl.z).name,completion:computeCompletionPercent(ms,ac)};
write(sl);return sl[i];
}
function loadSlot(i,st){
const s=read()[i];if(!s)return false;const{player:pl,missions:ms,activities:ac,audio:au}=st;
if(pl.inVehicle&&pl.vehicle){pl.vehicle.driverType='parked';pl.inVehicle=false;pl.vehicle=null;}
Object.assign(pl,{x:s.x,z:s.z,yaw:s.yaw||0,cash:s.cash,respect:s.respect,health:s.health,armor:s.armor,weaponIndex:s.weaponIndex??2});
if(s.ammo)pl.ammo={...pl.ammo,...s.ammo};if(s.stats)pl.stats={...pl.stats,...s.stats};
Object.assign(ms,{missionIndex:s.missionIndex||0,stageIndex:s.stageIndex||0,completedIds:[...(s.completedMissions||[])]});
Object.assign(ac,{completedIds:[...(s.completedActivities||[])],ownedProperties:[...(s.ownedProperties||['prop_coral'])],relicsFound:s.relicsFound??3});
if(s.upgradeTiers)ac.upgradeTiers={...s.upgradeTiers};if(typeof s.radioIndex==='number')au.state.stationIndex=s.radioIndex;if(typeof s.timeOfDay==='number')st.timeOfDay=s.timeOfDay;return true;
}
function ensurePopulatedSlots(){
const sl=read();if(sl[0]&&sl[1]&&sl[2])return sl;
const aids=SIDE_ACTIVITIES.map(a=>a.id),mk=(savedAt,x,z,yaw,cash,respect,health,armor,wi,mi,si,mN,aN,props,rel,t,rI,tod,dist,comp)=>({version:1,savedAt,x,z,yaw,cash,respect,health,armor,weaponIndex:wi,missionIndex:mi,stageIndex:si,missionTitle:STORY_MISSIONS[mi].title,completedMissions:STORY_MISSIONS.slice(0,mN).map(m=>m.id),completedActivities:aids.slice(0,aN),ownedProperties:props,relicsFound:rel,upgradeTiers:{engine:t,armor:t,handling:t},radioIndex:rI,timeOfDay:tod,district:dist,completion:comp});
const defs=[mk('Active · 16:45',240,-120,0,142850,2150,100,88,2,5,1,5,14,['prop_coral','prop_isle','prop_mirage'],9,2,0,16.55,'Coral Promenade',61),mk('Yesterday · 19:20',0,-190,Math.PI,84200,1120,94,72,4,3,1,3,4,['prop_coral'],5,1,2,19.25,'Mirage Strip',26),mk('Archival · 13:45',640,-80,0,418500,4620,100,100,5,9,2,9,20,['prop_coral','prop_isle','prop_mirage','prop_docks'],11,3,0,13.8,'Starlight Isle',87)];
const m=sl.map((s,i)=>s||defs[i]);write(m);return m;
}
return{listSlots:read,saveSlot,loadSlot,ensurePopulatedSlots};
}
