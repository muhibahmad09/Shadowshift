// AchievementStore — persists which achievements have already been
// unlocked, and detects the moment each one is newly earned so listeners
// (the unlock toast) can fire exactly once per achievement, ever.
//
// Unlike the shop or missions, achievements need no purchase/claim step —
// they unlock themselves the instant their condition is met.

import { ACHIEVEMENTS } from './achievements.js';
import { missionStats } from './missionStats.js';
import { achievementStats } from './achievementStats.js';

const UNLOCKED_STORAGE_KEY = 'shadowshift:achievementsUnlocked';

function loadUnlocked() {
  try {
    const raw = window.localStorage.getItem(UNLOCKED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveUnlocked(unlocked) {
  try {
    window.localStorage.setItem(UNLOCKED_STORAGE_KEY, JSON.stringify(Array.from(unlocked)));
  } catch {
    // Ignore — best-effort persistence, same as Settings/high score.
  }
}

class AchievementStore {
  constructor() {
    this._unlocked = loadUnlocked();
    this._changeListeners = new Set();
    this._unlockListeners = new Set();

    // Both stat sources feed achievement conditions (coin-collector reads
    // missionStats; everything else reads achievementStats) — recheck on
    // either one changing.
    missionStats.onChange(() => this._checkAll());
    achievementStats.onChange(() => this._checkAll());

    // Catch anything already true from a previous session that predates
    // this catalog entry (e.g. new achievement added after the player
    // already cleared its condition via mission stats).
    this._checkAll();
  }

  isUnlocked(id) {
    return this._unlocked.has(id);
  }

  /** Subscribe to any unlock (panel/badge refresh). Returns an unsubscribe function. */
  onChange(listener) {
    this._changeListeners.add(listener);
    return () => this._changeListeners.delete(listener);
  }

  /** Subscribe specifically to newly-earned achievements (drives the toast). */
  onUnlock(listener) {
    this._unlockListeners.add(listener);
    return () => this._unlockListeners.delete(listener);
  }

  _checkAll() {
    let changed = false;
    for (const achievement of ACHIEVEMENTS) {
      if (this._unlocked.has(achievement.id)) continue;
      if (!achievement.isMet()) continue;

      this._unlocked.add(achievement.id);
      changed = true;
      for (const listener of this._unlockListeners) listener(achievement);
    }

    if (changed) {
      saveUnlocked(this._unlocked);
      for (const listener of this._changeListeners) listener();
    }
  }
}

export const achievementStore = new AchievementStore();
