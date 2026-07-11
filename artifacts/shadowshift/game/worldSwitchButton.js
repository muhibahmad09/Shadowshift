// WorldSwitchButton — binds the on-screen "switch world" button to a
// callback, and syncs its cooldown-ring visual each frame.
//
// Kept separate from WorldManager (pure logic) and PlayScene (canvas
// rendering) so DOM manipulation lives in exactly one place.

export class WorldSwitchButton {
  constructor(buttonEl, onRequestSwitch) {
    this.el = buttonEl;
    this._onRequestSwitch = onRequestSwitch;

    this._onClick = () => this._onRequestSwitch();
    this.el.addEventListener('click', this._onClick);
  }

  destroy() {
    this.el.removeEventListener('click', this._onClick);
  }

  /**
   * Sync the button's cooldown ring and disabled state.
   * @param {number} readiness 0 (just used) -> 1 (fully recharged).
   * @param {string} accentColor CSS color for the ring/label while ready.
   */
  sync(readiness, accentColor) {
    const percent = Math.round(readiness * 100);
    this.el.style.setProperty('--cooldown-percent', `${percent}%`);
    this.el.style.setProperty('--world-accent', accentColor);

    const ready = readiness >= 1;
    this.el.classList.toggle('is-ready', ready);
    this.el.disabled = !ready;
  }
}
