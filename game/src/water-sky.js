// Radiant sunlit coastal sky shader, PCFSoftShadowMap sun, HemisphereLight & sparkling ocean.
import*as THREE from'three';

const SKY_V='varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}';
const SKY_F=`#define S smoothstep
uniform vec3 uTop,uMid,uHor,uSD,uSC,uCC;uniform float uT,uCA;varying vec3 vD;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f*=f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n2(p);p*=2.05;a*=.5;}return v;}
void main(){vec3 d=normalize(vD);float y=clamp(d.y,0.,1.),sd=max(dot(d,normalize(uSD)),0.);
vec3 c=mix(mix(uHor,uMid,S(0.,.22,y)),uTop,S(.18,.68,y))+uSC*(pow(sd,8.)*.36+pow(sd,64.)*.75)+vec3(1.,.98,.92)*S(.998,.9995,sd)*1.5;
if(d.y>.03){vec2 u=d.xz/(d.y+.26)*1.55+vec2(uT*.01,-uT*.005);float m=S(.45,.75,fb(u*2.1)*.78+fb(u*4.2+vec2(3.1,1.7))*.22)*S(.03,.18,d.y)*S(.9,.25,d.y);c=mix(c,mix(uCC*.92,vec3(1.,.99,.96),.45+.55*pow(sd,3.)),m*uCA);}
gl_FragColor=vec4(c,1.);}`;

const WAT_V=`uniform float uT;varying vec3 vW;varying float vWv;
void main(){vec4 w=modelMatrix*vec4(position,1.);float a=sin(w.x*.048+uT*1.55+w.z*.025)*.24+cos(w.z*.062-uT*1.25+w.x*.03)*.16+sin((w.x-w.z)*.11+uT*2.1)*.08;w.y+=a;vWv=a;vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const WAT_F=`#define S smoothstep
uniform float uT,uFD;uniform vec3 uSD,uSC,uSh,uDp,uSk,uFg;varying vec3 vW;varying float vWv;
void main(){vec3 V=normalize(cameraPosition-vW),N=normalize(vec3(cos(vW.x*.085+uT*1.8)*.13+sin(vW.z*.17-uT*2.4)*.08,1.,sin(vW.z*.095-uT*1.5)*.13+cos(vW.x*.16+uT*2.1)*.08)),H=normalize(normalize(uSD)+V);
float cd=min(max(0.,vW.x-318.),length(max(abs(vW.xz-vec2(640.,0.))-vec2(122.,212.),vec2(0.))));
vec3 c=mix(mix(uSh,uDp,S(0.,105.,cd)),uSk,clamp(pow(1.-max(dot(V,N),0.),3.4)*.56,0.,.62))+uSC*(pow(max(dot(N,H),0.),36.)*.48+pow(max(dot(N,H),0.),240.)*2.1+pow(max(0.,sin(vW.x*.42+uT*2.)*cos(vW.z*.38-uT*1.7)),12.)*.42);
float f=clamp((1.-S(0.,15.,cd))*S(.2,.7,sin(cd*.56-uT*2.7+sin(vW.z*.07)*2.2))*.75+(1.-S(0.,4.2,cd))*.86+S(.28,.46,vWv)*.24,0.,.95);
gl_FragColor=vec4(mix(mix(c,vec3(.97,.99,1.),f),uFg,clamp(1.-exp(-pow(length(cameraPosition-vW)*uFD,2.)),0.,1.)),.97);}`;

const C=h=>new THREE.Color(h),U=v=>({value:v}),lp=THREE.MathUtils.lerp,mixSet=(A,B,k)=>A.map((a,i)=>typeof a==='string'?C(a).lerp(C(B[i]),k):lp(a,B[i],k));
const G0=['#0d6ed6','#62c4f6','#ffe9b8','#fff6d6','#fffdf7','#ddecf8','#9ad9ff','#ecd0a4','#1ef0e2','#0b68c8',.5,.62,3.45,1.42,.42,.00056,.74];
const G1=['#1c79d6','#9fd0ee','#ffca92','#ffd794','#ffe7c7','#f5dcc6','#b8dcfa','#dfb98a','#18d9d2','#0c54a8',.34,.62,3.15,1.28,.42,.00056,.74];
const D0=['#1b2d6b','#6d4588','#f59362','#ffb078','#f5b38c','#4a3868','#a8b8f2','#5d4c6b','#16b8c4','#11336b',.22,.75,1.85,1.05,.46,.00115,.58];
const D1=['#0f193c','#33255c','#9e4c73','#98a8fa','#7b5a8e','#242042','#7c8fd4','#3f3754','#126f8f','#091c3e',.28,.75,1.25,.85,.46,.00115,.58];
const NI=['#0b132b','#1a2750','#2d3560','#a8d0ff','#4c5b88','#18203c','#7c9ad6','#2d334c','#0d5f7d','#071730',.4,.45,1,.72,.36,.0014,.45];
const DY=['#0c68d4','#56bef8','#daf3ff','#fff8dc','#fff','#cfeaf9','#9cdbff','#f0d4a0','#1ff2e4','#0a67c7',.56,.54,3.55,1.48,.44,.0005,.78];

export function createWaterAndSky(scene){
const skyUniforms={uTop:U(C('#0f70dc')),uMid:U(C('#63c2f6')),uHor:U(C('#ffe3ad')),uSD:U(new THREE.Vector3(.6,.4,.7).normalize()),uSC:U(C('#fff0c4')),uCC:U(C('#fff9ee')),uT:U(0),uCA:U(.74)};
const skyDome=new THREE.Mesh(new THREE.SphereGeometry(1850,32,20),new THREE.ShaderMaterial({vertexShader:SKY_V,fragmentShader:SKY_F,uniforms:skyUniforms,side:THREE.BackSide,depthWrite:false}));
const sunLight=new THREE.DirectionalLight('#fff2d2',3.3);sunLight.castShadow=true;sunLight.shadow.mapSize.set(2048,2048);
Object.assign(sunLight.shadow.camera,{near:20,far:560,left:-165,right:165,top:165,bottom:-165});sunLight.shadow.bias=-.0004;sunLight.shadow.normalBias=.03;
const hemiLight=new THREE.HemisphereLight('#8cd6ff','#e8c494',1.35),ambientLight=new THREE.AmbientLight('#e6f2ff',.42),fog=new THREE.FogExp2('#d9edf9',.00058);scene.fog=fog;
const waterUniforms={uT:U(0),uSD:U(skyUniforms.uSD.value.clone()),uSC:U(C('#fff2cc')),uSh:U(C('#1be8dc')),uDp:U(C('#0b64c2')),uSk:U(C('#b8e6ff')),uFg:U(fog.color.clone()),uFD:U(fog.density)};
const oceanMesh=new THREE.Mesh(new THREE.PlaneGeometry(2800,2800,110,110).rotateX(-Math.PI/2),new THREE.ShaderMaterial({vertexShader:WAT_V,fragmentShader:WAT_F,uniforms:waterUniforms,transparent:true}));
oceanMesh.position.set(360,-.35,0);scene.add(skyDome,sunLight,sunLight.target,hemiLight,ambientLight,oceanMesh);
return{skyDome,skyUniforms,oceanMesh,waterUniforms,sunLight,hemiLight,ambientLight,fog};
}

export function updateWaterAndSky(env,timeOfDay,elapsed,fx,fz){
const su=env.skyUniforms,wu=env.waterUniforms,t=((timeOfDay%24)+24)%24;
su.uT.value=wu.uT.value=elapsed;env.skyDome.position.set(fx,0,fz);
const p=t>=15.8&&t<18.5?mixSet(G0,G1,(t-15.8)/2.7):t>=18.5&&t<21.2?mixSet(D0,D1,(t-18.5)/2.7):t>=21.2||t<5.5?mixSet(NI,NI,0):mixSet(DY,DY,0);
const[top,mid,hor,sc,cc,fg,hs,hg,sh,dp,el,az,si,hi,ai,fd,ca]=p,sd=new THREE.Vector3(Math.cos(el)*Math.cos(az),Math.sin(el),Math.cos(el)*Math.sin(az)).normalize();
su.uTop.value.copy(top);su.uMid.value.copy(mid);su.uHor.value.copy(hor);su.uSD.value.copy(sd);su.uSC.value.copy(sc);su.uCC.value.copy(cc);su.uCA.value=ca;
env.sunLight.color.copy(sc);env.sunLight.intensity=si;env.sunLight.position.set(fx+sd.x*230,sd.y*230,fz+sd.z*230);env.sunLight.target.position.set(fx,0,fz);env.sunLight.target.updateMatrixWorld();
env.hemiLight.color.copy(hs);env.hemiLight.groundColor.copy(hg);env.hemiLight.intensity=hi;env.ambientLight.intensity=ai;env.fog.color.copy(fg);env.fog.density=fd;
wu.uSD.value.copy(sd);wu.uSC.value.copy(sc);wu.uSh.value.copy(sh);wu.uDp.value.copy(dp);wu.uSk.value.copy(mid);wu.uFg.value.copy(fg);wu.uFD.value=fd;
}
