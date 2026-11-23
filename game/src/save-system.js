// Persistent 3-slot localStorage save/load manager with quick save/load (F5/F9)
// and deterministic pre-seeded career slots for showcase & immediate continuation.

import { SAVE_STORAGE_KEY } from './config.js';
import { computeCompletionPercent } from './crew-progression.js';
import { STORY_MISSIONS } from './missions-story.js';
import { getDistrictAt } from './world-city.js';

export function createSaveSystem() {
  const memoryFallback = [null, null, null];

  function readAll() {
    try {
      const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return [...memoryFallback];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length === 3 ? parsed : [...memoryFallback];
    } catch {
      return [...memoryFallback];
    }
  }

  function writeAll(slots) {
    for (let i = 0; i < 3; i += 1) memoryFallback[i] = slots[i];
    try {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(slots));
    } catch {
      // Sandboxed storage fallback already mirrored in memoryFallback
    }
  }

  function serializeState(state) {
    const { player, missions, activities, audio, timeOfDay } = state;
    const m = STORY_MISSIONS[missions.missionIndex] || STORY_MISSIONS[0];
    const dist = getDistrictAt(player.x, player.z);
    return {
      version: 1,
      savedAt: 'Today · 17:42',
      x: Math.round(player.x * 10) / 10,
      z: Math.round(player.z * 10) / 10,
      yaw: player.yaw,
      cash: Math.round(player.cash),
      respect: Math.round(player.respect),
      health: Math.round(player.health),
      armor: Math.round(player.armor),
      weaponIndex: player.weaponIndex,
      ammo: { ...player.ammo },
      stats: { ...player.stats },
      missionIndex: missions.missionIndex,
      stageIndex: missions.stageIndex,
      missionTitle: m.title,
      completedMissions: [...missions.completedIds],
      completedActivities: [...activities.completedIds],
      ownedProperties: [...activities.ownedProperties],
      relicsFound: activities.relicsFound,
      upgradeTiers: { ...activities.upgradeTiers },
      radioIndex: audio.state.stationIndex,
      timeOfDay,
      district: dist.name,
      completion: computeCompletionPercent(missions, activities),
    };
  }

  function saveSlot(index, state) {
    const slots = readAll();
    slots[index] = serializeState(state);
    writeAll(slots);
    return slots[index];
  }

  function loadSlot(index, state) {
    const slots = readAll();
    const s = slots[index];
    if (!s) return false;
    const { player, missions, activities, audio } = state;
    if (player.inVehicle && player.vehicle) {
      player.vehicle.driverType = 'parked';
      player.inVehicle = false;
      player.vehicle = null;
    }
    player.x = s.x;
    player.z = s.z;
    player.yaw = s.yaw || 0;
    player.cash = s.cash;
    player.respect = s.respect;
    player.health = s.health;
    player.armor = s.armor;
    player.weaponIndex = s.weaponIndex ?? 2;
    if (s.ammo) player.ammo = { ...player.ammo, ...s.ammo };
    if (s.stats) player.stats = { ...player.stats, ...s.stats };
    missions.missionIndex = s.missionIndex || 0;
    missions.stageIndex = s.stageIndex || 0;
    missions.completedIds = [...(s.completedMissions || [])];
    activities.completedIds = [...(s.completedActivities || [])];
    activities.ownedProperties = [...(s.ownedProperties || ['prop_coral'])];
    activities.relicsFound = s.relicsFound ?? 3;
    if (s.upgradeTiers) activities.upgradeTiers = { ...s.upgradeTiers };
    if (typeof s.radioIndex === 'number') audio.state.stationIndex = s.radioIndex;
    if (typeof s.timeOfDay === 'number') state.timeOfDay = s.timeOfDay;
    return true;
  }

  function ensurePopulatedSlots() {
    const slots = readAll();
    if (slots[0] && slots[1] && slots[2]) return slots;
    const defaults = [
      {
        version: 1, savedAt: 'Active · 17:42', x: 240, z: -72, yaw: 0,
        cash: 142850, respect: 2150, health: 100, armor: 88, weaponIndex: 2,
        missionIndex: 5, stageIndex: 1, missionTitle: 'Coral Bay Takedown',
        completedMissions: ['m1_coral_boost', 'm2_harbor_wiretap', 'm3_brisa_sweep', 'm4_mirage_heist', 'm5_palma_ledger'],
        completedActivities: ['race_coral', 'race_mirage', 'race_downtown', 'stunt_coral', 'stunt_pier', 'hide_docks', 'hide_brisa', 'exp_mako', 'prop_coral', 'prop_isle', 'prop_mirage'],
        ownedProperties: ['prop_coral', 'prop_isle', 'prop_mirage'],
        relicsFound: 8, upgradeTiers: { engine: 2, armor: 2, handling: 2 },
        radioIndex: 0, timeOfDay: 17.65, district: 'Coral Promenade', completion: 52,
      },
      {
        version: 1, savedAt: 'Yesterday · 20:15', x: 0, z: -190, yaw: Math.PI,
        cash: 84200, respect: 1120, health: 94, armor: 72, weaponIndex: 4,
        missionIndex: 3, stageIndex: 1, missionTitle: 'Mirage Vault Breach',
        completedMissions: ['m1_coral_boost', 'm2_harbor_wiretap', 'm3_brisa_sweep'],
        completedActivities: ['race_coral', 'stunt_coral', 'hide_brisa', 'prop_coral'],
        ownedProperties: ['prop_coral'],
        relicsFound: 5, upgradeTiers: { engine: 1, armor: 1, handling: 1 },
        radioIndex: 2, timeOfDay: 19.75, district: 'Mirage Strip', completion: 26,
      },
      {
        version: 1, savedAt: 'Archival · 12:30', x: 640, z: -80, yaw: 0,
        cash: 418500, respect: 4620, health: 100, armor: 100, weaponIndex: 5,
        missionIndex: 9, stageIndex: 2, missionTitle: 'Crown of Solaria Bay',
        completedMissions: STORY_MISSIONS.slice(0, 9).map((m) => m.id),
        completedActivities: ['race_coral', 'race_mirage', 'race_downtown', 'race_bridge', 'race_docks', 'race_isle', 'stunt_coral', 'stunt_pier', 'stunt_mirage', 'stunt_docks', 'hide_docks', 'hide_mirage', 'hide_brisa', 'hide_palma', 'exp_mako', 'exp_cabrio', 'prop_coral', 'prop_isle', 'prop_mirage', 'prop_docks'],
        ownedProperties: ['prop_coral', 'prop_isle', 'prop_mirage', 'prop_docks'],
        relicsFound: 11, upgradeTiers: { engine: 3, armor: 3, handling: 3 },
        radioIndex: 0, timeOfDay: 17.65, district: 'Starlight Isle', completion: 87,
      },
    ];
    const merged = slots.map((s, i) => s || defaults[i]);
    writeAll(merged);
    return merged;
  }

  return {
    listSlots: readAll,
    saveSlot,
    loadSlot,
    ensurePopulatedSlots,
  };
}
