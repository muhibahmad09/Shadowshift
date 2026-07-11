// ShadowShift — engine bootstrap.
//
// Wires the engine, the Light/Shadow world switch button, and the play
// scene together. No obstacles or additional scene switching yet.

import { Engine } from './engine/engine.js';
import { PlayScene } from './game/playScene.js';
import { WorldSwitchButton } from './game/worldSwitchButton.js';

const canvas = document.getElementById('game-canvas');
const switchButtonEl = document.getElementById('switch-world-btn');
const hudWorldEl = document.getElementById('hud-world');

const engine = new Engine(canvas);

const playScene = new PlayScene({ worldLabelEl: hudWorldEl });
const switchButton = new WorldSwitchButton(switchButtonEl, () =>
  playScene.requestWorldSwitch(),
);
playScene.worldSwitchButton = switchButton;

engine.scenes.add('play', playScene);
engine.scenes.switchTo('play');

engine.start();

// Exposed for debugging in the browser console during development only.
window.__shadowshift = engine;
