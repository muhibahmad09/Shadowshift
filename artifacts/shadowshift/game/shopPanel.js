// ShopPanel — DOM binder for the cosmetics shop overlay: category tabs, an
// item grid (skins/trails/world effects/themes), and the wallet balance.
// Same division of responsibility as SettingsPanel — this only renders
// state and reports intent; ShopStore/Wallet own the actual purchase/equip
// transactions and persistence.

import { SHOP_CATEGORIES, getItemsByCategory } from './shopItems.js';
import { shopStore } from './shopStore.js';
import { wallet } from './wallet.js';

const INSUFFICIENT_FLASH_MS = 500;

export class ShopPanel {
  constructor({ panelEl, closeBtnEl, tabsEl, gridEl, balanceEl }) {
    this.panelEl = panelEl;
    this.tabsEl = tabsEl;
    this.gridEl = gridEl;
    this.balanceEl = balanceEl;

    this._activeCategory = SHOP_CATEGORIES[0].id;
    this._tabButtons = Array.from(this.tabsEl.querySelectorAll('[data-category]'));

    for (const button of this._tabButtons) {
      button.addEventListener('click', () => {
        this._activeCategory = button.dataset.category;
        this._syncTabs();
        this._renderGrid();
      });
    }

    closeBtnEl.addEventListener('click', () => this.hide());
    this.panelEl.addEventListener('click', (event) => {
      if (event.target === this.panelEl) this.hide();
    });
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && this.isOpen()) this.hide();
    });

    // Keep the balance and item states live even if a purchase happens
    // from another code path, and so the grid updates the instant a buy
    // or equip resolves.
    wallet.onChange(() => this._syncBalance());
    shopStore.onChange(() => this._renderGrid());
  }

  isOpen() {
    return this.panelEl.classList.contains('is-open');
  }

  show() {
    this._syncTabs();
    this._syncBalance();
    this._renderGrid();
    this.panelEl.classList.add('is-open');
  }

  hide() {
    this.panelEl.classList.remove('is-open');
  }

  _syncTabs() {
    for (const button of this._tabButtons) {
      button.classList.toggle('is-active', button.dataset.category === this._activeCategory);
    }
  }

  _syncBalance() {
    this.balanceEl.textContent = String(wallet.balance);
  }

  _renderGrid() {
    this.gridEl.innerHTML = '';
    const items = getItemsByCategory(this._activeCategory);
    for (const item of items) {
      this.gridEl.appendChild(this._buildCard(item));
    }
  }

  _buildCard(item) {
    const owned = shopStore.isOwned(item.id);
    const equipped = shopStore.getEquippedId(item.category) === item.id;

    const card = document.createElement('div');
    card.className = `shop-item${equipped ? ' is-equipped' : ''}`;

    const swatch = document.createElement('div');
    swatch.className = 'shop-item-swatch';
    swatch.style.background = item.swatch;
    card.appendChild(swatch);

    const name = document.createElement('div');
    name.className = 'shop-item-name';
    name.textContent = item.name;
    card.appendChild(name);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shop-item-btn';

    if (equipped) {
      button.textContent = 'Equipped';
      button.classList.add('is-equipped-btn');
      button.disabled = true;
    } else if (owned) {
      button.textContent = 'Equip';
      button.addEventListener('click', () => shopStore.equip(item));
    } else {
      const priceIcon = document.createElement('span');
      priceIcon.className = 'coin-icon';
      button.appendChild(priceIcon);
      button.appendChild(document.createTextNode(` ${item.price}`));

      if (wallet.balance < item.price) button.classList.add('is-disabled');

      button.addEventListener('click', () => {
        const result = shopStore.purchase(item);
        if (!result.ok && result.reason === 'insufficient') {
          this._flashInsufficient(button);
        }
      });
    }

    card.appendChild(button);
    return card;
  }

  _flashInsufficient(button) {
    button.classList.add('is-shake');
    setTimeout(() => button.classList.remove('is-shake'), INSUFFICIENT_FLASH_MS);
  }
}
