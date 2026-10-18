"""ORBIT — original 45 s (30 s score re-timed to the 45 s cut) electronic-ambient score, synthesized from scratch (no samples)."""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
DUR = 45.0
OLD = np.array([0, 9.78, 12, 17, 23, 26, 30.0]); NEW = np.array([0, 14.5, 18, 25.5, 34.5, 39, 45.0])
def M(x): return float(np.interp(x, OLD, NEW))
def snap(x): return round(x * 2) / 2
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)

L = np.zeros(N); R = np.zeros(N)          # dry bus
RL = np.zeros(N); RR = np.zeros(N)        # reverb send bus

def note(n):  # midi -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)

def NM(s):
    names = {'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11}
    return 12 * (int(s[-1]) + 1) + names[s[:-1]]

def seg(x, a, b):
    return np.clip((x - a) / (b - a), 0, 1)

def addn(sig, start, pan=0.0, gain=1.0, send=0.0):
    i = int(start * SR)
    if i >= N: return
    s = sig[: N - i] * gain
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i:i+len(s)] += s * gl; R[i:i+len(s)] += s * gr
    if send:
        RL[i:i+len(s)] += s * gl * send; RR[i:i+len(s)] += s * gr * send

def add(sig, start, pan=0.0, gain=1.0, send=0.0):
    addn(sig, M(start), pan, gain, send)

def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)

def env_ad(n, a, d):
    k = np.arange(n) / SR
    return np.minimum(1, k / max(a, 1e-4)) * np.exp(-np.maximum(0, k - a) / d)

# ───────────── instruments ─────────────
def kick(gain=1.0, dec=0.32):
    n = int(0.6 * SR); k = np.arange(n) / SR
    f = 42 + 70 * np.exp(-k / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-k / dec)
    s += 0.25 * hp(rng.standard_normal(n), 3000) * np.exp(-k / 0.004)
    return s * gain

def thump(gain=1.0):  # soft heartbeat
    n = int(0.9 * SR); k = np.arange(n) / SR
    f = 38 + 40 * np.exp(-k / 0.05)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-k / 0.42) * np.minimum(1, k / 0.006)
    return s * gain

def hat(gain=1.0, dec=0.028):
    n = int(0.15 * SR); k = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7500, 4) * np.exp(-k / dec) * gain

def click(gain=1.0, f=3800):
    n = int(0.05 * SR); k = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * k) * np.exp(-k / 0.006) + 0.15 * hp(rng.standard_normal(n), 5000) * np.exp(-k / 0.0015)
    return s * gain

def pluck(f, dur=0.5, bright=1.0):
    n = int(dur * SR); k = np.arange(n) / SR
    s = (np.sin(2*np.pi*f*k) + 0.35*bright*np.sin(2*np.pi*2*f*k)*np.exp(-k/0.08) + 0.12*bright*np.sin(2*np.pi*3*f*k)*np.exp(-k/0.04))
    return s * env_ad(n, 0.003, 0.22)

def bell(f, dur=4.0, idx=2.2, ratio=3.5, dec=1.6):
    n = int(dur * SR); k = np.arange(n) / SR
    I = idx * np.exp(-k / 0.5)
    s = np.sin(2*np.pi*f*k + I*np.sin(2*np.pi*f*ratio*k))
    s += 0.3 * np.sin(2*np.pi*2.001*f*k) * np.exp(-k/0.7)
    return s * env_ad(n, 0.002, dec)

def pad(freqs, start, end, gain=0.1, cutoff=1400, fade=1.2, pan_w=0.5):
    start, end = M(start), M(end)
    n = int((end - start + fade) * SR); k = np.arange(n) / SR
    outL = np.zeros(n); outR = np.zeros(n)
    for j, f in enumerate(freqs):
        for det, pan in ((-0.07, -pan_w), (0.0, 0.0), (0.07, pan_w)):
            ff = f * 2 ** (det / 12)
            ph = rng.random()
            saw = 2 * ((ff * k + ph) % 1) - 1
            tri = 2 * np.abs(saw) - 1
            v = 0.55 * saw + 0.45 * tri
            gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            outL += v * gl; outR += v * gr
    e = np.minimum(1, k / fade) * np.clip((end - start + fade - k) / fade, 0, 1)
    outL = lp(outL, cutoff) * e * gain / len(freqs); outR = lp(outR, cutoff) * e * gain / len(freqs)
    i = int(start * SR); m = min(n, N - i)
    return i, outL[:m], outR[:m]

def noise_swell(start, end, f0, f1, gain=0.2, rev=False):
    d = M(end) - M(start)
    n = int(d * SR); k = np.arange(n) / SR; x = seg(k, 0, d)
    w = rng.standard_normal(n)
    # time-varying band via block filtering
    out = np.zeros(n); B = 1024
    for b in range(0, n, B):
        fr = x[b] if not rev else 1 - x[b]
        fc = f0 * (f1 / f0) ** fr
        out[b:b+B] = bp(w[b:b+B+0], max(60, fc * 0.7), min(SR/2 - 100, fc * 1.4), 1)
    e = (x ** 2.2) if not rev else ((1 - x) ** 1.5 * np.minimum(1, k / 0.02))
    return out * e * gain

def boom(gain=1.0):
    gain *= 0.7
    n = int(2.5 * SR); k = np.arange(n) / SR
    f = 30 + 50 * np.exp(-k / 0.12)
    s = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-k / 0.9)
    s += 0.2 * lp(rng.standard_normal(n), 400) * np.exp(-k / 0.25)
    return s * gain

# ───────────── arrangement ─────────────
BEAT = 0.5  # 120 BPM — every cut lands on the grid

# Sub drone A1 with swell; dips out at the end card
drone_env = 0.35 * seg(t, M(0.6), M(3.8)) + 0.25 * seg(t, M(4), M(8)) - 0.6 * seg(t, M(25.8), M(26.4)) + 0.4 * seg(t, M(26.4), M(27.5))
drone_env = np.clip(drone_env, 0, 1) * (1 - seg(t, M(28.5), 45))
drone = (np.sin(2*np.pi*55*t) + 0.25*np.sin(2*np.pi*110*t + 0.3) + 0.1*np.sin(2*np.pi*82.41*t)) * drone_env * 0.075
L += drone; R += drone

# S1 — the first point of light
add(bell(note(NM('A5')), 5, idx=1.2, ratio=2.0, dec=1.8), 0.33, 0.0, 0.10, 0.9)
add(bell(note(NM('E6')), 4, idx=0.8, ratio=2.0, dec=1.4), 0.36, 0.25, 0.04, 0.9)
for tt in (0.5, 1.5, 2.5, 3.5):
    add(thump(), tt, 0, 0.32)
for i, tt in enumerate((1.25, 1.6, 1.95, 2.3, 2.65)):   # study fragments appear
    add(click(1, 3000 + 400 * i), tt, [-.5, .5, .6, -.3, .3][i], 0.05, 0.6)
    add(pluck(note([76, 79, 83, 81, 88][i]), 1.2, 0.6), tt, [-.5, .5, .6, -.3, .3][i], 0.05, 0.8)
# "Your mind." accent
add(boom(0.6), 1.8, 0, 0.35, 0.3)
add(bell(note(NM('E5')), 4, idx=1.5, dec=1.6), 1.8, -0.1, 0.05, 0.9)

# S2 — "In motion." pulse enters
add(boom(0.5), 4.9, 0, 0.32, 0.3)
add(bell(note(NM('B5')), 4, idx=1.5, dec=1.6), 4.9, 0.15, 0.05, 0.9)
for tt in np.arange(4.0, 6.0, 1.0):
    add(thump(), tt, 0, 0.3)

# pads
chords = [
    (4.0, 8.0, ['A2', 'E3', 'G3', 'B3', 'C4'], 1100),
    (8.0, 12.0, ['F2', 'C3', 'E3', 'A3', 'C4'], 1500),
    (12.0, 14.5, ['C3', 'E3', 'G3', 'B3', 'D4'], 1700),
    (14.5, 17.0, ['G2', 'D3', 'E3', 'B3', 'D4'], 1700),
    (17.0, 20.0, ['A2', 'E3', 'A3', 'C4', 'E4'], 2200),
    (20.0, 23.0, ['F2', 'A3', 'C4', 'E4', 'G4'], 2300),
    (23.0, 26.3, ['D3', 'F3', 'A3', 'C4', 'E4'], 2600),
    (26.3, 30.0, ['A2', 'E3', 'B3', 'E4', 'A4'], 2000),
]
for a, b, ns, cut in chords:
    g = 0.15 if a < 6 else 0.17
    i, pl, pr = pad([note(NM(x)) for x in ns], a - 0.3, b, gain=g, cutoff=cut, fade=0.9 if a > 4 else 2.0)
    L[i:i+len(pl)] += pl; R[i:i+len(pr)] += pr
    RL[i:i+len(pl)] += pl * 0.55; RR[i:i+len(pr)] += pr * 0.55

# kick / sidechain
kick_times = list(np.arange(snap(M(6.0)), 18.0, 1.0)) + list(np.arange(18.0, 34.5 - 1e-6, 0.5))
side = np.zeros(N)
for kt in kick_times:
    i = int(kt * SR); n = int(0.4 * SR); k = np.arange(min(n, N - i)) / SR
    side[i:i+len(k)] = np.maximum(side[i:i+len(k)], np.exp(-k / 0.11))
duck = 1 - 0.38 * side

# arpeggio motif (8ths) — chord tones, upper register
arp_sets = [(6.0, 8.0, ['A4', 'E5', 'B4', 'C5']), (8.0, 12.0, ['F4', 'C5', 'A4', 'E5']), (12.0, 14.5, ['C5', 'G5', 'E5', 'B4']),
            (14.5, 17.0, ['G4', 'D5', 'B4', 'E5']), (17.0, 20.0, ['A4', 'E5', 'C5', 'A5']), (20.0, 23.0, ['F4', 'C5', 'A4', 'G5']),
            (23.0, 26.0, ['D5', 'A5', 'F5', 'E5'])]
step = 0
for a0, b0, ns in arp_sets:
    a, b = snap(M(a0)), snap(M(b0))
    for tt in np.arange(a, b - 1e-6, 0.25):
        if a0 >= 23.0 and (step % 2): step += 1; continue
        f = note(NM(ns[step % 4]))
        g = 0.05 + 0.04 * min(1, (tt - 9) / 9)
        if a0 >= 23.0: g *= 0.8
        addn(pluck(f, 0.6, 0.9), tt, -0.35 if step % 2 else 0.35, g, 0.45)
        step += 1

# bass (from 12 s): offbeat eighths on chord root
bass_roots = [(12.0, 14.5, 'C2'), (14.5, 17.0, 'G1'), (17.0, 20.0, 'A1'), (20.0, 23.0, 'F1')]
bass = np.zeros(N)
for a0, b0, r in bass_roots:
    a, b = snap(M(a0)), snap(M(b0))
    f = note(NM(r))
    for tt in np.arange(a + 0.25, b, 0.5):
        n = int(0.24 * SR); k = np.arange(n) / SR
        saw = 2 * ((f * k) % 1) - 1
        s = (0.7 * np.sin(2*np.pi*f*k) + 0.3 * saw) * env_ad(n, 0.004, 0.12)
        i = int(tt * SR); m = min(n, N - i)
        bass[i:i+m] += s[:m]
bass = lp(bass, 420) * 0.30
L += bass; R += bass

# hats (montage)
for j, tt in enumerate(np.arange(18.25, 34.45, 0.5)):
    addn(hat(), tt, 0.3, 0.04 if tt < 25.5 else 0.05)
for tt in np.arange(28.5, 34.45, 0.25):
    addn(hat(dec=0.012), tt, -0.3, 0.018)

# ───────────── transitions & UI accents ─────────────
sw = noise_swell(7.0, 8.0, 300, 6000, 0.10); add(sw, 7.0, 0, 1.0, 0.5)
add(click(1, 2600), 9.02, 0.2, 0.08, 0.3)                     # click "Open ORBIT"
rz = noise_swell(9.05, 9.78, 400, 9000, 0.22); add(rz, 9.05, 0, 1.0, 0.4)  # warp riser
add(boom(1.0), 9.78, 0, 0.55, 0.35); add(click(1, 5200), 9.78, 0, 0.12, 0.6)
add(bell(note(NM('A5')), 3, idx=1.0, dec=1.2), 9.8, 0.2, 0.04, 0.8)
for tt, f in ((11.45, 3200), (14.3, 3000), (15.8, 3400), (22.86, 3000)):
    add(click(1, f), tt, 0.25, 0.07, 0.3)
for tt in (12.0, 14.55):
    add(noise_swell(tt - 0.25, tt + 0.15, 2000, 7000, 0.05), tt - 0.25, 0, 1.0, 0.4)
for j, tt in enumerate((17.0, 18.0, 19.0, 20.0, 21.0, 22.0)):  # orbital wipes
    add(noise_swell(tt - 0.18, tt + 0.32, 800, 9000, 0.07, rev=False), tt - 0.18, -0.4 + 0.16 * j, 1.0, 0.5)
    add(click(1, 4200), tt, 0, 0.05, 0.5)
for tt in (17.0, 19.0, 21.0):                                    # CAPTURE / CONNECT / EXPAND
    add(boom(0.7), tt, 0, 0.28, 0.25)
# collapse into the universe
add(noise_swell(22.3, 23.0, 9000, 300, 0.12, rev=False), 22.3, 0, 1.0, 0.5)
add(boom(1.0), 23.05, 0, 0.6, 0.4)
add(bell(note(NM('D6')), 4, idx=1.2, dec=1.8), 23.1, -0.2, 0.05, 0.9)
# the highlight travelling across connections
for j in range(7):
    tt = 24.1 + j * (1.8 / 7)
    add(bell(note([NM('A5'), NM('C6'), NM('E6'), NM('F6'), NM('A6'), NM('E6'), NM('A6')][j]), 2.5, idx=0.6, ratio=2.0, dec=0.9), tt, -0.6 + 0.2 * j, 0.035, 0.9)
add(noise_swell(25.6, 26.35, 6000, 200, 0.06), 25.6, 0, 1.0, 0.6)

# ───────────── sonic signature (end card) ─────────────
for tt, n_, g in ((26.45, 'E5', 0.10), (26.8, 'A5', 0.10), (27.15, 'B5', 0.09)):
    add(bell(note(NM(n_)), 4.5, idx=1.8, ratio=3.5, dec=1.9), tt, 0.0, g, 0.9)
    add(pluck(note(NM(n_)) / 2, 1.5, 0.4), tt, 0, 0.05, 0.6)
add(boom(0.8), 26.45, 0, 0.42, 0.4)
add(bell(note(NM('E6')), 4, idx=0.7, ratio=2.0, dec=1.6), 28.1, 0.2, 0.05, 1.0)    # CTA
add(bell(note(NM('A4')), 4, idx=0.9, ratio=2.0, dec=1.9), 28.1, -0.2, 0.05, 1.0)

# ───────────── mix ─────────────
L *= duck; R *= duck  # pump the bed around the kick
for kt in kick_times:
    addn(kick(), kt, 0, 0.55 if kt < 18 else 0.7)

def make_ir(sec=3.6, t60=2.9, seed=3):
    r = np.random.default_rng(seed); n = int(sec * SR); k = np.arange(n) / SR
    decay = 10 ** (-3 * k / t60)
    irs = []
    for ch in range(2):
        w = r.standard_normal(n) * decay
        w = lp(w, 6000) * 0.7 + lp(w, 1500) * 0.6 * (k / sec)
        w[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        irs.append(w / np.sqrt(np.sum(w ** 2)))
    return irs
irL, irR = make_ir()
wetL = fftconvolve(hp(RL, 180), irL)[:N]; wetR = fftconvolve(hp(RR, 180), irR)[:N]
mixL = L + wetL * 0.9; mixR = R + wetR * 0.9

mixL = hp(mixL, 32, 2); mixR = hp(mixR, 32, 2)
# gentle glue + soft clip
mixL = np.tanh(mixL * 1.3) / 1.3; mixR = np.tanh(mixR * 1.3) / 1.3
fade_in = np.minimum(1, t / 0.05)
fade_out = 1 - seg(t, 44.1, 45.0) ** 1.5
mixL *= fade_in * fade_out; mixR *= fade_in * fade_out
peak = max(np.abs(mixL).max(), np.abs(mixR).max())
mixL /= peak / 0.89; mixR /= peak / 0.89
wavfile.write('score30to45_raw.wav', SR, np.stack([mixL, mixR], 1).astype(np.float32))
print('ok peak', peak)
