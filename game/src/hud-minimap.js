// Sleek, high-contrast AAA HUD & rotated circular GPS Minimap renderer:
// Mission progress, Live SBPD Tactical Dispatch, 5-star Wanted, Vitals, 8-slot Weapon Hotbar,
// Crew Favours, Crew Comms with stylized SVG avatars, digital Speedometer & FM Radio card.

import { RADIO_STATIONS, SERVICE_POIS, WEAPONS, WORLD } from './config.js';
import { CREW_ROSTER, getRespectRank } from './crew-progression.js';
import { getActiveMission, getActiveStage, STORY_MISSIONS } from './missions-story.js';
import { getDistrictAt, getStreetAt } from './world-city.js';

const WEAPON_SVGS = {
  fists: '<svg class="w-ico" viewBox="0 0 28 14"><rect x="7" y="4" width="14" height="7" rx="3" fill="currentColor"/></svg>',
  viper_9mm: '<svg class="w-ico" viewBox="0 0 28 14"><path d="M5 3h16v4H13l-2 5H7l1-5H5z" fill="currentColor"/></svg>',
  stinger_smg: '<svg class="w-ico" viewBox="0 0 28 14"><path d="M3 4h19v3h-5v5h-3V7H9l-1 4H5l1-4H3z" fill="currentColor"/></svg>',
  coral_shotgun: '<svg class="w-ico" viewBox="0 0 28 14"><path d="M2 5h23v2.5H13l-3 3.5H4l2-3.5H2z" fill="currentColor"/></svg>',
  helios_carbine: '<svg class="w-ico" viewBox="0 0 28 14"><path d="M2 5h7l2-2h7l1 2h7v2.5h-9l-1 4.5h-3l1-4.5H9l-3 3H2z" fill="currentColor"/></svg>',
  mirage_sniper: '<svg class="w-ico" viewBox="0 0 28 14"><path d="M1 6h8l2-3h6l1 3h9v2H16l-1 3h-3l1-3H8l-3 2.5H1z" fill="currentColor"/></svg>',
  sol_grenade: '<svg class="w-ico" viewBox="0 0 28 14"><circle cx="14" cy="8" r="4.5" fill="currentColor"/><rect x="12" y="1.5" width="4" height="2.5" fill="currentColor"/></svg>',
  cobre_launcher: '<svg class="w-ico" viewBox="0 0 28 14"><path d="M2 5h18l5 2-5 2H2z" fill="currentColor"/></svg>',
};

function makeAvatarSvg(speaker) {
  const palettes = {
    'Rico Vega': { bg: '#0c2740', jacket: '#0284c7', hair: '#111827', skin: '#d89d76', accent: '#22d3ee' },
    'Valeria "Val" Reyes': { bg: '#3b0c1e', jacket: '#e11d48', hair: '#18100e', skin: '#dfa680', accent: '#fbbf24' },
    'Sora Chen': { bg: '#0f2d2a', jacket: '#14b8a6', hair: '#1f2937', skin: '#f0c4a8', accent: '#5eead4' },
    'Dante Morales': { bg: '#22143d', jacket: '#7c3aed', hair: '#18181b', skin: '#c68963', accent: '#c084fc' },
    'Elena Vance': { bg: '#340b18', jacket: '#9f1239', hair: '#f59e0b', skin: '#ecc0a2', accent: '#fb7185' },
    'Capt. Alvarez': { bg: '#0f172a', jacket: '#1e3a8a', hair: '#475569', skin: '#c98e6a', accent: '#38bdf8' },
  };
  const p = palettes[speaker] || palettes['Rico Vega'];
  return `<svg viewBox="0 0 44 44" width="44" height="44">
    <rect width="44" height="44" fill="${p.bg}"/>
    <circle cx="22" cy="18" r="10" fill="${p.hair}"/>
    <ellipse cx="22" cy="19" rx="8" ry="9" fill="${p.skin}"/>
    <rect x="15" y="16" width="14" height="3.2" rx="1.4" fill="#090d16"/>
    <path d="M8 44c1-10 7-14 14-14s13 4 14 14z" fill="${p.jacket}"/>
    <path d="M17 30l5 6 5-6" fill="none" stroke="${p.accent}" stroke-width="2"/>
  </svg>`;
}

function formatClock(timeOfDay) {
  const h = Math.floor(((timeOfDay % 24) + 24) % 24);
  const m = Math.floor((timeOfDay - Math.floor(timeOfDay)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function createHudManager(hudRoot) {
  hudRoot.innerHTML = `
    <div class="hud-top-left">
      <div id="hud-mission" class="glass-card mission-card"></div>
      <div id="hud-dispatch" class="glass-card dispatch-card hidden"></div>
    </div>
    <div class="hud-top-right">
      <div id="hud-wanted" class="glass-card wanted-card"></div>
      <div id="hud-vitals" class="glass-card vitals-card"></div>
      <div id="hud-weapons" class="glass-card weapon-bar"></div>
      <div id="hud-favours" class="favours-row"></div>
    </div>
    <div id="hud-banner" class="banner-toast hidden"></div>
    <div id="hud-crosshair" class="crosshair hidden"><div class="crosshair-dot"></div></div>
    <div class="hud-bottom-left">
      <div class="radar-shell"><canvas id="minimap-canvas" width="174" height="174"></canvas></div>
      <div id="hud-loc" class="glass-card loc-pill"></div>
    </div>
    <div class="hud-bottom-center">
      <div id="hud-prompt" class="action-prompt hidden"></div>
      <div id="hud-comms" class="glass-card comms-card hidden"></div>
    </div>
    <div class="hud-bottom-right">
      <div id="hud-speed" class="glass-card speed-card"></div>
      <div id="hud-radio" class="glass-card radio-card"></div>
    </div>
  `;

  const el = {
    mission: hudRoot.querySelector('#hud-mission'),
    dispatch: hudRoot.querySelector('#hud-dispatch'),
    wanted: hudRoot.querySelector('#hud-wanted'),
    vitals: hudRoot.querySelector('#hud-vitals'),
    weapons: hudRoot.querySelector('#hud-weapons'),
    favours: hudRoot.querySelector('#hud-favours'),
    banner: hudRoot.querySelector('#hud-banner'),
    crosshair: hudRoot.querySelector('#hud-crosshair'),
    loc: hudRoot.querySelector('#hud-loc'),
    prompt: hudRoot.querySelector('#hud-prompt'),
    comms: hudRoot.querySelector('#hud-comms'),
    speed: hudRoot.querySelector('#hud-speed'),
    radio: hudRoot.querySelector('#hud-radio'),
    minimap: hudRoot.querySelector('#minimap-canvas'),
  };
  const mmCtx = el.minimap.getContext('2d');

  function drawMinimap(state) {
    const { player, vehicles, missions, wanted, cameraCtrl } = state;
    const w = 174;
    const h = 174;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.34;
    const camYaw = cameraCtrl.yaw;

    mmCtx.clearRect(0, 0, w, h);
    mmCtx.save();
    mmCtx.beginPath();
    mmCtx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    mmCtx.clip();

    // Deep turquoise ocean background
    mmCtx.fillStyle = '#0c4a6e';
    mmCtx.fillRect(0, 0, w, h);

    // Rotate world around player facing camera forward UP on the radar
    mmCtx.translate(cx, cy);
    mmCtx.rotate(camYaw);

    const toLocal = (wx, wz) => [-(wx - player.x) * scale, -(wz - player.z) * scale];
    const drawRect = (minX, minZ, maxX, maxZ, fill) => {
      const [x1, y1] = toLocal(maxX, maxZ);
      const [x2, y2] = toLocal(minX, minZ);
      mmCtx.fillStyle = fill;
      mmCtx.fillRect(x1, y1, x2 - x1, y2 - y1);
    };

    // Mainland urban blocks, golden beach & Starlight Isle
    drawRect(-410, -410, 268, 410, '#1e293b');
    drawRect(268, -410, 322, 410, '#eab676');
    drawRect(520, -210, 760, 210, '#1e3a34');
    // Solaria Arch Bridge & Sky-Ring Pier
    drawRect(258, -11, 558, 11, '#ef4444');
    drawRect(266, 111, 418, 129, '#b47a49');

    // Crisp road grid lines
    mmCtx.strokeStyle = '#64748b';
    mmCtx.lineWidth = 4.2;
    for (let i = 0; i < WORLD.avenuesX.length; i += 1) {
      const [x1, y1] = toLocal(WORLD.avenuesX[i], -380);
      const [x2, y2] = toLocal(WORLD.avenuesX[i], 380);
      mmCtx.beginPath(); mmCtx.moveTo(x1, y1); mmCtx.lineTo(x2, y2); mmCtx.stroke();
    }
    for (let j = 0; j < WORLD.streetsZ.length; j += 1) {
      const [x1, y1] = toLocal(-380, WORLD.streetsZ[j]);
      const [x2, y2] = toLocal(254, WORLD.streetsZ[j]);
      mmCtx.beginPath(); mmCtx.moveTo(x1, y1); mmCtx.lineTo(x2, y2); mmCtx.stroke();
    }

    // Glowing GPS route line from player to active mission waypoint
    const stage = getActiveStage(missions);
    const [tx, ty] = toLocal(stage.x, stage.z);
    mmCtx.strokeStyle = '#fbbf24';
    mmCtx.lineWidth = 3;
    mmCtx.setLineDash([5, 3]);
    mmCtx.beginPath();
    mmCtx.moveTo(0, 0);
    mmCtx.lineTo(0, ty);
    mmCtx.lineTo(tx, ty);
    mmCtx.stroke();
    mmCtx.setLineDash([]);

    // Service POIs (garages, gun shops, safehouses)
    for (let i = 0; i < SERVICE_POIS.length; i += 1) {
      const [px, py] = toLocal(SERVICE_POIS[i].x, SERVICE_POIS[i].z);
      mmCtx.fillStyle = SERVICE_POIS[i].color;
      mmCtx.beginPath(); mmCtx.arc(px, py, 3.2, 0, Math.PI * 2); mmCtx.fill();
    }

    // Active Mission Star Blip
    mmCtx.fillStyle = '#fbbf24';
    mmCtx.beginPath(); mmCtx.arc(tx, ty, 5.2, 0, Math.PI * 2); mmCtx.fill();
    mmCtx.strokeStyle = '#090d16'; mmCtx.lineWidth = 1.5; mmCtx.stroke();

    // Police Units & AIR-1 Blips
    for (let i = 0; i < vehicles.length; i += 1) {
      const v = vehicles[i];
      if (!v.spec.isPolice || v.destroyed) continue;
      const [vx, vy] = toLocal(v.x, v.z);
      mmCtx.fillStyle = v.spec.isHeli ? '#22d3ee' : (i % 2 === 0 ? '#ef4444' : '#3b82f6');
      mmCtx.beginPath(); mmCtx.arc(vx, vy, v.spec.isHeli ? 4.6 : 3.5, 0, Math.PI * 2); mmCtx.fill();
    }

    mmCtx.restore();

    // Centered crisp white Player Arrow pointing forward
    mmCtx.fillStyle = '#ffffff';
    mmCtx.beginPath();
    mmCtx.moveTo(cx, cy - 7);
    mmCtx.lineTo(cx + 5.5, cy + 6);
    mmCtx.lineTo(cx, cy + 3);
    mmCtx.lineTo(cx - 5.5, cy + 6);
    mmCtx.closePath();
    mmCtx.fill();

    // North indicator on radar bezel
    const nx = cx - Math.sin(camYaw) * 74;
    const ny = cy + Math.cos(camYaw) * 74;
    mmCtx.fillStyle = '#090d16';
    mmCtx.beginPath(); mmCtx.arc(nx, ny, 8.5, 0, Math.PI * 2); mmCtx.fill();
    mmCtx.fillStyle = '#fbbf24';
    mmCtx.font = '800 10px "Segoe UI", sans-serif';
    mmCtx.textAlign = 'center';
    mmCtx.textBaseline = 'middle';
    mmCtx.fillText('N', nx, ny + 0.5);
  }

  function update(state) {
    const { player, missions, wanted, crew, audio, timeOfDay, elapsed } = state;
    const m = getActiveMission(missions);
    const st = getActiveStage(missions);

    // 1. Top-Left: Mission Card
    let segs = '';
    for (let i = 0; i < m.stages.length; i += 1) {
      const cls = i < missions.stageIndex ? 'done' : i === missions.stageIndex ? 'active' : '';
      segs += `<div class="stage-seg ${cls}"></div>`;
    }
    el.mission.innerHTML = `
      <div class="mission-kicker"><span>MISSION ${missions.missionIndex + 1} OF ${STORY_MISSIONS.length}</span><span>${m.act}</span></div>
      <div class="mission-title">${m.title}</div>
      <div class="stage-bar">${segs}</div>
      <div class="mission-obj">${st.obj}</div>
      <div class="mission-next"><strong>NEXT:</strong> ${st.next}</div>
    `;

    // 2. Top-Left: Live SBPD Tactical Dispatch Panel
    const units = wanted.getActiveUnits(player);
    if (wanted.state.stars > 0 && units.length > 0) {
      el.dispatch.classList.remove('hidden');
      let rows = '';
      for (let i = 0; i < units.length; i += 1) {
        const u = units[i];
        rows += `<div class="dispatch-row"><span class="d-call">${u.callsign}</span><span class="d-dist">${u.dist}m</span><span class="d-badge t-${u.badge}">${u.tactic}</span></div>`;
      }
      el.dispatch.innerHTML = `
        <div class="dispatch-head"><span><i class="dispatch-pulse"></i>SBPD TACTICAL DISPATCH</span><span>${units.length} ACTIVE</span></div>
        <div class="dispatch-list">${rows}</div>
      `;
    } else {
      el.dispatch.classList.add('hidden');
    }

    // 3. Top-Right: Wanted Stars & IN SIGHT Bar
    const blink = Math.floor(elapsed * 4) % 2 === 0;
    let starsHtml = '';
    for (let s = 1; s <= 5; s += 1) {
      const lit = s <= wanted.state.stars;
      const cls = lit ? (wanted.state.inSight && blink ? 'alert' : 'lit') : '';
      starsHtml += `<span class="star-icon ${cls}">★</span>`;
    }
    const sightPct = Math.round(wanted.state.sightMeter);
    el.wanted.innerHTML = `
      <div class="wanted-top"><span class="wanted-label">SBPD WANTED</span><div class="stars-row">${starsHtml}</div></div>
      ${wanted.state.stars > 0 ? `<div class="sight-row"><span class="sight-tag ${wanted.state.inSight ? 'hot' : 'cool'}">${wanted.state.jamTimer > 0 ? 'JAMMED' : (wanted.state.inSight ? 'IN SIGHT' : 'EVADING')}</span><div class="bar-track"><div class="bar-fill ${wanted.state.inSight ? 'bar-sight-hot' : 'bar-sight-cool'}" style="width:${sightPct}%"></div></div></div>` : ''}
    `;

    // 4. Top-Right: Cash, Clock, Respect Rank, Health & Armor
    const rank = getRespectRank(player.respect);
    el.vitals.innerHTML = `
      <div class="vitals-head">
        <div class="cash-val">$${Math.round(player.cash).toLocaleString()}</div>
        <div class="clock-rank"><div class="clock-val">${formatClock(timeOfDay)}</div><div class="rank-val">RANK ${rank.rank} · ${rank.title.toUpperCase()}</div></div>
      </div>
      <div class="vital-bars">
        <div class="v-item"><div class="v-lbl"><span>HEALTH</span><span>${Math.round(player.health)}</span></div><div class="bar-track"><div class="bar-fill bar-hp" style="width:${Math.round(player.health)}%"></div></div></div>
        <div class="v-item"><div class="v-lbl"><span>ARMOUR</span><span>${Math.round(player.armor)}</span></div><div class="bar-track"><div class="bar-fill bar-arm" style="width:${Math.round(player.armor)}%"></div></div></div>
      </div>
    `;

    // 5. Top-Right: Compact 8-Slot Weapon Hotbar
    let wHtml = '';
    for (let i = 0; i < WEAPONS.length; i += 1) {
      const w = WEAPONS[i];
      const active = i === player.weaponIndex ? 'active' : '';
      const ammoStr = w.inf ? '∞' : String(player.ammo[w.id] || 0);
      wHtml += `<div class="w-slot ${active}" style="color:${active ? '#fbbf24' : '#cbd5e1'}"><span class="w-num">${i + 1}</span>${WEAPON_SVGS[w.id] || ''}<span class="w-ammo">${ammoStr}</span></div>`;
    }
    el.weapons.innerHTML = wHtml;

    // 6. Top-Right: Crew Favours Status Badges
    let favHtml = '';
    for (let i = 0; i < CREW_ROSTER.length; i += 1) {
      const c = CREW_ROSTER[i];
      const cd = Math.ceil(crew.cooldowns[c.id] || 0);
      favHtml += `<div class="fav-pill ${cd <= 0 ? 'ready' : 'cooling'}"><div class="fav-key">[${c.key}]</div><div class="fav-name">${c.short}</div><div class="fav-stat">${cd <= 0 ? 'READY' : `${cd}s`}</div></div>`;
    }
    el.favours.innerHTML = favHtml;

    // 7. Bottom-Left: District, Street & Circular Rotated GPS Minimap
    const dist = getDistrictAt(player.x, player.z);
    const street = getStreetAt(player.x, player.z);
    el.loc.innerHTML = `<div class="loc-dist">${dist.name}</div><div class="loc-street">${street}</div>`;
    drawMinimap(state);

    // 8. Bottom-Center: Carjack / POI Prompt & Crew Comms
    if (!player.inVehicle && player.nearbyVehicle) {
      el.prompt.classList.remove('hidden');
      el.prompt.innerHTML = `<span class="prompt-key">F</span>Steal ${player.nearbyVehicle.spec.name}`;
    } else if (player.nearbyPoi) {
      el.prompt.classList.remove('hidden');
      el.prompt.innerHTML = `<span class="prompt-key">M</span>Open ${player.nearbyPoi.name}`;
    } else {
      el.prompt.classList.add('hidden');
    }

    if (missions.comms && missions.comms.timer > 0) {
      el.comms.classList.remove('hidden');
      el.comms.innerHTML = `
        <div class="comms-avatar">${makeAvatarSvg(missions.comms.speaker)}</div>
        <div class="comms-body">
          <div class="comms-meta"><span class="comms-name">${missions.comms.speaker}</span><span class="comms-role">${missions.comms.role}</span></div>
          <div class="comms-text">${missions.comms.text}</div>
        </div>
      `;
    } else {
      el.comms.classList.add('hidden');
    }

    // 9. Bottom-Right: Digital Speedometer & FM Radio Card
    const v = player.vehicle;
    const kmh = Math.round((v ? v.speed : player.speed) * 3.6);
    const condPct = v ? Math.round((v.health / v.maxHealth) * 100) : Math.round(player.health);
    const nitroPct = v ? Math.round(v.nitro) : 100;
    const vehTitle = v ? v.spec.name.toUpperCase() : `ON FOOT · ${WEAPONS[player.weaponIndex].name.toUpperCase()}`;
    el.speed.innerHTML = `
      <div class="speed-top"><span class="speed-num">${kmh}</span><span class="speed-unit">KM/H</span></div>
      <div class="veh-name">${vehTitle}</div>
      <div class="veh-bars">
        <div class="v-item"><div class="v-lbl"><span>${v ? 'CHASSIS' : 'STAMINA'}</span><span>${condPct}%</span></div><div class="bar-track"><div class="bar-fill bar-cond" style="width:${condPct}%"></div></div></div>
        <div class="v-item"><div class="v-lbl"><span>${v ? 'NITRO' : 'AMMO'}</span><span>${v ? `${nitroPct}%` : (WEAPONS[player.weaponIndex].inf ? '∞' : player.ammo[WEAPONS[player.weaponIndex].id])}</span></div><div class="bar-track"><div class="bar-fill bar-nitro" style="width:${nitroPct}%"></div></div></div>
      </div>
    `;

    const stRadio = RADIO_STATIONS[audio.state.stationIndex];
    el.radio.innerHTML = `<span class="radio-station">♫ ${stRadio.name}</span><span class="radio-track">${stRadio.track}</span>`;

    // 10. Center Reticle & Mission Banner
    el.crosshair.classList.toggle('hidden', player.inVehicle);
    if (missions.bannerTimer > 0 && missions.bannerText) {
      el.banner.classList.remove('hidden');
      el.banner.textContent = missions.bannerText;
    } else {
      el.banner.classList.add('hidden');
    }
  }

  return { update };
}
