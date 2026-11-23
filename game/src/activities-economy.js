// 24 Open-World Side Activities (6 Street Races, 6 Stunt Ramps, 4 Syndicate Hideouts,
// 4 Export Orders, 4 Properties/Safehouses), 12 Sunset Relics, plus Garage & Gun Shop economy.

import * as THREE from 'three';
import { GARAGE_UPGRADES, WEAPONS } from './config.js';
import { repaintVehicle } from './vehicles.js';
import { getGroundHeightAt } from './world-city.js';

export const SIDE_ACTIVITIES = [
  // 6 Street Races
  { id: 'race_coral', kind: 'Race', name: 'Coral Promenade Sprint', district: 'Coral Promenade', x: 240, z: -180, payout: 9500 },
  { id: 'race_mirage', kind: 'Race', name: 'Mirage Midnight Circuit', district: 'Mirage Strip', x: 0, z: -240, payout: 11000 },
  { id: 'race_downtown', kind: 'Race', name: 'Downtown Apex Run', district: 'Solaria Downtown', x: 120, z: 0, payout: 12500 },
  { id: 'race_bridge', kind: 'Race', name: 'Solaria Arch Bridge Dash', district: 'Coral Promenade', x: 300, z: 0, payout: 14000 },
  { id: 'race_docks', kind: 'Race', name: 'Cobre Drift Touge', district: 'Cobre Docks', x: -120, z: 240, payout: 10500 },
  { id: 'race_isle', kind: 'Race', name: 'Starlight Isle Grand Prix', district: 'Starlight Isle', x: 560, z: 0, payout: 16000 },
  // 6 Stunt Ramps
  { id: 'stunt_coral', kind: 'Stunt', name: 'Ocean Palm Launch', district: 'Coral Promenade', x: 252, z: -150, payout: 4500 },
  { id: 'stunt_pier', kind: 'Stunt', name: 'Sky-Ring Pier Leap', district: 'Coral Promenade', x: 278, z: 120, payout: 5000 },
  { id: 'stunt_mirage', kind: 'Stunt', name: 'Mirage Neon Gap', district: 'Mirage Strip', x: 0, z: -290, payout: 5500 },
  { id: 'stunt_docks', kind: 'Stunt', name: 'Container Crane Jump', district: 'Cobre Docks', x: -120, z: 290, payout: 5200 },
  { id: 'stunt_downtown', kind: 'Stunt', name: 'Meridian Plaza Vault', district: 'Solaria Downtown', x: 120, z: 60, payout: 5800 },
  { id: 'stunt_isle', kind: 'Stunt', name: 'Starlight Cove Flyover', district: 'Starlight Isle', x: 560, z: -70, payout: 6200 },
  // 4 Syndicate Hideouts
  { id: 'hide_docks', kind: 'Hideout', name: 'Cobre Container Yard', district: 'Cobre Docks', x: -240, z: 280, payout: 15000 },
  { id: 'hide_mirage', kind: 'Hideout', name: 'Mirage Back-Alley Vault', district: 'Mirage Strip', x: -120, z: -300, payout: 18000 },
  { id: 'hide_brisa', kind: 'Hideout', name: 'Little Brisa Rum Depot', district: 'Little Brisa', x: -280, z: 120, payout: 14500 },
  { id: 'hide_palma', kind: 'Hideout', name: 'Palma Ridge Courtyard', district: 'Palma Vista', x: -280, z: -180, payout: 17000 },
  // 4 Export Orders
  { id: 'exp_mako', kind: 'Export', name: 'Export: Mako V12 GT', district: 'Cobre Docks', model: 'mako_v12', x: -140, z: 330, payout: 18000 },
  { id: 'exp_cabrio', kind: 'Export', name: 'Export: Aureo Cabrio', district: 'Cobre Docks', model: 'aureo_cabrio', x: -140, z: 330, payout: 14000 },
  { id: 'exp_muscle', kind: 'Export', name: 'Export: Tormenta Sabre', district: 'Cobre Docks', model: 'tormenta_muscle', x: -140, z: 330, payout: 12000 },
  { id: 'exp_limo', kind: 'Export', name: 'Export: Mirage Stretch', district: 'Cobre Docks', model: 'mirage_limo', x: -140, z: 330, payout: 16500 },
  // 4 Properties / Safehouses
  { id: 'prop_coral', kind: 'Property', name: 'Coral Penthouse Suite', district: 'Coral Promenade', x: 214, z: -90, price: 35000, income: 4000 },
  { id: 'prop_isle', kind: 'Property', name: 'Starlight Bay Villa', district: 'Starlight Isle', x: 640, z: -90, price: 65000, income: 7500 },
  { id: 'prop_mirage', kind: 'Property', name: 'Mirage Rooftop Lounge', district: 'Mirage Strip', x: -22, z: -205, price: 50000, income: 6000 },
  { id: 'prop_docks', kind: 'Property', name: 'Cobre Import Loft', district: 'Cobre Docks', x: -140, z: 220, price: 28000, income: 3200 },
];

const RELIC_COORDS = [
  [260, -190], [260, -60], [260, 75], [345, 120],
  [0, -210], [0, -20], [120, -140], [-120, 110],
  [-240, -110], [-200, 260], [640, 0], [728, -172],
];

const CUSTOM_PAINTS = ['#e11d48', '#22d3ee', '#fbbf24', '#a855f7', '#10b981', '#f97316', '#f8fafc'];

export function createActivitiesSystem(scene) {
  const relicGroup = new THREE.Group();
  scene.add(relicGroup);
  const relics = [];
  const relicGeo = new THREE.OctahedronGeometry(0.85, 0);
  const relicMat = new THREE.MeshBasicMaterial({ color: '#fbbf24' });

  for (let i = 0; i < RELIC_COORDS.length; i += 1) {
    const [x, z] = RELIC_COORDS[i];
    const mesh = new THREE.Mesh(relicGeo, relicMat);
    mesh.position.set(x, getGroundHeightAt(x, z) + 1.6, z);
    relicGroup.add(mesh);
    relics.push({ id: `relic_${i + 1}`, x, z, collected: false, mesh });
  }

  return {
    completedIds: ['stunt_coral', 'race_coral', 'prop_coral'],
    ownedProperties: ['prop_coral'],
    relics,
    relicsFound: 3,
    passiveTimer: 30,
    paintIndex: 0,
    upgradeTiers: { engine: 1, armor: 1, handling: 1 },
  };
}

export function updateActivities(act, dt, elapsed, player, effects) {
  // Spin & collect glowing Sunset Relics
  for (let i = 0; i < act.relics.length; i += 1) {
    const r = act.relics[i];
    if (r.collected) continue;
    r.mesh.rotation.y = elapsed * 2.2 + i;
    r.mesh.position.y = getGroundHeightAt(r.x, r.z) + 1.55 + Math.sin(elapsed * 3 + i) * 0.25;
    if (Math.hypot(player.x - r.x, player.z - r.z) < 4.5) {
      r.collected = true;
      r.mesh.visible = false;
      act.relicsFound += 1;
      player.cash += 3500;
      player.respect += 45;
      player.stats.totalEarnings += 3500;
      effects.spawnFloatingNumber(r.x, r.mesh.position.y + 1.2, r.z, 'SUNSET RELIC +$3,500', '#fbbf24');
    }
  }

  // Detect high-speed Stunt Ramp jumps
  if (player.inVehicle && player.vehicle && player.vehicle.airTime > 0.52) {
    for (let i = 0; i < SIDE_ACTIVITIES.length; i += 1) {
      const s = SIDE_ACTIVITIES[i];
      if (s.kind !== 'Stunt' || act.completedIds.includes(s.id)) continue;
      if (Math.hypot(player.x - s.x, player.z - s.z) < 26) {
        act.completedIds.push(s.id);
        player.cash += s.payout;
        player.respect += 65;
        player.stats.stuntJumps += 1;
        player.stats.activitiesCompleted = act.completedIds.length;
        effects.spawnFloatingNumber(player.x, player.y + 3.2, player.z, `STUNT BONUS +$${s.payout}!`, '#22d3ee');
      }
    }
  }

  // Passive property safehouse income ticker
  act.passiveTimer -= dt;
  if (act.passiveTimer <= 0) {
    act.passiveTimer = 45;
    let totalInc = 0;
    for (let i = 0; i < act.ownedProperties.length; i += 1) {
      const p = SIDE_ACTIVITIES.find((a) => a.id === act.ownedProperties[i]);
      if (p) totalInc += p.income || 0;
    }
    if (totalInc > 0) {
      player.cash += totalInc;
      player.stats.totalEarnings += totalInc;
    }
  }
}

export function applyGarageOrShopPurchase(upgradeId, act, player, wanted, vehicles) {
  const item = GARAGE_UPGRADES.find((g) => g.id === upgradeId);
  if (!item) return { ok: false, msg: 'Unknown upgrade' };

  const tier = act.upgradeTiers[upgradeId] || 0;
  if (item.kind === 'tier' && tier >= item.max) return { ok: false, msg: 'Already maxed!' };
  const cost = item.kind === 'tier' ? item.cost * (tier + 1) : item.cost;
  if (player.cash < cost) return { ok: false, msg: 'Insufficient cash' };

  player.cash -= cost;
  if (upgradeId === 'repair') {
    if (player.vehicle) {
      player.vehicle.health = player.vehicle.maxHealth;
      player.vehicle.destroyed = false;
      player.vehicle.burning = false;
      player.vehicle.spikeTimer = 0;
    }
    return { ok: true, msg: 'Vehicle fully repaired!' };
  }
  if (upgradeId === 'respray') {
    act.paintIndex = (act.paintIndex + 1) % CUSTOM_PAINTS.length;
    if (player.vehicle) repaintVehicle(player.vehicle, CUSTOM_PAINTS[act.paintIndex]);
    if (wanted) wanted.clearHeat(5, vehicles);
    return { ok: true, msg: 'Respray complete · Wanted cleared!' };
  }
  if (item.kind === 'tier') {
    act.upgradeTiers[upgradeId] = tier + 1;
    if (player.vehicle) {
      player.vehicle.upgrades[upgradeId] = tier + 1;
      if (upgradeId === 'armor') player.vehicle.maxHealth = Math.round(player.vehicle.spec.hp * (1 + (tier + 1) * 0.25));
    }
    return { ok: true, msg: `${item.label} Tier ${tier + 1} installed!` };
  }
  if (upgradeId === 'body_armor') {
    player.armor = player.maxArmor;
    player.health = player.maxHealth;
    return { ok: true, msg: 'Health & Tactical Vest refilled!' };
  }
  if (upgradeId === 'ammo_pack') {
    for (let i = 0; i < WEAPONS.length; i += 1) {
      if (!WEAPONS[i].inf) player.ammo[WEAPONS[i].id] = Math.max(player.ammo[WEAPONS[i].id] || 0, WEAPONS[i].ammo);
    }
    return { ok: true, msg: 'All 8 weapons restocked!' };
  }
  if (upgradeId === 'heavy_unlock') {
    player.ammo.mirage_sniper = (player.ammo.mirage_sniper || 0) + 40;
    player.ammo.cobre_launcher = (player.ammo.cobre_launcher || 0) + 10;
    return { ok: true, msg: 'Marksman & RPG-7X loaded!' };
  }
  return { ok: true, msg: 'Purchased!' };
}

export function buyProperty(propId, act, player) {
  const p = SIDE_ACTIVITIES.find((a) => a.id === propId && a.kind === 'Property');
  if (!p) return { ok: false, msg: 'Property not found' };
  if (act.ownedProperties.includes(propId)) return { ok: false, msg: 'Already owned' };
  if (player.cash < p.price) return { ok: false, msg: 'Insufficient cash' };
  player.cash -= p.price;
  act.ownedProperties.push(propId);
  if (!act.completedIds.includes(propId)) act.completedIds.push(propId);
  player.respect += 120;
  player.stats.activitiesCompleted = act.completedIds.length;
  return { ok: true, msg: `Purchased ${p.name}!` };
}
