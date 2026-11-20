// Player character state (Valeria "Val" Reyes): on-foot locomotion, sprinting, weapon aiming
// and firing, vehicle hijacking/entry/exit, landmark interactions, health, armor and cash.

import { WEAPON_CATALOG, WORLD_CONFIG } from './config.js';
import { resolveCircleBuildingCollision } from './city-map.js';

export function createPlayerState() {
  const ammoByWeapon = {};
  for (let i = 0; i < WEAPON_CATALOG.length; i += 1) {
    const w = WEAPON_CATALOG[i];
    ammoByWeapon[w.id] = w.infinite ? 999 : (w.defaultAmmo || 120);
  }

  return {
    name: 'Valeria "Val" Reyes',
    x: 455,
    y: 45,
    z: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    angle: -Math.PI * 0.5,
    aimAngle: -Math.PI * 0.5,
    health: 100,
    maxHealth: 100,
    armor: 75,
    maxArmor: 100,
    stamina: 100,
    cash: 12500,
    respect: 150,
    weaponIndex: 2, // Stinger Micro-SMG equipped by default
    ammo: ammoByWeapon,
    fireCooldown: 0,
    muzzleFlashTimer: 0,
    walkCycle: 0,
    sprinting: false,
    inVehicle: false,
    vehicle: null,
    nearbyVehicle: null,
    nearbyLandmark: null,
    stats: {
      carsHijacked: 0,
      missionsCompleted: 0,
      copsEvaded: 0,
      eliminations: 0,
      totalEarnings: 12500,
    },
  };
}

export function getEquippedWeapon(player) {
  return WEAPON_CATALOG[player.weaponIndex] || WEAPON_CATALOG[0];
}

export function cyclePlayerWeapon(player, delta = 1) {
  const len = WEAPON_CATALOG.length;
  player.weaponIndex = (player.weaponIndex + delta + len) % len;
  return getEquippedWeapon(player);
}

export function selectPlayerWeapon(player, index) {
  if (index >= 0 && index < WEAPON_CATALOG.length) {
    player.weaponIndex = index;
  }
  return getEquippedWeapon(player);
}

export function findNearestInteractableVehicle(player, vehicles, maxDist = 52) {
  if (player.inVehicle) return null;
  let best = null;
  let bestDist = maxDist;
  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    if (v.destroyed) continue;
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < bestDist) {
      bestDist = d;
      best = v;
    }
  }
  return best;
}

export function attemptEnterOrHijackVehicle(player, vehicles) {
  if (player.inVehicle && player.vehicle) {
    return exitCurrentVehicle(player);
  }

  const target = findNearestInteractableVehicle(player, vehicles, 54);
  if (!target) return null;

  const wasOccupied = target.driverType === 'traffic' || target.driverType === 'police';
  const wasPolice = target.isPolice;

  player.inVehicle = true;
  player.vehicle = target;
  player.x = target.x;
  player.y = target.y;
  player.angle = target.angle;
  target.driverType = 'player';
  player.stats.carsHijacked += 1;

  return {
    action: 'entered',
    vehicle: target,
    hijacked: wasOccupied,
    policeTheft: wasPolice,
  };
}

export function exitCurrentVehicle(player) {
  const v = player.vehicle;
  if (!v) {
    player.inVehicle = false;
    return null;
  }
  const sideAngle = v.angle - Math.PI * 0.5;
  player.x = v.x + Math.cos(sideAngle) * (v.width * 0.85 + 10);
  player.y = v.y + Math.sin(sideAngle) * (v.width * 0.85 + 10);
  player.vx = v.vx * 0.25;
  player.vy = v.vy * 0.25;
  player.speed = 0;
  player.angle = v.angle;
  player.inVehicle = false;
  player.vehicle = null;
  v.driverType = 'parked';
  return { action: 'exited', vehicle: v };
}

export function updatePlayerOnFoot(player, inputState, camera, cityMap, vehicles, dt) {
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.muzzleFlashTimer = Math.max(0, player.muzzleFlashTimer - dt);

  if (player.inVehicle && player.vehicle) {
    if (player.vehicle.destroyed) {
      exitCurrentVehicle(player);
      damagePlayer(player, 35);
    } else {
      player.x = player.vehicle.x;
      player.y = player.vehicle.y;
      player.vx = player.vehicle.vx;
      player.vy = player.vehicle.vy;
      player.speed = player.vehicle.speed;
      player.angle = player.vehicle.angle;
      player.aimAngle = player.vehicle.angle;
      player.nearbyVehicle = null;
      player.nearbyLandmark = findNearbyLandmark(player, cityMap, 65);
      return;
    }
  }

  // Camera-relative movement on foot: W/S moves forward/back along camera yaw, A/D turns or strafes
  const moveForward = inputState.moveForward || 0;
  const moveRight = inputState.moveRight || 0;
  const turnInput = inputState.turnInput || 0;

  if (turnInput !== 0) {
    player.angle += turnInput * 2.75 * dt;
  }

  const forwardX = Math.cos(camera.yaw);
  const forwardY = Math.sin(camera.yaw);
  const rightX = -forwardY;
  const rightY = forwardX;

  let wishX = forwardX * moveForward + rightX * moveRight;
  let wishY = forwardY * moveForward + rightY * moveRight;
  const wishMag = Math.hypot(wishX, wishY);

  player.sprinting = Boolean(inputState.sprint) && wishMag > 0.1 && player.stamina > 5;
  if (player.sprinting) {
    player.stamina = Math.max(0, player.stamina - dt * 18);
  } else {
    player.stamina = Math.min(100, player.stamina + dt * 14);
  }

  const moveSpeed = player.sprinting ? 142 : 96;
  if (wishMag > 0.05) {
    wishX /= wishMag;
    wishY /= wishMag;
    player.vx = wishX * moveSpeed;
    player.vy = wishY * moveSpeed;
    player.speed = moveSpeed;
    player.walkCycle = (player.walkCycle + dt * (player.sprinting ? 14 : 9)) % (Math.PI * 2);
    if (!inputState.mouseAimActive) {
      player.angle = Math.atan2(wishY, wishX);
      player.aimAngle = player.angle;
    }
  } else {
    player.vx *= Math.max(0, 1 - dt * 14);
    player.vy *= Math.max(0, 1 - dt * 14);
    player.speed = Math.hypot(player.vx, player.vy);
  }

  if (inputState.mouseAimActive && inputState.aimWorldPoint) {
    player.aimAngle = Math.atan2(
      inputState.aimWorldPoint.y - player.y,
      inputState.aimWorldPoint.x - player.x,
    );
    if (wishMag < 0.05 || inputState.firing) {
      player.angle = player.aimAngle;
    }
  } else {
    player.aimAngle = player.angle;
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // Keep player on land or marina piers
  if (player.x > WORLD_CONFIG.oceanStartX - 4) {
    const onPier = cityMap.piers.some(
      (p) => Math.abs(player.y - p.y) < p.length * 0.5 && player.x < p.x + p.width,
    );
    if (!onPier) player.x = WORLD_CONFIG.oceanStartX - 4;
  }

  const bound = WORLD_CONFIG.worldMaxX - 15;
  player.x = Math.max(-bound, Math.min(bound + 140, player.x));
  player.y = Math.max(-bound, Math.min(bound, player.y));

  resolveCircleBuildingCollision(cityMap, player, 9);

  player.nearbyVehicle = findNearestInteractableVehicle(player, vehicles, 54);
  player.nearbyLandmark = findNearbyLandmark(player, cityMap, 48);
}

export function findNearbyLandmark(player, cityMap, maxDist = 52) {
  let best = null;
  let bestDist = maxDist;
  for (let i = 0; i < cityMap.landmarks.length; i += 1) {
    const lm = cityMap.landmarks[i];
    const d = Math.hypot(lm.x - player.x, lm.y - player.y);
    if (d < bestDist) {
      bestDist = d;
      best = lm;
    }
  }
  return best;
}

export function damagePlayer(player, amount) {
  if (amount <= 0) return false;
  let remaining = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, remaining * 0.7);
    player.armor = Math.max(0, player.armor - absorbed);
    remaining -= absorbed;
  }
  player.health = Math.max(0, player.health - remaining);
  return player.health <= 0;
}
