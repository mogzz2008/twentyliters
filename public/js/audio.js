let ctx = null;
let muted = true;
let unlocked = false;

function context() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

async function unlock() {
  const ac = context();
  if (!ac) return;
  if (ac.state === 'suspended') {
    try { await ac.resume(); } catch { /* ignore */ }
  }
  unlocked = ac.state === 'running';
}

export function isMuted() {
  return muted;
}

export function setMuted(next) {
  muted = Boolean(next);
  if (!muted) unlock();
  return muted;
}

export function toggleMuted() {
  return setMuted(!muted);
}

function tone({ freq, dur = 0.08, type = 'sine', gain = 0.05, attack = 0.005, slide = 0, filter = 0 }) {
  if (muted) return;
  const ac = context();
  if (!ac || !unlocked) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  if (filter) {
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    osc.connect(f);
    f.connect(g);
  } else {
    osc.connect(g);
  }
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst({ dur = 0.06, gain = 0.03, freq = 1200 }) {
  if (muted) return;
  const ac = context();
  if (!ac || !unlocked) return;
  const t0 = ac.currentTime;
  const frames = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 1.2;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(ac.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export function playTick() {
  tone({ freq: 620, dur: 0.05, type: 'triangle', gain: 0.03, filter: 1800 });
}

export function playDrip() {
  tone({ freq: 880, dur: 0.12, type: 'sine', gain: 0.04, slide: -400 });
  noiseBurst({ dur: 0.04, gain: 0.02, freq: 2400 });
}

export function playCan() {
  tone({ freq: 180, dur: 0.14, type: 'square', gain: 0.025, filter: 600, slide: -40 });
  tone({ freq: 420, dur: 0.08, type: 'triangle', gain: 0.02 });
}

export function playWhoosh() {
  noiseBurst({ dur: 0.18, gain: 0.04, freq: 800 });
  tone({ freq: 240, dur: 0.2, type: 'sine', gain: 0.02, slide: 80, filter: 900 });
}

export function playSuccess() {
  tone({ freq: 523, dur: 0.1, type: 'sine', gain: 0.035 });
  setTimeout(() => tone({ freq: 659, dur: 0.12, type: 'sine', gain: 0.03 }), 70);
  setTimeout(() => tone({ freq: 784, dur: 0.16, type: 'sine', gain: 0.025 }), 140);
}

export { unlock };
