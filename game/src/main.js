// Main entry and simulation loop for Solaria Bay: Sun & Syndicate.
// Coordinates the 3D city map, player character, vehicle fleet, autonomous traffic and
// pedestrians, 5-star SBPD & helicopter pursuit system, 5-act story campaign, combat,
// procedural Web Audio radio stations, persistent save slots and screenshot staging.

import { STEP } from './config.js';
import { createSoundEngine } from './audio.js';
import { createCamera3D, cycleCameraMode, updateCameraFollow } from './camera-3d.js';
import { createCityMap, getDistrictAt } from './city-map.js';
import { createCombatAndEffects } from './combat-effects.js';
import { createInputController } from './input.js';
import { createMissionDirector, startStoryMission, updateActiveMission } from './missions.js';
import {
  attemptEnterOrHijackVehicle,
  createPlayerState,
  cyclePlayerWeapon,
  selectPlayerWeapon,
  updatePlayerOnFoot,
} from './player.js';
import {
  clearWantedLevel,
  createWantedSystem,
  reportPlayerCrime,
  updatePolicePursuit,
} from './police-wanted.js';
import { createSeededRandom } from './random.js';
import { createSaveManager } from './save-storage.js';
import {
  alertNearbyPedestrians,
  createTrafficAndPedestrians,
  updatePedestrianAI,
  updateTrafficVehicles,
} from './traffic-peds.js';
import { resolveVehicleCollisions, updateVehiclePhysics } from './vehicles.js';
import { stageGameplayShot } from './shots.js';
import {
  SCREEN_BUSTED,
  SCREEN_MAP_SAVE,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WASTED,
  createHudRenderer,
} from './render-hud.js';
import { createWorldRenderer } from './render-world.js';

const MAX_FRAME_DELTA = 0.25;

const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const initialSeed = Number.isInteger(seedParam) ? seedParam : 20261121;

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

function announceStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function createSolariaWorld(seed) {
  const rng = createSeededRandom(seed);
  const cityMap = createCityMap(seed);
  const camera = createCamera3D();
  const player = createPlayerState();
  const { vehicles, pedestrians, cashDrops } = createTrafficAndPedestrians(cityMap, rng);
  const wanted = createWantedSystem();
  const missions = createMissionDirector();
  const combat = createCombatAndEffects();
  const audio = createSoundEngine();
  const skidmarks = [];

  const worldState = {
    seed,
    rng,
    simTime: 0,
    cityMap,
    camera,
    player,
    vehicles,
    pedestrians,
    cashDrops,
    skidmarks,
    wanted,
    missions,
    combat,
    audio,
  };

  startStoryMission(missions, 0, worldState, rng);
  updateCameraFollow(camera, player, 1.0, canvas.width, canvas.height);
  return worldState;
}

const worldState = createSolariaWorld(initialSeed);
const worldRenderer = createWorldRenderer();
const hudRenderer = createHudRenderer();
const saveManager = createSaveManager();

function stepSimulationFrame(dt, controls) {
  worldState.simTime += dt;
  const {
    rng,
    cityMap,
    camera,
    player,
    vehicles,
    pedestrians,
    cashDrops,
    skidmarks,
    wanted,
    missions,
    combat,
    audio,
  } = worldState;

  if (player.inVehicle && player.vehicle) {
    updateVehiclePhysics(player.vehicle, controls, cityMap, skidmarks, dt);
  }

  updatePlayerOnFoot(player, controls, camera, cityMap, vehicles, dt);

  if (controls.firing) {
    const fired = combat.firePlayerWeapon(worldState, rng);
    if (fired) audio.playSoundEffect('gunshot');
  }

  updateTrafficVehicles(vehicles, cityMap, worldState.simTime, skidmarks, rng, dt);

  const collisions = resolveVehicleCollisions(vehicles);
  for (let i = 0; i < collisions.length; i += 1) {
    const c = collisions[i];
    if ((c.a === player.vehicle || c.b === player.vehicle) && (c.a.isPolice || c.b.isPolice)) {
      reportPlayerCrime(wanted, 'police_theft', player.x, player.y);
    }
  }

  updatePedestrianAI(pedestrians, cashDrops, player, vehicles, cityMap, combat, wanted, rng, dt);
  combat.updateCombatAndEffects(worldState, rng, dt);

  const pursuitOutcome = updatePolicePursuit(
    wanted,
    player,
    vehicles,
    pedestrians,
    cityMap,
    combat,
    skidmarks,
    rng,
    dt,
  );

  const missionOutcome = updateActiveMission(missions, worldState, rng, dt);
  if (missionOutcome && missionOutcome.event === 'mission_complete') {
    audio.playSoundEffect('mission_complete');
    saveManager.saveGameProgress(0, worldState);
    announceStatus(`Mission passed: ${missionOutcome.mission.title}. Progress auto-saved.`);
  }

  audio.updateEngineAndSirenAudio(player, wanted, dt);
  updateCameraFollow(camera, player, dt, canvas.width, canvas.height);

  if (player.health <= 0) return SCREEN_WASTED;
  if (pursuitOutcome === 'busted') return SCREEN_BUSTED;
  return null;
}

function handleLandmarkInteraction() {
  const { player, wanted, combat, audio } = worldState;
  const lm = player.nearbyLandmark;
  if (!lm) return;

  if (lm.kind === 'safehouse') {
    player.health = player.maxHealth;
    player.armor = player.maxArmor;
    saveManager.saveGameProgress(0, worldState);
    combat.spawnFloatingText(player.x, player.y, 24, 'GAME SAVED & HEALED!', '#25f4ee');
    audio.playSoundEffect('mission_complete');
    announceStatus('Progress saved at Oceanfront Penthouse.');
  } else if (lm.kind === 'customs') {
    if (player.cash >= 1000) {
      player.cash -= 1000;
      if (player.vehicle) {
        player.vehicle.health = player.vehicle.maxHealth;
        const palette = ['#00f0ff', '#ff3b77', '#fde047', '#a855f7', '#34d399'];
        player.vehicle.color = palette[Math.floor(worldState.rng() * palette.length)];
      }
      clearWantedLevel(wanted, player);
      combat.spawnFloatingText(player.x, player.y, 24, 'RESPRAYED & WANTED CLEARED!', '#c084fc');
      audio.playSoundEffect('cash');
      announceStatus('Vehicle resprayed and Wanted level cleared.');
    }
  } else if (lm.kind === 'armory') {
    if (player.cash >= 500) {
      player.cash -= 500;
      player.armor = player.maxArmor;
      Object.keys(player.ammo).forEach((k) => {
        player.ammo[k] = Math.max(player.ammo[k], 240);
      });
      combat.spawnFloatingText(player.x, player.y, 24, 'AMMO & ARMOR RESTOCKED!', '#fb923c');
      audio.playSoundEffect('cash');
      announceStatus('Full ammo and body armor restocked.');
    }
  }
}

function respawnPlayerAfterIncident(incidentScreen) {
  const { player, wanted } = worldState;
  if (player.inVehicle) {
    player.inVehicle = false;
    player.vehicle = null;
  }
  player.health = player.maxHealth;
  player.armor = 50;
  player.x = 455;
  player.y = 45;
  if (incidentScreen === SCREEN_BUSTED) {
    player.cash = Math.max(0, player.cash - 1500);
  }
  clearWantedLevel(wanted, player);
}

function resizeCanvasToViewport() {
  const w = window.innerWidth || 1280;
  const h = window.innerHeight || 720;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function runDeterministicShotMode(shotName) {
  canvas.width = 1280;
  canvas.height = 720;
  const staged = stageGameplayShot(shotName, worldState, stepSimulationFrame, saveManager);
  let framesPainted = 0;

  function paintShotFrame() {
    worldRenderer.renderWorld(ctx, worldState);
    hudRenderer.renderHud(ctx, worldState, staged.screen, saveManager.getSaveSlotsSummary());
    framesPainted += 1;
    if (framesPainted < 2) {
      requestAnimationFrame(paintShotFrame);
    } else {
      window.__shotReady = true;
      document.body.dataset.shotReady = 'true';
      const downloadName = params.get('download');
      if (downloadName) {
        const link = document.createElement('a');
        link.download = downloadName;
        link.href = canvas.toDataURL('image/jpeg', 0.90);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    }
  }
  requestAnimationFrame(paintShotFrame);
}

function startSolariaGame() {
  resizeCanvasToViewport();
  window.addEventListener('resize', resizeCanvasToViewport);

  const input = createInputController(canvas);
  let activeScreen = params.get('autostart') === '1' ? SCREEN_PLAY : SCREEN_TITLE;
  let accumulator = 0;
  let lastTime = performance.now();

  function processShortcutTriggers() {
    const confirmPressed = input.consumeTrigger('Enter')
      || input.consumeTrigger('Space')
      || input.consumeTrigger('MouseLeft');

    if (activeScreen === SCREEN_TITLE) {
      if (confirmPressed || input.consumeTrigger('KeyF')) {
        activeScreen = SCREEN_PLAY;
        const district = getDistrictAt(worldState.player.x, worldState.player.y);
        announceStatus(`Entering Solaria Bay — ${district.name}.`);
      }
      return;
    }

    if (activeScreen === SCREEN_WASTED || activeScreen === SCREEN_BUSTED) {
      if (confirmPressed) {
        respawnPlayerAfterIncident(activeScreen);
        activeScreen = SCREEN_PLAY;
      }
      return;
    }

    if (input.consumeTrigger('KeyM') || input.consumeTrigger('Escape') || input.consumeTrigger('Tab')) {
      activeScreen = activeScreen === SCREEN_MAP_SAVE ? SCREEN_PLAY : SCREEN_MAP_SAVE;
      return;
    }

    if (input.consumeTrigger('F5')) {
      saveManager.saveGameProgress(0, worldState);
      worldState.combat.spawnFloatingText(worldState.player.x, worldState.player.y, 24, 'QUICK SAVED (SLOT 1)', '#34d399');
      worldState.audio.playSoundEffect('cash');
    }

    if (input.consumeTrigger('F9')) {
      const loaded = saveManager.loadGameProgress(0, worldState, worldState.rng);
      if (loaded) {
        worldState.combat.spawnFloatingText(worldState.player.x, worldState.player.y, 24, 'SAVE LOADED!', '#25f4ee');
        activeScreen = SCREEN_PLAY;
      }
    }

    if (activeScreen !== SCREEN_PLAY) return;

    if (input.consumeTrigger('KeyF') || input.consumeTrigger('Enter')) {
      const result = attemptEnterOrHijackVehicle(worldState.player, worldState.vehicles);
      if (result && result.action === 'entered') {
        worldState.audio.playSoundEffect('carjack');
        if (result.policeTheft) {
          reportPlayerCrime(worldState.wanted, 'police_theft', worldState.player.x, worldState.player.y);
        } else if (result.hijacked) {
          reportPlayerCrime(worldState.wanted, 'carjacking', worldState.player.x, worldState.player.y);
          alertNearbyPedestrians(worldState.pedestrians, worldState.player.x, worldState.player.y, 180);
        }
        announceStatus(`Driving ${result.vehicle.name}.`);
      } else if (result && result.action === 'exited') {
        announceStatus('On foot.');
      }
    }

    if (input.consumeTrigger('KeyQ')) cyclePlayerWeapon(worldState.player, -1);
    if (input.consumeTrigger('KeyE')) cyclePlayerWeapon(worldState.player, 1);
    if (input.consumeTrigger('Digit1')) selectPlayerWeapon(worldState.player, 0);
    if (input.consumeTrigger('Digit2')) selectPlayerWeapon(worldState.player, 1);
    if (input.consumeTrigger('Digit3')) selectPlayerWeapon(worldState.player, 2);
    if (input.consumeTrigger('Digit4')) selectPlayerWeapon(worldState.player, 3);
    if (input.consumeTrigger('Digit5')) selectPlayerWeapon(worldState.player, 4);

    if (input.consumeTrigger('KeyV')) {
      const mode = cycleCameraMode(worldState.camera);
      announceStatus(`Camera mode: ${mode.name}`);
    }

    if (input.consumeTrigger('KeyR')) {
      const st = worldState.audio.cycleRadioStation();
      announceStatus(`Radio tuned to ${st.name}`);
    }

    if (input.consumeTrigger('KeyN')) {
      handleLandmarkInteraction();
    }
  }

  function frameLoop(now) {
    requestAnimationFrame(frameLoop);
    const delta = Math.min((now - lastTime) / 1000, MAX_FRAME_DELTA);
    lastTime = now;

    processShortcutTriggers();
    const controls = input.pollInputState(worldState.camera, delta);

    if (activeScreen === SCREEN_PLAY) {
      accumulator += delta;
      while (accumulator >= STEP && activeScreen === SCREEN_PLAY) {
        const nextScreen = stepSimulationFrame(STEP, controls);
        if (nextScreen) activeScreen = nextScreen;
        accumulator -= STEP;
      }
    } else if (activeScreen === SCREEN_TITLE) {
      // Gently animate background city traffic on title screen
      accumulator += delta;
      while (accumulator >= STEP) {
        stepSimulationFrame(STEP, { throttle: 0, steer: 0 });
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }

    worldRenderer.renderWorld(ctx, worldState);
    hudRenderer.renderHud(ctx, worldState, activeScreen, saveManager.getSaveSlotsSummary());
  }

  requestAnimationFrame(frameLoop);
}

if (shotParam) {
  runDeterministicShotMode(shotParam);
} else {
  startSolariaGame();
}
