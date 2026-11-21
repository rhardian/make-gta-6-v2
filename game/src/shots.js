// Deterministic gameplay scene staging behind ?shot=chase|heist|marina|map (and legacy start|play|end).
// Runs the real world simulation forward with scripted player controls so every screenshot
// is a genuine live render of Solaria Bay's 3D world, traffic, police, boats, combat and HUD.

import { STEP } from './config.js';
import { updateCameraFollow } from './camera-3d.js';
import { startStoryMission } from './missions.js';
import { attemptEnterOrHijackVehicle } from './player.js';
import { setWantedLevelImmediate, spawnPoliceRoadblock } from './police-wanted.js';
import { SCREEN_MAP_SAVE, SCREEN_PLAY, SCREEN_TITLE } from './render-hud.js';
import { createPedestrian } from './traffic-peds.js';
import { createVehicle } from './vehicles.js';

export function stageGameplayShot(shotName, worldState, stepSimulation, saveManager) {
  const { player, vehicles, pedestrians, cashDrops, skidmarks, wanted, missions, combat, camera, rng } = worldState;

  if (shotName === 'start') {
    for (let i = 0; i < 30; i += 1) {
      stepSimulation(STEP, { throttle: 0, steer: 0 });
    }
    return { screen: SCREEN_TITLE };
  }

  if (shotName === 'heist') {
    // Scene 2 (2-heist.jpg): Intense Downtown Solaria armored convoy heist shootout on foot
    startStoryMission(missions, 1, worldState, rng);
    missions.bannerTimer = 0;
    player.inVehicle = false;
    player.vehicle = null;
    player.x = -3;
    player.y = 74;
    player.angle = -Math.PI * 0.5;
    player.aimAngle = -Math.PI * 0.51;
    player.cash = 42850;
    player.respect = 340;
    player.weaponIndex = 4; // Helios Heavy Carbine

    for (let i = vehicles.length - 1; i >= 0; i -= 1) {
      if (Math.hypot(vehicles[i].x, vehicles[i].y - 15) < 95) {
        vehicles.splice(i, 1);
      }
    }

    const roadster = createVehicle('solaria_roadster', 17, 46, -Math.PI * 0.42, rng, {
      color: '#ff477e',
      underglowColor: '#ff2a78',
      driverType: 'parked',
    });
    const bullionVan = createVehicle('boveda_van', 4, -18, 0.22, rng, {
      driverType: 'parked',
    });
    const explodingEscort = createVehicle('brutus_suv', -22, -26, -0.45, rng, {
      color: '#1e293b',
      driverType: 'parked',
    });
    explodingEscort.destroyed = true;
    const copCruiser = createVehicle('sbpd_interceptor', 26, -42, 2.15, rng, {
      driverType: 'police',
      sirenActive: true,
    });
    vehicles.push(roadster, bullionVan, explodingEscort, copCruiser);

    // Crew partner Rico Vega & articulated Syndicate guards with muzzle flashes
    const rico = createPedestrian(-24, 54, rng, 'partner', {
      name: 'Rico Vega',
      angle: -Math.PI * 0.44,
      aimAngle: -Math.PI * 0.44,
      muzzleFlashTimer: 0.12,
    });
    pedestrians.push(rico);

    const guardCoords = [[-15, 8], [1, 6], [16, 10], [-7, -7]];
    for (let g = 0; g < guardCoords.length; g += 1) {
      const [gx, gy] = guardCoords[g];
      const guard = createPedestrian(gx, gy, rng, 'syndicate', {
        angle: Math.PI * 0.5,
        aimAngle: Math.PI * 0.5,
        muzzleFlashTimer: g % 2 === 0 ? 0.12 : 0,
      });
      guard.health = g === 1 ? 45 : 75;
      pedestrians.push(guard);
    }

    // Fleeing civilian pedestrian bystanders on left & right sidewalks
    const fleeCoords = [[-34, 42], [-35, 12], [34, 36], [35, 4]];
    for (let f = 0; f < fleeCoords.length; f += 1) {
      const bystander = createPedestrian(fleeCoords[f][0], fleeCoords[f][1], rng, 'civilian', {
        angle: f < 2 ? -Math.PI * 0.55 : Math.PI * 0.45,
        panicTimer: 6.0,
      });
      pedestrians.push(bystander);
    }

    setWantedLevelImmediate(wanted, 3, player.x, player.y);
    wanted.helicopter.active = false;

    for (let i = 0; i < 8; i += 1) {
      stepSimulation(STEP, {
        moveForward: 0,
        turnInput: 0,
        firing: i % 2 === 0,
        mouseAimActive: true,
        aimWorldPoint: { x: 0, y: -12 },
      });
    }

    player.x = -3;
    player.y = 74;
    player.angle = -Math.PI * 0.5;
    player.aimAngle = -Math.PI * 0.51;
    player.muzzleFlashTimer = 0.12;
    player.nearbyVehicle = roadster;

    // Stage high-visibility bullet tracers & cash drops
    combat.projectiles.length = 0;
    combat.projectiles.push(
      { owner: 'player', x: -2, y: 42, z: 10.5, vx: 18, vy: -820, angle: -1.55, damage: 45, traveled: 20, maxRange: 500, color: '#fde047' },
      { owner: 'player', x: -12, y: 26, z: 10.5, vx: 45, vy: -780, angle: -1.51, damage: 45, traveled: 35, maxRange: 500, color: '#25f4ee' },
      { owner: 'syndicate', x: -13, y: 24, z: 10.5, vx: 30, vy: 540, angle: 1.52, damage: 9, traveled: 15, maxRange: 300, color: '#fb7185' },
      { owner: 'syndicate', x: 12, y: 28, z: 10.5, vx: -55, vy: 540, angle: 1.65, damage: 9, traveled: 18, maxRange: 300, color: '#fb7185' },
    );

    cashDrops.push(
      { x: -10, y: 24, amount: 450, ttl: 25 },
      { x: 6, y: 20, amount: 900, ttl: 25 },
    );

    camera.x = 0;
    camera.y = 174;
    camera.z = 46;
    camera.yaw = -Math.PI * 0.5;
    camera.pitch = 0.35;

    combat.floatingTexts.length = 0;
    combat.explosions.length = 0;
    combat.explosions.push({
      x: -22,
      y: -26,
      z: 11,
      radius: 28,
      maxRadius: 42,
      ttl: 0.48,
      maxTtl: 0.65,
    });
    combat.spawnFloatingText(14, 12, 22, '+$450 SYNDICATE LOOT', '#34d399');
    combat.spawnFloatingText(-20, -26, 33, '-68 CRIT! ESCORT DOWN', '#fde047');
    return { screen: SCREEN_PLAY };
  }

  if (shotName === 'marina') {
    // Scene 3 (3-marina.jpg): Piloting Corsair Jetboat on bay water with wake spray, police boat, chopper & Ferris Wheel
    startStoryMission(missions, 3, worldState, rng);
    missions.stageIndex = 1;
    missions.bannerTimer = 0;
    missions.dialogueSpeaker = 'Valeria Reyes';
    missions.dialogueText = 'Piloting the Corsair Jetboat past the Starlight Ferris Wheel! SBPD Harbor Patrol & AIR-1 on my wake!';
    missions.dialogueTimer = 12.0;

    const playerBoat = createVehicle('corsair_jetboat', 748, 170, -2.04, rng, {
      color: '#25f4ee',
      stripeColor: '#ff2a78',
      driverType: 'player',
    });
    playerBoat.speed = 278;
    playerBoat.vx = Math.cos(playerBoat.angle) * 278;
    playerBoat.vy = Math.sin(playerBoat.angle) * 278;

    const patrolBoat = createVehicle('sbpd_harbor_patrol', 764, 116, -1.84, rng, {
      driverType: 'police',
      sirenActive: true,
    });
    patrolBoat.speed = 250;

    const coastalCoupe = createVehicle('mako_gtr', 494, 52, -Math.PI * 0.5, rng, {
      color: '#ff3b77',
      driverType: 'traffic',
    });
    const coastalRoadster = createVehicle('solaria_roadster', 494, -20, -Math.PI * 0.5, rng, {
      color: '#facc15',
      driverType: 'traffic',
    });
    vehicles.push(playerBoat, patrolBoat, coastalCoupe, coastalRoadster);

    // Pedestrians on the Starlight Marina boardwalk pier and sandy beach
    const marinaPeds = [
      [685, 52, '#ff5e8e'],
      [712, 66, '#facc15'],
      [742, 54, '#25f4ee'],
      [575, 84, '#a855f7'],
      [588, 35, '#34d399'],
      [565, -18, '#fb923c'],
    ];
    for (let i = 0; i < marinaPeds.length; i += 1) {
      const [px, py, shirt] = marinaPeds[i];
      pedestrians.push(createPedestrian(px, py, rng, 'civilian', {
        shirtColor: shirt,
        angle: -Math.PI * 0.5,
      }));
    }

    player.inVehicle = true;
    player.vehicle = playerBoat;
    player.x = playerBoat.x;
    player.y = playerBoat.y;
    player.angle = playerBoat.angle;
    player.cash = 78400;
    player.respect = 620;

    setWantedLevelImmediate(wanted, 3, player.x, player.y);
    wanted.helicopter.active = true;
    wanted.helicopter.x = 678;
    wanted.helicopter.y = 14;
    wanted.helicopter.z = 78;
    wanted.helicopter.angle = 0.85;
    wanted.helicopter.rotorAngle = 0.75;
    wanted.helicopter.spotlightX = 724;
    wanted.helicopter.spotlightY = 122;

    camera.x = 804;
    camera.y = 268;
    camera.z = 48;
    camera.yaw = -2.04;
    camera.pitch = 0.34;
    return { screen: SCREEN_PLAY };
  }

  if (shotName === 'map' || shotName === 'end') {
    // Scene 4 (4-map.jpg): Split Translucent Solaria OS Tactical City Map, Campaign, Customs, Radial Wheel & Live 3D View
    if (saveManager) {
      startStoryMission(missions, 1, worldState, rng);
      player.cash = 52400;
      player.respect = 410;
      saveManager.saveGameProgress(1, worldState);
    }

    startStoryMission(missions, 2, worldState, rng);
    player.inVehicle = false;
    player.vehicle = null;
    player.x = 468;
    player.y = 26;
    player.angle = -Math.PI * 0.42;
    player.aimAngle = -Math.PI * 0.42;
    player.weaponIndex = 4; // Helios Heavy Carbine highlighted in Radial Weapon Wheel
    player.cash = 94200;
    player.respect = 780;
    player.stats.carsHijacked = 9;
    player.stats.missionsCompleted = 2;
    player.stats.copsEvaded = 5;
    player.stats.eliminations = 18;
    setWantedLevelImmediate(wanted, 4, player.x, player.y);

    // Clear random ambient cars at the center stage spot so custom car & crew partner stand out cleanly
    for (let i = vehicles.length - 1; i >= 0; i -= 1) {
      if (Math.hypot(vehicles[i].x - 480, vehicles[i].y - 18) < 65) {
        vehicles.splice(i, 1);
      }
    }

    const customGtr = createVehicle('mako_gtr', 484, 14, -Math.PI * 0.36, rng, {
      color: '#00f0ff',
      stripeColor: '#0b1020',
      underglowColor: '#25f4ee',
      hasSpoiler: true,
      customTier: 3,
      driverType: 'parked',
    });
    customGtr.nitroActive = true;
    const backgroundCop = createVehicle('sbpd_interceptor', 474, -85, Math.PI * 0.48, rng, {
      driverType: 'police',
      sirenActive: true,
    });
    vehicles.push(customGtr, backgroundCop);
    player.nearbyVehicle = customGtr;

    const ricoPartner = createPedestrian(497, 25, rng, 'partner', {
      name: 'Rico Vega',
      angle: -Math.PI * 0.58,
      aimAngle: -Math.PI * 0.58,
    });
    const strollPed1 = createPedestrian(446, -24, rng, 'civilian', { shirtColor: '#ff5e8e', angle: -Math.PI * 0.5 });
    const strollPed2 = createPedestrian(522, -32, rng, 'civilian', { shirtColor: '#facc15', angle: Math.PI * 0.5 });
    pedestrians.push(ricoPartner, strollPed1, strollPed2);

    if (saveManager) {
      saveManager.saveGameProgress(0, worldState);
    }

    camera.x = 480;
    camera.y = 108;
    camera.z = 38;
    camera.yaw = -Math.PI * 0.5;
    camera.pitch = 0.28;
    return { screen: SCREEN_MAP_SAVE };
  }

  // Default / 'chase' / 'play' (1-chase.jpg, Cover): High-Speed 4-Star Sunset Coastal Chase on Ocean Palm Drive!
  startStoryMission(missions, 0, worldState, rng);
  player.x = 480;
  player.y = 15;
  attemptEnterOrHijackVehicle(player, vehicles);
  player.cash = 64500;
  player.respect = 480;

  for (let i = 0; i < 12; i += 1) {
    stepSimulation(STEP, { throttle: 1.0, steer: 0, handbrake: false, nitro: true });
  }

  // Stage dynamic drift angle & trailing skidmarks on Ocean Palm Drive
  if (player.vehicle) {
    player.vehicle.x = 482;
    player.vehicle.y = -18;
    player.vehicle.angle = -Math.PI * 0.44;
    player.vehicle.steerAngle = -0.35;
    player.vehicle.speed = 315;
    player.vehicle.nitroActive = true;
    player.vehicle.drifting = true;
    player.vehicle.underglowColor = '#25f4ee';
    player.vehicle.hasSpoiler = true;
  }
  player.x = 482;
  player.y = -18;
  player.angle = -Math.PI * 0.5;

  // Dual drift tire skidmarks trailing behind the Mako GTR
  for (let s = 0; s < 7; s += 1) {
    const y0 = -2 + s * 7;
    const y1 = y0 + 6;
    skidmarks.push(
      { x1: 475 - s * 0.4, y1: y0, x2: 475 - (s + 1) * 0.4, y2: y1 },
      { x1: 489 - s * 0.4, y1: y0, x2: 489 - (s + 1) * 0.4, y2: y1 },
    );
  }

  missions.stageIndex = 1;
  missions.bannerTimer = 0;
  missions.dialogueSpeaker = 'Rico Vega';
  missions.dialogueText = 'SBPD deployed a spike-strip roadblock ahead! Drift past the interceptors before AIR-1 locks the avenue!';
  missions.dialogueTimer = 12.0;

  setWantedLevelImmediate(wanted, 4, player.x, player.y);
  spawnPoliceRoadblock(wanted, 464, -72, Math.PI * 0.5, 28);

  const cop1 = createVehicle('sbpd_interceptor', 462, -98, Math.PI * 0.36, rng, {
    driverType: 'police',
    sirenActive: true,
  });
  const cop2 = createVehicle('sbpd_interceptor', 498, -128, Math.PI * 0.58, rng, {
    driverType: 'police',
    sirenActive: true,
  });
  const cop3 = createVehicle('sword_tactical', 474, -182, Math.PI * 0.45, rng, {
    driverType: 'police',
    sirenActive: true,
  });
  const trafficCoupe = createVehicle('solaria_roadster', 455, -142, -Math.PI * 0.5, rng, {
    color: '#ff477e',
    driverType: 'traffic',
  });
  const bayBoat = createVehicle('corsair_jetboat', 715, -90, -Math.PI * 0.48, rng, {
    color: '#25f4ee',
    driverType: 'traffic',
  });
  bayBoat.speed = 210;
  vehicles.push(cop1, cop2, cop3, trafficCoupe, bayBoat);

  // Animated pedestrians on left sidewalk, promenade & sandy beach
  const chasePeds = [
    [445, -42, '#ff5e8e', true],
    [444, -82, '#25f4ee', true],
    [445, -125, '#facc15', false],
    [522, -48, '#a855f7', false],
    [556, -72, '#34d399', false],
    [578, -115, '#fb923c', false],
  ];
  for (let i = 0; i < chasePeds.length; i += 1) {
    const [px, py, shirt, panic] = chasePeds[i];
    pedestrians.push(createPedestrian(px, py, rng, 'civilian', {
      shirtColor: shirt,
      angle: i % 2 === 0 ? -Math.PI * 0.5 : Math.PI * 0.5,
      panicTimer: panic ? 5.0 : 0,
    }));
  }

  wanted.helicopter.active = true;
  wanted.helicopter.x = 454;
  wanted.helicopter.y = -158;
  wanted.helicopter.z = 74;
  wanted.helicopter.angle = 0.62;
  wanted.helicopter.rotorAngle = 0.78;
  wanted.helicopter.spotlightX = 478;
  wanted.helicopter.spotlightY = -78;

  camera.x = 480;
  camera.y = 88;
  camera.z = 46;
  camera.yaw = -Math.PI * 0.5;
  camera.pitch = 0.34;
  updateCameraFollow(camera, player, 0.016, 1280, 720);

  return { screen: SCREEN_PLAY };
}
