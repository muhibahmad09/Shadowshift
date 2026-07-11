// ShadowShift — engine bootstrap.
//
// This file only wires the engine together and registers a placeholder
// "boot" scene so there's something on screen. No gameplay lives here yet.

import { Engine } from './engine/engine.js';
import { Scene } from './engine/scene.js';

class BootScene extends Scene {
  onResize(width, height) {
    this.width = width;
    this.height = height;
  }

  render(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#8b5cf6';
    ctx.font = '600 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'engine ready — no gameplay yet',
      this.width / 2,
      this.height / 2,
    );
    ctx.restore();
  }
}

const canvas = document.getElementById('game-canvas');
const engine = new Engine(canvas);

engine.scenes.add('boot', new BootScene());
engine.scenes.switchTo('boot');

engine.start();

// Exposed for debugging in the browser console during development only.
window.__shadowshift = engine;
