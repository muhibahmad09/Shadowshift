// ShadowShift — engine bootstrap.
//
// Wires the engine, the animated main menu, the Light/Shadow world switch
// button, the premium HUD, and the play scene together.

import { Engine } from './engine/engine.js';
import { PlayScene } from './game/playScene.js';
import { MenuScene } from './game/menuScene.js';
import { WorldSwitchButton } from './game/worldSwitchButton.js';
import { Hud } from './game/hud.js';
import { Modal } from './game/modal.js';
import { SettingsPanel } from './game/settingsPanel.js';
import { PauseMenu } from './game/pauseMenu.js';
import { Sfx, Music } from './game/audio.js';
import { settings, QUALITY_PRESETS } from './game/settings.js';

const canvas = document.getElementById('game-canvas');
const switchButtonEl = document.getElementById('switch-world-btn');
const hudWorldEl = document.getElementById('hud-world');

const hud = new Hud({
  scoreEl: document.getElementById('hud-score'),
  distanceEl: document.getElementById('hud-distance'),
  coinsEl: document.getElementById('hud-coins'),
  bestEl: document.getElementById('hud-best'),
  bestCardEl: document.getElementById('hud-best-card'),
});

const modal = new Modal({
  overlayEl: document.getElementById('modal-overlay'),
  titleEl: document.getElementById('modal-title'),
  bodyEl: document.getElementById('modal-body'),
  actionsEl: document.getElementById('modal-actions'),
});

// Shared across scenes so preferences (Settings) affect gameplay regardless
// of which scene created these instances.
const sfx = new Sfx();
sfx.setMuted(!settings.soundOn);

const music = new Music();

const engine = new Engine(canvas, {
  maxDpr: settings.qualityPreset.maxDpr,
});

// Keep the engine's render resolution and the shared Sfx mute state in sync
// with Settings any time they change, from any source (menu or gameplay).
settings.onChange((state) => {
  engine.setMaxDpr(QUALITY_PRESETS[state.graphicsQuality].maxDpr);
  sfx.setMuted(!state.soundOn);
});

function syncMusic() {
  if (settings.musicOn) {
    music.start();
  } else {
    music.stop();
  }
}

// Starting audio requires a user gesture in most browsers — try once on the
// first interaction so music comes up automatically for users who never
// touch the Settings toggle.
document.addEventListener('pointerdown', syncMusic, { once: true });
document.addEventListener('keydown', syncMusic, { once: true });

const menuScene = new MenuScene({
  menuEl: document.getElementById('main-menu'),
  highScoreEl: document.getElementById('menu-highscore'),
});

const pauseMenu = new PauseMenu({
  panelEl: document.getElementById('pause-menu'),
  resumeBtnEl: document.getElementById('pause-resume-btn'),
  restartBtnEl: document.getElementById('pause-restart-btn'),
  mainMenuBtnEl: document.getElementById('pause-mainmenu-btn'),
  settingsBtnEl: document.getElementById('pause-settings-btn'),
});

const playScene = new PlayScene({
  worldLabelEl: hudWorldEl,
  hud,
  sfx,
  onPauseChange: (isPaused) => {
    if (isPaused) {
      pauseMenu.show();
    } else {
      pauseMenu.hide();
    }
  },
});
const switchButton = new WorldSwitchButton(switchButtonEl, () =>
  playScene.requestWorldSwitch(),
);
playScene.worldSwitchButton = switchButton;

pauseMenu.setHandlers({
  onResume: () => playScene.resume(),
  onRestart: () => playScene.restart(),
  onMainMenu: () => {
    pauseMenu.hide();
    engine.scenes.switchTo('menu');
  },
  // Settings can be opened without leaving the pause menu behind — closing
  // Settings reveals the still-paused game underneath.
  onSettings: () => settingsPanel.show(),
});

document.getElementById('pause-btn').addEventListener('click', () => {
  playScene.pause();
});

engine.scenes.add('menu', menuScene);
engine.scenes.add('play', playScene);
engine.scenes.switchTo('menu');

engine.start();

// --- Main menu wiring -------------------------------------------------

document.getElementById('menu-play-btn').addEventListener('click', () => {
  engine.scenes.switchTo('play');
});

document
  .getElementById('menu-multiplayer-btn')
  .addEventListener('click', () => {
    modal.show({
      title: 'Multiplayer',
      body: 'Multiplayer mode is coming soon — race friends across both worlds in a future update.',
      actions: [{ label: 'Got it', primary: true }],
    });
  });

const settingsPanel = new SettingsPanel({
  panelEl: document.getElementById('settings-panel'),
  closeBtnEl: document.getElementById('settings-close-btn'),
  musicToggleEl: document.getElementById('toggle-music'),
  soundToggleEl: document.getElementById('toggle-sound'),
  vibrationToggleEl: document.getElementById('toggle-vibration'),
  qualityButtonsEl: document.getElementById('quality-options'),
  fpsValueEl: document.getElementById('settings-fps'),
  resetBtnEl: document.getElementById('reset-save-btn'),
  resetHintEl: document.getElementById('reset-hint'),
  onMusicToggle: syncMusic,
  getFps: () => engine.time.fps,
});

document.getElementById('menu-settings-btn').addEventListener('click', () => {
  settingsPanel.show();
});

document.getElementById('menu-exit-btn').addEventListener('click', () => {
  window.close();
  setTimeout(() => {
    if (!document.hidden) {
      modal.show({
        title: 'Exit',
        body: "Browsers only let game-opened tabs close themselves — you can close this tab manually to exit.",
        actions: [{ label: 'Back to Menu', primary: true }],
      });
    }
  }, 250);
});

// Exposed for debugging in the browser console during development only.
window.__shadowshift = engine;
