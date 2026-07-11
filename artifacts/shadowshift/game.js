// ShadowShift — engine bootstrap.
//
// Wires the engine together and starts the play scene. No obstacles or
// scene switching yet — just the player, gravity, and the ground.

import { Engine } from './engine/engine.js';
import { PlayScene } from './game/playScene.js';

const canvas = document.getElementById('game-canvas');
const engine = new Engine(canvas);

engine.scenes.add('play', new PlayScene());
engine.scenes.switchTo('play');

engine.start();

// Exposed for debugging in the browser console during development only.
window.__shadowshift = engine;
