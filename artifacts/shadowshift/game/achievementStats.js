// AchievementStats — lifetime counters that exist purely to gate
// achievements and aren't needed anywhere else (contrast with
// missionStats.js, whose coin/distance/switch/game counters missions
// share with nothing else either, but predate this file). Kept separate
// so achievements can evolve independently of the mission system.

const STORAGE_KEY = 'shadowshift:achievementStats';

const DEFAULT_STATS = {
  hasJumped: false,
  longestRunSeconds: 0,
  reachedMaxSpeed: false,
  shadowSeconds: 0,
};

function loadStats() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    // Storage unavailable (private browsing, disabled cookies, etc.) —
    // stats just won't persist across sessions.
    return { ...DEFAULT_STATS };
  }
}

function saveStats(stats) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore — persistence is a nice-to-have, not a gameplay requirement.
  }
}

class AchievementStats {
  constructor() {
    this._stats = loadStats();
    this._listeners = new Set();
  }

  get(statKey) {
    return this._stats[statKey];
  }

  markJumped() {
    if (this._stats.hasJumped) return;
    this._stats.hasJumped = true;
    this._commit();
  }

  /** Report how long the current run has lasted — only ever raises the best. */
  reportRunSeconds(seconds) {
    if (!Number.isFinite(seconds) || seconds <= this._stats.longestRunSeconds) return;
    this._stats.longestRunSeconds = seconds;
    this._commit();
  }

  markMaxSpeedReached() {
    if (this._stats.reachedMaxSpeed) return;
    this._stats.reachedMaxSpeed = true;
    this._commit();
  }

  /** Accumulate time spent in the Shadow world across all runs. */
  addShadowSeconds(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    this._stats.shadowSeconds += deltaSeconds;
    this._commit();
  }

  /** Subscribe to any stat change. Returns an unsubscribe function. */
  onChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _commit() {
    saveStats(this._stats);
    for (const listener of this._listeners) listener(this._stats);
  }
}

export const achievementStats = new AchievementStats();
