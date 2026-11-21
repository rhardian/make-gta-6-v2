// Autonomous city traffic vehicles, marina speedboats and sidewalk pedestrians for Solaria Bay:
// lane following, intersection turns, traffic light compliance, pedestrian panic and cash drops.

import { WORLD_CONFIG } from './config.js';
import { getTrafficLightState, resolveCircleBuildingCollision } from './city-map.js';
import { randomChoice, randomRange } from './random.js';
import { createVehicle, updateVehiclePhysics } from './vehicles.js';

const TRAFFIC_SPECS = [
  'palma_cruiser',
  'palma_cruiser',
  'solaria_roadster',
  'tormenta_sabre',
  'brutus_suv',
  'mako_gtr',
];

const PED_OUTFITS = [
  { shirt: '#ff5e8e', pants: '#1e293b', skin: '#f1c27d', hair: '#271810' },
  { shirt: '#25f4ee', pants: '#0f172a', skin: '#e0ac69', hair: '#111827' },
  { shirt: '#facc15', pants: '#334155', skin: '#c68642', hair: '#1c1917' },
  { shirt: '#a855f7', pants: '#1e1b4b', skin: '#ffdbac', hair: '#7c2d12' },
  { shirt: '#34d399', pants: '#1f2937', skin: '#d2996c', hair: '#090d16' },
  { shirt: '#fb923c', pants: '#0f172a', skin: '#f1c27d', hair: '#3f2314' },
];

let nextPedUid = 1;

export function createPedestrian(x, y, rng, role = 'civilian', overrides = {}) {
  const outfit = randomChoice(rng, PED_OUTFITS) || PED_OUTFITS[0];
  const isPolice = role === 'police';
  const isSyndicate = role === 'syndicate';
  const isPartner = role === 'partner';

  return {
    id: `ped_${nextPedUid++}`,
    role, // 'civilian' | 'police' | 'syndicate' | 'partner'
    name: overrides.name || (isPartner ? 'Rico Vega' : null),
    x,
    y,
    z: 0,
    vx: 0,
    vy: 0,
    angle: overrides.angle ?? randomRange(rng, -Math.PI, Math.PI),
    aimAngle: overrides.aimAngle ?? overrides.angle ?? 0,
    walkCycle: randomRange(rng, 0, Math.PI * 2),
    health: isPartner ? 200 : isSyndicate ? 90 : isPolice ? 100 : 50,
    maxHealth: isPartner ? 200 : isSyndicate ? 90 : isPolice ? 100 : 50,
    alive: true,
    panicTimer: overrides.panicTimer ?? 0,
    fireCooldown: randomRange(rng, 0.2, 1.0),
    muzzleFlashTimer: overrides.muzzleFlashTimer ?? 0,
    hasWeapon: Boolean(overrides.hasWeapon ?? (isPolice || isSyndicate || isPartner)),
    cashValue: isSyndicate ? 450 : Math.round(randomRange(rng, 40, 160)),
    shirtColor: overrides.shirtColor || (isPolice ? '#1e3a8a' : isSyndicate ? '#dc2626' : isPartner ? '#f59e0b' : outfit.shirt),
    pantsColor: overrides.pantsColor || (isPolice ? '#0f172a' : isSyndicate ? '#111827' : isPartner ? '#1e293b' : outfit.pants),
    skinColor: overrides.skinColor || outfit.skin,
    hairColor: overrides.hairColor || outfit.hair,
    targetDirTimer: randomRange(rng, 2.5, 6.0),
  };
}

export function createTrafficAndPedestrians(cityMap, rng) {
  const vehicles = [];
  const pedestrians = [];
  const cashDrops = [];

  // Parked exotic & signature vehicles near player start and landmarks
  vehicles.push(
    createVehicle('mako_gtr', 480, 15, -Math.PI * 0.5, rng, {
      color: '#00f0ff',
      driverType: 'parked',
    }),
    createVehicle('solaria_roadster', 494, -85, -Math.PI * 0.5, rng, {
      color: '#ff477e',
      driverType: 'parked',
    }),
    createVehicle('tormenta_sabre', 225, 25, 0, rng, {
      color: '#f59e0b',
      driverType: 'parked',
    }),
    createVehicle('corsair_jetboat', WORLD_CONFIG.oceanStartX + 75, 65, -Math.PI * 0.5, rng, {
      color: '#06b6d4',
      driverType: 'parked',
    }),
    createVehicle('corsair_jetboat', WORLD_CONFIG.oceanStartX + 82, -175, Math.PI * 0.5, rng, {
      color: '#f8fafc',
      driverType: 'parked',
    }),
  );

  // Moving traffic along avenues (roadsX) and boulevards (roadsY)
  for (let i = 0; i < cityMap.roadsX.length; i += 1) {
    const rx = cityMap.roadsX[i];
    for (let k = -2; k <= 2; k += 1) {
      const dir = (k + i) % 2 === 0 ? 1 : -1;
      const laneOffset = dir > 0 ? -13 : 13;
      const vy = k * 240 + 95;
      const spec = randomChoice(rng, TRAFFIC_SPECS);
      const car = createVehicle(spec, rx + laneOffset, vy, dir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5, rng, {
        driverType: 'traffic',
        aiTargetSpeed: randomRange(rng, 105, 155),
      });
      car.speed = car.aiTargetSpeed * 0.7;
      car.vy = dir * car.speed;
      vehicles.push(car);
    }
  }

  for (let j = 0; j < cityMap.roadsY.length; j += 1) {
    const ry = cityMap.roadsY[j];
    if (Math.abs(ry) > 480) continue;
    for (let k = -2; k <= 1; k += 1) {
      const dir = (k + j) % 2 === 0 ? 1 : -1;
      const laneOffset = dir > 0 ? 13 : -13;
      const vx = k * 240 + 110;
      const spec = randomChoice(rng, TRAFFIC_SPECS);
      const car = createVehicle(spec, vx, ry + laneOffset, dir > 0 ? 0 : Math.PI, rng, {
        driverType: 'traffic',
        aiTargetSpeed: randomRange(rng, 105, 150),
      });
      car.speed = car.aiTargetSpeed * 0.7;
      car.vx = dir * car.speed;
      vehicles.push(car);
    }
  }

  // Sidewalk pedestrians across districts, Ocean Palm Promenade, Beach & Marina Pier
  for (let i = 0; i < 56; i += 1) {
    const rx = randomChoice(rng, cityMap.roadsX);
    const side = rng() > 0.5 ? 34 : -34;
    const py = randomRange(rng, -680, 680);
    const ped = createPedestrian(rx + side, py, rng, 'civilian');
    ped.angle = rng() > 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5;
    pedestrians.push(ped);
  }
  for (let by = -320; by <= 320; by += 55) {
    const beachPed = createPedestrian(WORLD_CONFIG.beachStartX + 18 + (Math.abs(by) % 45), by, rng, 'civilian');
    beachPed.angle = by % 2 === 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
    pedestrians.push(beachPed);
  }

  return {
    vehicles,
    pedestrians,
    cashDrops,
  };
}

export function updateTrafficVehicles(vehicles, cityMap, simTime, skidmarks, rng, dt) {
  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    if (v.driverType !== 'traffic' || v.destroyed) continue;

    v.aiTurnCooldown = Math.max(0, v.aiTurnCooldown - dt);
    const forwardX = Math.cos(v.angle);
    const forwardY = Math.sin(v.angle);

    // Check distance to vehicle directly ahead
    let blockedAhead = false;
    for (let j = 0; j < vehicles.length; j += 1) {
      if (i === j) continue;
      const other = vehicles[j];
      const dx = other.x - v.x;
      const dy = other.y - v.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 78) {
        const dot = (dx * forwardX + dy * forwardY) / (dist || 1);
        if (dot > 0.82) {
          blockedAhead = true;
          break;
        }
      }
    }

    // Check nearest intersection & traffic lights
    let stopAtLight = false;
    for (let rxIdx = 0; rxIdx < cityMap.roadsX.length; rxIdx += 1) {
      const rx = cityMap.roadsX[rxIdx];
      for (let ryIdx = 0; ryIdx < cityMap.roadsY.length; ryIdx += 1) {
        const ry = cityMap.roadsY[ryIdx];
        const dx = rx - v.x;
        const dy = ry - v.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 58 && dist > 22) {
          const approaching = (dx * forwardX + dy * forwardY) > 0;
          if (approaching) {
            const light = getTrafficLightState(simTime, rx, ry);
            const movingNS = Math.abs(forwardY) > Math.abs(forwardX);
            if ((movingNS && light.startsWith('ew')) || (!movingNS && light.startsWith('ns'))) {
              stopAtLight = true;
            }
          }
        } else if (dist <= 22 && v.aiTurnCooldown <= 0 && rng() < 0.25) {
          // Occasional smooth 90-degree turn onto cross street
          const turnSign = rng() > 0.5 ? 1 : -1;
          v.angle += turnSign * Math.PI * 0.5;
          v.aiTurnCooldown = 4.0;
        }
      }
    }

    // Snap angle gently toward cardinal road heading
    const cardinalAngle = Math.round(v.angle / (Math.PI * 0.5)) * (Math.PI * 0.5);
    let angleError = cardinalAngle - v.angle;
    while (angleError > Math.PI) angleError -= Math.PI * 2;
    while (angleError < -Math.PI) angleError += Math.PI * 2;

    const steer = Math.max(-1, Math.min(1, angleError * 2.2));
    let throttle = 0.65;
    if (blockedAhead || stopAtLight) {
      throttle = v.speed > 12 ? -0.8 : 0;
    } else if (v.speed > v.aiTargetSpeed) {
      throttle = 0.1;
    }

    updateVehiclePhysics(v, { throttle, steer, handbrake: false }, cityMap, skidmarks, dt);

    // Loop traffic smoothly around city bounds
    if (v.y > 760) v.y = -740;
    if (v.y < -760) v.y = 740;
    if (v.x < -760) v.x = 460;
    if (v.x > 530 && !v.isBoat) {
      v.angle = Math.PI;
      v.x = 510;
    }
  }
}

export function updatePedestrianAI(pedestrians, cashDrops, player, vehicles, cityMap, combatSystem, wantedSystem, rng, dt) {
  for (let i = 0; i < pedestrians.length; i += 1) {
    const p = pedestrians[i];
    if (!p.alive) continue;

    p.targetDirTimer -= dt;
    p.fireCooldown = Math.max(0, p.fireCooldown - dt);
    p.muzzleFlashTimer = Math.max(0, (p.muzzleFlashTimer || 0) - dt);

    if (p.role === 'partner') {
      p.walkCycle = (p.walkCycle + dt * 3.5) % (Math.PI * 2);
      continue;
    }

    const distToPlayer = Math.hypot(player.x - p.x, player.y - p.y);

    if (p.role === 'syndicate' || (p.role === 'police' && wantedSystem.stars > 0)) {
      // Hostile combatant AI: face player and fire bursts
      if (distToPlayer < 310) {
        p.angle = Math.atan2(player.y - p.y, player.x - p.x);
        p.aimAngle = p.angle;
        if (distToPlayer > 95) {
          p.vx = Math.cos(p.angle) * 58;
          p.vy = Math.sin(p.angle) * 58;
          p.walkCycle = (p.walkCycle + dt * 8) % (Math.PI * 2);
        } else {
          p.vx = 0;
          p.vy = 0;
        }
        if (p.fireCooldown <= 0 && distToPlayer < 260) {
          p.fireCooldown = p.role === 'syndicate' ? 0.85 : 0.95;
          p.muzzleFlashTimer = 0.14;
          combatSystem.spawnProjectile({
            owner: p.role,
            x: p.x + Math.cos(p.angle) * 10,
            y: p.y + Math.sin(p.angle) * 10,
            z: 11,
            angle: p.angle + randomRange(rng, -0.07, 0.07),
            speed: 540,
            damage: p.role === 'syndicate' ? 9 : 8,
            range: 300,
            color: '#fb7185',
          });
        }
      }
    } else {
      // Civilian sidewalk walker or panicking flee behavior
      if (p.panicTimer > 0) {
        p.panicTimer = Math.max(0, p.panicTimer - dt);
        p.angle = Math.atan2(p.y - player.y, p.x - player.x);
        p.vx = Math.cos(p.angle) * 92;
        p.vy = Math.sin(p.angle) * 92;
        p.walkCycle = (p.walkCycle + dt * 13) % (Math.PI * 2);
      } else {
        if (p.targetDirTimer <= 0) {
          p.targetDirTimer = randomRange(rng, 3.0, 7.0);
          if (rng() < 0.35) p.angle += (rng() > 0.5 ? 1 : -1) * Math.PI * 0.5;
        }
        p.vx = Math.cos(p.angle) * 36;
        p.vy = Math.sin(p.angle) * 36;
        p.walkCycle = (p.walkCycle + dt * 6) % (Math.PI * 2);
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x > WORLD_CONFIG.oceanStartX - 10) {
      p.x = WORLD_CONFIG.oceanStartX - 10;
      p.angle = Math.PI;
    }

    resolveCircleBuildingCollision(cityMap, p, 6);

    // Check vehicle hit on pedestrian
    for (let vIdx = 0; vIdx < vehicles.length; vIdx += 1) {
      const v = vehicles[vIdx];
      if (Math.abs(v.speed) < 42) continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d < v.width * 0.65 + 5) {
        p.health -= Math.abs(v.speed) * 0.65;
        p.vx = v.vx * 0.8;
        p.vy = v.vy * 0.8;
        if (v.driverType === 'player') {
          wantedSystem.reportCrime('vehicular_assault', player.x, player.y);
        }
        if (p.health <= 0) {
          eliminatePedestrian(p, cashDrops, player);
        }
        break;
      }
    }
  }

  // Collect nearby cash drops
  for (let i = cashDrops.length - 1; i >= 0; i -= 1) {
    const drop = cashDrops[i];
    drop.ttl -= dt;
    if (drop.ttl <= 0) {
      cashDrops.splice(i, 1);
      continue;
    }
    if (Math.hypot(player.x - drop.x, player.y - drop.y) < 28) {
      player.cash += drop.amount;
      player.stats.totalEarnings += drop.amount;
      cashDrops.splice(i, 1);
    }
  }
}

export function eliminatePedestrian(ped, cashDrops, player) {
  if (!ped.alive) return;
  ped.alive = false;
  if (player) player.stats.eliminations += 1;
  if (cashDrops && ped.cashValue > 0) {
    cashDrops.push({
      x: ped.x,
      y: ped.y,
      amount: ped.cashValue,
      ttl: 25,
    });
  }
}

export function alertNearbyPedestrians(pedestrians, x, y, radius = 220) {
  for (let i = 0; i < pedestrians.length; i += 1) {
    const p = pedestrians[i];
    if (!p.alive || p.role !== 'civilian') continue;
    if (Math.hypot(p.x - x, p.y - y) < radius) {
      p.panicTimer = 7.5;
    }
  }
}
