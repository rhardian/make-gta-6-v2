// 8-weapon combat & ballistics: hitscan, thin tracers, grenades, RPG-7X & explosions.
import*as THREE from'three';
import{WEAPONS}from'./config.js';
const{sin,cos,hypot,max,min,round,random:R}=Math,V3=(x,y,z)=>new THREE.Vector3(x,y,z);

export function createCombatSystem(scene,fx,audio){
const ord=[],pGeo=new THREE.SphereGeometry(.16,6,6),fn=(...a)=>fx.spawnFloatingNumber(...a),sp=(...a)=>fx.spawnSparks(...a);
const kill=(p,pl)=>{p.alive=false;if(pl){pl.cash+=p.cashDrop;pl.stats.eliminations++;pl.stats.totalEarnings+=p.cashDrop;}};

function damageVehicle(v,dmg,vh,pd,pl){
if(v.destroyed)return;v.health-=dmg;
if(v.health<=0){
v.health=0;v.destroyed=v.burning=true;fx.spawnExplosion(v.x,v.y+.6,v.z,1.3);
fn(v.x,v.y+3.2,v.z,'VEHICLE DESTROYED!','#fb923c');audio?.playExplosion();
for(const p of pd)if(p.alive&&p.role!=='partner'&&hypot(p.x-v.x,p.z-v.z)<12){p.health=0;kill(p,pl);}
}
}
function detonateAt(x,y,z,rad,dmg,vh,pd,pl,wn){
fx.spawnExplosion(x,y,z,rad/10);audio?.playExplosion();
for(const p of pd){
if(!p.alive||p.role==='partner')continue;const d=hypot(p.x-x,p.z-z);
if(d<rad){const h=round(dmg*(1-d/rad));p.health-=h;fn(p.x,p.y+2.3,p.z,`-${h}`,'#ff5e78');if(p.health<=0){kill(p,pl);if(p.role==='police'&&wn)wn.addHeat(1.8,p.x,p.z);}}
}
for(const v of vh){const d=hypot(v.x-x,v.z-z);if(!v.destroyed&&!v.spec.isHeli&&d<rad)damageVehicle(v,dmg*(1-d/rad)*1.4,vh,pd,pl);}
}
function firePlayerWeapon(pl,yaw,pit,vh,pd,wn,rng){
const w=WEAPONS[pl.weaponIndex];if(pl.fireCooldown>0||(!w.inf&&(pl.ammo[w.id]||0)<=0))return false;
pl.fireCooldown=w.cd;if(!w.inf)pl.ammo[w.id]--;
const mx=pl.x+sin(yaw)*.9,my=pl.y+(pl.inVehicle?1.3:1.42),mz=pl.z+cos(yaw)*.9;
if(w.id==='fists'){
for(const p of pd)if(p.alive&&p.role!=='partner'&&hypot(p.x-pl.x,p.z-pl.z)<w.range){
p.health-=w.dmg;fn(p.x,p.y+2.1,p.z,`-${w.dmg}`,'#fde047');if(p.health<=0)kill(p,pl);wn?.addHeat(.6,p.x,p.z);break;
}
return true;
}
audio?.playGunshot(w.id);fx.spawnMuzzleFlash(mx,my,mz,w.color,.78);
for(const p of pd)if(p.alive&&p.role==='civilian'&&hypot(p.x-pl.x,p.z-pl.z)<46)p.panicTimer=6.5;
if(w.explosive){
const m=new THREE.Mesh(pGeo,new THREE.MeshBasicMaterial({color:w.color}));m.position.set(mx,my,mz);scene.add(m);
const s=w.id==='cobre_launcher'?58:26;
ord.push({m,x:mx,y:my,z:mz,vx:sin(yaw)*cos(pit)*s,vy:sin(pit)*s+(w.id==='sol_grenade'?6.5:.6),vz:cos(yaw)*cos(pit)*s,g:w.id==='sol_grenade'?18:1.2,dmg:w.dmg,rad:w.radius,life:2.8,col:w.color});
wn?.addHeat(1.4,pl.x,pl.z);return true;
}
for(let k=0;k<w.pellets;k++){
const sy=yaw+(rng()-.5)*w.spread,pA=pit+(rng()-.5)*w.spread*.6,dx=sin(sy)*cos(pA),dy=sin(pA),dz=cos(sy)*cos(pA);
let bT=w.range,hP=null,hV=null;
for(const p of pd){if(!p.alive||p.role==='partner')continue;const ox=p.x-mx,oy=p.y+1.15-my,oz=p.z-mz,pr=ox*dx+oy*dy+oz*dz;if(pr>0&&pr<bT&&(ox-dx*pr)**2+(oy-dy*pr)**2+(oz-dz*pr)**2<1.15){bT=pr;hP=p;hV=null;}}
for(const v of vh){if(v===pl.vehicle||v.destroyed||v.spec.isHeli)continue;const ox=v.x-mx,oz=v.z-mz,pr=ox*dx+oz*dz;if(pr>0&&pr<bT&&(ox-dx*pr)**2+(oz-dz*pr)**2<(v.spec.w*.72)**2){bT=pr;hV=v;hP=null;}}
const end=V3(mx+dx*bT,max(.2,my+dy*bT),mz+dz*bT);fx.spawnTracer(V3(mx,my,mz),end,w.color,.032,.13);
if(hP){
const cr=rng()<.28,d=round(w.dmg*(cr?1.65:1));hP.health-=d;sp(end.x,end.y,end.z,5,'#ff8c1a');
fn(hP.x,hP.y+2.25,hP.z,cr?`CRIT -${d}!`:`-${d}`,cr?'#fde047':'#fff');
if(hP.health<=0){kill(hP,pl);pl.respect+=hP.role==='syndicate'?25:10;fn(hP.x,hP.y+2.8,hP.z,`+$${hP.cashDrop}`,'#34d399');}
wn?.addHeat(hP.role==='police'?1.5:.45,hP.x,hP.z);
}else if(hV){sp(end.x,end.y,end.z,6,'#ff8c1a');damageVehicle(hV,w.dmg*.85,vh,pd,pl);if(wn&&hV.spec.isPolice)wn.addHeat(.85,hV.x,hV.z);}
}
return true;
}
function fireNpcShot(n,pl){
const s=V3(n.x+sin(n.yaw)*.8,n.y+1.4,n.z+cos(n.yaw)*.8),col=n.role==='police'?'#38bdf8':'#fb7185';
fx.spawnMuzzleFlash(s.x,s.y,s.z,col,.72);fx.spawnTracer(s,V3(pl.x+(R()-.5)*1.6,pl.y+1.2+(R()-.5)*.6,pl.z+(R()-.5)*1.6),col,.03,.14);
if(R()<(pl.inVehicle?.22:.34)){const d=n.role==='syndicate'?7:6,a=min(pl.armor,d*.7);pl.armor-=a;pl.health=max(10,pl.health-(d-a));}
}
function firePartnerShot(p,t){
const s=V3(p.x+sin(p.yaw)*.8,p.y+1.4,p.z+cos(p.yaw)*.8);
fx.spawnMuzzleFlash(s.x,s.y,s.z,'#38bdf8',.72);fx.spawnTracer(s,V3(t.x,t.y+1.2,t.z),'#22d3ee',.03,.14);
t.health-=18;if(t.health<=0)t.alive=false;
}
function update(dt,pl,vh,pd,wn){
pl.fireCooldown=max(0,pl.fireCooldown-dt);
for(let i=ord.length-1;i>=0;i--){
const o=ord[i];o.life-=dt;o.vy-=o.g*dt;o.x+=o.vx*dt;o.y+=o.vy*dt;o.z+=o.vz*dt;
o.m.position.set(o.x,o.y,o.z);fx.spawnParticle(o.x,o.y,o.z,0,.6,0,.3,o.col,.2,{additive:true});
if(o.life<=0||o.y<=.3||vh.some(v=>v!==pl.vehicle&&!v.spec.isHeli&&hypot(v.x-o.x,v.z-o.z)<2.8)){detonateAt(o.x,max(.4,o.y),o.z,o.rad,o.dmg,vh,pd,pl,wn);scene.remove(o.m);o.m.material.dispose();ord.splice(i,1);}
}
}
return{firePlayerWeapon,fireNpcShot,firePartnerShot,damageVehicle,detonateAt,update};
}
