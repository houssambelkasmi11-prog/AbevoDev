"""ORBIT — 75 s original cinematic ambient score (synthesized, no samples)."""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000; DUR = 75.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(11)
L = np.zeros(N); R = np.zeros(N); RL = np.zeros(N); RR = np.zeros(N)

def note(n): return 440.0 * 2 ** ((n - 69) / 12)
def NM(s):
    names = {'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11}
    return 12 * (int(s[-1]) + 1) + names[s[:-1]]
def hz(s): return note(NM(s))
def seg(x, a, b): return np.clip((x - a) / (b - a), 0, 1)
def sio(x): return 0.5 - 0.5 * np.cos(np.pi * np.clip(x, 0, 1))
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def env_ad(n, a, d):
    k = np.arange(n) / SR
    return np.minimum(1, k / max(a, 1e-4)) * np.exp(-np.maximum(0, k - a) / d)

def add(sig, start, pan=0.0, gain=1.0, send=0.0):
    i = int(start * SR)
    if i >= N: return
    s = sig[: N - i] * gain
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i:i+len(s)] += s * gl; R[i:i+len(s)] += s * gr
    if send: RL[i:i+len(s)] += s * gl * send; RR[i:i+len(s)] += s * gr * send

def bell(f, dur=4.0, idx=1.4, ratio=3.5, dec=1.8):
    n = int(dur * SR); k = np.arange(n) / SR
    I = idx * np.exp(-k / 0.45)
    s = np.sin(2*np.pi*f*k + I*np.sin(2*np.pi*f*ratio*k)) + 0.25*np.sin(2*np.pi*2.001*f*k)*np.exp(-k/0.6)
    return s * env_ad(n, 0.004, dec)

def glint(f, dur=3.0):
    n = int(dur * SR); k = np.arange(n) / SR
    s = np.sin(2*np.pi*f*k) + 0.3*np.sin(2*np.pi*f*2.0*k)*np.exp(-k/0.3)
    return s * env_ad(n, 0.01, 0.9)

def pluck(f, dur=0.9, bright=0.7):
    n = int(dur * SR); k = np.arange(n) / SR
    s = np.sin(2*np.pi*f*k) + 0.3*bright*np.sin(2*np.pi*2*f*k)*np.exp(-k/0.1) + 0.1*bright*np.sin(2*np.pi*3*f*k)*np.exp(-k/0.05)
    return s * env_ad(n, 0.004, 0.32)

def soft_kick(gain=1.0):
    n = int(0.7 * SR); k = np.arange(n) / SR
    f = 44 + 46 * np.exp(-k / 0.05)
    s = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-k / 0.3) * np.minimum(1, k / 0.004)
    return lp(s, 900) * gain

def shaker(gain=1.0):
    n = int(0.12 * SR); k = np.arange(n) / SR
    return bp(rng.standard_normal(n), 5000, 11000, 2) * env_ad(n, 0.006, 0.025) * gain

def tick(f=2600, gain=1.0):
    n = int(0.06 * SR); k = np.arange(n) / SR
    return np.sin(2*np.pi*f*k) * np.exp(-k / 0.008) * gain

def bloom(f=55, dur=3.5, gain=1.0):  # warm low swell instead of an impact
    gain *= 0.7
    n = int(dur * SR); k = np.arange(n) / SR
    e = np.minimum(1, k / 0.35) * np.exp(-np.maximum(0, k - 0.35) / 1.1)
    s = np.sin(2*np.pi*f*k) + 0.35*np.sin(2*np.pi*2*f*k) + 0.12*np.sin(2*np.pi*3*f*k)
    return s * e * gain

def air(start, end, f0, f1, gain, shape=2.0):
    n = int((end - start) * SR); k = np.arange(n) / SR; x = k / (end - start)
    w = rng.standard_normal(n); out = np.zeros(n); B = 2048
    for b in range(0, n, B):
        fc = f0 * (f1 / f0) ** x[b]
        out[b:b+B] = bp(w[b:b+B], max(80, fc * .75), min(SR / 2 - 200, fc * 1.35), 1)
    return out * (x ** shape) * gain

def pad(names, start, end, gain=0.1, cutoff=1500, fade=1.4, width=0.55):
    freqs = [hz(x) for x in names]
    n = int((end - start + fade) * SR); k = np.arange(n) / SR
    oL = np.zeros(n); oR = np.zeros(n)
    for f in freqs:
        for det, pan in ((-0.06, -width), (0.0, 0.0), (0.06, width)):
            ff = f * 2 ** (det / 12); ph = rng.random()
            saw = 2 * ((ff * k + ph) % 1) - 1; tri = 2 * np.abs(saw) - 1
            v = 0.4 * saw + 0.6 * tri
            gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            oL += v * gl; oR += v * gr
    e = sio(k / fade) * np.clip((end - start + fade - k) / fade, 0, 1)
    oL = lp(oL, cutoff) * e * gain / len(freqs); oR = lp(oR, cutoff) * e * gain / len(freqs)
    i = int((start - fade * 0.5) * SR); i = max(0, i); m = min(n, N - i)
    L[i:i+m] += oL[:m]; R[i:i+m] += oR[:m]; RL[i:i+m] += oL[:m] * .6; RR[i:i+m] += oR[:m] * .6

BEAT = 0.75  # 80 BPM

# ── 1. atmosphere ──
atm = lp(hp(rng.standard_normal(N), 250), 2600)
atm_env = 0.020 * sio(seg(t, 0.3, 4.0)) * (1 - 0.5 * sio(seg(t, 41, 54))) * (1 - sio(seg(t, 72, 75)))
L += atm * atm_env; R += np.roll(atm, 1777) * atm_env
sub_env = 0.03 * sio(seg(t, 0.8, 6)) * (1 - 0.4 * sio(seg(t, 19, 24))) * (1 - sio(seg(t, 71, 75)))
sub = np.sin(2*np.pi*55*t) + 0.2*np.sin(2*np.pi*110*t)
L += sub * sub_env; R += sub * sub_env
shim = sum(np.sin(2*np.pi*hz(n)*t + i) for i, n in enumerate(['E6', 'A6', 'B6']))
shim_env = 0.004 * sio(seg(t, 2, 8)) * (1 - sio(seg(t, 10, 14)))
L += shim * shim_env; R += np.roll(shim, 900) * shim_env

# ── 2. points of light ──
add(bell(hz('A5'), 6, idx=0.9, ratio=2.0, dec=2.2), 1.2, 0, 0.032, 1.0)
pent = ['A5', 'C6', 'E6', 'D6', 'G5', 'E6', 'A6', 'C6', 'G6', 'D6', 'E6', 'A5']
for i in range(1, 13):
    add(glint(hz(pent[i - 1])), 2.5 + (i - 1) * 0.31, float(rng.uniform(-.7, .7)), 0.018, 1.0)
for i in range(13, 41, 2):
    add(glint(hz(pent[i % 12]) * 2, 2.0), 6.3 + (i - 13) * 0.125, float(rng.uniform(-.8, .8)), 0.007, 1.0)

# ── 3. harmony ──
pad(['A2', 'E3', 'B3', 'C4'], 5.0, 10.5, 0.11, 900, 2.6)
pad(['F2', 'C3', 'E3', 'A3'], 10.5, 14.5, 0.12, 1100, 1.6)
pad(['G2', 'D3', 'E3', 'B3'], 14.5, 19.0, 0.12, 1200, 1.6)
pad(['A2', 'E3', 'G3', 'B3', 'C4'], 19.0, 24.5, 0.13, 1400, 1.6)
pad(['F2', 'C3', 'E3', 'G3', 'A3'], 24.5, 30.0, 0.13, 1500, 1.6)
pad(['C3', 'E3', 'G3', 'B3', 'D4'], 30.0, 35.5, 0.13, 1600, 1.6)
pad(['G2', 'D3', 'G3', 'B3', 'D4'], 35.5, 41.0, 0.13, 1600, 1.6)
for a, b, ch in ((41, 44.25, ['A2', 'E3', 'A3', 'C4', 'E4']), (44.25, 47.5, ['F2', 'C3', 'A3', 'C4', 'E4']),
                 (47.5, 50.75, ['C3', 'G3', 'C4', 'E4', 'G4']), (50.75, 54, ['G2', 'D3', 'B3', 'D4', 'G4'])):
    pad(ch, a, b, 0.14, 2000, 1.2)
pad(['F2', 'C3', 'A3', 'E4', 'G4'], 54.0, 57.5, 0.16, 2400, 1.6)
pad(['G2', 'D3', 'B3', 'D4', 'A4'], 57.5, 61.0, 0.17, 2600, 1.6)
pad(['A2', 'E3', 'C4', 'E4', 'B4'], 61.0, 63.5, 0.17, 2600, 1.6)
pad(['F2', 'C3', 'A3', 'E4', 'G4'], 63.5, 66.5, 0.15, 2000, 1.8)
pad(['C2', 'G2', 'E3', 'D4', 'G4'], 66.5, 75.5, 0.15, 1700, 2.2)

# ── 4. pulse (from 12 s) ──
side = np.zeros(N)
def kick_at(kt, g):
    add(soft_kick(), kt, 0, g * 0.72)
    i = int(kt * SR); n = int(0.5 * SR); k = np.arange(min(n, N - i)) / SR
    side[i:i+len(k)] = np.maximum(side[i:i+len(k)], np.exp(-k / 0.16))
for kt in np.arange(12.0, 63.4, BEAT):
    if kt < 19: g = 0.18 + 0.1 * (kt - 12) / 7
    elif kt < 41: g = 0.3
    elif kt < 54: g = 0.38
    else: g = 0.42 if kt < 61.9 else 0.42 * (1 - (kt - 61.9) / 1.5)
    if 24.4 < kt < 25.6: continue          # space for the transition into the workspace
    kick_at(kt, g)
for kt in np.arange(41.0 + BEAT / 2, 63.0, BEAT / 2):
    add(shaker(), kt, 0.35 if int(kt / (BEAT / 2)) % 2 else -0.35, 0.022 if kt < 54 else 0.028)

# bass from 41
bass = np.zeros(N)
for a, b, r in ((41, 44.25, 'A1'), (44.25, 47.5, 'F1'), (47.5, 50.75, 'C2'), (50.75, 54, 'G1'), (54, 57.5, 'F1'), (57.5, 61, 'G1'), (61, 63.5, 'A1')):
    f = hz(r)
    for tt in np.arange(a, b - 1e-6, BEAT / 2):
        n = int(0.3 * SR); k = np.arange(n) / SR
        s = (0.75*np.sin(2*np.pi*f*k) + 0.25*(2*((f*k) % 1)-1)) * env_ad(n, 0.006, 0.16)
        i = int(tt * SR); m = min(n, N - i); bass[i:i+m] += s[:m]
bass = lp(bass, 380) * 0.16
L += bass; R += bass

# ── 5. arpeggio motif (19 s →) ──
arp = [(19, 24.5, ['A4', 'E5', 'B4', 'C5']), (24.5, 30, ['F4', 'C5', 'G4', 'A4']), (30, 35.5, ['C5', 'G5', 'D5', 'E5']),
       (35.5, 41, ['G4', 'D5', 'A4', 'B4']), (41, 44.25, ['A4', 'E5', 'C5', 'E5']), (44.25, 47.5, ['F4', 'C5', 'A4', 'E5']),
       (47.5, 50.75, ['C5', 'G5', 'E5', 'G5']), (50.75, 54, ['G4', 'D5', 'B4', 'D5']), (54, 57.5, ['F4', 'C5', 'A4', 'G5']),
       (57.5, 61, ['G4', 'D5', 'B4', 'A5']), (61, 63.5, ['A4', 'E5', 'C5', 'B5'])]
st = 0
for a, b, ns in arp:
    for tt in np.arange(a, b - 1e-6, BEAT / 2):
        if 24.5 < tt < 25.5: st += 1; continue
        g = 0.035 if tt < 41 else 0.045 if tt < 54 else 0.05
        if tt < 20.5: g *= (tt - 19) / 1.5
        add(pluck(hz(ns[st % 4])), tt, -0.4 if st % 2 else 0.4, g, 0.5)
        st += 1

# ── 6. moments ──
add(bloom(55, 4, 1), 5.6, 0, 0.12, 0.3)                      # "Your mind."
add(bell(hz('E5'), 5, idx=1.0, dec=2.0), 5.9, -0.1, 0.03, 1.0)
add(bell(hz('B5'), 5, idx=1.0, dec=2.0), 12.6, 0.15, 0.03, 1.0)   # "In motion."
add(bloom(55, 4, 1), 12.4, 0, 0.1, 0.3)
add(air(16.2, 18.4, 900, 7000, 0.03), 16.2, 0, 1, 0.8)          # the website arrives
add(bell(hz('A5'), 4, idx=0.7, ratio=2, dec=1.8), 18.3, 0.2, 0.03, 1.0)
add(tick(2400, 1), 24.55, 0.2, 0.035, 0.3)                       # click "Open ORBIT"
add(air(24.6, 25.4, 600, 8000, 0.05, 1.6), 24.6, 0, 1, 0.6)
add(bloom(55, 4, 1), 25.35, 0, 0.14, 0.35)
add(bell(hz('E6'), 4, idx=0.8, ratio=2, dec=1.6), 25.4, -0.2, 0.025, 1.0)
add(tick(2800, 1), 28.8, 0.25, 0.03, 0.3)                        # Explain
for i, tt in enumerate(np.arange(31.5, 37.0, 1.0)):              # personalities, one by one
    add(glint(hz(['C6', 'D6', 'E6', 'G6', 'A6', 'C7'][i]), 2.5), tt, -0.5 + 0.2 * i, 0.016, 1.0)
for tt in (42.5, 45.4, 48.6):                                    # CAPTURE / CONNECT / EXPAND
    add(bloom(55 if tt != 48.6 else 65.4, 3, 1), tt - 0.1, 0, 0.09, 0.3)
    add(bell(hz('A4') if tt == 42.5 else hz('C5') if tt == 45.4 else hz('E5'), 4, idx=1.0, dec=1.8), tt, 0, 0.028, 0.9)
# the citation connecting to its source: a soft rising glide
n = int(1.0 * SR); k = np.arange(n) / SR; f = hz('E5') * 2 ** (k * 7 / 12)
add(np.sin(2*np.pi*np.cumsum(f)/SR) * sio(k / .15) * np.exp(-k / .5), 46.5, 0.3, 0.018, 1.0)
add(air(52.6, 54.2, 500, 6000, 0.035), 52.6, 0, 1, 0.8)          # into the universe
add(bloom(43.65, 5, 1), 54.0, 0, 0.13, 0.4)
# restrained peak: a simple lead over the universe
lead = [(57.5, 'E5'), (58.25, 'G5'), (59.0, 'A5'), (60.5, 'B5'), (61.0, 'C6'), (61.75, 'B5'), (62.5, 'A5')]
for tt, nn in lead:
    add(bell(hz(nn), 4, idx=0.9, ratio=2.0, dec=2.0), tt, 0.1, 0.04, 1.0)
for j in range(7):                                                # the highlight travelling
    add(glint(hz(['A5', 'C6', 'E6', 'G6', 'A6', 'E6', 'A6'][j]) , 2.0), 59.0 + j * (3.8 / 7), -0.6 + 0.2 * j, 0.014, 1.0)

# ── 7. signature & resolution ──
for tt, nn, g in ((65.6, 'G5', 0.05), (66.05, 'C6', 0.05), (66.5, 'D6', 0.045)):
    add(bell(hz(nn), 6, idx=1.3, ratio=3.5, dec=2.4), tt, 0.0, g, 1.0)
add(bloom(65.41, 6, 1), 65.6, 0, 0.12, 0.4)
add(bell(hz('E6'), 5, idx=0.6, ratio=2.0, dec=2.2), 71.0, 0.2, 0.025, 1.0)   # ENTER ORBIT
add(bell(hz('G4'), 5, idx=0.6, ratio=2.0, dec=2.4), 71.0, -0.2, 0.025, 1.0)

# ── mix ──
duck = 1 - 0.22 * side
L *= duck; R *= duck
def make_ir(sec=4.5, t60=3.6, seed=3):
    r = np.random.default_rng(seed); n = int(sec * SR); k = np.arange(n) / SR
    out = []
    for ch in range(2):
        w = r.standard_normal(n) * 10 ** (-3 * k / t60)
        w = lp(w, 5500) * 0.7 + lp(w, 1400) * 0.6 * (k / sec)
        w[: int(0.015 * SR)] *= np.linspace(0, 1, int(0.015 * SR))
        out.append(w / np.sqrt(np.sum(w ** 2)))
    return out
irL, irR = make_ir()
wL = fftconvolve(hp(RL, 200), irL)[:N]; wR = fftconvolve(hp(RR, 200), irR)[:N]
mL = L + wL * 0.85; mR = R + wR * 0.85
mL = hp(mL, 30); mR = hp(mR, 30)
mL = np.tanh(mL * 1.2) / 1.2; mR = np.tanh(mR * 1.2) / 1.2
fo = 1 - sio(seg(t, 73.6, 75.0)); fi = np.minimum(1, t / 0.1)
mL *= fo * fi; mR *= fo * fi
pk = max(np.abs(mL).max(), np.abs(mR).max()); mL /= pk / 0.89; mR /= pk / 0.89
wavfile.write('score75_raw.wav', SR, np.stack([mL, mR], 1).astype(np.float32))
print('ok', pk)
