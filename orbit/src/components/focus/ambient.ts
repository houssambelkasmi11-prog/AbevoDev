"use client";

export type AmbientKind = "off" | "brown" | "rain" | "space";

/** Procedural ambient sound — no audio files, no network. */
export class Ambient {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private timers: number[] = [];
  private volume = 0.35;

  setVolume(v: number) {
    this.volume = v;
    if (this.gain && this.ctx) this.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.2);
  }

  async play(kind: AmbientKind) {
    this.stop();
    if (kind === "off") return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = this.ctx ?? new Ctx();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    const ctx = this.ctx;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(ctx.destination);
    this.gain.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.6);

    if (kind === "brown" || kind === "rain") {
      const len = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        if (kind === "brown") {
          last = (last + 0.02 * white) / 1.02;
          data[i] = last * 3.2;
        } else data[i] = white * 0.5;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      let out: AudioNode = src;
      if (kind === "rain") {
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 900;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 7000;
        const flutter = ctx.createGain();
        flutter.gain.value = 0.6;
        src.connect(hp).connect(lp).connect(flutter);
        out = flutter;
        const id = window.setInterval(() => flutter.gain.setTargetAtTime(0.45 + Math.random() * 0.3, ctx.currentTime, 0.4), 700);
        this.timers.push(id);
        this.nodes.push(hp, lp, flutter);
      }
      out.connect(this.gain);
      src.start();
      this.nodes.push(src);
    } else {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      lp.connect(this.gain);
      [55, 55.4, 82.5].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i === 2 ? "sine" : "triangle";
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = i === 2 ? 0.08 : 0.18;
        o.connect(g).connect(lp);
        o.start();
        this.nodes.push(o, g);
      });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 160;
      lfo.connect(lfoGain).connect(lp.frequency);
      lfo.start();
      this.nodes.push(lp, lfo, lfoGain);
    }
  }

  stop() {
    this.timers.forEach((t) => window.clearInterval(t));
    this.timers = [];
    for (const n of this.nodes) {
      try {
        if (n instanceof AudioScheduledSourceNode) n.stop();
        n.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.nodes = [];
    this.gain?.disconnect();
    this.gain = null;
  }

  dispose() {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}
