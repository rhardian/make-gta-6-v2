// Procedural Web Audio API synthesizer: 4 original FM radio stations, reactive engine revving,
// weapon gunshots, sub-bass explosions, and pulsing SBPD sirens — 100% offline, zero external files.

import { RADIO_STATIONS } from './config.js';

export function createAudioRadio() {
  let ctx = null;
  let masterGain = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;

  const state = {
    stationIndex: 0,
    muted: false,
    radioVolume: 0.24,
    sfxVolume: 0.45,
    beatTimer: 0,
    step: 0,
  };

  function ensureContext() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = state.muted ? 0 : 0.7;
      masterGain.connect(ctx.destination);

      // Continuous subtle engine drone
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 240;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(masterGain);
      engineOsc.start();

      // Continuous SBPD siren oscillator
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 660;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(masterGain);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function playTone(freq, dur, type, vol, slideTo = null) {
    if (!ctx || state.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(24, slideTo), now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function playNoiseBurst(dur, vol, cutoff = 1200) {
    if (!ctx || state.muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filt);
    filt.connect(g);
    g.connect(masterGain);
    src.start();
  }

  function cycleStation() {
    ensureContext();
    state.stationIndex = (state.stationIndex + 1) % RADIO_STATIONS.length;
    return RADIO_STATIONS[state.stationIndex];
  }

  function setMuted(muted) {
    state.muted = muted;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.7;
  }

  function playGunshot(weaponId) {
    if (!ctx || state.muted) return;
    const heavy = weaponId === 'coral_shotgun' || weaponId === 'mirage_sniper';
    playNoiseBurst(heavy ? 0.16 : 0.08, state.sfxVolume * (heavy ? 0.45 : 0.28), heavy ? 1600 : 2800);
    playTone(heavy ? 150 : 240, 0.07, 'square', state.sfxVolume * 0.2, 48);
  }

  function playExplosion() {
    if (!ctx || state.muted) return;
    playNoiseBurst(0.55, state.sfxVolume * 0.65, 620);
    playTone(95, 0.48, 'sine', state.sfxVolume * 0.55, 28);
  }

  function update(dt, elapsed, player, wantedStars) {
    if (!ctx || state.muted) return;

    // Reactive engine hum when driving
    if (engineGain && engineOsc) {
      if (player.inVehicle && player.vehicle && !player.vehicle.destroyed) {
        const spd = player.vehicle.speed;
        engineOsc.frequency.setTargetAtTime(48 + spd * 2.1 + (player.vehicle.nitroActive ? 35 : 0), ctx.currentTime, 0.06);
        engineGain.gain.setTargetAtTime(0.055 * state.sfxVolume, ctx.currentTime, 0.08);
      } else {
        engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      }
    }

    // Pulsing SBPD siren wail when wanted
    if (sirenGain && sirenOsc) {
      if (wantedStars > 0) {
        const wail = 620 + Math.sin(elapsed * 5.2) * 230;
        sirenOsc.frequency.setTargetAtTime(wail, ctx.currentTime, 0.05);
        sirenGain.gain.setTargetAtTime(0.028 * state.sfxVolume, ctx.currentTime, 0.1);
      } else {
        sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      }
    }

    // 4-station procedural FM synth step sequencer
    const st = RADIO_STATIONS[state.stationIndex];
    if (!st || st.bpm <= 0) return;
    const stepDur = 60 / st.bpm / 2; // 8th-note groove
    state.beatTimer += dt;
    if (state.beatTimer >= stepDur) {
      state.beatTimer -= stepDur;
      const step = state.step % 16;
      state.step += 1;
      const v = state.radioVolume * 0.22;
      if (step % 4 === 0) playTone(115, 0.11, 'sine', v * 1.4, 38); // Kick
      if (step % 4 === 2) playNoiseBurst(0.06, v * 0.65, 2200); // Snare/Hat
      const semi = st.scale[(step * 3 + Math.floor(step / 4)) % st.scale.length];
      const freq = st.root * Math.pow(2, semi / 12);
      playTone(freq, stepDur * 0.85, step % 2 === 0 ? 'sawtooth' : 'triangle', v * 0.55);
      if (step % 2 === 1) {
        playTone(freq * 2, stepDur * 0.6, 'sine', v * 0.35);
      }
    }
  }

  return {
    state,
    ensureContext,
    cycleStation,
    setMuted,
    playGunshot,
    playExplosion,
    update,
  };
}
