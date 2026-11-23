// High-resolution procedural CanvasTexture generator for Solaria Bay's Art Deco facades,
// glass skyscrapers, asphalt roads, crosswalks, tiled sidewalks, beach sand, awnings, and signage.

import * as THREE from 'three';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

function toTexture(canvas, repeatX = 1, repeatY = 1, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function buildArtDecoFacade(baseHex, trimHex, accentHex, litRatio = 0.55) {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle sun-baked stucco grain
  for (let i = 0; i < 900; i += 1) {
    const x = (i * 97) % 512;
    const y = (i * 193) % 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(60,30,20,0.05)';
    ctx.fillRect(x, y, 4, 4);
  }

  // Horizontal Art Deco cornices & pastel trim bands
  ctx.fillStyle = trimHex;
  for (let row = 0; row < 6; row += 1) {
    const y = row * 85;
    ctx.fillRect(0, y, 512, 9);
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, y + 9, 512, 3);
    ctx.fillStyle = trimHex;
  }

  // Vertical Art Deco pilasters
  for (let col = 0; col < 8; col += 1) {
    const x = col * 64;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x + 2, 0, 6, 512);
    ctx.fillStyle = 'rgba(20,15,30,0.12)';
    ctx.fillRect(x + 8, 0, 3, 512);
  }

  // Multi-pane recessed windows with sunset sky reflections & warm lit interiors
  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const wx = col * 64 + 14;
      const wy = row * 85 + 18;
      const ww = 38;
      const wh = 54;
      const hash = ((row * 31 + col * 17 + baseHex.charCodeAt(1)) % 100) / 100;
      const isLit = hash < litRatio;

      // Recessed sill shadow
      ctx.fillStyle = 'rgba(18, 22, 34, 0.55)';
      ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);

      const grad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
      if (isLit) {
        grad.addColorStop(0, '#fde68a');
        grad.addColorStop(0.55, '#fb923c');
        grad.addColorStop(1, '#7c2d12');
      } else {
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.45, '#1e3a5f');
        grad.addColorStop(1, '#0f172a');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(wx, wy, ww, wh);

      // Diagonal sun glare & mullions
      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
      ctx.beginPath();
      ctx.moveTo(wx + 2, wy + 2);
      ctx.lineTo(wx + 16, wy + 2);
      ctx.lineTo(wx + 2, wy + 22);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = trimHex;
      ctx.fillRect(wx + ww * 0.5 - 1.5, wy, 3, wh);
      ctx.fillRect(wx, wy + wh * 0.45, ww, 3);
      // Balcony railing bar
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(wx - 3, wy + wh - 6, ww + 6, 4);
    }
  }
  return toTexture(canvas, 1, 1);
}

function buildGlassTowerFacade(tintTop, tintBot, glowColor) {
  const { canvas, ctx } = makeCanvas(512, 512);
  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, tintTop);
  bg.addColorStop(1, tintBot);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  for (let row = 0; row < 12; row += 1) {
    const y = row * 42.6;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, y, 512, 7);
    for (let col = 0; col < 10; col += 1) {
      const x = col * 51.2;
      const h = ((row * 19 + col * 37) % 100) / 100;
      if (h < 0.44) {
        ctx.fillStyle = h < 0.16 ? glowColor : 'rgba(254, 240, 138, 0.52)';
        ctx.fillRect(x + 4, y + 9, 43, 30);
      } else {
        const refl = ctx.createLinearGradient(x, y + 9, x + 44, y + 38);
        refl.addColorStop(0, 'rgba(255, 195, 130, 0.32)');
        refl.addColorStop(0.5, 'rgba(56, 189, 248, 0.18)');
        refl.addColorStop(1, 'rgba(15, 23, 42, 0.45)');
        ctx.fillStyle = refl;
        ctx.fillRect(x + 4, y + 9, 43, 30);
      }
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(x, y, 4, 43);
    }
  }
  return toTexture(canvas, 1, 1);
}

function buildWarehouseFacade() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#7c8594';
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 8) {
    ctx.fillStyle = x % 16 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.18)';
    ctx.fillRect(x, 0, 4, 256);
  }
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 196, 256, 16);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(26, 40, 74, 44);
  ctx.fillRect(152, 40, 74, 44);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(32, 46, 62, 32);
  ctx.fillRect(158, 46, 62, 32);
  return toTexture(canvas, 1, 1);
}

function buildRoadTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = '#252a34';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2800; i += 1) {
    const x = (i * 73) % 512;
    const y = (i * 151) % 512;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(x, y, 3, 3);
  }
  // Asphalt tire wear bands
  ctx.fillStyle = 'rgba(15, 18, 25, 0.25)';
  ctx.fillRect(92, 0, 54, 512);
  ctx.fillRect(366, 0, 54, 512);
  // Crisp white edge lines
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(20, 0, 7, 512);
  ctx.fillRect(485, 0, 7, 512);
  // Dashed lane separators
  ctx.fillStyle = 'rgba(241, 245, 249, 0.78)';
  for (let y = 16; y < 512; y += 96) {
    ctx.fillRect(138, y, 6, 48);
    ctx.fillRect(368, y, 6, 48);
  }
  // Iconic double-yellow centerline
  ctx.fillStyle = '#facc15';
  ctx.fillRect(247, 0, 7, 512);
  ctx.fillRect(258, 0, 7, 512);
  return toTexture(canvas, 1, 1);
}

function buildIntersectionTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = '#242933';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1800; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.07)';
    ctx.fillRect((i * 89) % 512, (i * 137) % 512, 3, 3);
  }
  // White zebra crosswalk bars on all 4 sides
  ctx.fillStyle = '#f1f5f9';
  for (let k = 62; k <= 420; k += 44) {
    ctx.fillRect(k, 16, 24, 56);
    ctx.fillRect(k, 440, 24, 56);
    ctx.fillRect(16, k, 56, 24);
    ctx.fillRect(440, k, 56, 24);
  }
  return toTexture(canvas, 1, 1);
}

function buildSidewalkTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#dfd5c5';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(105, 92, 78, 0.35)';
  ctx.lineWidth = 3;
  for (let g = 0; g <= 256; g += 64) {
    ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(256, g); ctx.stroke();
  }
  // Subtle warm terracotta mosaic accent tile dots
  ctx.fillStyle = 'rgba(225, 112, 85, 0.25)';
  for (let y = 32; y < 256; y += 64) {
    for (let x = 32; x < 256; x += 64) {
      ctx.fillRect(x - 6, y - 6, 12, 12);
    }
  }
  return toTexture(canvas, 1, 1);
}

function buildSandTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#f1d59c';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i += 1) {
    const x = (i * 61) % 256;
    const y = (i * 113) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,248,225,0.32)' : 'rgba(186,142,78,0.22)';
    ctx.fillRect(x, y, 3, 2);
  }
  ctx.strokeStyle = 'rgba(205, 165, 102, 0.2)';
  ctx.lineWidth = 2;
  for (let y = 12; y < 256; y += 22) {
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 32) {
      ctx.lineTo(x, y + Math.sin(x * 0.05 + y) * 3);
    }
    ctx.stroke();
  }
  return toTexture(canvas, 6, 18);
}

function buildWoodPlanksTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#9a6b43';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 24) {
    ctx.fillStyle = y % 48 === 0 ? '#8c5d37' : '#a8764b';
    ctx.fillRect(0, y, 256, 22);
    ctx.fillStyle = '#4a2e19';
    ctx.fillRect(0, y + 22, 256, 2);
  }
  return toTexture(canvas, 4, 2);
}

function buildAwningTexture(colorA, colorB) {
  const { canvas, ctx } = makeCanvas(256, 128);
  for (let x = 0; x < 256; x += 32) {
    ctx.fillStyle = (x / 32) % 2 === 0 ? colorA : colorB;
    ctx.fillRect(x, 0, 32, 128);
  }
  return toTexture(canvas, 1, 1);
}

function buildHelipadTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(128, 128, 96, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(82, 68, 22, 120);
  ctx.fillRect(152, 68, 22, 120);
  ctx.fillRect(82, 118, 92, 22);
  return toTexture(canvas, 1, 1);
}

export function createSignTexture(text, bgHex, fgHex, borderHex = '#fde68a') {
  const { canvas, ctx } = makeCanvas(512, 128);
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.font = '900 50px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = fgHex;
  ctx.shadowBlur = 16;
  ctx.fillStyle = fgHex;
  ctx.fillText(text, 256, 66);
  return toTexture(canvas, 1, 1);
}

export function createProceduralTexturePack() {
  return {
    coralDeco: buildArtDecoFacade('#f59aa8', '#fff5eb', '#2dd4bf', 0.62),
    creamDeco: buildArtDecoFacade('#f6e7d2', '#ffffff', '#ff6b8b', 0.56),
    mintDeco: buildArtDecoFacade('#9de3d0', '#f8fafc', '#fbbf24', 0.52),
    peachDeco: buildArtDecoFacade('#f6b98e', '#fff7ed', '#38bdf8', 0.58),
    mirageDeco: buildArtDecoFacade('#2e2554', '#c084fc', '#22d3ee', 0.78),
    glassCobalt: buildGlassTowerFacade('#1e4d7b', '#0f243d', 'rgba(251, 191, 36, 0.75)'),
    glassAmber: buildGlassTowerFacade('#3b4e6b', '#1b273b', 'rgba(56, 189, 248, 0.72)'),
    brisaTerracotta: buildArtDecoFacade('#e08a6b', '#fef3c7', '#fb7185', 0.5),
    warehouse: buildWarehouseFacade(),
    road: buildRoadTexture(),
    intersection: buildIntersectionTexture(),
    sidewalk: buildSidewalkTexture(),
    sand: buildSandTexture(),
    wood: buildWoodPlanksTexture(),
    awningCoral: buildAwningTexture('#ff5e78', '#fff7ed'),
    awningTeal: buildAwningTexture('#14b8a6', '#f8fafc'),
    helipad: buildHelipadTexture(),
    signs: {
      hotelSolaria: createSignTexture('HOTEL SOLARIA', '#1f1024', '#ff99b6', '#22d3ee'),
      bancoSolaria: createSignTexture('BANCO SOLARIA', '#0d1b2e', '#fde047', '#38bdf8'),
      solariaCustoms: createSignTexture('SOLARIA CUSTOMS', '#1c1917', '#fbbf24', '#ff5e78'),
      mirageLounge: createSignTexture('MIRAGE LOUNGE', '#1a0b2e', '#e879f9', '#22d3ee'),
      cafeBrisa: createSignTexture('CAFE BRISA', '#0c2d2a', '#5eead4', '#fbbf24'),
      skyRingPier: createSignTexture('SKY-RING PIER', '#0f172a', '#38bdf8', '#fb7185'),
    },
  };
}
