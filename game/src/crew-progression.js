// Crew Favours ([Q/Z] Plate Swap, [E/X] Roadside Repair, [C] Dispatch Jam), Respect Ranks,
// and global Solaria Bay completion progression.

import { SIDE_ACTIVITIES } from './activities-economy.js';
import { STORY_MISSIONS } from './missions-story.js';

export const RESPECT_RANKS = [
  { rank: 'I', title: 'Street Runner', min: 0 },
  { rank: 'II', title: 'Coral Booster', min: 150 },
  { rank: 'III', title: 'Dock Smuggler', min: 350 },
  { rank: 'IV', title: 'Mirage Enforcer', min: 600 },
  { rank: 'V', title: 'Syndicate Breaker', min: 950 },
  { rank: 'VI', title: 'Bay Captain', min: 1400 },
  { rank: 'VII', title: 'Bay Kingpin', min: 1900 },
  { rank: 'VIII', title: 'Solaria Boss', min: 2600 },
  { rank: 'IX', title: 'Coastal Baron', min: 3400 },
  { rank: 'X', title: 'Solaria Legend', min: 4500 },
];

export const CREW_ROSTER = [
  { id: 'plate_swap', key: 'Q', altKey: 'Z', name: 'Plate Swap', short: 'PLATE SWAP', member: 'Rico Vega', role: 'Wheelman', cooldown: 35, desc: 'Drops Wanted Level by 2 stars & spoofs ALPR scanners.' },
  { id: 'road_repair', key: 'E', altKey: 'X', name: 'Roadside Repair', short: 'REPAIR', member: 'Sora Chen', role: 'Chief Mechanic', cooldown: 30, desc: 'Restores vehicle armor, tires & nitro boost immediately.' },
  { id: 'dispatch_jam', key: 'C', altKey: 'C', name: 'Dispatch Jam', short: 'JAM', member: 'Dante Morales', role: 'Netrunner', cooldown: 40, desc: 'Scrambles SBPD dispatch radio & kills AIR-1 spotlight for 15s.' },
];

export function createCrewProgression() {
  return {
    cooldowns: { plate_swap: 0, road_repair: 0, dispatch_jam: 0 },
    lastNotice: '',
    noticeTimer: 0,
  };
}

export function updateCrewCooldowns(crew, dt) {
  crew.noticeTimer = Math.max(0, crew.noticeTimer - dt);
  for (const id of Object.keys(crew.cooldowns)) {
    if (crew.cooldowns[id] > 0) crew.cooldowns[id] = Math.max(0, crew.cooldowns[id] - dt);
  }
}

export function triggerCrewFavour(favourId, crew, player, wanted, vehicles, missions, effects) {
  const def = CREW_ROSTER.find((c) => c.id === favourId);
  if (!def) return false;
  if ((crew.cooldowns[favourId] || 0) > 0) return false;

  crew.cooldowns[favourId] = def.cooldown;
  crew.lastNotice = `${def.member}: ${def.name} active!`;
  crew.noticeTimer = 3.6;

  if (favourId === 'plate_swap') {
    if (wanted) wanted.clearHeat(2, vehicles);
    if (missions) missions.comms = { speaker: 'Rico Vega', role: 'WHEELMAN', text: 'Fresh cloned plates broadcast! SBPD scanners just lost your tag!', timer: 7 };
    if (effects) effects.spawnFloatingNumber(player.x, player.y + 3, player.z, 'PLATE SWAP -2★', '#34d399');
    return true;
  }
  if (favourId === 'road_repair') {
    if (player.vehicle) {
      player.vehicle.health = player.vehicle.maxHealth;
      player.vehicle.nitro = 100;
      player.vehicle.spikeTimer = 0;
    } else {
      player.armor = Math.min(player.maxArmor, player.armor + 45);
    }
    if (missions) missions.comms = { speaker: 'Sora Chen', role: 'MECHANIC', text: 'Nanoseal foam & nitro canisters cycled—chassis is back to 100%!', timer: 7 };
    if (effects) effects.spawnFloatingNumber(player.x, player.y + 3, player.z, 'CHASSIS 100%', '#22d3ee');
    return true;
  }
  if (favourId === 'dispatch_jam') {
    if (wanted) {
      wanted.state.jamTimer = 15;
      wanted.state.inSight = false;
    }
    if (missions) missions.comms = { speaker: 'Dante Morales', role: 'NETRUNNER', text: 'SBPD tactical channel flooded with static and AIR-1 optics jammed for 15 seconds!', timer: 7 };
    if (effects) effects.spawnFloatingNumber(player.x, player.y + 3, player.z, 'SBPD JAMMED 15s', '#a78bfa');
    return true;
  }
  return false;
}

export function getRespectRank(respect) {
  let cur = RESPECT_RANKS[0];
  for (let i = 0; i < RESPECT_RANKS.length; i += 1) {
    if (respect >= RESPECT_RANKS[i].min) cur = RESPECT_RANKS[i];
  }
  return cur;
}

export function computeCompletionPercent(missions, activities) {
  const mDone = missions.completedIds.length;
  const aDone = activities.completedIds.length;
  const rDone = activities.relicsFound;
  const total = STORY_MISSIONS.length + SIDE_ACTIVITIES.length + activities.relics.length;
  return Math.min(100, Math.round(((mDone + aDone + rDone) / total) * 100));
}
