// Obstacle — a single procedurally-sized obstacle belonging to either the
// Light or Shadow world. Instances are pooled and reused (see
// ObstacleSpawner) so endless spawning never allocates per-frame garbage.

import { WORLDS } from './worldManager.js';

function drawRoundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export class Obstacle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    /** 'light' | 'shadow' — which world this obstacle can collide in. */
    this.world = 'light';
  }

  spawn({ x, groundY, width, height, world }) {
    this.active = true;
    this.x = x;
    this.width = width;
    this.height = height;
    this.world = world;
    this.y = groundY - height;
  }

  update(deltaSeconds, speed) {
    this.x -= speed * deltaSeconds;
  }

  isOffScreen() {
    return this.x + this.width < 0;
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  /**
   * Obstacles from the world the player is NOT currently in render as
   * faint outlines — visible for planning ahead, but visually "not real"
   * since they can't collide right now.
   */
  draw(ctx, activeWorldId) {
    const palette = WORLDS[this.world];
    const isSolidNow = this.world === activeWorldId;

    ctx.save();
    drawRoundedRectPath(ctx, this.x, this.y, this.width, this.height, 8);

    if (isSolidNow) {
      ctx.globalAlpha = 1;
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = 16;
      ctx.fillStyle = palette.accent;
      ctx.fill();
    } else {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }
}
