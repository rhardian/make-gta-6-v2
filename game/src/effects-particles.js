// Soft feathered sprite VFX system: volumetric tire drift smoke, blazing fireballs,
// dark smoke plumes, glowing muzzle flash starbursts, ramming sparks, bullet tracers, and skidmarks.

import * as THREE from 'three';

function createRadialSpriteTexture(mode) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const cx = 64;
  const cy = 64;

  if (mode === 'smoke') {
    for (let i = 0; i < 6; i += 1) {
      const ox = cx + Math.cos(i * 1.15) * 14;
      const oy = cy + Math.sin(i * 1.15) * 14;
      const g = ctx.createRadialGradient(ox, oy, 2, ox, oy, 46);
      g.addColorStop(0, 'rgba(255,255,255,0.42)');
      g.addColorStop(0.5, 'rgba(240,245,255,0.18)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ox, oy, 48, 0, Math.PI * 2); ctx.fill();
    }
  } else if (mode === 'fire') {
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 60);
    g.addColorStop(0, 'rgba(255,252,220,1)');
    g.addColorStop(0.32, 'rgba(255,190,65,0.92)');
    g.addColorStop(0.65, 'rgba(240,78,24,0.55)');
    g.addColorStop(1, 'rgba(180,20,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  } else if (mode === 'star') {
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 56);
    g.addColorStop(0, 'rgba(255,255,245,1)');
    g.addColorStop(0.25, 'rgba(255,220,120,0.85)');
    g.addColorStop(0.6, 'rgba(255,140,40,0.22)');
    g.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = 'rgba(255,255,235,0.9)';
    for (let k = 0; k < 4; k += 1) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((k * Math.PI) / 4);
      ctx.fillRect(-52, -2.5, 104, 5);
      ctx.restore();
    }
  } else {
    // Soft lens-flare bloom glow
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 62);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const SHARED_FLARE_TEX = createRadialSpriteTexture('glow');

export function createEffectsSystem(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const smokeTex = createRadialSpriteTexture('smoke');
  const fireTex = createRadialSpriteTexture('fire');
  const starTex = createRadialSpriteTexture('star');

  const particles = [];
  const tracers = [];
  const skidmarks = [];
  const flashes = [];
  const floatingNums = [];

  const sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.78);
  const skidGeo = new THREE.PlaneGeometry(0.46, 2.3);
  skidGeo.rotateX(-Math.PI / 2);
  const skidMat = new THREE.MeshBasicMaterial({ color: '#0c0f15', transparent: true, opacity: 0.56, depthWrite: false });

  const fxLight = new THREE.PointLight('#ff9a3c', 0, 42);
  scene.add(fxLight);

  function spawnParticle(x, y, z, vx, vy, vz, size, color, life, opts = {}) {
    if (particles.length > 260) {
      const old = particles.shift();
      group.remove(old.mesh);
      old.mesh.material.dispose();
    }
    let mesh;
    if (opts.spark) {
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: opts.opacity ?? 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      mesh = new THREE.Mesh(sparkGeo, mat);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(size);
      mesh.lookAt(x + vx, y + vy, z + vz);
    } else {
      const tex = opts.kind === 'fire' ? fireTex : opts.kind === 'glow' ? SHARED_FLARE_TEX : smokeTex;
      const mat = new THREE.SpriteMaterial({
        map: tex,
        color,
        transparent: true,
        opacity: opts.opacity ?? 0.65,
        blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
      });
      mesh = new THREE.Sprite(mat);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(size * 2.2);
    }
    group.add(mesh);
    particles.push({
      mesh, vx, vy, vz, life, maxLife: life,
      isSprite: !opts.spark,
      grow: opts.grow ?? 1.6,
      gravity: opts.gravity ?? 0,
      baseOpacity: opts.opacity ?? 0.65,
      size: opts.spark ? size : size * 2.2,
    });
  }

  function spawnDriftSmoke(x, y, z, count = 2, spread = 0.85) {
    for (let i = 0; i < count; i += 1) {
      const ox = (Math.random() - 0.5) * spread;
      const oz = (Math.random() - 0.5) * spread;
      spawnParticle(
        x + ox, y + 0.48, z + oz,
        (Math.random() - 0.5) * 1.8, 1.1 + Math.random() * 1.2, (Math.random() - 0.5) * 1.8,
        0.95 + Math.random() * 0.65, '#f1f5f9', 0.72 + Math.random() * 0.35,
        { kind: 'smoke', opacity: 0.42, grow: 2.3, gravity: -0.35 },
      );
    }
  }

  function spawnSparks(x, y, z, count = 12, color = '#fde047') {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const spd = 6 + Math.random() * 15;
      spawnParticle(
        x, y, z,
        Math.cos(a) * spd, 2.8 + Math.random() * 7.5, Math.sin(a) * spd,
        0.75 + Math.random() * 0.45, i % 3 === 0 ? '#ffffff' : color, 0.3 + Math.random() * 0.25,
        { spark: true, additive: true, opacity: 0.96, grow: 0.45, gravity: 18 },
      );
    }
  }

  function spawnMuzzleFlash(x, y, z, color = '#ffe599', scale = 1.0) {
    const mat = new THREE.SpriteMaterial({
      map: starTex, color, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Sprite(mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(1.35 * scale);
    group.add(mesh);
    flashes.push({ mesh, life: 0.085, maxLife: 0.085 });
    fxLight.color.set(color);
    fxLight.position.set(x, y + 0.4, z);
    fxLight.intensity = 10;
  }

  function spawnTracer(p0, p1, color = '#fde047', thickness = 0.075, life = 0.14) {
    const diff = new THREE.Vector3().subVectors(p1, p0);
    const len = Math.max(0.2, diff.length());
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const geo = new THREE.BoxGeometry(thickness, thickness, len);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(p0).add(p1).multiplyScalar(0.5);
    mesh.lookAt(p1);
    group.add(mesh);
    tracers.push({ mesh, life, maxLife: life });
  }

  function spawnExplosion(x, y, z, scale = 1.0) {
    for (let i = 0; i < 14; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const spd = (1.0 + Math.random() * 4.5) * scale;
      const col = i < 4 ? '#fff6cc' : i < 10 ? '#ff942e' : '#f43f5e';
      spawnParticle(
        x + (Math.random() - 0.5) * 1.8 * scale,
        y + 0.7 + Math.random() * 1.6 * scale,
        z + (Math.random() - 0.5) * 1.8 * scale,
        Math.cos(a) * spd, (2.2 + Math.random() * 4.2) * scale, Math.sin(a) * spd,
        (1.15 + Math.random() * 0.9) * scale, col, 0.55 + Math.random() * 0.45,
        { kind: 'fire', additive: true, opacity: 0.88, grow: 1.85, gravity: -1.2 },
      );
    }
    for (let i = 0; i < 10; i += 1) {
      const a = Math.random() * Math.PI * 2;
      spawnParticle(
        x + Math.cos(a) * 1.3 * scale, y + 2.2 * scale, z + Math.sin(a) * 1.3 * scale,
        Math.cos(a) * 1.6 * scale, (3.0 + Math.random() * 2.8) * scale, Math.sin(a) * 1.6 * scale,
        (1.4 + Math.random() * 0.9) * scale, '#2b303c', 1.25 + Math.random() * 0.7,
        { kind: 'smoke', opacity: 0.48, grow: 2.1, gravity: -0.7 },
      );
    }
    spawnSparks(x, y + 1.2, z, Math.round(24 * scale), '#ffba42');
    fxLight.color.set('#ff8224');
    fxLight.position.set(x, y + 3.4, z);
    fxLight.intensity = 28 * scale;
  }

  function spawnFireFlame(x, y, z, scale = 1.0) {
    spawnParticle(
      x + (Math.random() - 0.5) * 1.1, y + 0.5, z + (Math.random() - 0.5) * 1.1,
      (Math.random() - 0.5) * 1.2, 2.8 + Math.random() * 2.4, (Math.random() - 0.5) * 1.2,
      (0.85 + Math.random() * 0.6) * scale, Math.random() < 0.45 ? '#fde047' : '#ff6b1a',
      0.42 + Math.random() * 0.25, { kind: 'fire', additive: true, opacity: 0.82, grow: 1.35, gravity: -0.8 },
    );
    if (Math.random() < 0.5) {
      spawnParticle(
        x + (Math.random() - 0.5) * 1.3, y + 1.9, z + (Math.random() - 0.5) * 1.3,
        (Math.random() - 0.5) * 1.2, 3.6 + Math.random() * 1.8, (Math.random() - 0.5) * 1.2,
        (1.1 + Math.random() * 0.7) * scale, '#252a36', 0.9 + Math.random() * 0.5,
        { kind: 'smoke', opacity: 0.42, grow: 1.9, gravity: -0.5 },
      );
    }
  }

  function addSkidmark(x, y, z, yaw) {
    if (skidmarks.length > 180) {
      const old = skidmarks.shift();
      group.remove(old);
    }
    const m = new THREE.Mesh(skidGeo, skidMat);
    m.position.set(x, y + 0.21, z);
    m.rotation.y = yaw;
    group.add(m);
    skidmarks.push(m);
  }

  function spawnFloatingNumber(x, y, z, text, color = '#fde047') {
    floatingNums.push({ x, y, z, text, color, life: 1.2, maxLife: 1.2 });
  }

  function update(dt) {
    if (fxLight.intensity > 0.1) fxLight.intensity = Math.max(0, fxLight.intensity - dt * 42);
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        group.remove(p.mesh);
        p.mesh.material.dispose();
        particles.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const frac = 1 - p.life / p.maxLife;
      const sc = p.size * (1 + frac * (p.grow - 1));
      p.mesh.scale.setScalar(Math.max(0.05, sc));
      p.mesh.material.opacity = p.baseOpacity * (1 - frac);
    }
    for (let i = tracers.length - 1; i >= 0; i -= 1) {
      const tr = tracers[i];
      tr.life -= dt;
      if (tr.life <= 0) {
        group.remove(tr.mesh);
        tr.mesh.geometry.dispose();
        tr.mesh.material.dispose();
        tracers.splice(i, 1);
      } else {
        tr.mesh.material.opacity = tr.life / tr.maxLife;
      }
    }
    for (let i = flashes.length - 1; i >= 0; i -= 1) {
      const fl = flashes[i];
      fl.life -= dt;
      if (fl.life <= 0) {
        group.remove(fl.mesh);
        fl.mesh.material.dispose();
        flashes.splice(i, 1);
      } else {
        fl.mesh.scale.multiplyScalar(1 + dt * 5);
        fl.mesh.material.opacity = fl.life / fl.maxLife;
      }
    }
    for (let i = floatingNums.length - 1; i >= 0; i -= 1) {
      const fn = floatingNums[i];
      fn.life -= dt;
      fn.y += dt * 1.9;
      if (fn.life <= 0) floatingNums.splice(i, 1);
    }
  }

  function renderFloatingOverlay(container, camera, width, height) {
    if (!container) return;
    if (floatingNums.length === 0) {
      if (container.childElementCount > 0) container.innerHTML = '';
      return;
    }
    const v = new THREE.Vector3();
    let html = '';
    for (let i = 0; i < floatingNums.length; i += 1) {
      const fn = floatingNums[i];
      v.set(fn.x, fn.y, fn.z).project(camera);
      if (v.z > 1) continue;
      const sx = (v.x * 0.5 + 0.5) * width;
      const sy = (-v.y * 0.5 + 0.5) * height;
      const alpha = Math.min(1, fn.life / (fn.maxLife * 0.45));
      html += `<div class="float-dmg" style="left:${sx.toFixed(1)}px;top:${sy.toFixed(1)}px;color:${fn.color};opacity:${alpha.toFixed(2)}">${fn.text}</div>`;
    }
    container.innerHTML = html;
  }

  return {
    group, particles, tracers, skidmarks, floatingNums,
    spawnParticle, spawnDriftSmoke, spawnSparks, spawnMuzzleFlash,
    spawnTracer, spawnExplosion, spawnFireFlame, addSkidmark,
    spawnFloatingNumber, update, renderFloatingOverlay,
  };
}
