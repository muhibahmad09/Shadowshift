// MissionsPanel — DOM binder for the missions overlay: category tabs, a
// mission list with progress bars, and Claim buttons. Same division of
// responsibility as ShopPanel — this only renders state and reports
// intent; MissionStore/MissionStats/Wallet own the actual data and
// persistence.

import { MISSION_CATEGORIES, getMissionsByCategory } from './missions.js';
import { missionStore } from './missionStore.js';
import { wallet } from './wallet.js';

export class MissionsPanel {
  constructor({ panelEl, closeBtnEl, tabsEl, listEl, balanceEl }) {
    this.panelEl = panelEl;
    this.tabsEl = tabsEl;
    this.listEl = listEl;
    this.balanceEl = balanceEl;

    this._activeCategory = MISSION_CATEGORIES[0].id;
    this._tabButtons = Array.from(this.tabsEl.querySelectorAll('[data-category]'));

    for (const button of this._tabButtons) {
      button.addEventListener('click', () => {
        this._activeCategory = button.dataset.category;
        this._syncTabs();
        this._renderList();
      });
    }

    closeBtnEl.addEventListener('click', () => this.hide());
    this.panelEl.addEventListener('click', (event) => {
      if (event.target === this.panelEl) this.hide();
    });
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && this.isOpen()) this.hide();
    });

    wallet.onChange(() => this._syncBalance());
    // Progress can change mid-run (a mission completing while playing), and
    // a claim changes both the balance and the button states — re-render
    // the whole list either way so it never shows stale progress.
    missionStore.onChange(() => this._renderList());
  }

  isOpen() {
    return this.panelEl.classList.contains('is-open');
  }

  show() {
    this._syncTabs();
    this._syncBalance();
    this._renderList();
    this.panelEl.classList.add('is-open');
  }

  hide() {
    this.panelEl.classList.remove('is-open');
  }

  _syncTabs() {
    for (const button of this._tabButtons) {
      const category = button.dataset.category;
      button.classList.toggle('is-active', category === this._activeCategory);
      button.classList.toggle('has-claimable', getMissionsByCategory(category).some(
        (mission) => missionStore.isComplete(mission) && !missionStore.isClaimed(mission),
      ));
    }
  }

  _syncBalance() {
    this.balanceEl.textContent = String(wallet.balance);
  }

  _renderList() {
    this._syncTabs();
    this.listEl.innerHTML = '';
    const missions = getMissionsByCategory(this._activeCategory);
    for (const mission of missions) {
      this.listEl.appendChild(this._buildRow(mission));
    }
  }

  _buildRow(mission) {
    const progress = missionStore.progress(mission);
    const complete = missionStore.isComplete(mission);
    const claimed = missionStore.isClaimed(mission);
    const pct = Math.min(100, Math.round((progress / mission.target) * 100));

    const row = document.createElement('div');
    row.className = `mission-row${claimed ? ' is-claimed' : complete ? ' is-complete' : ''}`;

    const info = document.createElement('div');
    info.className = 'mission-info';

    const name = document.createElement('div');
    name.className = 'mission-name';
    name.textContent = mission.name;
    info.appendChild(name);

    const desc = document.createElement('div');
    desc.className = 'mission-desc';
    desc.textContent = mission.description;
    info.appendChild(desc);

    const track = document.createElement('div');
    track.className = 'mission-progress-track';
    const fill = document.createElement('div');
    fill.className = 'mission-progress-fill';
    fill.style.width = `${pct}%`;
    track.appendChild(fill);
    info.appendChild(track);

    const progressLabel = document.createElement('div');
    progressLabel.className = 'mission-progress-label';
    progressLabel.textContent = `${Math.min(Math.floor(progress), mission.target).toLocaleString()} / ${mission.target.toLocaleString()}`;
    info.appendChild(progressLabel);

    row.appendChild(info);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mission-btn';

    if (claimed) {
      button.textContent = 'Claimed';
      button.classList.add('is-claimed-btn');
      button.disabled = true;
    } else if (complete) {
      const coinIcon = document.createElement('span');
      coinIcon.className = 'coin-icon';
      button.appendChild(document.createTextNode('Claim '));
      button.appendChild(coinIcon);
      button.appendChild(document.createTextNode(` ${mission.reward}`));
      button.addEventListener('click', () => missionStore.claim(mission));
    } else {
      const coinIcon = document.createElement('span');
      coinIcon.className = 'coin-icon';
      button.appendChild(coinIcon);
      button.appendChild(document.createTextNode(` ${mission.reward}`));
      button.classList.add('is-disabled');
      button.disabled = true;
    }

    row.appendChild(button);
    return row;
  }
}
