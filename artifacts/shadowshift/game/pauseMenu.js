// PauseMenu — DOM binder for the in-run pause overlay. Pure UI wiring; the
// actual freeze/resume/restart logic lives in PlayScene, and scene/settings
// navigation is orchestrated by game.js, same division of responsibility
// as Modal and SettingsPanel.

export class PauseMenu {
  constructor({ panelEl, resumeBtnEl, restartBtnEl, mainMenuBtnEl, settingsBtnEl }) {
    this.panelEl = panelEl;

    resumeBtnEl.addEventListener('click', () => this._onResume?.());
    restartBtnEl.addEventListener('click', () => this._onRestart?.());
    mainMenuBtnEl.addEventListener('click', () => this._onMainMenu?.());
    settingsBtnEl.addEventListener('click', () => this._onSettings?.());
  }

  /** @param {{onResume, onRestart, onMainMenu, onSettings}} handlers */
  setHandlers({ onResume, onRestart, onMainMenu, onSettings }) {
    this._onResume = onResume;
    this._onRestart = onRestart;
    this._onMainMenu = onMainMenu;
    this._onSettings = onSettings;
  }

  isOpen() {
    return this.panelEl.classList.contains('is-open');
  }

  show() {
    this.panelEl.classList.add('is-open');
  }

  hide() {
    this.panelEl.classList.remove('is-open');
  }
}
