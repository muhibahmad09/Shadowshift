// GhostPlayer — renders a remote player with client-side interpolation.
//
// Each frame we render at (now − INTERP_DELAY_MS) by finding the two
// buffered snapshots that bracket that render time and linearly
// interpolating the Y position between them. This smooths over the
// 20 Hz state updates and network jitter.

const INTERP_DELAY_MS = 100; // render this far behind wall clock
const MAX_BUFFER = 12; // max snapshots retained per ghost
const GRAVITY = 2600; // px/s^2 – must match player.js for extrapolation
const LEG_LENGTH = 20;
const BODY_WIDTH = 40;
const BODY_HEIGHT = 56;
const RUN_CYCLE_SPEED = 9; // rad/s
const SQUASH_SPRING = 14;

/** One color palette per slot (violet / cyan / orange / pink). */
export const GHOST_COLORS = [
  { body: '#c4b5fd', limb: '#8b5cf6', arm: '#a78bfa', glow: 'rgba(139,92,246,0.45)' },
  { body: '#67e8f9', limb: '#06b6d4', arm: '#22d3ee', glow: 'rgba(6,182,212,0.45)' },
  { body: '#fdba74', limb: '#ea580c', arm: '#fb923c', glow: 'rgba(234,88,12,0.45)' },
  { body: '#f9a8d4', limb: '#db2777', arm: '#f472b6', glow: 'rgba(219,39,119,0.45)' },
];

export class GhostPlayer {
  constructor(id, name, slot) {
    this.id = id;
    this.name = name;
    this.slot = slot;
    this.score = 0;
    this.alive = true;

    /** Received snapshots: { receivedAt, y, isGrounded } */
    this._snapshots = [];

    // Rendered state
    this._y = 0;
    this._isGrounded = true;
    this._wasGrounded = true;
    this._runCycle = 0;
    this._scaleX = 1;
    this._scaleY = 1;

    this._colors = GHOST_COLORS[slot % GHOST_COLORS.length];
    this._initialized = false;
  }

  /** Push a new network snapshot into the interpolation buffer. */
  addSnapshot({ y, isGrounded }) {
    this._snapshots.push({ receivedAt: performance.now(), y, isGrounded });
    if (this._snapshots.length > MAX_BUFFER) this._snapshots.shift();

    if (!this._initialized) {
      this._y = y;
      this._isGrounded = isGrounded;
      this._initialized = true;
    }
  }

  update(deltaSeconds) {
    const renderTime = performance.now() - INTERP_DELAY_MS;

    if (this._snapshots.length >= 2) {
      let a = null;
      let b = null;

      // Find the pair that straddles renderTime.
      for (let i = 0; i < this._snapshots.length - 1; i++) {
        if (
          this._snapshots[i].receivedAt <= renderTime &&
          this._snapshots[i + 1].receivedAt >= renderTime
        ) {
          a = this._snapshots[i];
          b = this._snapshots[i + 1];
          break;
        }
      }

      if (a && b) {
        const span = b.receivedAt - a.receivedAt;
        const t = span > 0 ? Math.max(0, Math.min(1, (renderTime - a.receivedAt) / span)) : 1;
        this._y = a.y + (b.y - a.y) * t;
        this._isGrounded = b.isGrounded;
      } else {
        // Use the most-recent snapshot (we're ahead of the buffer end).
        const latest = this._snapshots[this._snapshots.length - 1];
        this._y = latest.y;
        this._isGrounded = latest.isGrounded;
      }
    }

    // Squash & stretch on state transitions.
    if (this._isGrounded && !this._wasGrounded) {
      this._scaleY = 0.78;
      this._scaleX = 1.18;
    } else if (!this._isGrounded && this._wasGrounded) {
      this._scaleY = 1.22;
      this._scaleX = 0.86;
    }
    this._wasGrounded = this._isGrounded;

    // Spring scales back toward 1.
    const spring = Math.min(1, deltaSeconds * SQUASH_SPRING);
    this._scaleX += (1 - this._scaleX) * spring;
    this._scaleY += (1 - this._scaleY) * spring;

    // Advance run animation.
    if (this._isGrounded) {
      this._runCycle += deltaSeconds * RUN_CYCLE_SPEED;
    }
  }

  /**
   * Draw the ghost at canvas position (x, _).
   * `x` is the same fixed horizontal anchor the local player uses.
   * `groundY` is used for the name-tag baseline guard only.
   */
  draw(ctx, x, groundY, glowBlur = 10) {
    if (!this._initialized) return;

    const alpha = this.alive ? 0.52 : 0.18;
    const topY = this._y;
    const bodyBottomY = topY + BODY_HEIGHT - LEG_LENGTH;
    const radius = BODY_WIDTH / 2;
    const headRadius = radius * 0.62;
    const headCenterY = topY - headRadius * 0.4;
    const stride = this._isGrounded ? Math.sin(this._runCycle) : 0.6;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, 0);

    // Squash/stretch pivot from feet.
    ctx.save();
    ctx.translate(0, topY + BODY_HEIGHT);
    ctx.scale(this._scaleX, this._scaleY);
    ctx.translate(0, -(topY + BODY_HEIGHT));

    // Arms
    const armY = topY + (bodyBottomY - topY) * 0.32;
    ctx.strokeStyle = this._colors.arm;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, armY);
    ctx.lineTo(-9 + (-stride) * 6, armY + 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(9, armY);
    ctx.lineTo(9 + stride * 6, armY + 16);
    ctx.stroke();

    // Legs
    ctx.strokeStyle = this._colors.limb;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-6, bodyBottomY);
    ctx.lineTo(-6 + stride * 6.4, bodyBottomY + LEG_LENGTH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, bodyBottomY);
    ctx.lineTo(6 - stride * 6.4, bodyBottomY + LEG_LENGTH);
    ctx.stroke();

    // Body
    if (glowBlur > 0) {
      ctx.shadowColor = this._colors.glow;
      ctx.shadowBlur = glowBlur;
    }
    ctx.fillStyle = this._colors.body;
    ctx.beginPath();
    ctx.moveTo(-radius, topY + radius);
    ctx.arcTo(-radius, topY, 0, topY, radius);
    ctx.arcTo(radius, topY, radius, topY + radius, radius);
    ctx.lineTo(radius, bodyBottomY);
    ctx.lineTo(-radius, bodyBottomY);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Head
    ctx.beginPath();
    ctx.arc(0, headCenterY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // end squash
    ctx.restore(); // end alpha + translate

    // Name tag (not squashed).
    ctx.save();
    ctx.globalAlpha = alpha * 1.5;
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.fillStyle = this._colors.body;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(this.name, x, headCenterY - headRadius - 3);
    ctx.restore();
  }
}
