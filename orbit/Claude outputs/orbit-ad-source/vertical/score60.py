"""ORBIT — original 45 s (30 s score re-timed to the 45 s cut) electronic-ambient score, synthesized from scratch (no samples)."""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
DUR = 60.0
def M(x): return float(x)
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

# ───────────── arrangement (60 s, 120 BPM) ─────────────
def piano(f, dur=3.2, vel=1.0):
    n = int(dur * SR); k = np.arange(n) / SR
    s = np.zeros(n)
    for h, (a, d) in enumerate(((1, 1.6), (0.55, 1.1), (0.32, 0.7), (0.2, 0.45), (0.1, 0.3), (0.06, 0.2)), start=1):
        ff = f * h * (1 + 0.0004 * h * h)
        s += a * np.sin(2*np.pi*ff*k + 0.3*h) * np.exp(-k / (d * (1.4 if f < 300 else 1.0)))
    ham = lp(rng.standard_normal(n), 2200) * np.exp(-k / 0.012) * 0.25
    return (s + ham) * np.minimum(1, k / 0.002) * vel

def rustle(dur=0.28, gain=1.0):
    n = int(dur * SR); k = np.arange(n) / SR
    w = bp(rng.standard_normal(n), 1800, 7000, 1)
    e = (np.abs(np.sin(2*np.pi*(5+3*rng.random())*k)) ** 2) * np.sin(np.pi * k / dur)
    return w * e * gain

def buzz(dur=0.22, gain=1.0):
    n = int(dur * SR); k = np.arange(n) / SR
    return (np.sin(2*np.pi*165*k) * (0.6 + 0.4*np.sign(np.sin(2*np.pi*28*k)))) * np.sin(np.pi*k/dur) * gain

def key(gain=1.0):
    n = int(0.05 * SR); k = np.arange(n) / SR
    return (lp(rng.standard_normal(n), 3500) * np.exp(-k/0.006) + 0.5*np.sin(2*np.pi*1500*k)*np.exp(-k/0.004)) * gain

# bed: low drone, A1
drone_env = np.clip(seg(t, 0.4, 5) * 0.6 + seg(t, 15, 16) * 0.25 + seg(t, 43, 45) * 0.15, 0, 1) * (1 - seg(t, 58.4, 60))
drone = (np.sin(2*np.pi*55*t) + 0.2*np.sin(2*np.pi*110*t + 0.3)) * drone_env * 0.06
L += drone; R += drone

CH = [['A2','E3','B3','C4'], ['F2','C3','E3','A3'], ['C3','G3','E4','B3'], ['G2','D3','B3','D4']]   # Am9 F C G
def pad_prog(a, b, gain, cutoff):
    for j, s0 in enumerate(np.arange(a, b, 4.0)):
        ns = CH[(j + int((a)//4)) % 4]
        i, pl, pr = pad([note(NM(x)) for x in ns], max(0, s0 - 0.4), min(s0 + 4.0, b), gain=gain, cutoff=cutoff, fade=1.4)
        L[i:i+len(pl)] += pl; R[i:i+len(pr)] += pr
        RL[i:i+len(pl)] += pl * 0.7; RR[i:i+len(pr)] += pr * 0.7
pad_prog(0.0, 15.0, 0.075, 800)       # desk: warm, small
pad_prog(15.0, 24.0, 0.10, 1400)      # ORBIT enters
pad_prog(24.0, 43.0, 0.085, 1300)     # demo: restrained
pad_prog(43.0, 52.0, 0.14, 2600)      # the shift: opens up
# resolution chords (A add9, long)
for ns, a, b in ((['A2','E3','A3','C4','E4'], 52.0, 56.0), (['F2','C3','A3','C4','E4'], 56.0, 58.0), (['A2','E3','B3','C#4','E4'], 58.0, 60.0)):
    i, pl, pr = pad([note(NM(x)) for x in ns], a - 0.4, b, gain=0.13, cutoff=2400, fade=1.6)
    L[i:i+len(pl)] += pl; R[i:i+len(pr)] += pr; RL[i:i+len(pl)] += pl*0.8; RR[i:i+len(pr)] += pr*0.8

# piano: slow tone in the desk scenes, then fuller
PM = [['E5','C5','B4','A4'], ['C5','A4','E5','F5'], ['E5','G5','C5','E5'], ['D5','B4','G5','D5']]
def piano_run(a, b, step, gain, octave_up=False, pat=(0, 1, 2, 3)):
    k_ = 0
    for tt in np.arange(a, b - 1e-6, step):
        ch = PM[int((tt // 4)) % 4]; nm = ch[pat[k_ % len(pat)]]; k_ += 1
        f = note(NM(nm)) * (2 if octave_up else 1)
        add_p(piano(f, 3.0, 1.0), tt, [-.3, .2, .35, -.15][k_ % 4], gain)
def add_p(sig, tt, pan, gain): addn(sig, tt, pan, gain, 0.7)
piano_run(1.0, 8.0, 1.0, 0.085)                       # S1: one note per second
piano_run(8.0, 15.0, 0.5, 0.075)                      # S2: curiosity
for tt in np.arange(0.0, 15.0, 4.0):                   # left hand roots
    addn(piano(note(NM(['A2','F2','C3','G2'][int(tt//4) % 4])), 3.5, 1.0), tt, -0.2, 0.10, 0.6)
piano_run(15.0, 24.0, 1.0, 0.055)
piano_run(24.0, 43.0, 1.0, 0.04)
for tt in np.arange(16.0, 43.0, 4.0):
    addn(piano(note(NM(['A2','F2','C3','G2'][int(tt//4) % 4])), 3.5, 1.0), tt, -0.2, 0.07, 0.6)
piano_run(43.0, 52.0, 0.5, 0.075, pat=(0, 2, 1, 3))   # S6: opens
for tt in np.arange(44.0, 52.0, 2.0):
    ch = CH[int(tt//4) % 4]
    for j, nn_ in enumerate(ch):
        addn(piano(note(NM(nn_)), 2.6, 1.0), tt + j * 0.06, -0.1 + 0.1*j, 0.06, 0.7)
# S7 resolution melody
for tt, nn_, g in ((52.0,'E5',0.09),(53.0,'A5',0.08),(54.0,'B5',0.08),(55.0,'C#6',0.08),(56.0,'E6',0.08),(58.0,'A4',0.1)):
    addn(piano(note(NM(nn_)), 3.5, 1.0), tt, 0.1, g, 0.9)
addn(piano(note(NM('A3')), 3.5, 1.0), 58.0, -0.2, 0.09, 0.9)

# gentle electronic pulse from the ORBIT reveal
beats = np.arange(15.0, 52.0, 0.5)
side = np.zeros(N)
for kt in beats:
    if kt < 43.0 or kt > 51.5:
        if kt > 43: continue
    i = int(kt * SR); n = int(0.4 * SR); k = np.arange(min(n, N - i)) / SR
    side[i:i+len(k)] = np.maximum(side[i:i+len(k)], np.exp(-k / 0.12) * (0.7 if kt < 24 else 1.0))
duck = 1 - 0.22 * side
for kt in np.arange(15.0, 43.0, 1.0):
    addn(thump(), kt, 0, 0.20 if kt < 24 else 0.15)
for kt in np.arange(43.5, 52.0, 2.0): addn(thump(), kt, 0, 0.13)
# arps (plucks), restrained
ARP = [['A4','E5','B4','C5'], ['F4','C5','A4','E5'], ['C5','G5','E5','B4'], ['G4','D5','B4','D5']]
stp = 0
for tt in np.arange(15.0, 43.0, 0.25):
    if tt > 24.0 and (int(round(tt*4)) % 2): continue
    ns = ARP[int(tt//4) % 4]; f = note(NM(ns[stp % 4])); stp += 1
    addn(pluck(f, 0.6, 0.9), tt, -0.35 if stp % 2 else 0.35, 0.040 if tt < 24 else 0.028, 0.5)
# bass offbeats during S3
bass = np.zeros(N)
for tt in np.arange(15.25, 24.0, 0.5):
    f = note(NM(['A1','F1','C2','G1'][int(tt//4) % 4])); n = int(0.24*SR); k = np.arange(n)/SR
    s = (0.7*np.sin(2*np.pi*f*k) + 0.3*(2*((f*k) % 1)-1)) * env_ad(n, 0.004, 0.12)
    i = int(tt*SR); m = min(n, N - i); bass[i:i+m] += s[:m]
L += lp(bass, 420) * 0.22; R += lp(bass, 420) * 0.22
# hats very quiet in S6 only
for tt in np.arange(44.0, 51.6, 0.5): addn(hat(), tt + 0.25, 0.3, 0.014)

# real-world sounds
for tt in (1.2, 3.8, 6.3, 8.9, 10.7, 12.1, 13.0): addn(rustle(0.3, 1.0), tt, [-.4,.3,-.2,.4,-.5,.5,.1][(int(tt)) % 7], 0.05, 0.3)
for tt in (2.2, 5.1): addn(buzz(), tt, 0.5, 0.05, 0.2)
for tt in (3.0, 4.6, 6.0): addn(key(), tt, 0.0, 0.07, 0.2)
for tt, n_ in zip((12.9, 13.12, 13.34, 13.56), ('E5','G5','B5','D6')):
    addn(bell(note(NM(n_)), 3.0, idx=0.8, ratio=2.0, dec=1.0), tt, -0.3 + 0.2*(n_ == 'D6'), 0.035, 0.9)
add(noise_swell(13.6, 15.0, 300, 5000, 0.07), 13.6, 0, 1.0, 0.5)
# KEY MOMENT: screen becomes ORBIT
addn(bell(note(NM('A5')), 5.0, idx=1.4, ratio=2.0, dec=1.9), 15.0, 0.0, 0.10, 0.9)
addn(bell(note(NM('E6')), 4.0, idx=0.8, ratio=2.0, dec=1.6), 15.05, 0.3, 0.05, 0.9)
addn(boom(0.6), 15.0, 0, 0.30, 0.3)
# UI in the notes interaction
addn(click(1, 2600), 17.6, 0.2, 0.08, 0.3)
add(noise_swell(17.65, 18.4, 400, 6000, 0.08), 17.65, 0, 1.0, 0.5)
for j, tt in enumerate(np.linspace(19.55, 20.5, 6)): addn(key(0.6), tt, 0.0, 0.05, 0.2)
addn(click(1, 3000), 21.4, 0.25, 0.08, 0.3)
addn(bell(note(NM('E6')), 2.5, idx=0.7, ratio=2.0, dec=0.9), 21.5, 0.2, 0.04, 0.9)
for tt in np.arange(22.3, 23.7, 0.16): addn(click(0.5, 3600 + 200*((tt*7) % 3)), tt, 0.3, 0.012, 0.2)
# library, answer, homework
addn(rustle(0.25), 24.3, 0, 0.04, 0.3)
for i_ in range(4): addn(click(1, 3000 + 300*i_), 25.7 + i_*0.55, 0.2, 0.05, 0.3)
for i_, f in enumerate((note(NM('C6')), note(NM('E6')), note(NM('G6')), note(NM('B6')))): addn(bell(f, 2.0, idx=0.5, ratio=2.0, dec=0.7), 25.75 + i_*0.55, -0.4 + 0.27*i_, 0.025, 0.9)
for tt in np.arange(29.2, 31.1, 0.14): addn(click(0.5, 3400), tt, -0.2, 0.011, 0.2)
addn(bell(note(NM('A5')), 3.0, idx=0.8, ratio=2.0, dec=1.2), 31.2, 0.0, 0.05, 0.9)
for i_ in range(6): addn(click(1, 2800 + 250*i_), 32.0 + i_*0.2, 0.15, 0.05, 0.3)
for i_, tt in enumerate((33.0, 33.28, 33.56)): addn(bell(note(NM(['E6','G6','A6'][i_])), 2.5, idx=0.6, ratio=2.0, dec=0.9), tt, 0.1*i_, 0.035, 0.9)
# personas + knowledge orbit
add(noise_swell(36.6, 37.3, 500, 4000, 0.05), 36.6, 0, 1.0, 0.5)
addn(bell(note(NM('D6')), 3.0, idx=0.9, ratio=2.0, dec=1.2), 36.9, 0.1, 0.045, 0.9)
for i_ in range(6): addn(pluck(note(NM(['A5','C6','E6','G6','A6','C7'][i_])), 0.8, 0.6), 38.95 + i_*0.09, -0.5 + 0.2*i_, 0.035, 0.8)
for i_, nn_ in enumerate(('A5','C6','E6','G6','B6','D7','E6')): addn(bell(note(NM(nn_)), 2.5, idx=0.5, ratio=2.0, dec=0.9), 40.3 + i_*0.3, -0.6 + 0.2*i_, 0.03, 0.9)
addn(bell(note(NM('A6')), 3.5, idx=0.8, ratio=2.0, dec=1.4), 41.9, 0.0, 0.05, 0.9)
# the shift
add(noise_swell(42.3, 43.6, 300, 7000, 0.08), 42.3, 0, 1.0, 0.5)
addn(boom(0.7), 43.6, 0, 0.30, 0.4)
addn(bell(note(NM('F5')), 4.5, idx=1.2, ratio=2.0, dec=1.9), 43.6, -0.1, 0.07, 0.9)
for tt in (45.2, 48.3): addn(click(1, 3000), tt, 0.2, 0.06, 0.3); addn(bell(note(NM('E6')), 2.5, idx=0.6, ratio=2.0, dec=1.0), tt, 0.2, 0.04, 0.9)
addn(rustle(0.3), 44.0, -0.3, 0.04, 0.3); addn(rustle(0.3), 46.8, 0.3, 0.035, 0.3)
addn(bell(note(NM('C6')), 5.0, idx=1.2, ratio=2.0, dec=2.0), 47.4, 0.0, 0.07, 0.9)    # emotional high point
addn(bell(note(NM('G6')), 5.0, idx=1.0, ratio=2.0, dec=2.0), 47.5, 0.25, 0.05, 0.9)
# end card
add(noise_swell(51.2, 52.5, 400, 8000, 0.06), 51.2, 0, 1.0, 0.6)
for tt, n_, g in ((54.3, 'E5', 0.10), (54.8, 'A5', 0.10), (55.3, 'B5', 0.09)):
    addn(bell(note(NM(n_)), 5.0, idx=1.6, ratio=3.5, dec=2.0), tt, 0.0, g, 0.9)
addn(boom(0.7), 54.3, 0, 0.30, 0.4)
addn(bell(note(NM('E6')), 5.0, idx=0.7, ratio=2.0, dec=1.9), 56.0, 0.2, 0.05, 1.0)
addn(bell(note(NM('A4')), 5.0, idx=0.9, ratio=2.0, dec=2.2), 56.0, -0.2, 0.05, 1.0)

# ───────────── mix ─────────────
L *= duck; R *= duck
def make_ir(sec=3.6, t60=2.9, seed=3):
    r = np.random.default_rng(seed); n = int(sec * SR); k = np.arange(n) / SR
    decay = 10 ** (-3 * k / t60); irs = []
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
mixL = np.tanh(mixL * 1.3) / 1.3; mixR = np.tanh(mixR * 1.3) / 1.3
fade_in = np.minimum(1, t / 0.4)
fade_out = 1 - seg(t, 58.6, 60.0) ** 1.4
mixL *= fade_in * fade_out; mixR *= fade_in * fade_out
peak = max(np.abs(mixL).max(), np.abs(mixR).max())
mixL /= peak / 0.89; mixR /= peak / 0.89
wavfile.write('score60_raw.wav', SR, np.stack([mixL, mixR], 1).astype(np.float32))
print('ok peak', peak)
