// AAA HUD & rotated circular GPS Minimap renderer.
import{RADIO_STATIONS,SERVICE_POIS,WEAPONS,WORLD}from'./config.js';
import{CREW_ROSTER,getRespectRank}from'./crew-progression.js';
import{getActiveMission,getActiveStage,STORY_MISSIONS}from'./missions-story.js';
import{getDistrictAt,getStreetAt}from'./world-city.js';

const W_SVG={fists:'<rect x="7" y="4" width="14" height="7" rx="3"/>',viper_9mm:'<path d="M5 3h16v4H13l-2 5H7l1-5H5z"/>',stinger_smg:'<path d="M3 4h19v3h-5v5h-3V7H9l-1 4H5l1-4H3z"/>',coral_shotgun:'<path d="M2 5h23v2.5H13l-3 3.5H4l2-3.5H2z"/>',helios_carbine:'<path d="M2 5h7l2-2h7l1 2h7v2.5h-9l-1 4.5h-3l1-4.5H9l-3 3H2z"/>',mirage_sniper:'<path d="M1 6h8l2-3h6l1 3h9v2H16l-1 3h-3l1-3H8l-3 2.5H1z"/>',sol_grenade:'<circle cx="14" cy="8" r="4.5"/><rect x="12" y="1.5" width="4" height="2.5"/>',cobre_launcher:'<path d="M2 5h18l5 2-5 2H2z"/>'};
const AV={'Rico Vega':['#0c2740','#0284c7','#111827','#d89d76','#22d3ee'],'Valeria "Val" Reyes':['#3b0c1e','#e11d48','#18100e','#dfa680','#fbbf24'],'Sora Chen':['#0f2d2a','#14b8a6','#1f2937','#f0c4a8','#5eead4'],'Dante Morales':['#22143d','#7c3aed','#18181b','#c68963','#c084fc'],'Elena Vance':['#340b18','#9f1239','#f59e0b','#ecc0a2','#fb7185'],'Capt. Alvarez':['#0f172a','#1e3a8a','#475569','#c98e6a','#38bdf8']};
const av=s=>{const[b,j,h,k,a]=AV[s]||AV['Rico Vega'];return`<svg viewBox="0 0 44 44" width="44" height="44"><rect width="44" height="44" fill="${b}"/><circle cx="22" cy="18" r="10" fill="${h}"/><ellipse cx="22" cy="19" rx="8" ry="9" fill="${k}"/><rect x="15" y="16" width="14" height="3.2" rx="1.4" fill="#090d16"/><path d="M8 44c1-10 7-14 14-14s13 4 14 14z" fill="${j}"/><path d="M17 30l5 6 5-6" fill="none" stroke="${a}" stroke-width="2"/></svg>`;};
const D=(c,h='')=>`<div class="${c}">${h}</div>`,S=(c,h)=>`<span class="${c}">${h}</span>`,I=(id,c,h='')=>`<div id="h${id}" class="${c}">${h}</div>`,R=Math.round;
const clk=t=>`${String(Math.floor(((t%24)+24)%24)).padStart(2,'0')}:${String(Math.floor((t-Math.floor(t))*60)).padStart(2,'0')}`;
const bar=(l,v,c,p)=>D('vi',D('vl',`<span>${l}</span><span>${v}</span>`)+D('bt',`<div class="bf ${c}" style="width:${p}%"></div>`));

export function createHudManager(root){
root.innerHTML=D('tl',I('m','gc mc')+I('d','gc dc hidden'))+D('tr',I('w','gc wc')+I('v','gc vc')+I('wp','gc wb')+I('f','fr'))+I('b','bn hidden')+I('x','xh hidden',D('xd'))+D('bl',D('rs','<canvas id="minimap-canvas" width="174" height="174"></canvas>')+I('l','gc lp'))+D('bc',I('p','ap hidden')+I('c','gc cc hidden'))+D('br',I('s','gc sc')+I('r','gc rc'));
const q=s=>root.querySelector(s),el=Object.fromEntries(['m','d','w','v','wp','f','b','x','l','p','c','s','r'].map(k=>[k,q(`#h${k}`)])),mm=q('#minimap-canvas').getContext('2d');

function radar(st){
const{player:pl,vehicles:vh,missions:ms,cameraCtrl:cc}=st,c=87,yw=cc.yaw,P=(x,z)=>[-(x-pl.x)*.34,-(z-pl.z)*.34];
const rc=(a,b,e,d,col)=>{const[x1,y1]=P(e,d),[x2,y2]=P(a,b);mm.fillStyle=col;mm.fillRect(x1,y1,x2-x1,y2-y1);};
const dot=(x,y,r,col,sc)=>{mm.fillStyle=col;mm.beginPath();mm.arc(x,y,r,0,6.29);mm.fill();if(sc){mm.strokeStyle=sc;mm.lineWidth=1.5;mm.stroke();}};
const ln=(a,b,e,d)=>{mm.beginPath();mm.moveTo(...P(a,b));mm.lineTo(...P(e,d));mm.stroke();};
mm.clearRect(0,0,174,174);mm.save();mm.beginPath();mm.arc(c,c,85,0,6.29);mm.clip();mm.fillStyle='#0e668f';mm.fillRect(0,0,174,174);mm.translate(c,c);mm.rotate(yw);
for(const a of[[-410,-410,268,410,'#1e293b'],[268,-410,322,410,'#f1cc82'],[520,-210,760,210,'#1f4a3c'],[258,-11,558,11,'#ef4444'],[266,111,418,129,'#c28550']])rc(...a);
mm.strokeStyle='#64748b';mm.lineWidth=4;for(const ax of WORLD.avenuesX)ln(ax,-380,ax,380);for(const sz of WORLD.streetsZ)ln(-380,sz,254,sz);
const sg=getActiveStage(ms),[tx,ty]=P(sg.x,sg.z);
mm.strokeStyle='#fbbf24';mm.lineWidth=3;mm.setLineDash([5,3]);mm.beginPath();mm.moveTo(0,0);mm.lineTo(0,ty);mm.lineTo(tx,ty);mm.stroke();mm.setLineDash([]);
for(const p of SERVICE_POIS)dot(...P(p.x,p.z),3.2,p.color);dot(tx,ty,5.2,'#fbbf24','#090d16');
vh.forEach((v,i)=>{if(v.spec.isPolice&&!v.destroyed)dot(...P(v.x,v.z),v.spec.isHeli?4.6:3.5,v.spec.isHeli?'#22d3ee':i%2?'#3b82f6':'#ef4444');});
mm.restore();mm.fillStyle='#fff';mm.beginPath();mm.moveTo(c,c-7);mm.lineTo(c+5.5,c+6);mm.lineTo(c,c+3);mm.lineTo(c-5.5,c+6);mm.closePath();mm.fill();
const nx=c-Math.sin(yw)*74,ny=c+Math.cos(yw)*74;dot(nx,ny,8.5,'#090d16');
mm.fillStyle='#fbbf24';mm.font='800 10px sans-serif';mm.textAlign='center';mm.textBaseline='middle';mm.fillText('N',nx,ny+.5);
}

function update(st){
const{player:pl,missions:ms,wanted:wn,crew:cr,audio:au,timeOfDay:tod,elapsed:e}=st,ws=wn.state,inS=ws.inSight,stN=ws.stars,m=getActiveMission(ms),sg=getActiveStage(ms),u=wn.getActiveUnits(pl),blk=Math.floor(e*4)%2===0,tog=(k,ok)=>el[k].classList.toggle('hidden',!ok),sp=t=>`<span>${t}</span>`;
el.m.innerHTML=D('mk',sp(`MISSION ${ms.missionIndex+1} OF ${STORY_MISSIONS.length}`)+sp(m.act))+D('mt',m.title)+D('sb',m.stages.map((_,i)=>D(`sg ${i<ms.stageIndex?'done':i===ms.stageIndex?'active':''}`)).join(''))+D('mo',sg.obj)+D('mn',`<strong>NEXT:</strong> ${sg.next}`);
tog('d',stN>0&&u.length);if(stN>0&&u.length)el.d.innerHTML=D('dh',sp('<i class="dp"></i>SBPD TACTICAL DISPATCH')+sp(`${u.length} ACTIVE`))+D('dl',u.map(x=>D('dr',S('d1',x.callsign)+S('d2',`${x.dist}m`)+S(`db t-${x.badge}`,x.tactic))).join(''));
el.w.innerHTML=D('wt',S('wl','SBPD WANTED')+D('sr',[1,2,3,4,5].map(s=>S(`si ${s<=stN?(inS&&blk?'alert':'lit'):''}`,'★')).join('')))+(stN>0?D('sw',S(`st ${inS?'hot':'cool'}`,ws.jamTimer>0?'JAMMED':inS?'IN SIGHT':'EVADING')+D('bt',`<div class="bf ${inS?'bH':'bC'}" style="width:${R(ws.sightMeter)}%"></div>`)):'');
const rk=getRespectRank(pl.respect),hp=R(pl.health),ar=R(pl.armor);
el.v.innerHTML=D('vh',D('cv',`$${R(pl.cash).toLocaleString()}`)+D('cr',D('ck',clk(tod))+D('rk',`RANK ${rk.rank} · ${rk.title.toUpperCase()}`)))+D('vb',bar('HEALTH',hp,'bHp',hp)+bar('ARMOUR',ar,'bAr',ar));
el.wp.innerHTML=WEAPONS.map((w,i)=>`<div class="ws ${i===pl.weaponIndex?'active':''}" style="color:${i===pl.weaponIndex?'#fbbf24':'#cbd5e1'}">${S('wn',i+1)}<svg class="wi" fill="currentColor" viewBox="0 0 28 14">${W_SVG[w.id]||''}</svg>${S('wa',w.inf?'∞':pl.ammo[w.id]||0)}</div>`).join('');
el.f.innerHTML=CREW_ROSTER.map(c=>{const cd=Math.ceil(cr.cooldowns[c.id]||0);return D(`fp ${cd<=0?'ready':'cooling'}`,D('fk',`[${c.key}]`)+D('fn',c.short)+D('fs',cd<=0?'READY':`${cd}s`));}).join('');
el.l.innerHTML=D('ld',getDistrictAt(pl.x,pl.z).name)+D('ls',getStreetAt(pl.x,pl.z));radar(st);
const pr=!pl.inVehicle&&pl.nearbyVehicle?`${S('pk','F')}Steal ${pl.nearbyVehicle.spec.name}`:pl.nearbyPoi?`${S('pk','M')}Open ${pl.nearbyPoi.name}`:'';
tog('p',pr);if(pr)el.p.innerHTML=pr;
const cm=ms.comms;tog('c',cm?.timer>0);if(cm?.timer>0)el.c.innerHTML=D('ca',av(cm.speaker))+D('cb',D('cm',S('cn',cm.speaker)+S('co',cm.role))+D('ct',cm.text));
const v=pl.vehicle,wc=WEAPONS[pl.weaponIndex],cond=v?R(v.health/v.maxHealth*100):hp,nit=v?R(v.nitro):100;
el.s.innerHTML=D('sp',S('sn',R((v?v.speed:pl.speed)*3.6))+S('su','KM/H'))+D('vn',v?v.spec.name.toUpperCase():`ON FOOT · ${wc.name.toUpperCase()}`)+D('vb',bar(v?'CHASSIS':'STAMINA',`${cond}%`,'bCd',cond)+bar(v?'NITRO':'AMMO',v?`${nit}%`:wc.inf?'∞':pl.ammo[wc.id],'bNt',nit));
const rd=RADIO_STATIONS[au.state.stationIndex];el.r.innerHTML=S('rn',`♫ ${rd.name}`)+S('rt',rd.track);
tog('x',!pl.inVehicle);tog('b',ms.bannerTimer>0&&ms.bannerText);if(ms.bannerTimer>0&&ms.bannerText)el.b.textContent=ms.bannerText;
}
return{update};
}
