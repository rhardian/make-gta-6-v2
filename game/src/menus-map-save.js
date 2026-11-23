// Title Screen & Tactical Atlas (7-district vector map, M1-M10 pills, completion donut, saves).
import{DISTRICTS,GARAGE_UPGRADES,SERVICE_POIS,VEHICLES,WEAPONS,WORLD}from'./config.js';
import{applyGarageOrShopPurchase,buyProperty,SIDE_ACTIVITIES}from'./activities-economy.js';
import{computeCompletionPercent,CREW_ROSTER,getRespectRank,triggerCrewFavour}from'./crew-progression.js';
import{getActiveStage,startMission,STORY_MISSIONS}from'./missions-story.js';
import{getDistrictAt}from'./world-city.js';

const TABS=['MAP','MISSIONS','STATS','GARAGE','CREW','SETTINGS','SAVE'];
const LOGO='<svg viewBox="0 0 470 128" width="460" height="124"><defs><linearGradient id="sG" x2="0" y2="1"><stop offset="0%" stop-color="#fff8c8"/><stop offset="48%" stop-color="#ff9b3d"/><stop offset="100%" stop-color="#ff3366"/></linearGradient><linearGradient id="cG" x2="0" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="38%" stop-color="#fff0cc"/><stop offset="52%" stop-color="#f59e0b"/><stop offset="68%" stop-color="#ff5e78"/><stop offset="100%" stop-color="#ffd166"/></linearGradient><filter id="sh"><feDropShadow dy="4" stdDeviation="5" flood-color="#071226" flood-opacity=".72"/></filter></defs><circle cx="58" cy="58" r="42" fill="url(#sG)" opacity=".96"/><path d="M14 61h88v4H14zm4 10h80v4H18zm6 10h68v4H24z" fill="#0c2648" opacity=".62"/><g font-family="Segoe UI,Impact,sans-serif" font-weight="900" stroke="#0b1528" paint-order="stroke" filter="url(#sh)"><text x="16" y="70" font-size="58" letter-spacing="3.5" fill="url(#cG)" stroke-width="3">SOLARIA BAY</text><text x="20" y="112" font-size="23" letter-spacing="9.5" fill="#fffdf5" stroke-width="2">SUN &amp; SYNDICATE</text></g><rect x="18" y="82" width="424" height="3.5" rx="2" fill="url(#sG)"/></svg>';
const donut=p=>`<svg viewBox="0 0 64 64" width="62" height="62"><defs><linearGradient id="dg" x2="1" y2="1"><stop offset="0%" stop-color="#22d3ee"/><stop offset="55%" stop-color="#34d399"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient></defs><g fill="none" stroke-width="6.5"><circle cx="32" cy="32" r="26" stroke="#fff2"/><circle cx="32" cy="32" r="26" stroke="url(#dg)" stroke-linecap="round" stroke-dasharray="163.4" stroke-dashoffset="${(163.4*(1-p/100)).toFixed(1)}" transform="rotate(-90 32 32)"/></g><g text-anchor="middle"><text x="32" y="34" fill="#fff" font-size="14" font-weight="900">${p}%</text><text x="32" y="45" fill="#fbbf24" font-size="6.4" font-weight="800" letter-spacing=".6">COMPLETE</text></g></svg>`;
const D=(c,h)=>`<div class="${c}">${h}</div>`,S=(c,h)=>`<span class="${c}">${h}</span>`,B=(c,a,h)=>`<button class="${c}" ${a}>${h}</button>`,SP=h=>`<span>${h}</span>`;
const lr=(l,r,c='')=>D(`lr ${c}`,l+r),ub=(a,l,r)=>B('ub',a,SP(l)+S('uc',r)),pan=(t1,c1,t2,c2)=>D('gc af',`<div>${D('at2',t1)}${c1}</div><div>${D('at2',t2)}${c2}</div>`),$=n=>`$${Math.round(n).toLocaleString()}`;

export function createMenuManager(root,act){
let tab='MAP',note='';

function drawMap(cv,st){
const x=cv.getContext('2d'),w=cv.width,h=cv.height,T=6.29,P=(a,b)=>[(a+430)/1240*w,(b+430)/860*h];
const rc=(a,b,c,d,f,s)=>{const[x1,y1]=P(a,b),[x2,y2]=P(c,d);x.fillStyle=f;x.fillRect(x1,y1,x2-x1,y2-y1);if(s){x.strokeStyle=s;x.lineWidth=1.2;x.strokeRect(x1,y1,x2-x1,y2-y1);}};
const ln=(a,b,c,d,col,lw,ds=[])=>{x.strokeStyle=col;x.lineWidth=lw;x.setLineDash(ds);x.beginPath();x.moveTo(...P(a,b));x.lineTo(...P(c,d));x.stroke();x.setLineDash([]);};
const cir=(cx,cy,r,f,s,lw=1.4)=>{x.beginPath();x.arc(cx,cy,r,0,T);if(f){x.fillStyle=f;x.fill();}if(s){x.strokeStyle=s;x.lineWidth=lw;x.stroke();}};
const rr=(a,b,W,H,r,f,s,lw=1)=>{x.beginPath();x.roundRect(a,b,W,H,r);if(f){x.fillStyle=f;x.fill();}if(s){x.strokeStyle=s;x.lineWidth=lw;x.stroke();}};
const sea=x.createLinearGradient(0,0,w,h);sea.addColorStop(0,'#094170');sea.addColorStop(.5,'#0e749b');sea.addColorStop(1,'#084c75');x.fillStyle=sea;x.fillRect(0,0,w,h);
for(const[ox,f]of[[34,'#22d3ee2e'],[14,'#38bdf838'],[0,'#f3ce84']]){x.beginPath();x.moveTo(...P(-412,-412));x.lineTo(...P(296+ox,-412));for(const[a,b]of[[322,-280],[336,-150],[324,0],[338,130],[318,280],[302,412]])x.lineTo(...P(a+ox,b));x.lineTo(...P(-412,412));x.closePath();x.fillStyle=f;x.fill();}
rc(-412,-412,272,412,'#1b2638');
for(const[p,f]of[[28,'#22d3ee33'],[0,'#f3ce84'],[-12,'#1d5444']]){const[a,b]=P(512-p,-218-p),[c,d]=P(768+p,218+p);rr(a,b,c-a,d-b,24+p*.3,f);}
for(const d of DISTRICTS)rc(d.minX,d.minZ,d.maxX,d.maxZ,d.color+'20',d.color+'66');
for(const[px,pz,pw,pd]of[[-300,-180,74,72],[60,-60,72,72],[-180,60,72,72],[180,-180,62,68],[640,-10,96,132]]){rc(px-pw/2,pz-pd/2,px+pw/2,pz+pd/2,'#1f6f4c','#34d39988');const[cx,cy]=P(px,pz);x.fillStyle='#38bdf866';x.beginPath();x.ellipse(cx,cy,8,5,.3,0,T);x.fill();for(const[ox,oy]of[[-12,-8],[11,-7],[-9,9],[10,8]])cir(cx+ox,cy+oy,3.2,'#34d39977');}
for(const bx of[-300,-180,-60,60,180])for(const bz of[-300,-180,-60,60,180,300]){const d=getDistrictAt(bx,bz);for(let k=0;k<9;k++){const o=-36+k%3*28,p=-36+Math.floor(k/3)*28;rc(bx+o,bz+p,bx+o+22,bz+p+22,k%3===0?d.color+'55':k%2?d.color+'36':'#e2e8f029');}}
for(const[vx,vz]of[[612,-88],[670,-88],[612,88],[670,88],[640,-178],[640,178]])rc(vx-16,vz-13,vx+16,vz+13,'#2dd4bf66','#99f6e4');
for(const ax of WORLD.avenuesX)ln(ax,-385,ax,385,'#94a3b8',4.2);for(const sz of WORLD.streetsZ)ln(-385,sz,256,sz,'#94a3b8',4.2);
const[ix1,iy1]=P(556,-162),[ix2,iy2]=P(724,162);rr(ix1,iy1,ix2-ix1,iy2-iy1,16,0,'#94a3b8',4.2);
ln(556,0,724,0,'#94a3b8',4);ln(254,0,560,0,'#ef4444',7);ln(254,0,560,0,'#fff',1.6,[6,4]);for(const px of[345,471])cir(...P(px,0),4.2,'#fff');
ln(266,120,424,120,'#d97706',5.5);const[pX,pY]=P(408,120);cir(pX,pY,10,0,'#22d3ee',2.6);cir(pX,pY,6,0,'#ff5e78',1.4);
const sg=getActiveStage(st.missions),[plx,ply]=P(st.player.x,st.player.z),[mx,my]=P(sg.x,sg.z);
for(const[col,lw,ds]of[['#fbbf2459',9,[]],['#fde047',3.2,[7,4]]]){x.strokeStyle=col;x.lineWidth=lw;x.setLineDash(ds);x.beginPath();x.moveTo(plx,ply);x.lineTo(plx,my);x.lineTo(mx,my);x.stroke();}
x.setLineDash([]);x.textAlign='center';x.textBaseline='middle';
const bdg=(wx,wz,bg,ch,r=6.6)=>{const[bx,by]=P(wx,wz);cir(bx,by,r,bg,'#fff',1.4);x.fillStyle='#090d16';x.font='900 8.5px sans-serif';x.fillText(ch,bx,by+.5);};
const kS={Race:['#22d3ee','R'],Stunt:['#fb923c','S'],Hideout:['#f43f5e','H'],Export:['#c084fc','E'],Property:['#34d399','P']};let eI=0;
for(const a of SIDE_ACTIVITIES){const[c,ch]=kS[a.kind]||['#34d399','•'];bdg(a.x+(a.kind==='Export'?(eI++-1.5)*42:0),a.z,c,ch,6.4);}
for(const p of SERVICE_POIS)bdg(p.x,p.z,p.color,p.type==='garage'?'G':p.type==='gunshop'?'A':'⌂',7.2);
bdg(742,-185,'#fde047','L',6.5);bdg(sg.x,sg.z,'#fbbf24','★',9.4);cir(plx,ply,7.2,'#fff','#ff2b55',2.8);
x.font='800 10.5px sans-serif';
for(const d of DISTRICTS){const[lx,ly]=P((d.minX+d.maxX)/2,(d.minZ+d.maxZ)/2),t=d.name.toUpperCase(),tw=x.measureText(t).width+12;rr(lx-tw/2,ly-8.5,tw,17,4,'#070c18cc',d.color+'88');x.fillStyle='#f8fafc';x.fillText(t,lx,ly+.5);}
}

function renderTitle(st){
const cards=st.saveSystem.listSlots().map((s,i)=>`<div class="gc sl" data-load-slot="${i}">${D('s0',S('s1',`SAVE SLOT ${i+1}${i?'':' · ACTIVE'}`)+S('s2',s?$(s.cash):'EMPTY'))}${D('s3',s?`Mission ${s.missionIndex+1}/10 · ${s.missionTitle}`:'New Career')}${D('s4',SP(s?`${s.district} · ${s.completion}%`:'Coral Promenade')+SP(s?s.savedAt:'Begin'))}</div>`).join('');
const nav=[['continue','CONTINUE CAMPAIGN','▶',' p'],['new_game','NEW GAME','→',''],['save','LOAD GAME','3 SLOTS',''],['set','SETTINGS','⚙',''],['map','CONTROLS & ATLAS','M','']].map(([a,l,r,c])=>B(`tb${c}`,`data-act="${a}"`,SP(l)+SP(r))).join('');
const ctrls=[['WASD','Drive / Walk'],['SHIFT','Nitro / Sprint'],['SPACE','Drift / Jump'],['F','Steal / Exit Car'],['LMB','Shoot / Aim'],['1-8','8 Weapons'],['Q/E/C','Crew Favours'],['R','4 FM Radio'],['M / ESC','Tactical Atlas'],['F5 / F9','Quick Save/Load']].map(([k,l])=>SP(`<kbd>${k}</kbd>${l}`)).join('');
root.innerHTML=D('ts',D('tm',D('tL',D('ew',LOGO)+'<p class="tg">Rule seven sun-soaked coastal districts from Coral Promenade to Starlight Isle. Steal 18 sculpted vehicles, outrun 5-star SBPD air &amp; tactical dispatch, and claim Solaria Bay.</p>'+D('tn',nav))+D('tR',D('sh','PERSISTENT CAREER SLOTS')+cards))+D('cs',ctrls));
root.onclick=e=>{const b=e.target.closest('[data-act],[data-load-slot]');if(!b)return;if(b.dataset.loadSlot!==undefined)return act.loadSlot(Number(b.dataset.loadSlot));const a=b.dataset.act;if(a==='continue')act.continueGame();else if(a==='new_game')act.newGame();else{tab=a==='save'?'SAVE':a==='set'?'SETTINGS':'MAP';act.openAtlas();}};
}

function renderAtlas(st){
const{missions:ms,activities:ac,player:pl,crew:cr,wanted:wn,vehicles:vh,audio:au}=st,comp=computeCompletionPercent(ms,ac),rk=getRespectRank(pl.respect),slots=st.saveSystem.listSlots();
const hasM=id=>ms.completedIds.includes(id),hasA=id=>ac.completedIds.includes(id),hasP=id=>ac.ownedProperties.includes(id);
const sB=i=>SP(B('m2',`data-s="${i}"`,'SAVE')+B('m2',`data-l="${i}"`,'LOAD')),mkL=a=>a.map(([k,v])=>lr(SP(k),SP(v))).join('');
let body='';
if(tab==='MAP'){
const pills=STORY_MISSIONS.map((m,i)=>B(`pi ${hasM(m.id)?'done':i===ms.missionIndex?'live':''}`,`data-m="${i}" title="${m.title}"`,`M${i+1}`)).join('');
const leg=[['#fbbf24','Mission/Garage'],['#22d3ee','Race'],['#fb923c','Stunt'],['#f43f5e','Hideout/Armory'],['#34d399','Safehouse']].map(([c,l])=>SP(`<i class="lg" style="background:${c}"></i>${l}`)).join('');
const qU=GARAGE_UPGRADES.slice(0,4).map(u=>ub(`data-u="${u.id}"`,u.label,$(u.cost))).join('');
const cC=CREW_ROSTER.map(c=>{const cd=Math.ceil(cr.cooldowns[c.id]||0);return ub(`data-f="${c.id}"`,`[${c.key}] ${c.name} (${c.member.split(' ')[0]})`,cd<=0?'READY':`${cd}s`);}).join('');
const sR=slots.map((s,i)=>lr(SP(`<strong>Slot ${i+1}:</strong> ${s?`M${s.missionIndex+1} · ${$(s.cash)} · ${s.district}`:'Empty'}`),sB(i),'sm')).join('');
body=D('gc mp',D('ah',S('at2','SOLARIA BAY · 7-DISTRICT + STARLIGHT ISLE ATLAS')+D('al',leg))+D('mw','<canvas id="atlas-map-canvas" width="760" height="424"></canvas>')+D('mb',S('ml','CAMPAIGN M1–M10')+D('mr',pills)))+D('ad',D('gc ac',D('ah',S('at2','SOLARIA CUSTOMS &amp; ARMORY')+S('uc',$(pl.cash)))+D('mg',qU))+D('gc ac cd',D('do',donut(comp)+D('dr2',`RANK ${rk.rank}<br><span>${rk.title}</span>`))+D('cw',D('at2','CREW FAVOURS')+cC))+D('gc ac',D('ah',S('at2','CAREER SAVE SLOTS (LOCALSTORAGE)')+S('mu',note||'F5 Quick Save'))+sR));
}else if(tab==='MISSIONS'){
body=pan('STORY CAMPAIGN (10)',STORY_MISSIONS.map((m,i)=>lr(SP(`<strong>${i+1}. ${m.title}</strong> (${m.act} · ${$(m.rewardCash)})`),hasM(m.id)?S('bd1','COMPLETED'):i===ms.missionIndex?S('bd2','ACTIVE'):B('m2',`data-m="${i}"`,'START'))).join(''),'ACTIVITIES (24)',SIDE_ACTIVITIES.slice(0,12).map(a=>{const d=hasA(a.id);return lr(SP(`<strong>[${a.kind}]</strong> ${a.name} · ${a.district}`),S(d?'bd1':'bd3',d?'DONE':$(a.payout||a.price)));}).join(''));
}else if(tab==='GARAGE'){
body=pan('CUSTOMS & ARMORY',D('sk',GARAGE_UPGRADES.map(u=>{const t=ac.upgradeTiers[u.id]||0;return ub(`data-u="${u.id}"`,`${u.label}${u.kind==='tier'?` (T${t}/${u.max})`:''}`,$(u.kind==='tier'?u.cost*(t+1):u.cost));}).join('')),`SAFEHOUSES (${ac.ownedProperties.length}/4)`,D('sk',SIDE_ACTIVITIES.filter(a=>a.kind==='Property').map(p=>ub(`data-p="${p.id}"`,`${p.name} (+${$(p.income)})`,hasP(p.id)?'OWNED':$(p.price))).join(''))+`<p class="nt">${note}</p>`);
}else if(tab==='CREW'){
body=pan('CREW FAVOURS',CREW_ROSTER.map(c=>lr(D('rw',`<strong>${c.member} · ${c.role}</strong>${B('ub',`data-f="${c.id}"`,`[${c.key}] ${c.name}`)}`),S('mu',c.desc),'cl')).join(''),'PROGRESSION',mkL([['Rank',S('bd2',`RANK ${rk.rank} · ${rk.title}`)],['Respect',`${pl.respect} RP`],['Completion',`${comp}%`],['Relics',`${ac.relicsFound}/12`]]));
}else if(tab==='STATS'){
const s=pl.stats;body=pan('CRIMINAL RECORD',mkL([['Missions',`${ms.completedIds.length}/10`],['Activities',`${ac.completedIds.length}/24`],['Hijacks',s.carsHijacked],['Evaded',s.copsEvaded],['Eliminations',s.eliminations]]),'EMPIRE METRICS',mkL([['Cash',$(pl.cash)],['Lifetime',$(s.totalEarnings)],['Distance',`${s.distanceKm.toFixed(1)} km`],['Stunts',`${s.stuntJumps}/6`],['Safehouses',`${ac.ownedProperties.length}/4`]]));
}else if(tab==='SETTINGS'){
body=pan('ATMOSPHERE & AUDIO',[['Golden Afternoon',16.55],['Daylight',13.8],['Twilight',19.25]].map(([l,v])=>lr(SP(l),B('ub',`data-o="${v}"`,'APPLY'))).join('')+lr(SP('Audio / Radio'),B('ub','data-x="1"',au.state.muted?'UNMUTE':'MUTE')),'SESSION',lr(SP('Title Panorama'),B('ub','data-q="1"','TITLE SCREEN')));
}else body=`<div class="gc af" style="grid-template-columns:1fr">${D('at2','3-SLOT LOCALSTORAGE SAVES')}${slots.map((s,i)=>lr(`<div><strong>Slot ${i+1}</strong> · ${s?`M${s.missionIndex+1}/10 (${s.missionTitle}) · ${$(s.cash)} · ${s.district}`:'Empty'}</div>`,sB(i))).join('')}<p class="nt">${note}</p></div>`;
const kpi=[['10','MISSIONS'],['24','ACTIVITIES'],[Object.keys(VEHICLES).length,'VEHICLES'],[WEAPONS.length,'WEAPONS'],[DISTRICTS.length,'DISTRICTS'],['4','FM RADIO'],[`${comp}%`,'COMPLETION','#34d399']].map(([n,l,c])=>D('gc kb',`<div class="kn"${c?` style="color:${c}"`:''}>${n}</div>${D('kl',l)}`)).join('');
root.innerHTML=D('ao',D('gc at',D('ab','SOLARIA BAY · TACTICAL ATLAS')+D('as',TABS.map(t=>B(`tb2 ${tab===t?'active':''}`,`data-t="${t}"`,t)).join(''))+B('ar','data-r="1"','RESUME [ESC]'))+D('ks',kpi)+D('ay',body));
const mc=root.querySelector('#atlas-map-canvas');if(mc)drawMap(mc,st);
root.onclick=e=>{
const b=e.target.closest('button');if(!b)return;const d=b.dataset;
if(d.r)return act.resumeGame();if(d.q)return act.showTitle();
if(d.t)tab=d.t;else if(d.u)note=applyGarageOrShopPurchase(d.u,ac,pl,wn,vh).msg;else if(d.p)note=buyProperty(d.p,ac,pl).msg;
else if(d.f){triggerCrewFavour(d.f,cr,pl,wn,vh,ms,st.effects);note=cr.lastNotice||'Cooling down';}
else if(d.m!==undefined){startMission(ms,Number(d.m),0,st.scene,vh,st.pedestrians,st.rng);return act.resumeGame();}
else if(d.s!==undefined){act.saveSlot(Number(d.s));note=`Saved Slot ${Number(d.s)+1}!`;}
else if(d.l!==undefined)return act.loadSlot(Number(d.l));else if(d.o)act.setTimeOfDay(Number(d.o));else if(d.x)au.setMuted(!au.state.muted);else return;
renderAtlas(st);
};
}
return{setActiveTab(t){tab=t;},renderTitle,renderAtlas};
}
