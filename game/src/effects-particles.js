// Soft sprite VFX: drift smoke, fine orange sparks, radial muzzle flash, thin tracers & fireballs.
import*as THREE from'three';

const{Group,Mesh,Sprite,SpriteMaterial:SM,BoxGeometry:Box,PlaneGeometry:Pln,MeshBasicMaterial:BM,PointLight:PtL,CanvasTexture:CT,Vector3:V3,AdditiveBlending:ADD,NormalBlending:NRM,SRGBColorSpace:SRGB}=THREE;
const{random:R,cos,sin,max,min,round,PI:P}=Math,rnd=(a=1)=>(R()-.5)*a;

function mkTex(mode){
const c=document.createElement('canvas');c.width=c.height=128;
const x=c.getContext('2d'),rg=(a,b,r,st)=>{const g=x.createRadialGradient(a,b,2,a,b,r);st.forEach(([o,col])=>g.addColorStop(o,col));return g;};
if(mode==='smoke'){for(let i=0;i<5;i++){const ox=64+cos(i*1.25)*12,oy=64+sin(i*1.25)*12;x.fillStyle=rg(ox,oy,42,[[0,'#ffffff52'],[.55,'#ebf2fa21'],[1,'#ffffff00']]);x.beginPath();x.arc(ox,oy,44,0,P*2);x.fill();}}
else if(mode==='beam'){const g=x.createLinearGradient(0,0,0,128);[[0,'#ffffffad'],[.35,'#f0faff6b'],[.82,'#e1f4ff29'],[1,'#dcf2ff00']].forEach(([o,col])=>g.addColorStop(o,col));x.fillStyle=g;x.fillRect(0,0,128,128);}
else{
const st=mode==='fire'?[[0,'#fffad2fa'],[.32,'#ffa830e0'],[.68,'#eb44147a'],[1,'#a0140000']]:mode==='muzzle'?[[0,'#fffff5ff'],[.24,'#ffde80e0'],[.55,'#ff94304d'],[1,'#ff6e1400']]:mode==='pool'?[[0,'#ffffffd1'],[.45,'#ffffff57'],[1,'#ffffff00']]:[[0,'#fffffff5'],[.3,'#ffffff7a'],[.68,'#ffffff1f'],[1,'#ffffff00']];
x.fillStyle=rg(64,64,mode==='muzzle'?52:62,st);x.fillRect(0,0,128,128);
if(mode==='muzzle'){x.fillStyle='#fffadcbf';for(let k=0;k<4;k++){x.save();x.translate(64,64);x.rotate(k*P/4);x.fillRect(-34,-1.2,68,2.4);x.restore();}}
}
const t=new CT(c);t.colorSpace=SRGB;return t;
}

export const SHARED_FLARE_TEX=mkTex('glow'),SHARED_BEAM_TEX=mkTex('beam'),SHARED_POOL_TEX=mkTex('pool');

export function createEffectsSystem(sc){
const g=new Group();sc.add(g);
const sT=mkTex('smoke'),fT=mkTex('fire'),mT=mkTex('muzzle'),particles=[],tracers=[],skidmarks=[],flashes=[],floatingNums=[];
const spGeo=new Box(.032,.032,.52),skGeo=new Pln(.42,2.2).rotateX(-P/2),skMat=new BM({color:'#1b2029',transparent:true,opacity:.42,depthWrite:false}),fxL=new PtL('#ff9a3c',0,44);sc.add(fxL);
const spM=(map,color,opacity,add)=>new SM({map,color,transparent:true,opacity,blending:add?ADD:NRM,depthWrite:false});
const SP=(...a)=>spawnParticle(...a);

function spawnParticle(x,y,z,vx,vy,vz,sz,col,life,o={}){
if(particles.length>260){const old=particles.shift();g.remove(old.m);old.m.material.dispose();}
const m=o.spark?new Mesh(spGeo,new BM({color:col,transparent:true,opacity:o.opacity??.96,depthWrite:false})):new Sprite(spM(o.kind==='fire'?fT:o.kind==='glow'?SHARED_FLARE_TEX:sT,col,o.opacity??.55,o.additive));
m.position.set(x,y,z);if(o.spark){m.scale.set(sz*.8,sz*.8,sz*1.25);m.lookAt(x+vx,y+vy,z+vz);}else m.scale.setScalar(sz*1.9);
g.add(m);particles.push({m,vx,vy,vz,l:life,ml:life,sk:Boolean(o.spark),gr:o.grow??1.5,gv:o.gravity??0,bo:o.opacity??.55,sz:o.spark?sz:sz*1.9});
}
const spawnDriftSmoke=(x,y,z,n=2,sp=.6)=>{for(let i=0;i<n;i++)SP(x+rnd(sp),y+.34,z+rnd(sp),rnd(1.1),.8+R()*.9,rnd(1.1),.56+R()*.36,'#e8eef5',.65+R()*.3,{kind:'smoke',opacity:.24,grow:1.85,gravity:-.25});};
const spawnSparks=(x,y,z,n=12,col='#ff8c1a')=>{for(let i=0;i<n;i++){const a=R()*P*2,s=5+R()*11;SP(x,y,z,cos(a)*s,2+R()*5.2,sin(a)*s,.55+R()*.38,i%3?col:'#ffd166',.28+R()*.22,{spark:true,opacity:.96,grow:.5,gravity:16});}};
const spawnMuzzleFlash=(x,y,z,col='#ffe599',s=.8)=>{const m=new Sprite(spM(mT,col,.94,1));m.position.set(x,y,z);m.scale.setScalar(.95*s);g.add(m);flashes.push({m,l:.08,ml:.08});fxL.color.set(col);fxL.position.set(x,y+.4,z);fxL.intensity=10;};
const spawnTracer=(a,b,col='#fde047',th=.032,life=.14)=>{const m=new Mesh(new Box(th,th,max(.2,a.distanceTo(b))),new BM({color:col,transparent:true,opacity:.92,blending:ADD,depthWrite:false}));m.position.copy(a).add(b).multiplyScalar(.5);m.lookAt(b);g.add(m);tracers.push({m,l:life,ml:life});};
const spawnExplosion=(x,y,z,s=1)=>{
for(let i=0;i<14;i++){const a=R()*P*2,v=(.9+R()*3.8)*s;SP(x+rnd(1.5*s),y+(.8+R()*1.4)*s,z+rnd(1.5*s),cos(a)*v,(2+R()*3.8)*s,sin(a)*v,(1.05+R()*.8)*s,i<4?'#fff6cc':i<10?'#ff8b24':'#ef4444',.55+R()*.4,{kind:'fire',additive:true,opacity:.88,grow:1.75,gravity:-1.1});}
for(let i=0;i<10;i++){const a=R()*P*2;SP(x+cos(a)*1.2*s,y+2.3*s,z+sin(a)*1.2*s,cos(a)*1.4*s,(2.8+R()*2.4)*s,sin(a)*1.4*s,(1.3+R()*.8)*s,'#3c4352',1.2+R()*.6,{kind:'smoke',opacity:.45,grow:2,gravity:-.6});}
spawnSparks(x,y+1.2,z,round(18*s),'#ff8c1a');fxL.color.set('#ff8828');fxL.position.set(x,y+3.2,z);fxL.intensity=28*s;
};
const spawnFireFlame=(x,y,z,s=1)=>{
SP(x+rnd(),y+.55,z+rnd(),rnd(),2.5+R()*2.2,rnd(),(.82+R()*.55)*s,R()<.42?'#fde047':'#ff6b1a',.42+R()*.24,{kind:'fire',additive:true,opacity:.84,grow:1.35,gravity:-.8});
if(R()<.55)SP(x+rnd(1.2),y+2,z+rnd(1.2),rnd(),3.3+R()*1.6,rnd(),(1.05+R()*.65)*s,'#383f4d',.9+R()*.45,{kind:'smoke',opacity:.38,grow:1.85,gravity:-.45});
};
const addSkidmark=(x,y,z,yaw)=>{if(skidmarks.length>180)g.remove(skidmarks.shift());const m=new Mesh(skGeo,skMat);m.position.set(x,y+.21,z);m.rotation.y=yaw;g.add(m);skidmarks.push(m);};
const spawnFloatingNumber=(x,y,z,text,color='#fde047')=>floatingNums.push({x,y,z,text,color,life:1.2,maxLife:1.2});

function update(dt){
if(fxL.intensity>.1)fxL.intensity=max(0,fxL.intensity-dt*42);
for(let i=particles.length-1;i>=0;i--){
const p=particles[i];p.l-=dt;if(p.l<=0){g.remove(p.m);p.m.material.dispose();particles.splice(i,1);continue;}
p.vy-=p.gv*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;
const f=1-p.l/p.ml,k=max(.05,p.sz*(1+f*(p.gr-1)));
if(p.sk)p.m.scale.set(k*.8,k*.8,k*1.25);else p.m.scale.setScalar(k);p.m.material.opacity=p.bo*(1-f);
}
for(const[arr,dG]of[[tracers,1],[flashes,0]])for(let i=arr.length-1;i>=0;i--){
const t=arr[i];t.l-=dt;if(t.l<=0){g.remove(t.m);if(dG)t.m.geometry.dispose();t.m.material.dispose();arr.splice(i,1);}else{if(!dG)t.m.scale.multiplyScalar(1+dt*4);t.m.material.opacity=t.l/t.ml;}
}
for(let i=floatingNums.length-1;i>=0;i--){const fn=floatingNums[i];fn.life-=dt;fn.y+=dt*1.9;if(fn.life<=0)floatingNums.splice(i,1);}
}
function renderFloatingOverlay(el,cam,w,h){
if(!el)return;if(!floatingNums.length){if(el.childElementCount)el.innerHTML='';return;}
const v=new V3();let html='';
for(const fn of floatingNums){v.set(fn.x,fn.y,fn.z).project(cam);if(v.z<=1)html+=`<div class="float-dmg" style="left:${((v.x*.5+.5)*w).toFixed(1)}px;top:${((-v.y*.5+.5)*h).toFixed(1)}px;color:${fn.color};opacity:${min(1,fn.life/(fn.maxLife*.45)).toFixed(2)}">${fn.text}</div>`;}
el.innerHTML=html;
}
return{group:g,particles,tracers,skidmarks,floatingNums,spawnParticle,spawnDriftSmoke,spawnSparks,spawnMuzzleFlash,spawnTracer,spawnExplosion,spawnFireFlame,addSkidmark,spawnFloatingNumber,update,renderFloatingOverlay};
}
