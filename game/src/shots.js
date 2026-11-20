// Deterministic gameplay scene staging behind ?shot=chase|heist|marina|map (and legacy start|play|end).
// Runs the real world simulation forward with scripted player controls so every screenshot
// is a genuine live render of Solaria Bay's 3D world, traffic, police, combat and HUD.

import { STEP } from './config.js';
import { updateCameraFollow } from './camera-3d.js';
import { startStoryMission } from './missions.js';
import { attemptEnterOrHijackVehicle } from './player.js';
import { setWantedLevelImmediate } from './police-wanted.js';
import { SCREEN_MAP_SAVE, SCREEN_PLAY, SCREEN_TITLE } from './render-hud.js';
import { createPedestrian } from './traffic-peds.js';
import { createVehicle } from './vehicles.js';

export function stageGameplayShot(shotName, worldState, stepSimulation, saveManager) {
  const { player, vehicles, pedestrians, wanted, missions, combat, camera, rng } = worldState;

  if (shotName === 'start') {
    for (let i = 0; i < 30; i += 1) {
      stepSimulation(STEP, { throttle: 0, steer: 0 });
    }
    return { screen: SCREEN_TITLE };
  }

  if (shotName === 'heist') {
    // Scene 2: On-foot firefight & carjacking in Solaria Downtown (Act II: Bullion Intercept)
    startStoryMission(missions, 1, worldState, rng);
    missions.bannerTimer = 0;
    player.inVehicle = false;
    player.vehicle = null;
    player.x = 0;
    player.y = 76;
    player.angle = -Math.PI * 0.5;
    player.aimAngle = -Math.PI * 0.52;
    player.cash = 42850;
    player.respect = 340;
    player.weaponIndex = 4; // Helios Heavy Carbine

    // Remove any random ambient traffic cars inside the immediate ambush intersection
    for (let i = vehicles.length - 1; i >= 0; i -= 1) {
      if (Math.hypot(vehicles[i].x, vehicles[i].y - 25) < 70) {
        vehicles.splice(i, 1);
      }
    }

    const roadster = createVehicle('solaria_roadster', 18, 46, -Math.PI * 0.42, rng, {
      color: '#ff477e',
      driverType: 'parked',
    });
    const bullionVan = createVehicle('boveda_van', -14, -14, 0.22, rng, {
      driverType: 'parked',
    });
    const copCruiser = createVehicle('sbpd_interceptor', 24, -36, 2.15, rng, {
      driverType: 'police',
      sirenActive: true,
    });
    vehicles.push(roadster, bullionVan, copCruiser);

    for (let g = 0; g < 3; g += 1) {
      const guard = createPedestrian(-16 + g * 16, 8 - (g % 2) * 14, rng, 'syndicate');
      pedestrians.push(guard);
    }

    setWantedLevelImmediate(wanted, 3, player.x, player.y);
    wanted.helicopter.active = false;

    for (let i = 0; i < 12; i += 1) {
      stepSimulation(STEP, {
        moveForward: 0,
        turnInput: 0,
        firing: i % 3 === 0,
        mouseAimActive: true,
        aimWorldPoint: { x: -4, y: -10 },
      });
    }

    // Position camera directly behind Valeria on the Downtown avenue
    player.x = 0;
    player.y = 74;
    player.angle = -Math.PI * 0.5;
    player.aimAngle = -Math.PI * 0.52;
    player.muzzleFlashTimer = 0.08;
    player.nearbyVehicle = roadster;

    camera.x = 0;
    camera.y = 175;
    camera.z = 46;
    camera.yaw = -Math.PI * 0.5;
    camera.pitch = 0.35;

    combat.floatingTexts.length = 0;
    combat.explosions.length = 0;
    combat.explosions.push({
      x: -24,
      y: -32,
      z: 10,
      radius: 22,
      maxRadius: 36,
      ttl: 0.45,
      maxTtl: 0.65,
    });
    combat.spawnFloatingText(10, 6, 20, '+$450 SYNDICATE LOOT', '#34d399');
    return { screen: SCREEN_PLAY };
  }

  if (shotName === 'marina') {
    // Scene 3: Starlight Marina, Coral Beachfront & Speedboat Pier (Act IV: Starlight Marina Run)
    startStoryMission(missions, 3, worldState, rng);
    missions.bannerTimer = 0;

    // Clear ambient traffic right at the Marina camera staging spot
    for (let i = vehicles.length - 1; i >= 0; i -= 1) {
      if (Math.hypot(vehicles[i].x - 490, vehicles[i].y - 110) < 55) {
        vehicles.splice(i, 1);
      }
    }

    const sabre = createVehicle('tormenta_sabre', 515, 132, -0.58, rng, {
      color: '#f59e0b',
      driverType: 'player',
    });
    const escortCop = createVehicle('sbpd_interceptor', 466, 122, -0.42, rng, {
      driverType: 'police',
      sirenActive: true,
    });
    const marinaBoat = createVehicle('corsair_jetboat', 705, 32, -Math.PI * 0.4, rng, {
      color: '#25f4ee',
      driverType: 'parked',
    });
    vehicles.push(sabre, escortCop, marinaBoat);

    player.inVehicle = true;
    player.vehicle = sabre;
    player.x = sabre.x;
    player.y = sabre.y;
    player.angle = sabre.angle;
    player.cash = 78400;
    player.respect = 620;
    sabre.speed = 215;

    setWantedLevelImmediate(wanted, 2, player.x, player.y);

    camera.x = 420;
    camera.y = 196;
    camera.z = 52;
    camera.yaw = -0.58;
    camera.pitch = 0.36;
    return { screen: SCREEN_PLAY };
  }

  if (shotName === 'map' || shotName === 'end') {
    // Scene 4: Solaria OS Tactical City Map, Story Campaign & Multi-Slot Saves
    if (saveManager) {
      startStoryMission(missions, 1, worldState, rng);
      player.cash = 52400;
      player.respect = 410;
      saveManager.saveGameProgress(1, worldState);
    }

    startStoryMission(missions, 2, worldState, rng);
    player.x = 460;
    player.y = -40;
    player.cash = 94200;
    player.respect = 780;
    player.stats.carsHijacked = 9;
    player.stats.missionsCompleted = 2;
    player.stats.copsEvaded = 5;
    player.stats.eliminations = 18;
    setWantedLevelImmediate(wanted, 4, player.x, player.y);

    for (let i = 0; i < 15; i += 1) {
      stepSimulation(STEP, { throttle: 0.4, steer: 0 });
    }
    if (saveManager) {
      saveManager.saveGameProgress(0, worldState);
    }
    return { screen: SCREEN_MAP_SAVE };
  }

  // Default / 'chase' / 'play': Cover Shot — High-Speed 4-Star Sunset Police & Chopper Chase on Ocean Palm Drive!
  startStoryMission(missions, 0, worldState, rng);
  player.x = 480;
  player.y = 15;
  attemptEnterOrHijackVehicle(player, vehicles);
  player.cash = 64500;
  player.respect = 480;

  for (let i = 0; i < 12; i += 1) {
    stepSimulation(STEP, { throttle: 1.0, steer: 0, handbrake: false, nitro: true });
  }

  // Stage exact chase formation along Ocean Palm Drive facing north with ocean & beach on right, art-deco hotels on left
  if (player.vehicle) {
    player.vehicle.x = 480;
    player.vehicle.y = -18;
    player.vehicle.angle = -Math.PI * 0.5;
    player.vehicle.speed = 295;
    player.vehicle.nitroActive = true;
    player.vehicle.drifting = true;
  }
  player.x = 480;
  player.y = -18;
  player.angle = -Math.PI * 0.5;

  missions.stageIndex = 1;
  missions.bannerTimer = 0;
  missions.dialogueSpeaker = 'Rico Vega';
  missions.dialogueText = 'SBPD tagged the plates! Floor it down Ocean Palm Drive before AIR-1 Falcon locks the bridge!';
  missions.dialogueTimer = 12.0;

  setWantedLevelImmediate(wanted, 4, player.x, player.y);

  const cop1 = createVehicle('sbpd_interceptor', 462, -96, Math.PI * 0.36, rng, {
    driverType: 'police',
    sirenActive: true,
  });
  const cop2 = createVehicle('sbpd_interceptor', 498, -132, Math.PI * 0.58, rng, {
    driverType: 'police',
    sirenActive: true,
  });
  const cop3 = createVehicle('sword_tactical', 476, -195, Math.PI * 0.5, rng, {
    driverType: 'police',
    sirenActive: true,
  });
  const trafficCoupe = createVehicle('solaria_roadster', 456, -155, -Math.PI * 0.5, rng, {
    color: '#ff477e',
    driverType: 'traffic',
  });
  vehicles.push(cop1, cop2, cop3, trafficCoupe);

  wanted.helicopter.active = true;
  wanted.helicopter.x = 452;
  wanted.helicopter.y = -165;
  wanted.helicopter.z = 74;
  wanted.helicopter.angle = 0.6;
  wanted.helicopter.spotlightX = 478;
  wanted.helicopter.spotlightY = -88;

  camera.x = 480;
  camera.y = 88;
  camera.z = 46;
  camera.yaw = -Math.PI * 0.5;
  camera.pitch = 0.34;
  updateCameraFollow(camera, player, 0.016, 1280, 720);

  return { screen: SCREEN_PLAY };
}
