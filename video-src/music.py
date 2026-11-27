# Synthesised, royalty-free upbeat music bed for the demo (no samples). Usage: python3 music.py [seconds]
import sys, wave, numpy as np
SR = 44100
dur = float(sys.argv[1]) if len(sys.argv) > 1 else 180
out_path = sys.argv[2] if len(sys.argv) > 2 else 'out/music.wav'
bpm = 112; beat = 60 / bpm; n = int(dur * SR)
t = np.arange(n) / SR
out = np.zeros((n, 2))
rng = np.random.default_rng(21)
def note(f): return 440 * 2 ** ((f - 69) / 12)
def add(start, sig, pan=0.0, gain=1.0):
    i = int(start * SR); j = min(n, i + len(sig))
    if i >= n: return
    s = sig[: j - i] * gain
    out[i:j, 0] += s * (1 - pan) * 0.5 * 2 ** 0.5
    out[i:j, 1] += s * (1 + pan) * 0.5 * 2 ** 0.5
def pluck(f, length=0.35):
    tt = np.arange(int(length * SR)) / SR
    env = np.exp(-tt * 9) * np.minimum(1, tt * 400)
    return env * sum(np.sin(2 * np.pi * f * k * tt) / k ** 1.4 for k in range(1, 6))
def pad(fs, length):
    tt = np.arange(int(length * SR)) / SR
    env = np.minimum(1, tt * 3) * np.minimum(1, (length - tt) * 3)
    return env * sum(np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.003 * tt) for f in fs) / len(fs)
def kick():
    tt = np.arange(int(0.25 * SR)) / SR
    f = 50 + 90 * np.exp(-tt * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 14)
def hat():
    tt = np.arange(int(0.05 * SR)) / SR
    x = rng.standard_normal(len(tt)); x = np.diff(np.concatenate([[0], x]))
    return x * np.exp(-tt * 90)
def clap():
    tt = np.arange(int(0.18 * SR)) / SR
    return rng.standard_normal(len(tt)) * np.exp(-tt * 28) * 0.6
# C  G  Am  F  (midi roots) with arpeggio patterns
prog = [[65, 69, 72, 77], [60, 64, 67, 72], [62, 65, 69, 74], [58, 62, 65, 70]]
bar = 4 * beat
nb = int(dur / bar) + 1
for b in range(nb):
    ch = prog[b % 4]; t0 = b * bar
    add(t0, pad([note(m) for m in ch[:3]], bar), 0, 0.10)
    add(t0, pluck(note(ch[0] - 24), bar * 0.9) * 0.9, 0, 0.30)          # bass
    for s in range(8):                                                    # 8th-note arp
        m = ch[[0, 1, 2, 3, 2, 1, 2, 3][s]] + 12
        add(t0 + s * beat / 2, pluck(note(m)), (-0.4 if s % 2 else 0.4), 0.16)
    if b >= 1:
        for k in range(4):
            add(t0 + k * beat, kick(), 0, 0.55)
            add(t0 + k * beat + beat / 2, hat(), 0.2, 0.10)
            if k in (1, 3): add(t0 + k * beat, clap(), -0.1, 0.12)
fade = np.minimum(1, np.minimum(t / 2.0, (dur - t) / 3.0))[:, None]
out *= fade
out /= np.abs(out).max() * 1.12
from pathlib import Path
Path(out_path).parent.mkdir(parents=True, exist_ok=True)
with wave.open(out_path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
print('wrote', out_path, dur)
