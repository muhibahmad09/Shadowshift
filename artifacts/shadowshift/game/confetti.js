// Confetti — a small self-contained canvas particle burst for the Game
// Over overlay. Deliberately separate from the gameplay ParticleSystem: it
// runs on its own canvas layered inside the DOM overlay, on its own
// requestAnimationFrame loop, so it keeps animating over the dimmed
// backdrop regardless of whether the game canvas is paused.

const GRAVITY = 420; // px/s^2
const DRAG = 0.06; // per-second exponential air resistance
const DEFAULT_COLORS = ['#8b5cf6', '#c4b5fd', '#fbbf24', '#fde68a', '#f472b6'];

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

class ConfettiPiece {
  constructor() {
    this.active = false;
  }
}

export class Confetti {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.pieces = [];
    this._raf = null;
    this._dpr = 1;
    this._lastTime = 0;

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(canvasEl);
    this._resize();
  }

  _resize() {
    this._dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(rect.width * this._dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this._dpr));
    this._width = rect.width;
    this._height = rect.height;
  }

  /** Launch `count` confetti pieces from the top of the overlay. */
  burst(count = 90, colors = DEFAULT_COLORS) {
    for (let i = 0; i < count; i += 1) {
      this.pieces.push({
        active: true,
        x: randomRange(0, this._width),
        y: randomRange(-40, -4),
        vx: randomRange(-60, 60),
        vy: randomRange(40, 140),
        rotation: randomRange(0, Math.PI * 2),
        rotationSpeed: randomRange(-6, 6),
        size: randomRange(5, 10),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: randomRange(2.2, 3.4),
      });
    }

    this._start();
  }

  _start() {
    if (this._raf !== null) return;
    this._lastTime = performance.now();
    const tick = (now) => {
      const deltaSeconds = Math.min(0.05, (now - this._lastTime) / 1000);
      this._lastTime = now;
      this._update(deltaSeconds);
      this._draw();

      if (this.pieces.length > 0) {
        this._raf = requestAnimationFrame(tick);
      } else {
        this._raf = null;
      }
    };
    this._raf = requestAnimationFrame(tick);
  }

  _update(deltaSeconds) {
    const dragFactor = Math.pow(1 - DRAG, deltaSeconds * 60);

    this.pieces = this.pieces.filter((piece) => {
      piece.life += deltaSeconds;
      if (piece.life >= piece.maxLife || piece.y > this._height + 40) {
        return false;
      }

      piece.vy += GRAVITY * deltaSeconds;
      piece.vx *= dragFactor;
      piece.x += piece.vx * deltaSeconds;
      piece.y += piece.vy * deltaSeconds;
      piece.rotation += piece.rotationSpeed * deltaSeconds;
      return true;
    });
  }

  _draw() {
    const { ctx } = this;
    ctx.save();
    ctx.scale(this._dpr, this._dpr);
    ctx.clearRect(0, 0, this._width, this._height);

    for (const piece of this.pieces) {
      const fadeIn = Math.min(1, piece.life / 0.2);
      const fadeOut = Math.min(1, (piece.maxLife - piece.life) / 0.5);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut));
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
      ctx.restore();
    }

    ctx.restore();
  }

  /** Stop the loop and clear all pieces immediately (e.g. when hiding the overlay). */
  clear() {
    this.pieces = [];
    if (this._raf !== null) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
