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

  /** Placeholder coin-pickup sound — a short synthesized two-tone blip. */
  playCoin() {
    if (this.muted) return;

    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(1760, now + 0.09);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }
}
