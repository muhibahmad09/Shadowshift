// AchievementsPanel — DOM binder for the achievements overlay: a grid of
// every badge, locked ones dimmed with their description hidden so the
// unlock stays a surprise. Same structural pattern as ShopPanel/
// MissionsPanel, just without tabs (achievements aren't categorized) or
// any purchase/claim affordance — unlocking happens automatically and is
// announced by AchievementToast instead.

import { ACHIEVEMENTS } from './achievements.js';
import { achievementStore } from './achievementStore.js';

export class AchievementsPanel {
  constructor({ panelEl, closeBtnEl, gridEl }) {
    this.panelEl = panelEl;
    this.gridEl = gridEl;

    closeBtnEl.addEventListener('click', () => this.hide());
    this.panelEl.addEventListener('click', (event) => {
      if (event.target === this.panelEl) this.hide();
    });
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && this.isOpen()) this.hide();
    });

    achievementStore.onChange(() => this._renderGrid());
  }

  isOpen() {
    return this.panelEl.classList.contains('is-open');
  }

  show() {
    this._renderGrid();
    this.panelEl.classList.add('is-open');
  }

  hide() {
    this.panelEl.classList.remove('is-open');
  }

  _renderGrid() {
    this.gridEl.innerHTML = '';
    for (const achievement of ACHIEVEMENTS) {
      this.gridEl.appendChild(this._buildCard(achievement));
    }
  }

  _buildCard(achievement) {
    const unlocked = achievementStore.isUnlocked(achievement.id);

    const card = document.createElement('div');
    card.className = `achievement-card${unlocked ? ' is-unlocked' : ' is-locked'}`;

    const icon = document.createElement('div');
    icon.className = 'achievement-card-icon';
    icon.textContent = unlocked ? achievement.icon : '?';
    card.appendChild(icon);

    const name = document.createElement('div');
    name.className = 'achievement-card-name';
    name.textContent = unlocked ? achievement.name : '???';
    card.appendChild(name);

    const desc = document.createElement('div');
    desc.className = 'achievement-card-desc';
    desc.textContent = unlocked ? achievement.description : 'Locked';
    card.appendChild(desc);

    return card;
  }
}
