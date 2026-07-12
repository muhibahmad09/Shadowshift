// Coin — a collectible that floats in place (bobbing) while scrolling left
// with the world. Pooled and reused by CoinSpawner, same pattern as
// Obstacle, so endless spawning stays allocation-free.
//
// The coin body is pre-rendered to a tiny offscreen canvas once per unique
// radius value (only rebuilt at spawn time), so draw() only calls drawImage
// instead of createRadialGradient + arc on every frame.

const FLOAT_AMPLITUDE_PX = 8;
const FLOAT_SPEED = 3; // radians/s

const OFFSCREEN_PAD = 2; // extra pixels around the circle for glow bleed

export class Coin {
  constructor() {
    this.active = false;
    this.x = 0;
    /** Rest height (ground of the float); actual draw position bobs around this. */
    this.baseY = 0;
    this.radius = 12;
    this._phase = 0;

    /** Cached offscreen canvas — rebuilt only when radius changes. */
    this._offscreen = null;
    this._offscreenRadius = -1;
  }

  spawn({ x, y, radius }) {
    this.active = true;
    this.x = x;
    this.baseY = y;
    this.radius = radius;
    // Randomized phase so coins don't all bob in unison.
    this._phase = Math.random() * Math.PI * 2;
    // Rebuild the cached image only when the radius differs from last spawn
    // (pool slots often keep the same radius across reuses).
    if (radius !== this._offscreenRadius) {
      this._buildOffscreen(radius);
    }
  }

  /**
   * Pre-render the coin body to a small offscreen canvas so draw() can
   * use drawImage instead of allocating a new CanvasGradient every frame.
   */
  _buildOffscreen(radius) {
    const size = Math.ceil(radius * 2) + OFFSCREEN_PAD * 2;
    if (!this._offscreen) {
      this._offscreen = document.createElement('canvas');
    }
    this._offscreen.width = size;
    this._offscreen.height = size;
    const ctx = this._offscreen.getContext('2d');
    const cx = radius + OFFSCREEN_PAD;
    const cy = radius + OFFSCREEN_PAD;

    ctx.clearRect(0, 0, size, size);

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, '#fff7d6');
    gradient.addColorStop(0.55, '#fbbf24');
    gradient.addColorStop(1, '#b45309');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    this._offscreenRadius = radius;
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
    if (glowBlur > 0) {
      // shadowBlur on drawImage casts a glow around the non-transparent
      // pixels of the cached sprite — same visual result as the inline arc,
      // but no gradient allocation on the hot path.
      ctx.shadowColor = 'rgba(251, 191, 36, 0.85)';
      ctx.shadowBlur = glowBlur;
    }
    ctx.drawImage(
      this._offscreen,
      this.x - this.radius - OFFSCREEN_PAD,
      y - this.radius - OFFSCREEN_PAD,
    );
    ctx.restore();
  }
}
