import type { CueKind } from "./types";

/** Beep patterns per cue: [frequency Hz, offset s, length s]. */
const PATTERNS: Record<CueKind, [number, number, number][]> = {
  tick: [[880, 0, 0.12]],
  go: [[1320, 0, 0.7]],
  warn: [[660, 0, 0.15], [660, 0.25, 0.15]],
  finish: [[523, 0, 0.35], [523, 0.5, 0.35], [523, 1.0, 0.9]],
};

export class CuePlayer {
  private ctx: AudioContext | null = null;

  /** Must be called from a user gesture (iOS refuses to start audio otherwise). */
  unlock() {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    void this.ctx.resume();
    // A near-silent blip makes iOS commit to starting the audio session.
    this.beep(440, this.ctx.currentTime, 0.01, 0.0001);
  }

  /** Schedule a cue to sound `delaySec` from now, on the audio clock (accurate even if JS is throttled). */
  schedule(kind: CueKind, delaySec: number) {
    if (!this.ctx) return;
    const start = this.ctx.currentTime + Math.max(delaySec, 0);
    for (const [freq, offset, len] of PATTERNS[kind]) this.beep(freq, start + offset, len, 0.6);
  }

  private beep(freq: number, at: number, len: number, volume: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
    gain.gain.setValueAtTime(volume, at + Math.max(len - 0.03, 0.01));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(at);
    osc.stop(at + len + 0.02);
  }

  close() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
