// 5-Star SBPD Tactical Dispatch AI: pursuit, ramming, PIT maneuvers, flanking, roadblocks
// with 3D barricades & spike strips, foot officers opening fire, and AIR-1 spotlight helicopter.

import * as THREE from 'three';
import { WANTED_TIERS } from './config.js';
import { spawnPedestrian } from './traffic-peds.js';
import { removeVehicle, spawnVehicle, stepVehiclePhysics } from './vehicles.js';
import { getGroundHeightAt } from './world-city.js';

const CALLSIGNS = ['SBPD-14', 'SBPD-22', 'SBPD-07', 'SWAT-03', 'SBPD-31', 'SBPD-44'];

export function createPoliceDispatch(scene, rng) {
  const propGroup = new THREE.Group();
  scene.add(propGroup);

  const state = {
    stars: 0,
    heat: 0,
    inSight: false,
    sightMeter: 0,
    cooldownTimer: 0,
    jamTimer: 0,
    lastKnownX: 240,
    lastKnownZ: -80,
    units: [],
    roadblocks: [],
    heli: null,
    spawnTimer: 0,
    dispatchLog: [],
  };

  const barrMat = new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.55 });
  const stripeMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
  const spikeMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.25 });

  function addHeat(amount, x, z) {
    if (state.jamTimer > 0) amount *= 0.25;
    state.heat = Math.min(5.0, state.heat + amount);
    const nextStars = Math.min(5, Math.floor(state.heat + 0.001));
    if (nextStars > state.stars) state.stars = nextStars;
    state.inSight = true;
    state.sightMeter = 100;
    state.cooldownTimer = WANTED_TIERS[state.stars].cooldown;
    if (x !== undefined) {
      state.lastKnownX = x;
      state.lastKnownZ = z;
    }
  }

  function setWantedImmediate(stars, x, z) {
    state.stars = Math.max(0, Math.min(5, stars));
    state.heat = state.stars;
    state.inSight = state.stars > 0;
    state.sightMeter = state.stars > 0 ? 100 : 0;
    state.cooldownTimer = WANTED_TIERS[state.stars].cooldown;
    state.lastKnownX = x;
    state.lastKnownZ = z;
  }

  function clearHeat(dropStars = 5, vehicles = []) {
    state.stars = Math.max(0, state.stars - dropStars);
    state.heat = state.stars;
    if (state.stars === 0) {
      state.inSight = false;
      state.sightMeter = 0;
      clearRoadblocks();
      if (state.heli) {
        removeVehicle(scene, vehicles, state.heli);
        state.heli = null;
      }
      for (let i = state.units.length - 1; i >= 0; i -= 1) {
        state.units[i].siren = false;
        state.units[i].driverType = 'traffic';
      }
      state.units.length = 0;
    }
  }

  function clearRoadblocks() {
    while (propGroup.children.length > 0) {
      propGroup.remove(propGroup.children[0]);
    }
    state.roadblocks.length = 0;
  }

  function spawnRoadblock(x, z, yaw, vehicles) {
    const rbGroup = new THREE.Group();
    const gy = getGroundHeightAt(x, z);
    rbGroup.position.set(x, gy, z);
    rbGroup.rotation.y = yaw;

    // Twin orange/white police sawhorse barricades + metallic spike strip in center lane
    for (const sx of [-5.2, 5.2]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.15, 0.55), barrMat);
      bar.position.set(sx, 0.62, 0);
      bar.castShadow = true;
      const st = new THREE.Mesh(new THREE.BoxGeometry(3.84, 0.28, 0.58), stripeMat);
      st.position.set(sx, 0.84, 0);
      rbGroup.add(bar, st);
    }
    // Spike strip teeth across middle gap
    const stripBase = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.12, 0.72), spikeMat);
    stripBase.position.set(0, 0.08, 0);
    rbGroup.add(stripBase);
    for (let t = -2.4; t <= 2.4; t += 0.6) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 4), spikeMat);
      cone.position.set(t, 0.24, 0);
      rbGroup.add(cone);
    }
    propGroup.add(rbGroup);

    const rb = { x, z, yaw, mesh: rbGroup, triggered: false };
    state.roadblocks.push(rb);

    if (vehicles) {
      const cruiser = spawnVehicle(scene, 'sbpd_cruiser', x - Math.cos(yaw) * 5.8, z + Math.sin(yaw) * 5.8, yaw + Math.PI * 0.42, rng, {
        driverType: 'police', siren: true, callsign: 'SBPD-07', tactic: 'ROADBLOCK',
      });
      vehicles.push(cruiser);
      state.units.push(cruiser);
    }
    return rb;
  }

  function ensureHeli(vehicles, px, pz) {
    if (state.heli) return state.heli;
    const heli = spawnVehicle(scene, 'sbpd_air1', px + 18, pz + 32, Math.PI, rng, {
      y: 28, driverType: 'police', siren: true, callsign: 'AIR-1', tactic: 'SPOTLIGHT',
    });
    vehicles.push(heli);
    state.heli = heli;
    return heli;
  }

  function update(dt, elapsed, player, vehicles, pedestrians, world, effects) {
    if (state.jamTimer > 0) state.jamTimer = Math.max(0, state.jamTimer - dt);
    if (state.stars <= 0) return;

    const tier = WANTED_TIERS[state.stars];

    // Prune destroyed or overly distant units
    for (let i = state.units.length - 1; i >= 0; i -= 1) {
      const u = state.units[i];
      if (u.destroyed || u.driverType === 'player') {
        state.units.splice(i, 1);
      }
    }

    // Spawn tactical SBPD reinforcements up to tier maxUnits
    state.spawnTimer -= dt;
    if (state.units.length < tier.maxUnits && state.spawnTimer <= 0) {
      state.spawnTimer = 3.2;
      const idx = state.units.length;
      const ang = player.yaw + (idx % 2 === 0 ? 0.35 : -0.35) + (idx > 2 ? Math.PI : 0);
      const dist = 56 + idx * 14;
      const sx = THREE.MathUtils.clamp(player.x + Math.sin(ang) * dist, -350, 248);
      const sz = THREE.MathUtils.clamp(player.z + Math.cos(ang) * dist, -350, 350);
      const model = tier.swat && idx % 3 === 2 ? 'sbpd_swat' : (idx % 2 === 1 ? 'sbpd_enforcer' : 'sbpd_cruiser');
      const tactics = ['RAMMING', 'PIT MANEUVER', 'BOX IN', 'FLANKING', 'ROADBLOCK', 'OPEN FIRE'];
      const unit = spawnVehicle(scene, model, sx, sz, Math.atan2(player.x - sx, player.z - sz), rng, {
        driverType: 'police',
        siren: true,
        callsign: CALLSIGNS[idx % CALLSIGNS.length],
        tactic: tactics[idx % tactics.length],
      });
      vehicles.push(unit);
      state.units.push(unit);

      // Deploy an on-foot officer if player is on foot
      if (!player.inVehicle && pedestrians.filter((p) => p.alive && p.role === 'police').length < 4) {
        pedestrians.push(spawnPedestrian(scene, sx + 3, sz + 2, rng, 'police', { aiming: true }));
      }
    }

    // AIR-1 Helicopter tracking + sweeping volumetric spotlight cone
    if (tier.chopper) {
      const h = ensureHeli(vehicles, player.x, player.z);
      const orbitA = elapsed * 0.48;
      const tx = player.x + Math.cos(orbitA) * 18;
      const tz = player.z + Math.sin(orbitA) * 24 + 14;
      h.x = THREE.MathUtils.lerp(h.x, tx, Math.min(1, dt * 1.4));
      h.z = THREE.MathUtils.lerp(h.z, tz, Math.min(1, dt * 1.4));
      h.y = 26 + Math.sin(elapsed * 1.6) * 1.6;
      h.yaw = Math.atan2(player.x - h.x, player.z - h.z);
      if (h.rig.spotlightCone) {
        h.rig.spotlightCone.visible = state.jamTimer <= 0;
      }
      stepVehiclePhysics(h, {}, world, effects, dt, elapsed);
    }

    // Tactical steering AI for every pursuing SBPD unit
    let closestDist = Infinity;
    for (let i = 0; i < state.units.length; i += 1) {
      const u = state.units[i];
      const d = Math.hypot(player.x - u.x, player.z - u.z);
      if (d < closestDist) closestDist = d;

      if (u.tactic === 'ROADBLOCK' && d > 24) {
        stepVehiclePhysics(u, { throttle: 0, steer: 0, handbrake: true }, world, effects, dt, elapsed);
        continue;
      }

      // Compute tactical intercept point based on tactic role
      let tx = player.x;
      let tz = player.z;
      const pfx = Math.sin(player.yaw);
      const pfz = Math.cos(player.yaw);
      if (u.tactic === 'PIT MANEUVER') {
        tx = player.x - pfx * 3.5 + pfz * 2.4;
        tz = player.z - pfz * 3.5 - pfx * 2.4;
      } else if (u.tactic === 'FLANKING' || u.tactic === 'BOX IN') {
        const side = i % 2 === 0 ? 1 : -1;
        tx = player.x + pfx * 12 + pfz * 5.2 * side;
        tz = player.z + pfz * 12 - pfx * 5.2 * side;
      }

      const desiredYaw = Math.atan2(tx - u.x, tz - u.z);
      let yd = desiredYaw - u.yaw;
      while (yd > Math.PI) yd -= Math.PI * 2;
      while (yd < -Math.PI) yd += Math.PI * 2;

      const throttle = d < 9 && !player.inVehicle ? 0 : 0.96;
      stepVehiclePhysics(u, {
        throttle,
        steer: THREE.MathUtils.clamp(yd * 1.85, -1, 1),
        nitro: d > 36 && d < 95,
      }, world, effects, dt, elapsed);
    }

    // Check player hitting spike strips at roadblocks
    if (player.inVehicle && player.vehicle) {
      for (let i = 0; i < state.roadblocks.length; i += 1) {
        const rb = state.roadblocks[i];
        if (!rb.triggered && Math.hypot(player.x - rb.x, player.z - rb.z) < 4.2) {
          rb.triggered = true;
          player.vehicle.spikeTimer = 4.5;
          effects.spawnSparks(player.x, player.y + 0.3, player.z, 18, '#38bdf8');
          effects.spawnFloatingNumber(player.x, player.y + 2.5, player.z, 'SPIKE STRIP HIT!', '#f87171');
        }
      }
    }

    // Line-of-sight & evasion cooldown progression
    const spotted = state.jamTimer <= 0 && (closestDist < 85 || (state.heli && Math.hypot(player.x - state.heli.x, player.z - state.heli.z) < 95));
    state.inSight = spotted;
    if (spotted) {
      state.sightMeter = Math.min(100, state.sightMeter + dt * 35);
      state.cooldownTimer = tier.cooldown;
      state.lastKnownX = player.x;
      state.lastKnownZ = player.z;
    } else {
      state.sightMeter = Math.max(0, state.sightMeter - dt * 14);
      state.cooldownTimer -= dt;
      if (state.cooldownTimer <= 0) {
        player.stats.copsEvaded += 1;
        player.respect += state.stars * 35;
        clearHeat(5, vehicles);
      }
    }
  }

  function getActiveUnits(player) {
    if (state.stars <= 0) return [];
    const list = [];
    if (state.heli) {
      list.push({
        callsign: 'AIR-1',
        dist: Math.round(Math.hypot(state.heli.x - player.x, state.heli.z - player.z)),
        tactic: state.jamTimer > 0 ? 'JAMMED' : 'SPOTLIGHT',
        badge: 'SPOTLIGHT',
      });
    }
    for (let i = 0; i < state.units.length; i += 1) {
      const u = state.units[i];
      const badgeMap = {
        RAMMING: 'RAMMING',
        'PIT MANEUVER': 'PIT',
        ROADBLOCK: 'ROADBLOCK',
        'BOX IN': 'BOX',
        'OPEN FIRE': 'FIRE',
        FLANKING: 'FLANK',
      };
      list.push({
        callsign: u.callsign || CALLSIGNS[i % CALLSIGNS.length],
        dist: Math.round(Math.hypot(u.x - player.x, u.z - player.z)),
        tactic: u.tactic || 'RAMMING',
        badge: badgeMap[u.tactic] || 'RAMMING',
      });
    }
    list.sort((a, b) => (a.callsign === 'AIR-1' ? -1 : b.callsign === 'AIR-1' ? 1 : a.dist - b.dist));
    return list.slice(0, 6);
  }

  return {
    state,
    addHeat,
    setWantedImmediate,
    clearHeat,
    clearRoadblocks,
    spawnRoadblock,
    ensureHeli,
    update,
    getActiveUnits,
  };
}
