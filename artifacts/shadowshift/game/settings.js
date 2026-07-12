// Settings — single persisted source of truth for user preferences
// (music, sound, vibration, graphics quality). Everything here is saved to
// Local Storage and readable synchronously by any system that needs it
// (menu, gameplay, engine) without threading props through every layer.

const STORAGE_KEY = 'shadowshift:settings';
const HIGH_SCORE_STORAGE_KEY = 'shadowshift:highScore';
const LEGACY_MUTED_STORAGE_KEY = 'shadowshift:muted';

export const QUALITY_LEVELS = ['low', 'medium', 'high'];

/**
 * Concrete effects of each quality tier:
 *  - maxDpr: caps the canvas backing-store resolution (biggest perf lever).
 *  - starCount: menu starfield density.
 *  - particleCount: coin-pickup particle burst size.
 *  - glowBlur: shadowBlur amount used for coin/obstacle/player glows (0 = off).
 */
export const QUALITY_PRESETS = {
  low: { maxDpr: 1, starCount: 24, particleCount: 5, glowBlur: 0 },
  medium: { maxDpr: 1.5, starCount: 45, particleCount: 9, glowBlur: 10 },
  high: { maxDpr: 2, starCount: 70, particleCount: 12, glowBlur: 18 },
};

const DEFAULTS = {
  musicOn: true,
  soundOn: true,
  vibrationOn: true,
  graphicsQuality: 'high',
};

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore — preferences just won't persist across sessions.
  }
}

class SettingsStore {
  constructor() {
    this._state = loadState();
    this._listeners = new Set();
  }

  get musicOn() {
    return this._state.musicOn;
  }

  get soundOn() {
    return this._state.soundOn;
  }

  get vibrationOn() {
    return this._state.vibrationOn;
  }

  get graphicsQuality() {
    return this._state.graphicsQuality;
  }

  /** Resolved numeric/tunable values for the current quality tier. */
  get qualityPreset() {
    return QUALITY_PRESETS[this._state.graphicsQuality] ?? QUALITY_PRESETS.high;
  }

  set(key, value) {
    if (this._state[key] === value) return;
    this._state[key] = value;
    saveState(this._state);
    this._emit();
  }

  toggle(key) {
    this.set(key, !this._state[key]);
    return this._state[key];
  }

  /** Subscribe to any settings change. Returns an unsubscribe function. */
  onChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _emit() {
    for (const listener of this._listeners) listener(this._state);
  }

  /**
   * Wipes saved progress (high score). Deliberately leaves user preferences
   * (music/sound/vibration/quality) untouched — those are settings, not
   * save data, and resetting them would be surprising here.
   */
  resetSaveData() {
    try {
      window.localStorage.removeItem(HIGH_SCORE_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_MUTED_STORAGE_KEY);
    } catch {
      // Ignore — best-effort clear.
    }
  }
}

export const settings = new SettingsStore();
