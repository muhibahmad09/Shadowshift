// MultiplayerResultsPanel — shows race results and routes back to lobby.

import { GHOST_COLORS } from './ghostPlayer.js';

export class MultiplayerResultsPanel {
  /**
   * @param {{
   *   panelEl: HTMLElement,
   *   onPlayAgain: () => void,
   *   onMainMenu: () => void,
   * }} opts
   */
  constructor({ panelEl, onPlayAgain, onMainMenu }) {
    this._panel = panelEl;
    this._panel.querySelector('#mp-results-lobby-btn')
      ?.addEventListener('click', onPlayAgain);
    this._panel.querySelector('#mp-results-menu-btn')
      ?.addEventListener('click', onMainMenu);
  }

  /** @param {Array<{id,name,slot,score,rank}>} rankings */
  show(rankings, myPlayerId) {
    const list = this._panel.querySelector('#mp-results-list');
    if (list) {
      list.innerHTML = rankings
        .map((p) => {
          const colors = GHOST_COLORS[p.slot % GHOST_COLORS.length];
          const isMe = p.id === myPlayerId;
          const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`;
          return `<div class="mp-result-row ${isMe ? 'mp-result-mine' : ''}">
            <span class="mp-result-rank">${medal}</span>
            <span class="mp-result-dot" style="background:${colors.body};box-shadow:0 0 6px ${colors.glow}"></span>
            <span class="mp-result-name">${_esc(p.name)}${isMe ? ' <span class="mp-you-badge">You</span>' : ''}</span>
            <span class="mp-result-score">${p.score.toLocaleString()}</span>
          </div>`;
        })
        .join('');
    }

    // Update title based on local player's rank.
    const myEntry = rankings.find((p) => p.id === myPlayerId);
    const title = this._panel.querySelector('#mp-results-title');
    if (title && myEntry) {
      title.textContent =
        myEntry.rank === 1 ? '🏆 You Win!' : `Race Over — Rank #${myEntry.rank}`;
    }

    this._panel.classList.add('is-visible');
  }

  hide() {
    this._panel.classList.remove('is-visible');
  }
}

function _esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
