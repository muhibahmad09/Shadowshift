// MultiplayerEliminatedOverlay — shown briefly when the local player
// is eliminated but the race is still ongoing.

export class MultiplayerEliminatedOverlay {
  /**
   * @param {{
   *   overlayEl: HTMLElement,
   *   onLeave: () => void,
   * }} opts
   */
  constructor({ overlayEl, onLeave }) {
    this._overlay = overlayEl;
    this._overlay.querySelector('#mp-elim-leave-btn')
      ?.addEventListener('click', onLeave);
  }

  show({ score, rank }) {
    const rankEl = this._overlay.querySelector('#mp-elim-rank');
    const scoreEl = this._overlay.querySelector('#mp-elim-score');
    if (rankEl) rankEl.textContent = rank ? `Rank #${rank}` : '';
    if (scoreEl) scoreEl.textContent = score.toLocaleString();
    this._overlay.classList.add('is-visible');
  }

  hide() {
    this._overlay.classList.remove('is-visible');
  }
}
