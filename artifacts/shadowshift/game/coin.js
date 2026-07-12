// Coin — a collectible that floats in place (bobbing) while scrolling left
// with the world. Pooled and reused by CoinSpawner, same pattern as
// Obstacle, so endless spawning stays allocation-free.

const FLOAT_AMPLITUDE_PX = 8;
const FLOAT_SPEED = 3; // radians/s

export class Coin {
  constructor() {
    this.active = false;
    this.x = 0;
    /** Rest height (ground of the float); actual draw position bobs around this. */
    this.baseY = 0;
    this.radius = 12;
    this._phase = 0;
  }

  spawn({ x, y, radius }) {
    this.active = true;
    this.x = x;
    this.baseY = y;
    this.radius = radius;
    // Randomized phase so coins don't all bob in unison.
    this._phase = Math.random() * Math.PI * 2;
  }

  /** Current draw-space Y, including the floating bob offset. */
  get y() {
    return this.baseY + Math.sin(this._phase) * FLOAT_AMPLITUDE_PX;
  }

  update(deltaSeconds, speed) {
    this.x -= speed * deltaSeconds;
    this._phase += deltaSeconds * FLOAT_SPEED;
  }

  isOffScreen() {
    return this.x + this.radius < 0;
  }

  getBounds() {
    const y = this.y;
    return {
      x: this.x - this.radius,
      y: y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2,
    };
  }

  draw(ctx, glowBlur = 18) {
    const y = this.y;

    ctx.save();
    ctx.shadowColor = 'rgba(251, 191, 36, 0.85)';
    ctx.shadowBlur = glowBlur;

    const gradient = ctx.createRadialGradient(
      this.x,
      y,
      0,
      this.x,
      y,
      this.radius,
    );
    gradient.addColorStop(0, '#fff7d6');
    gradient.addColorStop(0.55, '#fbbf24');
    gradient.addColorStop(1, '#b45309');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, y, this.radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
