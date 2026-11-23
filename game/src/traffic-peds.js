// Living Solaria Bay population: ambient multi-lane road traffic, bay speedboats, bustling
// Coral Promenade & beach pedestrian crowds, crew partner Rico Vega, and Syndicate enforcers.

import * as THREE from 'three';
import { WORLD } from './config.js';
import { pick, randRange } from './random.js';
import { animateCharacterRig, createCharacterRig, setCharacterWeapon } from './player-onfoot.js';
import { spawnVehicle, stepVehiclePhysics } from './vehicles.js';
import { getGroundHeightAt, isWaterAt, resolveBuildingCollision } from './world-city.js';

const TRAFFIC_MODELS = [
  'brisa_sedan', 'palma_taxi', 'aureo_cabrio', 'solaria_coupe', 'tormenta_muscle',
  'cobre_suv', 'docks_pickup', 'cargo_boxtruck', 'vortex_moto', 'palma_scooter',
  'mirage_limo', 'mako_v12',
];
const PED_SHIRTS = ['#ff5e78', '#22d3ee', '#fbbf24', '#34d399', '#a78bfa', '#f97316', '#f8fafc', '#38bdf8'];
const PED_SKINS = ['#e2b290', '#c88c65', '#f2cfb6', '#8d5535', '#d9a17c'];

let nextPedId = 1;

export function spawnPedestrian(scene, x, z, rng, role = 'civilian', opts = {}) {
  const isCop = role === 'police';
  const isSyn = role === 'syndicate';
  const isPartner = role === 'partner';
  const rig = createCharacterRig({
    skin: opts.skin || pick(rng, PED_SKINS),
    jacket: opts.jacket || (isCop ? '#172554' : isSyn ? '#3b0a18' : isPartner ? '#0284c7' : pick(rng, PED_SHIRTS)),
    pants: isCop ? '#0f172a' : isSyn ? '#111827' : '#334155',
    hair: opts.hair || (isPartner ? '#111827' : pick(rng, ['#1e1b18', '#523620', '#b45309', '#facc15'])),
    isPolice: isCop,
    sunglasses: isSyn || isPartner,
  });
  const weaponId = opts.weaponId || (isCop ? 'viper_9mm' : isSyn ? 'stinger_smg' : isPartner ? 'helios_carbine' : 'fists');
  setCharacterWeapon(rig, weaponId);
  const y = getGroundHeightAt(x, z);
  rig.root.position.set(x, y, z);
  const yaw = opts.yaw ?? randRange(rng, 0, Math.PI * 2);
  rig.root.rotation.y = yaw;
  scene.add(rig.root);

  return {
    id: nextPedId++,
    role,
    name: opts.name || (isCop ? 'SBPD Officer' : isSyn ? 'Syndicate Gunman' : isPartner ? 'Rico Vega' : 'Resident'),
    rig,
    x, y, z,
    yaw,
    speed: 0,
    gaitPhase: randRange(rng, 0, Math.PI * 2),
    health: opts.health ?? (isSyn ? 85 : isCop ? 95 : isPartner ? 250 : 45),
    maxHealth: opts.health ?? (isSyn ? 85 : isCop ? 95 : isPartner ? 250 : 45),
    alive: true,
    panicTimer: opts.panicTimer || 0,
    weaponId,
    fireCd: randRange(rng, 0.4, 1.1),
    aiming: Boolean(opts.aiming),
    walkDir: rng() < 0.5 ? 1 : -1,
    homeX: x,
    homeZ: z,
    cashDrop: isSyn ? 450 : isCop ? 200 : 85,
  };
}

export function populateAmbientCity(scene, vehicles, pedestrians, rng) {
  // Spawn 24 diverse traffic vehicles across avenues + 2 ocean speedboats
  for (let i = 0; i < 24; i += 1) {
    const model = TRAFFIC_MODELS[i % TRAFFIC_MODELS.length];
    const onAv = i % 2 === 0;
    const roadDir = i % 4 < 2 ? 1 : -1;
    let x, z, yaw;
    if (onAv) {
      const avX = WORLD.avenuesX[i % WORLD.avenuesX.length];
      x = avX + (roadDir > 0 ? -5.2 : 5.2);
      z = randRange(rng, -310, 310);
      yaw = roadDir > 0 ? 0 : Math.PI;
    } else {
      const stZ = WORLD.streetsZ[i % WORLD.streetsZ.length];
      z = stZ + (roadDir > 0 ? 5.2 : -5.2);
      x = randRange(rng, -310, 210);
      yaw = roadDir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    const v = spawnVehicle(scene, model, x, z, yaw, rng, {
      driverType: 'traffic',
      roadAxis: onAv ? 'z' : 'x',
      roadDir,
      speed: 14,
    });
    vehicles.push(v);
  }

  // Bay speedboats cruising near Coral Beach & Starlight Isle
  vehicles.push(
    spawnVehicle(scene, 'corsair_boat', 358, -80, 0.12, rng, { driverType: 'parked' }),
    spawnVehicle(scene, 'corsair_boat', 392, 95, -0.35, rng, { driverType: 'traffic', speed: 12 }),
  );

  // Featured parked player-ready supercar & convertible along Coral Promenade
  vehicles.push(
    spawnVehicle(scene, 'mako_v12', 235, -82, 0, rng, { color: '#e11d48', driverType: 'parked' }),
    spawnVehicle(scene, 'aureo_cabrio', 235, -45, 0, rng, { color: '#fb7185', driverType: 'parked' }),
  );

  // Bustling sidewalks & golden beach pedestrian crowds
  for (let i = 0; i < 36; i += 1) {
    let x, z;
    if (i < 16) {
      // Coral Promenade boardwalk & Ocean Palm Blvd sidewalks
      x = i % 2 === 0 ? 223 + randRange(rng, -2, 2) : 256 + randRange(rng, -2, 4);
      z = randRange(rng, -240, 220);
    } else if (i < 24) {
      // Golden Beach strollers
      x = randRange(rng, 274, 308);
      z = randRange(rng, -200, 200);
    } else {
      // Mirage Strip & Downtown sidewalks
      x = (i % 2 === 0 ? -17 : 17) + randRange(rng, -2, 2);
      z = randRange(rng, -300, 120);
    }
    pedestrians.push(spawnPedestrian(scene, x, z, rng, 'civilian'));
  }
}

export function updateTrafficVehicles(vehicles, player, world, effects, dt, elapsed) {
  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    if (v.driverType !== 'traffic' || v.destroyed || v.spec.isHeli) continue;

    if (v.spec.isBoat) {
      stepVehiclePhysics(v, { throttle: 0.48, steer: Math.sin(elapsed * 0.4 + v.id) * 0.25 }, world, effects, dt, elapsed);
      continue;
    }

    // Check distance to vehicle directly ahead to avoid pileups
    const fx = Math.sin(v.yaw);
    const fz = Math.cos(v.yaw);
    let blocked = false;
    for (let j = 0; j < vehicles.length; j += 1) {
      if (i === j) continue;
      const o = vehicles[j];
      const dx = o.x - v.x;
      const dz = o.z - v.z;
      const ahead = dx * fx + dz * fz;
      const side = Math.abs(-dx * fz + dz * fx);
      if (ahead > 0 && ahead < 15 && side < 3.4) { blocked = true; break; }
    }
    const pdx = player.x - v.x;
    const pdz = player.z - v.z;
    if (pdx * fx + pdz * fz > 0 && Math.hypot(pdx, pdz) < 12) blocked = true;

    // Wrap cleanly at city edges
    if (v.roadAxis === 'z') {
      if (v.z > 350) v.z = -345;
      else if (v.z < -350) v.z = 345;
    } else {
      if (v.x > 235) v.x = -345;
      else if (v.x < -355) v.x = 230;
    }

    const desiredYaw = v.roadAxis === 'z'
      ? (v.roadDir > 0 ? 0 : Math.PI)
      : (v.roadDir > 0 ? Math.PI / 2 : -Math.PI / 2);
    let yd = desiredYaw - v.yaw;
    while (yd > Math.PI) yd -= Math.PI * 2;
    while (yd < -Math.PI) yd += Math.PI * 2;

    const throttle = blocked ? -0.45 : (v.speed < 16 ? 0.55 : 0.12);
    stepVehiclePhysics(v, { throttle, steer: THREE.MathUtils.clamp(yd * 1.4, -0.7, 0.7) }, world, effects, dt, elapsed);
  }
}

export function updatePedestrians(pedestrians, player, world, combat, dt) {
  for (let i = 0; i < pedestrians.length; i += 1) {
    const p = pedestrians[i];
    if (!p.alive) {
      animateCharacterRig(p.rig, 0, false, p.gaitPhase, false);
      continue;
    }

    const dxP = player.x - p.x;
    const dzP = player.z - p.z;
    const distP = Math.hypot(dxP, dzP);
    p.aiming = false;

    if (p.role === 'syndicate' || p.role === 'police') {
      // Tactical hostile AI: engage player within sight range
      const engageDist = p.role === 'syndicate' ? 62 : 52;
      if (distP < engageDist) {
        p.yaw = Math.atan2(dxP, dzP);
        p.aiming = true;
        if (distP > 22) {
          p.speed = 4.6;
          p.x += Math.sin(p.yaw) * p.speed * dt;
          p.z += Math.cos(p.yaw) * p.speed * dt;
        } else {
          p.speed = 0;
        }
        p.fireCd -= dt;
        if (p.fireCd <= 0 && combat) {
          p.fireCd = p.role === 'syndicate' ? 0.68 : 0.82;
          combat.fireNpcShot(p, player);
        }
      } else {
        p.speed = 0;
      }
    } else if (p.role === 'partner') {
      // Crew partner Rico Vega supports Val on foot
      let target = null;
      let bestD = 55;
      for (let j = 0; j < pedestrians.length; j += 1) {
        const o = pedestrians[j];
        if (o.alive && o.role === 'syndicate') {
          const d = Math.hypot(o.x - p.x, o.z - p.z);
          if (d < bestD) { bestD = d; target = o; }
        }
      }
      if (target) {
        p.yaw = Math.atan2(target.x - p.x, target.z - p.z);
        p.aiming = true;
        p.speed = 0;
        p.fireCd -= dt;
        if (p.fireCd <= 0 && combat) {
          p.fireCd = 0.55;
          combat.firePartnerShot(p, target);
        }
      } else if (!player.inVehicle && distP > 8 && distP < 70) {
        p.yaw = Math.atan2(dxP, dzP);
        p.speed = 5.4;
        p.x += Math.sin(p.yaw) * p.speed * dt;
        p.z += Math.cos(p.yaw) * p.speed * dt;
      } else {
        p.speed = 0;
      }
    } else {
      // Civilian sidewalk / beach pedestrian AI (panics if chased or near gunfire!)
      if (p.panicTimer > 0) {
        p.panicTimer = Math.max(0, p.panicTimer - dt);
        p.yaw = Math.atan2(-dxP, -dzP);
        p.speed = 6.2;
      } else {
        p.yaw = p.walkDir > 0 ? 0 : Math.PI;
        p.speed = 1.9;
        if (Math.abs(p.z - p.homeZ) > 48) p.walkDir *= -1;
      }
      const nx = p.x + Math.sin(p.yaw) * p.speed * dt;
      const nz = p.z + Math.cos(p.yaw) * p.speed * dt;
      if (!isWaterAt(nx, nz)) {
        const col = resolveBuildingCollision(world, nx, nz, 0.5);
        p.x = col.x;
        p.z = col.z;
      }
    }

    p.y = getGroundHeightAt(p.x, p.z);
    if (p.speed > 0.2) p.gaitPhase += dt * (p.speed * 1.45);
    p.rig.root.position.set(p.x, p.y, p.z);
    p.rig.root.rotation.y = p.yaw;
    animateCharacterRig(p.rig, p.speed, p.aiming, p.gaitPhase, true);
  }
}
