// Main entry point & real-time WebGL game loop for Solaria Bay: Sun & Syndicate.
import*as THREE from'three';
import{STEP,WORLD}from'./config.js';
import{createRng}from'./random.js';
import{createProceduralTexturePack}from'./textures-procedural.js';
import{createWaterAndSky,updateWaterAndSky}from'./water-sky.js';
import{buildSolariaWorld,updateWorldLandmarks}from'./world-city.js';
import{createEffectsSystem}from'./effects-particles.js';
import{resolveVehicleCollisions,stepVehiclePhysics}from'./vehicles.js';
import{createPlayer,enterOrExitVehicle,updatePlayerOnFoot}from'./player-onfoot.js';
import{populateAmbientCity,updatePedestrians,updateTrafficVehicles}from'./traffic-peds.js';
import{createCombatSystem}from'./combat-weapons.js';
import{createPoliceDispatch}from'./police-dispatch.js';
import{createMissionDirector,startMission,updateMissionDirector}from'./missions-story.js';
import{createActivitiesSystem,updateActivities}from'./activities-economy.js';
import{createCrewProgression,triggerCrewFavour,updateCrewCooldowns}from'./crew-progression.js';
import{createCameraController,updateCameraController}from'./camera-controller.js';
import{createAudioRadio}from'./audio-radio.js';
import{createInputController}from'./input.js';
import{createHudManager}from'./hud-minimap.js';
import{createMenuManager}from'./menus-map-save.js';
import{createSaveSystem}from'./save-system.js';
import{stageShowcaseShot}from'./shots.js';

function bootstrapSolariaBay(){
const qs=new URLSearchParams(location.search),shot=qs.get('shot'),rng=createRng(Number(qs.get('seed'))||1);
const $=id=>document.getElementById(id),cv=$('game'),hE=$('hud-layer'),mE=$('menu-layer'),fE=$('fx-overlay'),sE=$('status');
const R=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
R.setPixelRatio(Math.min(devicePixelRatio||1,2));R.setSize(innerWidth,innerHeight,false);
R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.18;R.outputColorSpace=THREE.SRGBColorSpace;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;

const sc=new THREE.Scene(),tx=createProceduralTexturePack(),env=createWaterAndSky(sc),w=buildSolariaWorld(sc,tx,rng);
const fx=createEffectsSystem(sc),au=createAudioRadio(),cb=createCombatSystem(sc,fx,au),wn=createPoliceDispatch(sc,rng);
const ms=createMissionDirector(sc),ac=createActivitiesSystem(sc),cr=createCrewProgression(),sv=createSaveSystem();sv.ensurePopulatedSlots();
const vh=[],pd=[],pl=createPlayer(sc);populateAmbientCity(sc,vh,pd,rng);
const cc=createCameraController(innerWidth/innerHeight),hud=createHudManager(hE);
const st={scene:sc,renderer:R,world:w,env,effects:fx,audio:au,combat:cb,wanted:wn,missions:ms,activities:ac,crew:cr,saveSystem:sv,cameraCtrl:cc,player:pl,vehicles:vh,pedestrians:pd,rng,timeOfDay:13.8,elapsed:0,mode:'title',shotFrozen:Boolean(shot)};

function setMode(m){
st.mode=m;hE.classList.toggle('hidden',m!=='play');mE.classList.toggle('hidden',m==='play');
if(m==='title'){if(!st.shotFrozen){cc.mode='panorama';st.timeOfDay=13.8;}mn.renderTitle(st);sE.textContent='Solaria Bay Start Screen.';}
else if(m==='atlas'){mn.renderAtlas(st);sE.textContent='Solaria Bay Tactical Atlas open.';}
else{if(!st.shotFrozen)cc.mode='gameplay';sE.textContent='Playing Solaria Bay.';}
}
const loadSlot=i=>{au.ensureContext();sv.loadSlot(i,st);st.shotFrozen=false;setMode('play');};
const mn=createMenuManager(mE,{
continueGame:()=>loadSlot(0),loadSlot,openAtlas:()=>{au.ensureContext();setMode('atlas');},resumeGame:()=>setMode('play'),showTitle:()=>setMode('title'),setTimeOfDay:t=>{st.timeOfDay=t;},
saveSlot:i=>{sv.saveSlot(i,st);sE.textContent=`Saved Slot ${i+1}.`;},
newGame(){au.ensureContext();st.shotFrozen=false;st.timeOfDay=WORLD.defaultTime;Object.assign(pl,{cash:48500,respect:420,health:100,armor:85,x:240,z:-90});startMission(ms,0,0,sc,vh,pd,rng);wn.clearHeat(5,vh);setMode('play');},
});
const ip=createInputController(cv,{
onUserGesture:()=>au.ensureContext(),
onInteract(){if(st.mode!=='play')return;au.ensureContext();if(!enterOrExitVehicle(pl,vh,wn)&&pl.nearbyPoi){mn.setActiveTab('GARAGE');setMode('atlas');}},
onCycleRadio:()=>{if(st.mode==='play')sE.textContent=`Radio: ${au.cycleStation().name}`;},
onToggleAtlas:()=>{if(st.mode==='play'){ip.clearAll();setMode('atlas');}else setMode('play');},
onSelectWeapon:i=>{if(st.mode==='play')pl.weaponIndex=i;},onWheelWeapon:d=>{if(st.mode==='play')pl.weaponIndex=(pl.weaponIndex+d+8)%8;},
onCrewFavour:id=>{if(st.mode==='play')triggerCrewFavour(id,cr,pl,wn,vh,ms,fx);},
onQuickSave:()=>{sv.saveSlot(0,st);ms.bannerText='QUICK SAVED · SLOT 1';ms.bannerTimer=2.2;},
onQuickLoad:()=>{if(sv.loadSlot(0,st)){ms.bannerText='QUICK LOADED · SLOT 1';ms.bannerTimer=2.2;}},
});
if(shot)setMode(stageShowcaseShot(shot,st));else{startMission(ms,0,0,sc,vh,pd,rng);setMode('title');}

function step(dt){
st.elapsed+=dt;const el=st.elapsed;updateWorldLandmarks(w,dt,el,st.timeOfDay);
if(st.mode==='play'&&!st.shotFrozen){
st.timeOfDay=(st.timeOfDay+dt*.004)%24;
if(pl.inVehicle&&pl.vehicle){const k=ip.keys;stepVehiclePhysics(pl.vehicle,{throttle:(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0),steer:(k.KeyA||k.ArrowLeft?1:0)-(k.KeyD||k.ArrowRight?1:0),handbrake:Boolean(k.Space),nitro:Boolean(k.ShiftLeft||k.ShiftRight)},w,fx,dt,el);}
updatePlayerOnFoot(pl,ip,cc.yaw,w,vh,dt);updateTrafficVehicles(vh,pl,w,fx,dt,el);
wn.update(dt,el,pl,vh,pd,w,fx);resolveVehicleCollisions(vh,fx);updatePedestrians(pd,pl,w,cb,dt);
if(ip.mouseDown)cb.firePlayerWeapon(pl,cc.yaw,cc.pitch,vh,pd,wn,rng);cb.update(dt,pl,vh,pd,wn);
updateMissionDirector(ms,dt,el,sc,pl,vh,pd,wn,rng);updateActivities(ac,dt,el,pl,fx);
updateCrewCooldowns(cr,dt);fx.update(dt);au.update(dt,el,pl,wn.state.stars);
}else if(!st.shotFrozen){updateTrafficVehicles(vh,pl,w,fx,dt,el);fx.update(dt);}
updateCameraController(cc,pl,st.mode==='play'?ip:null,dt,el);
updateWaterAndSky(env,st.timeOfDay,el,cc.camera.position.x,cc.camera.position.z);
}
let last=performance.now(),acc=0;
const draw=()=>{R.render(sc,cc.camera);if(st.mode==='play'){hud.update(st);fx.renderFloatingOverlay(fE,cc.camera,innerWidth,innerHeight);}else if(fE.childElementCount)fE.innerHTML='';};
const loop=ts=>{acc+=Math.min(.05,Math.max(0,(ts-last)/1000));last=ts;while(acc>=STEP){step(STEP);acc-=STEP;}draw();requestAnimationFrame(loop);};
addEventListener('resize',()=>{R.setSize(innerWidth,innerHeight,false);cc.camera.aspect=innerWidth/innerHeight;cc.camera.updateProjectionMatrix();});
step(STEP);draw();window.__SOLARIA__={state:st,setMode,step,triggerFavour:id=>triggerCrewFavour(id,cr,pl,wn,vh,ms,fx)};requestAnimationFrame(loop);
}
bootstrapSolariaBay();
