// Hud — binds the ScoreManager's live values to the premium HUD's DOM
// elements, including a brief "pulse" animation whenever a value ticks up.
//
// Kept separate from PlayScene (canvas rendering) and ScoreManager (pure
// state) so DOM manipulation lives in exactly one place.

export class Hud {
  constructor({ scoreEl, distanceEl, coinsEl, bestEl, bestCardEl }) {
    this.scoreEl = scoreEl;
    this.distanceEl = distanceEl;
    this.coinsEl = coinsEl;
    this.bestEl = bestEl;
    this.bestCardEl = bestCardEl ?? null;

    this._lastScore = null;
    this._lastCoins = null;
    this._lastBest = null;
  }

  sync(scoreManager) {
    const score = Math.floor(scoreManager.score);
    const coins = scoreManager.coins;
    const distance = Math.floor(scoreManager.distanceMeters);
    const best = Math.floor(scoreManager.highScore);

    this._updateValue(this.scoreEl, score, '_lastScore');
    this._updateValue(this.coinsEl, coins, '_lastCoins');
    this._updateValue(this.bestEl, best, '_lastBest');
    this.distanceEl.textContent = `${distance} m`;

    if (this.bestCardEl) {
      this.bestCardEl.classList.toggle(
        'is-new-best',
        scoreManager.isNewHighScore,
      );
    }
  }

  _updateValue(el, value, lastKey) {
    const previous = this[lastKey];
    el.textContent = String(value);

    if (previous !== null && value !== previous) {
      // Restart the CSS pulse animation without forcing a layout reflow:
      // remove the class now, then re-add it in the next rAF after the
      // browser has had a chance to commit the removal to the style tree.
      el.classList.remove('stat-pulse');
      requestAnimationFrame(() => el.classList.add('stat-pulse'));
    }

    this[lastKey] = value;
  }
}
