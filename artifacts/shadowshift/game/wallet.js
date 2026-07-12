// Wallet — persistent coin bank, separate from ScoreManager's per-run
// coin count. Coins collected during a run are banked into the wallet
// when the run ends (see PlayScene._triggerGameOver), and the shop spends
// from this balance. Local Storage only, same persistence model used by
// Settings and the high score.

const WALLET_STORAGE_KEY = 'shadowshift:wallet';

function loadBalance() {
  try {
    const raw = window.localStorage.getItem(WALLET_STORAGE_KEY);
    const value = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    // Storage unavailable (private browsing, disabled cookies, etc.) —
    // the balance just won't persist across sessions.
    return 0;
  }
}

function saveBalance(value) {
  try {
    window.localStorage.setItem(WALLET_STORAGE_KEY, String(value));
  } catch {
    // Ignore — persistence is a nice-to-have, not a gameplay requirement.
  }
}

class Wallet {
  constructor() {
    this._balance = loadBalance();
    this._listeners = new Set();
  }

  get balance() {
    return this._balance;
  }

  /** Add coins (e.g. banked at the end of a run). */
  deposit(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this._balance += Math.floor(amount);
    saveBalance(this._balance);
    this._emit();
  }

  /** Spend coins if affordable. Returns whether the spend succeeded. */
  spend(amount) {
    if (!Number.isFinite(amount) || amount < 0 || amount > this._balance) return false;
    this._balance -= amount;
    saveBalance(this._balance);
    this._emit();
    return true;
  }

  /** Subscribe to balance changes. Returns an unsubscribe function. */
  onChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _emit() {
    for (const listener of this._listeners) listener(this._balance);
  }
}

export const wallet = new Wallet();
