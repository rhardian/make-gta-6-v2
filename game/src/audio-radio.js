// Procedural Web Audio API synthesizer: 4 FM stations, engine hum, gunshots, explosions & sirens.
import{RADIO_STATIONS}from'./config.js';

export function createAudioRadio(){
let ctx,mst,eO,eG,sO,sG;const st={stationIndex:0,muted:false,radioVolume:.24,sfxVolume:.45,beatTimer:0,step:0};
function ensureContext(){
if(ctx){if(ctx.state==='suspended')ctx.resume().catch(()=>{});return true;}
const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
try{
ctx=new AC();mst=ctx.createGain();mst.gain.value=st.muted?0:.7;mst.connect(ctx.destination);
eO=ctx.createOscillator();eO.type='sawtooth';eO.frequency.value=55;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=240;
eG=ctx.createGain();eG.gain.value=0;eO.connect(f);f.connect(eG);eG.connect(mst);eO.start();
sO=ctx.createOscillator();sO.type='triangle';sO.frequency.value=660;sG=ctx.createGain();sG.gain.value=0;sO.connect(sG);sG.connect(mst);sO.start();return true;
}catch{return false;}
}
const tone=(fr,dur,type,vol,sl=0)=>{if(!ctx||st.muted)return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(fr,t);if(sl)o.frequency.exponentialRampToValueAtTime(Math.max(24,sl),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(mst);o.start(t);o.stop(t+dur+.02);};
const noise=(dur,vol,cut=1200)=>{if(!ctx||st.muted)return;const n=Math.floor(ctx.sampleRate*dur),b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=b;f.type='lowpass';f.frequency.value=cut;g.gain.value=vol;s.connect(f);f.connect(g);g.connect(mst);s.start();};
const cycleStation=()=>{ensureContext();st.stationIndex=(st.stationIndex+1)%RADIO_STATIONS.length;return RADIO_STATIONS[st.stationIndex];};
const setMuted=m=>{st.muted=m;if(mst)mst.gain.value=m?0:.7;};
const playGunshot=id=>{const h=id==='coral_shotgun'||id==='mirage_sniper';noise(h?.16:.08,st.sfxVolume*(h?.45:.28),h?1600:2800);tone(h?150:240,.07,'square',st.sfxVolume*.2,48);};
const playExplosion=()=>{noise(.55,st.sfxVolume*.65,620);tone(95,.48,'sine',st.sfxVolume*.55,28);};
function update(dt,el,pl,stars){
if(!ctx||st.muted)return;const t=ctx.currentTime;
if(eG){const d=pl.inVehicle&&pl.vehicle&&!pl.vehicle.destroyed;if(d)eO.frequency.setTargetAtTime(48+pl.vehicle.speed*2.1+(pl.vehicle.nitroActive?35:0),t,.06);eG.gain.setTargetAtTime(d?.055*st.sfxVolume:0,t,.08);}
if(sG){if(stars>0)sO.frequency.setTargetAtTime(620+Math.sin(el*5.2)*230,t,.05);sG.gain.setTargetAtTime(stars>0?.028*st.sfxVolume:0,t,.1);}
const s=RADIO_STATIONS[st.stationIndex];if(!s||s.bpm<=0)return;const sd=30/s.bpm;st.beatTimer+=dt;
if(st.beatTimer>=sd){st.beatTimer-=sd;const k=st.step++%16,v=st.radioVolume*.22;if(k%4===0)tone(115,.11,'sine',v*1.4,38);if(k%4===2)noise(.06,v*.65,2200);const fr=s.root*2**(s.scale[(k*3+Math.floor(k/4))%s.scale.length]/12);tone(fr,sd*.85,k%2?'triangle':'sawtooth',v*.55);if(k%2)tone(fr*2,sd*.6,'sine',v*.35);}
}
return{state:st,ensureContext,cycleStation,setMuted,playGunshot,playExplosion,update};
}
