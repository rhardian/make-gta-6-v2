// Procedural CanvasTexture generator: Art Deco facades, glass towers, gray tarmac, sand, signs & SBPD liveries.
import*as THREE from'three';

const mkC=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return[c,c.getContext('2d')];};
const rct=(x,c,a,b,w,h)=>{x.fillStyle=c;x.fillRect(a,b,w,h);};
const lg=(x,a,b,c,d,st)=>{const g=x.createLinearGradient(a,b,c,d);st.forEach(([o,k])=>g.addColorStop(o,k));return g;};
const txt=(x,f,c,t,a,b)=>{x.font=f+' Segoe UI,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle=c;x.fillText(t,a,b);};
function toT(c,rx=1,ry=1,cl=false){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=cl?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=8;t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;}

function deco(base,trim,acc,lit=.55){
const[c,x]=mkC(512,512);rct(x,base,0,0,512,512);
for(let i=0;i<600;i++)rct(x,i%2?'#3c23140a':'#ffffff14',i*97%512,i*193%512,4,4);
for(let r=0;r<6;r++){rct(x,trim,0,r*85,512,9);rct(x,acc,0,r*85+9,512,3);}
for(let k=0;k<8;k++){rct(x,'#ffffff38',k*64+2,0,6,512);rct(x,'#14122017',k*64+8,0,3,512);}
for(let r=0;r<6;r++)for(let k=0;k<8;k++){
const wx=k*64+14,wy=r*85+18,warm=(r*31+k*17+base.charCodeAt(1))%100/100<lit;rct(x,'#12182666',wx-2,wy-2,42,58);
rct(x,lg(x,wx,wy,wx,wy+54,warm?[[0,'#fef08a'],[.55,'#fb923c'],[1,'#9a3412']]:[[0,'#7dd3fc'],[.5,'#2563eb'],[1,'#1e3a5f']]),wx,wy,38,54);
x.fillStyle='#ffffff47';x.beginPath();x.moveTo(wx+2,wy+2);x.lineTo(wx+18,wy+2);x.lineTo(wx+2,wy+24);x.fill();
rct(x,trim,wx+18,wy,3,54);rct(x,trim,wx,wy+24,38,3);rct(x,'#fff',wx-3,wy+48,44,4);
}
return toT(c);
}
function glass(top,bot,glow){
const[c,x]=mkC(512,512);rct(x,lg(x,0,0,0,512,[[0,top],[1,bot]]),0,0,512,512);
for(let r=0;r<12;r++){const y=r*42.6;rct(x,'#1e293b',0,y,512,6);for(let k=0;k<10;k++){const px=k*51.2,h=(r*19+k*37)%100/100;rct(x,h<.42?(h<.16?glow:'#fef08a94'):lg(x,px,y+8,px+44,y+38,[[0,'#bae6fd7a'],[.5,'#38bdf847'],[1,'#0f172a59']]),px+4,y+8,43,30);rct(x,'#0f172aa6',px,y,4,43);}}
return toT(c);
}
function warehouse(){const[c,x]=mkC(256,256);rct(x,'#8b95a5',0,0,256,256);for(let i=0;i<256;i+=8)rct(x,i%16?'#0f172a24':'#ffffff29',i,0,4,256);rct(x,'#f59e0b',0,196,256,16);for(const px of[26,152]){rct(x,'#1e293b',px,40,74,44);rct(x,'#fde68a',px+6,46,62,32);}return toT(c);}
function road(isI=false){
const[c,x]=mkC(512,512),W='#f8fafc';rct(x,'#626b7a',0,0,512,512);
for(let i=0;i<2200;i++)rct(x,i%3?'#141a2612':'#ffffff14',i*73%512,i*151%512,3,3);
if(isI)for(let k=60;k<=424;k+=44){rct(x,W,k,14,24,58);rct(x,W,k,440,24,58);rct(x,W,14,k,58,24);rct(x,W,440,k,58,24);}
else{for(const[k,a,w]of[['#bcc4d0',0,14],['#bcc4d0',498,14],['#1e243021',92,52],['#1e243021',368,52],[W,20,7],[W,485,7],['#facc15',245,8],['#facc15',259,8]])rct(x,k,a,0,w,512);for(let y=14;y<512;y+=96){rct(x,W,138,y,7,50);rct(x,W,367,y,7,50);}}
return toT(c);
}
function sidewalk(){const[c,x]=mkC(256,256);rct(x,'#e8dfd0',0,0,256,256);x.strokeStyle='#6e62544d';x.lineWidth=3;for(let g=0;g<=256;g+=64){x.beginPath();x.moveTo(g,0);x.lineTo(g,256);x.moveTo(0,g);x.lineTo(256,g);x.stroke();}for(let y=32;y<256;y+=64)for(let px=32;px<256;px+=64)rct(x,'#e1705538',px-6,y-6,12,12);return toT(c);}
function sand(){const[c,x]=mkC(256,256);rct(x,'#f8e2b0',0,0,256,256);for(let i=0;i<1600;i++)rct(x,i%2?'#c49a582e':'#fffcee61',i*61%256,i*113%256,3,2);return toT(c,6,18);}
function wood(){const[c,x]=mkC(256,256);for(let y=0;y<256;y+=24){rct(x,y%48?'#b38154':'#9c6e44',0,y,256,22);rct(x,'#57381f',0,y+22,256,2);}return toT(c,4,2);}
function awning(a,b){const[c,x]=mkC(256,128);for(let i=0;i<256;i+=32)rct(x,i/32%2?b:a,i,0,32,128);return toT(c);}
function helipad(){const[c,x]=mkC(256,256);rct(x,'#475569',0,0,256,256);x.strokeStyle='#facc15';x.lineWidth=14;x.beginPath();x.arc(128,128,96,0,6.29);x.stroke();rct(x,'#f8fafc',82,68,22,120);rct(x,'#f8fafc',152,68,22,120);rct(x,'#f8fafc',82,118,92,22);return toT(c);}

export function createSignTexture(text,bg,fg,br='#fde68a'){
const[c,x]=mkC(512,128);rct(x,bg,0,0,512,128);x.strokeStyle=br;x.lineWidth=8;x.strokeRect(8,8,496,112);
x.shadowColor=fg;x.shadowBlur=16;txt(x,'900 50px',fg,text,256,66);return toT(c);
}

let pCache=null;
export function createPoliceLiveryTextures(){
if(pCache)return pCache;
const side=(lbl,dk)=>{
const[c,x]=mkC(512,160);rct(x,dk?'#243c66':'#f8fafc',0,0,512,160);rct(x,dk?'#f8fafc':'#163160',0,96,512,46);rct(x,'#38bdf8',0,90,512,7);rct(x,'#fbbf24',0,142,512,6);
for(const[r,col]of[[22,'#fbbf24'],[14,'#163160']]){x.fillStyle=col;x.beginPath();x.arc(118,52,r,0,6.29);x.fill();}
txt(x,'900 16px','#fef08a','★',118,53);txt(x,'900 56px',dk?'#fff':'#132a54',lbl,304,54);txt(x,'800 22px',dk?'#132a54':'#f8fafc','SOLARIA BAY POLICE',256,121);
return toT(c,1,1,true);
};
const[rc,rx]=mkC(256,96);rct(rx,'#f8fafc',0,0,256,96);rct(rx,'#163160',0,0,256,30);rct(rx,'#38bdf8',0,30,256,6);txt(rx,'900 34px','#132a54','SBPD',128,66);
return(pCache={side:side('SBPD',false),swatSide:side('SWAT',true),rear:toT(rc,1,1,true)});
}

export function createProceduralTexturePack(){
const signs=Object.fromEntries([['hotelSolaria','HOTEL SOLARIA','#1f1024','#ff99b6','#22d3ee'],['bancoSolaria','BANCO SOLARIA','#0d1b2e','#fde047','#38bdf8'],['solariaCustoms','SOLARIA CUSTOMS','#1c1917','#fbbf24','#ff5e78'],['mirageLounge','MIRAGE LOUNGE','#1a0b2e','#e879f9','#22d3ee'],['cafeBrisa','CAFE BRISA','#0c2d2a','#5eead4','#fbbf24'],['skyRingPier','SKY-RING PIER','#0f172a','#38bdf8','#fb7185']].map(([k,...a])=>[k,createSignTexture(...a)]));
return{
coralDeco:deco('#f8a8b5','#fff8f0','#2dd4bf',.56),creamDeco:deco('#fbf2e3','#fff','#ff6b8b',.52),mintDeco:deco('#a7ead8','#fff','#fbbf24',.5),peachDeco:deco('#fac59b','#fffaf3','#38bdf8',.54),
mirageDeco:deco('#4a3a7c','#d8b4fe','#22d3ee',.84),glassCobalt:glass('#2b6cb0','#163860','#fbbf24c7'),glassAmber:glass('#4a668a','#243752','#38bdf8c7'),brisaTerracotta:deco('#e8997c','#fef3c7','#fb7185',.5),
warehouse:warehouse(),road:road(false),intersection:road(true),sidewalk:sidewalk(),sand:sand(),wood:wood(),awningCoral:awning('#ff5e78','#fff8f0'),awningTeal:awning('#14b8a6','#fff'),helipad:helipad(),signs,
};
}
