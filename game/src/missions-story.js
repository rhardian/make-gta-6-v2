// 10-Mission Multi-Stage Story Campaign ("Sun & Syndicate") for Solaria Bay:
// segmented stage progress, 3D glowing waypoint beacons, crew comms dialogue, and syndicate ambushes.

import * as THREE from 'three';
import { spawnPedestrian } from './traffic-peds.js';
import { spawnVehicle } from './vehicles.js';
import { getGroundHeightAt } from './world-city.js';

export const STORY_MISSIONS = [
  {
    id: 'm1_coral_boost', act: 'ACT I', title: 'Coral Drive Boost', rewardCash: 15000, rewardRespect: 120,
    stages: [
      { obj: 'Boost the crimson Mako V12 GT on Ocean Palm Blvd', next: 'Evade SBPD patrol to Pier Slip', type: 'enter_veh', x: 235, z: -82, speaker: 'Rico Vega', role: 'WHEELMAN', msg: 'Val, Elena Vance parked her twin-turbo Mako V12 GT outside Hotel Solaria. Grab it and rip south!' },
      { obj: 'Race past Hotel Solaria to Starlight Pier entrance', next: 'Shake off patrol & deliver to Customs', type: 'waypoint', x: 240, z: 118, r: 22, wanted: 2, speaker: 'Rico Vega', role: 'WHEELMAN', msg: 'SBPD flagged the chassis! Drift around the corner and hit Starlight Pier Way!' },
      { obj: 'Deliver the supercar to Solaria Customs in Mirage Strip', next: 'Mission Complete', type: 'waypoint', x: 102, z: -200, r: 22, speaker: 'Sora Chen', role: 'MECHANIC', msg: 'Bay doors are open at Solaria Customs—bring that V12 in hot and I will swap the VIN!' },
    ],
  },
  {
    id: 'm2_harbor_wiretap', act: 'ACT I', title: 'Harbor Wiretap', rewardCash: 22000, rewardRespect: 150,
    stages: [
      { obj: 'Drive to Cobre Docks Freight Terminal', next: 'Neutralize dock lookouts', type: 'waypoint', x: -120, z: 260, r: 24, speaker: 'Dante Morales', role: 'NETRUNNER', msg: 'Syndicate manifest servers run out of Cobre Docks. Pull up near Container Row.' },
      { obj: 'Eliminate Syndicate dock guards at the terminal', next: 'Escape to Little Brisa Safehouse', type: 'clear', x: -120, z: 270, count: 4, wanted: 2, speaker: 'Valeria "Val" Reyes', role: 'LEADER', msg: 'Four Syndicate lookouts guarding the shipping crates—clearing the yard now.' },
      { obj: 'Upload the dock ledger at Brisa Armory', next: 'Mission Complete', type: 'waypoint', x: -200, z: 98, r: 22, speaker: 'Dante Morales', role: 'NETRUNNER', msg: 'Encrypted routes decrypted—we just mapped every bullion run in Solaria Bay!' },
    ],
  },
  {
    id: 'm3_brisa_sweep', act: 'ACT II', title: 'Brisa Armory Sweep', rewardCash: 28000, rewardRespect: 180,
    stages: [
      { obj: 'Intercept Syndicate enforcers shaking down Little Brisa', next: 'Secure the weapons crate', type: 'clear', x: -240, z: 80, count: 4, speaker: 'Sora Chen', role: 'MECHANIC', msg: 'Elena sent enforcers to lean on Cafe Brisa and the Armory. Shut them down fast!' },
      { obj: 'Drive the seized muscle car through Solaria Downtown', next: 'Reach Coral Penthouse', type: 'waypoint', x: 0, z: 0, r: 24, wanted: 3, speaker: 'Valeria "Val" Reyes', role: 'LEADER', msg: 'Little Brisa is clear. Heading east across Downtown with their hardware.' },
      { obj: 'Stash the Syndicate arsenal at Coral Penthouse', next: 'Mission Complete', type: 'waypoint', x: 214, z: -90, r: 22, speaker: 'Rico Vega', role: 'WHEELMAN', msg: 'Nice haul—Stinger SMGs and Helios Carbines stocked for the Mirage vault hit!' },
    ],
  },
  {
    id: 'm4_mirage_heist', act: 'ACT II', title: 'Mirage Vault Breach', rewardCash: 42000, rewardRespect: 240,
    stages: [
      { obj: 'Breach the Mirage Strip armored convoy outside Mirage Lounge', next: 'Eliminate Syndicate & SBPD response', type: 'waypoint', x: 0, z: -205, r: 26, speaker: 'Valeria "Val" Reyes', role: 'LEADER', msg: 'Boveda Bullion Van is pinned on Mirage Strip. Moving in on foot—stay sharp!' },
      { obj: 'Neutralize Syndicate escort & hold the avenue', next: 'Steal Aureo Cabrio & escape south', type: 'clear', x: 0, z: -215, count: 5, spawnVan: true, wanted: 3, speaker: 'Rico Vega', role: 'WHEELMAN', msg: 'Armored escort is burning! Drop the Syndicate shooters and hijack that Aureo Cabrio for getaway!' },
      { obj: 'Escape 3-star pursuit to Solaria Customs Garage', next: 'Mission Complete', type: 'waypoint', x: 102, z: -200, r: 24, speaker: 'Sora Chen', role: 'MECHANIC', msg: 'Vault bearer bonds secured! Pull into the spray booth to drop the heat!' },
    ],
  },
  {
    id: 'm5_palma_ledger', act: 'ACT III', title: 'Palma Villa Ledger', rewardCash: 48000, rewardRespect: 260,
    stages: [
      { obj: 'Infiltrate Palma Vista hilltop compound', next: 'Clear Elena Vance bodyguards', type: 'waypoint', x: -240, z: -240, r: 24, speaker: 'Dante Morales', role: 'NETRUNNER', msg: 'Elena keeps her offshore accounts in a Palma Vista villa. Hit the north ridge.' },
      { obj: 'Defeat the Palma Vista security squad', next: 'Race down Meridian Plaza', type: 'clear', x: -240, z: -250, count: 5, wanted: 3, speaker: 'Elena Vance', role: 'SYNDICATE', msg: 'You are playing with fire, Reyes! My private security will bury you in Palma Vista!' },
      { obj: 'Deliver the ledger to Meridian Plaza drop', next: 'Mission Complete', type: 'waypoint', x: 120, z: -120, r: 24, speaker: 'Dante Morales', role: 'NETRUNNER', msg: 'Got the ledger! Now we know the exact time their coastal convoy crosses Solaria Arch Bridge.' },
    ],
  },
  {
    id: 'm6_coral_takedown', act: 'ACT III', title: 'Coral Bay Takedown', rewardCash: 65000, rewardRespect: 320,
    stages: [
      { obj: 'Intercept the Syndicate courier on Coral Promenade', next: 'Break through SBPD roadblock on Ocean Palm Blvd', type: 'enter_veh', x: 240, z: -140, speaker: 'Rico Vega', role: 'WHEELMAN', msg: 'Courier just turned onto Ocean Palm Blvd! Drop the hammer in the Mako V12 GT!' },
      { obj: 'Smash past the SBPD roadblock & evade AIR-1 down Coral Promenade', next: 'Cross Solaria Arch Bridge to Starlight Isle', type: 'waypoint', x: 408, z: 0, r: 30, wanted: 4, speaker: 'Rico Vega', role: 'WHEELMAN', msg: 'AIR-1 locked spotlight on your roof and SBPD threw a spike roadblock ahead—drift left toward Solaria Arch Bridge!' },
      { obj: 'Lose 4-star lockdown at Starlight Villa Safehouse', next: 'Mission Complete', type: 'waypoint', x: 640, z: -90, r: 26, speaker: 'Sora Chen', role: 'MECHANIC', msg: 'You cleared the bridge at 240 km/h! Tuck the Mako into Starlight Villa!' },
    ],
  },
  {
    id: 'm7_pier_smuggle', act: 'ACT IV', title: 'Sky-Ring Bay Run', rewardCash: 74000, rewardRespect: 350,
    stages: [
      { obj: 'Board the Corsair 380 speedboat beside Sky-Ring Pier', next: 'Collect offshore contraband beacon', type: 'waypoint', x: 358, z: -80, r: 28, speaker: 'Valeria "Val" Reyes', role: 'LEADER', msg: 'Offshore drop is floating east of Sky-Ring Pier. Grabbing the Corsair 380!' },
      { obj: 'Cut past Starlight Isle channel to the south buoy', next: 'Return to Starlight Marina', type: 'waypoint', x: 430, z: 165, r: 30, wanted: 3, speaker: 'Dante Morales', role: 'NETRUNNER', msg: 'Harbor patrol pinged our transponder—keep the twin outboards wide open!' },
      { obj: 'Dock at Starlight Isle Yacht Slip', next: 'Mission Complete', type: 'waypoint', x: 560, z: 120, r: 28, speaker: 'Rico Vega', role: 'WHEELMAN', msg: 'Clean maritime drop! Syndicate shipping line belongs to us now.' },
    ],
  },
  {
    id: 'm8_bridge_ambush', act: 'ACT IV', title: 'Arch Bridge Convoy', rewardCash: 86000, rewardRespect: 400,
    stages: [
      { obj: 'Reach the crest of Solaria Arch Bridge', next: 'Neutralize Syndicate bridge blockade', type: 'waypoint', x: 408, z: 0, r: 26, speaker: 'Valeria "Val" Reyes', role: 'LEADER', msg: 'Elena is moving her reserve bullion across Solaria Arch Bridge right now.' },
      { obj: 'Eliminate the Syndicate bridge strike team', next: 'Haul cargo to Cobre Customs', type: 'clear', x: 408, z: 0, count: 5, spawnVan: true, wanted: 4, speaker: 'Capt. Alvarez', role: 'SBPD', msg: 'All SBPD units: heavy gunfire on Solaria Arch Bridge! Deploy SWAT Bearcats immediately!' },
      { obj: 'Deliver the armored shipment to Cobre Customs', next: 'Mission Complete', type: 'waypoint', x: -140, z: 220, r: 26, speaker: 'Sora Chen', role: 'MECHANIC', msg: 'Bullion van secured under the cranes—Elena Vance is cornered!' },
    ],
  },
  {
    id: 'm9_banco_blackout', act: 'ACT V', title: 'Banco Solaria Blackout', rewardCash: 110000, rewardRespect: 480,
    stages: [
      { obj: 'Cut power relays outside Banco Solaria Downtown', next: 'Clear elite tower guards', type: 'waypoint', x: 0, z: -40, r: 24, speaker: 'Dante Morales', role: 'NETRUNNER', msg: 'Looping Banco Solaria cameras now. Take the main plaza and blow the lobby doors!' },
      { obj: 'Defeat Banco Solaria elite Syndicate defenders', next: 'Escape 5-star SWAT Manhunt', type: 'clear', x: 0, z: -45, count: 6, wanted: 5, speaker: 'Valeria "Val" Reyes', role: 'LEADER', msg: 'Six armored guards down at the plaza—vault codes uploaded!' },
      { obj: 'Outrun SWAT lockdown to Mirage Strip extraction', next: 'Mission Complete', type: 'waypoint', x: 0, z: -260, r: 28, speaker: 'Rico Vega', role: 'WHEELMAN', msg: 'Five stars across Downtown and we still walked away with the bank!' },
    ],
  },
  {
    id: 'm10_crown_solaria', act: 'FINALE', title: 'Crown of Solaria Bay', rewardCash: 250000, rewardRespect: 800,
    stages: [
      { obj: 'Cross Solaria Arch Bridge to Elena Vance Estate on Starlight Isle', next: 'Defeat Elena Vance elite guard', type: 'waypoint', x: 640, z: 80, r: 26, speaker: 'Valeria "Val" Reyes', role: 'LEADER', msg: 'One last run, crew. Tonight Solaria Bay gets new management.' },
      { obj: 'Neutralize the Starlight Isle Syndicate garrison', next: 'Claim the Coral Promenade Victory Lap', type: 'clear', x: 640, z: 85, count: 6, wanted: 5, speaker: 'Elena Vance', role: 'SYNDICATE', msg: 'Every soldier on Starlight Isle is converging on the terrace—you will never leave this island!' },
      { obj: 'Return victorious to Coral Promenade Penthouse', next: 'Campaign Complete!', type: 'waypoint', x: 214, z: -90, r: 28, speaker: 'Rico Vega', role: 'WHEELMAN', msg: 'Sun is rising over Solaria Bay and the whole coast is ours, Val! Legends forever!' },
    ],
  },
];

export function createMissionDirector(scene) {
  const beaconGroup = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.28, 8, 32),
    new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.9 }),
  );
  ring.rotation.x = Math.PI / 2;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 2.4, 58, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.16, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  beam.position.y = 29;
  beaconGroup.add(ring, beam);
  scene.add(beaconGroup);

  return {
    missionIndex: 0,
    stageIndex: 0,
    completedIds: [],
    activeGuards: [],
    beaconGroup,
    bannerText: '',
    bannerTimer: 0,
    comms: {
      speaker: STORY_MISSIONS[0].stages[0].speaker,
      role: STORY_MISSIONS[0].stages[0].role,
      text: STORY_MISSIONS[0].stages[0].msg,
      timer: 14,
    },
  };
}

export function getActiveMission(dir) {
  return STORY_MISSIONS[Math.min(dir.missionIndex, STORY_MISSIONS.length - 1)];
}

export function getActiveStage(dir) {
  const m = getActiveMission(dir);
  return m.stages[Math.min(dir.stageIndex, m.stages.length - 1)];
}

export function startMission(dir, index, stageIdx, scene, vehicles, pedestrians, rng) {
  dir.missionIndex = Math.max(0, Math.min(STORY_MISSIONS.length - 1, index));
  dir.stageIndex = stageIdx || 0;
  dir.activeGuards = [];
  const m = getActiveMission(dir);
  const st = getActiveStage(dir);
  dir.comms = { speaker: st.speaker, role: st.role, text: st.msg, timer: 14 };
  dir.bannerText = `${m.act} · ${m.title}`;
  dir.bannerTimer = 3.5;
  spawnStageTargets(dir, st, scene, vehicles, pedestrians, rng);
}

function spawnStageTargets(dir, stage, scene, vehicles, pedestrians, rng) {
  dir.activeGuards = [];
  if (stage.type !== 'clear') return;
  const n = stage.count || 4;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const gx = stage.x + Math.cos(a) * 11;
    const gz = stage.z + Math.sin(a) * 11;
    const g = spawnPedestrian(scene, gx, gz, rng, 'syndicate', { aiming: true });
    pedestrians.push(g);
    dir.activeGuards.push(g);
  }
  if (stage.spawnVan) {
    vehicles.push(spawnVehicle(scene, 'boveda_armored', stage.x, stage.z, 0.2, rng, { driverType: 'parked', missionTag: 'bullion' }));
  }
}

export function updateMissionDirector(dir, dt, elapsed, scene, player, vehicles, pedestrians, wanted, rng) {
  dir.bannerTimer = Math.max(0, dir.bannerTimer - dt);
  dir.comms.timer = Math.max(0, dir.comms.timer - dt);

  const m = getActiveMission(dir);
  const st = getActiveStage(dir);
  const gy = getGroundHeightAt(st.x, st.z);
  dir.beaconGroup.position.set(st.x, gy + 0.35, st.z);
  dir.beaconGroup.rotation.y = elapsed * 1.4;

  let done = false;
  if (st.type === 'enter_veh') {
    if (player.inVehicle) done = true;
  } else if (st.type === 'waypoint') {
    if (Math.hypot(player.x - st.x, player.z - st.z) <= (st.r || 24)) done = true;
  } else if (st.type === 'clear') {
    if (dir.activeGuards.length === 0 && Math.hypot(player.x - st.x, player.z - st.z) < 75) {
      spawnStageTargets(dir, st, scene, vehicles, pedestrians, rng);
    }
    if (dir.activeGuards.length > 0 && dir.activeGuards.every((g) => !g.alive)) done = true;
  }

  if (!done) return null;

  if (st.wanted && wanted) {
    wanted.setWantedImmediate(Math.max(wanted.state.stars, st.wanted), player.x, player.z);
  }
  if (dir.stageIndex + 1 < m.stages.length) {
    dir.stageIndex += 1;
    const nextSt = getActiveStage(dir);
    dir.comms = { speaker: nextSt.speaker, role: nextSt.role, text: nextSt.msg, timer: 14 };
    spawnStageTargets(dir, nextSt, scene, vehicles, pedestrians, rng);
    return { event: 'stage', mission: m };
  }

  // Complete full mission
  if (!dir.completedIds.includes(m.id)) dir.completedIds.push(m.id);
  player.cash += m.rewardCash;
  player.respect += m.rewardRespect;
  player.stats.missionsCompleted = dir.completedIds.length;
  player.stats.totalEarnings += m.rewardCash;
  dir.bannerText = `MISSION PASSED · +$${m.rewardCash.toLocaleString()}`;
  dir.bannerTimer = 4.5;

  if (dir.missionIndex + 1 < STORY_MISSIONS.length) {
    dir.missionIndex += 1;
    dir.stageIndex = 0;
    const nm = getActiveMission(dir);
    const ns = getActiveStage(dir);
    dir.comms = { speaker: ns.speaker, role: ns.role, text: ns.msg, timer: 14 };
    spawnStageTargets(dir, ns, scene, vehicles, pedestrians, rng);
  }
  return { event: 'complete', mission: m };
}
