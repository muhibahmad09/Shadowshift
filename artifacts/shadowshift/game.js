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
import { Sfx } from './game/audio.js';

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

// Shared across scenes so the mute preference (Settings) affects gameplay
// sound regardless of which scene created it.
const sfx = new Sfx();

const engine = new Engine(canvas);

const menuScene = new MenuScene({
  menuEl: document.getElementById('main-menu'),
  highScoreEl: document.getElementById('menu-highscore'),
});

const playScene = new PlayScene({ worldLabelEl: hudWorldEl, hud, sfx });
const switchButton = new WorldSwitchButton(switchButtonEl, () =>
  playScene.requestWorldSwitch(),
);
playScene.worldSwitchButton = switchButton;

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

document.getElementById('menu-settings-btn').addEventListener('click', () => {
  showSettingsModal();
});

function showSettingsModal() {
  modal.show({
    title: 'Settings',
    body: 'Adjust your ShadowShift experience.',
    actions: [
      {
        label: `Sound: ${sfx.muted ? 'Off' : 'On'}`,
        closeOnClick: false,
        onClick: () => {
          sfx.toggleMute();
          showSettingsModal();
        },
      },
      { label: 'Close', primary: true },
    ],
  });
}

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
