// playerIdentity — persists the local player's token, name, friend code,
// and their friends list across sessions.

const STORAGE_KEY = 'shadowshift:player';
const FRIENDS_KEY = 'shadowshift:friends';

const ADJECTIVES = ['Swift', 'Shadow', 'Neon', 'Ghost', 'Dark', 'Void', 'Star', 'Blaze', 'Storm', 'Dusk'];
const NOUNS = ['Runner', 'Shifter', 'Walker', 'Drifter', 'Flash', 'Pulse', 'Wave', 'Spark', 'Shade', 'Rift'];

export function generateGuestName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}${noun}`;
}

class PlayerIdentity {
  constructor() {
    /** @type {{id: number, token: string, code: string, name: string} | null} */
    this._data = null;
    /** @type {string[]} */
    this._friends = [];
    this._listeners = [];
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this._data = JSON.parse(raw);
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(FRIENDS_KEY);
      if (raw) this._friends = JSON.parse(raw);
    } catch { /* ignore */ }
    if (!Array.isArray(this._friends)) this._friends = [];
  }

  _saveData() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data)); } catch { /* ignore */ }
    for (const fn of this._listeners) fn(this._data);
  }

  _saveFriends() {
    try { localStorage.setItem(FRIENDS_KEY, JSON.stringify(this._friends)); } catch { /* ignore */ }
  }

  init() {
    this._load();
    return this;
  }

  /** Whether the player has a server-side identity. */
  isRegistered() { return !!this._data?.token; }

  get token() { return this._data?.token ?? null; }
  get name() { return this._data?.name ?? null; }
  get code() { return this._data?.code ?? null; }
  get id() { return this._data?.id ?? null; }

  /** Persist the player record returned by the server. */
  set(data) {
    this._data = data;
    this._saveData();
  }

  /** Update just the display name. */
  setName(name) {
    if (!this._data) return;
    this._data = { ...this._data, name };
    this._saveData();
  }

  // ── Friends ──────────────────────────────────────────────────────────────

  /** All saved friend codes (uppercase 6-char strings). */
  get friends() { return [...this._friends]; }

  /** Add a friend code; returns false if already present or invalid. */
  addFriend(code) {
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) return false;
    if (clean === this._data?.code) return false; // own code
    if (this._friends.includes(clean)) return false;
    this._friends.push(clean);
    this._saveFriends();
    return true;
  }

  removeFriend(code) {
    const clean = code.trim().toUpperCase();
    const idx = this._friends.indexOf(clean);
    if (idx === -1) return false;
    this._friends.splice(idx, 1);
    this._saveFriends();
    return true;
  }

  /** All friend codes + own code (for friends leaderboard queries). */
  get friendCodes() {
    const all = [...this._friends];
    if (this._data?.code && !all.includes(this._data.code)) {
      all.push(this._data.code);
    }
    return all;
  }

  onChange(fn) { this._listeners.push(fn); }
}

export const playerIdentity = new PlayerIdentity().init();
