// GTA-6-style HUD, GPS Minimap Radar, Wanted Stars display, Digital Speedometer,
// Story Mission Objective & Comms Dialogue overlay, Title Screen and Solaria OS
// Map & Save Tablet Menu for Solaria Bay: Sun & Syndicate.

import { WORLD_CONFIG } from './config.js';
import { CAMERA_MODES } from './camera-3d.js';
import { getDistrictAt } from './city-map.js';
import { STORY_MISSIONS, getMissionWaypoint } from './missions.js';
import { getEquippedWeapon } from './player.js';
import { getWantedTier } from './police-wanted.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_MAP_SAVE = 'map_save';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_BUSTED = 'busted';

function drawPanel(ctx, x, y, w, h, bg = 'rgba(10, 14, 26, 0.88)', border = '#25f4ee', radius = 10) {
  ctx.save();
  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function fillFittedText(ctx, text, x, y, maxWidth) {
  ctx.fillText(text, x, y, maxWidth);
}

function drawCityGridAndCoast(ctx, cityMap, toMap, mapX, mapY, mapW, mapH, scale, pad = 0) {
  const bStart = toMap(WORLD_CONFIG.beachStartX, 0).x;
  const oStart = toMap(WORLD_CONFIG.oceanStartX, 0).x;
  ctx.fillStyle = 'rgba(234, 182, 118, 0.72)';
  ctx.fillRect(bStart, mapY + pad, oStart - bStart, mapH - pad * 2);
  ctx.fillStyle = 'rgba(2, 132, 199, 0.84)';
  ctx.fillRect(oStart, mapY + pad, mapX + mapW - oStart - pad + 180, mapH - pad * 2);

  ctx.fillStyle = '#334155';
  for (let i = 0; i < cityMap.roadsX.length; i += 1) {
    const p = toMap(cityMap.roadsX[i], 0);
    ctx.fillRect(p.x - 4.5, mapY + pad * 2, 9, mapH - pad * 4);
  }
  for (let j = 0; j < cityMap.roadsY.length; j += 1) {
    const p = toMap(0, cityMap.roadsY[j]);
    ctx.fillRect(mapX + pad * 2, p.y - 4.5, bStart - mapX - pad * 2, 9);
  }

  ctx.fillStyle = 'rgba(148, 163, 184, 0.44)';
  for (let i = 0; i < cityMap.buildings.length; i += 1) {
    const b = cityMap.buildings[i];
    const bp = toMap(b.x - b.width * 0.5, b.y - b.depth * 0.5);
    ctx.fillRect(bp.x, bp.y, b.width * scale, b.depth * scale);
  }
}

export function renderMinimapRadar(ctx, worldState) {
  const { camera, player, cityMap, vehicles, pedestrians, missions, wanted, simTime } = worldState;
  const h = camera.viewportHeight;

  const mapX = 20;
  const mapY = h - 222;
  const mapW = 244;
  const mapH = 176;
  const scale = 0.21;

  const district = getDistrictAt(player.x, player.y);
  const pulseRed = Math.sin(simTime * 11) > 0;
  const borderColor = wanted.stars > 0
    ? (pulseRed ? '#ff1744' : '#2979ff')
    : district.themeColor;

  drawPanel(ctx, mapX, mapY - 26, mapW, mapH + 50, 'rgba(8, 12, 24, 0.92)', borderColor, 12);

  // District title header above radar
  ctx.save();
  ctx.font = '800 11px system-ui, sans-serif';
  ctx.fillStyle = district.themeColor;
  ctx.fillText(district.name.toUpperCase(), mapX + 12, mapY - 10);
  const distToWaypoint = getMissionWaypoint(missions);
  if (distToWaypoint) {
    const meters = Math.round(Math.hypot(distToWaypoint.x - player.x, distToWaypoint.y - player.y));
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'right';
    ctx.fillText(`GPS ${meters}m`, mapX + mapW - 12, mapY - 10);
  }
  ctx.restore();

  // Clip inside radar viewport
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(mapX + 6, mapY + 2, mapW - 12, mapH - 6, 8);
  ctx.clip();

  const cx = mapX + mapW * 0.5;
  const cy = mapY + mapH * 0.5;

  ctx.fillStyle = '#111726';
  ctx.fillRect(mapX, mapY, mapW, mapH);

  const toMini = (wx, wy) => ({
    x: cx + (wx - player.x) * scale,
    y: cy + (wy - player.y) * scale,
  });

  drawCityGridAndCoast(ctx, cityMap, toMini, mapX, mapY, mapW, mapH, scale, 0);

  // GPS route line from player to active mission waypoint
  const waypoint = getMissionWaypoint(missions);
  if (waypoint) {
    const wp = toMini(waypoint.x, waypoint.y);
    const corner = toMini(waypoint.x, player.y);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(corner.x, corner.y);
    ctx.lineTo(wp.x, wp.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const clampedX = Math.max(mapX + 16, Math.min(mapX + mapW - 16, wp.x));
    const clampedY = Math.max(mapY + 14, Math.min(mapY + mapH - 14, wp.y));
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(clampedX, clampedY, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Landmarks (Safehouse, Customs, Armory)
  for (let i = 0; i < cityMap.landmarks.length; i += 1) {
    const lm = cityMap.landmarks[i];
    const lp = toMini(lm.x, lm.y);
    ctx.fillStyle = lm.color;
    ctx.fillRect(lp.x - 3.5, lp.y - 3.5, 7, 7);
  }

  // Vehicles on radar (traffic gray, police flashing red/blue)
  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    if (v === player.vehicle || v.destroyed) continue;
    const vp = toMini(v.x, v.y);
    if (v.driverType === 'police' || v.isPolice) {
      ctx.fillStyle = pulseRed ? '#ff1744' : '#2979ff';
      ctx.beginPath();
      ctx.arc(vp.x, vp.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(vp.x - 2, vp.y - 2, 4, 4);
    }
  }

  // Hostile Syndicate guards on radar
  for (let i = 0; i < pedestrians.length; i += 1) {
    const ped = pedestrians[i];
    if (!ped.alive || (ped.role !== 'syndicate' && ped.role !== 'police')) continue;
    const pp = toMini(ped.x, ped.y);
    ctx.fillStyle = ped.role === 'syndicate' ? '#f43f5e' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player directional arrow at radar center
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(player.angle);
  ctx.fillStyle = '#25f4ee';
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, -5.5);
  ctx.lineTo(-3.5, 0);
  ctx.lineTo(-6, 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore(); // end radar clip

  // Health, Armor & Stamina/Nitro bars along bottom of radar frame
  const barY = mapY + mapH + 3;
  const barW = (mapW - 24) / 3;
  const hpRatio = Math.max(0, player.health / player.maxHealth);
  const armorRatio = Math.max(0, player.armor / player.maxArmor);
  const thirdRatio = player.inVehicle && player.vehicle
    ? Math.max(0, player.vehicle.nitroFuel / 100)
    : Math.max(0, player.stamina / 100);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(mapX + 8, barY, barW, 9);
  ctx.fillStyle = hpRatio > 0.35 ? '#10b981' : '#f43f5e';
  ctx.fillRect(mapX + 8, barY, barW * hpRatio, 9);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(mapX + 12 + barW, barY, barW, 9);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(mapX + 12 + barW, barY, barW * armorRatio, 9);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(mapX + 16 + barW * 2, barY, barW, 9);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(mapX + 16 + barW * 2, barY, barW * thirdRatio, 9);
}

export function renderPlayerStatusHud(ctx, worldState) {
  const { camera, player, wanted, audio, simTime } = worldState;
  const w = camera.viewportWidth;

  const panelW = 272;
  const rightX = w - panelW - 20;
  drawPanel(ctx, rightX, 16, panelW, 148, 'rgba(10, 14, 26, 0.9)', wanted.stars > 0 ? '#ff3b77' : '#25f4ee', 12);

  // Row 1: 5-Star Wanted Level display (compact 22px spacing so right label never overlaps)
  ctx.save();
  const flash = Math.sin(simTime * 12) > 0;
  for (let s = 1; s <= 5; s += 1) {
    const active = s <= wanted.stars;
    ctx.font = '900 20px system-ui, sans-serif';
    const sx = rightX + 14 + (s - 1) * 23;
    if (active) {
      ctx.fillStyle = wanted.evading
        ? (flash ? '#fde047' : 'rgba(253, 224, 71, 0.38)')
        : (flash ? '#ff2a5f' : '#38bdf8');
    } else {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.32)';
    }
    ctx.fillText('★', sx, 43);
  }

  const tier = getWantedTier(wanted.stars);
  const shortStatus = wanted.stars > 0 ? `${wanted.stars}★ ${tier.label.split(' ')[0]}` : 'CLEAR';
  ctx.font = '800 11px system-ui, sans-serif';
  ctx.fillStyle = wanted.stars > 0 ? '#fda4af' : '#94a3b8';
  ctx.textAlign = 'right';
  fillFittedText(ctx, shortStatus, rightX + panelW - 14, 41, 118);

  // Row 2: Cash & Respect
  ctx.textAlign = 'left';
  ctx.font = '900 23px system-ui, sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.fillText(`$${player.cash.toLocaleString()}`, rightX + 14, 76);

  ctx.font = '800 12px system-ui, sans-serif';
  ctx.fillStyle = '#facc15';
  ctx.textAlign = 'right';
  ctx.fillText(`RESPECT ${player.respect}`, rightX + panelW - 14, 74);

  // Row 3: Equipped Weapon & Ammo (clear gap between weapon name and ammo count)
  const weapon = getEquippedWeapon(player);
  const ammo = weapon.infinite ? 'INF' : `${player.ammo[weapon.id] ?? 0} RDS`;
  ctx.textAlign = 'left';
  ctx.font = '800 12px system-ui, sans-serif';
  ctx.fillStyle = weapon.color;
  fillFittedText(ctx, `WPN: ${weapon.shortName}`, rightX + 14, 102, 136);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`${ammo} [Q/E]`, rightX + panelW - 14, 102);

  // Row 4 & 5: Radio Station & Camera Mode
  const station = audio.getActiveRadioStation();
  const camMode = CAMERA_MODES[camera.modeIndex] || CAMERA_MODES[0];
  ctx.textAlign = 'left';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillStyle = '#67e8f9';
  fillFittedText(ctx, `♪ ${station.name}`, rightX + 14, 126, panelW - 28);

  ctx.fillStyle = '#94a3b8';
  fillFittedText(ctx, `CAM [V]: ${camMode.name} • [M] Map`, rightX + 14, 146, panelW - 28);
  ctx.restore();
}

export function renderMissionAndDialogueHud(ctx, worldState) {
  const { camera, player, missions, wanted } = worldState;
  const w = camera.viewportWidth;
  const h = camera.viewportHeight;

  // Top-Left Mission Card (width 368px, x: 20..388)
  const wp = getMissionWaypoint(missions);
  if (wp) {
    const cardW = 368;
    drawPanel(ctx, 20, 16, cardW, 82, 'rgba(10, 14, 26, 0.9)', '#facc15', 12);
    ctx.save();
    ctx.font = '900 12px system-ui, sans-serif';
    ctx.fillStyle = '#facc15';
    fillFittedText(
      ctx,
      `${wp.act} — ${wp.title.toUpperCase()}  ($${wp.rewardCash.toLocaleString()})`,
      34,
      38,
      cardW - 28,
    );

    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillStyle = '#f8fafc';
    fillFittedText(ctx, wp.objective, 34, 60, cardW - 28);

    const dist = Math.round(Math.hypot(wp.x - player.x, wp.y - player.y));
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillStyle = '#67e8f9';
    fillFittedText(ctx, `TARGET DISTANCE: ${dist}m • Follow yellow GPS route`, 34, 81, cardW - 28);
    ctx.restore();
  }

  // Top-Center Police Dispatch Alert Bar (x: 406..854, width 448px — never touches left or right panels!)
  if (wanted.stars > 0 || wanted.dispatchBannerTimer > 0) {
    const tier = getWantedTier(wanted.stars);
    const msg = wanted.stars > 0
      ? `SBPD ALERT [${wanted.stars}★]: ${tier.label}${wanted.helicopter.active ? ' • AIR-1 CHOPPER' : ''}`
      : wanted.dispatchMessage;
    const barW = Math.min(448, Math.max(260, w - 720));
    const barX = 406;
    drawPanel(ctx, barX, 16, barW, 36, 'rgba(28, 10, 26, 0.92)', '#ff2a5f', 8);
    ctx.save();
    ctx.font = '800 11.5px system-ui, sans-serif';
    ctx.fillStyle = '#fecdd3';
    ctx.textAlign = 'center';
    fillFittedText(ctx, msg, barX + barW * 0.5, 38, barW - 20);
    ctx.restore();
  }

  // Mission Passed / Act Started Banner (positioned cleanly below the top alert bar)
  if (missions.bannerTimer > 0 && missions.bannerTitle) {
    const bw = 410;
    const bx = 425;
    const by = (wanted.stars > 0 || wanted.dispatchBannerTimer > 0) ? 58 : 16;
    drawPanel(ctx, bx, by, bw, 38, 'rgba(11, 18, 34, 0.92)', '#34d399', 10);
    ctx.save();
    ctx.font = '900 15px system-ui, sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.textAlign = 'center';
    fillFittedText(ctx, missions.bannerTitle, bx + bw * 0.5, by + 24, bw - 24);
    ctx.restore();
  }

  // Character Comms Dialogue Box at bottom-center
  if (missions.dialogueTimer > 0 && missions.dialogueText) {
    const dw = 510;
    const dx = (w - dw) * 0.5;
    const dy = h - 104;
    drawPanel(ctx, dx, dy, dw, 76, 'rgba(10, 14, 28, 0.92)', '#ff5e8e', 12);

    ctx.save();
    ctx.fillStyle = '#ff2a78';
    ctx.beginPath();
    ctx.roundRect(dx + 12, dy + 13, 50, 50, 8);
    ctx.fill();
    ctx.font = '900 19px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(missions.dialogueSpeaker.slice(0, 2).toUpperCase(), dx + 37, dy + 45);

    ctx.textAlign = 'left';
    ctx.font = '800 11.5px system-ui, sans-serif';
    ctx.fillStyle = '#ff7aa2';
    ctx.fillText(`${missions.dialogueSpeaker.toUpperCase()} • ENCRYPTED COMMS`, dx + 74, dy + 27);

    ctx.font = '600 12.5px system-ui, sans-serif';
    ctx.fillStyle = '#f1f5f9';
    const text = missions.dialogueText;
    if (text.length > 62) {
      const splitIdx = text.lastIndexOf(' ', 62);
      fillFittedText(ctx, text.slice(0, splitIdx), dx + 74, dy + 46, dw - 88);
      fillFittedText(ctx, text.slice(splitIdx + 1), dx + 74, dy + 64, dw - 88);
    } else {
      fillFittedText(ctx, text, dx + 74, dy + 49, dw - 88);
    }
    ctx.restore();
  }

  // Context interaction prompt (Hijack vehicle or Landmark service)
  let promptText = null;
  if (!player.inVehicle && player.nearbyVehicle) {
    promptText = `[F / ENTER] Hijack ${player.nearbyVehicle.name} (${player.nearbyVehicle.category})`;
  } else if (player.nearbyLandmark) {
    promptText = `[N] ${player.nearbyLandmark.name}: ${player.nearbyLandmark.description}`;
  }

  if (promptText) {
    const pw = 450;
    const px = (w - pw) * 0.5;
    const py = h - 144;
    drawPanel(ctx, px, py, pw, 30, 'rgba(12, 18, 34, 0.92)', '#25f4ee', 8);
    ctx.save();
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.fillStyle = '#25f4ee';
    ctx.textAlign = 'center';
    fillFittedText(ctx, promptText, w * 0.5, py + 19, pw - 20);
    ctx.restore();
  }

  // Bottom-Right Vehicle Speedometer & Telemetry Card when driving
  if (player.inVehicle && player.vehicle) {
    const v = player.vehicle;
    const vx = w - 250;
    const vy = h - 132;
    drawPanel(ctx, vx, vy, 230, 108, 'rgba(10, 14, 26, 0.9)', v.color, 12);

    ctx.save();
    const mph = Math.round(Math.abs(v.speed) * 0.48);
    ctx.font = '900 32px system-ui, sans-serif';
    ctx.fillStyle = v.nitroActive ? '#25f4ee' : '#f8fafc';
    ctx.fillText(`${mph}`, vx + 16, vy + 42);

    ctx.font = '800 12px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(v.isBoat ? 'KNOTS' : 'MPH', vx + 78, vy + 40);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fde047';
    ctx.fillText(v.drifting ? 'DRIFT!' : v.nitroActive ? 'NITRO!' : `GEAR D${Math.min(6, 1 + Math.floor(mph / 26))}`, vx + 214, vy + 38);

    ctx.textAlign = 'left';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    fillFittedText(ctx, v.name.toUpperCase(), vx + 16, vy + 68, 198);

    const hullRatio = Math.max(0, v.health / v.maxHealth);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(vx + 16, vy + 82, 198, 9);
    ctx.fillStyle = hullRatio > 0.4 ? '#22d3ee' : '#f97316';
    ctx.fillRect(vx + 16, vy + 82, 198 * hullRatio, 9);
    ctx.restore();
  }
}

export function renderTitleScreenOverlay(ctx, worldState) {
  const { camera } = worldState;
  const w = camera.viewportWidth;
  const h = camera.viewportHeight;

  ctx.save();
  ctx.fillStyle = 'rgba(9, 12, 24, 0.48)';
  ctx.fillRect(0, 0, w, h);

  const cardW = 640;
  const cardH = 385;
  const cx = (w - cardW) * 0.5;
  const cy = (h - cardH) * 0.5;
  drawPanel(ctx, cx, cy, cardW, cardH, 'rgba(11, 15, 30, 0.93)', '#ff477e', 16);

  ctx.textAlign = 'center';
  ctx.font = '900 13px system-ui, sans-serif';
  ctx.fillStyle = '#25f4ee';
  ctx.fillText('SOLARIA BAY 3D OPEN-WORLD CRIME ACTION', w * 0.5, cy + 40);

  ctx.font = '900 46px system-ui, sans-serif';
  ctx.fillStyle = '#ff5e8e';
  ctx.fillText('SOLARIA BAY', w * 0.5, cy + 92);

  ctx.font = '900 22px system-ui, sans-serif';
  ctx.fillStyle = '#fde047';
  ctx.fillText('SUN & SYNDICATE', w * 0.5, cy + 124);

  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Explore 6 coastal districts on foot and behind the wheel. Hijack exotic coupes & speedboats,', w * 0.5, cy + 162);
  ctx.fillText('outrun 5-Star SBPD & AIR-1 chopper pursuits, and conquer the 5-Act Sun & Syndicate story.', w * 0.5, cy + 184);

  drawPanel(ctx, cx + 40, cy + 204, cardW - 80, 98, 'rgba(18, 24, 44, 0.92)', '#38bdf8', 10);
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('WASD / Arrows: Walk, Drive & Steer   •   F / Enter: Hijack / Exit Vehicle   •   Space: Drift / Shoot', w * 0.5, cy + 232);
  ctx.fillText('Left Click: Aim & Fire Weapon   •   Q / E or 1-5: Switch Weapon   •   Shift: Sprint / Nitro Boost', w * 0.5, cy + 256);
  ctx.fillText('V: Switch 3D Camera   •   R: Radio Station   •   M / Tab: City Map & Save   •   F5 / F9: Quick Save/Load', w * 0.5, cy + 280);

  ctx.font = '900 18px system-ui, sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.fillText('PRESS [ENTER], [SPACE] OR CLICK TO ENTER SOLARIA BAY', w * 0.5, cy + 348);
  ctx.restore();
}

export function renderPauseAndMapMenu(ctx, worldState, saveSlots) {
  const { camera, player, cityMap, vehicles, missions, wanted } = worldState;
  const w = camera.viewportWidth;
  const h = camera.viewportHeight;

  // Dim underlying 3D view cleanly so modal stands alone with zero background HUD clash
  ctx.save();
  ctx.fillStyle = 'rgba(7, 10, 20, 0.58)';
  ctx.fillRect(0, 0, w, h);

  const padW = 960;
  const padH = 560;
  const px = (w - padW) * 0.5;
  const py = (h - padH) * 0.5;

  drawPanel(ctx, px, py, padW, padH, 'rgba(9, 13, 26, 0.96)', '#25f4ee', 16);

  // Header bar with plenty of space between title and controls
  ctx.font = '900 18px system-ui, sans-serif';
  ctx.fillStyle = '#25f4ee';
  ctx.textAlign = 'left';
  ctx.fillText('SOLARIA OS // TACTICAL CITY MAP & CAMPAIGN', px + 28, py + 38);

  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'right';
  ctx.fillText('[M / ESC] Resume Game   •   [F5] Quick Save   •   [F9] Quick Load', px + padW - 28, py + 38);

  // Left side: Full City Interactive Overview Map (470x465)
  const mapX = px + 28;
  const mapY = py + 60;
  const mapW = 472;
  const mapH = 470;
  drawPanel(ctx, mapX, mapY, mapW, mapH, '#0d1322', '#38bdf8', 12);

  const mapScale = 0.22;
  const mcx = mapX + mapW * 0.45;
  const mcy = mapY + mapH * 0.5;
  const toOverview = (wx, wy) => ({
    x: mcx + wx * mapScale,
    y: mcy + wy * mapScale,
  });

  drawCityGridAndCoast(ctx, cityMap, toOverview, mapX, mapY, mapW, mapH, mapScale, 6);

  // District watermark headers on overview map
  const districtLabels = [
    { name: 'MIRAGE STRIP', x: -120, y: -560, color: '#c084fc' },
    { name: 'PALMA VISTA', x: -500, y: -360, color: '#fb923c' },
    { name: 'SOLARIA DOWNTOWN', x: -125, y: -115, color: '#38bdf8' },
    { name: 'CORAL PROMENADE', x: 365, y: -360, color: '#ff5e8e' },
    { name: 'COBRE DOCKS', x: -380, y: 460, color: '#f59e0b' },
    { name: 'STARLIGHT MARINA', x: 540, y: 520, color: '#2dd4bf' },
  ];
  ctx.font = '800 9.5px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < districtLabels.length; i += 1) {
    const dl = districtLabels[i];
    const dp = toOverview(dl.x, dl.y);
    ctx.fillStyle = dl.color;
    ctx.fillText(dl.name, dp.x, dp.y);
  }

  // Street-grid GPS route on overview map (matching minimap street routing!)
  const wp = getMissionWaypoint(missions);
  const pp = toOverview(player.x, player.y);
  if (wp) {
    const corner = toOverview(wp.x, player.y);
    const wpt = toOverview(wp.x, wp.y);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.8;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(pp.x, pp.y);
    ctx.lineTo(corner.x, corner.y);
    ctx.lineTo(wpt.x, wpt.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(wpt.x, wpt.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Police blips
  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    if (v.driverType === 'police' && !v.destroyed) {
      const vp = toOverview(v.x, v.y);
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(vp.x, vp.y, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Landmarks with clean pill labels
  const shortLabels = {
    safehouse_coral: 'Penthouse Safehouse',
    customs_neon: 'Solaria Customs',
    ammu_downtown: 'Tactical Armory',
    marina_dock: 'Marina Speedboats',
  };
  ctx.textAlign = 'left';
  ctx.font = '700 10px system-ui, sans-serif';
  for (let i = 0; i < cityMap.landmarks.length; i += 1) {
    const lm = cityMap.landmarks[i];
    const lp = toOverview(lm.x, lm.y);
    const label = shortLabels[lm.id] || lm.name;
    const tw = ctx.measureText(label).width;
    const lx = lm.x > 400 ? lp.x - tw - 14 : lp.x + 8;
    const ly = lm.id === 'safehouse_coral' ? lp.y - 16 : lp.y - 7;

    ctx.fillStyle = 'rgba(9, 13, 26, 0.86)';
    ctx.fillRect(lx - 3, ly, tw + 6, 14);
    ctx.fillStyle = lm.color;
    ctx.beginPath();
    ctx.arc(lp.x, lp.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(label, lx, ly + 10.5);
  }

  // Player blip on overview map
  ctx.fillStyle = '#25f4ee';
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pp.x, pp.y, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Right side: Campaign Acts, Career Telemetry & Save Slots
  const rightX = px + 520;
  const colW = 412;

  // Story Campaign Progress Card
  drawPanel(ctx, rightX, mapY, colW, 182, 'rgba(16, 22, 42, 0.94)', '#facc15', 10);
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.fillStyle = '#facc15';
  ctx.fillText('STORY CAMPAIGN: SUN & SYNDICATE', rightX + 16, mapY + 26);

  for (let i = 0; i < STORY_MISSIONS.length; i += 1) {
    const m = STORY_MISSIONS[i];
    const isCurrent = i === missions.missionIndex;
    const isDone = i < missions.missionIndex || missions.completedAll;
    ctx.font = isCurrent ? '800 12px system-ui, sans-serif' : '600 12px system-ui, sans-serif';
    ctx.fillStyle = isDone ? '#34d399' : isCurrent ? '#fde047' : '#94a3b8';
    const statusTag = isDone ? '[COMPLETED]' : isCurrent ? '[ACTIVE]' : '[LOCKED]';
    fillFittedText(
      ctx,
      `${m.act}: ${m.title} — $${m.rewardCash.toLocaleString()} ${statusTag}`,
      rightX + 16,
      mapY + 54 + i * 25,
      colW - 32,
    );
  }

  // Player Career Dossier Card
  drawPanel(ctx, rightX, mapY + 196, colW, 118, 'rgba(16, 22, 42, 0.94)', '#ff5e8e', 10);
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.fillStyle = '#ff5e8e';
  ctx.fillText(`OPERATIVE: ${player.name.toUpperCase()}`, rightX + 16, mapY + 222);

  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`Net Cash: $${player.cash.toLocaleString()}   •   Respect: ${player.respect}   •   Wanted: ${wanted.stars}★`, rightX + 16, mapY + 248);
  ctx.fillText(`Vehicles Hijacked: ${player.stats.carsHijacked}   •   Missions Passed: ${player.stats.missionsCompleted}`, rightX + 16, mapY + 271);
  ctx.fillText(`Pursuits Evaded: ${player.stats.copsEvaded}   •   Hostiles Neutralized: ${player.stats.eliminations}`, rightX + 16, mapY + 294);

  // Persistent Save & Load Slots Card
  drawPanel(ctx, rightX, mapY + 328, colW, 142, 'rgba(16, 22, 42, 0.94)', '#34d399', 10);
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.fillText('PERSISTENT SAVE SLOTS ([F5] SAVE / [F9] LOAD)', rightX + 16, mapY + 354);

  for (let i = 0; i < saveSlots.length; i += 1) {
    const slot = saveSlots[i];
    ctx.font = '700 11.5px system-ui, sans-serif';
    ctx.fillStyle = slot.occupied ? '#e2e8f0' : '#64748b';
    const line = slot.occupied
      ? `Slot ${slot.slot}: ${slot.title} • $${slot.cash.toLocaleString()} (${slot.savedAt})`
      : `Slot ${slot.slot}: ${slot.title}`;
    fillFittedText(ctx, line, rightX + 16, mapY + 382 + i * 26, colW - 32);
  }
  ctx.restore();
}

export function renderBustedOrWastedOverlay(ctx, worldState, screen) {
  const { camera } = worldState;
  const w = camera.viewportWidth;
  const h = camera.viewportHeight;

  ctx.save();
  ctx.fillStyle = screen === SCREEN_BUSTED ? 'rgba(15, 23, 58, 0.65)' : 'rgba(58, 12, 24, 0.65)';
  ctx.fillRect(0, 0, w, h);

  const label = screen === SCREEN_BUSTED ? 'BUSTED' : 'WASTED';
  const sub = screen === SCREEN_BUSTED
    ? 'SBPD Tactical Officers apprehended you. Bail & impound fee: $1,500.'
    : 'Emergency Medical Services patched you up at Coral Bay Hospital.';

  drawPanel(ctx, (w - 460) * 0.5, (h - 170) * 0.5, 460, 170, 'rgba(9, 13, 26, 0.94)', '#ff2a5f', 14);
  ctx.textAlign = 'center';
  ctx.font = '900 46px system-ui, sans-serif';
  ctx.fillStyle = screen === SCREEN_BUSTED ? '#38bdf8' : '#ff2a5f';
  ctx.fillText(label, w * 0.5, h * 0.5 - 15);

  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(sub, w * 0.5, h * 0.5 + 22);

  ctx.font = '800 14px system-ui, sans-serif';
  ctx.fillStyle = '#fde047';
  ctx.fillText('PRESS [ENTER] OR [SPACE] TO RESPAWN', w * 0.5, h * 0.5 + 56);
  ctx.restore();
}

export function createHudRenderer() {
  function renderHud(ctx, worldState, screen, saveSlots) {
    if (screen === SCREEN_TITLE) {
      renderTitleScreenOverlay(ctx, worldState);
      return;
    }

    if (screen === SCREEN_MAP_SAVE) {
      renderPauseAndMapMenu(ctx, worldState, saveSlots);
      return;
    }

    renderMinimapRadar(ctx, worldState);
    renderPlayerStatusHud(ctx, worldState);
    renderMissionAndDialogueHud(ctx, worldState);

    if (screen === SCREEN_WASTED || screen === SCREEN_BUSTED) {
      renderBustedOrWastedOverlay(ctx, worldState, screen);
    }
  }

  return {
    renderHud,
  };
}
