// AchievementToast — animated unlock notifications. Subscribes directly
// to achievementStore.onUnlock() so a toast fires the instant an
// achievement is earned, regardless of whether the Achievements panel is
// open. Multiple unlocks queue and play one at a time so they never
// overlap or clip off-screen.

const DISPLAY_MS = 3400;
const EXIT_MS = 450;

export class AchievementToast {
  constructor({ containerEl }) {
    this.containerEl = containerEl;
    this._queue = [];
    this._playing = false;
  }

  enqueue(achievement) {
    this._queue.push(achievement);
    this._playNext();
  }

  _playNext() {
    if (this._playing || this._queue.length === 0) return;
    this._playing = true;

    const achievement = this._queue.shift();
    const card = document.createElement('div');
    card.className = 'achievement-toast';
    card.innerHTML = `
      <div class="achievement-toast-icon">${achievement.icon}</div>
      <div class="achievement-toast-body">
        <div class="achievement-toast-label">Achievement Unlocked</div>
        <div class="achievement-toast-name">${achievement.name}</div>
        <div class="achievement-toast-desc">${achievement.description}</div>
      </div>
    `;
    this.containerEl.appendChild(card);

    // Force a layout flush before adding the entrance class so the CSS
    // transition actually animates in, instead of the card just appearing.
    void card.offsetWidth;
    card.classList.add('is-in');

    setTimeout(() => {
      card.classList.remove('is-in');
      card.classList.add('is-out');
      setTimeout(() => {
        card.remove();
        this._playing = false;
        this._playNext();
      }, EXIT_MS);
    }, DISPLAY_MS);
  }
}
