// MultiplayerLobbyPanel — DOM panel for room creation / join / lobby.
//
// Three inner screens share one outer panel element and are toggled with
// data-screen attributes. The class drives all state transitions and talks
// to a MultiplayerClient instance.

import { GHOST_COLORS } from './ghostPlayer.js';

const SAVED_NAME_KEY = 'shadowshift_mp_name';

export class MultiplayerLobbyPanel {
  /**
   * @param {{
   *   panelEl: HTMLElement,
   *   client: import('./multiplayerClient.js').MultiplayerClient,
   *   onGameStart: (roomInfo: object) => void,
   *   onBack: () => void,
   * }} opts
   */
  constructor({ panelEl, client, onGameStart, onBack }) {
    this._panel = panelEl;
    this._client = client;
    this._onGameStart = onGameStart;
    this._onBack = onBack;

    // Session state
    this._myPlayerId = null;
    this._mySlot = 0;
    this._isHost = false;
    this._roomCode = null;
    this._players = [];

    this._bindClientEvents();
    this._bindDomEvents();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  show() {
    this._client.connect();
    this._showScreen('home');
    this._panel.classList.add('is-visible');
    this._refreshName();
  }

  hide() {
    this._panel.classList.remove('is-visible');
  }

  // ── Screens ─────────────────────────────────────────────────────────────

  _showScreen(name) {
    this._panel.querySelectorAll('.mp-screen').forEach((el) => {
      el.hidden = el.dataset.screen !== name;
    });
  }

  _refreshName() {
    const saved = localStorage.getItem(SAVED_NAME_KEY) ?? '';
    const input = this._panel.querySelector('#mp-name-input');
    if (input && !input.value) input.value = saved;
  }

  _saveName(name) {
    if (name) localStorage.setItem(SAVED_NAME_KEY, name);
  }

  _getName() {
    return (
      (this._panel.querySelector('#mp-name-input')?.value ?? '').trim() ||
      'Player'
    );
  }

  _setError(id, msg) {
    const el = this._panel.querySelector(`#${id}`);
    if (el) el.textContent = msg;
  }

  _clearErrors() {
    this._panel.querySelectorAll('.mp-error').forEach((el) => {
      el.textContent = '';
    });
  }

  // ── Player list rendering ────────────────────────────────────────────────

  _renderPlayerList() {
    const list = this._panel.querySelector('#mp-player-list');
    if (!list) return;
    list.innerHTML = '';

    // Always show 4 slots.
    for (let slot = 0; slot < 4; slot++) {
      const player = this._players.find((p) => p.slot === slot);
      const colors = GHOST_COLORS[slot % GHOST_COLORS.length];
      const item = document.createElement('div');
      item.className = 'mp-player-slot' + (player ? ' mp-player-slot-filled' : '');

      if (player) {
        const isMe = player.id === this._myPlayerId;
        const isHost = player.isHost;
        item.innerHTML = `
          <span class="mp-player-dot" style="background:${colors.body};box-shadow:0 0 8px ${colors.glow}"></span>
          <span class="mp-player-name">${_esc(player.name)}${isMe ? ' <span class="mp-you-badge">You</span>' : ''}</span>
          ${isHost ? '<span class="mp-host-badge">Host</span>' : ''}
        `;
      } else {
        item.innerHTML = `
          <span class="mp-player-dot mp-player-dot-empty"></span>
          <span class="mp-player-empty">Waiting…</span>
        `;
      }
      list.appendChild(item);
    }

    // Show/hide start button (host only, any number of players).
    const startBtn = this._panel.querySelector('#mp-start-btn');
    if (startBtn) {
      startBtn.hidden = !this._isHost;
    }

    const hint = this._panel.querySelector('#mp-waiting-hint');
    if (hint) {
      hint.textContent =
        this._players.length < 4
          ? `Share the code — ${4 - this._players.length} slot${this._players.length === 3 ? '' : 's'} open.`
          : 'Room is full!';
    }
  }

  // ── Client event bindings ────────────────────────────────────────────────

  _bindClientEvents() {
    this._client.on('room_created', (msg) => {
      this._myPlayerId = msg.playerId;
      this._mySlot = msg.slot;
      this._isHost = true;
      this._roomCode = msg.code;
      this._players = msg.players;
      this._panel.querySelector('#mp-code-value').textContent = msg.code;
      this._renderPlayerList();
      this._showScreen('lobby');
      this._clearErrors();
    });

    this._client.on('room_joined', (msg) => {
      this._myPlayerId = msg.playerId;
      this._mySlot = msg.slot;
      this._isHost = msg.isHost;
      this._roomCode = msg.code;
      this._players = msg.players;
      this._panel.querySelector('#mp-code-value').textContent = msg.code;
      this._renderPlayerList();
      this._showScreen('lobby');
      this._clearErrors();
    });

    this._client.on('player_joined', (msg) => {
      if (!this._players.find((p) => p.id === msg.player.id)) {
        this._players.push(msg.player);
      }
      this._renderPlayerList();
    });

    this._client.on('player_left', (msg) => {
      this._players = this._players.filter((p) => p.id !== msg.playerId);
      this._renderPlayerList();
    });

    this._client.on('host_changed', (msg) => {
      this._players = this._players.map((p) => ({
        ...p,
        isHost: p.id === msg.playerId,
      }));
      if (msg.playerId === this._myPlayerId) {
        this._isHost = true;
      }
      this._renderPlayerList();
    });

    this._client.on('game_started', () => {
      this.hide();
      this._onGameStart?.({
        playerId: this._myPlayerId,
        slot: this._mySlot,
        players: this._players,
        code: this._roomCode,
      });
    });

    this._client.on('error', (msg) => {
      // Show the error on whichever screen is currently visible.
      const screen = this._panel.querySelector('.mp-screen:not([hidden])');
      const errEl = screen?.querySelector('.mp-error');
      if (errEl) errEl.textContent = msg.message ?? 'Something went wrong.';
    });

    this._client.on('disconnected', () => {
      this._setError('mp-lobby-error', 'Disconnected from server.');
    });
  }

  _bindDomEvents() {
    // Home screen
    this._panel
      .querySelector('#mp-create-btn')
      ?.addEventListener('click', () => {
        const name = this._getName();
        this._saveName(name);
        this._clearErrors();
        this._client.send({ type: 'create_room', playerName: name });
      });

    this._panel
      .querySelector('#mp-show-join-btn')
      ?.addEventListener('click', () => {
        this._clearErrors();
        this._showScreen('join');
        // Pre-fill name in the join screen too.
        const joinName = this._panel.querySelector('#mp-join-name-input');
        if (joinName && !joinName.value) {
          joinName.value = this._getName();
        }
        setTimeout(() => {
          this._panel.querySelector('#mp-join-code-input')?.focus();
        }, 50);
      });

    this._panel
      .querySelector('#mp-home-back-btn')
      ?.addEventListener('click', () => {
        this._client.send({ type: 'leave_room' });
        this.hide();
        this._onBack?.();
      });

    // Join screen
    this._panel
      .querySelector('#mp-join-btn')
      ?.addEventListener('click', () => {
        const code = (
          this._panel.querySelector('#mp-join-code-input')?.value ?? ''
        )
          .trim()
          .toUpperCase();
        const name = (
          this._panel.querySelector('#mp-join-name-input')?.value ?? ''
        ).trim() || this._getName();
        this._saveName(name);
        if (code.length !== 4) {
          this._setError('mp-join-error', 'Enter a 4-character room code.');
          return;
        }
        this._clearErrors();
        this._client.send({ type: 'join_room', code, playerName: name });
      });

    // Auto-uppercase + max-length on code input.
    this._panel
      .querySelector('#mp-join-code-input')
      ?.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().slice(0, 4);
      });

    // Submit join on Enter.
    this._panel
      .querySelector('#mp-join-code-input')
      ?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this._panel.querySelector('#mp-join-btn')?.click();
        }
      });

    this._panel
      .querySelector('#mp-join-back-btn')
      ?.addEventListener('click', () => {
        this._clearErrors();
        this._showScreen('home');
      });

    // Lobby screen
    this._panel
      .querySelector('#mp-start-btn')
      ?.addEventListener('click', () => {
        this._client.send({ type: 'start_game' });
      });

    this._panel
      .querySelector('#mp-leave-btn')
      ?.addEventListener('click', () => {
        this._client.send({ type: 'leave_room' });
        this._players = [];
        this._roomCode = null;
        this._showScreen('home');
        this._clearErrors();
      });

    // Copy room code.
    this._panel
      .querySelector('#mp-copy-code-btn')
      ?.addEventListener('click', async () => {
        const code = this._roomCode;
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code);
          const btn = this._panel.querySelector('#mp-copy-code-btn');
          if (btn) {
            btn.textContent = 'Copied!';
            setTimeout(() => (btn.textContent = 'Copy'), 1500);
          }
        } catch {
          // ignore
        }
      });
  }
}

function _esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
