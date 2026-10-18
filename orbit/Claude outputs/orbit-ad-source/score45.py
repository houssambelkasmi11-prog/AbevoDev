"""ORBIT — 45 s melodic-house score, 120 BPM, synthesized from scratch (no samples).
Drop lands at 14.5 s when the workspace appears; every cut is on the beat grid."""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000; DUR = 45.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(45)
BEAT = 0.5; BAR = 2.0; S16 = 0.125
L = np.zeros(N); R = np.zeros(N); RL = np.zeros(N); RR = np.zeros(N)
KL = np.zeros(N); KR = np.zeros(N)   # kick bus (not ducked)

def hz(s):
    names = {'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11}
    n = 12 * (int(s[-1]) + 1) + names[s[:-1]]
    return 440.0 * 2 ** ((n - 69) / 12)
def seg(x, a, b): return np.clip((x - a) / (b - a), 0, 1)
def sio(x): return 0.5 - 0.5 * np.cos(np.pi * np.clip(x, 0, 1))
def lp(x, f, o=2): return sosfilt(butter(o, min(f, SR/2 - 500), 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def env(n, a, d):
    k = np.arange(n) / SR
    return np.minimum(1, k / max(a, 1e-4)) * np.exp(-np.maximum(0, k - a) / d)

def put(sig, start, pan=0.0, gain=1.0, send=0.0, bus='main'):
    i = int(round(start * SR))
    if i >= N or i < 0: return
    s = sig[: N - i] * gain
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    if bus == 'kick':
        KL[i:i+len(s)] += s * gl; KR[i:i+len(s)] += s * gr; return
    L[i:i+len(s)] += s * gl; R[i:i+len(s)] += s * gr
    if send: RL[i:i+len(s)] += s * gl * send; RR[i:i+len(s)] += s * gr * send

# ───────── instruments ─────────
def kick():
    n = int(0.42 * SR); k = np.arange(n) / SR
    f = 47 + 95 * np.exp(-k / 0.032)
    s = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-k / 0.26)
    s += 0.18 * hp(rng.standard_normal(n), 2500) * np.exp(-k / 0.003)
    return np.tanh(s * 1.6) / 1.2

def clap():
    n = int(0.35 * SR); k = np.arange(n) / SR
    w = bp(rng.standard_normal(n), 900, 3200)
    e = np.zeros(n)
    for o in (0, 0.009, 0.018):
        e += np.where(k >= o, np.exp(-(k - o) / 0.006), 0) * (k < o + 0.03)
    e += np.where(k >= 0.024, np.exp(-(k - 0.024) / 0.07), 0) * 0.6
    return w * e

def hat(open_=False):
    n = int((0.22 if open_ else 0.06) * SR)
    return hp(rng.standard_normal(n), 8000, 4) * env(n, 0.001, 0.07 if open_ else 0.014)

def shaker():
    n = int(0.08 * SR)
    return bp(rng.standard_normal(n), 5500, 12000) * env(n, 0.008, 0.02)

def supersaw(freqs, dur, cutoff, voices=5, spread=0.11):
    n = int(dur * SR); k = np.arange(n) / SR; out = np.zeros(n)
    for f in freqs:
        for v in range(voices):
            det = (v - (voices - 1) / 2) / ((voices - 1) / 2) * spread
            ff = f * 2 ** (det / 12)
            out += 2 * ((ff * k + rng.random()) % 1) - 1
    return lp(out / (len(freqs) * voices), cutoff)

def stab(freqs, cutoff, dur=0.32):
    n = int(dur * SR)
    return supersaw(freqs, dur, cutoff) * env(n, 0.004, 0.11)

def bass(f, dur=0.24, cutoff=700):
    n = int(dur * SR); k = np.arange(n) / SR
    s = 0.6 * np.sin(2*np.pi*f*k) + 0.5 * lp(2*((f*k) % 1)-1, cutoff)
    return s * env(n, 0.004, 0.12) * (k < dur - 0.01)

def lead(f, dur=0.3):
    n = int(dur * SR); k = np.arange(n) / SR
    saw = 2*((f*k) % 1)-1; sq = np.sign(np.sin(2*np.pi*f*1.003*k))
    s = 0.6 * saw + 0.4 * sq
    # quick filter "pluck": blend bright→dark
    bright = lp(s, 5200); dark = lp(s, 1100)
    e = np.exp(-k / 0.06)
    return (bright * e + dark * (1 - e)) * env(n, 0.003, 0.16)

def bell(f, dur=3.0, idx=1.4, ratio=3.5, dec=1.4):
    n = int(dur * SR); k = np.arange(n) / SR
    I = idx * np.exp(-k / 0.4)
    return np.sin(2*np.pi*f*k + I*np.sin(2*np.pi*f*ratio*k)) * env(n, 0.003, dec)

def pad(freqs, start, end, gain, cutoff, fade=0.8):
    dur = end - start + fade
    n = int(dur * SR); k = np.arange(n) / SR
    s = supersaw(freqs, dur, cutoff, voices=3, spread=0.08)
    e = sio(k / fade) * np.clip((dur - k) / fade, 0, 1)
    put(s * e, start - fade / 2, 0.0, gain, 0.6)

def riser(start, end, gain=1.0):
    n = int((end - start) * SR); k = np.arange(n) / SR; x = k / (end - start)
    w = rng.standard_normal(n); out = np.zeros(n); B = 1024
    for b in range(0, n, B):
        fc = 400 * (12000 / 400) ** x[b]
        out[b:b+B] = bp(w[b:b+B], fc * .7, min(SR/2 - 300, fc * 1.3), 1)
    f = 220 * 2 ** (x * 2)
    tone = 0.25 * np.sin(2*np.pi*np.cumsum(f)/SR)
    return (out + tone) * x ** 2 * gain

def downlifter(start, dur=1.5, gain=1.0):
    n = int(dur * SR); k = np.arange(n) / SR; x = k / dur
    w = rng.standard_normal(n); out = np.zeros(n); B = 1024
    for b in range(0, n, B):
        fc = 9000 * (300 / 9000) ** x[b]
        out[b:b+B] = bp(w[b:b+B], fc * .7, fc * 1.3, 1)
    return out * (1 - x) ** 2 * np.minimum(1, k / 0.01) * gain

def impact():
    n = int(2.2 * SR); k = np.arange(n) / SR
    f = 38 + 60 * np.exp(-k / 0.08)
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-k / 0.7) + 0.15 * lp(rng.standard_normal(n), 2500) * np.exp(-k / 0.12)

# ───────── harmony: Am7 – Fmaj7 – C – G (one bar each) ─────────
PROG = [(['A3', 'C4', 'E4', 'G4'], 'A1'), (['F3', 'A3', 'C4', 'E4'], 'F1'), (['G3', 'C4', 'E4', 'G4'], 'C2'), (['G3', 'B3', 'D4', 'F#4'], 'G1')]
PROG[3] = (['G3', 'B3', 'D4', 'G4'], 'G1')
def chord_at(tt): return PROG[int(tt // BAR) % 4]

DROP = 14.5
# filter automation for the build (opens towards the drop)
def cut_at(tt):
    if tt < 6: return 500
    if tt < DROP: return 500 + 3000 * ((tt - 6) / (DROP - 6)) ** 1.6
    if tt < 34.5: return 4200
    if tt < 39: return 1400
    return 3000

# pads: intro + breakdown + end
for b0 in np.arange(0, 6, BAR):
    pad([hz(n) for n in chord_at(b0)[0]], b0, b0 + BAR, 0.16, 900)
for b0 in np.arange(34.5, 39, BAR):
    pad([hz(n) for n in chord_at(b0)[0]], b0, min(b0 + BAR, 39.0), 0.2, 1800)
pad([hz(n) for n in ['A3', 'C4', 'E4', 'B4']], 39.3, 45.0, 0.2, 2200, 1.2)

# ── drums ──
kick_times = [x for x in np.arange(6.0, 14.0, BEAT)] + [x for x in np.arange(DROP, 34.5, BEAT)] + [39.5, 40.0, 40.5, 41.0, 41.5, 42.0, 42.5]
for kt in kick_times:
    g = 0.45 if kt < DROP else 0.66
    if kt < DROP: g *= 0.6 + 0.4 * (kt - 6) / 8
    if kt >= 39: g = 0.7 * (1 - (kt - 39.5) / 3.5)
    put(kick(), kt, 0, g, bus='kick')
side = np.zeros(N)
for kt in kick_times:
    i = int(kt * SR); n = int(0.45 * SR); k = np.arange(min(n, N - i)) / SR
    side[i:i+len(k)] = np.maximum(side[i:i+len(k)], np.exp(-k / 0.12))

for tt in np.arange(DROP + BEAT, 34.5, BAR / 2):                 # clap on 2 & 4
    put(clap(), tt, 0.05, 0.42, 0.25)
for tt in np.arange(2.0, 34.5, S16):                              # closed hats (16ths)
    if 14.0 <= tt < DROP: continue
    step = int(round(tt / S16)) % 4
    g = [0.05, 0.025, 0.06, 0.03][step] * (0.6 if tt < 6 else 1.0)
    put(hat(), tt, 0.25 if step % 2 else -0.15, g)
for tt in np.arange(6.25, 34.5, BEAT):                            # open hat on the offbeat
    if 14.0 <= tt < DROP: continue
    put(hat(True), tt, -0.2, 0.06 if tt < DROP else 0.09, 0.15)
for tt in np.arange(DROP, 34.5, S16 * 2):
    put(shaker(), tt + S16, 0.4, 0.025)

# ── bass (offbeat house bass from the drop) ──
for tt in np.arange(DROP, 34.5, BEAT):
    f = hz(chord_at(tt)[1])
    put(bass(f), tt + BEAT / 2, 0, 0.5)
    if int(tt / BEAT) % 4 == 3:
        put(bass(f * 2, 0.12), tt + BEAT * 0.75, 0, 0.22)
for tt in (39.75, 40.25, 40.75, 41.25):
    put(bass(hz('A1')), tt, 0, 0.4 * (1 - (tt - 39.5) / 2.5))

# ── chord stabs (syncopated) ──
stab_pattern = [0.75, 1.5, 1.75]   # positions within a 2-beat cell … repeated per bar
for b0 in np.arange(6.0, 34.5, BAR):
    if 14.0 <= b0 < DROP: continue
    freqs = [hz(n) for n in chord_at(b0)[0]]
    for off in (0.25, 0.75, 1.25, 1.625):
        tt = b0 + off
        if 14.0 <= tt < DROP or tt >= 34.5: continue
        put(stab(freqs, cut_at(tt)), tt, -0.25 if off < 1 else 0.25, 0.4, 0.35)

# ── the hook (2-bar phrase, from the drop) ──
HOOK = [(0.0, 'E5'), (0.375, 'G5'), (0.75, 'A5'), (1.25, 'C6'), (1.5, 'B5'), (1.75, 'A5'),
        (2.25, 'G5'), (2.5, 'E5'), (3.0, 'D5'), (3.25, 'E5'), (3.5, 'G5')]
for p0 in np.arange(DROP + 2 * BAR, 34.5 - 0.01, 2 * BAR):        # enters one phrase after the drop
    for off, nn in HOOK:
        tt = p0 + off
        if tt >= 34.5: continue
        put(lead(hz(nn)), tt, 0.1, 0.15, 0.35)
        put(lead(hz(nn)), tt + 0.375, -0.45, 0.04, 0.4)               # dotted-eighth echo
# hook teased in the breakdown and resolved on the end card
for off, nn in HOOK[:6]:
    put(bell(hz(nn), 2.5), 35.0 + off * 1.0, 0.0, 0.05, 0.9)
for tt, nn in ((39.6, 'E5'), (39.975, 'A5'), (40.35, 'B5'), (41.1, 'E6')):
    put(bell(hz(nn), 4.0, dec=1.8), tt, 0.0, 0.07, 1.0)
    put(lead(hz(nn)), tt, 0.1, 0.06, 0.5)

# ── intro & transitions ──
put(bell(hz('A5'), 4.0, idx=0.9, ratio=2.0, dec=1.8), 0.5, 0, 0.06, 1.0)    # first point of light
for i, tt in enumerate((1.9, 2.4, 2.9, 3.4, 3.9)):                           # study fragments
    put(bell(hz(['E6', 'G6', 'B6', 'A6', 'E7'][i]), 1.8, idx=0.6, ratio=2.0, dec=0.6), tt, [-.5, .5, .6, -.3, .3][i], 0.025, 0.8)
put(impact() * 0.5, 2.7, 0, 0.35, 0.3)                                      # "Your mind."
put(impact() * 0.5, 7.3, 0, 0.35, 0.3)                                      # "In motion."
put(riser(11.0, 14.3, 0.12), 11.0, 0, 1.0, 0.4)                             # build into the drop
for tt in np.arange(12.5, 14.0, S16):                                        # snare roll
    g = 0.04 + 0.12 * (tt - 12.5) / 1.5
    put(clap() * 0.7, tt, 0, g, 0.2)
put(impact(), DROP, 0, 0.75, 0.4)                                            # DROP — workspace appears
put(downlifter(DROP, 1.6, 0.06), DROP, 0, 1.0, 0.5)
for tt in (13.37, 17.13, 21.3, 23.5, 33.3):                                                          # click "Open ORBIT"
    n = int(0.04 * SR); k = np.arange(n) / SR
    put(np.sin(2*np.pi*2800*k) * np.exp(-k / 0.006), tt, 0.2, 0.05, 0.3)
for tt in (25.5, 27.0, 28.5, 30.0, 31.5, 33.0):                              # montage wipes
    put(downlifter(tt - 0.25, 0.5, 0.035) [::-1].copy(), tt - 0.25, 0, 1.0, 0.4)
put(riser(32.5, 34.5, 0.06), 32.5, 0, 1.0, 0.4)
put(impact() * 0.7, 34.5, 0, 0.5, 0.5)                                       # into the universe
put(riser(37.5, 39.5, 0.09), 37.5, 0, 1.0, 0.4)
put(impact(), 39.5, 0, 0.7, 0.5)                                             # brand reveal

# ───────── mix ─────────
duck = 1 - 0.55 * side
L *= duck; R *= duck
def make_ir(sec=3.0, t60=2.4, seed=3):
    r = np.random.default_rng(seed); n = int(sec * SR); k = np.arange(n) / SR
    out = []
    for ch in range(2):
        w = r.standard_normal(n) * 10 ** (-3 * k / t60)
        w = lp(w, 6000) * 0.7 + lp(w, 1500) * 0.6 * (k / sec)
        w[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
        out.append(w / np.sqrt(np.sum(w ** 2)))
    return out
irL, irR = make_ir()
wL = fftconvolve(hp(RL, 250), irL)[:N] * duck; wR = fftconvolve(hp(RR, 250), irR)[:N] * duck
mL = L + KL + wL * 0.8; mR = R + KR + wR * 0.8
mL = hp(mL, 28); mR = hp(mR, 28)
mL = np.tanh(mL * 1.4) / 1.4; mR = np.tanh(mR * 1.4) / 1.4
fo = 1 - sio(seg(t, 43.8, 45.0)); fi = np.minimum(1, t / 0.02)
mL *= fo * fi; mR *= fo * fi
pk = max(np.abs(mL).max(), np.abs(mR).max()); mL /= pk / 0.89; mR /= pk / 0.89
wavfile.write('score45_raw.wav', SR, np.stack([mL, mR], 1).astype(np.float32))
print('ok', pk)
