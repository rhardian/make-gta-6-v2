// 7-District Solaria Bay 3D open-world city: sunlit tarmac, Art Deco hotels, Bridge, Pier & palms.
import*as THREE from'three';
import{AVENUE_NAMES,DISTRICTS,SERVICE_POIS,STREET_NAMES,WORLD}from'./config.js';
import{SHARED_POOL_TEX}from'./effects-particles.js';
import{hash2D,randRange}from'./random.js';

const{Group:Grp,Mesh,BoxGeometry:Box,CylinderGeometry:Cyl,PlaneGeometry:Plane,SphereGeometry:Sph,ConeGeometry:Cone,TorusGeometry:Tor,MeshStandardMaterial:Std,MeshBasicMaterial:Bas,Vector3:V3,DoubleSide:DBL,AdditiveBlending:ADD}=THREE;
const{sin,cos,abs,min,max,hypot,atan2,PI:P}=Math,H=P/2;
const{bridgeStartX:b0,bridgeEndX:b1,bridgeZ:bZ,bridgePeakY:bH,pierStartX:p0,pierEndX:p1,pierZ:pZ,beachStartX:s0,shorelineX:s1,isleMinX:i0,isleMaxX:i1,isleMinZ:iz0,isleMaxZ:iz1,avenuesX:avX,streetsZ:stZ,roadWidth:rW}=WORLD;

export const getDistrictAt=(x,z)=>DISTRICTS.find(d=>x>=d.minX&&x<=d.maxX&&z>=d.minZ&&z<=d.maxZ)||(x>320?DISTRICTS[6]:DISTRICTS[0]);
export function getStreetAt(x,z){
if(x>=b0&&x<=b1&&abs(z-bZ)<16)return'Solaria Arch Bridge';
if(x>=p0&&x<=p1&&abs(z-pZ)<14)return'Starlight Sky-Ring Pier';
const nr=(a,v)=>a.reduce((b,c)=>abs(v-c)<abs(v-b)?c:b,a[0]),ax=nr([...avX,560,720],x),sz=nr(stZ,z);
return abs(x-ax)<24?AVENUE_NAMES[ax]||'Solaria Blvd':abs(z-sz)<24?STREET_NAMES[sz]||'Bay Crossway':x>=s0&&x<=s1?'Coral Gold Beach':AVENUE_NAMES[ax]||'Solaria Promenade';
}
export const getBridgeElevation=x=>x<b0||x>b1?0:sin((x-b0)/(b1-b0)*P)*bH;
export const isWaterAt=(x,z)=>!((x>=b0-6&&x<=b1+6&&abs(z-bZ)<12)||(x>=p0-4&&x<=p1+4&&abs(z-pZ)<11)||(x>=i0&&x<=i1&&z>=iz0&&z<=iz1)||(x>=-410&&x<=s1&&z>=-410&&z<=410));

export function getGroundHeightAt(x,z,ramps=[]){
if(x>=b0&&x<=b1&&abs(z-bZ)<12)return getBridgeElevation(x);
if(x>=p0&&x<=p1&&abs(z-pZ)<10.5)return 3.1;
for(const r of ramps){const dx=x-r.x,dz=z-r.z,ca=cos(-r.yaw),sa=sin(-r.yaw),lz=dx*sa+dz*ca;if(abs(dx*ca-dz*sa)<r.w*.55&&lz>-r.l/2&&lz<r.l/2)return max(0,(lz+r.l/2)/r.l*r.h);}
return x>s0&&x<=s1&&abs(z)<=410?THREE.MathUtils.lerp(.22,-.35,(x-s0)/(s1-s0)):isWaterAt(x,z)?-.35:0;
}
export function resolveBuildingCollision(w,x,z,r){
let rx=x,rz=z,hit=false;
for(const b of w.colliders){
const dx=rx-max(b.minX,min(rx,b.maxX)),dz=rz-max(b.minZ,min(rz,b.maxZ)),d2=dx*dx+dz*dz;
if(d2<r*r){hit=true;if(d2>1e-4){const d=Math.sqrt(d2),p=r-d;rx+=dx/d*p;rz+=dz/d*p;}else{const l=abs(rx-b.minX),ri=abs(b.maxX-rx),t=abs(rz-b.minZ),bt=abs(b.maxZ-rz),m=min(l,ri,t,bt);if(m===l)rx=b.minX-r;else if(m===ri)rx=b.maxX+r;else if(m===t)rz=b.minZ-r;else rz=b.maxZ+r;}}
}
return{x:rx,z:rz,hit};
}

const mk=(p,g,m,x,y,z,s=false)=>{const o=new Mesh(g,m);o.position.set(x,y,z);o.castShadow=s;o.receiveShadow=true;p.add(o);return o;};
const box=(p,w,h,d,m,x,y,z,s=true)=>mk(p,new Box(w,h,d),m,x,y,z,s);
const cyl=(p,a,b,h,sg,m,x,y,z,s=false)=>mk(p,new Cyl(a,b,h,sg),m,x,y,z,s);
const sph=(p,r,sg,m,x,y,z)=>mk(p,new Sph(r,sg,sg),m,x,y,z);
const con=(p,r,h,sg,m,x,y,z,s=false)=>mk(p,new Cone(r,h,sg),m,x,y,z,s);
const pln=(p,w,h,m,x,y,z)=>{const o=mk(p,new Plane(w,h),m,x,y,z);o.rotation.x=-H;return o;};
const std=(c,r=.7,mt=0,ex={})=>new Std({color:c,roughness:r,metalness:mt,...ex});
const mp=(map,r=.55,ex={})=>new Std({map,roughness:r,...ex});
const bas=c=>new Bas({color:c});

function mkPalm(x,z,sc,ry,tM,fM){
const g=new Grp();g.position.set(x,0,z);g.rotation.y=ry;let px=0,py=0,hS=2.05*sc;
for(let i=0;i<6;i++){const t=.07+i*.045;cyl(g,(.29-i*.032)*sc,(.32-i*.032)*sc,hS+.12,7,tM,px+sin(t)*hS/2,py+hS/2,0,true).rotation.z=-t;px+=sin(t)*hS+.04*sc;py+=cos(t)*hS;}
const cr=new Grp();cr.position.set(px,py,0);
for(let f=0;f<8;f++){const fr=new Grp();fr.rotation.y=f/8*P*2;box(fr,.95*sc,.09*sc,2.75*sc,fM,0,.3*sc,1.3*sc).rotation.x=.24;box(fr,.72*sc,.08*sc,2.35*sc,fM,0,-.35*sc,3.35*sc).rotation.x=.68;cr.add(fr);}
g.add(cr);return g;
}

function buildBridge(g,tx){
const sp=b1-b0,rM=std('#dc2638',.3,.48),wM=std('#f8fafc',.32,.3),cM=std('#d8e0eb'),lM=bas('#fef08a'),dT=tx.road.clone();
dT.needsUpdate=true;dT.rotation=H;dT.center.set(.5,.5);
const dM=mp(dT,.72),cbM=std('#fff',.25,.6,{emissive:'#cbd5e1',emissiveIntensity:.25}),up=new V3(0,1,0);
for(let i=0;i<28;i++){
const x0=b0+i/28*sp,x1=b0+(i+1)/28*sp,y0=getBridgeElevation(x0),y1=getBridgeElevation(x1),len=hypot(x1-x0,y1-y0)+.25,seg=new Grp();
seg.position.set((x0+x1)/2,(y0+y1)/2,bZ);seg.rotation.z=atan2(y1-y0,x1-x0);box(seg,len,1.3,21.6,cM,0,-.7,0);pln(seg,len,19.6,dM,0,.02,0);
for(const s of[-10.3,10.3]){box(seg,len,1.15,.65,wM,0,.6,s,false);box(seg,len,.35,.72,rM,0,1.25,s,false);}
if(i%4===2)for(const s of[-1,1]){cyl(seg,.14,.18,6.2,6,wM,0,3.1,s*10.2);sph(seg,.45,8,lM,0,6.2,s*9.6);}
g.add(seg);
}
for(const px of[345,471]){
const py=getBridgeElevation(px);box(g,8,py+10,26,cM,px,(py-10)/2,bZ);
for(const s of[-1,1])cyl(g,1.15,2,68,8,rM,px,32,bZ+s*8.2,true).rotation.x=s*.11;
[[3.2,3.2,19.5,wM,py+12],[3,2.8,13.5,wM,42],[3.6,3.6,8.2,rM,64]].forEach(([a,b,c,m,y])=>box(g,a,b,c,m,px,y,bZ));
sph(g,1.1,10,bas('#ff4d6d'),px,67.2,bZ);
for(let c=1;c<=7;c++)for(const dir of[-1,1]){const ax=px+dir*c*11.5;if(ax>=b0+8&&ax<=b1-8)for(const s of[-1,1]){const pA=new V3(px,63-c*3.1,bZ+s*3),pB=new V3(ax,getBridgeElevation(ax)+1,bZ+s*10.1),df=pB.clone().sub(pA);cyl(g,.14,.14,df.length(),5,cbM,(pA.x+pB.x)/2,(pA.y+pB.y)/2,(pA.z+pB.z)/2).quaternion.setFromUnitVectors(up,df.normalize());}}
}
}

function buildPier(g,tx){
const len=p1-p0,mid=(p0+p1)/2,pM=std('#6b4b30',.88),rM=std('#f8fafc',.45),lM=std('#f1f5f9',.35,.4);
box(g,len,.85,19,mp(tx.wood,.78),mid,2.7,pZ);for(const s of[-9.2,9.2])box(g,len,.9,.4,rM,mid,3.6,pZ+s,false);
for(let x=p0+8;x<=p1-4;x+=16)for(const s of[-8.2,0,8.2])cyl(g,.45,.5,6.5,7,pM,x,-.4,pZ+s);
for(const s of[-8.5,8.5])box(g,1.2,8.5,1.2,rM,p0+6,7.2,pZ+s);
box(g,1.4,3.4,18.2,new Bas({map:tx.signs.skyRingPier}),p0+6,11.4,pZ,false);
const wx=384,r=24,wp=new Grp();wp.position.set(wx,31,pZ);
for(const s of[-1,1])for(const f of[-1,1])cyl(g,.55,.95,32,8,lM,wx+f*5.6,17,pZ+s*4.4,true).rotation.z=f*.24;
cyl(wp,2.3,2.3,7.4,16,bas('#fde047'),0,0,0).rotation.x=H;
wp.add(new Mesh(new Tor(r,.72,10,48),bas('#22d3ee')),new Mesh(new Tor(r-2.8,.46,8,42),bas('#ff5e78')));
const cols=['#ff5e78','#22d3ee','#fbbf24','#a78bfa','#34d399','#fb923c'],spM=std('#fff',.4,0,{emissive:'#38bdf8',emissiveIntensity:.35}),pods=[];
for(let i=0;i<16;i++){const a=i/16*P*2;cyl(wp,.16,.16,r*2,5,spM,0,0,0).rotation.z=a;pods.push(box(wp,2.6,2.5,3.2,std(cols[i%6],.3,0,{emissive:cols[i%6],emissiveIntensity:.5}),cos(a)*r,sin(a)*r,0,false));}
g.add(wp);return{wheelPivot:wp,pods};
}

export function buildSolariaWorld(sc,tx,rng){
const g=new Grp();sc.add(g);
const colliders=[],lamps=[],beacons=[],ramps=[],neonBands=[],twilightLights=[];
const addC=(x,z,hw,hd,h)=>colliders.push({minX:x-hw,maxX:x+hw,minZ:z-hd,maxZ:z+hd,h});
const baseM=std('#e4dac8',.86),curbM=std('#d7dfe9',.78),sandM=mp(tx.sand,.88);tx.sidewalk.repeat.set(34,34);
[[680,1.4,820,mp(tx.sidewalk,.82),-72,-.58],[62,1.4,820,sandM,299,-.62],[254,1.5,434,sandM,640,-.45],[224,1.2,396,std('#45b874',.85),640,-.22]].forEach(([w,h,d,m,x,y])=>box(g,w,h,d,m,x,y,0,false));

const mkRM=(map,rx,ry,rot=0)=>{const m=map.clone();m.needsUpdate=true;m.repeat.set(rx,ry);if(rot){m.rotation=rot;m.center.set(.5,.5);}return mp(m,.72,{color:'#dde3ed',metalness:.04,emissive:'#1e2433',emissiveIntensity:.14});};
const roadMatNS=mkRM(tx.road,1,28),roadMatEW=mkRM(tx.road,1,24,H),interMat=mkRM(tx.intersection,1,1),iRM=std('#505868',.78);
for(const ax of avX){pln(g,rW,790,roadMatNS,ax,.14,0);if(ax===240||ax===0)for(const s of[-13.4,13.4])box(g,.8,.24,790,curbM,ax+s,.18,0,false);}
for(const sz of stZ)pln(g,660,rW,roadMatEW,-60,.15,sz);
for(const ax of avX)for(const sz of stZ)pln(g,rW+1.5,rW+1.5,interMat,ax,.17,sz);
for(const ix of[560,720])pln(g,18,340,iRM,ix,.42,0);for(const iz of[-160,0,160])pln(g,178,18,iRM,640,.43,iz);

const M={coral:mp(tx.coralDeco,.5),cream:mp(tx.creamDeco,.52),mint:mp(tx.mintDeco,.5),peach:mp(tx.peachDeco,.52),mirage:mp(tx.mirageDeco,.4,{emissive:'#472870',emissiveIntensity:.45}),gA:mp(tx.glassCobalt,.22,{metalness:.42}),gB:mp(tx.glassAmber,.25,{metalness:.38}),brisa:mp(tx.brisaTerracotta,.6),wh:mp(tx.warehouse,.74),terra:std('#cc5c42',.72),awC:mp(tx.awningCoral,.65),awT:mp(tx.awningTeal,.65),heli:mp(tx.helipad,.68),tG:bas('#fbbf24'),tC:bas('#22d3ee'),tP:bas('#ff5e78'),shop:bas('#ffedc2')};
const DM=[(b,z,s)=>[M.cream,M.coral,M.mint,M.peach][(b+z+s)%4],(b,z,s)=>s%2?M.gB:M.gA,(b,z,s)=>s%2?M.coral:M.mirage,(b,z,s)=>s%2?M.peach:M.cream,(b,z,s)=>s%2?M.peach:M.brisa];

[-300,-180,-60,60,180].forEach((cx,bx)=>[-300,-180,-60,60,180,300].forEach((cz,bz)=>{
const d=getDistrictAt(cx,cz),di=DISTRICTS.indexOf(d);box(g,86,.32,86,baseM,cx,.16,cz,false);
[[-20,-20],[20,-20],[-20,20],[20,20]].forEach(([sx,sz],s)=>{
const px=cx+sx,pz=cz+sz,bw=28+hash2D(bx*7+s,bz*11+s,42)*8,bd=28+hash2D(bx+s,bz*5,99)*8,bh=d.hMin+hash2D(bx*13,bz*3+s,77)*(d.hMax-d.hMin),wm=(DM[di]||(()=>M.wh))(bx,bz,s);
box(g,bw,bh,bd,wm,px,bh/2+.3,pz);addC(px,pz,bw/2+.6,bd/2+.6,bh);
if(di===1){if(bh>65){box(g,bw*.68,8,bd*.68,wm,px,bh+4.3,pz);neonBands.push(box(g,bw*.72,1,bd*.72,s%2?M.tG:M.tC,px,bh+8.6,pz,false));}else pln(g,bw*.72,bd*.72,M.heli,px,bh+.36,pz);}
else if(di===0){box(g,bw*.76,4.2,bd*.76,M.cream,px,bh+2.4,pz);neonBands.push(box(g,bw+.5,.85,bd+.5,s%2?M.tC:M.tP,px,bh+.3,pz,false));if(px>190){box(g,3.4,.9,bd*.84,s%2?M.awT:M.awC,px+bw/2+1.5,4.6,pz,false).rotation.z=-.35;for(const w of[-1,0,1])box(g,.35,2.7,5.2,M.shop,px+bw/2+.14,1.9,pz+w*7.5,false);}}
else if(di===2){const nm=[M.tP,M.tC,M.tG][s%3];neonBands.push(box(g,bw+.6,1.1,bd+.6,nm,px,bh-1.2,pz,false),box(g,bw+.6,.75,bd+.6,nm,px,5.6,pz,false));for(const w of[-1,0,1])box(g,5.4,2.8,.45,M.shop,px+w*7.6,2,pz+bd/2+.15,false);}
else if(di===3||di===4)con(g,max(bw,bd)*.66,6.5,4,M.terra,px,bh+3.5,pz).rotation.y=P/4;
else if(di===5)box(g,10,3.2,4.2,std(['#dc2626','#1d4ed8','#d97706','#0d9488'][(bx+s)%4],.72),px,bh+1.9,pz,false);
});
}));

const sn=tx.signs;
[[sn.hotelSolaria,16,3.8,217,13.5,-124,H],[sn.cafeBrisa,14,3.4,217,11.2,-84,H],[sn.hotelSolaria,16,3.8,217,15.5,-36,H],[sn.hotelSolaria,16,3.8,217,18,78,H],[sn.bancoSolaria,20,4.8,23,46,-42,-H],[sn.mirageLounge,16,3.8,-23,13,-212,H],[sn.solariaCustoms,16,3.8,23,12,-212,-H],[sn.mirageLounge,18,4.2,0,17,-264,0]].forEach(([t,w,h,x,y,z,ry])=>{box(g,w,h,.8,new Bas({map:t}),x,y,z,false).rotation.y=ry;});
[[612,-88],[670,-88],[612,88],[670,88],[640,-182],[640,182]].forEach(([vx,vz],i)=>{const vh=13+i%3*5;box(g,26,vh,24,i%2?M.coral:M.cream,vx,vh/2+.4,vz);box(g,28,1.2,26,M.terra,vx,vh+.8,vz,false);addC(vx,vz,13.5,12.5,vh);});
cyl(g,2.6,4.2,34,12,M.cream,742,17,-185,true);cyl(g,3.1,3.5,9,12,std('#e11d48'),742,20,-185);sph(g,2.2,12,bas('#fef08a'),742,35.5,-185);

buildBridge(g,tx);const skyRing=buildPier(g,tx),trM=std('#875c38',.88),frM=std('#2cb35e',.6,0,{side:DBL}),palms=[];
for(let z=-330;z<=330;z+=30)if(abs(z)>=20&&abs(z-120)>=20)palms.push([257.5,z,1.15],[222.5,z+14,1.06]);
for(let z=-340;z<=-140;z+=42)palms.push([-17,z,.96],[17,z,.96]);
for(let z=-140;z<=140;z+=48)palms.push([542,z,1.1],[738,z,1.1]);
for(const[px,pz,s]of palms)g.add(mkPalm(px,pz,s*randRange(rng,.88,1.14),randRange(rng,0,P*2),trM,frM));

const uCols=['#ff5e78','#22d3ee','#fbbf24','#a78bfa','#34d399','#fb923c'],poleM=std('#f8fafc',.4);
for(let z=-220;z<=220;z+=20)if(abs(z)>=22&&abs(z-120)>=24)for(const[ox,oz]of[[276+abs(z)%3*5,z],[297+abs(z)%2*6,z+8]]){cyl(g,.1,.1,3.2,6,poleM,ox,1.5,oz);con(g,2.5,1,8,std(uCols[abs(z+ox)%6],.55),ox,3.1,oz,true);}
for(const lz of[-122,-46,62]){box(g,4.4,3.4,4.4,M.cream,294,4.8,lz);box(g,5.2,.9,5.2,std('#ef4444'),294,6.8,lz,false);for(const sx of[-1.8,1.8])for(const sz of[-1.8,1.8])box(g,.35,3.6,.35,poleM,294+sx,1.6,lz+sz,false);}
const lpM=std('#293548',.4,.6),bM=bas('#ffebb0'),poolMat=new Bas({map:SHARED_POOL_TEX,color:'#ffd588',transparent:true,opacity:.12,depthWrite:false,blending:ADD});
for(const ax of[0,120,240,-120])for(let z=-310;z<=310;z+=56)if(abs(z%120)>=20)for(const s of[-1,1]){const lx=ax+s*14.8;cyl(g,.14,.2,8.2,6,lpM,lx,4.1,z);sph(g,.55,8,bM,lx-s*1.4,8.1,z);lamps.push(pln(g,18,18,poolMat,lx-s*4.2,.21,z));}
for(const[x,y,z,col]of[[6,9,-186,'#ffd28a'],[-7,9,-206,'#ffbd75'],[2,10,-226,'#c4b5fd']]){const pt=new THREE.PointLight(col,0,56,1.5);pt.position.set(x,y,z);sc.add(pt);twilightLights.push(pt);}
const rS=bas('#ef4444'),gS=bas('#22c55e');
for(const ix of[0,120,240])for(const iz of[-240,-120,0,120]){const gx=ix-14.5,gz=iz-14.5;box(g,.35,7.2,.35,lpM,gx,3.6,gz,false);box(g,6.2,.32,.32,lpM,gx+3,7,gz,false);box(g,.55,1.4,.55,(ix+iz)%240===0?gS:rS,gx+4.8,6.5,gz,false);}
const rampM=std('#f97316',.45,0,{emissive:'#9a3412',emissiveIntensity:.35});
for(const[id,x,z,yaw,w,l,h]of[['ramp_coral',252,-245,0,6.5,14,3.4],['ramp_pier',278,120,H,6.5,13,3.2],['ramp_mirage',0,-290,0,6.5,14,3.5],['ramp_docks',-120,290,H,7,15,3.8],['ramp_downtown',120,60,0,6.5,14,3.4],['ramp_isle',560,-70,0,6.5,14,3.4]]){
const rg=new Grp();rg.position.set(x,.15,z);rg.rotation.y=yaw;box(rg,w,.5,hypot(l,h),rampM,0,h/2,0).rotation.x=-atan2(h,l);box(rg,w+.2,.22,.7,M.tC,0,h+.1,l*.48,false);g.add(rg);ramps.push({id,x,z,yaw,w,l,h});
}
for(const p of SERVICE_POIS){const ring=mk(g,new Tor(3.8,.22,8,28),new Bas({color:p.color,transparent:true,opacity:.85}),p.x,.45,p.z);ring.rotation.x=H;beacons.push({mesh:ring,poi:p});}
return{group:g,colliders,skyRing,lamps,neonBands,beacons,ramps,poolMat,roadMatNS,roadMatEW,interMat,twilightLights};
}

export function updateWorldLandmarks(w,dt,el,tod){
if(w.skyRing?.wheelPivot){w.skyRing.wheelPivot.rotation.z+=dt*.26;for(const p of w.skyRing.pods)p.rotation.z=-w.skyRing.wheelPivot.rotation.z;}
const t=((tod%24)+24)%24,dusk=t>=18.5||t<6;w.poolMat.opacity=dusk?.44:.08;
for(const m of[w.roadMatNS,w.roadMatEW,w.interMat]){m.color.set(dusk?'#98a4be':'#dce3ed');m.emissiveIntensity=dusk?.36:.12;}
for(const pt of w.twilightLights)pt.intensity=dusk?46:0;
w.beacons.forEach((b,i)=>{const s=1+sin(el*2.5+i)*.08;b.mesh.position.y=.5+sin(el*3+i)*.28;b.mesh.scale.set(s,s,1);});
}
