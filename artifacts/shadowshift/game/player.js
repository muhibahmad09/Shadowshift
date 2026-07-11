// Player — physics, jump, and rendering for the runner character.
//
// The player stays at a fixed horizontal position (there's no world/camera
// yet) but plays a continuous running-leg animation so it always reads as
// "in motion". Vertical movement is real physics: gravity pulls it down
// every frame, it collides with the ground line, and it can jump exactly
// once per ground contact (no double jumping).

const GRAVITY = 2600; // px/s^2
const JUMP_VELOCITY = -980; // px/s (negative = up)
const RUN_CYCLE_SPEED = 9; // radians/s while grounded

const BODY_WIDTH = 40;
const BODY_HEIGHT = 56;
const LEG_LENGTH = 20;
const LEG_SWING = 16; // px of horizontal leg travel at full stride

export class Player {
  constructor() {
    /** Fixed horizontal anchor, set by the scene on resize. */
    this.x = 0;
    /** Top-left of the bounding box; `y + height` is the player's feet. */
    this.y = 0;
    this.width = BODY_WIDTH;
    this.height = BODY_HEIGHT;

    this.velocityY = 0;
    this.groundY = 0;
    this.isGrounded = false;

    /** Phase accumulator for the run-cycle leg animation. */
    this._runCycle = 0;
  }

  /** Place the player standing on the given ground line, at rest. */
  reset(groundY) {
    this.groundY = groundY;
    this.y = groundY - this.height;
    this.velocityY = 0;
    this.isGrounded = true;
    this._runCycle = 0;
  }

  /** Update the ground line (e.g. after a resize) without disturbing flight. */
  setGroundY(groundY) {
    const wasResting = this.isGrounded;
    this.groundY = groundY;
    if (wasResting) {
      this.y = groundY - this.height;
    }
  }

  /** Request a jump. No-op if airborne — this is what prevents double jumps. */
  jump() {
    if (!this.isGrounded) return;
    this.isGrounded = false;
    this.velocityY = JUMP_VELOCITY;
  }

  update(deltaSeconds) {
    // Gravity + integration, done in real units-per-second so speed is
    // identical regardless of frame rate.
    this.velocityY += GRAVITY * deltaSeconds;
    this.y += this.velocityY * deltaSeconds;

    // Ground collision: clamp to the ground line and kill vertical velocity.
    const restingY = this.groundY - this.height;
    if (this.y >= restingY) {
      this.y = restingY;
      this.velocityY = 0;
      this.isGrounded = true;
    }

    // The running animation always advances while grounded, independent of
    // the jump arc, so the character never looks like it "stops" running.
    if (this.isGrounded) {
      this._runCycle += deltaSeconds * RUN_CYCLE_SPEED;
    }
  }

  draw(ctx) {
    const centerX = this.x;
    const topY = this.y;
    const bodyBottomY = topY + this.height - LEG_LENGTH;

    ctx.save();
    ctx.translate(centerX, 0);

    this._drawLegs(ctx, bodyBottomY);
    this._drawBody(ctx, topY, bodyBottomY);

    ctx.restore();
  }

  _drawLegs(ctx, hipY) {
    // While airborne, legs hold a fixed "tucked" running pose instead of
    // cycling — reads as a jump silhouette rather than mid-stride.
    const stride = this.isGrounded ? Math.sin(this._runCycle) : 0.6;

    const frontSwing = stride * LEG_SWING;
    const backSwing = -stride * LEG_SWING;

    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-6, hipY);
    ctx.lineTo(-6 + frontSwing * 0.4, hipY + LEG_LENGTH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(6, hipY);
    ctx.lineTo(6 + backSwing * 0.4, hipY + LEG_LENGTH);
    ctx.stroke();
  }

  _drawBody(ctx, topY, bottomY) {
    const bodyHeight = bottomY - topY;
    const radius = this.width / 2;

    // Soft glow behind the silhouette so it reads against the dark backdrop.
    ctx.shadowColor = 'rgba(139, 92, 246, 0.65)';
    ctx.shadowBlur = 18;

    ctx.fillStyle = '#c4b5fd';
    ctx.beginPath();
    ctx.moveTo(-radius, topY + radius);
    ctx.arcTo(-radius, topY, -radius + radius, topY, radius);
    ctx.arcTo(radius, topY, radius, topY + radius, radius);
    ctx.lineTo(radius, topY + bodyHeight);
    ctx.lineTo(-radius, topY + bodyHeight);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    // Head.
    const headRadius = radius * 0.62;
    const headCenterY = topY - headRadius * 0.4;
    ctx.beginPath();
    ctx.arc(0, headCenterY, headRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}
