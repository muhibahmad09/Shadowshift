// SettingsPanel — DOM binder for the dedicated settings overlay: toggle
// switches (music/sound/vibration), a graphics-quality segmented control, a
// live FPS readout, and a two-step "Reset Save Data" confirmation. All
// state changes flow through the shared `settings` store, which persists
// to Local Storage itself.

import { settings, QUALITY_LEVELS } from './settings.js';

const RESET_CONFIRM_TIMEOUT_MS = 4000;

export class SettingsPanel {
  constructor({
    panelEl,
    closeBtnEl,
    musicToggleEl,
    soundToggleEl,
    vibrationToggleEl,
    qualityButtonsEl,
    fpsValueEl,
    resetBtnEl,
    resetHintEl,
    onMusicToggle,
    onResetSaveData,
    getFps,
  }) {
    this.panelEl = panelEl;
    this.fpsValueEl = fpsValueEl;
    this.resetBtnEl = resetBtnEl;
    this.resetHintEl = resetHintEl;
    this._resetHintDefault = resetHintEl.textContent;
    this._onMusicToggle = onMusicToggle;
    this._onResetSaveData = onResetSaveData;
    this._getFps = getFps ?? (() => 0);

    this._toggles = [
      { key: 'musicOn', el: musicToggleEl },
      { key: 'soundOn', el: soundToggleEl },
      { key: 'vibrationOn', el: vibrationToggleEl },
    ];

    this._qualityButtons = Array.from(
      qualityButtonsEl.querySelectorAll('[data-quality]'),
    );

    this._resetArmed = false;
    this._resetTimer = null;
    this._fpsRaf = null;

    this._bindToggles();
    this._bindQualityButtons();
    this._bindReset();

    closeBtnEl.addEventListener('click', () => this.hide());
    this.panelEl.addEventListener('click', (event) => {
      if (event.target === this.panelEl) this.hide();
    });
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && this.isOpen()) this.hide();
    });

    settings.onChange(() => this._syncFromSettings());
  }

  _bindToggles() {
    for (const { key, el } of this._toggles) {
      el.addEventListener('click', () => {
        const value = settings.toggle(key);
        if (key === 'musicOn') this._onMusicToggle?.(value);
      });
    }
  }

  _bindQualityButtons() {
    for (const button of this._qualityButtons) {
      button.addEventListener('click', () => {
        settings.set('graphicsQuality', button.dataset.quality);
      });
    }
  }

  _bindReset() {
    this.resetBtnEl.addEventListener('click', () => {
      if (!this._resetArmed) {
        this._armReset();
        return;
      }

      settings.resetSaveData();
      this._onResetSaveData?.();
      this._disarmReset();
      this.resetHintEl.textContent = 'Save data reset.';
      setTimeout(() => {
        this.resetHintEl.textContent = this._resetHintDefault;
      }, 2000);
    });
  }

  _armReset() {
    this._resetArmed = true;
    this.resetBtnEl.textContent = 'Confirm Reset?';
    this.resetBtnEl.classList.add('is-armed');
    this.resetHintEl.textContent = 'Click again to permanently clear your high score.';

    clearTimeout(this._resetTimer);
    this._resetTimer = setTimeout(() => this._disarmReset(), RESET_CONFIRM_TIMEOUT_MS);
  }

  _disarmReset() {
    this._resetArmed = false;
    this.resetBtnEl.textContent = 'Reset Save Data';
    this.resetBtnEl.classList.remove('is-armed');
    clearTimeout(this._resetTimer);
  }

  isOpen() {
    return this.panelEl.classList.contains('is-open');
  }

  show() {
    this._disarmReset();
    this.resetHintEl.textContent = this._resetHintDefault;
    this._syncFromSettings();
    this.panelEl.classList.add('is-open');
    this._startFpsLoop();
  }

  hide() {
    this.panelEl.classList.remove('is-open');
    this._disarmReset();
    this._stopFpsLoop();
  }

  _syncFromSettings() {
    for (const { key, el } of this._toggles) {
      const on = settings[key];
      el.classList.toggle('is-on', on);
      el.setAttribute('aria-checked', String(on));
    }

    for (const button of this._qualityButtons) {
      button.classList.toggle(
        'is-active',
        button.dataset.quality === settings.graphicsQuality,
      );
    }
  }

  _startFpsLoop() {
    const tick = () => {
      this.fpsValueEl.textContent = String(Math.round(this._readFps()));
      this._fpsRaf = requestAnimationFrame(tick);
    };
    this._fpsRaf = requestAnimationFrame(tick);
  }

  _stopFpsLoop() {
    if (this._fpsRaf !== null) {
      cancelAnimationFrame(this._fpsRaf);
      this._fpsRaf = null;
    }
  }

  _readFps() {
    return this._getFps();
  }
}
