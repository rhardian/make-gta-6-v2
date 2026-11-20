// Story campaign ("Sun & Syndicate") and open-world mission director for Solaria Bay:
// 5 multi-stage story missions, character comms dialogue, 3D waypoint beacons, syndicate
// ambush spawns and mission reward progression.

import { setWantedLevelImmediate } from './police-wanted.js';
import { createPedestrian } from './traffic-peds.js';
import { createVehicle } from './vehicles.js';

export const STORY_MISSIONS = [
  {
    id: 'act1_coral_boost',
    act: 'ACT I',
    title: 'Coral Drive Boost',
    contact: 'Rico Vega',
    rewardCash: 15000,
    rewardRespect: 120,
    startX: 480,
    startY: 20,
    stages: [
      {
        objective: 'Steal the Mako GTR coupe or any sports car on Coral Promenade',
        speaker: 'Rico Vega',
        dialogue: 'Val! Elena Vance parked her twin-turbo Mako GTR on Ocean Palm Drive. Boost it and bring it to the Marina slip!',
        waypointX: 480,
        waypointY: 15,
        type: 'enter_vehicle',
        wantedOnComplete: 2,
      },
      {
        objective: 'Race to Starlight Marina Drop-Off while evading SBPD cruisers',
        speaker: 'Rico Vega',
        dialogue: 'SBPD tagged the plates! Floor it south down Ocean Palm Drive to the Starlight Marina drop-off!',
        waypointX: 480,
        waypointY: 240,
        type: 'reach_waypoint',
        radius: 58,
      },
    ],
  },
  {
    id: 'act2_bullion_intercept',
    act: 'ACT II',
    title: 'Bullion Intercept',
    contact: 'Rico Vega',
    rewardCash: 28000,
    rewardRespect: 180,
    startX: 240,
    startY: 0,
    stages: [
      {
        objective: 'Ambush the Syndicate Bullion Convoy at Solaria Downtown Plaza',
        speaker: 'Valeria Reyes',
        dialogue: 'Vance Tower is moving bearer bonds through Solaria Downtown. Neutralize the escort guards and seize the armored van.',
        waypointX: 0,
        waypointY: 0,
        type: 'clear_syndicate',
        guardCount: 4,
        spawnVan: true,
        wantedOnComplete: 3,
      },
      {
        objective: 'Deliver the Syndicate shipment to Cobre Harbor Depot',
        speaker: 'Rico Vega',
        dialogue: 'AIR-1 Falcon chopper is airborne! Keep the pedal down and haul that shipment to Cobre Harbor Depot!',
        waypointX: -240,
        waypointY: 240,
        type: 'reach_waypoint',
        radius: 62,
      },
    ],
  },
  {
    id: 'act3_neon_mirage',
    act: 'ACT III',
    title: 'Neon Mirage Heist',
    contact: 'Elena Vance',
    rewardCash: 45000,
    rewardRespect: 250,
    startX: 0,
    startY: -240,
    stages: [
      {
        objective: 'Raid the Mirage Casino Vault on the Neon Strip',
        speaker: 'Elena Vance',
        dialogue: 'You think you can rob my strip, Reyes? Every gun in Mirage Casino is waiting for you!',
        waypointX: 0,
        waypointY: -480,
        type: 'clear_syndicate',
        guardCount: 5,
        wantedOnComplete: 4,
      },
      {
        objective: 'Escape the 4-Star SWORD Lockdown to Oceanfront Penthouse',
        speaker: 'Rico Vega',
        dialogue: 'We got the vault ledger! SWORD tactical units are closing the avenues—get back to the Oceanfront Penthouse!',
        waypointX: 460,
        waypointY: -40,
        type: 'reach_waypoint',
        radius: 58,
      },
    ],
  },
  {
    id: 'act4_marina_smuggler',
    act: 'ACT IV',
    title: 'Starlight Marina Run',
    contact: 'Rico Vega',
    rewardCash: 60000,
    rewardRespect: 320,
    startX: 480,
    startY: 60,
    stages: [
      {
        objective: 'Board a Corsair Jetboat or vehicle at Starlight Marina Main Pier',
        speaker: 'Rico Vega',
        dialogue: 'Offshore courier dropped crates past the breakwater. Hit the Starlight Marina pier and grab the Corsair Jetboat!',
        waypointX: 675,
        waypointY: 60,
        type: 'reach_waypoint',
        radius: 68,
        wantedOnComplete: 3,
      },
      {
        objective: 'Secure the North Pier contraband cache before SBPD arrives',
        speaker: 'Valeria Reyes',
        dialogue: 'Got the coastal lane open—cutting north across the bay to the North Pier slip!',
        waypointX: 665,
        waypointY: -180,
        type: 'reach_waypoint',
        radius: 68,
      },
    ],
  },
  {
    id: 'act5_crown_of_solaria',
    act: 'ACT V',
    title: 'Crown of Solaria',
    contact: 'Captain Cross',
    rewardCash: 100000,
    rewardRespect: 500,
    startX: 240,
    startY: -240,
    stages: [
      {
        objective: 'Storm Vance Financial Plaza and defeat Elena Vance\'s elite guard',
        speaker: 'Valeria Reyes',
        dialogue: 'Tonight we take Solaria Bay back for good. Vance\'s lieutenants are fortified at the central plaza.',
        waypointX: 240,
        waypointY: 0,
        type: 'clear_syndicate',
        guardCount: 6,
        wantedOnComplete: 5,
      },
      {
        objective: 'Survive the 5-Star SWORD Manhunt and reach Coral Promenade Plaza',
        speaker: 'Captain Cross',
        dialogue: 'All SBPD and SWORD units: maximum force authorized on Reyes! Lock down Ocean Palm Drive!',
        waypointX: 480,
        waypointY: -240,
        type: 'reach_waypoint',
        radius: 64,
      },
    ],
  },
];

export function createMissionDirector() {
  return {
    missionIndex: 0,
    stageIndex: 0,
    active: true,
    completedAll: false,
    bannerTitle: '',
    bannerTimer: 0,
    dialogueSpeaker: 'Rico Vega',
    dialogueText: 'Val! Elena Vance parked her twin-turbo Mako GTR on Ocean Palm Drive. Boost it and bring it to the Marina slip!',
    dialogueTimer: 12.0,
    activeGuards: [],
    missionVehicle: null,
  };
}

export function getCurrentMission(director) {
  return STORY_MISSIONS[director.missionIndex] || STORY_MISSIONS[STORY_MISSIONS.length - 1];
}

export function getCurrentStage(director) {
  const mission = getCurrentMission(director);
  return mission.stages[director.stageIndex] || mission.stages[0];
}

export function startStoryMission(director, index, worldState, rng) {
  director.missionIndex = Math.max(0, Math.min(STORY_MISSIONS.length - 1, index));
  director.stageIndex = 0;
  director.active = true;
  const mission = getCurrentMission(director);
  const stage = getCurrentStage(director);
  director.bannerTitle = `${mission.act}: ${mission.title}`;
  director.bannerTimer = 4.5;
  director.dialogueSpeaker = stage.speaker;
  director.dialogueText = stage.dialogue;
  director.dialogueTimer = 11.0;

  setupStageEntities(director, stage, worldState, rng);
}

function setupStageEntities(director, stage, worldState, rng) {
  director.activeGuards = [];
  if (!worldState) return;

  if (stage.type === 'clear_syndicate') {
    const count = stage.guardCount || 4;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const gx = stage.waypointX + Math.cos(angle) * 28;
      const gy = stage.waypointY + Math.sin(angle) * 28;
      const guard = createPedestrian(gx, gy, rng, 'syndicate');
      worldState.pedestrians.push(guard);
      director.activeGuards.push(guard);
    }
    if (stage.spawnVan) {
      const van = createVehicle('boveda_van', stage.waypointX, stage.waypointY, 0, rng, {
        driverType: 'parked',
        missionTag: 'bullion_van',
      });
      worldState.vehicles.push(van);
      director.missionVehicle = van;
    }
  }
}

export function updateActiveMission(director, worldState, rng, dt) {
  director.bannerTimer = Math.max(0, director.bannerTimer - dt);
  director.dialogueTimer = Math.max(0, director.dialogueTimer - dt);

  if (!director.active) return null;

  const mission = getCurrentMission(director);
  const stage = getCurrentStage(director);
  const player = worldState.player;

  let stageDone = false;

  if (stage.type === 'enter_vehicle') {
    if (player.inVehicle && player.vehicle) {
      stageDone = true;
    }
  } else if (stage.type === 'reach_waypoint') {
    const dist = Math.hypot(player.x - stage.waypointX, player.y - stage.waypointY);
    if (dist <= (stage.radius || 58)) {
      stageDone = true;
    }
  } else if (stage.type === 'clear_syndicate') {
    const dist = Math.hypot(player.x - stage.waypointX, player.y - stage.waypointY);
    if (director.activeGuards.length === 0 && dist < 260) {
      setupStageEntities(director, stage, worldState, rng);
    }
    const remaining = director.activeGuards.filter((g) => g.alive).length;
    if (director.activeGuards.length > 0 && remaining === 0) {
      stageDone = true;
    } else if (dist < 45 && player.inVehicle && Math.abs(player.speed) > 85) {
      // High-speed ramming sweep through objective
      stageDone = true;
    }
  }

  if (stageDone) {
    if (stage.wantedOnComplete) {
      setWantedLevelImmediate(
        worldState.wanted,
        Math.max(worldState.wanted.stars, stage.wantedOnComplete),
        player.x,
        player.y,
      );
    }

    if (director.stageIndex + 1 < mission.stages.length) {
      director.stageIndex += 1;
      const nextStage = getCurrentStage(director);
      director.dialogueSpeaker = nextStage.speaker;
      director.dialogueText = nextStage.dialogue;
      director.dialogueTimer = 11.0;
      setupStageEntities(director, nextStage, worldState, rng);
      return { event: 'stage_advance', mission, stage: nextStage };
    }

    // Mission completed!
    player.cash += mission.rewardCash;
    player.respect += mission.rewardRespect;
    player.stats.missionsCompleted += 1;
    player.stats.totalEarnings += mission.rewardCash;

    director.bannerTitle = `MISSION PASSED: +$${mission.rewardCash.toLocaleString()}`;
    director.bannerTimer = 5.0;

    if (director.missionIndex + 1 < STORY_MISSIONS.length) {
      director.missionIndex += 1;
      director.stageIndex = 0;
      const nextMission = getCurrentMission(director);
      const firstStage = getCurrentStage(director);
      director.dialogueSpeaker = firstStage.speaker;
      director.dialogueText = firstStage.dialogue;
      director.dialogueTimer = 12.0;
      setupStageEntities(director, firstStage, worldState, rng);
    } else {
      director.completedAll = true;
      director.missionIndex = 0;
      director.stageIndex = 0;
    }
    return { event: 'mission_complete', mission };
  }

  return null;
}

export function getMissionWaypoint(director) {
  const mission = getCurrentMission(director);
  const stage = getCurrentStage(director);
  return {
    x: stage.waypointX,
    y: stage.waypointY,
    act: mission.act,
    title: mission.title,
    objective: stage.objective,
    rewardCash: mission.rewardCash,
  };
}
