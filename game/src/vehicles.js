// Vehicle fleet creation, arcade drift & nitro physics, speedboat hydrodynamics,
// vehicle-to-vehicle and building collisions, skidmarks, damage and explosions.

import { VEHICLE_CATALOG, WORLD_CONFIG } from './config.js';
import { resolveCircleBuildingCollision } from './city-map.js';
import { randomChoice } from './random.js';

let nextVehicleUid = 1;

export function createVehicle(specId, x, y, angle = 0, rng = Math.random, overrides = {}) {
  const spec = VEHICLE_CATALOG[specId] || VEHICLE_CATALOG.palma_cruiser;
  const color = overrides.color || randomChoice(rng, spec.colors) || '#38bdf8';

  return {
    id: `veh_${nextVehicleUid++}`,
    specId: spec.id,
    name: spec.name,
    category: spec.category,
    x,
    y,
    z: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    angle,
    steerAngle: 0,
    length: spec.length,
    width: spec.width,
    height: spec.height,
    maxSpeed: spec.maxSpeed,
    accel: spec.accel,
    brake: spec.brake,
    turnRate: spec.turnRate,
    driftGrip: spec.driftGrip,
    health: spec.maxHealth,
    maxHealth: spec.maxHealth,
    value: spec.value,
    color,
    stripeColor: overrides.stripeColor ?? spec.stripeColor ?? null,
    underglowColor: overrides.underglowColor ?? spec.underglowColor ?? null,
    hasSpoiler: Boolean(overrides.hasSpoiler ?? spec.hasSpoiler),
    customTier: overrides.customTier || 1,
    wheelSpin: 0,
    wakePhase: (nextVehicleUid * 1.1) % 6.28,
    convertible: Boolean(spec.convertible),
    isPolice: Boolean(spec.isPolice),
    isBoat: Boolean(spec.isBoat),
    sirenActive: Boolean(overrides.sirenActive || spec.isPolice),
    sirenPhase: (nextVehicleUid * 0.7) % 6.28,
    driverType: overrides.driverType || 'traffic', // 'player' | 'traffic' | 'police' | 'parked' | 'mission'
    drifting: false,
    nitroActive: false,
    nitroFuel: 100,
    braking: false,
    destroyed: false,
    burnTimer: 0,
    aiTargetSpeed: overrides.aiTargetSpeed ?? 125,
    aiTurnCooldown: 0,
    missionTag: overrides.missionTag || null,
  };
}

export function updateVehiclePhysics(vehicle, controls, cityMap, skidmarks, dt) {
  if (vehicle.destroyed) {
    vehicle.vx *= Math.max(0, 1 - dt * 4);
    vehicle.vy *= Math.max(0, 1 - dt * 4);
    vehicle.speed *= Math.max(0, 1 - dt * 4);
    return null;
  }

  const throttle = controls.throttle || 0; // -1..1
  const steer = controls.steer || 0;       // -1..1
  const handbrake = Boolean(controls.handbrake);
  const nitro = Boolean(controls.nitro) && vehicle.nitroFuel > 5 && throttle > 0.1;

  vehicle.sirenPhase = (vehicle.sirenPhase + dt * 11) % (Math.PI * 2);
  vehicle.wakePhase = (vehicle.wakePhase + dt * 7) % (Math.PI * 2);
  vehicle.steerAngle = steer * 0.55;
  vehicle.braking = throttle < -0.1 && vehicle.speed > 20;
  vehicle.nitroActive = nitro;

  if (nitro) {
    vehicle.nitroFuel = Math.max(0, vehicle.nitroFuel - dt * 28);
  } else if (vehicle.driverType === 'player') {
    vehicle.nitroFuel = Math.min(100, vehicle.nitroFuel + dt * 9);
  }

  const forwardX = Math.cos(vehicle.angle);
  const forwardY = Math.sin(vehicle.angle);
  const rightX = -forwardY;
  const rightY = forwardX;

  let forwardSpeed = vehicle.vx * forwardX + vehicle.vy * forwardY;
  let lateralSpeed = vehicle.vx * rightX + vehicle.vy * rightY;

  const topSpeed = nitro ? vehicle.maxSpeed * 1.28 : vehicle.maxSpeed;
  const accelRate = nitro ? vehicle.accel * 1.55 : vehicle.accel;

  if (throttle > 0.02) {
    if (forwardSpeed < topSpeed) {
      forwardSpeed += throttle * accelRate * dt;
    }
  } else if (throttle < -0.02) {
    if (forwardSpeed > 15) {
      forwardSpeed += throttle * vehicle.brake * dt;
    } else {
      forwardSpeed = Math.max(-topSpeed * 0.42, forwardSpeed + throttle * vehicle.accel * 0.75 * dt);
    }
  } else {
    const drag = vehicle.isBoat ? 1.4 : 1.85;
    forwardSpeed *= Math.max(0, 1 - drag * dt);
  }

  if (handbrake) {
    forwardSpeed *= Math.max(0, 1 - 3.1 * dt);
  }

  // Ackermann steering scaled by speed
  const speedFactor = Math.min(1, Math.abs(forwardSpeed) / 55);
  const dirSign = forwardSpeed >= -5 ? 1 : -1;
  const turnMultiplier = handbrake ? 1.28 : 1.0;
  vehicle.angle += steer * vehicle.turnRate * speedFactor * dirSign * turnMultiplier * dt;

  // Drift & lateral grip decay
  const grip = handbrake ? vehicle.driftGrip * 0.76 : vehicle.driftGrip;
  lateralSpeed *= Math.pow(grip, dt * 60);

  const newForwardX = Math.cos(vehicle.angle);
  const newForwardY = Math.sin(vehicle.angle);
  const newRightX = -newForwardY;
  const newRightY = newForwardX;

  vehicle.vx = newForwardX * forwardSpeed + newRightX * lateralSpeed;
  vehicle.vy = newForwardY * forwardSpeed + newRightY * lateralSpeed;
  vehicle.speed = forwardSpeed;

  const prevX = vehicle.x;
  const prevY = vehicle.y;
  vehicle.x += vehicle.vx * dt;
  vehicle.y += vehicle.vy * dt;

  // Emit drift skidmark line segments when lateral slip or handbrake at speed
  vehicle.drifting = !vehicle.isBoat && Math.abs(forwardSpeed) > 65 && (handbrake || Math.abs(lateralSpeed) > 26);
  if (vehicle.drifting && skidmarks) {
    const rearOffset = vehicle.length * 0.36;
    const prevRearX = prevX - newForwardX * rearOffset;
    const prevRearY = prevY - newForwardY * rearOffset;
    const rearX = vehicle.x - newForwardX * rearOffset;
    const rearY = vehicle.y - newForwardY * rearOffset;
    const halfW = vehicle.width * 0.38;
    skidmarks.push(
      {
        x1: prevRearX + newRightX * halfW,
        y1: prevRearY + newRightY * halfW,
        x2: rearX + newRightX * halfW,
        y2: rearY + newRightY * halfW,
      },
      {
        x1: prevRearX - newRightX * halfW,
        y1: prevRearY - newRightY * halfW,
        x2: rearX - newRightX * halfW,
        y2: rearY - newRightY * halfW,
      },
    );
    if (skidmarks.length > 240) skidmarks.splice(0, skidmarks.length - 240);
  }

  // Keep boats on water and cars on land
  if (vehicle.isBoat) {
    if (vehicle.x < WORLD_CONFIG.oceanStartX - 8) {
      vehicle.x = WORLD_CONFIG.oceanStartX - 8;
      vehicle.vx = Math.abs(vehicle.vx) * 0.4;
    }
  } else if (vehicle.x > WORLD_CONFIG.oceanStartX - 6) {
    // Allow driving onto marina piers, otherwise stop at seawall
    const onPier = cityMap.piers.some(
      (p) => Math.abs(vehicle.y - p.y) < p.length * 0.5 && vehicle.x < p.x + p.width,
    );
    if (!onPier) {
      vehicle.x = WORLD_CONFIG.oceanStartX - 6;
      vehicle.vx = -Math.abs(vehicle.vx) * 0.35;
      vehicle.speed *= 0.4;
    }
  }

  // World bounds clamp
  const bound = WORLD_CONFIG.worldMaxX - 18;
  if (vehicle.x < -bound) { vehicle.x = -bound; vehicle.vx = Math.abs(vehicle.vx) * 0.4; }
  if (vehicle.x > bound + 160) { vehicle.x = bound + 160; vehicle.vx = -Math.abs(vehicle.vx) * 0.4; }
  if (vehicle.y < -bound) { vehicle.y = -bound; vehicle.vy = Math.abs(vehicle.vy) * 0.4; }
  if (vehicle.y > bound) { vehicle.y = bound; vehicle.vy = -Math.abs(vehicle.vy) * 0.4; }

  // Building collision check
  const radius = Math.max(vehicle.width, vehicle.length * 0.44) * 0.52;
  const hitBuilding = resolveCircleBuildingCollision(cityMap, vehicle, radius);
  if (hitBuilding) {
    const impactSpeed = Math.hypot(vehicle.vx, vehicle.vy);
    vehicle.vx *= -0.25;
    vehicle.vy *= -0.25;
    vehicle.speed *= -0.25;
    if (impactSpeed > 110) {
      applyVehicleDamage(vehicle, (impactSpeed - 95) * 0.16);
    }
    return { type: 'building_hit', speed: impactSpeed, building: hitBuilding };
  }

  return null;
}

export function resolveVehicleCollisions(vehicles) {
  const impacts = [];
  for (let i = 0; i < vehicles.length; i += 1) {
    const a = vehicles[i];
    for (let j = i + 1; j < vehicles.length; j += 1) {
      const b = vehicles[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const minDist = (a.width + b.width) * 0.56 + 6;
      const distSq = dx * dx + dy * dy;
      if (distSq > 0.001 && distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = (minDist - dist) * 0.5;

        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        const relVx = b.vx - a.vx;
        const relVy = b.vy - a.vy;
        const sepVel = relVx * nx + relVy * ny;
        if (sepVel < 0) {
          const impulse = -sepVel * 0.65;
          a.vx -= nx * impulse;
          a.vy -= ny * impulse;
          b.vx += nx * impulse;
          b.vy += ny * impulse;
          a.speed *= 0.78;
          b.speed *= 0.78;

          if (Math.abs(sepVel) > 85) {
            const dmg = (Math.abs(sepVel) - 70) * 0.18;
            applyVehicleDamage(a, dmg);
            applyVehicleDamage(b, dmg);
            impacts.push({ x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5, force: Math.abs(sepVel), a, b });
          }
        }
      }
    }
  }
  return impacts;
}

export function applyVehicleDamage(vehicle, amount) {
  if (vehicle.destroyed || amount <= 0) return false;
  vehicle.health = Math.max(0, vehicle.health - amount);
  if (vehicle.health <= 0) {
    vehicle.destroyed = true;
    vehicle.burnTimer = 6.0;
    return true;
  }
  return false;
}

export function customizeVehicleAtGarage(vehicle, paintColor, underglowColor = '#25f4ee') {
  if (!vehicle) return null;
  vehicle.color = paintColor || vehicle.color;
  vehicle.underglowColor = underglowColor;
  vehicle.hasSpoiler = true;
  vehicle.customTier = Math.min(3, (vehicle.customTier || 1) + 1);
  vehicle.maxHealth = Math.round(vehicle.maxHealth * 1.15);
  vehicle.health = vehicle.maxHealth;
  vehicle.nitroFuel = 100;
  return vehicle;
}
