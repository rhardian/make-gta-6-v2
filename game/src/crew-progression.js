// Crew Favours ([Q/Z] Plate Swap, [E/X] Repair, [C] Jam), Respect Ranks & global completion.
import{SIDE_ACTIVITIES}from'./activities-economy.js';
import{STORY_MISSIONS}from'./missions-story.js';

export const RESPECT_RANKS=[
['I','Street Runner',0],['II','Coral Booster',150],['III','Dock Smuggler',350],['IV','Mirage Enforcer',600],
['V','Syndicate Breaker',950],['VI','Bay Captain',1400],['VII','Bay Kingpin',1900],['VIII','Solaria Boss',2600],
['IX','Coastal Baron',3400],['X','Solaria Legend',4500],
].map(([rank,title,min])=>({rank,title,min}));

export const CREW_ROSTER=[
['plate_swap','Q','Z','Plate Swap','PLATE SWAP','Rico Vega','Wheelman',35,'Drops Wanted Level by 2 stars & spoofs ALPR scanners.'],
['road_repair','E','X','Roadside Repair','REPAIR','Sora Chen','Chief Mechanic',30,'Restores vehicle armor, tires & nitro immediately.'],
['dispatch_jam','C','C','Dispatch Jam','JAM','Dante Morales','Netrunner',40,'Scrambles SBPD dispatch & kills AIR-1 spotlight 15s.'],
].map(([id,key,altKey,name,short,member,role,cooldown,desc])=>({id,key,altKey,name,short,member,role,cooldown,desc}));

export const createCrewProgression=()=>({cooldowns:{plate_swap:0,road_repair:0,dispatch_jam:0},lastNotice:'',noticeTimer:0});
export function updateCrewCooldowns(cr,dt){
cr.noticeTimer=Math.max(0,cr.noticeTimer-dt);
for(const id of Object.keys(cr.cooldowns))if(cr.cooldowns[id]>0)cr.cooldowns[id]=Math.max(0,cr.cooldowns[id]-dt);
}
export function triggerCrewFavour(id,cr,pl,wn,vh,ms,fx){
const def=CREW_ROSTER.find(c=>c.id===id);if(!def||(cr.cooldowns[id]||0)>0)return false;
cr.cooldowns[id]=def.cooldown;cr.lastNotice=`${def.member}: ${def.name} active!`;cr.noticeTimer=3.6;
const say=(sp,rl,tx,tag,col)=>{if(ms)ms.comms={speaker:sp,role:rl,text:tx,timer:7};fx?.spawnFloatingNumber(pl.x,pl.y+3,pl.z,tag,col);};
if(id==='plate_swap'){wn?.clearHeat(2,vh);say('Rico Vega','WHEELMAN','Cloned plates broadcast! SBPD lost your tag!','PLATE SWAP -2★','#34d399');}
else if(id==='road_repair'){if(pl.vehicle)Object.assign(pl.vehicle,{health:pl.vehicle.maxHealth,nitro:100,spikeTimer:0});else pl.armor=Math.min(pl.maxArmor,pl.armor+45);say('Sora Chen','MECHANIC','Nanoseal foam & nitro cycled—chassis at 100%!','CHASSIS 100%','#22d3ee');}
else if(id==='dispatch_jam'){if(wn){wn.state.jamTimer=15;wn.state.inSight=false;}say('Dante Morales','NETRUNNER','SBPD channel flooded & AIR-1 jammed for 15s!','SBPD JAMMED 15s','#a78bfa');}
return true;
}
export const getRespectRank=r=>RESPECT_RANKS.reduce((a,b)=>r>=b.min?b:a,RESPECT_RANKS[0]);
export const computeCompletionPercent=(m,a)=>Math.min(100,Math.round((m.completedIds.length+a.completedIds.length+a.relicsFound)/(STORY_MISSIONS.length+SIDE_ACTIVITIES.length+a.relics.length)*100));
