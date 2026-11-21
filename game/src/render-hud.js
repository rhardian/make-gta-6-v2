// GTA-6-style HUD, GPS Minimap Radar, Wanted Stars display, Digital Speedometer,
// Radial Weapon Wheel, Story Mission Objective & Comms Dialogue overlay, Title Screen
// and Split Translucent Solaria OS Tactical City Map, Campaign, Customs & Save Overlay.

import { WEAPON_CATALOG, WORLD_CONFIG } from './config.js';
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
    if ((worldState.player.weaponWheelTimer || 0) > 0) {
      renderRadialWeaponWheel(ctx, worldState.player, worldState.camera.viewportWidth * 0.5, 185, 96);
    }
    if (screen === SCREEN_WASTED || screen === SCREEN_BUSTED) {
      renderBustedOrWastedOverlay(ctx, worldState, screen);
    }
  }
  return { renderHud };
}

export function renderMinimapRadar(ctx, worldState) {
  const { camera, player, cityMap, vehicles, pedestrians, missions, wanted, simTime } = worldState;
  const mapX = 20;
  const mapY = camera.viewportHeight - 222;
  const mapW = 244;
  const mapH = 176;
  const scale = 0.21;

  const district = getDistrictAt(player.x, player.y);
  const pulseRed = Math.sin(simTime * 11) > 0;
  const borderColor = wanted.stars > 0 ? (pulseRed ? '#ff1744' : '#2979ff') : district.themeColor;

  drawPanel(ctx, mapX, mapY - 26, mapW, mapH + 50, 'rgba(8, 12, 24, 0.92)', borderColor, 12);

  ctx.save();
  drawText(ctx, district.name.toUpperCase(), mapX + 12, mapY - 10, '800 11px', district.themeColor);
  const waypoint = getMissionWaypoint(missions);
  if (waypoint) {
    const meters = Math.round(Math.hypot(waypoint.x - player.x, waypoint.y - player.y));
    drawText(ctx, `GPS ${meters}m`, mapX + mapW - 12, mapY - 10, '800 11px', '#facc15', 'right');
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(mapX + 6, mapY + 2, mapW - 12, mapH - 6, 8);
  ctx.clip();

  const cx = mapX + mapW * 0.5;
  const cy = mapY + mapH * 0.5;
  ctx.fillStyle = '#111726';
  ctx.fillRect(mapX, mapY, mapW, mapH);

  const toMini = (wx, wy) => ({ x: cx + (wx - player.x) * scale, y: cy + (wy - player.y) * scale });
  drawCityGridAndCoast(ctx, cityMap, toMini, mapX, mapY, mapW, mapH, scale, 0);

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
    fillDot(ctx, clampedX, clampedY, 6.5, '#facc15', '#0f172a', 1.5);
  }

  for (let i = 0; i < cityMap.landmarks.length; i += 1) {
    const lm = cityMap.landmarks[i];
    const lp = toMini(lm.x, lm.y);
    ctx.fillStyle = lm.color;
    ctx.fillRect(lp.x - 3.5, lp.y - 3.5, 7, 7);
  }

  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    if (v === player.vehicle || v.destroyed) continue;
    const vp = toMini(v.x, v.y);
    if (v.driverType === 'police' || v.isPolice) {
      fillDot(ctx, vp.x, vp.y, 4.5, pulseRed ? '#ff1744' : '#2979ff');
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(vp.x - 2, vp.y - 2, 4, 4);
    }
  }

  for (let i = 0; i < pedestrians.length; i += 1) {
    const ped = pedestrians[i];
    if (!ped.alive || (ped.role !== 'syndicate' && ped.role !== 'police' && ped.role !== 'partner')) continue;
    const pp = toMini(ped.x, ped.y);
    fillDot(ctx, pp.x, pp.y, 3.4, ped.role === 'syndicate' ? '#f43f5e' : ped.role === 'partner' ? '#f59e0b' : '#38bdf8');
  }

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
  ctx.restore();

  const barY = mapY + mapH + 3;
  const barW = (mapW - 24) / 3;
  const hpRatio = player.health / player.maxHealth;
  const thirdRatio = player.inVehicle && player.vehicle ? player.vehicle.nitroFuel / 100 : player.stamina / 100;
  drawBar(ctx, mapX + 8, barY, barW, 9, hpRatio, hpRatio > 0.35 ? '#10b981' : '#f43f5e');
  drawBar(ctx, mapX + 12 + barW, barY, barW, 9, player.armor / player.maxArmor, '#38bdf8');
  drawBar(ctx, mapX + 16 + barW * 2, barY, barW, 9, thirdRatio, '#f59e0b');
}

export function renderPlayerStatusHud(ctx, worldState) {
  const { camera, player, wanted, audio, simTime } = worldState;
  const panelW = 272;
  const rightX = camera.viewportWidth - panelW - 20;
  drawPanel(ctx, rightX, 16, panelW, 148, 'rgba(10, 14, 26, 0.9)', wanted.stars > 0 ? '#ff3b77' : '#25f4ee', 12);

  ctx.save();
  const flash = Math.sin(simTime * 12) > 0;
  for (let s = 1; s <= 5; s += 1) {
    const col = s <= wanted.stars
      ? (wanted.evading ? (flash ? '#fde047' : 'rgba(253, 224, 71, 0.38)') : (flash ? '#ff2a5f' : '#38bdf8'))
      : 'rgba(148, 163, 184, 0.32)';
    drawText(ctx, '★', rightX + 14 + (s - 1) * 23, 43, '900 20px', col);
  }

  const tier = getWantedTier(wanted.stars);
  const shortStatus = wanted.stars > 0 ? `${wanted.stars}★ ${tier.label.split(' ')[0]}` : 'CLEAR';
  drawText(ctx, shortStatus, rightX + panelW - 14, 41, '800 11px', wanted.stars > 0 ? '#fda4af' : '#94a3b8', 'right', 118);
  drawText(ctx, `$${player.cash.toLocaleString()}`, rightX + 14, 76, '900 23px', '#34d399');
  drawText(ctx, `RESPECT ${player.respect}`, rightX + panelW - 14, 74, '800 12px', '#facc15', 'right');

  const weapon = getEquippedWeapon(player);
  const ammo = weapon.infinite ? 'INF' : `${player.ammo[weapon.id] ?? 0} RDS`;
  drawText(ctx, `WPN: ${weapon.shortName}`, rightX + 14, 102, '800 12px', weapon.color, 'left', 136);
  drawText(ctx, `${ammo} [Q/E]`, rightX + panelW - 14, 102, '800 12px', '#e2e8f0', 'right');

  const station = audio.getActiveRadioStation();
  const camMode = CAMERA_MODES[camera.modeIndex] || CAMERA_MODES[0];
  drawText(ctx, `♪ ${station.name}`, rightX + 14, 126, '700 11px', '#67e8f9', 'left', panelW - 28);
  drawText(ctx, `CAM [V]: ${camMode.name} • [M] Map`, rightX + 14, 146, '700 11px', '#94a3b8', 'left', panelW - 28);
  ctx.restore();
}

export function renderMissionAndDialogueHud(ctx, worldState) {
  const { camera, player, missions, wanted } = worldState;
  const w = camera.viewportWidth;
  const h = camera.viewportHeight;

  const wp = getMissionWaypoint(missions);
  if (wp) {
    const cardW = 368;
    drawPanel(ctx, 20, 16, cardW, 82, 'rgba(10, 14, 26, 0.9)', '#facc15', 12);
    ctx.save();
    drawText(ctx, `${wp.act} — ${wp.title.toUpperCase()}  ($${wp.rewardCash.toLocaleString()})`, 34, 38, '900 12px', '#facc15', 'left', cardW - 28);
    drawText(ctx, wp.objective, 34, 60, '700 13px', '#f8fafc', 'left', cardW - 28);
    const dist = Math.round(Math.hypot(wp.x - player.x, wp.y - player.y));
    drawText(ctx, `TARGET DISTANCE: ${dist}m • Follow yellow GPS route`, 34, 81, '700 11px', '#67e8f9', 'left', cardW - 28);
    ctx.restore();
  }

  if (wanted.stars > 0 || wanted.dispatchBannerTimer > 0) {
    const tier = getWantedTier(wanted.stars);
    const msg = wanted.stars > 0
      ? `SBPD ALERT [${wanted.stars}★]: ${tier.label}${wanted.helicopter.active ? ' • AIR-1 CHOPPER' : ''}`
      : wanted.dispatchMessage;
    const barW = Math.min(448, Math.max(260, w - 720));
    const barX = 406;
    drawPanel(ctx, barX, 16, barW, 36, 'rgba(28, 10, 26, 0.92)', '#ff2a5f', 8);
    ctx.save();
    drawText(ctx, msg, barX + barW * 0.5, 38, '800 11.5px', '#fecdd3', 'center', barW - 20);
    ctx.restore();
  }

  if (missions.bannerTimer > 0 && missions.bannerTitle) {
    const bw = 410;
    const bx = 425;
    const by = (wanted.stars > 0 || wanted.dispatchBannerTimer > 0) ? 58 : 16;
    drawPanel(ctx, bx, by, bw, 38, 'rgba(11, 18, 34, 0.92)', '#34d399', 10);
    ctx.save();
    drawText(ctx, missions.bannerTitle, bx + bw * 0.5, by + 24, '900 15px', '#fde047', 'center', bw - 24);
    ctx.restore();
  }

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
    drawText(ctx, missions.dialogueSpeaker.slice(0, 2).toUpperCase(), dx + 37, dy + 45, '900 19px', '#fff', 'center');
    drawText(ctx, `${missions.dialogueSpeaker.toUpperCase()} • ENCRYPTED COMMS`, dx + 74, dy + 27, '800 11.5px', '#ff7aa2');

    const text = missions.dialogueText;
    if (text.length > 62) {
      const splitIdx = text.lastIndexOf(' ', 62);
      drawText(ctx, text.slice(0, splitIdx), dx + 74, dy + 46, '600 12.5px', '#f1f5f9', 'left', dw - 88);
      drawText(ctx, text.slice(splitIdx + 1), dx + 74, dy + 64, '600 12.5px', '#f1f5f9', 'left', dw - 88);
    } else {
      drawText(ctx, text, dx + 74, dy + 49, '600 12.5px', '#f1f5f9', 'left', dw - 88);
    }
    ctx.restore();
  }

  let promptText = null;
  if (!player.inVehicle && player.nearbyVehicle) {
    promptText = `[F / ENTER] Hijack ${player.nearbyVehicle.name} (${player.nearbyVehicle.category})`;
  } else if (!player.inVehicle && player.nearbyLandmark) {
    promptText = `[N] ${player.nearbyLandmark.name}: ${player.nearbyLandmark.description}`;
  }

  if (promptText) {
    const pw = 450;
    const px = (w - pw) * 0.5;
    const py = h - 144;
    drawPanel(ctx, px, py, pw, 30, 'rgba(12, 18, 34, 0.92)', '#25f4ee', 8);
    ctx.save();
    drawText(ctx, promptText, w * 0.5, py + 19, '800 12px', '#25f4ee', 'center', pw - 20);
    ctx.restore();
  }

  if (player.inVehicle && player.vehicle) {
    const v = player.vehicle;
    const vx = w - 254;
    const vy = h - 136;
    drawPanel(ctx, vx, vy, 234, 112, 'rgba(10, 14, 26, 0.92)', v.color, 12);

    ctx.save();
    const mph = Math.round(Math.abs(v.speed) * 0.48);
    drawText(ctx, `${mph}`, vx + 16, vy + 40, '900 32px', v.nitroActive ? '#25f4ee' : '#f8fafc');
    drawText(ctx, v.isBoat ? 'KNOTS' : 'MPH', vx + 78, vy + 38, '800 12px', '#94a3b8');
    const gearText = v.drifting ? 'DRIFT!' : v.nitroActive ? 'NITRO!' : v.isBoat ? 'TWIN-JET' : `GEAR D${Math.min(6, 1 + Math.floor(mph / 26))}`;
    drawText(ctx, gearText, vx + 218, vy + 36, '800 12px', '#fde047', 'right');

    const rpmRatio = Math.min(1, Math.abs(v.speed) / (v.maxSpeed || 280));
    for (let s = 0; s < 10; s += 1) {
      const active = (s + 1) / 10 <= rpmRatio + 0.08;
      ctx.fillStyle = !active ? '#1e293b' : s < 5 ? '#25f4ee' : s < 8 ? '#facc15' : '#ff2a78';
      ctx.fillRect(vx + 16 + s * 20.4, vy + 50, 17, 6);
    }

    drawText(ctx, v.name.toUpperCase(), vx + 16, vy + 76, '800 12.5px', '#e2e8f0', 'left', 202);
    const hullRatio = v.health / v.maxHealth;
    drawBar(ctx, vx + 16, vy + 88, 202, 8, hullRatio, hullRatio > 0.4 ? '#22d3ee' : '#f97316');
    ctx.restore();
  }
}

export function renderRadialWeaponWheel(ctx, player, cx, cy, radius = 98) {
  const count = WEAPON_CATALOG.length;
  const innerR = radius * 0.43;
  const stepAngle = (Math.PI * 2) / count;
  const startOffset = -Math.PI * 0.5 - stepAngle * 0.5;

  ctx.save();
  const halo = ctx.createRadialGradient(cx, cy, innerR * 0.5, cx, cy, radius + 16);
  halo.addColorStop(0, 'rgba(9, 13, 26, 0.92)');
  halo.addColorStop(0.85, 'rgba(9, 13, 26, 0.78)');
  halo.addColorStop(1, 'rgba(37, 244, 238, 0.0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 16, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < count; i += 1) {
    const wpn = WEAPON_CATALOG[i];
    const isSelected = i === player.weaponIndex;
    const a0 = startOffset + i * stepAngle + 0.035;
    const a1 = startOffset + (i + 1) * stepAngle - 0.035;
    const midA = (a0 + a1) * 0.5;

    ctx.beginPath();
    ctx.arc(cx, cy, isSelected ? radius + 5 : radius, a0, a1);
    ctx.arc(cx, cy, innerR, a1, a0, true);
    ctx.closePath();

    ctx.fillStyle = isSelected ? 'rgba(30, 41, 68, 0.92)' : 'rgba(11, 16, 30, 0.80)';
    ctx.strokeStyle = isSelected ? wpn.color : 'rgba(148, 163, 184, 0.42)';
    ctx.lineWidth = isSelected ? 2.4 : 1.2;
    ctx.fill();
    ctx.stroke();

    const labelR = (innerR + radius) * 0.53;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.textBaseline = 'middle';
    drawText(ctx, wpn.shortName, lx, ly - 6, isSelected ? '900 10.5px' : '700 9.5px', isSelected ? wpn.color : '#e2e8f0', 'center');
    const ammoText = wpn.infinite ? 'INF' : `${player.ammo[wpn.id] ?? 0}`;
    drawText(ctx, `[${i + 1}] ${ammoText}`, lx, ly + 7, '700 9px', isSelected ? '#fef08a' : '#94a3b8', 'center');
  }

  const eq = getEquippedWeapon(player);
  fillDot(ctx, cx, cy, innerR - 4, 'rgba(9, 13, 26, 0.95)', eq.color, 2.0);
  ctx.textBaseline = 'middle';
  drawText(ctx, 'ARSENAL', cx, cy - 11, '800 8.5px', '#94a3b8', 'center');
  drawText(ctx, eq.shortName, cx, cy + 1, '900 10.5px', eq.color, 'center');
  drawText(ctx, `DMG ${eq.damage}`, cx, cy + 12, '700 8.5px', '#fde047', 'center');
  ctx.restore();
}

export function renderPauseAndMapMenu(ctx, worldState, saveSlots) {
  const { camera, player, cityMap, vehicles, missions, wanted } = worldState;
  const w = camera.viewportWidth;

  ctx.save();
  drawPanel(ctx, 20, 12, w - 40, 38, 'rgba(9, 13, 26, 0.86)', '#25f4ee', 10);
  drawText(ctx, 'SOLARIA OS // TACTICAL CITY MAP, 5-ACT CAMPAIGN & CUSTOMS GARAGE', 36, 36, '900 15px', '#25f4ee');
  drawText(ctx, '[M / TAB] Resume Live View   •   [Q / E] Radial Wheel   •   [F5] Quick Save   •   [F9] Quick Load', w - 36, 36, '700 11.5px', '#e2e8f0', 'right');

  const leftX = 20;
  const leftW = 382;
  const mapY = 58;
  const mapH = 434;
  drawPanel(ctx, leftX, mapY, leftW, mapH, 'rgba(9, 13, 26, 0.86)', '#38bdf8', 12);
  drawText(ctx, 'SOLARIA BAY GPS TACTICAL OVERLAY (6 DISTRICTS)', leftX + 14, mapY + 21, '900 12px', '#38bdf8');

  const innerMapX = leftX + 10;
  const innerMapY = mapY + 30;
  const innerMapW = leftW - 20;
  const innerMapH = mapH - 40;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(innerMapX, innerMapY, innerMapW, innerMapH, 8);
  ctx.clip();
  ctx.fillStyle = 'rgba(13, 19, 34, 0.92)';
  ctx.fillRect(innerMapX, innerMapY, innerMapW, innerMapH);

  const mapScale = 0.185;
  const mcx = innerMapX + innerMapW * 0.45;
  const mcy = innerMapY + innerMapH * 0.5;
  const toOverview = (wx, wy) => ({ x: mcx + wx * mapScale, y: mcy + wy * mapScale });

  drawCityGridAndCoast(ctx, cityMap, toOverview, innerMapX, innerMapY, innerMapW, innerMapH, mapScale, 0);

  const districtLabels = [
    { name: 'MIRAGE STRIP', x: -110, y: -560, color: '#c084fc' },
    { name: 'PALMA VISTA', x: -500, y: -360, color: '#fb923c' },
    { name: 'SOLARIA DOWNTOWN', x: -135, y: -115, color: '#38bdf8' },
    { name: 'CORAL PROMENADE', x: 350, y: -360, color: '#ff5e8e' },
    { name: 'COBRE DOCKS', x: -380, y: 460, color: '#f59e0b' },
    { name: 'STARLIGHT MARINA', x: 520, y: 520, color: '#2dd4bf' },
  ];
  for (let i = 0; i < districtLabels.length; i += 1) {
    const dl = districtLabels[i];
    const dp = toOverview(dl.x, dl.y);
    drawText(ctx, dl.name, dp.x, dp.y, '800 9px', dl.color, 'center');
  }

  const wp = getMissionWaypoint(missions);
  const pp = toOverview(player.x, player.y);
  if (wp) {
    const corner = toOverview(wp.x, player.y);
    const wpt = toOverview(wp.x, wp.y);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(pp.x, pp.y);
    ctx.lineTo(corner.x, corner.y);
    ctx.lineTo(wpt.x, wpt.y);
    ctx.stroke();
    ctx.setLineDash([]);
    fillDot(ctx, wpt.x, wpt.y, 6.2, '#facc15', '#090d16', 1.6);
  }

  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    if (v.driverType === 'police' && !v.destroyed) {
      const vp = toOverview(v.x, v.y);
      fillDot(ctx, vp.x, vp.y, 3.8, '#ff1744');
    }
  }

  const shortLabels = {
    safehouse_coral: 'Penthouse Safehouse',
    customs_neon: 'Solaria Customs',
    ammu_downtown: 'Tactical Armory',
    marina_dock: 'Marina Speedboats',
  };
  ctx.font = '700 9.5px system-ui, sans-serif';
  for (let i = 0; i < cityMap.landmarks.length; i += 1) {
    const lm = cityMap.landmarks[i];
    const lp = toOverview(lm.x, lm.y);
    const label = shortLabels[lm.id] || lm.name;
    const tw = ctx.measureText(label).width;
    const lx = lm.x > 400 ? lp.x - tw - 12 : lp.x + 7;
    const ly = lm.id === 'safehouse_coral' ? lp.y - 15 : lp.y - 7;

    ctx.fillStyle = 'rgba(9, 13, 26, 0.88)';
    ctx.fillRect(lx - 3, ly, tw + 6, 13);
    fillDot(ctx, lp.x, lp.y, 4.5, lm.color);
    drawText(ctx, label, lx, ly + 10, '700 9.5px', lm.color);
  }

  fillDot(ctx, pp.x, pp.y, 6, '#25f4ee', '#090d16', 2);
  ctx.restore();

  const saveY = 502;
  drawPanel(ctx, leftX, saveY, leftW, 202, 'rgba(9, 13, 26, 0.86)', '#34d399', 12);
  drawText(ctx, 'PERSISTENT 3-SLOT SAVE MANAGER ([F5] / [F9])', leftX + 14, saveY + 23, '900 12.5px', '#34d399');

  for (let i = 0; i < saveSlots.length; i += 1) {
    const slot = saveSlots[i];
    const sy = saveY + 34 + i * 52;
    drawPanel(ctx, leftX + 12, sy, leftW - 24, 44, slot.occupied ? 'rgba(18, 28, 48, 0.9)' : 'rgba(13, 19, 34, 0.75)', slot.occupied ? '#34d399' : '#334155', 8);
    drawText(ctx, `SLOT ${slot.slot}: ${slot.title}`, leftX + 22, sy + 18, '800 11.5px', slot.occupied ? '#f8fafc' : '#64748b', 'left', leftW - 44);
    const sub = slot.occupied
      ? `Cash: $${slot.cash.toLocaleString()}  •  Respect: ${slot.respect}  •  Saved: ${slot.savedAt}`
      : 'Empty Slot — Press [F5] or visit Penthouse Safehouse to record state';
    drawText(ctx, sub, leftX + 22, sy + 35, '700 10.5px', slot.occupied ? '#34d399' : '#475569', 'left', leftW - 44);
  }

  renderRadialWeaponWheel(ctx, player, w * 0.5, 166, 94);

  const rightX = w - 402;
  const colW = 382;

  drawPanel(ctx, rightX, 58, colW, 216, 'rgba(9, 13, 26, 0.86)', '#facc15', 12);
  drawText(ctx, '5-ACT STORY CAMPAIGN: SUN & SYNDICATE', rightX + 14, 81, '900 12.5px', '#facc15');

  for (let i = 0; i < STORY_MISSIONS.length; i += 1) {
    const m = STORY_MISSIONS[i];
    const isCurrent = i === missions.missionIndex;
    const isDone = i < missions.missionIndex || missions.completedAll;
    const ry = 94 + i * 34;
    drawPanel(ctx, rightX + 12, ry, colW - 24, 28, isCurrent ? 'rgba(42, 34, 16, 0.88)' : 'rgba(15, 22, 40, 0.82)', isDone ? '#34d399' : isCurrent ? '#facc15' : '#334155', 6);
    const statusTag = isDone ? 'DONE' : isCurrent ? 'ACTIVE' : 'LOCKED';
    drawText(ctx, `${m.act}: ${m.title} ($${m.rewardCash.toLocaleString()}) [${statusTag}]`, rightX + 20, ry + 18, isCurrent ? '800 11.5px' : '700 11px', isDone ? '#34d399' : isCurrent ? '#fde047' : '#94a3b8', 'left', colW - 40);
  }

  const activeCar = player.vehicle || player.nearbyVehicle || vehicles[0];
  const carName = activeCar ? activeCar.name.toUpperCase() : 'MAKO GTR CUSTOM';
  drawPanel(ctx, rightX, 284, colW, 208, 'rgba(9, 13, 26, 0.86)', '#c084fc', 12);
  drawText(ctx, 'SOLARIA CUSTOMS GARAGE // VEHICLE TUNING', rightX + 14, 307, '900 12.5px', '#c084fc');
  drawText(ctx, `BUILD: ${carName} • STAGE 3 TWIN-TURBO`, rightX + 14, 330, '800 12px', '#25f4ee', 'left', colW - 28);
  drawText(ctx, 'Underglow: Cyber Cyan Neon  •  Wing: Carbon GT Spoiler', rightX + 14, 350, '700 11px', '#e2e8f0');
  drawText(ctx, 'Tires: Pro Drift Slicks     •  Plate: Heat-Stealth Cloak', rightX + 14, 368, '700 11px', '#e2e8f0');

  const specs = [
    { label: 'TOP SPEED (340 MPH)', ratio: 0.96, color: '#25f4ee' },
    { label: 'TWIN-TURBO ACCEL', ratio: 0.92, color: '#facc15' },
    { label: 'DRIFT GRIP & AERO', ratio: 0.90, color: '#c084fc' },
    { label: 'CHASSIS ARMOR PLATING', ratio: 1.0, color: '#34d399' },
  ];
  for (let s = 0; s < specs.length; s += 1) {
    const sp = specs[s];
    const by = 382 + s * 25;
    drawText(ctx, sp.label, rightX + 14, by + 9, '800 10px', '#cbd5e1');
    drawBar(ctx, rightX + 172, by, colW - 188, 10, sp.ratio, sp.color);
  }

  drawPanel(ctx, rightX, 502, colW, 202, 'rgba(9, 13, 26, 0.86)', '#ff5e8e', 12);
  drawText(ctx, `OPERATIVE DOSSIER: ${player.name.toUpperCase()}`, rightX + 14, 525, '900 12.5px', '#ff5e8e');
  drawText(ctx, `Net Cash: $${player.cash.toLocaleString()}   •   Respect: ${player.respect}   •   Wanted: ${wanted.stars}★`, rightX + 14, 550, '700 11.5px', '#e2e8f0');
  drawText(ctx, 'Crew Partner: Rico Vega (Tactical Enforcer & Wheelman)', rightX + 14, 573, '700 11.5px', '#e2e8f0');
  drawText(ctx, `Vehicles Boosted: ${player.stats.carsHijacked}   •   Story Acts Passed: ${player.stats.missionsCompleted}`, rightX + 14, 596, '700 11.5px', '#e2e8f0');
  drawText(ctx, `SBPD Evaded: ${player.stats.copsEvaded}        •   Syndicate Neutralized: ${player.stats.eliminations}`, rightX + 14, 619, '700 11.5px', '#e2e8f0');

  drawPanel(ctx, rightX + 12, 636, colW - 24, 54, 'rgba(18, 24, 44, 0.9)', '#25f4ee', 8);
  drawText(ctx, 'SAFEHOUSE: OCEANFRONT PENTHOUSE (CORAL PROMENADE)', rightX + 22, 656, '800 10.5px', '#25f4ee', 'left', colW - 44);
  drawText(ctx, 'Garage: Mako GTR Custom & Corsair Jetboat Ready', rightX + 22, 676, '700 10.5px', '#fde047', 'left', colW - 44);
  ctx.restore();
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

  drawText(ctx, 'SOLARIA BAY 3D OPEN-WORLD CRIME ACTION', w * 0.5, cy + 40, '900 13px', '#25f4ee', 'center');
  drawText(ctx, 'SOLARIA BAY', w * 0.5, cy + 92, '900 46px', '#ff5e8e', 'center');
  drawText(ctx, 'SUN & SYNDICATE', w * 0.5, cy + 124, '900 22px', '#fde047', 'center');
  drawText(ctx, 'Explore 6 coastal districts on foot and behind the wheel. Hijack exotic coupes & speedboats,', w * 0.5, cy + 162, '600 14px', '#cbd5e1', 'center');
  drawText(ctx, 'outrun 5-Star SBPD & AIR-1 chopper pursuits, and conquer the 5-Act Sun & Syndicate story.', w * 0.5, cy + 184, '600 14px', '#cbd5e1', 'center');

  drawPanel(ctx, cx + 40, cy + 204, cardW - 80, 98, 'rgba(18, 24, 44, 0.92)', '#38bdf8', 10);
  drawText(ctx, 'WASD / Arrows: Walk, Drive & Steer   •   F / Enter: Hijack / Exit Vehicle   •   Space: Drift / Shoot', w * 0.5, cy + 232, '700 12px', '#e2e8f0', 'center');
  drawText(ctx, 'Left Click: Aim & Fire Weapon   •   Q / E or 1-5: Radial Weapon Wheel   •   Shift: Sprint / Nitro Boost', w * 0.5, cy + 256, '700 12px', '#e2e8f0', 'center');
  drawText(ctx, 'V: Switch 3D Camera   •   R: Radio Station   •   M / Tab: City Map & Save   •   F5 / F9: Quick Save/Load', w * 0.5, cy + 280, '700 12px', '#e2e8f0', 'center');
  drawText(ctx, 'PRESS [ENTER], [SPACE] OR CLICK TO ENTER SOLARIA BAY', w * 0.5, cy + 348, '900 18px', '#34d399', 'center');
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
  drawText(ctx, label, w * 0.5, h * 0.5 - 15, '900 46px', screen === SCREEN_BUSTED ? '#38bdf8' : '#ff2a5f', 'center');
  drawText(ctx, sub, w * 0.5, h * 0.5 + 22, '600 13px', '#e2e8f0', 'center');
  drawText(ctx, 'PRESS [ENTER] OR [SPACE] TO RESPAWN', w * 0.5, h * 0.5 + 56, '800 14px', '#fde047', 'center');
  ctx.restore();
}

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

function drawText(ctx, text, x, y, font, fill, align = 'left', maxWidth = undefined) {
  ctx.font = `${font} system-ui, sans-serif`;
  ctx.fillStyle = fill;
  ctx.textAlign = align;
  if (maxWidth !== undefined) ctx.fillText(text, x, y, maxWidth);
  else ctx.fillText(text, x, y);
}

function drawBar(ctx, x, y, w, h, ratio, fill, bg = '#1e293b') {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
}

function fillDot(ctx, x, y, r, fill, stroke = null, lw = 1.5) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
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
