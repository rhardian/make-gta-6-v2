// Bespoke Start / Title Screen (metallic sunset-chrome emblem over elevated 3D coastal panorama)
// and full-screen tabbed Pause & Tactical Atlas Menu (MAP | MISSIONS | STATS | GARAGE | CREW | SETTINGS | SAVE).

import { DISTRICTS, GARAGE_UPGRADES, SERVICE_POIS, VEHICLES, WEAPONS, WORLD } from './config.js';
import { applyGarageOrShopPurchase, buyProperty, SIDE_ACTIVITIES } from './activities-economy.js';
import { computeCompletionPercent, CREW_ROSTER, getRespectRank, triggerCrewFavour } from './crew-progression.js';
import { getActiveStage, startMission, STORY_MISSIONS } from './missions-story.js';

const ATLAS_TABS = ['MAP', 'MISSIONS', 'STATS', 'GARAGE', 'CREW', 'SETTINGS', 'SAVE'];

const TITLE_EMBLEM_SVG = `
<svg viewBox="0 0 430 116" width="420" height="114" aria-label="Solaria Bay: Sun and Syndicate">
  <defs>
    <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff4b8"/>
      <stop offset="48%" stop-color="#ff9b42"/>
      <stop offset="100%" stop-color="#ff3b6b"/>
    </linearGradient>
    <linearGradient id="chromeGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="42%" stop-color="#ffe7c2"/>
      <stop offset="56%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#ff4d79"/>
    </linearGradient>
    <filter id="softGlow"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#050814" flood-opacity="0.82"/></filter>
  </defs>
  <circle cx="54" cy="54" r="36" fill="url(#sunGrad)" opacity="0.92"/>
  <rect x="14" y="57" width="80" height="4" fill="#090d16" opacity="0.65"/>
  <rect x="18" y="66" width="72" height="4" fill="#090d16" opacity="0.72"/>
  <rect x="24" y="75" width="60" height="4" fill="#090d16" opacity="0.78"/>
  <text x="18" y="64" font-family="'Segoe UI', Impact, sans-serif" font-size="52" font-weight="900" letter-spacing="3" fill="url(#chromeGrad)" stroke="#0b1020" stroke-width="2.5" filter="url(#softGlow)">SOLARIA BAY</text>
  <rect x="22" y="76" width="382" height="3" rx="1.5" fill="url(#sunGrad)"/>
  <text x="24" y="102" font-family="'Segoe UI', sans-serif" font-size="21" font-weight="900" letter-spacing="8.5" fill="#fef3c7" filter="url(#softGlow)">SUN &amp; SYNDICATE</text>
</svg>`;

export function createMenuManager(menuRoot, actions) {
  let activeTab = 'MAP';
  let notice = '';

  function drawAtlasVectorMap(canvas, state) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Shimmering turquoise-to-cobalt coastal water backdrop
    const sea = ctx.createLinearGradient(0, 0, w, h);
    sea.addColorStop(0, '#0b3866');
    sea.addColorStop(0.55, '#0e6185');
    sea.addColorStop(1, '#09436b');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, w, h);

    // Map world [-430..810] x [-430..430] into canvas
    const toPx = (wx, wz) => [
      ((wx + 430) / 1240) * w,
      ((wz + 430) / 860) * h,
    ];
    const drawWorldRect = (x1, z1, x2, z2, fill, stroke = null) => {
      const [px1, py1] = toPx(x1, z1);
      const [px2, py2] = toPx(x2, z2);
      ctx.fillStyle = fill;
      ctx.fillRect(px1, py1, px2 - px1, py2 - py1);
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px1, py1, px2 - px1, py2 - py1);
      }
    };

    // Mainland + Golden Beach + Starlight Isle landmasses + shallow reef contour glow
    drawWorldRect(318, -410, 354, 410, 'rgba(34, 211, 238, 0.16)');
    drawWorldRect(496, -234, 784, 234, 'rgba(34, 211, 238, 0.16)');
    drawWorldRect(-410, -410, 272, 410, '#182234');
    drawWorldRect(272, -410, 324, 410, '#e9c47c');
    drawWorldRect(512, -218, 768, 218, '#e9c47c');
    drawWorldRect(524, -206, 756, 206, '#1a3833');

    // Architectural block silhouettes across the city blocks for rich cartographic detail
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    for (const bx of [-300, -180, -60, 60, 180]) {
      for (const bz of [-300, -180, -60, 60, 180, 300]) {
        drawWorldRect(bx - 38, bz - 38, bx - 4, bz - 4, 'rgba(255,255,255,0.06)');
        drawWorldRect(bx + 4, bz - 38, bx + 38, bz - 4, 'rgba(255,255,255,0.05)');
        drawWorldRect(bx - 38, bz + 4, bx - 4, bz + 38, 'rgba(255,255,255,0.05)');
        drawWorldRect(bx + 4, bz + 4, bx + 38, bz + 38, 'rgba(255,255,255,0.06)');
      }
    }

    // 7 Colored District Zones
    for (let i = 0; i < DISTRICTS.length; i += 1) {
      const d = DISTRICTS[i];
      drawWorldRect(d.minX, d.minZ, d.maxX, d.maxZ, `${d.color}22`, `${d.color}66`);
    }

    // Road grid + Solaria Arch Bridge + Sky-Ring Pier
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    for (const ax of WORLD.avenuesX) {
      const [x1, y1] = toPx(ax, -380);
      const [x2, y2] = toPx(ax, 380);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    for (const sz of WORLD.streetsZ) {
      const [x1, y1] = toPx(-380, sz);
      const [x2, y2] = toPx(255, sz);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // Starlight Isle loop
    const [i1x, i1y] = toPx(560, -160);
    const [i2x, i2y] = toPx(720, 160);
    ctx.strokeRect(i1x, i1y, i2x - i1x, i2y - i1y);

    // Iconic Solaria Arch Bridge (red) & Wooden Sky-Ring Pier (amber)
    const [b1x, b1y] = toPx(254, 0);
    const [b2x, b2y] = toPx(560, 0);
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 6.5;
    ctx.beginPath(); ctx.moveTo(b1x, b1y); ctx.lineTo(b2x, b2y); ctx.stroke();

    const [p1x, p1y] = toPx(266, 120);
    const [p2x, p2y] = toPx(418, 120);
    ctx.strokeStyle = '#d97706'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.stroke();
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(p2x - 10, p2y, 9, 0, Math.PI * 2); ctx.stroke();

    // Glowing GPS route polyline from player to mission objective
    const st = getActiveStage(state.missions);
    const [plx, ply] = toPx(state.player.x, state.player.z);
    const [mx, my] = toPx(st.x, st.z);
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3.2; ctx.setLineDash([7, 4]);
    ctx.beginPath(); ctx.moveTo(plx, ply); ctx.lineTo(plx, my); ctx.lineTo(mx, my); ctx.stroke();
    ctx.setLineDash([]);

    // Activity & Service POI Markers
    for (const a of SIDE_ACTIVITIES) {
      const [ax, ay] = toPx(a.x, a.z);
      ctx.fillStyle = a.kind === 'Race' ? '#22d3ee' : a.kind === 'Stunt' ? '#f97316' : a.kind === 'Hideout' ? '#ef4444' : '#34d399';
      ctx.beginPath(); ctx.arc(ax, ay, 3.6, 0, Math.PI * 2); ctx.fill();
    }
    for (const p of SERVICE_POIS) {
      const [px, py] = toPx(p.x, p.z);
      ctx.fillStyle = p.color;
      ctx.fillRect(px - 4.5, py - 4.5, 9, 9);
      ctx.strokeStyle = '#090d16'; ctx.lineWidth = 1.4; ctx.strokeRect(px - 4.5, py - 4.5, 9, 9);
    }

    // Active Mission Star & Player Position Indicator
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(mx, my, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#090d16'; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(plx, ply, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff5e78'; ctx.lineWidth = 2.4; ctx.stroke();

    // Crisp District Labels
    ctx.font = '800 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    for (const d of DISTRICTS) {
      const [lx, ly] = toPx((d.minX + d.maxX) * 0.5, (d.minZ + d.maxZ) * 0.5);
      ctx.fillStyle = 'rgba(7, 11, 20, 0.72)';
      const tw = ctx.measureText(d.name.toUpperCase()).width + 12;
      ctx.fillRect(lx - tw * 0.5, ly - 9, tw, 17);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(d.name.toUpperCase(), lx, ly + 3);
    }
  }

  function renderTitle(state) {
    const slots = state.saveSystem.listSlots();
    const slotCards = slots.map((s, idx) => `
      <div class="glass-card slot-card" data-load-slot="${idx}">
        <div class="slot-top"><span class="slot-id">SAVE SLOT ${idx + 1}${idx === 0 ? ' · ACTIVE' : ''}</span><span class="slot-cash">${s ? `$${s.cash.toLocaleString()}` : 'EMPTY'}</span></div>
        <div class="slot-title">${s ? `Mission ${s.missionIndex + 1}/10 · ${s.missionTitle}` : 'Start New Criminal Empire'}</div>
        <div class="slot-meta"><span>${s ? `${s.district} · ${s.completion}%` : 'Coral Promenade'}</span><span>${s ? s.savedAt : 'Click to begin'}</span></div>
      </div>
    `).join('');

    menuRoot.innerHTML = `
      <div class="title-screen">
        <div class="title-main">
          <div class="title-left">
            <div class="emblem-wrap">${TITLE_EMBLEM_SVG}</div>
            <p class="title-tagline">Rule seven sun-soaked coastal districts from Coral Promenade to Starlight Isle. Steal 18 sculpted vehicles, outrun 5-star SBPD air &amp; tactical dispatch, and claim Solaria Bay.</p>
            <div class="title-nav">
              <button class="title-btn primary" data-act="continue"><span>CONTINUE CAMPAIGN</span><span>▶</span></button>
              <button class="title-btn" data-act="new_game"><span>NEW GAME</span><span>→</span></button>
              <button class="title-btn" data-act="open_atlas_save"><span>LOAD GAME</span><span>3 SLOTS</span></button>
              <button class="title-btn" data-act="open_atlas_settings"><span>SETTINGS</span><span>⚙</span></button>
              <button class="title-btn" data-act="open_atlas_map"><span>CONTROLS &amp; ATLAS</span><span>M</span></button>
            </div>
          </div>
          <div class="title-right">
            <div class="slots-header">PERSISTENT CAREER SLOTS</div>
            ${slotCards}
          </div>
        </div>
        <div class="controls-strip">
          <span class="ctrl-item"><kbd>WASD</kbd>Drive / Walk</span>
          <span class="ctrl-item"><kbd>SHIFT</kbd>Nitro / Sprint</span>
          <span class="ctrl-item"><kbd>SPACE</kbd>Drift / Jump</span>
          <span class="ctrl-item"><kbd>F</kbd>Steal / Exit Car</span>
          <span class="ctrl-item"><kbd>LMB</kbd>Shoot / Aim</span>
          <span class="ctrl-item"><kbd>1-8</kbd>8 Weapons</span>
          <span class="ctrl-item"><kbd>Q/E/C</kbd>Crew Favours</span>
          <span class="ctrl-item"><kbd>R</kbd>4 FM Radio</span>
          <span class="ctrl-item"><kbd>M / ESC</kbd>Tactical Atlas</span>
          <span class="ctrl-item"><kbd>F5 / F9</kbd>Quick Save/Load</span>
        </div>
      </div>
    `;

    menuRoot.querySelector('[data-act="continue"]').onclick = () => actions.continueGame();
    menuRoot.querySelector('[data-act="new_game"]').onclick = () => actions.newGame();
    menuRoot.querySelector('[data-act="open_atlas_save"]').onclick = () => { activeTab = 'SAVE'; actions.openAtlas(); };
    menuRoot.querySelector('[data-act="open_atlas_settings"]').onclick = () => { activeTab = 'SETTINGS'; actions.openAtlas(); };
    menuRoot.querySelector('[data-act="open_atlas_map"]').onclick = () => { activeTab = 'MAP'; actions.openAtlas(); };
    menuRoot.querySelectorAll('[data-load-slot]').forEach((el) => {
      el.onclick = () => actions.loadSlot(Number(el.dataset.loadSlot));
    });
  }

  function renderAtlas(state) {
    const comp = computeCompletionPercent(state.missions, state.activities);
    const rank = getRespectRank(state.player.respect);
    const slots = state.saveSystem.listSlots();

    const tabsHtml = ATLAS_TABS.map((t) => `<button class="atlas-tab ${activeTab === t ? 'active' : ''}" data-tab="${t}">${t}</button>`).join('');

    let bodyHtml = '';
    if (activeTab === 'MAP') {
      const quickUpgrades = GARAGE_UPGRADES.slice(0, 4).map((u) => `
        <button class="upgrade-btn" data-buy-upg="${u.id}"><span>${u.label}</span><span class="upgrade-cost">$${u.cost.toLocaleString()}</span></button>
      `).join('');
      const crewChips = CREW_ROSTER.map((c) => {
        const cd = Math.ceil(state.crew.cooldowns[c.id] || 0);
        return `<button class="upgrade-btn" data-trigger-fav="${c.id}"><span>[${c.key}] ${c.name} (${c.member.split(' ')[0]})</span><span class="upgrade-cost">${cd <= 0 ? 'READY' : `${cd}s`}</span></button>`;
      }).join('');
      const slotRows = slots.map((s, idx) => `
        <div class="list-row" style="margin-top:4px;padding:5px 8px;">
          <span><strong>Slot ${idx + 1}:</strong> ${s ? `M${s.missionIndex + 1} · $${s.cash.toLocaleString()} · ${s.district}` : 'Empty'}</span>
          <span>
            <button class="atlas-tab" style="padding:2px 7px;border:1px solid var(--border-soft)" data-save-slot="${idx}">SAVE</button>
            <button class="atlas-tab" style="padding:2px 7px;border:1px solid var(--border-soft)" data-load-slot="${idx}">LOAD</button>
          </span>
        </div>
      `).join('');

      bodyHtml = `
        <div class="glass-card atlas-map-panel">
          <div class="atlas-map-head">
            <span class="atlas-section-title">SOLARIA BAY · 7-DISTRICT + STARLIGHT ISLE TACTICAL ATLAS</span>
            <div class="atlas-legend">
              <span><i class="leg-dot" style="background:#fbbf24"></i>Mission / Garage</span>
              <span><i class="leg-dot" style="background:#22d3ee"></i>Street Race</span>
              <span><i class="leg-dot" style="background:#f97316"></i>Stunt Ramp</span>
              <span><i class="leg-dot" style="background:#ef4444"></i>Hideout / Bridge</span>
              <span><i class="leg-dot" style="background:#34d399"></i>Safehouse</span>
            </div>
          </div>
          <div class="atlas-map-canvas-wrap"><canvas id="atlas-map-canvas" width="740" height="470"></canvas></div>
        </div>
        <div class="atlas-side">
          <div class="glass-card atlas-card">
            <div class="atlas-map-head"><span class="atlas-section-title">SOLARIA CUSTOMS &amp; ARMORY</span><span class="upgrade-cost">$${Math.round(state.player.cash).toLocaleString()}</span></div>
            <div class="mini-grid">${quickUpgrades}</div>
          </div>
          <div class="glass-card atlas-card">
            <div class="atlas-map-head"><span class="atlas-section-title">CREW FAVOURS · RANK ${rank.rank} (${rank.title})</span><span style="color:#fbbf24;font-size:11px;font-weight:800">${comp}% COMPLETE</span></div>
            <div style="display:flex;flex-direction:column;gap:5px;margin-top:6px;">${crewChips}</div>
          </div>
          <div class="glass-card atlas-card">
            <div class="atlas-map-head"><span class="atlas-section-title">CAREER SAVE SLOTS (LOCALSTORAGE)</span><span style="color:#94a3b8;font-size:10px">${notice || 'F5 Quick Save'}</span></div>
            ${slotRows}
          </div>
        </div>
      `;
    } else if (activeTab === 'MISSIONS') {
      const mRows = STORY_MISSIONS.map((m, i) => {
        const done = state.missions.completedIds.includes(m.id);
        const live = i === state.missions.missionIndex;
        const badge = done ? '<span class="badge-done">COMPLETED</span>' : live ? '<span class="badge-live">ACTIVE</span>' : `<button class="atlas-tab" data-start-m="${i}">START</button>`;
        return `<div class="list-row"><span><strong>${i + 1}. ${m.title}</strong> (${m.act} · $${m.rewardCash.toLocaleString()})</span>${badge}</div>`;
      }).join('');
      const aRows = SIDE_ACTIVITIES.slice(0, 12).map((a) => {
        const done = state.activities.completedIds.includes(a.id);
        return `<div class="list-row"><span><strong>[${a.kind}]</strong> ${a.name} · ${a.district}</span><span class="${done ? 'badge-done' : 'badge-lock'}">${done ? 'DONE' : `$${(a.payout || a.price).toLocaleString()}`}</span></div>`;
      }).join('');
      bodyHtml = `
        <div class="glass-card atlas-full-panel">
          <div><div class="atlas-section-title">STORY CAMPAIGN (10 MISSIONS)</div>${mRows}</div>
          <div><div class="atlas-section-title">OPEN-WORLD ACTIVITIES (24 TOTAL)</div>${aRows}</div>
        </div>`;
    } else if (activeTab === 'GARAGE') {
      const upgs = GARAGE_UPGRADES.map((u) => {
        const t = state.activities.upgradeTiers[u.id] || 0;
        const c = u.kind === 'tier' ? u.cost * (t + 1) : u.cost;
        return `<button class="upgrade-btn" data-buy-upg="${u.id}"><span>${u.label}${u.kind === 'tier' ? ` (Tier ${t}/${u.max})` : ''}</span><span class="upgrade-cost">$${c.toLocaleString()}</span></button>`;
      }).join('');
      const props = SIDE_ACTIVITIES.filter((a) => a.kind === 'Property').map((p) => {
        const owned = state.activities.ownedProperties.includes(p.id);
        return `<button class="upgrade-btn" data-buy-prop="${p.id}"><span>${p.name} (+$${p.income}/cycle)</span><span class="upgrade-cost">${owned ? 'OWNED' : `$${p.price.toLocaleString()}`}</span></button>`;
      }).join('');
      bodyHtml = `
        <div class="glass-card atlas-full-panel">
          <div><div class="atlas-section-title">SOLARIA CUSTOMS GARAGE &amp; BRISA ARMORY</div><div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">${upgs}</div></div>
          <div><div class="atlas-section-title">SAFEHOUSES &amp; PROPERTIES (${state.activities.ownedProperties.length}/4)</div><div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">${props}</div><p style="color:#fbbf24;font-size:12px;margin-top:12px">${notice}</p></div>
        </div>`;
    } else if (activeTab === 'CREW') {
      const cards = CREW_ROSTER.map((c) => `
        <div class="list-row" style="flex-direction:column;align-items:flex-start;gap:4px">
          <div style="width:100%;display:flex;justify-content:space-between"><strong>${c.member} · ${c.role}</strong><button class="upgrade-btn" data-trigger-fav="${c.id}">[${c.key}] ${c.name}</button></div>
          <span style="color:#94a3b8;font-size:11.5px">${c.desc}</span>
        </div>`).join('');
      bodyHtml = `
        <div class="glass-card atlas-full-panel">
          <div><div class="atlas-section-title">SYNDICATE CREW FAVOURS</div>${cards}</div>
          <div><div class="atlas-section-title">RESPECT PROGRESSION</div>
            <div class="list-row"><span>Current Rank</span><span class="badge-live">RANK ${rank.rank} · ${rank.title}</span></div>
            <div class="list-row"><span>Total Respect</span><span>${state.player.respect} RP</span></div>
            <div class="list-row"><span>Global Completion</span><span>${comp}%</span></div>
            <div class="list-row"><span>Sunset Relics Found</span><span>${state.activities.relicsFound} / 12</span></div>
          </div>
        </div>`;
    } else if (activeTab === 'STATS') {
      const s = state.player.stats;
      bodyHtml = `
        <div class="glass-card atlas-full-panel">
          <div><div class="atlas-section-title">CRIMINAL RECORD</div>
            <div class="list-row"><span>Missions Completed</span><span>${state.missions.completedIds.length} / 10</span></div>
            <div class="list-row"><span>Side Activities Completed</span><span>${state.activities.completedIds.length} / 24</span></div>
            <div class="list-row"><span>Vehicles Hijacked</span><span>${s.carsHijacked}</span></div>
            <div class="list-row"><span>Pursuits Evaded</span><span>${s.copsEvaded}</span></div>
            <div class="list-row"><span>Hostiles Neutralized</span><span>${s.eliminations}</span></div>
          </div>
          <div><div class="atlas-section-title">EMPIRE METRICS</div>
            <div class="list-row"><span>Cash On Hand</span><span class="badge-done">$${Math.round(state.player.cash).toLocaleString()}</span></div>
            <div class="list-row"><span>Lifetime Earnings</span><span>$${Math.round(s.totalEarnings).toLocaleString()}</span></div>
            <div class="list-row"><span>Distance Traveled</span><span>${s.distanceKm.toFixed(1)} km</span></div>
            <div class="list-row"><span>Stunt Jumps Cleared</span><span>${s.stuntJumps} / 6</span></div>
            <div class="list-row"><span>Owned Safehouses</span><span>${state.activities.ownedProperties.length} / 4</span></div>
          </div>
        </div>`;
    } else if (activeTab === 'SETTINGS') {
      bodyHtml = `
        <div class="glass-card atlas-full-panel">
          <div><div class="atlas-section-title">ATMOSPHERE &amp; AUDIO</div>
            <div class="list-row"><span>Golden Hour Sunset (17:40)</span><button class="upgrade-btn" data-tod="17.65">APPLY</button></div>
            <div class="list-row"><span>Neon Twilight Dusk (19:45)</span><button class="upgrade-btn" data-tod="19.75">APPLY</button></div>
            <div class="list-row"><span>Coastal Noon (12:30)</span><button class="upgrade-btn" data-tod="12.5">APPLY</button></div>
            <div class="list-row"><span>Audio / Radio Mute</span><button class="upgrade-btn" data-toggle-mute="1">${state.audio.state.muted ? 'UNMUTE' : 'MUTE'}</button></div>
          </div>
          <div><div class="atlas-section-title">SESSION ACTIONS</div>
            <div class="list-row"><span>Return to Title Panorama</span><button class="upgrade-btn" data-to-title="1">TITLE SCREEN</button></div>
          </div>
        </div>`;
    } else {
      const slotPanels = slots.map((s, idx) => `
        <div class="list-row">
          <div><strong>Slot ${idx + 1}</strong> · ${s ? `Mission ${s.missionIndex + 1}/10 (${s.missionTitle}) · $${s.cash.toLocaleString()} · ${s.district}` : 'Empty Slot'}</div>
          <div><button class="upgrade-btn" style="display:inline-flex;margin-right:6px" data-save-slot="${idx}">SAVE</button><button class="upgrade-btn" style="display:inline-flex" data-load-slot="${idx}">LOAD</button></div>
        </div>`).join('');
      bodyHtml = `<div class="glass-card atlas-full-panel" style="grid-template-columns:1fr"><div class="atlas-section-title">PERSISTENT 3-SLOT LOCALSTORAGE SAVES</div>${slotPanels}<p style="color:#fbbf24;font-size:12px">${notice}</p></div>`;
    }

    menuRoot.innerHTML = `
      <div class="atlas-overlay">
        <div class="glass-card atlas-topbar">
          <div class="atlas-brand">SOLARIA BAY · TACTICAL ATLAS</div>
          <div class="atlas-tabs">${tabsHtml}</div>
          <button class="atlas-resume" data-resume="1">RESUME [ESC]</button>
        </div>
        <div class="kpi-strip">
          <div class="glass-card kpi-box"><div class="kpi-num">10</div><div class="kpi-lbl">MISSIONS</div></div>
          <div class="glass-card kpi-box"><div class="kpi-num">24</div><div class="kpi-lbl">ACTIVITIES</div></div>
          <div class="glass-card kpi-box"><div class="kpi-num">${Object.keys(VEHICLES).length}</div><div class="kpi-lbl">VEHICLES</div></div>
          <div class="glass-card kpi-box"><div class="kpi-num">${WEAPONS.length}</div><div class="kpi-lbl">WEAPONS</div></div>
          <div class="glass-card kpi-box"><div class="kpi-num">${DISTRICTS.length}</div><div class="kpi-lbl">DISTRICTS</div></div>
          <div class="glass-card kpi-box"><div class="kpi-num">4</div><div class="kpi-lbl">FM RADIO</div></div>
          <div class="glass-card kpi-box"><div class="kpi-num" style="color:#34d399">${comp}%</div><div class="kpi-lbl">COMPLETION</div></div>
        </div>
        <div class="atlas-body">${bodyHtml}</div>
      </div>
    `;

    const mapCanvas = menuRoot.querySelector('#atlas-map-canvas');
    if (mapCanvas) drawAtlasVectorMap(mapCanvas, state);

    menuRoot.querySelector('[data-resume]')?.addEventListener('click', () => actions.resumeGame());
    menuRoot.querySelectorAll('[data-tab]').forEach((b) => {
      b.onclick = () => { activeTab = b.dataset.tab; renderAtlas(state); };
    });
    menuRoot.querySelectorAll('[data-buy-upg]').forEach((b) => {
      b.onclick = () => {
        const res = applyGarageOrShopPurchase(b.dataset.buyUpg, state.activities, state.player, state.wanted, state.vehicles);
        notice = res.msg;
        renderAtlas(state);
      };
    });
    menuRoot.querySelectorAll('[data-buy-prop]').forEach((b) => {
      b.onclick = () => {
        const res = buyProperty(b.dataset.buyProp, state.activities, state.player);
        notice = res.msg;
        renderAtlas(state);
      };
    });
    menuRoot.querySelectorAll('[data-trigger-fav]').forEach((b) => {
      b.onclick = () => {
        triggerCrewFavour(b.dataset.triggerFav, state.crew, state.player, state.wanted, state.vehicles, state.missions, state.effects);
        notice = state.crew.lastNotice || 'Favour cooling down';
        renderAtlas(state);
      };
    });
    menuRoot.querySelectorAll('[data-start-m]').forEach((b) => {
      b.onclick = () => {
        startMission(state.missions, Number(b.dataset.startM), 0, state.scene, state.vehicles, state.pedestrians, state.rng);
        actions.resumeGame();
      };
    });
    menuRoot.querySelectorAll('[data-save-slot]').forEach((b) => {
      b.onclick = () => {
        actions.saveSlot(Number(b.dataset.saveSlot));
        notice = `Saved to Slot ${Number(b.dataset.saveSlot) + 1}!`;
        renderAtlas(state);
      };
    });
    menuRoot.querySelectorAll('[data-load-slot]').forEach((b) => {
      b.onclick = () => actions.loadSlot(Number(b.dataset.loadSlot));
    });
    menuRoot.querySelectorAll('[data-tod]').forEach((b) => {
      b.onclick = () => { actions.setTimeOfDay(Number(b.dataset.tod)); renderAtlas(state); };
    });
    menuRoot.querySelector('[data-toggle-mute]')?.addEventListener('click', () => {
      state.audio.setMuted(!state.audio.state.muted);
      renderAtlas(state);
    });
    menuRoot.querySelector('[data-to-title]')?.addEventListener('click', () => actions.showTitle());
  }

  return {
    setActiveTab(t) { activeTab = t; },
    renderTitle,
    renderAtlas,
  };
}
