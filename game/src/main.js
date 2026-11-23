// Main entry point & real-time WebGL game loop for Solaria Bay: Sun & Syndicate.
// Initializes Three.js r169 with ACESFilmicToneMapping, SRGBColorSpace, PCFSoftShadowMap,
// and coordinates all 21 modular open-world systems.

import * as THREE from 'three';
import { STEP, WORLD } from './config.js';
import { createRng } from './random.js';
import { createProceduralTexturePack } from './textures-procedural.js';
import { createWaterAndSky, updateWaterAndSky } from './water-sky.js';
import { buildSolariaWorld, updateWorldLandmarks } from './world-city.js';
import { createEffectsSystem } from './effects-particles.js';
import { resolveVehicleCollisions, stepVehiclePhysics } from './vehicles.js';
import { createPlayer, enterOrExitVehicle, updatePlayerOnFoot } from './player-onfoot.js';
import { populateAmbientCity, updatePedestrians, updateTrafficVehicles } from './traffic-peds.js';
import { createCombatSystem } from './combat-weapons.js';
import { createPoliceDispatch } from './police-dispatch.js';
import { createMissionDirector, startMission, updateMissionDirector } from './missions-story.js';
import { createActivitiesSystem, updateActivities } from './activities-economy.js';
import { createCrewProgression, triggerCrewFavour, updateCrewCooldowns } from './crew-progression.js';
import { createCameraController, updateCameraController } from './camera-controller.js';
import { createAudioRadio } from './audio-radio.js';
import { createInputController } from './input.js';
import { createHudManager } from './hud-minimap.js';
import { createMenuManager } from './menus-map-save.js';
import { createSaveSystem } from './save-system.js';
import { stageShowcaseShot } from './shots.js';

function bootstrapSolariaBay() {
  const params = new URLSearchParams(window.location.search);
  const shotName = params.get('shot');
  const seed = Number(params.get('seed')) || 1;
  const rng = createRng(seed);

  const canvas = document.getElementById('game');
  const hudRoot = document.getElementById('hud-layer');
  const menuRoot = document.getElementById('menu-layer');
  const fxOverlay = document.getElementById('fx-overlay');
  const statusEl = document.getElementById('status');

  // True Real-Time 3D WebGLRenderer setup
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const textures = createProceduralTexturePack();
  const env = createWaterAndSky(scene);
  const world = buildSolariaWorld(scene, textures, rng);
  const effects = createEffectsSystem(scene);
  const audio = createAudioRadio();
  const combat = createCombatSystem(scene, effects, audio);
  const wanted = createPoliceDispatch(scene, rng);
  const missions = createMissionDirector(scene);
  const activities = createActivitiesSystem(scene);
  const crew = createCrewProgression();
  const saveSystem = createSaveSystem();
  saveSystem.ensurePopulatedSlots();

  const vehicles = [];
  const pedestrians = [];
  const player = createPlayer(scene);
  populateAmbientCity(scene, vehicles, pedestrians, rng);

  const cameraCtrl = createCameraController(window.innerWidth / window.innerHeight);

  const state = {
    scene,
    renderer,
    world,
    env,
    effects,
    audio,
    combat,
    wanted,
    missions,
    activities,
    crew,
    saveSystem,
    cameraCtrl,
    player,
    vehicles,
    pedestrians,
    rng,
    timeOfDay: WORLD.defaultTime,
    elapsed: 0,
    mode: 'title', // title | play | atlas
    shotFrozen: Boolean(shotName),
  };

  const hud = createHudManager(hudRoot);

  function setMode(nextMode) {
    state.mode = nextMode;
    hudRoot.classList.toggle('hidden', nextMode !== 'play');
    menuRoot.classList.toggle('hidden', nextMode === 'play');
    if (nextMode === 'title') {
      if (!state.shotFrozen) cameraCtrl.mode = 'panorama';
      menus.renderTitle(state);
      statusEl.textContent = 'Solaria Bay: Sun & Syndicate — Start Screen.';
    } else if (nextMode === 'atlas') {
      menus.renderAtlas(state);
      statusEl.textContent = 'Solaria Bay Tactical Atlas & Pause Menu open.';
    } else {
      if (!state.shotFrozen) cameraCtrl.mode = 'gameplay';
      statusEl.textContent = 'Playing Solaria Bay: Sun & Syndicate.';
    }
  }

  const menus = createMenuManager(menuRoot, {
    continueGame() {
      audio.ensureContext();
      saveSystem.loadSlot(0, state);
      state.shotFrozen = false;
      setMode('play');
    },
    newGame() {
      audio.ensureContext();
      state.shotFrozen = false;
      player.cash = 48500;
      player.respect = 420;
      player.health = 100;
      player.armor = 85;
      player.x = 240;
      player.z = -90;
      startMission(missions, 0, 0, scene, vehicles, pedestrians, rng);
      wanted.clearHeat(5, vehicles);
      setMode('play');
    },
    openAtlas() {
      audio.ensureContext();
      setMode('atlas');
    },
    resumeGame() {
      setMode('play');
    },
    showTitle() {
      setMode('title');
    },
    saveSlot(idx) {
      saveSystem.saveSlot(idx, state);
      statusEl.textContent = `Game saved to Slot ${idx + 1}.`;
    },
    loadSlot(idx) {
      audio.ensureContext();
      saveSystem.loadSlot(idx, state);
      state.shotFrozen = false;
      setMode('play');
    },
    setTimeOfDay(tod) {
      state.timeOfDay = tod;
    },
  });

  const input = createInputController(canvas, {
    onUserGesture() { audio.ensureContext(); },
    onInteract() {
      if (state.mode !== 'play') return;
      audio.ensureContext();
      const res = enterOrExitVehicle(player, vehicles, wanted);
      if (!res && player.nearbyPoi) {
        menus.setActiveTab('GARAGE');
        setMode('atlas');
      }
    },
    onCycleRadio() {
      if (state.mode !== 'play') return;
      const st = audio.cycleStation();
      statusEl.textContent = `Tuned radio to ${st.name}`;
    },
    onToggleAtlas() {
      if (state.mode === 'title') {
        setMode('play');
      } else if (state.mode === 'play') {
        input.clearAll();
        setMode('atlas');
      } else {
        setMode('play');
      }
    },
    onSelectWeapon(idx) {
      if (state.mode === 'play') player.weaponIndex = idx;
    },
    onWheelWeapon(dir) {
      if (state.mode === 'play') player.weaponIndex = (player.weaponIndex + dir + 8) % 8;
    },
    onCrewFavour(id) {
      if (state.mode !== 'play') return;
      triggerCrewFavour(id, crew, player, wanted, vehicles, missions, effects);
    },
    onQuickSave() {
      saveSystem.saveSlot(0, state);
      missions.bannerText = 'QUICK SAVED · SLOT 1';
      missions.bannerTimer = 2.2;
    },
    onQuickLoad() {
      if (saveSystem.loadSlot(0, state)) {
        missions.bannerText = 'QUICK LOADED · SLOT 1';
        missions.bannerTimer = 2.2;
      }
    },
  });

  // Start either in deterministic ?shot= showcase or live Title Panorama
  if (shotName) {
    const mode = stageShowcaseShot(shotName, state);
    setMode(mode);
  } else {
    startMission(missions, 0, 0, scene, vehicles, pedestrians, rng);
    setMode('title');
  }

  function stepSimulation(dt) {
    state.elapsed += dt;
    updateWorldLandmarks(world, dt, state.elapsed, state.timeOfDay);

    if (state.mode === 'play' && !state.shotFrozen) {
      state.timeOfDay = (state.timeOfDay + dt * 0.004) % 24;

      if (player.inVehicle && player.vehicle) {
        const throttle = (input.keys.KeyW || input.keys.ArrowUp ? 1 : 0) - (input.keys.KeyS || input.keys.ArrowDown ? 1 : 0);
        const steer = (input.keys.KeyA || input.keys.ArrowLeft ? 1 : 0) - (input.keys.KeyD || input.keys.ArrowRight ? 1 : 0);
        const handbrake = Boolean(input.keys.Space);
        const nitro = Boolean(input.keys.ShiftLeft || input.keys.ShiftRight);
        stepVehiclePhysics(player.vehicle, { throttle, steer, handbrake, nitro }, world, effects, dt, state.elapsed);
      }

      updatePlayerOnFoot(player, input, cameraCtrl.yaw, world, vehicles, dt);
      updateTrafficVehicles(vehicles, player, world, effects, dt, state.elapsed);
      wanted.update(dt, state.elapsed, player, vehicles, pedestrians, world, effects);
      resolveVehicleCollisions(vehicles, effects);
      updatePedestrians(pedestrians, player, world, combat, dt);

      if (input.mouseDown) {
        combat.firePlayerWeapon(player, cameraCtrl.yaw, cameraCtrl.pitch, vehicles, pedestrians, wanted, rng);
      }
      combat.update(dt, player, vehicles, pedestrians, wanted);
      updateMissionDirector(missions, dt, state.elapsed, scene, player, vehicles, pedestrians, wanted, rng);
      updateActivities(activities, dt, state.elapsed, player, effects);
      updateCrewCooldowns(crew, dt);
      effects.update(dt);
      audio.update(dt, state.elapsed, player, wanted.state.stars);
    } else if (!state.shotFrozen) {
      updateTrafficVehicles(vehicles, player, world, effects, dt, state.elapsed);
      effects.update(dt);
    }

    updateCameraController(cameraCtrl, player, state.mode === 'play' ? input : null, dt, state.elapsed);
    updateWaterAndSky(env, state.timeOfDay, state.elapsed, cameraCtrl.camera.position.x, cameraCtrl.camera.position.z);
  }

  let lastTs = performance.now();
  let accum = 0;

  function renderFrame(ts) {
    const dt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000));
    lastTs = ts;
    accum += dt;
    while (accum >= STEP) {
      stepSimulation(STEP);
      accum -= STEP;
    }

    renderer.render(scene, cameraCtrl.camera);
    if (state.mode === 'play') {
      hud.update(state);
      effects.renderFloatingOverlay(fxOverlay, cameraCtrl.camera, window.innerWidth, window.innerHeight);
    } else if (fxOverlay.childElementCount > 0) {
      fxOverlay.innerHTML = '';
    }
    requestAnimationFrame(renderFrame);
  }

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    cameraCtrl.camera.aspect = window.innerWidth / window.innerHeight;
    cameraCtrl.camera.updateProjectionMatrix();
  });

  // First immediate synchronous frame so headless/WebGL screenshot captures never catch a blank frame
  stepSimulation(STEP);
  renderer.render(scene, cameraCtrl.camera);
  if (state.mode === 'play') {
    hud.update(state);
    effects.renderFloatingOverlay(fxOverlay, cameraCtrl.camera, window.innerWidth, window.innerHeight);
  }

  // Expose live diagnostics & test bridge
  window.__SOLARIA__ = {
    state,
    setMode,
    step: stepSimulation,
    triggerFavour: (id) => triggerCrewFavour(id, crew, player, wanted, vehicles, missions, effects),
  };

  requestAnimationFrame(renderFrame);
}

bootstrapSolariaBay();
