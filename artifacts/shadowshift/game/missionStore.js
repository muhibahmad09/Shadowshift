// MissionStore — tracks which missions have been claimed and pays out
// rewards. Progress itself is derived live from missionStats (never
// stored redundantly); this only persists the claimed set.

import { MISSIONS } from './missions.js';
import { missionStats } from './missionStats.js';
import { wallet } from './wallet.js';

const CLAIMED_STORAGE_KEY = 'shadowshift:missionsClaimed';

function loadClaimed() {
  try {
    const raw = window.localStorage.getItem(CLAIMED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveClaimed(claimed) {
  try {
    window.localStorage.setItem(CLAIMED_STORAGE_KEY, JSON.stringify(Array.from(claimed)));
  } catch {
    // Ignore — best-effort persistence, same as Settings/high score.
  }
}

class MissionStore {
  constructor() {
    this._claimed = loadClaimed();
    this._listeners = new Set();

    // Re-render/re-check whenever a lifetime stat changes — a mission can
    // flip from in-progress to complete mid-run (e.g. crossing 1000m).
    missionStats.onChange(() => this._emit());
  }

  progress(mission) {
    return missionStats.get(mission.statKey);
  }

  isComplete(mission) {
    return this.progress(mission) >= mission.target;
  }

  isClaimed(mission) {
    return this._claimed.has(mission.id);
  }

  /** True if any mission is finished but its reward hasn't been claimed yet. */
  hasClaimable() {
    return MISSIONS.some((mission) => this.isComplete(mission) && !this.isClaimed(mission));
  }

  /**
   * Claim a finished mission's reward.
   * @returns {{ok: boolean, reason?: 'incomplete'|'claimed'}}
   */
  claim(mission) {
    if (this._claimed.has(mission.id)) return { ok: false, reason: 'claimed' };
    if (!this.isComplete(mission)) return { ok: false, reason: 'incomplete' };

    this._claimed.add(mission.id);
    saveClaimed(this._claimed);
    wallet.deposit(mission.reward);
    this._emit();
    return { ok: true };
  }

  /** Subscribe to any progress/claim change. Returns an unsubscribe function. */
  onChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _emit() {
    for (const listener of this._listeners) listener();
  }
}

export const missionStore = new MissionStore();
