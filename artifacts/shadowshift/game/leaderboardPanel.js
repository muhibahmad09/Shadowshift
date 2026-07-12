// LeaderboardPanel — overlay showing Global, Weekly, and Friends boards.
// Follows the same show/hide/is-open pattern as ShopPanel / AchievementsPanel.

import { playerIdentity, generateGuestName } from './playerIdentity.js';
import { registerPlayer, fetchGlobal, fetchWeekly, fetchFriends } from './leaderboardClient.js';

const TABS = ['global', 'weekly', 'friends'];
const MEDAL = ['🥇', '🥈', '🥉'];

export class LeaderboardPanel {
  constructor({
    panelEl,
    closeBtnEl,
    tabsEl,
    bodyEl,
    selfRankEl,
    selfRankValueEl,
    selfRankScoreEl,
    friendsFooterEl,
    friendInputEl,
    addFriendBtnEl,
    ownCodeEl,
    copyCodeBtnEl,
    nameSetupEl,
    nameInputEl,
    nameSaveBtnEl,
  }) {
    this.panelEl = panelEl;
    this._tabsEl = tabsEl;
    this._bodyEl = bodyEl;
    this._selfRankEl = selfRankEl;
    this._selfRankValueEl = selfRankValueEl;
    this._selfRankScoreEl = selfRankScoreEl;
    this._friendsFooterEl = friendsFooterEl;
    this._friendInputEl = friendInputEl;
    this._ownCodeEl = ownCodeEl;
    this._nameSetupEl = nameSetupEl;
    this._nameInputEl = nameInputEl;

    this._activeTab = 'global';
    this._cache = {}; // tab → { entries, playerRank, playerScore, playerCode }
    this._loading = false;
    this._registerPromise = null;

    // Close
    closeBtnEl.addEventListener('click', () => this.hide());
    panelEl.addEventListener('click', (e) => {
      if (e.target === panelEl) this.hide();
    });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.isOpen()) this.hide();
    });

    // Tabs
    tabsEl.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });

    // Add friend
    addFriendBtnEl.addEventListener('click', () => this._addFriend());
    friendInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._addFriend();
    });
    friendInputEl.addEventListener('input', () => {
      friendInputEl.value = friendInputEl.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    // Copy own code
    copyCodeBtnEl.addEventListener('click', async () => {
      const code = playerIdentity.code;
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        copyCodeBtnEl.textContent = '✓';
        setTimeout(() => { copyCodeBtnEl.textContent = '📋'; }, 1500);
      } catch { /* ignore */ }
    });

    // Name save
    nameSaveBtnEl.addEventListener('click', () => this._saveName());
    nameInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._saveName();
    });
  }

  isOpen() {
    return this.panelEl.classList.contains('is-open');
  }

  show() {
    this.panelEl.classList.add('is-open');
    this._cache = {}; // refresh on every open
    this._ensureRegistered().then(() => this._loadTab(this._activeTab));
  }

  hide() {
    this.panelEl.classList.remove('is-open');
  }

  // ── Registration ─────────────────────────────────────────────────────────

  _ensureRegistered() {
    if (this._registerPromise) return this._registerPromise;
    this._registerPromise = (async () => {
      if (playerIdentity.isRegistered()) {
        this._syncNameSetup();
        return;
      }
      // Show name setup UI
      const name = generateGuestName();
      if (this._nameInputEl.value === '') this._nameInputEl.value = name;
      this._nameSetupEl.hidden = false;
      this._showStatus('Set your name to join the leaderboard.');
      // Wait for user to save name (resolved by _saveName)
    })();
    return this._registerPromise;
  }

  async _saveName() {
    const name = this._nameInputEl.value.trim();
    if (!name) return;

    this._showStatus('Saving…');
    try {
      const data = await registerPlayer(playerIdentity.token, name);
      playerIdentity.set(data);
      this._nameSetupEl.hidden = true;
      this._registerPromise = null;
      this._syncNameSetup();
      this._cache = {};
      this._loadTab(this._activeTab);
    } catch (err) {
      this._showStatus(`Could not save: ${err.message}`);
    }
  }

  _syncNameSetup() {
    if (!playerIdentity.isRegistered()) return;
    this._nameSetupEl.hidden = true;
    if (this._nameInputEl.value === '') {
      this._nameInputEl.value = playerIdentity.name ?? '';
    }
    this._syncOwnCode();
  }

  _syncOwnCode() {
    const code = playerIdentity.code;
    if (this._ownCodeEl) this._ownCodeEl.textContent = code ?? '—';
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────

  _switchTab(tab) {
    if (!TABS.includes(tab)) return;
    this._activeTab = tab;
    this._tabsEl.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.tab === tab);
    });
    this._friendsFooterEl.hidden = (tab !== 'friends');
    if (this._cache[tab]) {
      this._render(this._cache[tab]);
    } else {
      this._loadTab(tab);
    }
  }

  async _loadTab(tab) {
    if (!playerIdentity.isRegistered()) return;
    this._loading = true;
    this._showLoading();
    try {
      let data;
      const token = playerIdentity.token;
      if (tab === 'global') {
        data = await fetchGlobal(token);
      } else if (tab === 'weekly') {
        data = await fetchWeekly(token);
      } else {
        const codes = playerIdentity.friendCodes;
        data = await fetchFriends(token, codes);
      }
      this._cache[tab] = data;
      if (this._activeTab === tab) this._render(data);
    } catch (err) {
      if (this._activeTab === tab) this._showStatus(`Failed to load: ${err.message}`);
    } finally {
      this._loading = false;
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  _showLoading() {
    this._bodyEl.innerHTML = '<div class="lb-loading"><span class="lb-spinner"></span>Loading…</div>';
    this._selfRankEl.hidden = true;
  }

  _showStatus(msg) {
    this._bodyEl.innerHTML = `<div class="lb-status">${msg}</div>`;
    this._selfRankEl.hidden = true;
  }

  _render({ entries, playerRank, playerScore, playerCode }) {
    const ownCode = playerIdentity.code;

    if (!entries || entries.length === 0) {
      const emptyMsg = this._activeTab === 'friends'
        ? 'Add friends with their 6-character code below, then play to see scores here.'
        : 'No scores yet — be the first to play!';
      this._showStatus(emptyMsg);
      return;
    }

    const rows = entries.map((e, i) => {
      const rank = e.rank ?? i + 1;
      const medal = rank <= 3 ? `<span class="lb-medal">${MEDAL[rank - 1]}</span>` : `<span class="lb-rank-num">#${rank}</span>`;
      const isMe = ownCode && e.code === ownCode;
      return `
        <div class="lb-row${isMe ? ' lb-row-me' : ''}">
          <span class="lb-row-rank">${medal}</span>
          <span class="lb-row-name">${escHtml(e.name)}${isMe ? ' <span class="lb-you-badge">YOU</span>' : ''}</span>
          <span class="lb-row-score">${e.score.toLocaleString()}</span>
        </div>`;
    });

    this._bodyEl.innerHTML = `<div class="lb-list">${rows.join('')}</div>`;

    if (playerRank) {
      this._selfRankEl.hidden = false;
      this._selfRankValueEl.textContent = `#${playerRank}`;
      this._selfRankScoreEl.textContent = playerScore ? `Best: ${playerScore.toLocaleString()}` : '';
    } else {
      this._selfRankEl.hidden = true;
    }

    // Scroll own entry into view
    if (ownCode) {
      const meRow = this._bodyEl.querySelector('.lb-row-me');
      meRow?.scrollIntoView({ block: 'nearest' });
    }
  }

  // ── Friends management ────────────────────────────────────────────────────

  _addFriend() {
    const code = this._friendInputEl.value.trim().toUpperCase();
    if (!code) return;
    const added = playerIdentity.addFriend(code);
    if (added) {
      this._friendInputEl.value = '';
      delete this._cache['friends']; // bust cache
      this._loadTab('friends');
    } else {
      // Flash the input to signal invalid/duplicate
      this._friendInputEl.classList.add('lb-input-error');
      setTimeout(() => this._friendInputEl.classList.remove('lb-input-error'), 600);
    }
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
