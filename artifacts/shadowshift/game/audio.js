// Sfx — sound effects for gameplay events.
//
// PLACEHOLDER: `playCoin()` synthesizes a simple rising blip via the Web
// Audio API instead of loading a real sound asset. Swap this out for a
// proper coin-pickup sample (e.g. load an <audio> element or an
// AudioBuffer) whenever real audio assets are available — the call site
// (`sfx.playCoin()`) doesn't need to change.

const MUTED_STORAGE_KEY = 'shadowshift:muted';

function loadMuted() {
  try {
    return window.localStorage.getItem(MUTED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveMuted(muted) {
  try {
    window.localStorage.setItem(MUTED_STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // Ignore — mute preference just won't persist across sessions.
  }
}

export class Sfx {
  constructor() {
    this._ctx = null;
    this.muted = loadMuted();
  }

  setMuted(muted) {
    this.muted = muted;
    saveMuted(muted);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  _ensureContext() {
    if (this._ctx) {
      if (this._ctx.state === 'suspended') this._ctx.resume();
      return this._ctx;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    this._ctx = new AudioContextClass();
    return this._ctx;
  }

  /**
   * Shared synth helper for every short one-shot SFX below — a single
   * oscillator with an exponential frequency slide and a percussive
   * attack/decay envelope. All the placeholder sounds are just different
   * parameterizations of this same shape; swap in real samples later
   * without touching call sites (`sfx.playJump()` etc. stay the same).
   */
  _playTone({
    type = 'sine',
    startFreq,
    endFreq = startFreq,
    slideSeconds = 0.09,
    peakGain = 0.25,
    attackSeconds = 0.01,
    durationSeconds = 0.18,
  }) {
    if (this.muted) return;

    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFreq, now);
    if (endFreq !== startFreq) {
      oscillator.frequency.exponentialRampToValueAtTime(endFreq, now + slideSeconds);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + attackSeconds);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + durationSeconds + 0.02);
  }

  /** Placeholder coin-pickup sound — a short rising two-tone blip. */
  playCoin() {
    this._playTone({
      type: 'sine',
      startFreq: 880,
      endFreq: 1760,
      slideSeconds: 0.09,
      peakGain: 0.25,
      durationSeconds: 0.18,
    });
  }

  /** Placeholder jump sound — a quick upward "whoosh" chirp. */
  playJump() {
    this._playTone({
      type: 'triangle',
      startFreq: 340,
      endFreq: 620,
      slideSeconds: 0.1,
      peakGain: 0.22,
      durationSeconds: 0.14,
    });
  }

  /** Placeholder world-switch sound — a bright, slightly longer sweep to
   * mark the Light/Shadow transition as a bigger event than a jump/coin. */
  playWorldSwitch() {
    if (this.muted) return;

    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Two overlapping sweeps (a fifth apart) read as a small "shimmer"
    // rather than a single flat blip — appropriate for a world-warp beat.
    this._playTone({
      type: 'sine',
      startFreq: 260,
      endFreq: 1040,
      slideSeconds: 0.22,
      peakGain: 0.22,
      attackSeconds: 0.015,
      durationSeconds: 0.32,
    });

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(390, now);
    osc2.frequency.exponentialRampToValueAtTime(1560, now + 0.22);
    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.exponentialRampToValueAtTime(0.14, now + 0.015);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.34);
  }

  /** Placeholder collision/game-over sound — a low descending thud. */
  playCollision() {
    if (this.muted) return;

    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tonal thud (descending sine) layered with filtered noise for an
    // "impact" texture — a single oscillator alone reads too musical for
    // a crash/game-over beat.
    this._playTone({
      type: 'sawtooth',
      startFreq: 180,
      endFreq: 55,
      slideSeconds: 0.28,
      peakGain: 0.28,
      attackSeconds: 0.005,
      durationSeconds: 0.4,
    });

    const bufferSeconds = 0.25;
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * bufferSeconds, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + bufferSeconds);

    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + bufferSeconds);
  }

  /** Placeholder UI click sound — a tiny, neutral tick for any button press. */
  playClick() {
    this._playTone({
      type: 'square',
      startFreq: 520,
      endFreq: 520,
      peakGain: 0.08,
      attackSeconds: 0.002,
      durationSeconds: 0.05,
    });
  }
}

// A soft, slowly-drifting three-note pad loop, synthesized rather than
// loaded from a sound asset (same placeholder approach as Sfx.playCoin) —
// swap for a real ambient track whenever one is available.
const PAD_NOTES_HZ = [174.61, 220, 261.63]; // F3, A3, C4
const PAD_LFO_HZ = 0.05;

export class Music {
  constructor() {
    this._ctx = null;
    this._nodes = null;
  }

  get isPlaying() {
    return this._nodes !== null;
  }

  _ensureContext() {
    if (this._ctx) {
      if (this._ctx.state === 'suspended') this._ctx.resume();
      return this._ctx;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    this._ctx = new AudioContextClass();
    return this._ctx;
  }

  /** Start the ambient loop. No-op if it's already playing or audio is unavailable. */
  start() {
    if (this.isPlaying) return;

    const ctx = this._ensureContext();
    if (!ctx) return;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.05; // deliberately subtle — background ambience only
    masterGain.connect(ctx.destination);

    const oscillators = PAD_NOTES_HZ.map((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = 1 / PAD_NOTES_HZ.length;

      osc.connect(voiceGain).connect(masterGain);
      osc.start();
      return osc;
    });

    // Slow LFO breathing on the master gain so the pad isn't static.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = PAD_LFO_HZ;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain).connect(masterGain.gain);
    lfo.start();

    this._nodes = { masterGain, oscillators, lfo };
  }

  /** Stop and tear down the ambient loop. Safe to call when already stopped. */
  stop() {
    if (!this._nodes) return;

    const { masterGain, oscillators, lfo } = this._nodes;
    for (const osc of oscillators) osc.stop();
    lfo.stop();
    masterGain.disconnect();

    this._nodes = null;
  }
}
