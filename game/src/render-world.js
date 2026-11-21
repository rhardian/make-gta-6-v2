// 3D perspective open-world renderer for Solaria Bay: Sun & Syndicate.
// Renders sunset sky, ocean waves, beach umbrellas, road network with zebra crosswalks,
// streetlamps with light cones, Starlight Marina Pier & 3D Ferris Wheel, multi-pane glass
// skyscrapers with rooftop helipads/AC units and glowing 3D neon signs, detailed 3D vehicles
// with wheels/arches/spoilers/mirrors/underglow and boat wakes, articulated 3D characters
// holding weapons, police roadblocks with spike strips, AIR-1 helicopter, tracers & explosions.

import { WORLD_CONFIG } from './config.js';
import {
  buildOrientedBoxVertices,
  clipAndProjectPolygon3D,
  projectPoint3D,
  worldToCameraSpace,
} from './camera-3d.js';
import { getMissionWaypoint } from './missions.js';

const BOX_FACES = [
  { indices: [0, 1, 5, 4], shade: 'front' },
  { indices: [1, 2, 6, 5], shade: 'right' },
  { indices: [2, 3, 7, 6], shade: 'back' },
  { indices: [3, 0, 4, 7], shade: 'left' },
  { indices: [4, 5, 6, 7], shade: 'top' },
];

export function createWorldRenderer() {
  function renderWorld(ctx, worldState) {
    const { camera, cityMap, player, vehicles, pedestrians, cashDrops, skidmarks, missions, wanted, combat, simTime } = worldState;

    renderSkyAndHorizon(ctx, camera, simTime);
    renderGroundOceanAndRoads3D(ctx, camera, cityMap, skidmarks, simTime);

    const playerDepth = worldToCameraSpace(camera, player.x, player.y, 8).camZ;
    const drawList = [];

    for (let i = 0; i < cityMap.buildings.length; i += 1) {
      const b = cityMap.buildings[i];
      if (Math.hypot(b.x - camera.x, b.y - camera.y) > 760) continue;
      const cs = worldToCameraSpace(camera, b.x, b.y, b.height * 0.5);
      if (cs.camZ > 15) drawList.push({ depth: cs.camZ, kind: 'building', item: b });
    }
    if (cityMap.ferrisWheel) {
      const fw = cityMap.ferrisWheel;
      const cs = worldToCameraSpace(camera, fw.x, fw.y, fw.centerZ);
      if (cs.camZ > 20 && cs.camZ < 820) drawList.push({ depth: cs.camZ, kind: 'ferris', item: fw });
    }
    for (let i = 0; i < cityMap.palmTrees.length; i += 1) {
      const t = cityMap.palmTrees[i];
      if (Math.hypot(t.x - camera.x, t.y - camera.y) > 520) continue;
      const cs = worldToCameraSpace(camera, t.x, t.y, t.height * 0.5);
      if (cs.camZ > 22) drawList.push({ depth: cs.camZ, kind: 'palm', item: t });
    }
    for (let i = 0; i < cityMap.streetLamps.length; i += 1) {
      const lamp = cityMap.streetLamps[i];
      if (Math.hypot(lamp.x - camera.x, lamp.y - camera.y) > 380) continue;
      const cs = worldToCameraSpace(camera, lamp.x, lamp.y, 12);
      if (cs.camZ > 18) drawList.push({ depth: cs.camZ, kind: 'lamp', item: lamp });
    }
    if (wanted.roadblocks) {
      for (let i = 0; i < wanted.roadblocks.length; i += 1) {
        const rb = wanted.roadblocks[i];
        if (!rb.active) continue;
        const cs = worldToCameraSpace(camera, rb.x, rb.y, 3);
        if (cs.camZ > 12 && cs.camZ < 580) drawList.push({ depth: cs.camZ, kind: 'roadblock', item: rb });
      }
    }
    for (let i = 0; i < vehicles.length; i += 1) {
      const v = vehicles[i];
      if (Math.hypot(v.x - camera.x, v.y - camera.y) > 660) continue;
      const cs = worldToCameraSpace(camera, v.x, v.y, 6);
      if (cs.camZ > 12) drawList.push({ depth: cs.camZ, kind: 'vehicle', item: v });
    }
    for (let i = 0; i < pedestrians.length; i += 1) {
      const p = pedestrians[i];
      if (!p.alive || Math.hypot(p.x - camera.x, p.y - camera.y) > 500) continue;
      const cs = worldToCameraSpace(camera, p.x, p.y, 8);
      if (cs.camZ > 14) drawList.push({ depth: cs.camZ, kind: 'ped', item: p });
    }
    if (!player.inVehicle && playerDepth > 12) {
      drawList.push({ depth: playerDepth, kind: 'player', item: player });
    }
    const waypoint = getMissionWaypoint(missions);
    if (waypoint) {
      const cs = worldToCameraSpace(camera, waypoint.x, waypoint.y, 20);
      if (cs.camZ > 18) drawList.push({ depth: cs.camZ, kind: 'waypoint', item: waypoint });
    }
    for (let i = 0; i < cityMap.landmarks.length; i += 1) {
      const lm = cityMap.landmarks[i];
      const cs = worldToCameraSpace(camera, lm.x, lm.y, 12);
      if (cs.camZ > 65 && cs.camZ < 480) drawList.push({ depth: cs.camZ, kind: 'landmark', item: lm });
    }

    drawList.sort((a, b) => b.depth - a.depth);
    const pendingSigns = [];
    for (let i = 0; i < drawList.length; i += 1) {
      const e = drawList[i];
      if (e.kind === 'building') renderBuilding3D(ctx, camera, e.item, playerDepth, pendingSigns);
      else if (e.kind === 'ferris') renderStarlightFerrisWheel3D(ctx, camera, e.item, simTime);
      else if (e.kind === 'palm') renderPalmTree3D(ctx, camera, e.item, simTime);
      else if (e.kind === 'lamp') renderStreetLamp3D(ctx, camera, e.item);
      else if (e.kind === 'roadblock') renderPoliceRoadblock3D(ctx, camera, e.item, simTime);
      else if (e.kind === 'vehicle') renderVehicleMesh3D(ctx, camera, e.item, simTime);
      else if (e.kind === 'ped') renderCharacterMesh3D(ctx, camera, e.item, false);
      else if (e.kind === 'player') renderCharacterMesh3D(ctx, camera, e.item, true);
      else if (e.kind === 'waypoint') renderMissionBeacon3D(ctx, camera, e.item.x, e.item.y, '#facc15', e.item.act, simTime);
      else if (e.kind === 'landmark') renderMissionBeacon3D(ctx, camera, e.item.x, e.item.y, e.item.color, null, simTime);
    }

    pendingSigns.sort((a, b) => a.depth - b.depth);
    const placedSignBoxes = [];
    for (let i = 0; i < pendingSigns.length; i += 1) {
      const sg = pendingSigns[i];
      if (placedSignBoxes.some((b) => Math.abs(b.x - sg.x) < (b.w + sg.w) * 0.54 && Math.abs(b.y - sg.y) < (b.h + sg.h) * 0.75)) continue;
      placedSignBoxes.push(sg);
      ctx.save();
      ctx.font = `900 ${sg.fontSize}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(9, 13, 26, 0.94)';
      ctx.strokeStyle = sg.trimColor;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.roundRect(sg.x - sg.w * 0.5, sg.y - sg.h * 0.5, sg.w, sg.h, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = sg.textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sg.text, sg.x, sg.y);
      ctx.restore();
    }

    for (let i = 0; i < cashDrops.length; i += 1) {
      const drop = cashDrops[i];
      const pt = projectPoint3D(camera, drop.x, drop.y, 2.0);
      if (pt && pt.depth < 380) {
        ctx.save();
        ctx.fillStyle = 'rgba(34, 197, 94, 0.35)';
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y + 2, 9, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#bbf7d0';
        ctx.lineWidth = 1.4;
        ctx.fillRect(pt.x - 6, pt.y - 4, 12, 7);
        ctx.strokeRect(pt.x - 6, pt.y - 4, 12, 7);
        ctx.restore();
      }
    }

    for (let i = 0; i < combat.projectiles.length; i += 1) {
      const b = combat.projectiles[i];
      const head = projectPoint3D(camera, b.x, b.y, b.z);
      const tail = projectPoint3D(camera, b.x - b.vx * 0.042, b.y - b.vy * 0.042, b.z);
      if (head && tail) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.55;
        strokeLine(ctx, tail.x, tail.y, head.x, head.y, b.color, 6.0);
        ctx.globalAlpha = 1.0;
        strokeLine(ctx, tail.x, tail.y, head.x, head.y, '#fffbeb', 2.4);
        fillCircle(ctx, head.x, head.y, 3.2, '#fef08a');
        ctx.restore();
      }
    }

    for (let i = 0; i < combat.particles.length; i += 1) {
      const p = combat.particles[i];
      const pt = projectPoint3D(camera, p.x, p.y, p.z);
      if (pt && pt.depth > 14 && pt.depth < 540) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, (p.ttl / p.maxTtl) * (p.alpha ?? 0.9)));
        fillCircle(ctx, pt.x, pt.y, Math.max(1.8, Math.min(24, p.size * 0.48 * pt.scale)), p.color);
        ctx.restore();
      }
    }

    for (let i = 0; i < combat.explosions.length; i += 1) {
      const ex = combat.explosions[i];
      const pt = projectPoint3D(camera, ex.x, ex.y, ex.z);
      if (pt && pt.depth > 14) {
        ctx.save();
        const r = Math.max(16, Math.min(125, ex.radius * 0.65 * pt.scale));
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y + r * 0.25, r * 1.35, r * 0.52, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 5; k += 1) {
          const ang = k * 1.25 + 0.3;
          fillCircle(ctx, pt.x + Math.cos(ang) * r * 0.58, pt.y - r * 0.3 + Math.sin(ang) * r * 0.36, r * 0.46, 'rgba(30, 41, 59, 0.62)');
        }
        const grad = ctx.createRadialGradient(pt.x, pt.y - r * 0.1, r * 0.1, pt.x, pt.y, r);
        grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.98)');
        grad.addColorStop(0.28, 'rgba(253, 224, 71, 0.95)');
        grad.addColorStop(0.58, 'rgba(249, 115, 22, 0.85)');
        grad.addColorStop(0.85, 'rgba(239, 68, 68, 0.55)');
        grad.addColorStop(1.0, 'rgba(239, 68, 68, 0.0)');
        fillCircle(ctx, pt.x, pt.y, r, grad);
        ctx.restore();
      }
    }

    renderPoliceChopper3D(ctx, camera, wanted.helicopter, simTime);

    for (let i = 0; i < combat.floatingTexts.length; i += 1) {
      const ft = combat.floatingTexts[i];
      const pt = projectPoint3D(camera, ft.x, ft.y, ft.z);
      if (pt && pt.y > 102 && pt.y < camera.viewportHeight - 110) {
        ctx.save();
        ctx.font = '900 13px system-ui, sans-serif';
        const tw = ctx.measureText(ft.text).width;
        ctx.fillStyle = 'rgba(9, 13, 26, 0.88)';
        ctx.strokeStyle = ft.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(pt.x - tw * 0.5 - 8, pt.y - 11, tw + 16, 22, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ft.text, pt.x, pt.y);
        ctx.restore();
      }
    }
  }

  return { renderWorld };
}

export function renderSkyAndHorizon(ctx, camera, simTime) {
  const w = camera.viewportWidth;
  const h = camera.viewportHeight;
  const horizonY = Math.max(70, Math.min(h * 0.52, camera.horizonY));

  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 16);
  skyGrad.addColorStop(0.0, '#0b0720');
  skyGrad.addColorStop(0.30, '#2e1252');
  skyGrad.addColorStop(0.60, '#961f62');
  skyGrad.addColorStop(0.84, '#ff4d6d');
  skyGrad.addColorStop(1.0, '#ffc45e');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, horizonY + 16);

  let relAngle = -0.35 - camera.yaw;
  while (relAngle > Math.PI) relAngle -= Math.PI * 2;
  while (relAngle < -Math.PI) relAngle += Math.PI * 2;
  const sunX = w * 0.5 + relAngle * (w * 0.36);
  const sunY = horizonY - 44;

  if (sunX > -180 && sunX < w + 180) {
    const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 155);
    glow.addColorStop(0.0, 'rgba(255, 248, 195, 0.95)');
    glow.addColorStop(0.3, 'rgba(255, 166, 77, 0.64)');
    glow.addColorStop(0.68, 'rgba(255, 71, 126, 0.24)');
    glow.addColorStop(1.0, 'rgba(255, 71, 126, 0.0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 160, sunY - 160, 320, 320);

    const sunDisc = ctx.createLinearGradient(sunX, sunY - 40, sunX, sunY + 40);
    sunDisc.addColorStop(0, '#fffbeb');
    sunDisc.addColorStop(0.55, '#facc15');
    sunDisc.addColorStop(1, '#f43f5e');
    fillCircle(ctx, sunX, sunY, 40, sunDisc);
  }

  ctx.fillStyle = 'rgba(255, 188, 142, 0.16)';
  for (let i = 0; i < 7; i += 1) {
    const cx = ((i * 230 + simTime * 6 - camera.yaw * 220) % (w + 260) + (w + 260)) % (w + 260) - 130;
    const cy = horizonY - 26 - (i % 3) * 22;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 80 + (i % 2) * 32, 10 + (i % 3) * 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
  groundGrad.addColorStop(0.0, '#272138');
  groundGrad.addColorStop(0.18, '#1b1f30');
  groundGrad.addColorStop(1.0, '#121622');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, horizonY, w, h - horizonY);
}

export function renderGroundOceanAndRoads3D(ctx, camera, cityMap, skidmarks, simTime) {
  const { beachStartX, oceanStartX, roadWidth, sidewalkWidth } = WORLD_CONFIG;

  drawRectZ(ctx, camera, beachStartX, -1100, oceanStartX, 1100, 0, '#eab676');
  drawRectZ(ctx, camera, beachStartX - 6, -1100, beachStartX + 2, 1100, 0.25, '#cbd5e1');
  drawRectZ(ctx, camera, oceanStartX, -1200, 1650, 1200, -0.5, '#0284c7');
  drawRectZ(ctx, camera, oceanStartX + 95, -1200, 1650, 1200, -0.45, '#0369a1');

  const foamX = oceanStartX + Math.sin(simTime * 2.2) * 3.5;
  drawRectZ(ctx, camera, foamX - 5, -1000, foamX + 5, 1000, 0.1, 'rgba(224, 242, 254, 0.85)');
  drawRectZ(ctx, camera, foamX + 10, -1000, foamX + 13, 1000, 0.08, 'rgba(186, 230, 253, 0.55)');

  for (let wy = -720; wy <= 720; wy += 75) {
    const waveX = oceanStartX + 35 + ((Math.abs(wy) * 3) % 135) + Math.sin(simTime * 1.8 + wy) * 7;
    drawRectZ(ctx, camera, waveX, wy - 24, waveX + 4.0, wy + 24, 0.1, 'rgba(186, 230, 253, 0.55)');
  }

  const halfRoad = roadWidth * 0.5;
  const halfOuter = halfRoad + sidewalkWidth;
  for (let i = 0; i < cityMap.roadsX.length; i += 1) {
    const rx = cityMap.roadsX[i];
    if (Math.abs(rx - camera.x) > 760) continue;
    drawRectZ(ctx, camera, rx - halfOuter, -980, rx + halfOuter, 980, 0.1, '#334155');
    drawRectZ(ctx, camera, rx - halfRoad, -980, rx + halfRoad, 980, 0.2, '#1e2433');
    drawRectZ(ctx, camera, rx - halfRoad + 1.5, -980, rx - halfRoad + 2.8, 980, 0.26, 'rgba(248, 250, 252, 0.35)');
    drawRectZ(ctx, camera, rx + halfRoad - 2.8, -980, rx + halfRoad - 1.5, 980, 0.26, 'rgba(248, 250, 252, 0.35)');
    for (let dy = -840; dy <= 840; dy += 56) {
      if (Math.abs(dy - camera.y) <= 640) drawRectZ(ctx, camera, rx - 1.3, dy - 13, rx + 1.3, dy + 13, 0.3, '#facc15');
    }
  }

  for (let j = 0; j < cityMap.roadsY.length; j += 1) {
    const ry = cityMap.roadsY[j];
    if (Math.abs(ry - camera.y) > 760) continue;
    drawRectZ(ctx, camera, -980, ry - halfOuter, beachStartX, ry + halfOuter, 0.12, '#334155');
    drawRectZ(ctx, camera, -980, ry - halfRoad, beachStartX, ry + halfRoad, 0.22, '#1e2433');
    for (let dx = -840; dx <= 480; dx += 56) {
      if (Math.abs(dx - camera.x) <= 640) drawRectZ(ctx, camera, dx - 13, ry - 1.3, dx + 13, ry + 1.3, 0.32, '#facc15');
    }
  }

  for (let i = 0; i < cityMap.roadsX.length; i += 1) {
    const rx = cityMap.roadsX[i];
    if (Math.abs(rx - camera.x) > 520) continue;
    for (let j = 0; j < cityMap.roadsY.length; j += 1) {
      const ry = cityMap.roadsY[j];
      if (Math.abs(ry - camera.y) > 520) continue;
      for (let s = -20; s <= 20; s += 8) {
        drawRectZ(ctx, camera, rx + s - 2.2, ry + halfRoad + 2, rx + s + 2.2, ry + halfRoad + 11, 0.34, '#e2e8f0');
        drawRectZ(ctx, camera, rx + s - 2.2, ry - halfRoad - 11, rx + s + 2.2, ry - halfRoad - 2, 0.34, '#e2e8f0');
        drawRectZ(ctx, camera, rx - halfRoad - 11, ry + s - 2.2, rx - halfRoad - 2, ry + s + 2.2, 0.34, '#e2e8f0');
        if (rx < beachStartX - 80) drawRectZ(ctx, camera, rx + halfRoad + 2, ry + s - 2.2, rx + halfRoad + 11, ry + s + 2.2, 0.34, '#e2e8f0');
      }
    }
  }

  const pilingColors = { front: '#451a03', back: '#451a03', left: '#78350f', right: '#78350f', top: '#92400e' };
  for (let i = 0; i < cityMap.piers.length; i += 1) {
    const p = cityMap.piers[i];
    if (Math.hypot(p.x - camera.x, p.y - camera.y) > 780) continue;
    const halfL = p.length * 0.5;
    for (let px = p.x + 22; px < p.x + p.width; px += 38) {
      renderOrientedBox3D(ctx, camera, px, p.y - halfL + 3, -0.5, 4, 4, 4.5, 0, pilingColors);
      renderOrientedBox3D(ctx, camera, px, p.y + halfL - 3, -0.5, 4, 4, 4.5, 0, pilingColors);
    }
    drawRectZ(ctx, camera, p.x, p.y - halfL, p.x + p.width, p.y + halfL, 3.2, '#78350f', '#f59e0b', 1.5);
    for (let plankX = p.x + 16; plankX < p.x + p.width - 8; plankX += 18) {
      drawRectZ(ctx, camera, plankX, p.y - halfL + 2, plankX + 2, p.y + halfL - 2, 3.3, '#451a03');
    }
  }

  for (let i = 0; i < cityMap.beachProps.length; i += 1) {
    const u = cityMap.beachProps[i];
    if (Math.hypot(u.x - camera.x, u.y - camera.y) > 520) continue;
    const r = u.radius * 0.78;
    drawRectZ(ctx, camera, u.x - r * 0.9, u.y - r * 0.9, u.x + r * 0.9, u.y + r * 0.9, 0.18, 'rgba(15, 23, 42, 0.28)');
    drawRectZ(ctx, camera, u.x - 4, u.y + r * 0.4, u.x + 8, u.y + r * 1.35, 0.24, u.color, '#fff', 0.6);
    const basePt = projectPoint3D(camera, u.x, u.y, 0.25);
    const topPt = projectPoint3D(camera, u.x, u.y, 12.2);
    if (basePt && topPt) {
      strokeLine(ctx, basePt.x, basePt.y, topPt.x, topPt.y, '#e2e8f0', Math.max(1.4, Math.min(4.5, 0.9 * basePt.scale)));
    }
    const apex = [u.x, u.y, 12.6];
    const c1 = [u.x - r, u.y - r, 9.2];
    const c2 = [u.x + r, u.y - r, 9.2];
    const c3 = [u.x + r, u.y + r, 9.2];
    const c4 = [u.x - r, u.y + r, 9.2];
    const sec = u.secondaryColor || '#ffffff';
    drawQuad3D(ctx, camera, apex, c1, c2, apex, u.color, '#0f172a', 0.7);
    drawQuad3D(ctx, camera, apex, c2, c3, apex, sec, '#0f172a', 0.7);
    drawQuad3D(ctx, camera, apex, c3, c4, apex, u.color, '#0f172a', 0.7);
    drawQuad3D(ctx, camera, apex, c4, c1, apex, sec, '#0f172a', 0.7);
  }

  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < skidmarks.length; i += 1) {
    const sk = skidmarks[i];
    if (sk.x1 !== undefined) {
      const p1 = projectPoint3D(camera, sk.x1, sk.y1, 0.35);
      const p2 = projectPoint3D(camera, sk.x2, sk.y2, 0.35);
      if (p1 && p2 && p1.depth < 440) strokeLine(ctx, p1.x, p1.y, p2.x, p2.y, 'rgba(9, 13, 24, 0.68)', 3.2);
    }
  }
  ctx.restore();
}

export function renderBuilding3D(ctx, camera, b, playerDepth, pendingSigns = null) {
  const hw = b.width * 0.5;
  const hd = b.depth * 0.5;
  const centerCS = worldToCameraSpace(camera, b.x, b.y, b.height * 0.4);
  const isOccludingPlayer = centerCS.camZ > 0 && centerCS.camZ < playerDepth - 12 && Math.abs(centerCS.camX) < b.width * 0.62;

  ctx.save();
  if (isOccludingPlayer) ctx.globalAlpha = 0.25;

  const shOffX = -Math.min(30, b.height * 0.2);
  const shOffY = Math.min(20, b.height * 0.14);
  drawQuad3D(ctx, camera, [b.x - hw + shOffX, b.y - hd + shOffY, 0.25], [b.x + hw, b.y - hd, 0.25], [b.x + hw, b.y + hd, 0.25], [b.x - hw + shOffX, b.y + hd + shOffY, 0.25], 'rgba(8, 11, 22, 0.42)');

  renderOrientedBox3D(ctx, camera, b.x, b.y, 0, b.width, b.depth, b.height, 0, {
    front: b.wallColor, back: b.wallColor, left: b.sideColor, right: b.sideColor, top: b.roofColor,
  }, b.trimColor);

  if (centerCS.camZ < 520) {
    const bandStep = 14;
    const cols = 4;
    const faceX = camera.x > b.x + hw ? b.x + hw + 0.35 : (camera.x < b.x - hw ? b.x - hw - 0.35 : null);
    const faceY = camera.y > b.y + hd ? b.y + hd + 0.35 : (camera.y < b.y - hd ? b.y - hd - 0.35 : null);

    if (faceX !== null) drawQuad3D(ctx, camera, [faceX, b.y - hd * 0.78, 0.5], [faceX, b.y + hd * 0.78, 0.5], [faceX, b.y + hd * 0.78, 7.5], [faceX, b.y - hd * 0.78, 7.5], '#0f172a', b.trimColor, 1.0);
    if (faceY !== null) drawQuad3D(ctx, camera, [b.x - hw * 0.78, faceY, 0.5], [b.x + hw * 0.78, faceY, 0.5], [b.x + hw * 0.78, faceY, 7.5], [b.x - hw * 0.78, faceY, 7.5], '#0f172a', b.trimColor, 1.0);

    const spanD = hd * 1.68;
    const paneStepD = spanD / cols;
    const paneWD = paneStepD * 0.72;
    const spanW = hw * 1.68;
    const paneStepW = spanW / cols;
    const paneWW = paneStepW * 0.72;

    let floorIdx = 0;
    for (let z = 11; z < b.height - 6; z += bandStep) {
      const paneH = 6.2;
      for (let c = 0; c < cols; c += 1) {
        const litHash = (floorIdx * 7 + c * 3 + b.height) % 5;
        const paneColor = litHash === 0 ? '#38bdf8' : litHash === 1 ? '#fde047' : litHash === 2 ? b.windowColor : '#1e293b';
        if (faceX !== null) {
          const py0 = (b.y - spanD * 0.5) + c * paneStepD + (paneStepD - paneWD) * 0.5;
          drawQuad3D(ctx, camera, [faceX, py0, z], [faceX, py0 + paneWD, z], [faceX, py0 + paneWD, z + paneH], [faceX, py0, z + paneH], paneColor);
        }
        if (faceY !== null) {
          const px0 = (b.x - spanW * 0.5) + c * paneStepW + (paneStepW - paneWW) * 0.5;
          drawQuad3D(ctx, camera, [px0, faceY, z], [px0 + paneWW, faceY, z], [px0 + paneWW, faceY, z + paneH], [px0, faceY, z + paneH], paneColor);
        }
      }
      floorIdx += 1;
    }
  }

  let roofTopZ = b.height;
  if (b.hasSetback) {
    const tierH = Math.round(b.height * 0.22);
    renderOrientedBox3D(ctx, camera, b.x, b.y, b.height, b.width * 0.6, b.depth * 0.6, tierH, 0, {
      front: b.sideColor, back: b.sideColor, left: b.wallColor, right: b.wallColor, top: b.trimColor,
    }, '#f8fafc');
    roofTopZ = b.height + tierH;
  } else if (b.hasPool) {
    drawQuad3D(ctx, camera, [b.x - hw * 0.55, b.y - hd * 0.55, b.height + 0.4], [b.x + hw * 0.55, b.y - hd * 0.55, b.height + 0.4], [b.x + hw * 0.55, b.y + hd * 0.55, b.height + 0.4], [b.x - hw * 0.55, b.y + hd * 0.55, b.height + 0.4], '#06b6d4', '#e0f2fe', 1.1);
  }

  if (centerCS.camZ < 480) {
    if (b.hasHelipad) {
      const hr = Math.min(hw, hd) * 0.34;
      drawRectZ(ctx, camera, b.x - hr, b.y - hr, b.x + hr, b.y + hr, roofTopZ + 0.4, '#1e293b', '#facc15', 1.6);
      drawRectZ(ctx, camera, b.x - hr * 0.45, b.y - hr * 0.5, b.x - hr * 0.22, b.y + hr * 0.5, roofTopZ + 0.6, '#f8fafc');
      drawRectZ(ctx, camera, b.x + hr * 0.22, b.y - hr * 0.5, b.x + hr * 0.45, b.y + hr * 0.5, roofTopZ + 0.6, '#f8fafc');
      drawRectZ(ctx, camera, b.x - hr * 0.22, b.y - hr * 0.12, b.x + hr * 0.22, b.y + hr * 0.12, roofTopZ + 0.6, '#f8fafc');
    } else {
      const acColors = { front: '#475569', back: '#334155', left: '#64748b', right: '#334155', top: '#94a3b8' };
      renderOrientedBox3D(ctx, camera, b.x - hw * 0.22, b.y - hd * 0.18, roofTopZ, 9, 7, 5, 0, acColors, '#1e293b');
      renderOrientedBox3D(ctx, camera, b.x + hw * 0.18, b.y + hd * 0.16, roofTopZ, 7, 7, 4.2, 0, acColors, '#1e293b');
    }
  }

  if (b.signText && !isOccludingPlayer && pendingSigns) {
    const signX = camera.x > b.x + hw ? b.x + hw + 1.5 : (camera.x < b.x - hw ? b.x - hw - 1.5 : b.x);
    const signZ = Math.min(44, Math.max(28, b.height - 6));
    const signPt = projectPoint3D(camera, signX, b.y, signZ);
    if (signPt && signPt.depth > 58 && signPt.depth < 375 && signPt.y > 112 && signPt.y < camera.viewportHeight - 135) {
      const fontSize = Math.max(10, Math.min(14, Math.round(2.7 * signPt.scale)));
      ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
      const textW = ctx.measureText(b.signText).width;
      pendingSigns.push({
        x: signPt.x, y: signPt.y, w: textW + 14, h: fontSize + 7,
        fontSize, text: b.signText, trimColor: b.trimColor, textColor: b.windowColor, depth: signPt.depth,
      });
    }
  }
  ctx.restore();
}

export function renderStarlightFerrisWheel3D(ctx, camera, fw, simTime) {
  const hubPt = projectPoint3D(camera, fw.x, fw.y, fw.centerZ);
  if (!hubPt || hubPt.depth < 25 || hubPt.depth > 820) return;

  const legFL = projectPoint3D(camera, fw.x - 7, fw.y - 24, fw.zBase);
  const legFR = projectPoint3D(camera, fw.x - 7, fw.y + 24, fw.zBase);
  const legBL = projectPoint3D(camera, fw.x + 7, fw.y - 24, fw.zBase);
  const legBR = projectPoint3D(camera, fw.x + 7, fw.y + 24, fw.zBase);

  ctx.save();
  const legLW = Math.max(2, Math.min(6, 1.4 * hubPt.scale));
  if (legFL && legFR) {
    strokeLine(ctx, legFL.x, legFL.y, hubPt.x, hubPt.y, '#e2e8f0', legLW);
    strokeLine(ctx, hubPt.x, hubPt.y, legFR.x, legFR.y, '#e2e8f0', legLW);
  }
  if (legBL && legBR) {
    strokeLine(ctx, legBL.x, legBL.y, hubPt.x, hubPt.y, '#e2e8f0', legLW);
    strokeLine(ctx, hubPt.x, hubPt.y, legBR.x, legBR.y, '#e2e8f0', legLW);
  }

  const segments = 20;
  const outerPts = [];
  const innerPts = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * Math.PI * 2 + simTime * 0.42;
    const pt = projectPoint3D(camera, fw.x, fw.y + Math.cos(a) * fw.radius, fw.centerZ + Math.sin(a) * fw.radius);
    if (pt) outerPts.push(pt);
    const ipt = projectPoint3D(camera, fw.x, fw.y + Math.cos(a) * (fw.radius * 0.65), fw.centerZ + Math.sin(a) * (fw.radius * 0.65));
    if (ipt) innerPts.push(ipt);
  }

  if (outerPts.length > 4) {
    ctx.strokeStyle = '#ff2a78';
    ctx.lineWidth = Math.max(2.5, Math.min(8, 1.8 * hubPt.scale));
    ctx.beginPath();
    ctx.moveTo(outerPts[0].x, outerPts[0].y);
    for (let i = 1; i < outerPts.length; i += 1) ctx.lineTo(outerPts[i].x, outerPts[i].y);
    ctx.stroke();
  }
  if (innerPts.length > 4) {
    ctx.strokeStyle = '#25f4ee';
    ctx.lineWidth = Math.max(1.8, Math.min(5, 1.1 * hubPt.scale));
    ctx.beginPath();
    ctx.moveTo(innerPts[0].x, innerPts[0].y);
    for (let i = 1; i < innerPts.length; i += 1) ctx.lineTo(innerPts[i].x, innerPts[i].y);
    ctx.stroke();
  }

  const gondolaColors = ['#facc15', '#25f4ee', '#ff2a78', '#a855f7', '#34d399'];
  for (let c = 0; c < fw.cabins; c += 1) {
    const a = (c / fw.cabins) * Math.PI * 2 + simTime * 0.42;
    const gpt = projectPoint3D(camera, fw.x, fw.y + Math.cos(a) * fw.radius, fw.centerZ + Math.sin(a) * fw.radius);
    if (gpt) {
      strokeLine(ctx, hubPt.x, hubPt.y, gpt.x, gpt.y, 'rgba(248, 250, 252, 0.65)', 1.4);
      const cabR = Math.max(3.5, Math.min(11, 2.8 * gpt.scale));
      ctx.fillStyle = gondolaColors[c % gondolaColors.length];
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(gpt.x - cabR, gpt.y - cabR * 0.6, cabR * 2, cabR * 1.5, 3);
      ctx.fill();
      ctx.stroke();
    }
  }

  fillCircle(ctx, hubPt.x, hubPt.y, Math.max(4, Math.min(13, 3.2 * hubPt.scale)), '#fde047');
  ctx.restore();
}

export function renderVehicleMesh3D(ctx, camera, v, simTime = 0) {
  const centerPt = projectPoint3D(camera, v.x, v.y, 4);
  if (!centerPt || centerPt.depth > 650) return;

  const cos = Math.cos(v.angle);
  const sin = Math.sin(v.angle);
  const hl = v.length * 0.5;
  const hw = v.width * 0.5;
  const vPt = (lx, ly, z) => [v.x + lx * cos - ly * sin, v.y + lx * sin + ly * cos, z];
  const solidColor = (c) => ({ front: c, back: c, left: c, right: c, top: c });
  const darkFaces = { front: '#090d16', back: '#090d16', left: '#1e293b', right: '#1e293b', top: '#090d16' };

  if (v.isBoat) {
    const wakeLen = Math.min(72, 24 + Math.abs(v.speed) * 0.22);
    drawQuad3D(ctx, camera, vPt(-hl * 0.7, -hw * 0.55, 0.12), vPt(-hl * 0.7, hw * 0.55, 0.12), vPt(-hl - wakeLen, hw * 2.35, 0.12), vPt(-hl - wakeLen, -hw * 2.35, 0.12), 'rgba(186, 230, 253, 0.52)');
    drawQuad3D(ctx, camera, vPt(-hl * 0.85, -hw * 0.36, 0.22), vPt(-hl * 0.85, hw * 0.36, 0.22), vPt(-hl - wakeLen * 0.78, hw * 1.45, 0.22), vPt(-hl - wakeLen * 0.78, -hw * 1.45, 0.22), 'rgba(240, 249, 255, 0.88)');

    if (Math.abs(v.speed) > 25) {
      for (let sp = 0; sp < 6; sp += 1) {
        const distBack = hl + 5 + sp * 6.5;
        const spreadY = (sp % 2 === 0 ? 1 : -1) * (3.5 + sp * 2.1);
        const sprayZ = 1.8 + Math.sin((v.wakePhase || simTime * 6) + sp) * 1.6;
        const spPt = projectPoint3D(camera, v.x - cos * distBack - sin * spreadY, v.y - sin * distBack + cos * spreadY, sprayZ);
        if (spPt) fillCircle(ctx, spPt.x, spPt.y, Math.max(2, Math.min(10, (3.2 - sp * 0.3) * spPt.scale)), 'rgba(240, 249, 255, 0.85)');
      }
    }

    const hullColor = v.isPolice ? '#0f172a' : v.color;
    const deckColor = v.isPolice ? '#f8fafc' : '#e0f2fe';
    renderOrientedBox3D(ctx, camera, v.x - cos * 3, v.y - sin * 3, 0.5, v.length * 0.78, v.width, 5.2, v.angle, {
      front: hullColor, back: hullColor, left: hullColor, right: hullColor, top: deckColor,
    }, '#0284c7');

    const bowTip = vPt(hl * 1.18, 0, 5.8);
    const bowBot = vPt(hl * 1.05, 0, 0.6);
    const midLTop = vPt(hl * 0.34, -hw, 5.7);
    const midRTop = vPt(hl * 0.34, hw, 5.7);
    const midLBot = vPt(hl * 0.34, -hw, 0.5);
    const midRBot = vPt(hl * 0.34, hw, 0.5);
    drawQuad3D(ctx, camera, midLTop, midRTop, bowTip, bowTip, deckColor, '#0284c7', 1.0);
    drawQuad3D(ctx, camera, midLBot, midLTop, bowTip, bowBot, hullColor, '#0f172a', 0.9);
    drawQuad3D(ctx, camera, midRTop, midRBot, bowBot, bowTip, hullColor, '#0f172a', 0.9);

    drawQuad3D(ctx, camera, vPt(hl * 0.95, -hw * 0.22, 5.85), vPt(hl * 0.95, hw * 0.22, 5.85), vPt(hl * 0.15, hw * 0.35, 5.85), vPt(hl * 0.15, -hw * 0.35, 5.85), v.isPolice ? '#2979ff' : (v.stripeColor || '#ff2a78'));
    renderOrientedBox3D(ctx, camera, v.x - cos * 4, v.y - sin * 4, 5.6, v.length * 0.42, v.width * 0.76, 2.8, v.angle, {
      front: '#38bdf8', back: '#0f172a', left: '#0284c7', right: '#0284c7', top: '#0f172a',
    }, '#e0f2fe');
    renderOrientedBox3D(ctx, camera, v.x - cos * (hl * 0.85) - sin * 4.5, v.y - sin * (hl * 0.85) + cos * 4.5, 1.0, 5.5, 4.2, 5.5, v.angle, darkFaces);
    renderOrientedBox3D(ctx, camera, v.x - cos * (hl * 0.85) + sin * 4.5, v.y - sin * (hl * 0.85) - cos * 4.5, 1.0, 5.5, 4.2, 5.5, v.angle, darkFaces);

    if (v.isPolice) {
      const redBright = Math.sin(v.sirenPhase) > 0;
      renderOrientedBox3D(ctx, camera, v.x - cos * 6 - sin * 5, v.y - sin * 6 + cos * 5, 8.8, 3.2, 5.5, 2.2, v.angle, solidColor(redBright ? '#ff1744' : '#2979ff'));
      renderOrientedBox3D(ctx, camera, v.x - cos * 6 + sin * 5, v.y - sin * 6 - cos * 5, 8.8, 3.2, 5.5, 2.2, v.angle, solidColor(redBright ? '#2979ff' : '#ff1744'));
    }
    return;
  }

  if (!v.destroyed) {
    drawQuad3D(ctx, camera, vPt(hl, -hw * 0.72, 0.35), vPt(hl, hw * 0.72, 0.35), vPt(hl + 42, hw * 1.75, 0.35), vPt(hl + 42, -hw * 1.75, 0.35), 'rgba(254, 240, 138, 0.16)');
  }

  if (!v.destroyed && (v.underglowColor || v.nitroActive || v.driverType === 'player')) {
    const glowCol = v.nitroActive ? 'rgba(37, 244, 238, 0.58)' : 'rgba(37, 244, 238, 0.42)';
    const ugVerts = buildOrientedBoxVertices(v.x, v.y, 0.26, v.length * 1.18, v.width * 1.26, 0.1, v.angle);
    fillPolygon(ctx, clipAndProjectPolygon3D(camera, [ugVerts[0], ugVerts[1], ugVerts[2], ugVerts[3]]), v.underglowColor === '#ff2a78' ? 'rgba(255, 42, 120, 0.44)' : glowCol);
  }

  const shadowVerts = buildOrientedBoxVertices(v.x, v.y, 0.32, v.length * 1.04, v.width * 1.06, 0.2, v.angle);
  fillPolygon(ctx, clipAndProjectPolygon3D(camera, [shadowVerts[0], shadowVerts[1], shadowVerts[2], shadowVerts[3]]), 'rgba(6, 9, 18, 0.65)');

  const wheelOffsets = [[hl * 0.62, -hw * 1.02], [hl * 0.62, hw * 1.02], [-hl * 0.62, -hw * 1.02], [-hl * 0.62, hw * 1.02]];
  for (let wIdx = 0; wIdx < wheelOffsets.length; wIdx += 1) {
    const [ox, oy] = wheelOffsets[wIdx];
    const wx = v.x + ox * cos - oy * sin;
    const wy = v.y + ox * sin + oy * cos;
    const wAngle = v.angle + (wIdx < 2 ? v.steerAngle * 0.55 : 0);
    renderOrientedBox3D(ctx, camera, v.x + ox * cos - (oy * 0.88) * sin, v.y + ox * sin + (oy * 0.88) * cos, 1.5, 9.8, 3.2, 5.6, v.angle, solidColor('#090d16'));
    renderOrientedBox3D(ctx, camera, wx, wy, 0.2, 8.2, 3.8, 5.2, wAngle, {
      front: '#111827', back: '#111827', left: '#94a3b8', right: '#94a3b8', top: '#1e293b',
    }, '#020617');
    const rimPt = projectPoint3D(camera, wx - sin * (oy > 0 ? -2.0 : 2.0), wy + cos * (oy > 0 ? -2.0 : 2.0), 2.7);
    if (rimPt && rimPt.depth < 280) fillCircle(ctx, rimPt.x, rimPt.y, Math.max(1.8, Math.min(6.5, 1.5 * rimPt.scale)), '#e2e8f0');
  }

  const bodyH = v.height * 0.54;
  const cabinH = v.height * 0.46;
  const bodyColor = v.destroyed ? '#1f2937' : v.color;

  renderOrientedBox3D(ctx, camera, v.x, v.y, 2.0, v.length, v.width, bodyH, v.angle, solidColor(bodyColor), '#0f172a');

  if (v.stripeColor || v.isPolice) {
    drawQuad3D(ctx, camera, vPt(hl * 0.94, -hw * 0.28, 2.15 + bodyH), vPt(hl * 0.94, hw * 0.28, 2.15 + bodyH), vPt(-hl * 0.94, hw * 0.28, 2.15 + bodyH), vPt(-hl * 0.94, -hw * 0.28, 2.15 + bodyH), v.isPolice ? '#f8fafc' : v.stripeColor);
  }

  if (!v.destroyed) {
    const mirrorZ = 2.0 + bodyH + 0.4;
    renderOrientedBox3D(ctx, camera, v.x + cos * (hl * 0.24) + sin * (hw * 1.12), v.y + sin * (hl * 0.24) - cos * (hw * 1.12), mirrorZ, 2.4, 3.0, 1.7, v.angle, solidColor(bodyColor), '#0f172a');
    renderOrientedBox3D(ctx, camera, v.x + cos * (hl * 0.24) - sin * (hw * 1.12), v.y + sin * (hl * 0.24) + cos * (hw * 1.12), mirrorZ, 2.4, 3.0, 1.7, v.angle, solidColor(bodyColor), '#0f172a');
  }

  if (!v.convertible) {
    const cabinOffset = -v.length * 0.06;
    const cx = v.x + cos * cabinOffset;
    const cy = v.y + sin * cabinOffset;
    const cz = 2.0 + bodyH;
    renderOrientedBox3D(ctx, camera, cx, cy, cz, v.length * 0.52, v.width * 0.82, cabinH, v.angle, {
      front: '#0284c7', back: '#0369a1', left: '#0f172a', right: '#0f172a', top: v.isPolice ? '#f8fafc' : bodyColor,
    }, '#0f172a');

    const fGlassX = cabinOffset + v.length * 0.262;
    const rGlassX = cabinOffset - v.length * 0.262;
    drawQuad3D(ctx, camera, vPt(fGlassX, -hw * 0.65, cz + 0.6), vPt(fGlassX, -hw * 0.1, cz + 0.6), vPt(fGlassX, hw * 0.35, cz + cabinH - 0.5), vPt(fGlassX, -hw * 0.2, cz + cabinH - 0.5), 'rgba(224, 242, 254, 0.55)');
    drawQuad3D(ctx, camera, vPt(rGlassX, -hw * 0.62, cz + 0.6), vPt(rGlassX, hw * 0.62, cz + 0.6), vPt(rGlassX, hw * 0.52, cz + cabinH - 0.5), vPt(rGlassX, -hw * 0.52, cz + cabinH - 0.5), '#0284c7');
    drawQuad3D(ctx, camera, vPt(rGlassX - 0.1, -hw * 0.45, cz + 0.9), vPt(rGlassX - 0.1, -hw * 0.05, cz + 0.9), vPt(rGlassX - 0.1, hw * 0.35, cz + cabinH - 0.7), vPt(rGlassX - 0.1, -hw * 0.05, cz + cabinH - 0.7), 'rgba(186, 230, 253, 0.58)');
  } else {
    renderOrientedBox3D(ctx, camera, v.x + cos * (hl * 0.22), v.y + sin * (hl * 0.22), 2.0 + bodyH, 3.2, v.width * 0.82, 3.6, v.angle, {
      front: '#38bdf8', back: '#0284c7', left: '#0f172a', right: '#0f172a', top: '#e0f2fe',
    });
    renderOrientedBox3D(ctx, camera, v.x - cos * (v.length * 0.08), v.y - sin * (v.length * 0.08), 2.0 + bodyH, v.length * 0.38, v.width * 0.74, 1.8, v.angle, darkFaces);
  }

  if (v.hasSpoiler || v.specId === 'mako_gtr' || v.specId === 'sbpd_interceptor' || v.specId === 'tormenta_sabre') {
    const spX = -hl * 0.88;
    const strutZ = 2.0 + bodyH;
    renderOrientedBox3D(ctx, camera, v.x + cos * spX - sin * (hw * 0.55), v.y + sin * spX + cos * (hw * 0.55), strutZ, 2.6, 1.4, 2.8, v.angle, darkFaces);
    renderOrientedBox3D(ctx, camera, v.x + cos * spX + sin * (hw * 0.55), v.y + sin * spX - cos * (hw * 0.55), strutZ, 2.6, 1.4, 2.8, v.angle, darkFaces);
    renderOrientedBox3D(ctx, camera, v.x + cos * spX, v.y + sin * spX, strutZ + 2.4, 4.4, v.width * 0.98, 1.3, v.angle, {
      ...darkFaces, top: bodyColor, back: '#0f172a',
    }, '#f8fafc');
  }

  const lw = hw * 0.38;
  drawQuad3D(ctx, camera, vPt(hl + 0.2, hw * 0.86, 3.4), vPt(hl + 0.2, hw * 0.86 - lw, 3.4), vPt(hl + 0.2, hw * 0.86 - lw, 5.4), vPt(hl + 0.2, hw * 0.86, 5.4), '#fef08a');
  drawQuad3D(ctx, camera, vPt(hl + 0.2, -hw * 0.86 + lw, 3.4), vPt(hl + 0.2, -hw * 0.86, 3.4), vPt(hl + 0.2, -hw * 0.86, 5.4), vPt(hl + 0.2, -hw * 0.86 + lw, 5.4), '#fef08a');

  const tailColor = v.braking ? '#ff1744' : '#ef4444';
  drawQuad3D(ctx, camera, vPt(-hl - 0.25, hw * 0.88, 3.8), vPt(-hl - 0.25, hw * 0.30, 3.8), vPt(-hl - 0.25, hw * 0.30, 5.8), vPt(-hl - 0.25, hw * 0.88, 5.8), tailColor);
  drawQuad3D(ctx, camera, vPt(-hl - 0.25, -hw * 0.30, 3.8), vPt(-hl - 0.25, -hw * 0.88, 3.8), vPt(-hl - 0.25, -hw * 0.88, 5.8), vPt(-hl - 0.25, -hw * 0.30, 5.8), tailColor);
  drawQuad3D(ctx, camera, vPt(-hl - 0.25, hw * 0.22, 3.5), vPt(-hl - 0.25, -hw * 0.22, 3.5), vPt(-hl - 0.25, -hw * 0.22, 5.2), vPt(-hl - 0.25, hw * 0.22, 5.2), '#fde047');

  const tailL = projectPoint3D(camera, v.x - cos * hl - sin * (hw * 0.62), v.y - sin * hl + cos * (hw * 0.62), 4.8);
  const tailR = projectPoint3D(camera, v.x - cos * hl + sin * (hw * 0.62), v.y - sin * hl - cos * (hw * 0.62), 4.8);
  if (tailL && tailR && tailL.depth < 340) {
    ctx.save();
    ctx.globalAlpha = v.braking ? 0.55 : 0.34;
    const gr = Math.max(4, Math.min(16, 3.2 * tailL.scale));
    fillCircle(ctx, tailL.x, tailL.y, gr, '#ff1744');
    fillCircle(ctx, tailR.x, tailR.y, gr, '#ff1744');
    ctx.restore();
  }

  if (v.drifting && !v.destroyed) {
    for (let side = -1; side <= 1; side += 2) {
      for (let puff = 0; puff < 3; puff += 1) {
        const px = v.x - cos * (hl * 0.72 + puff * 6.5) + sin * (side * hw * 0.92 + puff * 1.4 * side);
        const py = v.y - sin * (hl * 0.72 + puff * 6.5) - cos * (side * hw * 0.92 + puff * 1.4 * side);
        const smPt = projectPoint3D(camera, px, py, 2.2 + puff * 1.5);
        if (smPt && smPt.depth < 380) {
          fillCircle(ctx, smPt.x, smPt.y, Math.max(5, Math.min(26, (4.2 + puff * 2.1) * smPt.scale)), `rgba(226, 232, 240, ${0.46 - puff * 0.11})`);
        }
      }
    }
  }

  if (v.isPolice && !v.destroyed) {
    const roofZ = 2.1 + v.height;
    const redBright = Math.sin(v.sirenPhase) > 0;
    const colL = redBright ? '#ff1744' : '#2979ff';
    const colR = redBright ? '#2979ff' : '#ff1744';
    const lx = v.x - sin * (hw * 0.35);
    const ly = v.y + cos * (hw * 0.35);
    const rx = v.x + sin * (hw * 0.35);
    const ry = v.y - cos * (hw * 0.35);

    renderOrientedBox3D(ctx, camera, lx, ly, roofZ, 3.6, hw * 0.65, 2.3, v.angle, solidColor(colL));
    renderOrientedBox3D(ctx, camera, rx, ry, roofZ, 3.6, hw * 0.65, 2.3, v.angle, solidColor(colR));

    const barL = projectPoint3D(camera, lx, ly, roofZ + 1.2);
    const barR = projectPoint3D(camera, rx, ry, roofZ + 1.2);
    if (barL && barR) {
      ctx.save();
      ctx.globalAlpha = 0.54;
      const glowR = Math.max(5, Math.min(24, 4.4 * barL.scale));
      fillCircle(ctx, barL.x, barL.y, glowR, colL);
      fillCircle(ctx, barR.x, barR.y, glowR, colR);
      ctx.restore();
    }
  }
}

export function renderCharacterMesh3D(ctx, camera, char, isPlayer = false) {
  const baseZ = char.x > WORLD_CONFIG.oceanStartX - 18 ? 3.3 : 0.3;
  const footPt = projectPoint3D(camera, char.x, char.y, baseZ);
  const hipPt = projectPoint3D(camera, char.x, char.y, baseZ + 5.3);
  const torsoPt = projectPoint3D(camera, char.x, char.y, baseZ + 8.9);
  const headPt = projectPoint3D(camera, char.x, char.y, baseZ + 14.2);
  if (!footPt || !hipPt || !torsoPt || !headPt || footPt.depth < 16 || footPt.depth > 490) return;

  const s = Math.max(0.45, Math.min(6.8, torsoPt.scale));
  const stride = Math.sin(char.walkCycle || 0) * 2.5 * s;
  const isPartner = char.role === 'partner';
  const isCombatant = isPlayer || isPartner || char.role === 'syndicate' || char.role === 'police' || char.hasWeapon;

  ctx.save();
  ctx.fillStyle = isPlayer ? 'rgba(37, 244, 238, 0.45)' : isPartner ? 'rgba(245, 158, 11, 0.45)' : 'rgba(6, 9, 18, 0.48)';
  ctx.beginPath();
  ctx.ellipse(footPt.x, footPt.y, 4.6 * s, 2.3 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isPlayer ? '#0f172a' : (char.pantsColor || '#1e293b');
  ctx.lineWidth = Math.max(1.8, 2.2 * s);
  ctx.lineCap = 'round';
  const lFootX = footPt.x - 1.7 * s + stride;
  const rFootX = footPt.x + 1.7 * s - stride;
  const kneeY = (hipPt.y + footPt.y) * 0.5;

  ctx.beginPath();
  ctx.moveTo(hipPt.x - 1.5 * s, hipPt.y);
  ctx.lineTo((hipPt.x - 1.6 * s + lFootX) * 0.5, kneeY);
  ctx.lineTo(lFootX, footPt.y);
  ctx.moveTo(hipPt.x + 1.5 * s, hipPt.y);
  ctx.lineTo((hipPt.x + 1.6 * s + rFootX) * 0.5, kneeY);
  ctx.lineTo(rFootX, footPt.y);
  ctx.stroke();

  const jacketColor = isPlayer ? '#ff2a78' : (char.shirtColor || '#38bdf8');
  ctx.fillStyle = jacketColor;
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(torsoPt.x - 3.9 * s, torsoPt.y - 3.6 * s, 7.8 * s, 7.8 * s, 2.0 * s);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = char.role === 'syndicate' ? '#111827' : char.role === 'police' ? '#38bdf8' : 'rgba(15, 23, 42, 0.55)';
  ctx.fillRect(torsoPt.x - 1.8 * s, torsoPt.y - 3.2 * s, 3.6 * s, 6.6 * s);

  fillCircle(ctx, headPt.x, headPt.y, 2.8 * s, isPlayer ? '#f1c27d' : (char.skinColor || '#e0ac69'));
  ctx.stroke();

  ctx.fillStyle = char.role === 'police' ? '#1e3a8a' : (isPlayer ? '#1e1024' : (char.hairColor || '#111827'));
  ctx.beginPath();
  ctx.arc(headPt.x, headPt.y - 0.7 * s, 2.85 * s, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isPlayer ? '#25f4ee' : '#090d16';
  ctx.fillRect(headPt.x - 2.1 * s, headPt.y - 0.5 * s, 4.2 * s, 1.1 * s);

  const aimAngle = char.aimAngle ?? char.angle ?? 0;
  if (isCombatant) {
    const gunStock = projectPoint3D(camera, char.x + Math.cos(aimAngle) * 3.5, char.y + Math.sin(aimAngle) * 3.5, 9.5);
    const gunTip = projectPoint3D(camera, char.x + Math.cos(aimAngle) * 12.5, char.y + Math.sin(aimAngle) * 12.5, 9.8);
    if (gunStock && gunTip) {
      ctx.strokeStyle = jacketColor;
      ctx.lineWidth = Math.max(1.6, 1.9 * s);
      ctx.beginPath();
      ctx.moveTo(torsoPt.x - 3.2 * s, torsoPt.y - 1.5 * s);
      ctx.lineTo(gunStock.x, gunStock.y);
      ctx.moveTo(torsoPt.x + 3.2 * s, torsoPt.y - 1.5 * s);
      ctx.lineTo((gunStock.x + gunTip.x) * 0.5, (gunStock.y + gunTip.y) * 0.5);
      ctx.stroke();

      strokeLine(ctx, gunStock.x, gunStock.y, gunTip.x, gunTip.y, '#0f172a', Math.max(2.6, 3.0 * s));
      strokeLine(ctx, gunStock.x, gunStock.y, gunTip.x, gunTip.y, '#cbd5e1', Math.max(1.4, 1.6 * s));

      if ((char.muzzleFlashTimer || 0) > 0) {
        const fr = Math.max(5, 4.5 * s);
        fillCircle(ctx, gunTip.x, gunTip.y, fr * 1.6, 'rgba(249, 115, 22, 0.55)');
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(gunTip.x - fr * 1.4, gunTip.y);
        ctx.lineTo(gunTip.x - fr * 0.35, gunTip.y - fr * 0.35);
        ctx.lineTo(gunTip.x, gunTip.y - fr * 1.4);
        ctx.lineTo(gunTip.x + fr * 0.35, gunTip.y - fr * 0.35);
        ctx.lineTo(gunTip.x + fr * 1.4, gunTip.y);
        ctx.lineTo(gunTip.x + fr * 0.35, gunTip.y + fr * 0.35);
        ctx.lineTo(gunTip.x, gunTip.y + fr * 1.4);
        ctx.lineTo(gunTip.x - fr * 0.35, gunTip.y + fr * 0.35);
        ctx.closePath();
        ctx.fill();
        fillCircle(ctx, gunTip.x, gunTip.y, fr * 0.45, '#ffffff');
      }
    }
  } else {
    ctx.strokeStyle = jacketColor;
    ctx.lineWidth = Math.max(1.5, 1.8 * s);
    const panicRaise = (char.panicTimer || 0) > 0 ? -4.8 * s : 2.8 * s;
    ctx.beginPath();
    ctx.moveTo(torsoPt.x - 3.6 * s, torsoPt.y - 2.0 * s);
    ctx.lineTo(torsoPt.x - 4.8 * s - stride * 0.5, torsoPt.y + panicRaise);
    ctx.moveTo(torsoPt.x + 3.6 * s, torsoPt.y - 2.0 * s);
    ctx.lineTo(torsoPt.x + 4.8 * s + stride * 0.5, torsoPt.y + panicRaise);
    ctx.stroke();
  }

  if (!isPlayer && (char.role === 'syndicate' || char.role === 'police')) {
    const barW = Math.max(20, 13 * s);
    const ratio = Math.max(0, char.health / char.maxHealth);
    ctx.fillStyle = 'rgba(11, 15, 28, 0.88)';
    ctx.fillRect(headPt.x - barW * 0.5, headPt.y - 8.2 * s, barW, 3.6);
    ctx.fillStyle = char.role === 'police' ? '#38bdf8' : '#f43f5e';
    ctx.fillRect(headPt.x - barW * 0.5, headPt.y - 8.2 * s, barW * ratio, 3.6);
  } else if (isPartner && char.name && footPt.depth < 240) {
    ctx.font = '800 10.5px system-ui, sans-serif';
    const label = `${char.name.toUpperCase()} [CREW]`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(9, 13, 26, 0.88)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(headPt.x - tw * 0.5 - 5, headPt.y - 8 * s - 14, tw + 10, 15, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.textAlign = 'center';
    ctx.fillText(label, headPt.x, headPt.y - 8 * s - 3);
  }
  ctx.restore();
}

export function renderPoliceRoadblock3D(ctx, camera, rb, simTime) {
  const cos = Math.cos(rb.angle);
  const sin = Math.sin(rb.angle);
  const halfW = rb.spikeWidth * 0.5;
  const rPt = (lx, ly, z) => [rb.x + lx * cos - ly * sin, rb.y + lx * sin + ly * cos, z];

  drawQuad3D(ctx, camera, rPt(-1.4, -halfW, 0.38), rPt(1.4, -halfW, 0.38), rPt(1.4, halfW, 0.38), rPt(-1.4, halfW, 0.38), '#1e293b', '#94a3b8', 1.1);
  for (let sy = -halfW + 2.5; sy <= halfW - 2.5; sy += 3.2) {
    drawQuad3D(ctx, camera, rPt(-0.9, sy - 0.8, 0.42), rPt(0.9, sy + 0.8, 0.42), rPt(0, sy, 2.2), rPt(0, sy, 2.2), '#f8fafc', '#38bdf8', 0.6);
  }

  const solid = (c) => ({ front: c, back: c, left: c, right: c, top: c });
  renderOrientedBox3D(ctx, camera, rb.x - sin * (halfW + 4), rb.y + cos * (halfW + 4), 0.3, 3.2, 8.5, 4.2, rb.angle, solid('#f97316'), '#f8fafc');
  renderOrientedBox3D(ctx, camera, rb.x + sin * (halfW + 4), rb.y - cos * (halfW + 4), 0.3, 3.2, 8.5, 4.2, rb.angle, solid('#f97316'), '#f8fafc');

  const flarePulse = 0.6 + Math.sin(simTime * 14) * 0.3;
  for (let side = -1; side <= 1; side += 2) {
    const fPt = projectPoint3D(camera, rb.x + sin * (side * (halfW - 3)), rb.y - cos * (side * (halfW - 3)), 0.8);
    if (fPt && fPt.depth < 420) {
      ctx.save();
      ctx.globalAlpha = flarePulse;
      fillCircle(ctx, fPt.x, fPt.y, Math.max(4, Math.min(16, 3.4 * fPt.scale)), '#ff1744');
      ctx.restore();
    }
  }
}

export function renderPoliceChopper3D(ctx, camera, chopper, simTime = 0) {
  if (!chopper.active) return;
  const groundPt = projectPoint3D(camera, chopper.spotlightX, chopper.spotlightY, 0.5);
  const heliPt = projectPoint3D(camera, chopper.x, chopper.y, chopper.z);

  if (groundPt && heliPt) {
    ctx.save();
    const coneGrad = ctx.createLinearGradient(heliPt.x, heliPt.y, groundPt.x, groundPt.y);
    coneGrad.addColorStop(0, 'rgba(254, 240, 138, 0.42)');
    coneGrad.addColorStop(1, 'rgba(254, 240, 138, 0.14)');
    ctx.fillStyle = coneGrad;
    const spotR = Math.max(22, Math.min(105, 26 * groundPt.scale));
    ctx.beginPath();
    ctx.moveTo(heliPt.x - 5, heliPt.y);
    ctx.lineTo(heliPt.x + 5, heliPt.y);
    ctx.lineTo(groundPt.x + spotR, groundPt.y);
    ctx.lineTo(groundPt.x - spotR, groundPt.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(254, 249, 195, 0.24)';
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(groundPt.x, groundPt.y, spotR, spotR * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  if (!heliPt) return;

  const cos = Math.cos(chopper.angle);
  const sin = Math.sin(chopper.angle);
  const solid = (c) => ({ front: c, back: c, left: c, right: c, top: c });

  renderOrientedBox3D(ctx, camera, chopper.x - sin * 4.8, chopper.y + cos * 4.8, chopper.z - 7.8, 22, 1.4, 1.2, chopper.angle, solid('#64748b'));
  renderOrientedBox3D(ctx, camera, chopper.x + sin * 4.8, chopper.y - cos * 4.8, chopper.z - 7.8, 22, 1.4, 1.2, chopper.angle, solid('#64748b'));
  renderOrientedBox3D(ctx, camera, chopper.x - cos * 19, chopper.y - sin * 19, chopper.z - 1.5, 20, 3.4, 3.4, chopper.angle, {
    front: '#0f172a', back: '#0f172a', left: '#1e3a8a', right: '#1e3a8a', top: '#f8fafc',
  }, '#38bdf8');
  renderOrientedBox3D(ctx, camera, chopper.x - cos * 28, chopper.y - sin * 28, chopper.z, 5.5, 1.6, 7.5, chopper.angle, solid('#ef4444'), '#f8fafc');
  renderOrientedBox3D(ctx, camera, chopper.x, chopper.y, chopper.z - 5, 24, 11.5, 8.8, chopper.angle, {
    front: '#38bdf8', back: '#0f172a', left: '#1e3a8a', right: '#1e3a8a', top: '#f8fafc',
  }, '#38bdf8');
  renderOrientedBox3D(ctx, camera, chopper.x + cos * 11, chopper.y + sin * 11, chopper.z - 4, 8, 9.2, 5.6, chopper.angle, {
    front: '#7dd3fc', back: '#0284c7', left: '#38bdf8', right: '#38bdf8', top: '#0284c7',
  }, '#e0f2fe');

  const beaconPt = projectPoint3D(camera, chopper.x, chopper.y, chopper.z - 5.5);
  if (beaconPt) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    fillCircle(ctx, beaconPt.x, beaconPt.y, Math.max(5, Math.min(18, 4 * beaconPt.scale)), Math.sin(simTime * 14) > 0 ? '#ff1744' : '#2979ff');
    ctx.restore();
  }

  const rotorPt = projectPoint3D(camera, chopper.x, chopper.y, chopper.z + 5.2);
  if (rotorPt) {
    const rLen = Math.max(20, Math.min(88, 24 * rotorPt.scale));
    ctx.save();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(rotorPt.x, rotorPt.y, rLen, rLen * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();

    const rx = Math.cos(chopper.rotorAngle) * rLen;
    const ry = Math.sin(chopper.rotorAngle) * rLen * 0.38;
    const rx2 = Math.cos(chopper.rotorAngle + Math.PI * 0.5) * rLen;
    const ry2 = Math.sin(chopper.rotorAngle + Math.PI * 0.5) * rLen * 0.38;
    strokeLine(ctx, rotorPt.x - rx, rotorPt.y - ry, rotorPt.x + rx, rotorPt.y + ry, 'rgba(248, 250, 252, 0.92)', 2.8);
    strokeLine(ctx, rotorPt.x - rx2, rotorPt.y - ry2, rotorPt.x + rx2, rotorPt.y + ry2, 'rgba(248, 250, 252, 0.92)', 2.8);
    ctx.restore();
  }
}

export function renderMissionBeacon3D(ctx, camera, wx, wy, color, label, simTime) {
  const basePt = projectPoint3D(camera, wx, wy, 0.5);
  const topPt = projectPoint3D(camera, wx, wy, 52);
  if (!basePt || !topPt || basePt.depth < 24 || basePt.depth > 780) return;

  const pulse = 1 + Math.sin(simTime * 5) * 0.14;
  const r = Math.max(8, Math.min(68, 14 * basePt.scale * pulse));

  ctx.save();
  const beamGrad = ctx.createLinearGradient(basePt.x, basePt.y, topPt.x, topPt.y);
  beamGrad.addColorStop(0, color);
  beamGrad.addColorStop(1, 'rgba(250, 204, 21, 0.0)');
  ctx.fillStyle = beamGrad;
  ctx.globalAlpha = 0.34;
  ctx.beginPath();
  ctx.moveTo(basePt.x - r, basePt.y);
  ctx.lineTo(basePt.x + r, basePt.y);
  ctx.lineTo(topPt.x + r * 0.5, topPt.y);
  ctx.lineTo(topPt.x - r * 0.5, topPt.y);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.92;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(basePt.x, basePt.y, r, r * 0.44, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (label && basePt.depth < 520 && topPt.y > 110) {
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.textAlign = 'center';
    ctx.fillText(`▼ ${label} TARGET`, topPt.x, topPt.y - 6);
  }
  ctx.restore();
}

function renderStreetLamp3D(ctx, camera, lamp) {
  const basePt = projectPoint3D(camera, lamp.x, lamp.y, 0);
  const topPt = projectPoint3D(camera, lamp.x, lamp.y, lamp.height);
  if (!basePt || !topPt || basePt.depth < 20 || basePt.depth > 380) return;

  ctx.save();
  const coneR = Math.max(10, Math.min(44, 11 * basePt.scale));
  const coneGrad = ctx.createLinearGradient(topPt.x, topPt.y, basePt.x, basePt.y);
  coneGrad.addColorStop(0, 'rgba(254, 240, 138, 0.25)');
  coneGrad.addColorStop(1, 'rgba(254, 240, 138, 0.04)');
  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(topPt.x - 2, topPt.y);
  ctx.lineTo(topPt.x + 2, topPt.y);
  ctx.lineTo(basePt.x + coneR, basePt.y);
  ctx.lineTo(basePt.x - coneR, basePt.y);
  ctx.closePath();
  ctx.fill();

  strokeLine(ctx, basePt.x, basePt.y, topPt.x, topPt.y, '#94a3b8', Math.max(1.4, Math.min(4.5, 0.85 * basePt.scale)));
  fillCircle(ctx, topPt.x, topPt.y, Math.max(2.5, Math.min(9, 2.2 * topPt.scale)), '#fef08a');
  ctx.restore();
}

function renderPalmTree3D(ctx, camera, tree, simTime) {
  const basePt = projectPoint3D(camera, tree.x, tree.y, 0);
  if (!basePt || basePt.depth < 26 || basePt.depth > 520) return;

  const sway = Math.sin(simTime * 2.1 + tree.seed * 10) * 1.6;
  const topX = tree.x + tree.lean * 9 + sway;
  const topY = tree.y + sway * 0.4;
  const midPt = projectPoint3D(camera, tree.x + tree.lean * 4, tree.y, tree.height * 0.52);
  const topPt = projectPoint3D(camera, topX, topY, tree.height);
  if (!midPt || !topPt) return;

  ctx.save();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = Math.max(1.6, Math.min(9, 1.6 * basePt.scale));
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(basePt.x, basePt.y);
  ctx.quadraticCurveTo(midPt.x, midPt.y, topPt.x, topPt.y);
  ctx.stroke();

  const frondCount = 7;
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = Math.max(1.3, Math.min(6, 1.35 * topPt.scale));
  for (let i = 0; i < frondCount; i += 1) {
    const a = (i / frondCount) * Math.PI * 2 + tree.seed;
    const fx = topX + Math.cos(a) * 13;
    const fy = topY + Math.sin(a) * 13;
    const fz = tree.height - 3.5 + Math.sin(a * 2 + simTime) * 1.5;
    const frondPt = projectPoint3D(camera, fx, fy, fz);
    const archPt = projectPoint3D(camera, (topX + fx) * 0.5, (topY + fy) * 0.5, tree.height + 3.5);
    if (frondPt && archPt) {
      ctx.beginPath();
      ctx.moveTo(topPt.x, topPt.y);
      ctx.quadraticCurveTo(archPt.x, archPt.y, frondPt.x, frondPt.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function renderOrientedBox3D(ctx, camera, x, y, zBase, length, width, height, angle, colors, stroke = null) {
  const verts = buildOrientedBoxVertices(x, y, zBase, length, width, height, angle);
  const projectedFaces = [];
  for (let f = 0; f < BOX_FACES.length; f += 1) {
    const face = BOX_FACES[f];
    const poly = clipAndProjectPolygon3D(camera, [verts[face.indices[0]], verts[face.indices[1]], verts[face.indices[2]], verts[face.indices[3]]]);
    if (poly) projectedFaces.push({ poly, color: colors[face.shade] || colors.front });
  }
  projectedFaces.sort((a, b) => b.poly.depth - a.poly.depth);
  for (let i = 0; i < projectedFaces.length; i += 1) {
    fillPolygon(ctx, projectedFaces[i].poly, projectedFaces[i].color, stroke, 0.9);
  }
}

function fillPolygon(ctx, poly, fillStyle, strokeStyle = null, lineWidth = 1) {
  if (!poly || poly.points.length < 3) return;
  const pts = poly.points;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function fillCircle(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function strokeLine(ctx, x1, y1, x2, y2, stroke, lw = 1.5) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawQuad3D(ctx, camera, v0, v1, v2, v3, fillStyle, strokeStyle = null, lineWidth = 1) {
  const poly = clipAndProjectPolygon3D(camera, [v0, v1, v2, v3]);
  if (poly) fillPolygon(ctx, poly, fillStyle, strokeStyle, lineWidth);
  return poly;
}

function drawRectZ(ctx, camera, x0, y0, x1, y1, z, fill, stroke = null, lw = 1) {
  return drawQuad3D(ctx, camera, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], fill, stroke, lw);
}
