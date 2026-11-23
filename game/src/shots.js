// Deterministic live-WebGL screenshot scene staging for ?shot=chase|heist|map|title.
// Positions real 3D vehicles, SBPD tactical units, AIR-1 helicopter spotlight, articulated characters,
// gunfire tracers, fiery explosions, tire drift smoke & skidmarks for all 4 showcase captures.

import * as THREE from 'three';
import { setFixedCamera } from './camera-controller.js';
import { startMission, STORY_MISSIONS } from './missions-story.js';
import { animateCharacterRig, setCharacterWeapon } from './player-onfoot.js';
import { spawnPedestrian } from './traffic-peds.js';
import { removeVehicle, spawnVehicle, stepVehiclePhysics } from './vehicles.js';

function clearVehiclesNear(scene, vehicles, cx, cz, radius) {
  for (let i = vehicles.length - 1; i >= 0; i -= 1) {
    const v = vehicles[i];
    if (Math.hypot(v.x - cx, v.z - cz) < radius) {
      removeVehicle(scene, vehicles, v);
    }
  }
}

export function stageShowcaseShot(shotName, state) {
  const { scene, player, vehicles, pedestrians, wanted, missions, activities, effects, cameraCtrl, saveSystem, world, rng } = state;
  saveSystem.ensurePopulatedSlots();

  if (shotName === 'title') {
    // 4-title.jpg: Breathtaking golden-hour coastal panorama with Bridge, Sky-Ring Pier, Ocean, Palms & Skyline!
    state.timeOfDay = 17.35;
    state.mode = 'title';
    cameraCtrl.mode = 'panorama';
    clearVehiclesNear(scene, vehicles, 240, -60, 45);
    const showCar1 = spawnVehicle(scene, 'mako_v12', 236, -64, 0, rng, { color: '#ff2450', driverType: 'traffic', speed: 24 });
    const showCar2 = spawnVehicle(scene, 'aureo_cabrio', 244, -22, Math.PI, rng, { color: '#fde047', driverType: 'traffic', speed: 18 });
    const boat1 = spawnVehicle(scene, 'corsair_boat', 352, -45, 0.25, rng, { color: '#22d3ee', driverType: 'traffic', speed: 20 });
    const boat2 = spawnVehicle(scene, 'corsair_boat', 385, 42, -0.45, rng, { color: '#f8fafc', driverType: 'traffic', speed: 18 });
    vehicles.push(showCar1, showCar2, boat1, boat2);
    // Elevated diagonal coastal vantage centering the turquoise bay, Solaria Arch Bridge, Sky-Ring Pier & Hotel Solaria
    setFixedCamera(cameraCtrl, [316, 42, -162], [278, 13, 38], 56);
    return 'title';
  }

  if (shotName === 'map') {
    state.timeOfDay = 17.45;
    state.mode = 'atlas';
    missions.missionIndex = 5;
    missions.stageIndex = 1;
    missions.completedIds = STORY_MISSIONS.slice(0, 5).map((m) => m.id);
    activities.completedIds = [
      'race_coral', 'race_mirage', 'race_downtown', 'race_bridge',
      'stunt_coral', 'stunt_pier', 'stunt_mirage', 'hide_docks', 'hide_brisa',
      'exp_mako', 'exp_cabrio', 'prop_coral', 'prop_isle', 'prop_mirage',
    ];
    activities.ownedProperties = ['prop_coral', 'prop_isle', 'prop_mirage'];
    activities.relicsFound = 9;
    player.x = 240;
    player.z = -72;
    player.cash = 142850;
    player.respect = 2150;
    setFixedCamera(cameraCtrl, [310, 40, -152], [250, 14, 24], 54);
    return 'atlas';
  }

  if (shotName === 'heist') {
    // 2-heist.jpg: Intense third-person on-foot twilight/neon-dusk shootout on Mirage Strip!
    state.timeOfDay = 19.45;
    state.mode = 'play';
    startMission(missions, 3, 1, scene, vehicles, pedestrians, rng);
    missions.completedIds = STORY_MISSIONS.slice(0, 3).map((m) => m.id);
    missions.bannerTimer = 0;
    missions.comms = {
      speaker: 'Rico Vega',
      role: 'WHEELMAN',
      text: 'Armored escort is burning! Drop the Syndicate shooters and hijack that Aureo Cabrio for getaway!',
      timer: 14,
    };

    clearVehiclesNear(scene, vehicles, 0, -200, 72);
    wanted.clearRoadblocks();
    wanted.state.units.length = 0;

    // Player Val Reyes on foot firing Stinger SMG North (-Z) down Mirage Strip
    player.inVehicle = false;
    player.vehicle = null;
    player.x = -1.6;
    player.y = 0.16;
    player.z = -185.0;
    player.yaw = Math.PI - 0.08;
    player.aiming = true;
    player.weaponIndex = 2; // Stinger SMG
    player.cash = 96400;
    player.respect = 1280;
    player.health = 88;
    player.armor = 74;
    setCharacterWeapon(player.rig, 'stinger_smg');
    player.rig.root.visible = true;
    player.rig.root.position.set(player.x, player.y, player.z);
    player.rig.root.rotation.y = player.yaw;
    animateCharacterRig(player.rig, 0.2, true, 0.5, true);

    // Sleek open-top coral-gold Aureo Cabrio parked right beside Val -> triggers "[F] Steal Aureo Cabrio"
    const cabrio = spawnVehicle(scene, 'aureo_cabrio', 4.6, -189.0, Math.PI + 0.34, rng, { color: '#ff5277', driverType: 'parked' });
    // Burning / exploding Boveda Bullion Van ahead on the boulevard
    const van = spawnVehicle(scene, 'boveda_armored', -3.6, -206.0, 0.38, rng, { driverType: 'parked', destroyed: true, burning: true });
    // SBPD cruisers & SWAT Bearcat taking cover positions
    const cop1 = spawnVehicle(scene, 'sbpd_cruiser', 6.8, -210.5, -0.58, rng, { driverType: 'police', siren: true, callsign: 'SBPD-14', tactic: 'OPEN FIRE' });
    const cop2 = spawnVehicle(scene, 'sbpd_enforcer', -8.8, -220.0, 0.44, rng, { driverType: 'police', siren: true, callsign: 'SBPD-22', tactic: 'BOX IN' });
    const cop3 = spawnVehicle(scene, 'sbpd_swat', 1.2, -231.0, 0.14, rng, { driverType: 'police', siren: true, callsign: 'SWAT-03', tactic: 'ROADBLOCK' });
    vehicles.push(cabrio, van, cop1, cop2, cop3);
    player.nearbyVehicle = cabrio;

    wanted.setWantedImmediate(3, player.x, player.z);
    wanted.state.units.push(cop1, cop2, cop3);

    // Crew Partner Rico Vega flanking on Val's left + Syndicate gunmen & SBPD officers ahead
    const rico = spawnPedestrian(scene, -6.4, -190.5, rng, 'partner', { name: 'Rico Vega', yaw: Math.PI + 0.16, aiming: true });
    const g1 = spawnPedestrian(scene, -0.8, -199.5, rng, 'syndicate', { yaw: 0.08, aiming: true });
    const g2 = spawnPedestrian(scene, 3.2, -203.0, rng, 'syndicate', { yaw: -0.18, aiming: true });
    const g3 = spawnPedestrian(scene, -7.2, -203.5, rng, 'syndicate', { yaw: 0.24, aiming: true });
    const off1 = spawnPedestrian(scene, 4.4, -208.5, rng, 'police', { yaw: -0.22, aiming: true });
    const off2 = spawnPedestrian(scene, 8.6, -207.0, rng, 'police', { yaw: -0.35, aiming: true });
    const pedsToPose = [rico, g1, g2, g3, off1, off2];
    for (let i = 0; i < pedsToPose.length; i += 1) {
      animateCharacterRig(pedsToPose[i].rig, 0, true, 0, true);
      pedestrians.push(pedsToPose[i]);
    }

    // Crisp feathered explosion fireballs + sleek muzzle starbursts + golden/cyan/crimson tracers + floating numbers
    effects.spawnExplosion(-3.6, 1.3, -206.0, 0.95);
    effects.spawnFireFlame(-3.4, 1.8, -204.2, 1.35);
    effects.spawnFireFlame(-2.4, 1.5, -205.2, 1.15);
    effects.spawnMuzzleFlash(player.x - 0.34, 1.46, player.z - 0.92, '#ffe89e', 0.68);
    effects.spawnMuzzleFlash(g1.x, 1.42, g1.z + 0.85, '#fb7185', 0.65);
    effects.spawnMuzzleFlash(off1.x, 1.42, off1.z + 0.85, '#38bdf8', 0.65);
    effects.spawnTracer(new THREE.Vector3(player.x - 0.34, 1.46, player.z - 0.95), new THREE.Vector3(-0.8, 1.35, -199.4), '#fde047', 0.08, 0.3);
    effects.spawnTracer(new THREE.Vector3(player.x - 0.25, 1.46, player.z - 1.1), new THREE.Vector3(2.9, 1.45, -202.8), '#fbbf24', 0.07, 0.3);
    effects.spawnTracer(new THREE.Vector3(rico.x - 0.25, 1.45, rico.z - 0.9), new THREE.Vector3(-6.8, 1.35, -203.3), '#22d3ee', 0.075, 0.3);
    effects.spawnTracer(new THREE.Vector3(g2.x, 1.42, g2.z + 0.8), new THREE.Vector3(1.4, 1.55, -188.5), '#fb7185', 0.07, 0.3);
    effects.spawnTracer(new THREE.Vector3(off1.x, 1.42, off1.z + 0.8), new THREE.Vector3(0.4, 1.35, -192.0), '#38bdf8', 0.07, 0.3);

    effects.spawnFloatingNumber(-0.8, 2.8, -199.5, 'CRIT -68!', '#fde047');
    effects.spawnFloatingNumber(3.4, 2.75, -203.0, '-36', '#ffffff');
    effects.spawnFloatingNumber(-4.2, 4.7, -206.0, 'CONVOY BREACHED +$1,500', '#34d399');

    for (let i = 0; i < vehicles.length; i += 1) {
      const v = vehicles[i];
      v.rig.root.position.set(v.x, v.y, v.z);
      v.rig.root.rotation.y = v.yaw;
      if (v.rig.sirenRed) {
        v.rig.sirenRed.visible = true;
        v.rig.sirenBlue.visible = true;
        v.rig.sirenBloomR.visible = v.id % 2 === 0;
        v.rig.sirenBloomB.visible = v.id % 2 !== 0;
      }
    }

    // Crisp over-the-shoulder third-person combat angle cleanly showing Val, Stinger SMG, Aureo Cabrio, burning van & Mirage Strip neon!
    cameraCtrl.yaw = Math.PI;
    setFixedCamera(cameraCtrl, [-2.95, 2.35, -180.0], [0.4, 2.25, -208.5], 54);
    return 'play';
  }

  // Default: 'chase' -> 1-chase.jpg (COVER!)
  // Sun-soaked golden-hour 4-star police chase down Coral Promenade Ocean Palm Blvd!
  state.timeOfDay = 17.32;
  state.mode = 'play';
  startMission(missions, 5, 1, scene, vehicles, pedestrians, rng); // MISSION 6 OF 10: Coral Bay Takedown
  missions.completedIds = STORY_MISSIONS.slice(0, 5).map((m) => m.id);
  missions.bannerTimer = 0;
  missions.comms = {
    speaker: 'Rico Vega',
    role: 'WHEELMAN',
    text: 'AIR-1 locked spotlight on your roof and SBPD threw a spike roadblock ahead—drift left toward Solaria Arch Bridge!',
    timer: 14,
  };

  clearVehiclesNear(scene, vehicles, 240, -52, 86);
  wanted.clearRoadblocks();
  wanted.state.units.length = 0;

  // Player's glossy bright crimson-coral Mako V12 GT drifting dramatically South (+Z) along Ocean Palm Blvd!
  const heroCar = spawnVehicle(scene, 'mako_v12', 240.2, -62.0, 0.42, rng, {
    color: '#ff224e',
    driverType: 'player',
    speed: 69,
  });
  heroCar.steer = -0.62;
  heroCar.drifting = true;
  heroCar.nitroActive = true;
  heroCar.nitro = 84;
  heroCar.health = 232;
  heroCar.rollAngle = 0.085;
  vehicles.push(heroCar);

  player.inVehicle = true;
  player.vehicle = heroCar;
  player.x = heroCar.x;
  player.y = heroCar.y;
  player.z = heroCar.z;
  player.yaw = heroCar.yaw;
  player.speed = 69;
  player.cash = 142850;
  player.respect = 2150;
  player.health = 96;
  player.armor = 84;
  player.rig.root.visible = false;

  // 4+ SBPD Tactical Units in intense formation + Roadblock with Barricades & Spike Strip!
  const pitCop = spawnVehicle(scene, 'sbpd_cruiser', 236.8, -57.2, 0.48, rng, {
    driverType: 'police', siren: true, callsign: 'SBPD-14', tactic: 'PIT MANEUVER', speed: 64,
  });
  const ramCop = spawnVehicle(scene, 'sbpd_enforcer', 246.4, -44.5, -0.34, rng, {
    driverType: 'police', siren: true, callsign: 'SBPD-22', tactic: 'RAMMING', speed: 56,
  });
  wanted.spawnRoadblock(241.0, -24.0, 0.06, vehicles);
  const swatVan = spawnVehicle(scene, 'sbpd_swat', 246.8, -21.5, -0.78, rng, {
    driverType: 'police', siren: true, callsign: 'SWAT-03', tactic: 'BOX IN', speed: 0,
  });
  const flankCop = spawnVehicle(scene, 'sbpd_cruiser', 235.2, -33.5, 0.62, rng, {
    driverType: 'police', siren: true, callsign: 'SBPD-31', tactic: 'FLANKING', speed: 50,
  });
  // Sunlit Aureo Cabrio & Corsair speedboats on the sparkling turquoise bay!
  const civCar = spawnVehicle(scene, 'aureo_cabrio', 232.0, -8.0, 0.1, rng, { color: '#fde047', driverType: 'traffic', speed: 18 });
  const bayBoat = spawnVehicle(scene, 'corsair_boat', 345, -18, 0.35, rng, { color: '#22d3ee', driverType: 'traffic', speed: 24 });

  vehicles.push(pitCop, ramCop, swatVan, flankCop, civCar, bayBoat);

  wanted.setWantedImmediate(4, player.x, player.z);
  wanted.state.units.push(pitCop, ramCop, swatVan, flankCop);

  // AIR-1 SBPD Helicopter hovering dramatically in upper-center sky casting volumetric spotlight cone!
  const heli = wanted.ensureHeli(vehicles, player.x, player.z);
  heli.x = 250.5;
  heli.y = 20.5;
  heli.z = -30.5;
  heli.yaw = -2.35;
  if (heli.rig.spotlightCone) {
    heli.rig.spotlightCone.visible = true;
    heli.rig.spotlightCone.rotation.x = -0.45;
  }

  // Bustling sidewalk & golden-beach pedestrian crowd watching/reacting to the chase
  const chasePeds = [
    [224, -56, '#ff5e78'], [223, -42, '#fbbf24'], [225, -28, '#22d3ee'],
    [256, -56, '#a78bfa'], [258, -42, '#34d399'], [260, -28, '#ff5e78'],
    [276, -50, '#fb923c'], [286, -34, '#22d3ee'], [282, -16, '#fde047'],
  ];
  for (let i = 0; i < chasePeds.length; i += 1) {
    const [px, pz, shirt] = chasePeds[i];
    const p = spawnPedestrian(scene, px, pz, rng, 'civilian', { jacket: shirt, yaw: px < 240 ? Math.PI / 2 : -Math.PI / 2 });
    animateCharacterRig(p.rig, 4.5, false, i * 1.1, true);
    pedestrians.push(p);
  }

  // Soft billowing white tire drift smoke, dark asphalt skidmarks, and fender-scrape ramming sparks right on contact!
  for (let s = 0; s < 14; s += 1) {
    const t = s * 1.15;
    effects.addSkidmark(heroCar.x - 0.9 - t * 0.28, 0.14, heroCar.z - 1.5 - t, 0.34);
    effects.addSkidmark(heroCar.x + 0.9 - t * 0.28, 0.14, heroCar.z - 1.5 - t, 0.34);
  }
  effects.spawnDriftSmoke(heroCar.x - 1.1, 0.28, heroCar.z - 2.1, 10, 1.5);
  effects.spawnDriftSmoke(heroCar.x + 0.6, 0.28, heroCar.z - 2.5, 8, 1.5);
  // Crisp fender-scrape sparks bursting directly between PIT cruiser bumper and Mako V12 GT right quarter panel!
  effects.spawnSparks(238.5, 0.68, -59.6, 22, '#ffcf4d');
  effects.update(0.06);

  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    if (v.spec.isHeli) {
      stepVehiclePhysics(v, {}, world, effects, 0.016, 1.4);
    } else {
      v.rig.root.position.set(v.x, v.y, v.z);
      v.rig.root.rotation.y = v.yaw;
      v.rig.body.rotation.z = v.rollAngle || 0;
      if (v.rig.nitroFlame) v.rig.nitroFlame.visible = Boolean(v.nitroActive);
      if (v.rig.sirenRed) {
        const flip = v.id % 2 === 0;
        v.rig.sirenRed.visible = true;
        v.rig.sirenBlue.visible = true;
        v.rig.sirenBloomR.visible = flip;
        v.rig.sirenBloomB.visible = !flip;
      }
    }
  }

  // Heroic elevated chase angle framing the entire drifting crimson Mako V12 GT, PIT cruiser spark contact,
  // 4+ SBPD tactical units, AIR-1 spotlight, pastel Hotel Solaria, turquoise ocean, Solaria Arch Bridge & Sky-Ring wheel!
  cameraCtrl.yaw = 0.22;
  setFixedCamera(cameraCtrl, [231.2, 5.1, -74.8], [250.8, 3.0, -11.5], 58);
  return 'play';
}
