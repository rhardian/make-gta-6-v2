// 8-weapon combat & ballistics engine: melee, sidearm, SMG, shotgun, carbine, marksman,
// arcing grenades, RPG-7X rockets, golden bullet tracers, explosions, and floating damage popups.

import * as THREE from 'three';
import { WEAPONS } from './config.js';

export function createCombatSystem(scene, effects, audio) {
  const activeOrdnance = [];
  const projGeo = new THREE.SphereGeometry(0.18, 6, 6);

  function alertNearbyCivilians(pedestrians, x, z, radius = 42) {
    for (let i = 0; i < pedestrians.length; i += 1) {
      const p = pedestrians[i];
      if (p.alive && p.role === 'civilian' && Math.hypot(p.x - x, p.z - z) < radius) {
        p.panicTimer = 6.5;
      }
    }
  }

  function damageVehicle(v, dmg, vehicles, pedestrians, player) {
    if (v.destroyed) return;
    v.health -= dmg;
    if (v.health <= 0) {
      v.health = 0;
      v.destroyed = true;
      v.burning = true;
      effects.spawnExplosion(v.x, v.y + 0.6, v.z, 1.35);
      effects.spawnFloatingNumber(v.x, v.y + 3.2, v.z, 'VEHICLE DESTROYED!', '#fb923c');
      if (audio) audio.playExplosion();
      // Splash damage to nearby enemies
      for (let i = 0; i < pedestrians.length; i += 1) {
        const p = pedestrians[i];
        if (!p.alive || p.role === 'partner') continue;
        if (Math.hypot(p.x - v.x, p.z - v.z) < 12) {
          p.health = 0;
          p.alive = false;
          if (player) {
            player.cash += p.cashDrop;
            player.stats.eliminations += 1;
          }
        }
      }
    }
  }

  function detonateAt(x, y, z, radius, dmg, vehicles, pedestrians, player, wanted) {
    effects.spawnExplosion(x, y, z, radius / 10);
    if (audio) audio.playExplosion();
    for (let i = 0; i < pedestrians.length; i += 1) {
      const p = pedestrians[i];
      if (!p.alive || p.role === 'partner') continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < radius) {
        const hitDmg = Math.round(dmg * (1 - d / radius));
        p.health -= hitDmg;
        effects.spawnFloatingNumber(p.x, p.y + 2.3, p.z, `-${hitDmg}`, '#ff5e78');
        if (p.health <= 0) {
          p.alive = false;
          player.cash += p.cashDrop;
          player.stats.eliminations += 1;
          player.stats.totalEarnings += p.cashDrop;
          if (p.role === 'police' && wanted) wanted.addHeat(1.8, p.x, p.z);
        }
      }
    }
    for (let i = 0; i < vehicles.length; i += 1) {
      const v = vehicles[i];
      if (v.destroyed || v.spec.isHeli) continue;
      const d = Math.hypot(v.x - x, v.z - z);
      if (d < radius) {
        damageVehicle(v, dmg * (1 - d / radius) * 1.4, vehicles, pedestrians, player);
      }
    }
  }

  function firePlayerWeapon(player, aimYaw, aimPitch, vehicles, pedestrians, wanted, rng) {
    const w = WEAPONS[player.weaponIndex];
    if (player.fireCooldown > 0) return false;
    if (!w.inf && (player.ammo[w.id] || 0) <= 0) return false;

    player.fireCooldown = w.cd;
    if (!w.inf) player.ammo[w.id] -= 1;

    const muzzleX = player.x + Math.sin(aimYaw) * 0.9;
    const muzzleY = player.y + (player.inVehicle ? 1.3 : 1.42);
    const muzzleZ = player.z + Math.cos(aimYaw) * 0.9;

    if (w.id === 'fists') {
      for (let i = 0; i < pedestrians.length; i += 1) {
        const p = pedestrians[i];
        if (!p.alive || p.role === 'partner') continue;
        if (Math.hypot(p.x - player.x, p.z - player.z) < w.range) {
          p.health -= w.dmg;
          effects.spawnFloatingNumber(p.x, p.y + 2.1, p.z, `-${w.dmg}`, '#fde047');
          if (p.health <= 0) {
            p.alive = false;
            player.cash += p.cashDrop;
            player.stats.eliminations += 1;
          }
          if (wanted) wanted.addHeat(0.6, p.x, p.z);
          break;
        }
      }
      return true;
    }

    if (audio) audio.playGunshot(w.id);
    effects.spawnMuzzleFlash(muzzleX, muzzleY, muzzleZ, w.color);
    alertNearbyCivilians(pedestrians, player.x, player.z, 46);

    if (w.explosive) {
      const mat = new THREE.MeshBasicMaterial({ color: w.color });
      const mesh = new THREE.Mesh(projGeo, mat);
      mesh.position.set(muzzleX, muzzleY, muzzleZ);
      scene.add(mesh);
      const spd = w.id === 'cobre_launcher' ? 58 : 26;
      activeOrdnance.push({
        mesh,
        x: muzzleX, y: muzzleY, z: muzzleZ,
        vx: Math.sin(aimYaw) * Math.cos(aimPitch) * spd,
        vy: Math.sin(aimPitch) * spd + (w.id === 'sol_grenade' ? 6.5 : 0.6),
        vz: Math.cos(aimYaw) * Math.cos(aimPitch) * spd,
        gravity: w.id === 'sol_grenade' ? 18 : 1.2,
        dmg: w.dmg,
        radius: w.radius,
        life: 2.8,
        color: w.color,
      });
      if (wanted) wanted.addHeat(1.4, player.x, player.z);
      return true;
    }

    // Raycast/ballistic pellet shots with golden tracer streaks
    for (let pIdx = 0; pIdx < w.pellets; pIdx += 1) {
      const sy = aimYaw + (rng() - 0.5) * w.spread;
      const sp = aimPitch + (rng() - 0.5) * w.spread * 0.6;
      const dx = Math.sin(sy) * Math.cos(sp);
      const dy = Math.sin(sp);
      const dz = Math.cos(sy) * Math.cos(sp);

      let bestT = w.range;
      let hitPed = null;
      let hitVeh = null;

      for (let i = 0; i < pedestrians.length; i += 1) {
        const ped = pedestrians[i];
        if (!ped.alive || ped.role === 'partner') continue;
        const ox = ped.x - muzzleX;
        const oy = (ped.y + 1.15) - muzzleY;
        const oz = ped.z - muzzleZ;
        const proj = ox * dx + oy * dy + oz * dz;
        if (proj > 0 && proj < bestT) {
          const perp2 = (ox - dx * proj) ** 2 + (oy - dy * proj) ** 2 + (oz - dz * proj) ** 2;
          if (perp2 < 1.15) {
            bestT = proj;
            hitPed = ped;
            hitVeh = null;
          }
        }
      }

      for (let i = 0; i < vehicles.length; i += 1) {
        const v = vehicles[i];
        if (v === player.vehicle || v.destroyed || v.spec.isHeli) continue;
        const ox = v.x - muzzleX;
        const oz = v.z - muzzleZ;
        const proj = ox * dx + oz * dz;
        if (proj > 0 && proj < bestT) {
          const perp2 = (ox - dx * proj) ** 2 + (oz - dz * proj) ** 2;
          if (perp2 < (v.spec.w * 0.72) ** 2) {
            bestT = proj;
            hitVeh = v;
            hitPed = null;
          }
        }
      }

      const endP = new THREE.Vector3(muzzleX + dx * bestT, Math.max(0.2, muzzleY + dy * bestT), muzzleZ + dz * bestT);
      effects.spawnTracer(new THREE.Vector3(muzzleX, muzzleY, muzzleZ), endP, w.color, 0.085, 0.13);

      if (hitPed) {
        const crit = rng() < 0.28;
        const dmg = Math.round(w.dmg * (crit ? 1.65 : 1.0));
        hitPed.health -= dmg;
        effects.spawnSparks(endP.x, endP.y, endP.z, 5, '#fb7185');
        effects.spawnFloatingNumber(hitPed.x, hitPed.y + 2.25, hitPed.z, crit ? `CRIT -${dmg}!` : `-${dmg}`, crit ? '#fde047' : '#ffffff');
        if (hitPed.health <= 0) {
          hitPed.alive = false;
          player.cash += hitPed.cashDrop;
          player.respect += hitPed.role === 'syndicate' ? 25 : 10;
          player.stats.eliminations += 1;
          player.stats.totalEarnings += hitPed.cashDrop;
          effects.spawnFloatingNumber(hitPed.x, hitPed.y + 2.8, hitPed.z, `+$${hitPed.cashDrop}`, '#34d399');
        }
        if (wanted) wanted.addHeat(hitPed.role === 'police' ? 1.5 : 0.45, hitPed.x, hitPed.z);
      } else if (hitVeh) {
        effects.spawnSparks(endP.x, endP.y, endP.z, 6, '#fde047');
        damageVehicle(hitVeh, w.dmg * 0.85, vehicles, pedestrians, player);
        if (wanted && hitVeh.spec.isPolice) wanted.addHeat(0.85, hitVeh.x, hitVeh.z);
      }
    }
    return true;
  }

  function fireNpcShot(npc, player) {
    const start = new THREE.Vector3(npc.x + Math.sin(npc.yaw) * 0.8, npc.y + 1.4, npc.z + Math.cos(npc.yaw) * 0.8);
    const spread = 1.6;
    const end = new THREE.Vector3(
      player.x + (Math.random() - 0.5) * spread,
      player.y + 1.2 + (Math.random() - 0.5) * 0.6,
      player.z + (Math.random() - 0.5) * spread,
    );
    const col = npc.role === 'police' ? '#38bdf8' : '#fb7185';
    effects.spawnMuzzleFlash(start.x, start.y, start.z, col);
    effects.spawnTracer(start, end, col, 0.08, 0.14);

    if (Math.random() < (player.inVehicle ? 0.22 : 0.34)) {
      const dmg = npc.role === 'syndicate' ? 7 : 6;
      if (player.armor > 0) {
        const absorb = Math.min(player.armor, dmg * 0.7);
        player.armor -= absorb;
        player.health = Math.max(10, player.health - (dmg - absorb));
      } else {
        player.health = Math.max(10, player.health - dmg);
      }
    }
  }

  function firePartnerShot(partner, target) {
    const start = new THREE.Vector3(partner.x + Math.sin(partner.yaw) * 0.8, partner.y + 1.4, partner.z + Math.cos(partner.yaw) * 0.8);
    const end = new THREE.Vector3(target.x, target.y + 1.2, target.z);
    effects.spawnMuzzleFlash(start.x, start.y, start.z, '#38bdf8');
    effects.spawnTracer(start, end, '#22d3ee', 0.08, 0.14);
    target.health -= 18;
    if (target.health <= 0) target.alive = false;
  }

  function update(dt, player, vehicles, pedestrians, wanted) {
    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    for (let i = activeOrdnance.length - 1; i >= 0; i -= 1) {
      const o = activeOrdnance[i];
      o.life -= dt;
      o.vy -= o.gravity * dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.z += o.vz * dt;
      o.mesh.position.set(o.x, o.y, o.z);
      effects.spawnParticle(o.x, o.y, o.z, 0, 0.6, 0, 0.35, o.color, 0.2, { additive: true });

      let boom = o.life <= 0 || o.y <= 0.3;
      if (!boom) {
        for (let j = 0; j < vehicles.length; j += 1) {
          const v = vehicles[j];
          if (v !== player.vehicle && !v.spec.isHeli && Math.hypot(v.x - o.x, v.z - o.z) < 2.8) {
            boom = true; break;
          }
        }
      }
      if (boom) {
        detonateAt(o.x, Math.max(0.4, o.y), o.z, o.radius, o.dmg, vehicles, pedestrians, player, wanted);
        scene.remove(o.mesh);
        o.mesh.material.dispose();
        activeOrdnance.splice(i, 1);
      }
    }
  }

  return {
    firePlayerWeapon,
    fireNpcShot,
    firePartnerShot,
    damageVehicle,
    detonateAt,
    update,
  };
}
