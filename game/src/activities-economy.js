// 24 Side Activities (6 Races, 6 Stunts, 4 Hideouts, 4 Exports, 4 Properties), 12 Relics & Economy.
import*as THREE from'three';
import{GARAGE_UPGRADES,WEAPONS}from'./config.js';
import{repaintVehicle}from'./vehicles.js';
import{getGroundHeightAt}from'./world-city.js';

const DN=['Coral Promenade','Mirage Strip','Solaria Downtown','Cobre Docks','Starlight Isle','Little Brisa','Palma Vista'];
const A=(id,kind,name,di,x,z,p,ex={})=>({id,kind,name,district:DN[di],x,z,...(kind==='Property'?{price:p,...ex}:{payout:p,...ex})});
export const SIDE_ACTIVITIES=[
...[['race_coral','Coral Promenade Sprint',0,240,-180,9500],['race_mirage','Mirage Circuit',1,0,-240,11000],['race_downtown','Downtown Apex Run',2,120,0,12500],['race_bridge','Arch Bridge Dash',0,300,0,14000],['race_docks','Cobre Drift Touge',3,-120,240,10500],['race_isle','Starlight Grand Prix',4,560,0,16000]].map(a=>A(a[0],'Race',...a.slice(1))),
...[['stunt_coral','Ocean Palm Launch',0,252,-245,4500],['stunt_pier','Sky-Ring Pier Leap',0,278,120,5000],['stunt_mirage','Mirage Neon Gap',1,0,-290,5500],['stunt_docks','Crane Jump',3,-120,290,5200],['stunt_downtown','Meridian Vault',2,120,60,5800],['stunt_isle','Starlight Flyover',4,560,-70,6200]].map(a=>A(a[0],'Stunt',...a.slice(1))),
...[['hide_docks','Cobre Container Yard',3,-240,280,15000],['hide_mirage','Mirage Alley Vault',1,-120,-300,18000],['hide_brisa','Brisa Rum Depot',5,-280,120,14500],['hide_palma','Palma Courtyard',6,-280,-180,17000]].map(a=>A(a[0],'Hideout',...a.slice(1))),
...[['exp_mako','Mako V12 GT',18000,'mako_v12'],['exp_cabrio','Aureo Cabrio',14000,'aureo_cabrio'],['exp_muscle','Tormenta V8',12000,'tormenta_muscle'],['exp_limo','Mirage VIP',16500,'mirage_limo']].map(([id,n,p,model])=>A(id,'Export',`Export: ${n}`,3,-140,330,p,{model})),
...[['prop_coral','Coral Penthouse',0,214,-90,35000,4000],['prop_isle','Starlight Villa',4,640,-90,65000,7500],['prop_mirage','Mirage Lounge',1,-22,-205,50000,6000],['prop_docks','Cobre Import Loft',3,-140,220,28000,3200]].map(([id,n,d,x,z,p,income])=>A(id,'Property',n,d,x,z,p,{income})),
];
const RELICS=[[260,-190],[260,-60],[260,75],[345,120],[26,-210],[0,-20],[120,-140],[-120,110],[-240,-110],[-200,260],[640,0],[728,-172]];
const PAINTS=['#f22248','#22d3ee','#fbbf24','#a855f7','#10b981','#f97316','#f8fafc'];

export function createActivitiesSystem(sc){
const g=new THREE.Group();sc.add(g);const geo=new THREE.OctahedronGeometry(.85,0),mat=new THREE.MeshBasicMaterial({color:'#fbbf24'});
const relics=RELICS.map(([x,z],i)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,getGroundHeightAt(x,z)+1.6,z);g.add(m);return{id:`relic_${i+1}`,x,z,collected:false,mesh:m};});
return{completedIds:['stunt_coral','race_coral','prop_coral'],ownedProperties:['prop_coral'],relics,relicsFound:3,passiveTimer:30,paintIndex:0,upgradeTiers:{engine:1,armor:1,handling:1}};
}
export function updateActivities(ac,dt,el,pl,fx){
ac.relics.forEach((r,i)=>{
if(r.collected)return;r.mesh.rotation.y=el*2.2+i;r.mesh.position.y=getGroundHeightAt(r.x,r.z)+1.55+Math.sin(el*3+i)*.25;
if(Math.hypot(pl.x-r.x,pl.z-r.z)<4.5){r.collected=true;r.mesh.visible=false;ac.relicsFound++;pl.cash+=3500;pl.respect+=45;pl.stats.totalEarnings+=3500;fx.spawnFloatingNumber(r.x,r.mesh.position.y+1.2,r.z,'SUNSET RELIC +$3,500','#fbbf24');}
});
if(pl.inVehicle&&pl.vehicle?.airTime>.52)for(const s of SIDE_ACTIVITIES)if(s.kind==='Stunt'&&!ac.completedIds.includes(s.id)&&Math.hypot(pl.x-s.x,pl.z-s.z)<26){
ac.completedIds.push(s.id);pl.cash+=s.payout;pl.respect+=65;pl.stats.stuntJumps++;pl.stats.activitiesCompleted=ac.completedIds.length;fx.spawnFloatingNumber(pl.x,pl.y+3.2,pl.z,`STUNT +$${s.payout}!`,'#22d3ee');
}
ac.passiveTimer-=dt;if(ac.passiveTimer<=0){ac.passiveTimer=45;const inc=ac.ownedProperties.reduce((s,id)=>s+(SIDE_ACTIVITIES.find(a=>a.id===id)?.income||0),0);if(inc>0){pl.cash+=inc;pl.stats.totalEarnings+=inc;}}
}
export function applyGarageOrShopPurchase(id,ac,pl,wn,vh){
const it=GARAGE_UPGRADES.find(g=>g.id===id);if(!it)return{ok:false,msg:'Unknown'};
const t=ac.upgradeTiers[id]||0;if(it.kind==='tier'&&t>=it.max)return{ok:false,msg:'Maxed!'};
const cost=it.kind==='tier'?it.cost*(t+1):it.cost;if(pl.cash<cost)return{ok:false,msg:'Need cash'};pl.cash-=cost;
if(id==='repair'){if(pl.vehicle)Object.assign(pl.vehicle,{health:pl.vehicle.maxHealth,destroyed:false,burning:false,spikeTimer:0});return{ok:true,msg:'Repaired!'};}
if(id==='respray'){ac.paintIndex=(ac.paintIndex+1)%PAINTS.length;if(pl.vehicle)repaintVehicle(pl.vehicle,PAINTS[ac.paintIndex]);wn?.clearHeat(5,vh);return{ok:true,msg:'Respray · Heat cleared!'};}
if(it.kind==='tier'){ac.upgradeTiers[id]=t+1;if(pl.vehicle){pl.vehicle.upgrades[id]=t+1;if(id==='armor')pl.vehicle.maxHealth=Math.round(pl.vehicle.spec.hp*(1+(t+1)*.25));}return{ok:true,msg:`${it.label} T${t+1}!`};}
if(id==='body_armor'){pl.armor=pl.maxArmor;pl.health=pl.maxHealth;return{ok:true,msg:'Vest refilled!'};}
if(id==='ammo_pack'){for(const w of WEAPONS)if(!w.inf)pl.ammo[w.id]=Math.max(pl.ammo[w.id]||0,w.ammo);return{ok:true,msg:'Arsenal restocked!'};}
if(id==='heavy_unlock'){pl.ammo.mirage_sniper=(pl.ammo.mirage_sniper||0)+40;pl.ammo.cobre_launcher=(pl.ammo.cobre_launcher||0)+10;return{ok:true,msg:'Heavy arms loaded!'};}
return{ok:true,msg:'Purchased!'};
}
export function buyProperty(id,ac,pl){
const p=SIDE_ACTIVITIES.find(a=>a.id===id&&a.kind==='Property');if(!p||ac.ownedProperties.includes(id)||pl.cash<p.price)return{ok:false,msg:'Unavailable'};
pl.cash-=p.price;ac.ownedProperties.push(id);if(!ac.completedIds.includes(id))ac.completedIds.push(id);pl.respect+=120;pl.stats.activitiesCompleted=ac.completedIds.length;return{ok:true,msg:`Purchased ${p.name}!`};
}
