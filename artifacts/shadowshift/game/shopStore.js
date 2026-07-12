// ShopStore — persisted ownership + equipped selection for every shop
// category, plus the purchase/equip transactions themselves. Local
// Storage only (no server), same persistence model as Settings.

import { SHOP_ITEMS, SHOP_CATEGORIES, getItemsByCategory, getItem } from './shopItems.js';
import { wallet } from './wallet.js';

const OWNED_STORAGE_KEY = 'shadowshift:shopOwned';
const EQUIPPED_STORAGE_KEY = 'shadowshift:shopEquipped';

function defaultOwnedIds() {
  return SHOP_ITEMS.filter((item) => item.price === 0).map((item) => item.id);
}

function defaultEquipped() {
  const equipped = {};
  for (const category of SHOP_CATEGORIES) {
    const items = getItemsByCategory(category.id);
    const free = items.find((item) => item.price === 0);
    equipped[category.id] = (free ?? items[0])?.id;
  }
  return equipped;
}

function loadOwned() {
  const owned = new Set(defaultOwnedIds());
  try {
    const raw = window.localStorage.getItem(OWNED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const id of parsed) owned.add(id);
      }
    }
  } catch {
    // Ignore — fall back to just the free defaults.
  }
  return owned;
}

function saveOwned(owned) {
  try {
    window.localStorage.setItem(OWNED_STORAGE_KEY, JSON.stringify(Array.from(owned)));
  } catch {
    // Ignore — best-effort persistence, same as Settings/high score.
  }
}

function loadEquipped() {
  const defaults = defaultEquipped();
  try {
    const raw = window.localStorage.getItem(EQUIPPED_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function saveEquipped(equipped) {
  try {
    window.localStorage.setItem(EQUIPPED_STORAGE_KEY, JSON.stringify(equipped));
  } catch {
    // Ignore.
  }
}

class ShopStore {
  constructor() {
    this._owned = loadOwned();
    this._equipped = loadEquipped();
    this._listeners = new Set();
  }

  isOwned(itemId) {
    return this._owned.has(itemId);
  }

  getEquippedId(category) {
    return this._equipped[category];
  }

  /** Resolved item object currently equipped for a category. */
  getEquippedItem(category) {
    const id = this._equipped[category];
    return getItem(id) ?? getItemsByCategory(category)[0];
  }

  /**
   * Attempt to buy an item with wallet coins.
   * @returns {{ok: boolean, reason?: 'owned'|'insufficient'}}
   */
  purchase(item) {
    if (this._owned.has(item.id)) return { ok: false, reason: 'owned' };
    if (!wallet.spend(item.price)) return { ok: false, reason: 'insufficient' };

    this._owned.add(item.id);
    saveOwned(this._owned);
    this._emit();
    return { ok: true };
  }

  /** Equip an owned item as the active choice for its category. */
  equip(item) {
    if (!this._owned.has(item.id)) return false;
    this._equipped[item.category] = item.id;
    saveEquipped(this._equipped);
    this._emit();
    return true;
  }

  /** Subscribe to any ownership/equip change. Returns an unsubscribe function. */
  onChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _emit() {
    for (const listener of this._listeners) listener();
  }
}

export const shopStore = new ShopStore();
