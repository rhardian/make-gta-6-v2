// Persistent multi-slot save & load manager for Solaria Bay: Sun & Syndicate.
// Stores player cash, respect, coordinates, weapon ammo, mission act and career stats.

import { SAVE_STORAGE_KEY } from './config.js';
import { STORY_MISSIONS, startStoryMission } from './missions.js';

const TOTAL_SLOTS = 3;

export function createSaveManager() {
  function readAllSlots() {
    try {
      const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return [null, null, null];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, TOTAL_SLOTS) : [null, null, null];
    } catch {
      return [null, null, null];
    }
  }

  function writeAllSlots(slots) {
    try {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(slots));
      return true;
    } catch {
      return false;
    }
  }

  function saveGameProgress(slotIndex, worldState) {
    const slots = readAllSlots();
    const { player, missions, wanted } = worldState;
    const mission = STORY_MISSIONS[missions.missionIndex] || STORY_MISSIONS[0];

    slots[slotIndex] = {
      savedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      actTitle: `${mission.act}: ${mission.title}`,
      player: {
        x: Math.round(player.x),
        y: Math.round(player.y),
        health: Math.round(player.health),
        armor: Math.round(player.armor),
        cash: player.cash,
        respect: player.respect,
        weaponIndex: player.weaponIndex,
        ammo: { ...player.ammo },
        stats: { ...player.stats },
      },
      missionIndex: missions.missionIndex,
      stageIndex: missions.stageIndex,
      wantedStars: wanted.stars,
    };

    writeAllSlots(slots);
    return slots[slotIndex];
  }

  function loadGameProgress(slotIndex, worldState, rng) {
    const slots = readAllSlots();
    const data = slots[slotIndex];
    if (!data || !data.player) return null;

    const { player, missions } = worldState;
    if (player.inVehicle) {
      player.inVehicle = false;
      player.vehicle = null;
    }
    player.x = data.player.x ?? 455;
    player.y = data.player.y ?? 45;
    player.health = data.player.health ?? 100;
    player.armor = data.player.armor ?? 75;
    player.cash = data.player.cash ?? 12500;
    player.respect = data.player.respect ?? 150;
    player.weaponIndex = data.player.weaponIndex ?? 2;
    if (data.player.ammo) {
      player.ammo = { ...player.ammo, ...data.player.ammo };
    }
    if (data.player.stats) {
      player.stats = { ...player.stats, ...data.player.stats };
    }

    startStoryMission(missions, data.missionIndex ?? 0, worldState, rng);
    missions.stageIndex = data.stageIndex ?? 0;
    return data;
  }

  function getSaveSlotsSummary() {
    const slots = readAllSlots();
    const summary = [];
    for (let i = 0; i < TOTAL_SLOTS; i += 1) {
      const s = slots[i];
      if (s) {
        summary.push({
          slot: i + 1,
          occupied: true,
          title: s.actTitle,
          cash: s.player?.cash ?? 0,
          respect: s.player?.respect ?? 0,
          savedAt: s.savedAt,
        });
      } else {
        summary.push({
          slot: i + 1,
          occupied: false,
          title: i === 0 ? 'Auto-Save / Quick Slot' : `Empty Save Slot ${i + 1}`,
          cash: 0,
          respect: 0,
          savedAt: 'No data',
        });
      }
    }
    return summary;
  }

  return {
    saveGameProgress,
    loadGameProgress,
    getSaveSlotsSummary,
  };
}
