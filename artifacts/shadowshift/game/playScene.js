// PlayScene — hosts the ground and the player, and routes jump input.
//
// This is intentionally minimal: no obstacles, no world scroll, no scene
// switching. Its only job right now is "player stands on ground, runs in
// place, jumps on command".

import { Scene } from '../engine/scene.js';
import { Player } from './player.js';

const GROUND_MARGIN_RATIO = 0.22; // ground line sits this far up from the bottom
const GROUND_LINE_COLOR = 'rgba(139, 92, 246, 0.55)';

export class PlayScene extends Scene {
  constructor() {
    super();
    this.player = new Player();
    this.width = 0;
    this.height = 0;
    this.groundY = 0;
  }

  onEnter() {
    this.player.x = Math.max(120, this.width * 0.25);
    this.player.reset(this.groundY);
  }

  onResize(width, height) {
    this.width = width;
    this.height = height;
    this.groundY = height - height * GROUND_MARGIN_RATIO;
    this.player.x = Math.max(120, width * 0.25);
    this.player.setGroundY(this.groundY);
  }

  update(deltaSeconds) {
    const { input } = this.engine;

    // Space bar and "tap anywhere" both request a jump; Player.jump() is
    // itself the guard against double jumping (no-op unless grounded).
    if (input.wasKeyPressed('Space') || input.wasPointerPressed()) {
      this.player.jump();
    }

    this.player.update(deltaSeconds);
  }

  render(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);

    this._drawGround(ctx);
    this.player.draw(ctx);
  }

  _drawGround(ctx) {
    ctx.save();
    ctx.strokeStyle = GROUND_LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.width, this.groundY);
    ctx.stroke();
    ctx.restore();
  }
}
