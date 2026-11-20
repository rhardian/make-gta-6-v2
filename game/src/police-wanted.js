// 5-Star Wanted Level & Solaria Bay Police Department (SBPD) tactical pursuit director:
// crime heat reporting, interceptor cruisers, SWORD tactical units, AIR-1 police helicopter
// with searchlight beam, arrest ("BUSTED") and evasion cooldown.

import { WANTED_TIERS } from './config.js';
import { randomRange } from './random.js';
import { createPedestrian } from './traffic-peds.js';
import { createVehicle, updateVehiclePhysics } from './vehicles.js';

const CRIME_HEAT = {
  carjacking: 35,
  gunfire: 28,
  vehicular_assault: 45,
  police_theft: 95,
  cop_eliminated: 90,
  heist_alarm: 120,
};

export function createWantedSystem() {
  return {
    stars: 0,
    heat: 0,
    evasionTimer: 0,
    evading: false,
    dispatchMessage: 'SBPD CHANNEL CLEAR',
    dispatchBannerTimer: 0,
    spawnCooldown: 0,
    bustedTimer: 0,
    helicopter: {
      active: false,
      x: 300,
      y: 0,
      z: 118,
      angle: 0,
      rotorAngle: 0,
      spotlightX: 300,
      spotlightY: 0,
      fireCooldown: 1.5,
    },
  };
}

export function getWantedTier(stars) {
  return WANTED_TIERS[Math.max(0, Math.min(5, stars))] || WANTED_TIERS[0];
}

export function reportPlayerCrime(wanted, crimeType, x, y) {
  const addedHeat = CRIME_HEAT[crimeType] || 30;
  wanted.heat = Math.min(500, wanted.heat + addedHeat);

  let newStars = wanted.stars;
  if (wanted.heat >= 380) newStars = 5;
  else if (wanted.heat >= 260) newStars = Math.max(newStars, 4);
  else if (wanted.heat >= 165) newStars = Math.max(newStars, 3);
  else if (wanted.heat >= 85) newStars = Math.max(newStars, 2);
  else if (wanted.heat >= 25) newStars = Math.max(newStars, 1);

  if (newStars > wanted.stars) {
    wanted.stars = newStars;
    const tier = getWantedTier(newStars);
    wanted.dispatchMessage = `SBPD DISPATCH [${newStars}★]: ${tier.label}`;
    wanted.dispatchBannerTimer = 4.5;
  }

  const tier = getWantedTier(wanted.stars);
  wanted.evasionTimer = tier.cooldownSec;
  wanted.evading = false;
  wanted.lastKnownX = x;
  wanted.lastKnownY = y;
}

export function setWantedLevelImmediate(wanted, stars, playerX = 0, playerY = 0) {
  wanted.stars = Math.max(0, Math.min(5, stars));
  wanted.heat = wanted.stars * 85;
  const tier = getWantedTier(wanted.stars);
  wanted.evasionTimer = tier.cooldownSec;
  wanted.evading = false;
  wanted.lastKnownX = playerX;
  wanted.lastKnownY = playerY;
  if (wanted.stars > 0) {
    wanted.dispatchMessage = `SBPD DISPATCH [${wanted.stars}★]: ${tier.label}`;
    wanted.dispatchBannerTimer = 4.5;
    wanted.helicopter.active = tier.chopper;
    if (tier.chopper) {
      wanted.helicopter.x = playerX - 60;
      wanted.helicopter.y = playerY - 45;
      wanted.helicopter.spotlightX = playerX;
      wanted.helicopter.spotlightY = playerY;
    }
  } else {
    wanted.helicopter.active = false;
    wanted.dispatchMessage = 'WANTED LEVEL CLEARED';
  }
}

export function clearWantedLevel(wanted, player) {
  if (wanted.stars > 0 && player) {
    player.stats.copsEvaded += 1;
    player.respect += wanted.stars * 25;
  }
  wanted.stars = 0;
  wanted.heat = 0;
  wanted.evasionTimer = 0;
  wanted.evading = false;
  wanted.bustedTimer = 0;
  wanted.helicopter.active = false;
  wanted.dispatchMessage = 'SBPD PURSUIT EVADED';
  wanted.dispatchBannerTimer = 3.2;
}

export function updatePolicePursuit(wanted, player, vehicles, pedestrians, cityMap, combatSystem, skidmarks, rng, dt) {
  wanted.dispatchBannerTimer = Math.max(0, wanted.dispatchBannerTimer - dt);
  wanted.spawnCooldown = Math.max(0, wanted.spawnCooldown - dt);

  const tier = getWantedTier(wanted.stars);
  if (wanted.stars === 0) {
    wanted.helicopter.active = false;
    wanted.bustedTimer = 0;
    return null;
  }

  // Count active police pursuit vehicles
  const policeCars = [];
  let minCopDist = Infinity;
  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    if (v.driverType === 'police' && !v.destroyed) {
      policeCars.push(v);
      const d = Math.hypot(v.x - player.x, v.y - player.y);
      if (d < minCopDist) minCopDist = d;
    }
  }

  // Spawn additional police interceptors or SWORD units when under tier cap
  if (policeCars.length < tier.maxUnits && wanted.spawnCooldown <= 0) {
    wanted.spawnCooldown = 3.2;
    const spawnAngle = player.angle + randomRange(rng, -1.2, 1.2);
    const spawnDist = randomRange(rng, 210, 310);
    const sx = Math.max(-720, Math.min(500, player.x + Math.cos(spawnAngle) * spawnDist));
    const sy = Math.max(-720, Math.min(720, player.y + Math.sin(spawnAngle) * spawnDist));
    const specId = (tier.sword && rng() > 0.55) ? 'sword_tactical' : 'sbpd_interceptor';
    const copCar = createVehicle(specId, sx, sy, Math.atan2(player.y - sy, player.x - sx), rng, {
      driverType: 'police',
      sirenActive: true,
    });
    copCar.speed = 165;
    vehicles.push(copCar);
  }

  // Steer each police vehicle toward intercepting the player
  for (let i = 0; i < policeCars.length; i += 1) {
    const cop = policeCars[i];
    cop.sirenActive = true;
    const leadX = player.x + player.vx * 0.35;
    const leadY = player.y + player.vy * 0.35;
    const dx = leadX - cop.x;
    const dy = leadY - cop.y;
    const dist = Math.hypot(dx, dy);
    const desiredAngle = Math.atan2(dy, dx);

    let angleDiff = desiredAngle - cop.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const steer = Math.max(-1, Math.min(1, angleDiff * 2.5));
    const throttle = dist > 38 ? 0.92 : -0.35;
    const handbrake = Math.abs(angleDiff) > 1.15 && cop.speed > 110;

    updateVehiclePhysics(cop, { throttle, steer, handbrake }, cityMap, skidmarks, dt);

    // Deploy an on-foot officer if stopped close to the player
    if (dist < 85 && Math.abs(cop.speed) < 35 && rng() < dt * 0.45) {
      const activeOfficers = pedestrians.filter((p) => p.alive && p.role === 'police').length;
      if (activeOfficers < tier.maxUnits + 2) {
        const officer = createPedestrian(cop.x - Math.sin(cop.angle) * 18, cop.y + Math.cos(cop.angle) * 18, rng, 'police');
        pedestrians.push(officer);
      }
    }
  }

  // Update AIR-1 Police Helicopter at 3+ stars
  wanted.helicopter.active = tier.chopper;
  if (wanted.helicopter.active) {
    const h = wanted.helicopter;
    h.rotorAngle = (h.rotorAngle + dt * 28) % (Math.PI * 2);
    const orbitAngle = performance.now() * 0.00055;
    const targetX = player.x + Math.cos(orbitAngle) * 68;
    const targetY = player.y + Math.sin(orbitAngle) * 68;
    h.x += (targetX - h.x) * Math.min(1, dt * 2.8);
    h.y += (targetY - h.y) * Math.min(1, dt * 2.8);
    h.angle = Math.atan2(player.y - h.y, player.x - h.x);
    h.spotlightX += (player.x - h.spotlightX) * Math.min(1, dt * 5.5);
    h.spotlightY += (player.y - h.spotlightY) * Math.min(1, dt * 5.5);

    h.fireCooldown -= dt;
    if (wanted.stars >= 4 && h.fireCooldown <= 0) {
      h.fireCooldown = 1.35;
      combatSystem.spawnProjectile({
        owner: 'police',
        x: h.x,
        y: h.y,
        z: 42,
        angle: h.angle + randomRange(rng, -0.08, 0.08),
        speed: 620,
        damage: 7,
        range: 340,
        color: '#fde047',
      });
    }
  }

  // Check evasion or arrest ("BUSTED")
  if (minCopDist > 340 && !wanted.helicopter.active) {
    wanted.evading = true;
    wanted.evasionTimer -= dt;
    if (wanted.evasionTimer <= 0) {
      clearWantedLevel(wanted, player);
    }
  } else if (minCopDist > 420 && wanted.helicopter.active) {
    wanted.evading = true;
    wanted.evasionTimer -= dt * 0.7;
    if (wanted.evasionTimer <= 0) {
      clearWantedLevel(wanted, player);
    }
  } else {
    wanted.evading = false;
    wanted.evasionTimer = Math.min(tier.cooldownSec, wanted.evasionTimer + dt * 0.5);
  }

  if (minCopDist < 34 && Math.abs(player.speed) < 18 && player.health < 45) {
    wanted.bustedTimer += dt;
    if (wanted.bustedTimer > 2.2) {
      return 'busted';
    }
  } else {
    wanted.bustedTimer = Math.max(0, wanted.bustedTimer - dt);
  }

  return null;
}
