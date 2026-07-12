// MissionStats — persistent lifetime counters that missions are measured
// against. Distinct from ScoreManager (per-run, resets every game) and
// Wallet (spendable balance) — these numbers only ever go up (or, for
// distance, track a personal best) across the player's whole history.

const STATS_STORAGE_KEY = 'shadowshift:missionStats';

const DEFAULT_STATS = {
  coinsCollected: 0,
  bestDistanceMeters: 0,
  worldSwitches: 0,
  gamesPlayed: 0,
};

function loadStats() {
  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
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
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore — persistence is a nice-to-have, not a gameplay requirement.
  }
}

class MissionStats {
  constructor() {
    this._stats = loadStats();
    this._listeners = new Set();
  }

  get(statKey) {
    return this._stats[statKey] ?? 0;
  }

  /** Coins picked up during runs (lifetime total, never decreases even when spent). */
  addCoins(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this._stats.coinsCollected += Math.floor(amount);
    this._commit();
  }

  /** Report a run's distance so far — only ever raises the lifetime best. */
  reportDistance(meters) {
    if (!Number.isFinite(meters) || meters <= this._stats.bestDistanceMeters) return;
    this._stats.bestDistanceMeters = meters;
    this._commit();
  }

  addWorldSwitch() {
    this._stats.worldSwitches += 1;
    this._commit();
  }

  addGamePlayed() {
    this._stats.gamesPlayed += 1;
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

export const missionStats = new MissionStats();
