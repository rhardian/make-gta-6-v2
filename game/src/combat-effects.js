// Combat projectiles, weapon firing, hit detection, vehicle explosions, 3D particles
// and floating world notifications for Solaria Bay: Sun & Syndicate.

import { queryBuildingCollision } from './city-map.js';
import { triggerCameraShake } from './camera-3d.js';
import { damagePlayer, getEquippedWeapon } from './player.js';
import { reportPlayerCrime } from './police-wanted.js';
import { randomRange } from './random.js';
import { alertNearbyPedestrians, eliminatePedestrian } from './traffic-peds.js';
import { applyVehicleDamage } from './vehicles.js';

export function createCombatAndEffects() {
  const projectiles = [];
  const particles = [];
  const explosions = [];
  const floatingTexts = [];

  function spawnProjectile(proj) {
    projectiles.push({
      owner: proj.owner || 'player',
      x: proj.x,
      y: proj.y,
      z: proj.z ?? 11,
      vx: Math.cos(proj.angle) * proj.speed,
      vy: Math.sin(proj.angle) * proj.speed,
      angle: proj.angle,
      damage: proj.damage || 25,
      traveled: 0,
      maxRange: proj.range || 440,
      color: proj.color || '#fde047',
    });
  }

  function spawnParticle(p) {
    particles.push({
      x: p.x,
      y: p.y,
      z: p.z ?? 4,
      vx: p.vx ?? 0,
      vy: p.vy ?? 0,
      vz: p.vz ?? 12,
      size: p.size ?? 4,
      color: p.color || '#fb923c',
      alpha: p.alpha ?? 0.9,
      ttl: p.ttl ?? 0.55,
      maxTtl: p.ttl ?? 0.55,
    });
    if (particles.length > 260) {
      particles.splice(0, particles.length - 260);
    }
  }

  function spawnFloatingText(x, y, z, text, color = '#fde047') {
    floatingTexts.push({
      x,
      y,
      z: z ?? 22,
      text,
      color,
      ttl: 1.4,
      maxTtl: 1.4,
    });
  }

  function spawnExplosion(x, y, z, worldState, rng) {
    explosions.push({
      x,
      y,
      z: z ?? 8,
      radius: 8,
      maxRadius: 68,
      ttl: 0.65,
      maxTtl: 0.65,
    });

    if (worldState && worldState.camera) {
      triggerCameraShake(worldState.camera, 10, 0.45);
    }

    for (let i = 0; i < 28; i += 1) {
      const a = randomRange(rng, 0, Math.PI * 2);
      const spd = randomRange(rng, 25, 145);
      spawnParticle({
        x,
        y,
        z: (z ?? 6) + randomRange(rng, 0, 10),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        vz: randomRange(rng, 25, 95),
        size: randomRange(rng, 5, 13),
        color: i % 3 === 0 ? '#fef08a' : i % 2 === 0 ? '#f97316' : '#ef4444',
        ttl: randomRange(rng, 0.4, 0.95),
      });
    }

    if (!worldState) return;
    const { player, vehicles, pedestrians, cashDrops, wanted } = worldState;

    // Area damage to pedestrians and vehicles
    for (let i = 0; i < pedestrians.length; i += 1) {
      const p = pedestrians[i];
      if (!p.alive) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < 78) {
        p.health -= (85 - d);
        if (p.health <= 0) {
          if (p.role === 'police') reportPlayerCrime(wanted, 'cop_eliminated', player.x, player.y);
          eliminatePedestrian(p, cashDrops, player);
        }
      }
    }

    for (let i = 0; i < vehicles.length; i += 1) {
      const v = vehicles[i];
      if (v.destroyed) continue;
      const d = Math.hypot(v.x - x, v.y - y);
      if (d < 85 && d > 4) {
        applyVehicleDamage(v, (95 - d) * 1.4);
      }
    }

    const playerDist = Math.hypot(player.x - x, player.y - y);
    if (playerDist < 75) {
      damagePlayer(player, (80 - playerDist) * 0.45);
    }
  }

  function firePlayerWeapon(worldState, rng) {
    const { player, pedestrians, wanted } = worldState;
    if (player.fireCooldown > 0) return false;

    const weapon = getEquippedWeapon(player);
    const currentAmmo = player.ammo[weapon.id] ?? 0;
    if (!weapon.infinite && currentAmmo <= 0) return false;

    player.fireCooldown = weapon.fireInterval;
    player.muzzleFlashTimer = 0.08;
    if (!weapon.infinite) {
      player.ammo[weapon.id] = Math.max(0, currentAmmo - 1);
    }

    const baseAngle = player.inVehicle ? player.angle : player.aimAngle;
    const muzzleDist = player.inVehicle ? 24 : 13;
    const mx = player.x + Math.cos(baseAngle) * muzzleDist;
    const my = player.y + Math.sin(baseAngle) * muzzleDist;
    const mz = player.inVehicle ? 11 : 12;

    if (weapon.id === 'fists') {
      // Melee strike cone
      for (let i = 0; i < pedestrians.length; i += 1) {
        const p = pedestrians[i];
        if (!p.alive) continue;
        if (Math.hypot(p.x - mx, p.y - my) < 28) {
          p.health -= weapon.damage;
          spawnParticle({ x: p.x, y: p.y, z: 12, color: '#f43f5e', size: 5, ttl: 0.3 });
          if (p.health <= 0) {
            eliminatePedestrian(p, worldState.cashDrops, player);
            spawnFloatingText(p.x, p.y, 20, `+$${p.cashValue}`, '#34d399');
          }
        }
      }
      return true;
    }

    for (let pellet = 0; pellet < weapon.pellets; pellet += 1) {
      const spreadAngle = baseAngle + randomRange(rng, -weapon.spread, weapon.spread);
      spawnProjectile({
        owner: 'player',
        x: mx,
        y: my,
        z: mz,
        angle: spreadAngle,
        speed: weapon.speed,
        damage: weapon.damage,
        range: weapon.range,
        color: weapon.color,
      });
    }

    spawnParticle({
      x: mx,
      y: my,
      z: mz,
      vx: Math.cos(baseAngle) * 40,
      vy: Math.sin(baseAngle) * 40,
      vz: 8,
      size: 5,
      color: '#fef08a',
      ttl: 0.12,
    });

    alertNearbyPedestrians(pedestrians, player.x, player.y, 220);
    if (rng() < 0.35) {
      reportPlayerCrime(wanted, 'gunfire', player.x, player.y);
    }
    return true;
  }

  function updateCombatAndEffects(worldState, rng, dt) {
    const { player, vehicles, pedestrians, cashDrops, cityMap, wanted } = worldState;

    // Step projectiles
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const b = projectiles[i];
      const stepDist = Math.hypot(b.vx, b.vy) * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.traveled += stepDist;

      if (b.traveled >= b.maxRange || queryBuildingCollision(cityMap, b.x, b.y, 2)) {
        spawnParticle({ x: b.x, y: b.y, z: b.z, size: 3, color: '#fde047', ttl: 0.2 });
        projectiles.splice(i, 1);
        continue;
      }

      let hit = false;
      if (b.owner === 'player') {
        for (let pIdx = 0; pIdx < pedestrians.length; pIdx += 1) {
          const p = pedestrians[pIdx];
          if (!p.alive) continue;
          if (Math.hypot(p.x - b.x, p.y - b.y) < 11) {
            p.health -= b.damage;
            spawnParticle({ x: p.x, y: p.y, z: 12, size: 5, color: '#fb7185', ttl: 0.28 });
            if (p.health <= 0) {
              if (p.role === 'police') {
                reportPlayerCrime(wanted, 'cop_eliminated', player.x, player.y);
              }
              eliminatePedestrian(p, cashDrops, player);
              spawnFloatingText(p.x, p.y, 22, `+$${p.cashValue}`, '#34d399');
            }
            hit = true;
            break;
          }
        }

        if (!hit) {
          for (let vIdx = 0; vIdx < vehicles.length; vIdx += 1) {
            const v = vehicles[vIdx];
            if (v === player.vehicle) continue;
            if (Math.hypot(v.x - b.x, v.y - b.y) < v.width * 0.72) {
              const blewUp = applyVehicleDamage(v, b.damage);
              spawnParticle({ x: b.x, y: b.y, z: 10, size: 4, color: '#f97316', ttl: 0.25 });
              if (blewUp) {
                spawnExplosion(v.x, v.y, 10, worldState, rng);
                spawnFloatingText(v.x, v.y, 28, 'VEHICLE DESTROYED!', '#f97316');
              }
              hit = true;
              break;
            }
          }
        }
      } else {
        // Hostile projectile hitting player or player's vehicle
        if (Math.hypot(player.x - b.x, player.y - b.y) < 15) {
          if (player.inVehicle && player.vehicle) {
            const blewUp = applyVehicleDamage(player.vehicle, b.damage * 0.65);
            if (blewUp) spawnExplosion(player.vehicle.x, player.vehicle.y, 10, worldState, rng);
          } else {
            damagePlayer(player, b.damage);
          }
          spawnParticle({ x: b.x, y: b.y, z: 11, size: 4, color: '#ef4444', ttl: 0.22 });
          hit = true;
        }
      }

      if (hit) {
        projectiles.splice(i, 1);
      }
    }

    // Smoke/fire particles on damaged vehicles & nitro exhaust
    for (let i = 0; i < vehicles.length; i += 1) {
      const v = vehicles[i];
      if (v.nitroActive && rng() < 0.75) {
        const rx = v.x - Math.cos(v.angle) * (v.length * 0.52);
        const ry = v.y - Math.sin(v.angle) * (v.length * 0.52);
        spawnParticle({
          x: rx,
          y: ry,
          z: 5,
          vx: -Math.cos(v.angle) * 65,
          vy: -Math.sin(v.angle) * 65,
          vz: 4,
          size: 5,
          color: '#25f4ee',
          ttl: 0.18,
        });
      }
      if (v.health < v.maxHealth * 0.45 && rng() < 0.35) {
        spawnParticle({
          x: v.x + Math.cos(v.angle) * 12,
          y: v.y + Math.sin(v.angle) * 12,
          z: v.height,
          vx: randomRange(rng, -10, 10),
          vy: randomRange(rng, -10, 10),
          vz: 24,
          size: v.destroyed ? 8 : 5,
          color: v.destroyed ? '#f97316' : '#64748b',
          ttl: 0.55,
        });
      }
    }

    // Step particles
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z = Math.max(0, p.z + p.vz * dt);
      p.ttl -= dt;
      if (p.ttl <= 0) particles.splice(i, 1);
    }

    // Step explosions
    for (let i = explosions.length - 1; i >= 0; i -= 1) {
      const ex = explosions[i];
      ex.ttl -= dt;
      const progress = 1 - ex.ttl / ex.maxTtl;
      ex.radius = 10 + progress * ex.maxRadius;
      if (ex.ttl <= 0) explosions.splice(i, 1);
    }

    // Step floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
      const ft = floatingTexts[i];
      ft.z += dt * 16;
      ft.ttl -= dt;
      if (ft.ttl <= 0) floatingTexts.splice(i, 1);
    }
  }

  return {
    projectiles,
    particles,
    explosions,
    floatingTexts,
    spawnProjectile,
    spawnParticle,
    spawnFloatingText,
    spawnExplosion,
    firePlayerWeapon,
    updateCombatAndEffects,
  };
}
