// Offline procedural Web Audio API sound synthesizer & radio station sequencer for
// Solaria Bay: Sun & Syndicate (engine RPM, police siren, gunshots, explosions, synthwave radio).

import { RADIO_STATIONS } from './config.js';

export function createSoundEngine() {
  let ctx = null;
  let muted = false;
  let radioIndex = 0;
  let beatClock = 0;

  function ensureContext() {
    if (muted) return null;
    if (!ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          ctx = new AudioCtx();
        } catch {
          ctx = null;
        }
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playSoundEffect(effectName) {
    const audio = ensureContext();
    if (!audio) return;
    const now = audio.currentTime;

    if (effectName === 'gunshot') {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.09);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.095);
    } else if (effectName === 'explosion') {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(24, now + 0.45);
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.47);
    } else if (effectName === 'carjack' || effectName === 'cash') {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      const base = effectName === 'cash' ? 587.33 : 330;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.setValueAtTime(base * 1.25, now + 0.06);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.17);
    } else if (effectName === 'mission_complete') {
      const notes = [440, 554.37, 659.25, 880];
      for (let i = 0; i < notes.length; i += 1) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(notes[i], now + i * 0.08);
        gain.gain.setValueAtTime(0.11, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(gain).connect(audio.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.26);
      }
    }
  }

  function updateEngineAndSirenAudio(player, wanted, dt) {
    if (muted || !ctx || ctx.state !== 'running') return;
    const station = RADIO_STATIONS[radioIndex];
    if (player.inVehicle && station && station.bpm > 0) {
      const stepInterval = 60 / station.bpm / 2;
      beatClock += dt;
      if (beatClock >= stepInterval) {
        beatClock -= stepInterval;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const scale = [1, 1.2, 1.33, 1.5, 1.78];
        const mult = scale[Math.floor((now * 4) % scale.length)];
        osc.type = 'sine';
        osc.frequency.setValueAtTime(station.baseFreq * mult, now);
        gain.gain.setValueAtTime(0.022, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    }
  }

  function cycleRadioStation() {
    radioIndex = (radioIndex + 1) % RADIO_STATIONS.length;
    playSoundEffect('carjack');
    return RADIO_STATIONS[radioIndex];
  }

  function getActiveRadioStation() {
    return RADIO_STATIONS[radioIndex] || RADIO_STATIONS[0];
  }

  function toggleAudioMute() {
    muted = !muted;
    return muted;
  }

  return {
    playSoundEffect,
    updateEngineAndSirenAudio,
    cycleRadioStation,
    getActiveRadioStation,
    toggleAudioMute,
    isMuted: () => muted,
  };
}
