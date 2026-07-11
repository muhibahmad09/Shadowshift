// ShadowShift — engine bootstrap.
//
// Wires the engine, the Light/Shadow world switch button, the premium HUD
// (score/distance/coins/high score), and the play scene together.

import { Engine } from './engine/engine.js';
import { PlayScene } from './game/playScene.js';
import { WorldSwitchButton } from './game/worldSwitchButton.js';
import { Hud } from './game/hud.js';

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

const engine = new Engine(canvas);

const playScene = new PlayScene({ worldLabelEl: hudWorldEl, hud });
const switchButton = new WorldSwitchButton(switchButtonEl, () =>
  playScene.requestWorldSwitch(),
);
playScene.worldSwitchButton = switchButton;

engine.scenes.add('play', playScene);
engine.scenes.switchTo('play');

engine.start();

// Exposed for debugging in the browser console during development only.
window.__shadowshift = engine;
