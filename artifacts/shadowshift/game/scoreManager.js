// ScoreManager — tracks score, distance, coins, and the persisted high
// score for a run. Pure state (no DOM) so PlayScene and the HUD binder can
// both read it without coupling.
//
// Score formula: floor(distanceMeters) * 1 point/meter + coin bonuses.
// Distance is derived from the same scroll speed obstacles/coins move at,
// so "distance" always matches what's visibly scrolling past.

const HIGH_SCORE_STORAGE_KEY = 'shadowshift:highScore';
const PIXELS_PER_METER = 50;
const DISTANCE_POINTS_PER_METER = 1;

function loadHighScore() {
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    const value = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    // Storage unavailable (private browsing, disabled cookies, etc.) —
    // the high score just won't persist across sessions.
    return 0;
  }
}

function saveHighScore(value) {
  try {
    window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(value));
  } catch {
    // Ignore — persistence is a nice-to-have, not a gameplay requirement.
  }
}

export class ScoreManager {
  constructor() {
    this.coins = 0;
    this.distanceMeters = 0;
    this.score = 0;
    this.highScore = loadHighScore();
    this.isNewHighScore = false;

    this._coinScore = 0;
  }

  /** Start a fresh run. The persisted high score is untouched. */
  reset() {
    this.coins = 0;
    this.distanceMeters = 0;
    this.score = 0;
    this._coinScore = 0;
    this.isNewHighScore = false;
  }

  /** Advance distance by the given number of world pixels traveled. */
  addDistance(pixels) {
    this.distanceMeters += pixels / PIXELS_PER_METER;
    this._recompute();
  }

  /** Award a coin pickup worth `points`. */
  addCoin(points) {
    this.coins += 1;
    this._coinScore += points;
    this._recompute();
  }

  _recompute() {
    this.score =
      Math.floor(this.distanceMeters) * DISTANCE_POINTS_PER_METER +
      this._coinScore;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.isNewHighScore = true;
      saveHighScore(this.highScore);
    }
  }
}
