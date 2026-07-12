// GameOverScreen — DOM binder for the run-summary overlay shown when a run
// ends. Pure UI wiring (same division of responsibility as PauseMenu and
// Modal); PlayScene decides *when* a run ends and hands over the stats,
// this class only ever renders them and reports button clicks back up.

const SHARE_FEEDBACK_TIMEOUT_MS = 2200;

export class GameOverScreen {
  constructor({
    panelEl,
    titleEl,
    scoreEl,
    highScoreEl,
    distanceEl,
    coinsEl,
    highScoreBadgeEl,
    restartBtnEl,
    mainMenuBtnEl,
    shareBtnEl,
    shareFeedbackEl,
  }) {
    this.panelEl = panelEl;
    this.titleEl = titleEl;
    this.scoreEl = scoreEl;
    this.highScoreEl = highScoreEl;
    this.distanceEl = distanceEl;
    this.coinsEl = coinsEl;
    this.highScoreBadgeEl = highScoreBadgeEl ?? null;
    this.shareFeedbackEl = shareFeedbackEl ?? null;

    this._shareFeedbackTimer = null;

    restartBtnEl.addEventListener('click', () => this._onRestart?.());
    mainMenuBtnEl.addEventListener('click', () => this._onMainMenu?.());
    shareBtnEl.addEventListener('click', () => this._onShare?.());
  }

  /** @param {{onRestart, onMainMenu, onShare}} handlers */
  setHandlers({ onRestart, onMainMenu, onShare }) {
    this._onRestart = onRestart;
    this._onMainMenu = onMainMenu;
    this._onShare = onShare;
  }

  isOpen() {
    return this.panelEl.classList.contains('is-open');
  }

  /**
   * @param {{score: number, highScore: number, distanceMeters: number,
   *   coins: number, isNewHighScore: boolean}} stats
   */
  show(stats) {
    this.titleEl.textContent = stats.isNewHighScore ? 'NEW HIGH SCORE!' : 'GAME OVER';
    this.panelEl.classList.toggle('is-new-best', stats.isNewHighScore);

    this._animateValue(this.scoreEl, Math.floor(stats.score));
    this._animateValue(this.distanceEl, Math.floor(stats.distanceMeters), 'm');
    this._animateValue(this.coinsEl, stats.coins);
    this._animateValue(this.highScoreEl, Math.floor(stats.highScore));

    if (this.highScoreBadgeEl) {
      this.highScoreBadgeEl.classList.toggle('is-visible', stats.isNewHighScore);
    }

    // Restarting the entrance animation every run: remove the class now,
    // then re-add it in the next animation frame so the browser commits
    // the removal before the addition — no layout reflow needed.
    this.panelEl.classList.remove('is-open');
    requestAnimationFrame(() => this.panelEl.classList.add('is-open'));
  }

  hide() {
    this.panelEl.classList.remove('is-open');
    this._clearShareFeedback();
  }

  /** Briefly flash a status message near the Share button (e.g. "Copied!"). */
  showShareFeedback(message) {
    if (!this.shareFeedbackEl) return;
    this.shareFeedbackEl.textContent = message;
    this.shareFeedbackEl.classList.add('is-visible');

    clearTimeout(this._shareFeedbackTimer);
    this._shareFeedbackTimer = setTimeout(
      () => this._clearShareFeedback(),
      SHARE_FEEDBACK_TIMEOUT_MS,
    );
  }

  _clearShareFeedback() {
    if (!this.shareFeedbackEl) return;
    this.shareFeedbackEl.classList.remove('is-visible');
    clearTimeout(this._shareFeedbackTimer);
  }

  /** Count up from 0 to `value` for a punchy "tallying the score" feel. */
  _animateValue(el, value, suffix = '') {
    const durationMs = 550;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(value * eased);
      el.textContent = suffix ? `${current} ${suffix}` : String(current);

      if (t < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }
}
