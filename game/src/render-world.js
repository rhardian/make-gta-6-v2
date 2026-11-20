// 3D perspective open-world renderer for Solaria Bay: Sun & Syndicate.
// Renders the sunset sky, ocean waves, sandy beach, road network, crosswalks, 3D extruded
// buildings with window bands and neon signs, palm trees, detailed 3D vehicles with wheels
// and spoilers, articulated characters, mission beacons, police helicopter and particles.

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

function fillPolygon(ctx, poly, fillStyle, strokeStyle = null, lineWidth = 1) {
  if (!poly || poly.points.length < 3) return;
  const pts = poly.points;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawQuad3D(ctx, camera, v0, v1, v2, v3, fillStyle, strokeStyle = null, lineWidth = 1) {
  const poly = clipAndProjectPolygon3D(camera, [v0, v1, v2, v3]);
  if (poly) fillPolygon(ctx, poly, fillStyle, strokeStyle, lineWidth);
  return poly;
}

function drawRectZ(ctx, camera, x0, y0, x1, y1, z, fill, stroke = null, lw = 1) {
  return drawQuad3D(ctx, camera, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], fill, stroke, lw);
}

export function renderSkyAndHorizon(ctx, camera, simTime) {
  const w = camera.viewportWidth;
  const h = camera.viewportHeight;
  const horizonY = Math.max(70, Math.min(h * 0.52, camera.horizonY));

  // Sunset sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 16);
  skyGrad.addColorStop(0.0, '#0f0a26');
  skyGrad.addColorStop(0.32, '#351659');
  skyGrad.addColorStop(0.64, '#9e2466');
  skyGrad.addColorStop(0.86, '#ff5666');
  skyGrad.addColorStop(1.0, '#ffc15e');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, horizonY + 16);

  // Volumetric setting sun
  const sunWorldAngle = -0.35;
  let relAngle = sunWorldAngle - camera.yaw;
  while (relAngle > Math.PI) relAngle -= Math.PI * 2;
  while (relAngle < -Math.PI) relAngle += Math.PI * 2;
  const sunX = w * 0.5 + relAngle * (w * 0.36);
  const sunY = horizonY - 44;

  if (sunX > -180 && sunX < w + 180) {
    const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 145);
    glow.addColorStop(0.0, 'rgba(255, 248, 195, 0.94)');
    glow.addColorStop(0.3, 'rgba(255, 166, 77, 0.62)');
    glow.addColorStop(0.68, 'rgba(255, 71, 126, 0.22)');
    glow.addColorStop(1.0, 'rgba(255, 71, 126, 0.0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 150, sunY - 150, 300, 300);

    ctx.save();
    ctx.beginPath();
    ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
    const sunDisc = ctx.createLinearGradient(sunX, sunY - 40, sunX, sunY + 40);
    sunDisc.addColorStop(0, '#fffbeb');
    sunDisc.addColorStop(0.55, '#facc15');
    sunDisc.addColorStop(1, '#f43f5e');
    ctx.fillStyle = sunDisc;
    ctx.fill();
    ctx.restore();
  }

  // Horizon clouds
  ctx.fillStyle = 'rgba(255, 188, 142, 0.16)';
  for (let i = 0; i < 7; i += 1) {
    const cx = ((i * 230 + simTime * 6 - camera.yaw * 220) % (w + 260) + (w + 260)) % (w + 260) - 130;
    const cy = horizonY - 26 - (i % 3) * 22;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 80 + (i % 2) * 32, 10 + (i % 3) * 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground plane backdrop below horizon
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
  drawRectZ(ctx, camera, oceanStartX, -1200, 1550, 1200, -0.5, '#0284c7');

  const foamX = oceanStartX + Math.sin(simTime * 2.2) * 3.5;
  drawRectZ(ctx, camera, foamX - 4.5, -1000, foamX + 4.5, 1000, 0.1, 'rgba(224, 242, 254, 0.8)');

  for (let wy = -720; wy <= 720; wy += 110) {
    const waveX = oceanStartX + 42 + ((Math.abs(wy) * 3) % 95) + Math.sin(simTime * 1.8 + wy) * 7;
    drawRectZ(ctx, camera, waveX, wy - 22, waveX + 3.5, wy + 22, 0.1, 'rgba(125, 211, 252, 0.48)');
  }

  const halfRoad = roadWidth * 0.5;
  const halfOuter = halfRoad + sidewalkWidth;
  for (let i = 0; i < cityMap.roadsX.length; i += 1) {
    const rx = cityMap.roadsX[i];
    if (Math.abs(rx - camera.x) > 760) continue;
    drawRectZ(ctx, camera, rx - halfOuter, -980, rx + halfOuter, 980, 0.1, '#334155');
    drawRectZ(ctx, camera, rx - halfRoad, -980, rx + halfRoad, 980, 0.2, '#1e2433');
    for (let dy = -840; dy <= 840; dy += 60) {
      if (Math.abs(dy - camera.y) <= 640) drawRectZ(ctx, camera, rx - 1.2, dy - 13, rx + 1.2, dy + 13, 0.3, '#facc15');
    }
  }

  for (let j = 0; j < cityMap.roadsY.length; j += 1) {
    const ry = cityMap.roadsY[j];
    if (Math.abs(ry - camera.y) > 760) continue;
    drawRectZ(ctx, camera, -980, ry - halfOuter, beachStartX, ry + halfOuter, 0.12, '#334155');
    drawRectZ(ctx, camera, -980, ry - halfRoad, beachStartX, ry + halfRoad, 0.22, '#1e2433');
    for (let dx = -840; dx <= 480; dx += 60) {
      if (Math.abs(dx - camera.x) <= 640) drawRectZ(ctx, camera, dx - 13, ry - 1.2, dx + 13, ry + 1.2, 0.32, '#facc15');
    }
  }

  for (let i = 0; i < cityMap.piers.length; i += 1) {
    const p = cityMap.piers[i];
    const halfL = p.length * 0.5;
    drawRectZ(ctx, camera, p.x, p.y - halfL, p.x + p.width, p.y + halfL, 1.5, '#78350f', '#d97706', 1.2);
  }

  for (let i = 0; i < cityMap.beachProps.length; i += 1) {
    const u = cityMap.beachProps[i];
    if (Math.hypot(u.x - camera.x, u.y - camera.y) > 480) continue;
    const r = u.radius * 0.7;
    drawRectZ(ctx, camera, u.x - r, u.y - r, u.x + r, u.y + r, 7, u.color, '#fff', 0.8);
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(10, 14, 24, 0.55)';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < skidmarks.length; i += 1) {
    const sk = skidmarks[i];
    if (sk.x1 !== undefined) {
      const p1 = projectPoint3D(camera, sk.x1, sk.y1, 0.35);
      const p2 = projectPoint3D(camera, sk.x2, sk.y2, 0.35);
      if (p1 && p2 && p1.depth < 420) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function renderOrientedBox3D(ctx, camera, x, y, zBase, length, width, height, angle, colors, stroke = null) {
  const verts = buildOrientedBoxVertices(x, y, zBase, length, width, height, angle);
  const projectedFaces = [];

  for (let f = 0; f < BOX_FACES.length; f += 1) {
    const face = BOX_FACES[f];
    const poly = clipAndProjectPolygon3D(camera, [
      verts[face.indices[0]],
      verts[face.indices[1]],
      verts[face.indices[2]],
      verts[face.indices[3]],
    ]);
    if (poly) {
      projectedFaces.push({
        poly,
        color: colors[face.shade] || colors.front,
      });
    }
  }

  projectedFaces.sort((a, b) => b.poly.depth - a.poly.depth);
  for (let i = 0; i < projectedFaces.length; i += 1) {
    fillPolygon(ctx, projectedFaces[i].poly, projectedFaces[i].color, stroke, 0.9);
  }
}

function renderBuilding3D(ctx, camera, b, playerDepth) {
  const hw = b.width * 0.5;
  const hd = b.depth * 0.5;
  const centerCS = worldToCameraSpace(camera, b.x, b.y, b.height * 0.4);
  const isOccludingPlayer = centerCS.camZ > 0 && centerCS.camZ < playerDepth - 12 && Math.abs(centerCS.camX) < b.width * 0.65;

  ctx.save();
  if (isOccludingPlayer) ctx.globalAlpha = 0.24;

  const shOffX = -Math.min(30, b.height * 0.2);
  const shOffY = Math.min(20, b.height * 0.14);
  drawQuad3D(ctx, camera, [b.x - hw + shOffX, b.y - hd + shOffY, 0.25], [b.x + hw, b.y - hd, 0.25], [b.x + hw, b.y + hd, 0.25], [b.x - hw + shOffX, b.y + hd + shOffY, 0.25], 'rgba(8, 11, 22, 0.4)');

  renderOrientedBox3D(ctx, camera, b.x, b.y, 0, b.width, b.depth, b.height, 0, {
    front: b.wallColor, back: b.wallColor, left: b.sideColor, right: b.sideColor, top: b.roofColor,
  }, b.trimColor);

  // Illuminated 3D architectural window bands & art-deco ledges on visible facades
  if (centerCS.camZ < 480) {
    const bandStep = 16;
    const insetW = hw * 0.82;
    const insetD = hd * 0.82;
    for (let z = 12; z < b.height - 6; z += bandStep) {
      const bandH = 5.5;
      if (camera.x > b.x + hw) {
        drawQuad3D(ctx, camera, [b.x + hw + 0.3, b.y - insetD, z], [b.x + hw + 0.3, b.y + insetD, z], [b.x + hw + 0.3, b.y + insetD, z + bandH], [b.x + hw + 0.3, b.y - insetD, z + bandH], b.windowColor);
      } else if (camera.x < b.x - hw) {
        drawQuad3D(ctx, camera, [b.x - hw - 0.3, b.y - insetD, z], [b.x - hw - 0.3, b.y + insetD, z], [b.x - hw - 0.3, b.y + insetD, z + bandH], [b.x - hw - 0.3, b.y - insetD, z + bandH], b.windowColor);
      }
      if (camera.y > b.y + hd) {
        drawQuad3D(ctx, camera, [b.x - insetW, b.y + hd + 0.3, z], [b.x + insetW, b.y + hd + 0.3, z], [b.x + insetW, b.y + hd + 0.3, z + bandH], [b.x - insetW, b.y + hd + 0.3, z + bandH], b.windowColor);
      } else if (camera.y < b.y - hd) {
        drawQuad3D(ctx, camera, [b.x - insetW, b.y - hd - 0.3, z], [b.x + insetW, b.y - hd - 0.3, z], [b.x + insetW, b.y - hd - 0.3, z + bandH], [b.x - insetW, b.y - hd - 0.3, z + bandH], b.windowColor);
      }
    }
  }

  if (b.hasSetback) {
    const tierH = Math.round(b.height * 0.22);
    renderOrientedBox3D(ctx, camera, b.x, b.y, b.height, b.width * 0.6, b.depth * 0.6, tierH, 0, {
      front: b.sideColor, back: b.sideColor, left: b.wallColor, right: b.wallColor, top: b.trimColor,
    }, '#f8fafc');
  } else if (b.hasPool) {
    drawQuad3D(ctx, camera, [b.x - hw * 0.55, b.y - hd * 0.55, b.height + 0.4], [b.x + hw * 0.55, b.y - hd * 0.55, b.height + 0.4], [b.x + hw * 0.55, b.y + hd * 0.55, b.height + 0.4], [b.x - hw * 0.55, b.y + hd * 0.55, b.height + 0.4], '#06b6d4', '#e0f2fe', 1);
  }

  if (b.signText && !isOccludingPlayer) {
    const topZ = b.hasSetback ? b.height * 1.22 + 7 : b.height + 7;
    const signPt = projectPoint3D(camera, b.x, b.y, topZ);
    if (signPt && signPt.depth > 75 && signPt.depth < 460 && signPt.y > 115 && signPt.y < camera.viewportHeight - 130) {
      const fontSize = Math.max(9, Math.min(13, Math.round(2.4 * signPt.scale)));
      ctx.font = `800 ${fontSize}px system-ui, sans-serif`;
      const textW = ctx.measureText(b.signText).width;
      ctx.fillStyle = 'rgba(11, 15, 28, 0.88)';
      ctx.strokeStyle = b.trimColor;
      ctx.lineWidth = 1.4;
      ctx.fillRect(signPt.x - textW * 0.5 - 5, signPt.y - fontSize * 0.65 - 2, textW + 10, fontSize + 4);
      ctx.strokeRect(signPt.x - textW * 0.5 - 5, signPt.y - fontSize * 0.65 - 2, textW + 10, fontSize + 4);
      ctx.fillStyle = b.windowColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.signText, signPt.x, signPt.y);
    }
  }
  ctx.restore();
}

function renderPalmTree3D(ctx, camera, tree, simTime) {
  const basePt = projectPoint3D(camera, tree.x, tree.y, 0);
  if (!basePt || basePt.depth < 28 || basePt.depth > 520) return;

  const sway = Math.sin(simTime * 2.1 + tree.seed * 10) * 1.6;
  const topX = tree.x + tree.lean * 9 + sway;
  const topY = tree.y + sway * 0.4;
  const midPt = projectPoint3D(camera, tree.x + tree.lean * 4, tree.y, tree.height * 0.52);
  const topPt = projectPoint3D(camera, topX, topY, tree.height);
  if (!midPt || !topPt) return;

  // Curved palm trunk (true 1:1 world meter thickness)
  ctx.save();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = Math.max(1.5, Math.min(9, 1.6 * basePt.scale));
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(basePt.x, basePt.y);
  ctx.quadraticCurveTo(midPt.x, midPt.y, topPt.x, topPt.y);
  ctx.stroke();

  // Radiating tropical fronds in 3D (true 1:1 meter thickness)
  const frondCount = 7;
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = Math.max(1.2, Math.min(6, 1.3 * topPt.scale));
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

export function renderVehicleMesh3D(ctx, camera, v) {
  const centerPt = projectPoint3D(camera, v.x, v.y, 4);
  if (!centerPt || centerPt.depth > 640) return;

  const cos = Math.cos(v.angle);
  const sin = Math.sin(v.angle);
  const hl = v.length * 0.5;
  const hw = v.width * 0.5;
  const vPt = (lx, ly, z) => [v.x + lx * cos - ly * sin, v.y + lx * sin + ly * cos, z];

  if (!v.destroyed && !v.isBoat) {
    drawQuad3D(ctx, camera, vPt(hl, -hw * 0.7, 0.35), vPt(hl, hw * 0.7, 0.35), vPt(hl + 38, hw * 1.7, 0.35), vPt(hl + 38, -hw * 1.7, 0.35), 'rgba(254, 240, 138, 0.14)');
  }

  const shadowVerts = buildOrientedBoxVertices(v.x, v.y, 0.3, v.length * 1.08, v.width * 1.1, 0.2, v.angle);
  const shadowPoly = clipAndProjectPolygon3D(camera, [shadowVerts[0], shadowVerts[1], shadowVerts[2], shadowVerts[3]]);
  fillPolygon(ctx, shadowPoly, v.nitroActive ? 'rgba(37, 244, 238, 0.52)' : v.isBoat ? 'rgba(224, 242, 254, 0.45)' : 'rgba(6, 9, 18, 0.58)');

  const darkFaces = { front: '#090d16', back: '#090d16', left: '#1e293b', right: '#1e293b', top: '#090d16' };
  if (!v.isBoat) {
    const wheelOffsets = [[hl * 0.62, -hw * 0.94], [hl * 0.62, hw * 0.94], [-hl * 0.62, -hw * 0.94], [-hl * 0.62, hw * 0.94]];
    for (let wIdx = 0; wIdx < wheelOffsets.length; wIdx += 1) {
      const [ox, oy] = wheelOffsets[wIdx];
      renderOrientedBox3D(ctx, camera, v.x + ox * cos - oy * sin, v.y + ox * sin + oy * cos, 0.2, 7.5, 3.2, 4.2, v.angle + (wIdx < 2 ? v.steerAngle * 0.5 : 0), darkFaces);
    }
  }

  const bodyH = v.height * 0.54;
  const cabinH = v.height * 0.46;
  const bodyColor = v.destroyed ? '#1f2937' : v.color;
  const solidColor = (c) => ({ front: c, back: c, left: c, right: c, top: c });

  renderOrientedBox3D(ctx, camera, v.x, v.y, 1.8, v.length, v.width, bodyH, v.angle, solidColor(bodyColor), '#0f172a');

  if (v.stripeColor || v.isPolice) {
    drawQuad3D(ctx, camera, vPt(hl * 0.92, -hw * 0.28, 1.95 + bodyH), vPt(hl * 0.92, hw * 0.28, 1.95 + bodyH), vPt(-hl * 0.92, hw * 0.28, 1.95 + bodyH), vPt(-hl * 0.92, -hw * 0.28, 1.95 + bodyH), v.isPolice ? '#f8fafc' : v.stripeColor);
  }

  if (!v.convertible && !v.isBoat) {
    const cabinOffset = -v.length * 0.07;
    renderOrientedBox3D(ctx, camera, v.x + cos * cabinOffset, v.y + sin * cabinOffset, 1.8 + bodyH, v.length * 0.52, v.width * 0.82, cabinH, v.angle, { front: '#0284c7', back: '#0f172a', left: '#1e293b', right: '#1e293b', top: v.isPolice ? '#f8fafc' : bodyColor }, '#0f172a');
  } else {
    renderOrientedBox3D(ctx, camera, v.x - cos * (v.length * 0.05), v.y - sin * (v.length * 0.05), 1.8 + bodyH, v.length * 0.44, v.width * 0.76, 1.6, v.angle, darkFaces);
  }

  if (v.specId === 'mako_gtr' || v.specId === 'sbpd_interceptor') {
    renderOrientedBox3D(ctx, camera, v.x - cos * (hl * 0.86), v.y - sin * (hl * 0.86), 2.2 + bodyH, 3.5, v.width * 0.92, 2.0, v.angle, { ...darkFaces, top: v.color });
  }

  const lw = hw * 0.36;
  drawQuad3D(ctx, camera, vPt(hl, hw * 0.82, 3.2), vPt(hl, hw * 0.82 - lw, 3.2), vPt(hl, hw * 0.82 - lw, 5.2), vPt(hl, hw * 0.82, 5.2), '#fef08a');
  drawQuad3D(ctx, camera, vPt(hl, -hw * 0.82 + lw, 3.2), vPt(hl, -hw * 0.82, 3.2), vPt(hl, -hw * 0.82, 5.2), vPt(hl, -hw * 0.82 + lw, 5.2), '#fef08a');

  const tailColor = v.braking ? '#ff1744' : '#dc2626';
  drawQuad3D(ctx, camera, vPt(-hl - 0.2, hw * 0.82, 3.4), vPt(-hl - 0.2, -hw * 0.82, 3.4), vPt(-hl - 0.2, -hw * 0.82, 5.4), vPt(-hl - 0.2, hw * 0.82, 5.4), tailColor);

  if (v.isPolice && !v.destroyed) {
    const roofZ = 1.9 + v.height;
    const redBright = Math.sin(v.sirenPhase) > 0;
    const colL = redBright ? '#ff1744' : '#2979ff';
    const colR = redBright ? '#2979ff' : '#ff1744';
    const lx = v.x - sin * (hw * 0.35);
    const ly = v.y + cos * (hw * 0.35);
    const rx = v.x + sin * (hw * 0.35);
    const ry = v.y - cos * (hw * 0.35);

    renderOrientedBox3D(ctx, camera, lx, ly, roofZ, 3.4, hw * 0.65, 2.2, v.angle, solidColor(colL));
    renderOrientedBox3D(ctx, camera, rx, ry, roofZ, 3.4, hw * 0.65, 2.2, v.angle, solidColor(colR));

    const barL = projectPoint3D(camera, lx, ly, roofZ + 1.2);
    const barR = projectPoint3D(camera, rx, ry, roofZ + 1.2);
    if (barL && barR) {
      ctx.save();
      ctx.globalAlpha = 0.48;
      const glowR = Math.max(4, Math.min(20, 3.8 * barL.scale));
      ctx.fillStyle = colL;
      ctx.beginPath();
      ctx.arc(barL.x, barL.y, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colR;
      ctx.beginPath();
      ctx.arc(barR.x, barR.y, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export function renderCharacterMesh3D(ctx, camera, char, isPlayer = false) {
  const footPt = projectPoint3D(camera, char.x, char.y, 0.3);
  const torsoPt = projectPoint3D(camera, char.x, char.y, 7.5);
  const headPt = projectPoint3D(camera, char.x, char.y, 13.5);
  if (!footPt || !torsoPt || !headPt || footPt.depth < 18 || footPt.depth > 480) return;

  const s = Math.max(0.4, Math.min(6.5, torsoPt.scale));
  const stride = Math.sin(char.walkCycle || 0) * 2.2 * s;

  ctx.save();
  ctx.fillStyle = isPlayer ? 'rgba(37, 244, 238, 0.42)' : 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(footPt.x, footPt.y, 4.2 * s, 2.1 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isPlayer ? '#1e293b' : (char.pantsColor || '#1e293b');
  ctx.lineWidth = Math.max(1.6, 2.0 * s);
  ctx.beginPath();
  ctx.moveTo(torsoPt.x - 1.5 * s, torsoPt.y + 1.5 * s);
  ctx.lineTo(footPt.x - 1.5 * s + stride, footPt.y);
  ctx.moveTo(torsoPt.x + 1.5 * s, torsoPt.y + 1.5 * s);
  ctx.lineTo(footPt.x + 1.5 * s - stride, footPt.y);
  ctx.stroke();

  ctx.fillStyle = isPlayer ? '#ff2a78' : (char.shirtColor || '#38bdf8');
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(torsoPt.x - 3.6 * s, torsoPt.y - 3.8 * s, 7.2 * s, 7.2 * s, 1.8 * s);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isPlayer ? '#f1c27d' : (char.skinColor || '#e0ac69');
  ctx.beginPath();
  ctx.arc(headPt.x, headPt.y, 2.6 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isPlayer ? '#1e1024' : (char.hairColor || '#111827');
  ctx.beginPath();
  ctx.arc(headPt.x, headPt.y - 0.8 * s, 2.6 * s, Math.PI, Math.PI * 2);
  ctx.fill();

  const aimAngle = char.aimAngle ?? char.angle ?? 0;
  const gunTip = projectPoint3D(camera, char.x + Math.cos(aimAngle) * 9, char.y + Math.sin(aimAngle) * 9, 8.5);
  if (gunTip) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = Math.max(1.4, 1.7 * s);
    ctx.beginPath();
    ctx.moveTo(torsoPt.x, torsoPt.y - 0.5 * s);
    ctx.lineTo(gunTip.x, gunTip.y);
    ctx.stroke();
    if (isPlayer && char.muzzleFlashTimer > 0) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(gunTip.x, gunTip.y, 1.8 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (!isPlayer && (char.role === 'syndicate' || char.role === 'police')) {
    const barW = Math.max(18, 12 * s);
    const ratio = Math.max(0, char.health / char.maxHealth);
    ctx.fillStyle = 'rgba(11, 15, 28, 0.85)';
    ctx.fillRect(headPt.x - barW * 0.5, headPt.y - 7.5 * s, barW, 3.2);
    ctx.fillStyle = char.role === 'police' ? '#38bdf8' : '#f43f5e';
    ctx.fillRect(headPt.x - barW * 0.5, headPt.y - 7.5 * s, barW * ratio, 3.2);
  }
  ctx.restore();
}

function renderMissionBeacon3D(ctx, camera, wx, wy, color, label, simTime) {
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

function renderPoliceChopper3D(ctx, camera, chopper) {
  if (!chopper.active) return;
  const groundPt = projectPoint3D(camera, chopper.spotlightX, chopper.spotlightY, 0.5);
  const heliPt = projectPoint3D(camera, chopper.x, chopper.y, chopper.z);

  if (groundPt && heliPt) {
    ctx.save();
    const coneGrad = ctx.createLinearGradient(heliPt.x, heliPt.y, groundPt.x, groundPt.y);
    coneGrad.addColorStop(0, 'rgba(254, 240, 138, 0.34)');
    coneGrad.addColorStop(1, 'rgba(254, 240, 138, 0.12)');
    ctx.fillStyle = coneGrad;
    const spotR = Math.max(18, Math.min(95, 24 * groundPt.scale));
    ctx.beginPath();
    ctx.moveTo(heliPt.x - 4, heliPt.y);
    ctx.lineTo(heliPt.x + 4, heliPt.y);
    ctx.lineTo(groundPt.x + spotR, groundPt.y);
    ctx.lineTo(groundPt.x - spotR, groundPt.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(254, 249, 195, 0.2)';
    ctx.beginPath();
    ctx.ellipse(groundPt.x, groundPt.y, spotR, spotR * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (heliPt) {
    renderOrientedBox3D(ctx, camera, chopper.x, chopper.y, chopper.z - 5, 24, 10, 8, chopper.angle, {
      front: '#0f172a', back: '#1e293b', left: '#1e3a8a', right: '#1e3a8a', top: '#f8fafc',
    }, '#38bdf8');
    const rLen = Math.max(14, Math.min(72, 18 * heliPt.scale));
    ctx.save();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.82)';
    ctx.lineWidth = 2.2;
    const rx = Math.cos(chopper.rotorAngle) * rLen;
    const ry = Math.sin(chopper.rotorAngle) * rLen * 0.42;
    ctx.beginPath();
    ctx.moveTo(heliPt.x - rx, heliPt.y - ry);
    ctx.lineTo(heliPt.x + rx, heliPt.y + ry);
    ctx.moveTo(heliPt.x + ry, heliPt.y - rx * 0.42);
    ctx.lineTo(heliPt.x - ry, heliPt.y + rx * 0.42);
    ctx.stroke();
    ctx.restore();
  }
}

export function createWorldRenderer() {
  function renderWorld(ctx, worldState) {
    const { camera, cityMap, player, vehicles, pedestrians, cashDrops, skidmarks, missions, wanted, combat, simTime } = worldState;

    renderSkyAndHorizon(ctx, camera, simTime);
    renderGroundOceanAndRoads3D(ctx, camera, cityMap, skidmarks, simTime);

    const playerDepth = worldToCameraSpace(camera, player.x, player.y, 8).camZ;
    const drawList = [];

    for (let i = 0; i < cityMap.buildings.length; i += 1) {
      const b = cityMap.buildings[i];
      if (Math.hypot(b.x - camera.x, b.y - camera.y) > 740) continue;
      const cs = worldToCameraSpace(camera, b.x, b.y, b.height * 0.5);
      if (cs.camZ > 15) drawList.push({ depth: cs.camZ, kind: 'building', item: b });
    }
    for (let i = 0; i < cityMap.palmTrees.length; i += 1) {
      const t = cityMap.palmTrees[i];
      if (Math.hypot(t.x - camera.x, t.y - camera.y) > 520) continue;
      const cs = worldToCameraSpace(camera, t.x, t.y, t.height * 0.5);
      if (cs.camZ > 24) drawList.push({ depth: cs.camZ, kind: 'palm', item: t });
    }
    for (let i = 0; i < vehicles.length; i += 1) {
      const v = vehicles[i];
      if (Math.hypot(v.x - camera.x, v.y - camera.y) > 640) continue;
      const cs = worldToCameraSpace(camera, v.x, v.y, 6);
      if (cs.camZ > 12) drawList.push({ depth: cs.camZ, kind: 'vehicle', item: v });
    }
    for (let i = 0; i < pedestrians.length; i += 1) {
      const p = pedestrians[i];
      if (!p.alive || Math.hypot(p.x - camera.x, p.y - camera.y) > 480) continue;
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
      if (cs.camZ > 22 && cs.camZ < 480) drawList.push({ depth: cs.camZ, kind: 'landmark', item: lm });
    }

    drawList.sort((a, b) => b.depth - a.depth);
    for (let i = 0; i < drawList.length; i += 1) {
      const e = drawList[i];
      if (e.kind === 'building') renderBuilding3D(ctx, camera, e.item, playerDepth);
      else if (e.kind === 'palm') renderPalmTree3D(ctx, camera, e.item, simTime);
      else if (e.kind === 'vehicle') renderVehicleMesh3D(ctx, camera, e.item);
      else if (e.kind === 'ped') renderCharacterMesh3D(ctx, camera, e.item, false);
      else if (e.kind === 'player') renderCharacterMesh3D(ctx, camera, e.item, true);
      else if (e.kind === 'waypoint') renderMissionBeacon3D(ctx, camera, e.item.x, e.item.y, '#facc15', e.item.act, simTime);
      else if (e.kind === 'landmark') renderMissionBeacon3D(ctx, camera, e.item.x, e.item.y, e.item.color, null, simTime);
    }

    for (let i = 0; i < cashDrops.length; i += 1) {
      const drop = cashDrops[i];
      const pt = projectPoint3D(camera, drop.x, drop.y, 2.0);
      if (pt && pt.depth < 380) {
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#bbf7d0';
        ctx.lineWidth = 1.2;
        ctx.fillRect(pt.x - 5, pt.y - 3, 10, 6);
        ctx.strokeRect(pt.x - 5, pt.y - 3, 10, 6);
      }
    }

    for (let i = 0; i < combat.projectiles.length; i += 1) {
      const b = combat.projectiles[i];
      const head = projectPoint3D(camera, b.x, b.y, b.z);
      const tail = projectPoint3D(camera, b.x - b.vx * 0.025, b.y - b.vy * 0.025, b.z);
      if (head && tail) {
        ctx.save();
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(head.x, head.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    for (let i = 0; i < combat.particles.length; i += 1) {
      const p = combat.particles[i];
      const pt = projectPoint3D(camera, p.x, p.y, p.z);
      if (pt && pt.depth > 15 && pt.depth < 520) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.ttl / p.maxTtl);
        ctx.fillStyle = p.color;
        const r = Math.max(1.5, Math.min(18, p.size * 0.45 * pt.scale));
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < combat.explosions.length; i += 1) {
      const ex = combat.explosions[i];
      const pt = projectPoint3D(camera, ex.x, ex.y, ex.z);
      if (pt && pt.depth > 15) {
        ctx.save();
        const r = Math.max(10, Math.min(95, ex.radius * 0.55 * pt.scale));
        const grad = ctx.createRadialGradient(pt.x, pt.y, r * 0.15, pt.x, pt.y, r);
        grad.addColorStop(0, 'rgba(255, 251, 235, 0.95)');
        grad.addColorStop(0.45, 'rgba(249, 115, 22, 0.78)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    renderPoliceChopper3D(ctx, camera, wanted.helicopter);

    for (let i = 0; i < combat.floatingTexts.length; i += 1) {
      const ft = combat.floatingTexts[i];
      const pt = projectPoint3D(camera, ft.x, ft.y, ft.z);
      if (pt && pt.y > 105) {
        ctx.save();
        ctx.font = '800 13px system-ui, sans-serif';
        ctx.strokeStyle = 'rgba(9, 12, 22, 0.9)';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(ft.text, pt.x, pt.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, pt.x, pt.y);
        ctx.restore();
      }
    }
  }

  return { renderWorld };
}
